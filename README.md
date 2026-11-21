# Alternative Weather

**The official forecast is 75° and clear. Everywhere. Always.**

Satire with real data: the Ministry of Weather's spokesperson spins your actual local
forecast, and a **Fact-check** toggle shows what's really happening. Real NWS warnings
are never spun.

See [PLAN.md](PLAN.md) for the roadmap and [content/spokesperson.md](content/spokesperson.md)
for the character.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # spin engine tests
npm run build    # static site in dist/
```

No API keys, no server. Everything runs in the browser.

## Where things live

| Path | What |
|---|---|
| `content/spin-lines.yaml` | Every line the spokesperson says. **Edit this to change the jokes.** |
| `content/spokesperson.md` | Character bible and tone rules |
| `src/weather.ts` | Data: Open-Meteo forecast + geocoding, NWS alerts, reverse geocoding |
| `src/conditions.ts` | Weather code → condition, temperature/wind bands, Denial Index |
| `src/spin.ts` | Picks and fills lines (fixed per city per day) |
| `src/main.ts` | Page rendering and interactions |
| `src/style.css` | The press-office look |

## Data sources (all free, no keys)

- [Open-Meteo](https://open-meteo.com/): forecast and place search. CC BY 4.0, free for non-commercial use.
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api): active US warnings.
- [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api): names your GPS location (client-side free endpoint).

## History

Started in 2018 as a joke site ("alternative facts" for weather, `#notmyweather`).
Briefly became a plain OpenWeatherMap app in 2025. Rebuilt in 2026 to bring the joke back.
