# Global Intelligence Analytics Dashboard

A full-stack monorepo for a standalone Global Intelligence Analytics Dashboard — combining economic, health, and energy data with an AI-powered insights panel.

## Architecture

```
/
├── apps/
│   ├── web/       # React 18 + Vite + TypeScript + Tailwind CSS (SPA)
│   └── worker/    # Cloudflare Worker API (TypeScript + Wrangler)
├── package.json   # npm workspaces root
└── README.md
```

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS v3     |
| Charts    | Recharts (Scatter, Line)                        |
| Icons     | Lucide React                                    |
| Backend   | Cloudflare Workers (TypeScript, Wrangler v3)    |
| Cache     | Cloudflare KV (`GLOBAL_DATA_KV`, TTL 24 h)     |
| AI        | Cloudflare Workers AI (`@cf/meta/llama-3-8b-instruct`) |

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (workspaces support)
- **Wrangler CLI** — installed automatically as a dev dependency in `apps/worker`
- A **Cloudflare account** with Workers, KV, and AI enabled (for deployment)

## Local Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2a. Start the frontend dev server (http://localhost:5173)
npm run dev:web

# 2b. Start the Cloudflare Worker locally (http://localhost:8787)
npm run dev:worker
```

The Vite dev server proxies `/api/*` → `http://localhost:8787`, so running
both simultaneously gives a fully integrated local environment.

> **Note:** The frontend includes mock data so it works without the worker
> running. When `/api/summary` is unreachable, a client-side fallback summary
> is displayed instead.

## Environment Variables / Bindings

Before deploying (or running `wrangler dev` with live KV/AI), edit
`apps/worker/wrangler.json` and replace the placeholder IDs:

```json
"kv_namespaces": [
  {
    "binding": "GLOBAL_DATA_KV",
    "id": "<your-kv-namespace-id>",
    "preview_id": "<your-kv-preview-id>"
  }
]
```

Create a KV namespace:

```bash
npx wrangler kv:namespace create GLOBAL_DATA_KV
npx wrangler kv:namespace create GLOBAL_DATA_KV --preview
```

## Data Sources (Joined by ISO3 + Year)

| Source     | Metrics                                            |
|------------|----------------------------------------------------|
| World Bank | GDP, GDP/capita, growth rate, population, Gini     |
| OWID/IHME  | Life expectancy, under-5 mortality, DALYs, health spend |
| Energy     | Primary energy (TWh), intensity, renewable share, CO₂ |

The worker joins these datasets by `iso3` + `year`. World Bank economic indicators
are fetched from the [World Bank Indicators API](https://api.worldbank.org/v2/)
by `apps/worker/src/sources/worldBank.ts` and merged in
`apps/worker/src/index.ts`. The OWID, IHME, and energy values remain local
development data until their source adapters are added.

The World Bank adapter currently captures:

| Metric | Indicator |
|--------|-----------|
| GDP | `NY.GDP.MKTP.CD` |
| GDP per capita | `NY.GDP.PCAP.CD` |
| GDP growth rate | `NY.GDP.MKTP.KD.ZG` |
| Population | `SP.POP.TOTL` |
| Gini coefficient | `SI.POV.GINI` |
| Internet penetration | `IT.NET.USER.ZS` |
| Urban population | `SP.URB.TOTL.IN.ZS` |
| Life expectancy at birth | `SP.DYN.LE00.IN` |

To create a local analysis sample for the ten dashboard countries across
1990–2023, run:

```bash
npm run sample:world-bank
```

This writes `data/raw/world-bank/sample.json`. The file includes source
metadata, indicator codes, the selected country list, year range, and records
joined by `countryCode` + `year`. It is a reproducible local analysis artifact,
not a replacement for the Worker KV cache.

OWID energy data is sourced from the maintained
[owid/energy-data CSV](https://github.com/owid/energy-data). To create a local
energy sample, run:

```bash
npm run sample:owid
```

This writes `data/raw/owid/energy-sample.json` with primary energy, energy per
capita, and renewable energy share records for the same countries and years.

IHME GBD exports must be downloaded through the official
[GBD Results Tool](https://ghdx.healthdata.org/gbd-results-tool) and placed in
`data/raw/ihme`. They are not exposed through the same kind of public API as
World Bank or OWID. After placing an authorized CSV export there, normalize it
with:

```bash
npm run prepare:ihme
```

The preprocessor writes `data/processed/ihme/health.json`, filtering DALYs to
all causes, both sexes, all ages, and rate. It also captures life expectancy
rows when they are present in the export.

During local Worker builds, `apps/worker/src/data.ts` bundles this processed
artifact and uses its real DALY rates in `/api/data`. Countries or years absent
from the export continue using the development fallback values. A deployed
Worker should move this processed artifact to a managed object or data store
instead of relying on a repository-local JSON import.

If the upstream World Bank request fails, `/api/data` falls back to the local
development values for that request. The outer API response is still cached in
KV for 24 hours when the KV binding is configured.

## API Reference

### `GET /api/data`

Returns a time-series (current year − 6 → current year) for a country.

| Parameter | Type   | Default | Description               |
|-----------|--------|---------|---------------------------|
| `iso3`    | string | `USA`   | ISO 3166-1 alpha-3 code   |
| `year`    | number | `2023`  | Reference year (1990–2026)|

**Response:**
```json
{
  "data": [ { "iso3": "USA", "year": 2023, "gdpPerCapitaUsd": 80412, ... } ],
  "cached": false,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/summary`

Generates an AI summary using Llama-3-8B (cached 24 h in KV).

| Parameter | Type   | Default | Description             |
|-----------|--------|---------|-------------------------|
| `iso3`    | string | `USA`   | ISO 3166-1 alpha-3 code |
| `year`    | number | `2023`  | Reference year          |

**Response:**
```json
{
  "text": "In 2023, the United States ...",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "cached": false
}
```

## Build

```bash
# Build the frontend (outputs to apps/web/dist)
npm run build:web

# Dry-run the worker build
npm run build:worker
```

## Deployment

### Frontend → Cloudflare Pages

```bash
# Deploy apps/web/dist to Cloudflare Pages
npx wrangler pages deploy apps/web/dist --project-name global-intelligence-dashboard
```

### Backend → Cloudflare Workers

```bash
cd apps/worker
npx wrangler deploy
```

### Full build + deploy

```bash
npm run build
cd apps/worker && npx wrangler deploy
```

## Project Structure

```
apps/web/src/
├── types.ts                  # GlobalEntityMetric & shared interfaces
├── index.css                 # Tailwind base + component utilities
├── main.tsx                  # React entry point
├── App.tsx                   # Root component (state, KPIs, layout)
└── components/
    ├── Header.tsx            # Country selector + timeline slider
    ├── KpiCard.tsx           # KPI metric card with YoY delta badge
    ├── Charts.tsx            # Scatter (GDP/LE) + Line (Energy/DALYs)
    └── AIInsightsPanel.tsx   # AI summary panel with skeleton loader

apps/worker/src/
├── types.ts                  # Env bindings + GlobalEntityMetric
├── data.ts                   # joinMetrics() — WB + OWID + Energy join
└── index.ts                  # Worker entry: /api/data, /api/summary
```