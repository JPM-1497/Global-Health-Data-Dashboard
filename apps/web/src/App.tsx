import { useState, useEffect, useCallback, useMemo } from 'react'
import { Zap, DollarSign, Heart, Landmark, Users, Scale, Wifi, Building2, Activity, Plug, Minus, Plus } from 'lucide-react'
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
  const [compareIso3s, setCompareIso3s] = useState<string[]>(['CAN', 'BRA'])
  const [compareSeries, setCompareSeries] = useState<CountrySeries[]>([])
  const [countryRows, setCountryRows] = useState<GlobalEntityMetric[]>([])
  const [usageEvents, setUsageEvents] = useState<Array<{ event: string; sessionId: string; timestamp: string; pathname: string; metadata: Record<string, unknown>; ipCountry?: string | null; ipCity?: string | null }>>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'countries' | 'usage'>('overview')
  const [kpisExpanded, setKpisExpanded] = useState(true)

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

  const comparisonIso3s = useMemo(
    () => [selectedIso3, ...compareIso3s.filter((iso3) => iso3 !== selectedIso3)],
    [selectedIso3, compareIso3s],
  )

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
        comparisonIso3s.map(async (iso3) => {
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
  }, [comparisonIso3s, startYear, endYear])

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
    if (iso3 === selectedIso3) return

    setCompareIso3s((current) => {
      const next = current.includes(iso3)
        ? current.filter((item) => item !== iso3)
        : current.length < 4
          ? [...current, iso3]
          : current

      const eventMeta = {
        iso3,
        countryName: COUNTRY_NAMES[iso3] ?? iso3,
        compareIso3s: [selectedIso3, ...next],
        activeTab,
        tabName: getTabName(activeTab),
      }

      trackEvent(current.includes(iso3) ? 'chart_country_removed' : 'chart_country_added', eventMeta)
      return next
    })
  }, [activeTab, getTabName, selectedIso3])

  const kpis = buildAverageKpis(countryRows)
  const selectedCountryKpis = useMemo(() => {
    const selectedCountryRow = metrics.find((row) => row.year === endYear)
    return selectedCountryRow ? buildAverageKpis([selectedCountryRow]) : []
  }, [metrics, endYear])
  const selectedCountryName = COUNTRY_NAMES[selectedIso3] ?? selectedIso3

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Header
        title="Global Intelligence Analytics"
      />

      <main className="mx-auto max-w-screen-2xl space-y-5 px-3 pb-5 sm:space-y-6 sm:px-6 sm:pb-8 lg:px-8">
        <nav className="sticky top-[70px] z-40 grid grid-cols-3 border-y border-[#f4efe2]/20 bg-surface-800 shadow-[0_10px_18px_rgba(2,16,12,0.2)] sm:top-[92px]" aria-label="Dashboard views">
          {(['overview', 'countries', 'usage'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-current={activeTab === tab ? 'page' : undefined}
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
              className={`relative border-b-2 px-2 py-3 text-xs font-medium transition-colors sm:px-4 ${
                activeTab === tab
                  ? 'border-accent-blue bg-accent-blue/10 text-white'
                  : 'border-transparent text-slate-500 hover:bg-surface-800 hover:text-slate-200'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'countries' ? 'Country metrics' : 'Usage metrics'}
            </button>
          ))}
        </nav>

        {activeTab !== 'usage' && (
          <section aria-label="Average key performance indicators">
            <button
              type="button"
              onClick={() => setKpisExpanded((expanded) => !expanded)}
              aria-expanded={kpisExpanded}
              className="mb-2 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-300"
            >
              {kpisExpanded ? <Minus size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
              Average across all countries · {startYear}–{endYear}
            </button>
            {kpisExpanded && (
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {kpis.map((kpi, i) => (
                  <div key={kpi.label} className="min-w-0">
                    <KpiCard
                      metric={kpi}
                      endYear={endYear}
                      selectedValue={activeTab === 'overview' ? selectedCountryKpis[i]?.value : undefined}
                      selectedCountryName={activeTab === 'overview' ? selectedCountryName : undefined}
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
            )}
          </section>
        )}

        <section aria-label="Dashboard content">
          {activeTab === 'overview' ? (
            <MetricTrendChart
              data={metrics}
              comparison={compareSeries}
              onCountryToggle={toggleCompareCountry}
              selectedIso3={selectedIso3}
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
              onEndYearChange={(year) => {
                trackEvent('year_range_changed', {
                  startYear,
                  endYear: year,
                  selectedIso3,
                  countryName: COUNTRY_NAMES[selectedIso3] ?? selectedIso3,
                  tabName: getTabName(activeTab),
                })
                setEndYear(year)
              }}
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
