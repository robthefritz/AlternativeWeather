import './style.css';
import { conditionFromCode, conditionLabel } from './conditions';
import { seal, weatherIcon } from './icons';
import {
  buildBriefing,
  fill,
  forecastCaption,
  lines,
  officialTemp,
  pick,
  pickRandom,
} from './spin';
import {
  type Alert,
  type Forecast,
  type Place,
  type Units,
  getAlerts,
  getForecast,
  reverseGeocode,
  searchPlaces,
} from './weather';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const STORE_PLACE = 'aw.place';
const STORE_UNITS = 'aw.units';

const store = {
  get<T>(key: string): T | null {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode etc. Not important. */
    }
  },
};

function defaultUnits(): Units {
  const region = new Intl.Locale(navigator.language).maximize().region;
  return region && ['US', 'LR', 'MM'].includes(region) ? 'imperial' : 'metric';
}

let units: Units = store.get<Units>(STORE_UNITS) ?? defaultUnits();
let place: Place | null = null;
let forecast: Forecast | null = null;
let alerts: Alert[] = [];

const app = document.getElementById('app')!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const deg = (n: number) => `${Math.round(n)}°`;

function dayName(date: string, i: number): string {
  if (i === 0) return 'Today';
  // Noon avoids any timezone rollover when formatting a bare date.
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
}

function longDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function placeLabel(p: Place) {
  return p.region ? `${p.name}, ${p.region}` : p.name;
}

function setUrl(p: Place) {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('name', p.name);
  if (p.region) url.searchParams.set('region', p.region);
  url.searchParams.set('lat', p.lat.toFixed(3));
  url.searchParams.set('lon', p.lon.toFixed(3));
  if (p.countryCode) url.searchParams.set('cc', p.countryCode);
  history.replaceState(null, '', url);
}

function placeFromUrl(): Place | null {
  const q = new URLSearchParams(location.search);
  const lat = Number(q.get('lat'));
  const lon = Number(q.get('lon'));
  if (!q.has('lat') || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    name: q.get('name') || 'Your location',
    region: q.get('region') || undefined,
    lat,
    lon,
    countryCode: q.get('cc') || undefined,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function header(): string {
  return `
  <header class="masthead">
    <a class="brand" href="/" aria-label="Alternative Weather home">
      ${seal(44)}
      <span>
        <span class="brand-ministry">Ministry of Weather</span>
        <span class="brand-title">Alternative Weather</span>
      </span>
    </a>
    <form class="search" role="search" autocomplete="off">
      <label class="sr-only" for="q">City or ZIP code</label>
      <input id="q" name="q" type="search" placeholder="City or ZIP" />
      <button type="button" class="locate" title="Use my location" aria-label="Use my location">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
      </button>
      <ul class="results" hidden></ul>
    </form>
  </header>`;
}

function footer(signoff = ''): string {
  return `
  <footer class="footer">
    ${signoff ? `<p class="signoff">${esc(signoff)}</p>` : ''}
    <div class="footer-row">
      <div class="units" role="group" aria-label="Units">
        <button data-units="imperial" aria-pressed="${units === 'imperial'}">°F</button>
        <button data-units="metric" aria-pressed="${units === 'metric'}">°C</button>
      </div>
      <a class="hashtag" href="https://bsky.app/search?q=%23notmyweather" target="_blank" rel="noopener">#notmyweather</a>
    </div>
    <p class="credits">
      Satire. The Ministry of Weather is not a real agency, unfortunately.
      Actual data: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0)
      and <a href="https://www.weather.gov/" target="_blank" rel="noopener">National Weather Service</a> alerts.
    </p>
  </footer>`;
}

function renderLanding(message = '') {
  const tokens = { official: deg(officialTemp(units)) };
  app.innerHTML = `
    ${header()}
    <main class="landing">
      <div class="stamp">Official</div>
      <h1>The forecast is <span class="gold">${deg(officialTemp(units))}</span> and clear.</h1>
      <p class="lede">Everywhere. Always. Where would you like it confirmed?</p>
      ${message ? `<p class="notice">${esc(fill(message, tokens))}</p>` : ''}
      <div class="landing-actions">
        <button class="primary locate">Use my location</button>
        <span class="or">or try</span>
        <button class="chip" data-try="Chicago">Chicago</button>
        <button class="chip" data-try="Seattle">Seattle</button>
        <button class="chip" data-try="London">London</button>
        <button class="chip" data-try="Fairbanks">Fairbanks</button>
      </div>
    </main>
    ${footer()}`;
  bind();
}

function renderLoading(text: string) {
  app.innerHTML = `${header()}<main class="loading"><div class="spinner">${seal(64)}</div><p>${esc(text)}</p></main>`;
  bind();
}

function renderAlerts(): string {
  if (alerts.length === 0) return '';
  const intro = pick(lines.alerts, alerts.map((a) => a.event).join('|'));
  return `
  <section class="alerts" aria-label="Active weather warnings">
    <p class="alerts-intro">${esc(intro)}</p>
    ${alerts
      .map(
        (a) => `
      <details class="alert">
        <summary><strong>${esc(a.event)}</strong><span>${esc(a.headline)}</span></summary>
        <div class="alert-body">
          <p>${esc(a.description).replace(/\n\n/g, '</p><p>').replace(/\n/g, ' ')}</p>
          ${a.instruction ? `<p><strong>What to do:</strong> ${esc(a.instruction).replace(/\n/g, ' ')}</p>` : ''}
          <p class="alert-source">Source: National Weather Service. Shown exactly as issued.</p>
        </div>
      </details>`,
      )
      .join('')}
  </section>`;
}

function renderForecast() {
  if (!place || !forecast) return;
  const f = forecast;
  const b = buildBriefing(place, f);
  const official = officialTemp(f.units);
  const cur = f.current;
  const tier = b.denial <= 20 ? 'calm' : b.denial <= 50 ? 'firm' : b.denial <= 80 ? 'defensive' : 'unraveling';
  const unitWord = f.units === 'imperial' ? 'mph' : 'km/h';

  const days = f.daily
    .map((d, i) => {
      const c = conditionFromCode(d.code);
      return `
      <li class="day">
        <span class="day-name">${dayName(d.date, i)}</span>
        <span class="day-icon">
          <span class="official-only">${weatherIcon('official', true, 34)}</span>
          <span class="actual-only" title="${conditionLabel[c]}">${weatherIcon(c, true, 34)}</span>
        </span>
        <span class="day-temps">
          <span class="official-only">${deg(official)}<small> / ${deg(official)}</small></span>
          <span class="actual-only">${deg(d.high)}<small> / ${deg(d.low)}</small></span>
        </span>
        <span class="day-caption">
          <span class="official-only">${esc(forecastCaption(d, f.units, place!))}</span>
          <span class="actual-only">${conditionLabel[c]}${d.precipChance != null && d.precipChance >= 20 ? ` · ${d.precipChance}%` : ''}</span>
        </span>
      </li>`;
    })
    .join('');

  app.innerHTML = `
    ${header()}
    <main class="briefing tier-${tier}">
      ${renderAlerts()}
      <p class="dateline">${esc(placeLabel(place).toUpperCase())} &mdash; ${esc(longDate(f.today))}</p>

      <section class="podium">
        <div class="reading">
          <div class="reading-icon">
            <span class="official-only">${weatherIcon('official', cur.isDay, 96)}</span>
            <span class="actual-only">${weatherIcon(b.condition, cur.isDay, 96)}</span>
          </div>
          <div class="reading-temp">
            <span class="temp-official">${deg(official)}</span>
            <span class="temp-actual actual-only">${deg(cur.temp)}</span>
          </div>
          <div class="reading-label">
            <span class="official-only">Clear · ${esc(lines.factcheck.label_official)}</span>
            <span class="actual-only">${conditionLabel[b.condition]} · feels like ${deg(cur.feelsLike)} · wind ${Math.round(cur.wind)} ${unitWord}</span>
          </div>
          <div class="stamp stamp-official official-only">Official</div>
          <div class="stamp stamp-actual actual-only">${esc(lines.factcheck.label_actual)}</div>
        </div>

        ${
          alerts.length > 0
            ? `<blockquote class="quote quote-suspended">
          <p class="headline">Today's briefing is suspended.</p>
          <p class="support">There's an active warning for this area. Real conditions are shown here, and the warning is above.</p>
          <footer>&mdash; Ministry of Weather</footer>
        </blockquote>`
            : `<blockquote class="quote">
          <p class="headline">&ldquo;${esc(b.headline)}&rdquo;</p>
          <p class="support">${esc(b.conditionLine)} ${esc(b.extraLine)}</p>
          <footer>&mdash; Clement Skye, Deputy Press Secretary</footer>
        </blockquote>`
        }
      </section>

      <section class="controls">
        <div class="mode" role="group" aria-label="Forecast version">
          <button data-mode="official" aria-pressed="true">Official</button>
          <button data-mode="actual" aria-pressed="false">Fact-check</button>
        </div>
        <p class="mode-note" aria-live="polite"></p>
      </section>

      <section class="denial" aria-label="Denial Index">
        <div class="denial-head">
          <span>Denial Index</span>
          <strong>${b.denial}</strong>
        </div>
        <div class="denial-bar"><span style="width:${b.denial}%"></span></div>
        <p class="denial-scale"><span>Reality agrees</span><span>Please stop asking</span></p>
      </section>

      <section class="week">
        <h2>Seven-day outlook</h2>
        <ul class="days">${days}</ul>
      </section>

      <section class="share">
        <button class="secondary share-btn">Share this forecast</button>
      </section>
    </main>
    ${footer(b.signoff)}`;
  document.title =
    alerts.length > 0
      ? `Weather warning in ${place.name} — Alternative Weather`
      : `${deg(official)} and clear in ${place.name} — Alternative Weather`;
  bind();
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function load(p: Place) {
  place = p;
  store.set(STORE_PLACE, p);
  setUrl(p);
  renderLoading(pickRandom(lines.states.loading));
  try {
    const [f, a] = await Promise.all([getForecast(p, units), getAlerts(p)]);
    forecast = f;
    alerts = a;
    // During an active warning, open on the real data.
    document.body.dataset.mode = alerts.length > 0 ? 'actual' : 'official';
    renderForecast();
    syncModeButtons();
  } catch (err) {
    console.error(err);
    renderLanding(pickRandom(lines.states.data_error));
  }
}

function locate() {
  if (!('geolocation' in navigator)) {
    renderLanding(pickRandom(lines.states.location_denied));
    return;
  }
  renderLoading(pickRandom(lines.states.locating));
  navigator.geolocation.getCurrentPosition(
    async (pos) => load(await reverseGeocode(pos.coords.latitude, pos.coords.longitude)),
    () => renderLanding(pickRandom(lines.states.location_denied)),
    { timeout: 10000, maximumAge: 30 * 60 * 1000 },
  );
}

function syncModeButtons() {
  const mode = document.body.dataset.mode;
  document.querySelectorAll<HTMLButtonElement>('.mode button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });
}

function setMode(mode: 'official' | 'actual') {
  if (document.body.dataset.mode === mode) return;
  document.body.dataset.mode = mode;
  syncModeButtons();
  const note = document.querySelector('.mode-note');
  if (note) {
    note.textContent = pickRandom(
      mode === 'actual' ? lines.factcheck.toggle_on : lines.factcheck.toggle_off,
    );
  }
}

async function share() {
  if (!place || !forecast) return;
  const text = `Official forecast for ${place.name}: ${deg(officialTemp(units))} and clear. (Actual: ${deg(forecast.current.temp)}, ${conditionLabel[conditionFromCode(forecast.current.code)].toLowerCase()}.) #notmyweather`;
  const url = location.href;
  const btn = document.querySelector<HTMLButtonElement>('.share-btn');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Alternative Weather', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    if (btn) btn.textContent = 'Copied. The Ministry thanks you.';
  } catch {
    /* user cancelled */
  }
}

let searchTimer: number | undefined;
let lastResults: Place[] = [];

function showResults(results: Place[], list: HTMLUListElement, emptyText = '') {
  lastResults = results;
  if (results.length === 0 && !emptyText) {
    list.hidden = true;
    return;
  }
  list.innerHTML =
    results.length > 0
      ? results
          .map((r, i) => `<li><button type="button" data-i="${i}">${esc(placeLabel(r))}</button></li>`)
          .join('')
      : `<li class="empty">${esc(emptyText)}</li>`;
  list.hidden = false;
}

function bind() {
  const form = app.querySelector<HTMLFormElement>('.search')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  const list = form.querySelector<HTMLUListElement>('.results')!;

  input.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    const q = input.value;
    if (q.trim().length < 2) return showResults([], list);
    searchTimer = window.setTimeout(async () => {
      try {
        showResults(await searchPlaces(q), list, pickRandom(lines.states.not_found));
      } catch {
        showResults([], list);
      }
    }, 250);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const results = lastResults.length ? lastResults : await searchPlaces(input.value);
    if (results[0]) load(results[0]);
    else showResults([], list, pickRandom(lines.states.not_found));
  });
  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-i]');
    if (btn) load(lastResults[Number(btn.dataset.i)]);
  });
  document.addEventListener(
    'click',
    (e) => {
      if (!form.contains(e.target as Node)) list.hidden = true;
    },
    { once: true },
  );

  app.querySelectorAll('.locate').forEach((b) => b.addEventListener('click', locate));
  app.querySelectorAll<HTMLButtonElement>('[data-try]').forEach((b) =>
    b.addEventListener('click', async () => {
      const [first] = await searchPlaces(b.dataset.try!);
      if (first) load(first);
    }),
  );
  app.querySelectorAll<HTMLButtonElement>('.mode button').forEach((b) =>
    b.addEventListener('click', () => setMode(b.dataset.mode as 'official' | 'actual')),
  );
  app.querySelectorAll<HTMLButtonElement>('[data-units]').forEach((b) =>
    b.addEventListener('click', () => {
      const next = b.dataset.units as Units;
      if (next === units) return;
      units = next;
      store.set(STORE_UNITS, units);
      if (place) load(place);
      else renderLanding();
    }),
  );
  app.querySelector('.share-btn')?.addEventListener('click', share);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
const initial = placeFromUrl() ?? store.get<Place>(STORE_PLACE);
if (initial) load(initial);
else renderLanding();
