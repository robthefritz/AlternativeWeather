// Maps real weather into the categories the spin library is organized by.

export type Condition =
  | 'clear'
  | 'partly_cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'snow'
  | 'heavy_snow'
  | 'freezing';

export type TempBand = 'frigid' | 'cold' | 'cool' | 'ideal' | 'hot' | 'scorching';
export type WindBand = 'calm' | 'breezy' | 'gale';

// WMO weather interpretation codes, as used by Open-Meteo.
export function conditionFromCode(code: number): Condition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly_cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code === 51 || code === 53 || code === 55) return 'drizzle';
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'freezing';
  if (code === 61 || code === 80) return 'rain';
  if (code === 63 || code === 65 || code === 81 || code === 82) return 'heavy_rain';
  if (code === 71 || code === 77 || code === 85) return 'snow';
  if (code === 73 || code === 75 || code === 86) return 'heavy_snow';
  if (code >= 95) return 'thunderstorm';
  return 'overcast';
}

/** Plain-English label for the Fact-check view. */
export const conditionLabel: Record<Condition, string> = {
  clear: 'Clear',
  partly_cloudy: 'Partly cloudy',
  overcast: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  heavy_rain: 'Heavy rain',
  thunderstorm: 'Thunderstorms',
  snow: 'Snow',
  heavy_snow: 'Heavy snow',
  freezing: 'Freezing rain / sleet',
};

export const toF = (t: number, units: 'imperial' | 'metric') =>
  units === 'imperial' ? t : (t * 9) / 5 + 32;

export const toMph = (w: number, units: 'imperial' | 'metric') =>
  units === 'imperial' ? w : w / 1.609;

/** Bands are defined in °F; pass the temp already converted. */
export function tempBand(tempF: number): TempBand {
  if (tempF < 20) return 'frigid';
  if (tempF < 45) return 'cold';
  if (tempF < 65) return 'cool';
  if (tempF < 82) return 'ideal';
  if (tempF < 95) return 'hot';
  return 'scorching';
}

export function windBand(mph: number): WindBand {
  if (mph >= 30) return 'gale';
  if (mph >= 15) return 'breezy';
  return 'calm';
}

/** How un-75°-and-sunny each condition is, as a share of the Denial Index. */
const conditionPenalty: Record<Condition, number> = {
  clear: 0,
  partly_cloudy: 4,
  overcast: 12,
  fog: 18,
  drizzle: 20,
  rain: 30,
  heavy_rain: 42,
  snow: 36,
  heavy_snow: 50,
  thunderstorm: 50,
  freezing: 58,
};

/**
 * Denial Index, 0-100: how far reality is from the official 75° and clear.
 * Temperature distance does most of the work; precipitation and wind add to it.
 */
export function denialIndex(tempF: number, condition: Condition, windMph: number): number {
  const tempScore = Math.min(60, Math.abs(tempF - 75) * 1.2);
  const windScore = Math.min(15, Math.max(0, windMph - 10) * 0.6);
  return Math.round(Math.min(100, tempScore + conditionPenalty[condition] + windScore));
}
