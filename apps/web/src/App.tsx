import { useState, useEffect, useCallback } from 'react'
import { Activity, Zap, DollarSign, Heart } from 'lucide-react'
import Header from './components/Header'
import KpiCard from './components/KpiCard'
import { GdpLifeExpChart, EnergyHealthChart } from './components/Charts'
import AIInsightsPanel from './components/AIInsightsPanel'
import type { GlobalEntityMetric, AISummary, KpiMetric } from './types'

/** Human-readable names matching COUNTRY_NAMES in apps/worker/src/data.ts */
const COUNTRY_NAMES: Record<string, string> = {
  USA: 'United States', CHN: 'China', IND: 'India', DEU: 'Germany',
  GBR: 'United Kingdom', BRA: 'Brazil', NGA: 'Nigeria', ZAF: 'South Africa',
  JPN: 'Japan', AUS: 'Australia',
}

/** Generate plausible mock data for the selected country + year range */
function generateMockData(iso3: string, year: number): GlobalEntityMetric[] {
  const base: Record<string, Partial<GlobalEntityMetric>> = {
    USA: { gdpPerCapitaUsd: 65000, lifeExpectancy: 78.9, daly100k: 23500, primaryEnergyTwh: 23000, renewableSharePct: 12 },
    CHN: { gdpPerCapitaUsd: 12500, lifeExpectancy: 77.3, daly100k: 25000, primaryEnergyTwh: 35000, renewableSharePct: 28 },
    IND: { gdpPerCapitaUsd: 2400, lifeExpectancy: 70.1, daly100k: 34000, primaryEnergyTwh: 9000, renewableSharePct: 18 },
    DEU: { gdpPerCapitaUsd: 48000, lifeExpectancy: 81.2, daly100k: 21000, primaryEnergyTwh: 3300, renewableSharePct: 46 },
    GBR: { gdpPerCapitaUsd: 43000, lifeExpectancy: 81.0, daly100k: 22000, primaryEnergyTwh: 2100, renewableSharePct: 40 },
    BRA: { gdpPerCapitaUsd: 8800, lifeExpectancy: 75.9, daly100k: 28000, primaryEnergyTwh: 3000, renewableSharePct: 45 },
    NGA: { gdpPerCapitaUsd: 2100, lifeExpectancy: 63.0, daly100k: 52000, primaryEnergyTwh: 160, renewableSharePct: 20 },
    ZAF: { gdpPerCapitaUsd: 6200, lifeExpectancy: 64.9, daly100k: 47000, primaryEnergyTwh: 580, renewableSharePct: 8 },
    JPN: { gdpPerCapitaUsd: 40000, lifeExpectancy: 84.3, daly100k: 19000, primaryEnergyTwh: 4300, renewableSharePct: 22 },
    AUS: { gdpPerCapitaUsd: 55000, lifeExpectancy: 83.4, daly100k: 20000, primaryEnergyTwh: 1600, renewableSharePct: 24 },
  }

  const b = base[iso3] ?? base['USA']

  // Return a small time-series for charts plus the current year
  return Array.from({ length: 7 }, (_, i) => {
    const y = year - 6 + i
    const growth = 1 + i * 0.012
    return {
      iso3,
      countryName: COUNTRY_NAMES[iso3] ?? iso3,
      year: y,
      gdpUsd: null,
      gdpPerCapitaUsd: Math.round((b.gdpPerCapitaUsd ?? 0) * growth),
      gdpGrowthRate: 2.1 + Math.random() * 2,
      population: null,
      giniCoefficient: null,
      lifeExpectancy: parseFloat(((b.lifeExpectancy ?? 70) + i * 0.06).toFixed(1)),
      under5MortalityRate: null,
      daly100k: Math.round((b.daly100k ?? 30000) * (1 - i * 0.008)),
      healthExpenditurePctGdp: 8.5 + Math.random(),
      primaryEnergyTwh: Math.round((b.primaryEnergyTwh ?? 1000) * growth),
      energyIntensityMjPerUsd: null,
      renewableSharePct: parseFloat(((b.renewableSharePct ?? 20) + i * 0.5).toFixed(1)),
      co2MtCo2: null,
    }
  })
}

function buildKpis(metrics: GlobalEntityMetric[], year: number): KpiMetric[] {
  const current = metrics.find((m) => m.year === year)
  const prev = metrics.find((m) => m.year === year - 1)

  const delta = (cur: number | null, prv: number | null): number | null => {
    if (cur == null || prv == null || prv === 0) return null
    return ((cur - prv) / Math.abs(prv)) * 100
  }

  const fmt = (v: number | null, prefix = '', suffix = '') =>
    v != null ? `${prefix}${v.toLocaleString()}${suffix}` : '—'

  return [
    {
      label: 'GDP per Capita',
      value: fmt(current?.gdpPerCapitaUsd ?? null, '$'),
      yoyDelta: delta(current?.gdpPerCapitaUsd ?? null, prev?.gdpPerCapitaUsd ?? null),
      unit: 'USD',
    },
    {
      label: 'Life Expectancy',
      value: fmt(current?.lifeExpectancy ?? null, '', ' yrs'),
      yoyDelta: delta(current?.lifeExpectancy ?? null, prev?.lifeExpectancy ?? null),
    },
    {
      label: 'DALYs per 100k',
      value: fmt(current?.daly100k ?? null),
      yoyDelta: delta(current?.daly100k ?? null, prev?.daly100k ?? null),
    },
    {
      label: 'Renewable Share',
      value: fmt(current?.renewableSharePct ?? null, '', '%'),
      yoyDelta: delta(current?.renewableSharePct ?? null, prev?.renewableSharePct ?? null),
    },
  ]
}

export default function App() {
  const [selectedIso3, setSelectedIso3] = useState('USA')
  const [year, setYear] = useState(2023)
  const [metrics, setMetrics] = useState<GlobalEntityMetric[]>([])
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    // In production this would fetch from /api/data?iso3=...&year=...
    setMetrics(generateMockData(selectedIso3, year))
    setAiSummary(null)
  }, [selectedIso3, year])

  const fetchAiSummary = useCallback(async () => {
    setAiLoading(true)
    try {
      const res = await fetch(
        `/api/summary?iso3=${selectedIso3}&year=${year}`,
      )
      if (!res.ok) throw new Error('API error')
      const data = (await res.json()) as AISummary
      setAiSummary(data)
    } catch {
      // Fallback: mock summary when worker is not running locally
      setAiSummary({
        text: `In ${year}, ${selectedIso3} demonstrated notable resilience with sustained GDP growth. Health indicators showed continued improvement in life expectancy, while renewable energy adoption accelerated amid global decarbonisation efforts. DALYs per 100,000 declined year-on-year, reflecting improving public health outcomes.`,
        generatedAt: new Date().toISOString(),
      })
    } finally {
      setAiLoading(false)
    }
  }, [selectedIso3, year])

  const kpis = buildKpis(metrics, year)

  return (
    <div className="min-h-screen bg-surface-900">
      <Header
        selectedIso3={selectedIso3}
        onIso3Change={setSelectedIso3}
        year={year}
        onYearChange={setYear}
      />

      <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <section
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          aria-label="Key Performance Indicators"
        >
          {kpis.map((kpi, i) => (
            <KpiCard
              key={kpi.label}
              metric={kpi}
              icon={
                [
                  <DollarSign size={14} />,
                  <Heart size={14} />,
                  <Activity size={14} />,
                  <Zap size={14} />,
                ][i]
              }
            />
          ))}
        </section>

        {/* Charts */}
        <section
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          aria-label="Analytics Charts"
        >
          <GdpLifeExpChart data={metrics} />
          <EnergyHealthChart data={metrics} />
        </section>

        {/* AI Insights */}
        <section aria-label="AI Insights">
          <AIInsightsPanel
            summary={aiSummary}
            loading={aiLoading}
            onRefresh={fetchAiSummary}
          />
        </section>
      </main>
    </div>
  )
}
