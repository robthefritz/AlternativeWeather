# Alternative Weather — Rebuild Plan

_Started November 2026. Living document: update it as decisions change._

## What the site is

**Every forecast comes in two versions: the Official one and the Actual one.**

The Ministry of Weather, through its spokesperson, insists conditions are always
75° and sunny. Real forecast data sits underneath. The joke is the gap between the
two. Because the data is real, the site is also genuinely useful.

This goes back to the original 2018 idea ("alternative facts" applied to weather,
`#notmyweather`). The Aug 2025 rebuild into a generic weather app dropped that idea,
and this rebuild brings it back.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Concept | Satire + real data | Keeps the original joke and makes it useful |
| Voice | Fictional **Ministry of Weather** spokesperson | Same gaslighting energy, not tied to one figure or news cycle, room to grow |
| Expansion | Built so guest spokespeople can be added later | Corporate PR, wellness influencer, realtor... |
| Weather data | Open-Meteo (forecast + geocoding) + NWS (US alerts) | Free, no API keys, calls made from the browser |
| Hosting | Cloudflare Pages (+ Workers free tier when needed) | $0, HTTPS, CDN |
| Ongoing cost | Domain renewal only (~$20/yr) | |
| Repo | Same repo, `rebuild-2026` branch | Keeps the history back to 2018 |

## Hard rules

1. **Real warnings never get spun.** NWS warnings (tornado, flood, heat, winter storm...)
   appear plainly at the top, in a plain style. The spokesperson can say they
   can't spin this one, but the warning itself is shown exactly as issued.
2. **The real data is always one tap away.** The Fact-check toggle shows the actual
   numbers. The site should be usable as a real weather site.
3. **No secrets in the browser.** Nothing that needs an API key runs client-side.
4. **No runtime AI cost.** Spin lines are a hand-edited library in `content/`.

## Core features

- **Official vs. Fact-check toggle.** Official is the default view. Fact-check shows the
  real numbers, with the official ones crossed out and corrected.
- **Spin that reacts to the real weather.** Lines are chosen by condition, severity and
  temperature band, filled in with real values (`{temp}`, `{city}`...).
- **Denial Index (0–100).** How far reality is from 75° and clear. The higher it is,
  the more desperate the spin gets.
- **7-day forecast**, Official and Actual, side by side.
- **Location.** Browser geolocation first, search box as fallback, shareable
  `?city=` links, last location remembered.

## Phases

### Phase 0: Voice and content
- [x] Pick the concept and voice
- [ ] Settle the spokesperson's name and character (`content/spokesperson.md`)
- [ ] Edit the first batch of spin lines (`content/spin-lines.yaml`)
- [x] Choose a look: "official government press office" (navy, parchment, gold; red marker for fact-checks)

### Phase 1: MVP ($0) ← _we are here_
- [x] Scaffold a static site (Vite + plain TypeScript, no framework)
- [x] Open-Meteo forecast + geocoding (city names and US ZIPs); map WMO weather codes to our conditions
- [x] Denial Index + spin-line picker (deterministic per city/day, so a shared link shows the same line)
- [x] NWS alerts banner (US only). During a warning the briefing is suspended and the page opens on real data
- [x] Official / Fact-check toggle, 7-day forecast, mobile-first layout, light/dark, °F/°C
- [x] Share button (native share sheet, or copy to clipboard)
- [ ] Deploy a preview to `*.pages.dev`

### Phase 2: Switch over and cut costs
- [ ] Move the domain's DNS to Cloudflare (free), point it at Pages
- [ ] Confirm the new site is live, then shut down the EC2 instance (nginx, us-east-2)
- [ ] Revoke the OpenWeatherMap API key (it's currently publicly readable at `/config.js`)
- [x] Delete the old site files from the branch (they remain in `master` history)

### Phase 3: Make it shareable
- [ ] Per-city share cards (Worker-generated images: "Official: 75° and perfect. Actual: 14° and sleet.")
- [ ] `#notmyweather` share buttons (Bluesky, Threads, X, copy link)

### Phase 4: Fun extras (any order)
- [ ] Daily "Weather Press Briefing" (a scheduled Worker writes one national summary each morning)
- [ ] "Most Denied" leaderboard: cities with the worst weather today
- [ ] Historical revisionism: "Last year today it was 31°. That never happened."
- [ ] Guest spokespeople

## Limits to know
- Open-Meteo's free tier is **non-commercial**. Revisit this before adding ads or sponsorships.
- Forecast calls run in each visitor's browser, so traffic doesn't share one rate limit.
