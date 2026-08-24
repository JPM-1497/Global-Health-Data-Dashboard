# Development Status

Last updated: 2026-08-23

## Current State

The project is a React/Vite dashboard backed by a Cloudflare Worker. The UI was recently simplified into a modern, minimal layout: a static header with a subtle year-range filter, a horizontally scrollable KPI strip of category averages, and a two-tab content area (`Overview` and `Country metrics`).

The dashboard combines:

- World Bank API data: GDP, GDP per capita, growth, population, tax revenue (% GDP), Gini, internet penetration, urban population, and life expectancy.
- OWID energy data: primary energy, energy per capita, and renewable energy share.
- IHME GBD data: all-cause DALY rate for both sexes and all ages, with upper/lower uncertainty bounds where present.

Records are joined by country ISO3 code and year. The local Worker exposes blended records through `/api/data`; the frontend uses that endpoint when available and falls back to a local mock generator otherwise.

## UI Features

- Static header with a compact two-dropdown year-range filter (1990–2026).
- Scrollable KPI strip showing cross-country averages for 10 categories (GDP per capita, population, tax revenue, life expectancy, DALYs, Gini, urban population, internet access, renewable share, primary energy), each labeled with the active period.
- Two-tab content area:
  - **Overview** — indexed metric trend chart with:
    - `Metrics` mode: multiple metrics for one country (pill selectors).
    - `Countries` mode: one metric across up to 5 countries (metric dropdown + country pills, seeded USA/CHN/IND).
    - `Index | Actual` scale toggle, dashed start-at-100 baseline, and an info popover explaining the indexing.
  - **Country metrics** — global comparison table with metric definitions, independent of country selection.
- Country selection drives the trend chart focus; the comparison table remains global.

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
- The frontend still has a mock-data fallback when the Worker is unavailable.
- The AI summary panel was removed from the UI in the latest simplification; the `/api/summary` Worker route still exists and is ready to be re-wired.

## Recommended Next Steps

1. **Integrate AI/LLM components**: reintroduce an insights surface powered by the Worker's `/api/summary` route (Cloudflare Workers AI, `@cf/meta/llama-3-8b-instruct`), e.g. narrative takeaways per tab, anomaly callouts on the trend chart, and natural-language metric explanations in the comparison table.
2. Add loading/error/source-status states so users can distinguish live, cached, and fallback values.
3. Move processed health and energy artifacts behind a production data store rather than bundling.
4. Add an explicit source/provenance view showing IHME coverage gaps.
5. Add tests for source normalization, country/year joins, range validation, and frontend metric selection.
6. Configure real Cloudflare KV namespace IDs and deployment settings before production release.
