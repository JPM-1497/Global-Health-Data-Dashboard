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

The worker joins these three datasets by `iso3` + `year` in `apps/worker/src/data.ts`.

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