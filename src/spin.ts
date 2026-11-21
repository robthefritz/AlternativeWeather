// The spin engine: turns real weather into the Ministry's official position.
import rawLines from '../content/spin-lines.yaml';
import {
  type Condition,
  conditionFromCode,
  denialIndex,
  tempBand,
  toF,
  toMph,
  windBand,
} from './conditions';
import type { DailyWeather, Forecast, Place, Units } from './weather';

export interface SpinLibrary {
  headlines: Record<'calm' | 'firm' | 'defensive' | 'unraveling', string[]>;
  conditions: Record<Condition, string[]>;
  temperature: Record<string, string[]>;
  wind: Record<'breezy' | 'gale', string[]>;
  forecast_captions: string[];
  forecast_captions_strained: string[];
  factcheck: {
    toggle_on: string[];
    toggle_off: string[];
    label_actual: string;
    label_official: string;
  };
  alerts: string[];
  signoffs: string[];
  states: Record<string, string[]>;
}

export const lines = rawLines as SpinLibrary;

export const officialTemp = (units: Units) => (units === 'imperial' ? 75 : 24);

/** FNV-1a. Small, fast, and stable across browsers. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Pick a line deterministically from a seed, so the same city on the same day
 * always gets the same text (a shared link shows what the sharer saw).
 */
export function pick(list: string[] | undefined, seed: string): string {
  if (!list || list.length === 0) return '';
  return list[hash(seed) % list.length];
}

export function pickRandom(list: string[] | undefined): string {
  if (!list || list.length === 0) return '';
  return list[Math.floor(Math.random() * list.length)];
}

export type Tokens = Record<string, string>;

export function fill(template: string, tokens: Tokens): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => tokens[key] ?? m);
}

export function headlineTier(denial: number): keyof SpinLibrary['headlines'] {
  if (denial <= 20) return 'calm';
  if (denial <= 50) return 'firm';
  if (denial <= 80) return 'defensive';
  return 'unraveling';
}

export interface Briefing {
  denial: number;
  condition: Condition;
  headline: string;
  conditionLine: string;
  extraLine: string;
  signoff: string;
  tokens: Tokens;
}

const deg = (n: number) => `${Math.round(n)}°`;

export function buildTokens(place: Place, f: Forecast): Tokens {
  const official = officialTemp(f.units);
  const today = f.daily[0];
  return {
    temp: deg(f.current.temp),
    official: deg(official),
    high: today ? deg(today.high) : deg(f.current.temp),
    low: today ? deg(today.low) : deg(f.current.temp),
    city: place.name,
    wind: `${Math.round(f.current.wind)} ${f.units === 'imperial' ? 'mph' : 'km/h'}`,
    gap: deg(Math.abs(official - f.current.temp)),
  };
}

export function buildBriefing(place: Place, f: Forecast): Briefing {
  const tempF = toF(f.current.temp, f.units);
  const mph = toMph(f.current.wind, f.units);
  const condition = conditionFromCode(f.current.code);
  const denial = denialIndex(tempF, condition, mph);
  const tokens = { ...buildTokens(place, f), denial: String(denial) };

  // Seed: rounded location + local date. Same place, same day, same briefing.
  const seed = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}|${f.today}`;

  const wb = windBand(mph);
  const extraTemplate =
    wb !== 'calm'
      ? pick(lines.wind[wb], `${seed}|wind`)
      : pick(lines.temperature[tempBand(tempF)], `${seed}|temp`);

  return {
    denial,
    condition,
    tokens,
    headline: fill(pick(lines.headlines[headlineTier(denial)], `${seed}|head`), tokens),
    conditionLine: fill(pick(lines.conditions[condition], `${seed}|cond`), tokens),
    extraLine: fill(extraTemplate, tokens),
    signoff: fill(pick(lines.signoffs, `${seed}|sign`), tokens),
  };
}

export function dayDenial(day: DailyWeather, units: Units): number {
  // Judge a forecast day by the warmer or colder extreme, whichever is further from 75°.
  const hiF = toF(day.high, units);
  const loF = toF(day.low, units);
  const worst = Math.abs(hiF - 75) > Math.abs(loF - 75) ? hiF : loF;
  return denialIndex(worst, conditionFromCode(day.code), 0);
}

export function forecastCaption(day: DailyWeather, units: Units, place: Place): string {
  const seed = `${place.lat.toFixed(2)},${place.lon.toFixed(2)}|${day.date}|cap`;
  const strained = dayDenial(day, units) > 60;
  return pick(strained ? lines.forecast_captions_strained : lines.forecast_captions, seed);
}
