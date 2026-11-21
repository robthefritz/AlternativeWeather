import { describe, expect, it } from 'vitest';
import { conditionFromCode, denialIndex } from './conditions';
import { buildBriefing, fill, headlineTier, lines, pick } from './spin';
import type { Forecast, Place } from './weather';

const place: Place = { name: 'Richmond', lat: 37.55, lon: -77.46, countryCode: 'US' };

function forecast(temp: number, code: number, wind = 5): Forecast {
  return {
    units: 'imperial',
    timezone: 'America/New_York',
    today: '2026-11-20',
    current: { temp, feelsLike: temp, code, wind, isDay: true },
    daily: [{ date: '2026-11-20', code, high: temp + 5, low: temp - 10, precipChance: 0 }],
  };
}

describe('spin library', () => {
  it('has lines for every condition and headline tier', () => {
    for (const c of Object.values(lines.conditions)) expect(c.length).toBeGreaterThan(0);
    for (const h of Object.values(lines.headlines)) expect(h.length).toBeGreaterThan(0);
  });
});

describe('denial index', () => {
  it('is 0 for a perfect day', () => {
    expect(denialIndex(75, 'clear', 0)).toBe(0);
  });
  it('maxes out for a frigid ice storm', () => {
    expect(denialIndex(10, 'freezing', 40)).toBe(100);
  });
  it('maps tiers', () => {
    expect(headlineTier(10)).toBe('calm');
    expect(headlineTier(95)).toBe('unraveling');
  });
});

describe('briefing', () => {
  it('is deterministic for the same place and day', () => {
    const a = buildBriefing(place, forecast(40, 61));
    const b = buildBriefing(place, forecast(40, 61));
    expect(a.headline).toBe(b.headline);
    expect(a.conditionLine).toBe(b.conditionLine);
  });
  it('fills every token', () => {
    for (const [temp, code, wind] of [
      [10, 75, 40],
      [75, 0, 0],
      [100, 95, 20],
      [50, 45, 0],
    ]) {
      const b = buildBriefing(place, forecast(temp, code, wind));
      for (const text of [b.headline, b.conditionLine, b.extraLine, b.signoff]) {
        expect(text).not.toMatch(/\{\w+\}/);
      }
    }
  });
  it('uses rain lines for rain', () => {
    expect(conditionFromCode(61)).toBe('rain');
    const b = buildBriefing(place, forecast(55, 61));
    expect(lines.conditions.rain.map((l) => fill(l, b.tokens))).toContain(b.conditionLine);
  });
  it('pick handles empty lists', () => {
    expect(pick([], 'x')).toBe('');
  });
});
