// Free, keyless data sources. Everything runs in the visitor's browser.
//   Open-Meteo forecast + geocoding: https://open-meteo.com (non-commercial free tier)
//   NWS alerts (US only):            https://www.weather.gov/documentation/services-web-api
//   BigDataCloud reverse geocode:    client-side free endpoint, used to name a GPS location

export type Units = 'imperial' | 'metric';

export interface Place {
  name: string;
  region?: string; // state / province / country, for display
  lat: number;
  lon: number;
  countryCode?: string;
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  code: number; // WMO weather code
  wind: number;
  isDay: boolean;
}

export interface DailyWeather {
  date: string; // YYYY-MM-DD in the place's local time
  code: number;
  high: number;
  low: number;
  precipChance: number | null;
}

export interface Forecast {
  units: Units;
  timezone: string;
  today: string; // YYYY-MM-DD local
  current: CurrentWeather;
  daily: DailyWeather[];
}

export interface Alert {
  event: string;
  headline: string;
  severity: string;
  description: string;
  instruction: string;
  url: string;
}

export async function getForecast(place: Place, units: Units): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: units === 'imperial' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: units === 'imperial' ? 'mph' : 'kmh',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Forecast request failed: ${res.status}`);
  const d = await res.json();

  const daily: DailyWeather[] = d.daily.time.map((date: string, i: number) => ({
    date,
    code: d.daily.weather_code[i],
    high: d.daily.temperature_2m_max[i],
    low: d.daily.temperature_2m_min[i],
    precipChance: d.daily.precipitation_probability_max?.[i] ?? null,
  }));

  return {
    units,
    timezone: d.timezone,
    today: daily[0]?.date ?? String(d.current.time).slice(0, 10),
    current: {
      temp: d.current.temperature_2m,
      feelsLike: d.current.apparent_temperature,
      code: d.current.weather_code,
      wind: d.current.wind_speed_10m,
      isDay: d.current.is_day === 1,
    },
    daily,
  };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({ name: q, count: '6', language: 'en', format: 'json' });
  // Five digits looks like a US ZIP code; scope it so it doesn't match elsewhere.
  if (/^\d{5}$/.test(q)) params.set('countryCode', 'US');
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const d = await res.json();
  return (d.results ?? []).map((r: any) => ({
    name: r.name,
    region: [r.admin1, r.country_code === 'US' ? null : r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    countryCode: r.country_code,
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  const fallback: Place = { name: 'Your location', lat, lon };
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      localityLanguage: 'en',
    });
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
    if (!res.ok) return fallback;
    const d = await res.json();
    const name = d.city || d.locality;
    if (!name) return fallback;
    return {
      name,
      region: d.countryCode === 'US' ? d.principalSubdivision : d.countryName,
      lat,
      lon,
      countryCode: d.countryCode,
    };
  } catch {
    return fallback;
  }
}

// NWS only covers the US. We show warnings (and anything rated Severe/Extreme)
// exactly as issued: the Ministry never spins these.
export async function getAlerts(place: Place): Promise<Alert[]> {
  if (place.countryCode && place.countryCode !== 'US') return [];
  try {
    const point = `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${point}`, {
      headers: { Accept: 'application/geo+json' },
    });
    if (!res.ok) return [];
    const d = await res.json();
    return (d.features ?? [])
      .map((f: any) => f.properties)
      .filter(
        (p: any) =>
          /warning/i.test(p.event) || p.severity === 'Severe' || p.severity === 'Extreme',
      )
      .map((p: any) => ({
        event: p.event,
        headline: p.headline ?? p.event,
        severity: p.severity,
        description: p.description ?? '',
        instruction: p.instruction ?? '',
        url: p['@id'] ?? 'https://www.weather.gov/',
      }));
  } catch {
    return [];
  }
}
