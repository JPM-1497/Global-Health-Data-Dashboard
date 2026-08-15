# Development Status

Last updated: 2026-08-15

## Current State

The project is a React/Vite dashboard backed by a Cloudflare Worker. The current `main` branch includes the data-driven dashboard work in commit `05554f6` (`Build data-driven global analytics dashboard`).

The dashboard currently combines:

- World Bank API data: GDP, GDP per capita, growth, population, Gini, internet penetration, urban population, and life expectancy.
- OWID energy data: primary energy, energy per capita, and renewable energy share.
- IHME GBD data: all-cause DALY rate for both sexes and all ages, with upper/lower uncertainty bounds where present.

Records are joined by country ISO3 code and year. The local Worker exposes the blended records through `/api/data`; the frontend now uses that endpoint instead of its mock generator whenever the API is available.

## UI Features

- Country dropdown with ten supported countries.
- Interactive Earth-textured Three.js globe with country markers and selected-country rotation.
- Inclusive two-ended year range filter from 1990 to 2026.
- KPI cards for GDP per capita, life expectancy, DALYs, and renewable share.
- Existing comparison charts.
- Multi-select indexed metric trend chart for GDP per capita, life expectancy, DALYs, renewables, and primary energy.
- On-demand AI insights panel.

## Local Commands

From the repository root:

```powershell
npm install
npm run dev:web
npm run dev:worker
npm run build
```

The frontend runs at `http://127.0.0.1:5173` and the Worker runs at `http://127.0.0.1:8787`. Start both development servers for the fully integrated dashboard.

Refresh local samples with:

```powershell
npm run sample:world-bank
npm run sample:owid
npm run prepare:ihme
```

## Data Files

- `data/raw/world-bank/sample.json`: local World Bank sample.
- `data/raw/owid/energy-sample.json`: local OWID energy sample.
- `data/raw/ihme/`: authorized IHME CSV exports.
- `data/processed/ihme/health.json`: normalized IHME DALY data bundled by the local Worker.

## Known Limitations

- The IHME export currently covers eight of the ten dashboard countries; Japan and Australia use fallback DALY values.
- Life expectancy currently comes from the World Bank, not IHME.
- The Worker bundles the processed IHME JSON for local development. Production should move that artifact to managed storage or a database.
- Cloudflare KV IDs in `apps/worker/wrangler.json` are placeholders for deployment.
- The Worker uses Workers AI in local development, which can access the configured Cloudflare AI resource.
- The frontend still has a mock-data fallback when the Worker is unavailable.

## Recommended Next Steps

1. Add loading/error/source-status states to the frontend so users can distinguish live, cached, and fallback values.
2. Move the processed health and energy artifacts behind a production data store rather than bundling or downloading large CSVs at request time.
3. Add an explicit source/provenance view and show IHME coverage gaps.
4. Improve the globe with authoritative country boundaries or a maintained geographic texture if deeper map interaction is required.
5. Add tests for source normalization, country/year joins, range validation, and frontend metric selection.
6. Configure real Cloudflare KV namespace IDs and deployment settings before production release.