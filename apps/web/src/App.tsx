import { useState, useEffect, useCallback } from 'react'
import { Zap, DollarSign, Heart, Landmark, Users, Scale, Wifi, Building2, Activity, Plug } from 'lucide-react'
import Header from './components/Header'
import KpiCard from './components/KpiCard'
import MetricTrendChart, { type CountrySeries } from './components/MetricTrendChart'
import CountryComparisonTable from './components/CountryComparisonTable'
import type { GlobalEntityMetric, ApiDataResponse, KpiMetric } from './types'

/** Human-readable names matching COUNTRY_NAMES in apps/worker/src/data.ts */
const COUNTRY_NAMES: Record<string, string> = {
  USA: 'United States', CHN: 'China', IND: 'India', DEU: 'Germany',
  GBR: 'United Kingdom', BRA: 'Brazil', NGA: 'Nigeria', ZAF: 'South Africa',
  JPN: 'Japan', AUS: 'Australia',
}

/** Generate plausible mock data for the selected country + year range */
function generateMockData(iso3: string, startYear: number, endYear: number): GlobalEntityMetric[] {
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
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => {
    const y = startYear + i
    const growth = 1 + i * 0.012
    return {
      iso3,
      countryName: COUNTRY_NAMES[iso3] ?? iso3,
      year: y,
      gdpUsd: null,
      gdpPerCapitaUsd: Math.round((b.gdpPerCapitaUsd ?? 0) * growth),
      gdpGrowthRate: 2.1 + Math.random() * 2,
      population: b.population ?? null,
      taxRevenuePctGdp: b.taxRevenuePctGdp ?? null,
      giniCoefficient: b.giniCoefficient ?? null,
      internetPenetrationPct: b.internetPenetrationPct ?? null,
      urbanPopulationPct: b.urbanPopulationPct ?? null,
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

function buildAverageKpis(rows: Array<Partial<GlobalEntityMetric>>): KpiMetric[] {
  const average = (field: keyof GlobalEntityMetric): number | null => {
    const values = rows
      .map((row) => row[field])
      .filter((value): value is number => value != null)

    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + Number(value), 0) / values.length
  }

  const fmt = (v: number | null, prefix = '', suffix = '') =>
    v != null ? `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}` : '—'

  return [
    { label: 'GDP per Capita', value: fmt(average('gdpPerCapitaUsd'), '$'), yoyDelta: null, unit: 'USD' },
    { label: 'Population', value: fmt(average('population')), yoyDelta: null, unit: 'people' },
    { label: 'Tax Revenue', value: fmt(average('taxRevenuePctGdp'), '', '%'), yoyDelta: null, unit: '% of GDP' },
    { label: 'Life Expectancy', value: fmt(average('lifeExpectancy'), '', ' yrs'), yoyDelta: null, unit: 'years' },
    { label: 'DALYs / 100k', value: fmt(average('daly100k')), yoyDelta: null, unit: 'health burden' },
    { label: 'Gini Index', value: fmt(average('giniCoefficient')), yoyDelta: null, unit: '0–100' },
    { label: 'Urban Population', value: fmt(average('urbanPopulationPct'), '', '%'), yoyDelta: null, unit: 'of total' },
    { label: 'Internet Access', value: fmt(average('internetPenetrationPct'), '', '%'), yoyDelta: null, unit: 'of population' },
    { label: 'Renewable Share', value: fmt(average('renewableSharePct'), '', '%'), yoyDelta: null, unit: 'of energy' },
    { label: 'Primary Energy', value: fmt(average('primaryEnergyTwh'), '', ' TWh'), yoyDelta: null, unit: 'consumption' },
  ]
}

function buildComparisonRows(endYear: number) {
  const base: Record<string, Partial<GlobalEntityMetric>> = {
    USA: { gdpPerCapitaUsd: 65000, population: 340000000, taxRevenuePctGdp: 24.8, lifeExpectancy: 78.9, daly100k: 23500, giniCoefficient: 41.5, urbanPopulationPct: 83.3, internetPenetrationPct: 79.0, primaryEnergyTwh: 23000, renewableSharePct: 12 },
    CHN: { gdpPerCapitaUsd: 12500, population: 1412000000, taxRevenuePctGdp: 18.2, lifeExpectancy: 77.3, daly100k: 25000, giniCoefficient: 38.5, urbanPopulationPct: 65.2, internetPenetrationPct: 73.0, primaryEnergyTwh: 35000, renewableSharePct: 28 },
    IND: { gdpPerCapitaUsd: 2400, population: 1440000000, taxRevenuePctGdp: 18.1, lifeExpectancy: 70.1, daly100k: 34000, giniCoefficient: 35.7, urbanPopulationPct: 35.4, internetPenetrationPct: 47.0, primaryEnergyTwh: 9000, renewableSharePct: 18 },
    DEU: { gdpPerCapitaUsd: 48000, population: 84000000, taxRevenuePctGdp: 23.6, lifeExpectancy: 81.2, daly100k: 21000, giniCoefficient: 31.7, urbanPopulationPct: 77.5, internetPenetrationPct: 89.0, primaryEnergyTwh: 3300, renewableSharePct: 46 },
    GBR: { gdpPerCapitaUsd: 43000, population: 68000000, taxRevenuePctGdp: 28.7, lifeExpectancy: 81.0, daly100k: 22000, giniCoefficient: 36.3, urbanPopulationPct: 84.5, internetPenetrationPct: 95.0, primaryEnergyTwh: 2100, renewableSharePct: 40 },
    BRA: { gdpPerCapitaUsd: 8800, population: 215000000, taxRevenuePctGdp: 22.9, lifeExpectancy: 75.9, daly100k: 28000, giniCoefficient: 53.4, urbanPopulationPct: 87.3, internetPenetrationPct: 82.0, primaryEnergyTwh: 3000, renewableSharePct: 45 },
    NGA: { gdpPerCapitaUsd: 2100, population: 220000000, taxRevenuePctGdp: 6.2, lifeExpectancy: 63.0, daly100k: 52000, giniCoefficient: 43.0, urbanPopulationPct: 54.7, internetPenetrationPct: 42.0, primaryEnergyTwh: 160, renewableSharePct: 20 },
    ZAF: { gdpPerCapitaUsd: 6200, population: 61000000, taxRevenuePctGdp: 25.9, lifeExpectancy: 64.9, daly100k: 47000, giniCoefficient: 63.0, urbanPopulationPct: 67.4, internetPenetrationPct: 76.0, primaryEnergyTwh: 580, renewableSharePct: 8 },
    JPN: { gdpPerCapitaUsd: 40000, population: 124000000, taxRevenuePctGdp: 25.2, lifeExpectancy: 84.3, daly100k: 19000, giniCoefficient: 32.9, urbanPopulationPct: 91.8, internetPenetrationPct: 95.0, primaryEnergyTwh: 4300, renewableSharePct: 22 },
    AUS: { gdpPerCapitaUsd: 55000, population: 26000000, taxRevenuePctGdp: 24.1, lifeExpectancy: 83.4, daly100k: 20000, giniCoefficient: 34.3, urbanPopulationPct: 86.2, internetPenetrationPct: 93.0, primaryEnergyTwh: 1600, renewableSharePct: 24 },
  }

  return Object.entries(COUNTRY_NAMES).map(([iso3, countryName]) => {
    const values = base[iso3] ?? base.USA
    const growth = iso3 === 'CHN' ? 0.92 : iso3 === 'IND' ? 0.88 : 1
    return {
      iso3,
      countryName,
      gdpPerCapitaUsd: Math.round((values.gdpPerCapitaUsd ?? 0) * growth),
      population: values.population ?? 0,
      taxRevenuePctGdp: values.taxRevenuePctGdp ?? 0,
      lifeExpectancy: Number(((values.lifeExpectancy ?? 70) + (endYear - 2023) * 0.08).toFixed(1)),
      daly100k: Math.round((values.daly100k ?? 30000) * (1 - (endYear - 2023) * 0.006)),
      giniCoefficient: values.giniCoefficient ?? 0,
      urbanPopulationPct: values.urbanPopulationPct ?? 0,
      internetPenetrationPct: values.internetPenetrationPct ?? 0,
      renewableSharePct: Number(((values.renewableSharePct ?? 20) + (endYear - 2023) * 0.6).toFixed(1)),
      primaryEnergyTwh: Math.round((values.primaryEnergyTwh ?? 1000) * (1 + (endYear - 2023) * 0.008)),
    }
  })
}

export default function App() {
  const [selectedIso3, setSelectedIso3] = useState('USA')
  const [startYear, setStartYear] = useState(2017)
  const [endYear, setEndYear] = useState(2023)
  const [metrics, setMetrics] = useState<GlobalEntityMetric[]>([])
  const [compareIso3s, setCompareIso3s] = useState<string[]>(['USA', 'CHN', 'IND'])
  const [compareSeries, setCompareSeries] = useState<CountrySeries[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'countries'>('overview')

  useEffect(() => {
    const controller = new AbortController()
    setMetrics([])

    async function loadMetrics() {
      try {
        const response = await fetch(
          `/api/data?iso3=${selectedIso3}&startYear=${startYear}&endYear=${endYear}`,
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error('Data API error')
        const payload = await response.json() as ApiDataResponse
        setMetrics(payload.data)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setMetrics(generateMockData(selectedIso3, startYear, endYear))
      }
    }

    loadMetrics()

    return () => controller.abort()
  }, [selectedIso3, startYear, endYear])

  useEffect(() => {
    const controller = new AbortController()

    async function loadComparison() {
      const series = await Promise.all(
        compareIso3s.map(async (iso3) => {
          try {
            const response = await fetch(
              `/api/data?iso3=${iso3}&startYear=${startYear}&endYear=${endYear}`,
              { signal: controller.signal },
            )
            if (!response.ok) throw new Error('Data API error')
            const payload = (await response.json()) as ApiDataResponse
            return { iso3, name: COUNTRY_NAMES[iso3] ?? iso3, data: payload.data }
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return null
            return { iso3, name: COUNTRY_NAMES[iso3] ?? iso3, data: generateMockData(iso3, startYear, endYear) }
          }
        }),
      )
      if (controller.signal.aborted) return
      setCompareSeries(series.filter((s): s is CountrySeries => s !== null))
    }

    loadComparison()
    return () => controller.abort()
  }, [compareIso3s, startYear, endYear])

  const toggleCompareCountry = useCallback((iso3: string) => {
    setCompareIso3s((current) =>
      current.includes(iso3)
        ? current.length > 1
          ? current.filter((item) => item !== iso3)
          : current
        : current.length < 5
          ? [...current, iso3]
          : current,
    )
  }, [])

  const comparisonRows = buildComparisonRows(endYear)
  const kpis = buildAverageKpis(comparisonRows)

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header
        title="Global Intelligence Analytics"
        startYear={startYear}
        endYear={endYear}
        onRangeChange={(nextStart, nextEnd) => {
          setStartYear(nextStart)
          setEndYear(nextEnd)
        }}
      />

      <main className="mx-auto max-w-screen-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section aria-label="Average key performance indicators">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Average across all countries
          </p>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {kpis.map((kpi, i) => (
              <div key={kpi.label} className="w-40 shrink-0">
                <KpiCard
                  metric={kpi}
                  period={`${startYear}–${endYear}`}
                  icon={
                    [
                      <DollarSign size={13} />,
                      <Users size={13} />,
                      <Landmark size={13} />,
                      <Heart size={13} />,
                      <Activity size={13} />,
                      <Scale size={13} />,
                      <Building2 size={13} />,
                      <Wifi size={13} />,
                      <Zap size={13} />,
                      <Plug size={13} />,
                    ][i]
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Dashboard content">
          <div className="mb-4 flex gap-1 border-b border-surface-600/60" role="tablist">
            {(['overview', 'countries'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 px-3 pb-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-accent-blue text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'overview' ? 'Overview' : 'Country metrics'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <MetricTrendChart
              data={metrics}
              comparison={compareSeries}
              onCountryToggle={toggleCompareCountry}
            />
          ) : (
            <CountryComparisonTable
              rows={comparisonRows}
              selectedIso3={selectedIso3}
              onCountrySelect={setSelectedIso3}
            />
          )}
        </section>
      </main>
    </div>
  )
}
