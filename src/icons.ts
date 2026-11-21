// Simple stroked weather icons. Inherit color via currentColor.
import type { Condition } from './conditions';

const svg = (body: string, size: number) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const sun = (cx = 24, cy = 24, r = 8) => {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(a) * (r + 5);
    const y1 = cy + Math.sin(a) * (r + 5);
    const x2 = cx + Math.cos(a) * (r + 10);
    const y2 = cy + Math.sin(a) * (r + 10);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r}"/>${rays}`;
};
const moon = `<path d="M30 9a15 15 0 1 0 9 26A13 13 0 0 1 30 9z"/>`;
const cloud = (dy = 0) =>
  `<path transform="translate(0 ${dy})" d="M14 34h21a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 0 13z"/>`;
const drops = (heavy: boolean) =>
  (heavy ? [14, 21, 28, 35] : [17, 25, 33])
    .map((x) => `<line x1="${x}" y1="38" x2="${x - 2}" y2="44"/>`)
    .join('');
const flakes = (heavy: boolean) =>
  (heavy ? [14, 21, 28, 35] : [17, 25, 33])
    .map((x) => `<circle cx="${x}" cy="41" r="1.2" fill="currentColor"/>`)
    .join('');

export function weatherIcon(c: Condition | 'official', isDay: boolean, size = 48): string {
  switch (c) {
    case 'official':
    case 'clear':
      return svg(isDay ? sun() : moon, size);
    case 'partly_cloudy':
      return svg(
        `${isDay ? sun(17, 17, 6) : '<path d="M20 6a9 9 0 1 0 6 15 8 8 0 0 1-6-15z"/>'}${cloud(4)}`,
        size,
      );
    case 'overcast':
      return svg(cloud(-2), size);
    case 'fog':
      return svg(
        `${cloud(-6)}<line x1="9" y1="36" x2="39" y2="36"/><line x1="12" y1="42" x2="36" y2="42"/>`,
        size,
      );
    case 'drizzle':
    case 'rain':
      return svg(`${cloud(-4)}${drops(false)}`, size);
    case 'heavy_rain':
      return svg(`${cloud(-4)}${drops(true)}`, size);
    case 'thunderstorm':
      return svg(`${cloud(-4)}<path d="M25 31l-5 8h6l-4 7"/>`, size);
    case 'snow':
      return svg(`${cloud(-4)}${flakes(false)}`, size);
    case 'heavy_snow':
      return svg(`${cloud(-4)}${flakes(true)}`, size);
    case 'freezing':
      return svg(`${cloud(-4)}${drops(false)}<circle cx="37" cy="41" r="1.2" fill="currentColor"/>`, size);
  }
}

// The Ministry seal: a sun inside a ring with a laurel-ish band.
export const seal = (size = 44) =>
  `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="var(--navy)" stroke="var(--gold)" stroke-width="2"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="var(--gold)" stroke-width="1" stroke-dasharray="2 3"/>
    <g stroke="var(--gold)" stroke-width="2.2" stroke-linecap="round" fill="none">${sun(32, 32, 8)}</g>
    <circle cx="32" cy="32" r="8" fill="var(--gold)"/>
  </svg>`;
