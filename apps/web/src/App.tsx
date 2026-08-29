import { useState, useEffect, useCallback } from 'react'
import { Zap, DollarSign, Heart, Landmark, Users, Scale, Wifi, Building2, Activity, Plug } from 'lucide-react'
import Header from './components/Header'
import KpiCard from './components/KpiCard'
import MetricTrendChart, { type CountrySeries } from './components/MetricTrendChart'
import CountryComparisonTable from './components/CountryComparisonTable'
import UsageMetricsPanel from './components/UsageMetricsPanel'
import { COUNTRY_NAMES } from './countryCatalog'
import type { GlobalEntityMetric, ApiDataResponse, KpiMetric } from './types'
import { trackEvent } from './lib/analytics'

interface CountryMetricsResponse {
  data: GlobalEntityMetric[]
  cached: boolean
  year: number
  lastUpdated: string
}

function buildAverageKpis(rows: Array<Partial<GlobalEntityMetric>>): KpiMetric[] {
  const average = (field: keyof GlobalEntityMetric): number | null => {
    const values = rows
      .map((row) => row[field])
      .filter((value): value is number => value != null)

    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + Number(value), 0) / values.length
  }

  const fmt = (v: number | null, prefix = '', suffix = '', maximumFractionDigits = 1) =>
    v != null ? `${prefix}${v.toLocaleString(undefined, { maximumFractionDigits })}${suffix}` : '—'

  return [
    { label: 'GDP per Capita', value: fmt(average('gdpPerCapitaUsd'), '$', '', 0), yoyDelta: null, unit: 'USD' },
    { label: 'Population', value: fmt(average('population'), '', '', 0), yoyDelta: null, unit: 'people' },
    { label: 'Tax Revenue', value: fmt(average('taxRevenuePctGdp'), '', '%'), yoyDelta: null, unit: '% of GDP' },
    { label: 'Life Expectancy', value: fmt(average('lifeExpectancy'), '', ' yrs'), yoyDelta: null, unit: 'years' },
    { label: 'DALYs / 100k', value: fmt(average('daly100k'), '', '', 0), yoyDelta: null, unit: 'health burden' },
    { label: 'Gini Index', value: fmt(average('giniCoefficient')), yoyDelta: null, unit: '0–100' },
    { label: 'Urban Population', value: fmt(average('urbanPopulationPct'), '', '%'), yoyDelta: null, unit: 'of total' },
    { label: 'Internet Access', value: fmt(average('internetPenetrationPct'), '', '%'), yoyDelta: null, unit: 'of population' },
    { label: 'Renewable Share', value: fmt(average('renewableSharePct'), '', '%'), yoyDelta: null, unit: 'of energy' },
    { label: 'Primary Energy', value: fmt(average('primaryEnergyTwh'), '', ' TWh', 0), yoyDelta: null, unit: 'consumption' },
  ]
}

export default function App() {
  const [selectedIso3, setSelectedIso3] = useState('USA')
  const [startYear, setStartYear] = useState(2017)
  const [endYear, setEndYear] = useState(2023)
  const [metrics, setMetrics] = useState<GlobalEntityMetric[]>([])
  const [compareIso3s, setCompareIso3s] = useState<string[]>(['USA', 'CAN', 'BRA'])
  const [compareSeries, setCompareSeries] = useState<CountrySeries[]>([])
  const [countryRows, setCountryRows] = useState<GlobalEntityMetric[]>([])
  const [usageEvents, setUsageEvents] = useState<Array<{ event: string; sessionId: string; timestamp: string; pathname: string; metadata: Record<string, unknown>; ipCountry?: string | null; ipCity?: string | null }>>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'countries' | 'usage'>('overview')

  const getTabName = useCallback((tab: 'overview' | 'countries' | 'usage') => {
    switch (tab) {
      case 'overview':
        return 'Overview'
      case 'countries':
        return 'Country metrics'
      case 'usage':
        return 'Usage metrics'
      default:
        return 'Overview'
    }
  }, [])

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
      } catch {
        if (!controller.signal.aborted) setMetrics([])
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
          } catch {
            if (controller.signal.aborted) return null
            return { iso3, name: COUNTRY_NAMES[iso3] ?? iso3, data: [] }
          }
        }),
      )
      if (controller.signal.aborted) return
      setCompareSeries(series.filter((s): s is CountrySeries => s !== null))
    }

    loadComparison()
    return () => controller.abort()
  }, [compareIso3s, startYear, endYear])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCountryRows() {
      try {
        const response = await fetch(`/api/country-metrics?year=${endYear}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Country metrics API error')
        const payload = (await response.json()) as CountryMetricsResponse
        setCountryRows(payload.data)
      } catch {
        if (!controller.signal.aborted) setCountryRows([])
      }
    }

    loadCountryRows()
    return () => controller.abort()
  }, [endYear])

  useEffect(() => {
    if (activeTab !== 'usage') return

    const controller = new AbortController()

    async function loadUsageEvents() {
      try {
        const response = await fetch('/api/usage-events', { signal: controller.signal })
        if (!response.ok) throw new Error('Usage events API error')
        const payload = (await response.json()) as { data: Array<{ event: string; sessionId: string; timestamp: string; pathname: string; metadata: Record<string, unknown>; ipCountry?: string | null; ipCity?: string | null }> }
        setUsageEvents(payload.data ?? [])
      } catch {
        if (!controller.signal.aborted) setUsageEvents([])
      }
    }

    loadUsageEvents()
    return () => controller.abort()
  }, [activeTab])

  const toggleCompareCountry = useCallback((iso3: string) => {
    setCompareIso3s((current) => {
      const next = current.includes(iso3)
        ? current.length > 1
          ? current.filter((item) => item !== iso3)
          : current
        : current.length < 5
          ? [...current, iso3]
          : current

      const eventMeta = {
        iso3,
        countryName: COUNTRY_NAMES[iso3] ?? iso3,
        compareIso3s: next,
        activeTab,
        tabName: getTabName(activeTab),
      }

      trackEvent(current.includes(iso3) ? 'chart_country_removed' : 'chart_country_added', eventMeta)
      return next
    })
  }, [activeTab, getTabName])

  const kpis = buildAverageKpis(countryRows)

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header
        title="Global Intelligence Analytics"
        startYear={startYear}
        endYear={endYear}
        onRangeChange={(nextStart, nextEnd) => {
          trackEvent('year_range_changed', {
            startYear: nextStart,
            endYear: nextEnd,
            selectedIso3,
            countryName: COUNTRY_NAMES[selectedIso3] ?? selectedIso3,
            tabName: getTabName(activeTab),
          })
          setStartYear(nextStart)
          setEndYear(nextEnd)
        }}
      />

      <main className="mx-auto max-w-screen-2xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
        <section aria-label="Average key performance indicators">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Average across all countries
          </p>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi, i) => (
              <div key={kpi.label} className="min-w-0">
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
            {(['overview', 'countries', 'usage'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => {
                  setActiveTab(tab)
                  trackEvent('tab_changed', {
                    tab,
                    tabName: getTabName(tab),
                    selectedIso3,
                    countryName: COUNTRY_NAMES[selectedIso3] ?? selectedIso3,
                    startYear,
                    endYear,
                  })
                }}
                className={`-mb-px border-b-2 px-3 pb-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-accent-blue text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'countries' ? 'Country metrics' : 'Usage metrics'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <MetricTrendChart
              data={metrics}
              comparison={compareSeries}
              onCountryToggle={toggleCompareCountry}
              selectedIso3={selectedIso3}
              onSelectedCountryChange={(iso3) => {
                setSelectedIso3(iso3)
                trackEvent('country_selected', {
                  iso3,
                  countryName: COUNTRY_NAMES[iso3] ?? iso3,
                  selectedIso3: iso3,
                  activeTab,
                  tabName: getTabName(activeTab),
                  startYear,
                  endYear,
                })
              }}
            />
          ) : activeTab === 'countries' ? (
            <CountryComparisonTable
              rows={countryRows}
              selectedIso3={selectedIso3}
              onCountrySelect={(iso3) => {
                setSelectedIso3(iso3)
                trackEvent('country_selected', {
                  iso3,
                  countryName: COUNTRY_NAMES[iso3] ?? iso3,
                  selectedIso3: iso3,
                  endYear,
                  activeTab,
                  tabName: getTabName(activeTab),
                })
              }}
              endYear={endYear}
            />
          ) : (
            <UsageMetricsPanel events={usageEvents} />
          )}
        </section>
      </main>
    </div>
  )
}
