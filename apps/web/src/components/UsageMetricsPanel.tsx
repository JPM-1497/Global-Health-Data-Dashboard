import { Activity, Filter, MousePointer2, Search, Users, X } from 'lucide-react'
import { useState } from 'react'

type UsageEvent = {
  event: string
  userId?: string
  sessionId: string
  timestamp: string
  pathname: string
  metadata: Record<string, unknown>
  ipCountry?: string | null
  ipCity?: string | null
}

interface UsageMetricsPanelProps {
  events: UsageEvent[]
}

function formatEventLabel(event: string): string {
  return event
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function eventAccent(event: string): string {
  if (event.includes('country')) return 'border-l-emerald-400 text-emerald-300'
  if (event.includes('metric')) return 'border-l-cyan-400 text-cyan-300'
  if (event.includes('tab')) return 'border-l-amber-400 text-amber-300'
  if (event.includes('year') || event.includes('filter')) return 'border-l-violet-400 text-violet-300'
  return 'border-l-accent-blue text-accent-blue'
}

export default function UsageMetricsPanel({ events }: UsageMetricsPanelProps) {
  const [eventFilter, setEventFilter] = useState('all')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const eventTypes = [...new Set(events.map((event) => event.event))].sort()
  const filteredEvents = events.filter((event) => {
    if (eventFilter !== 'all' && event.event !== eventFilter) return false
    if (!normalizedQuery) return true

    const searchable = [
      event.event,
      event.userId ?? event.sessionId,
      event.pathname,
      event.ipCountry,
      event.ipCity,
      JSON.stringify(event.metadata),
    ].join(' ').toLowerCase()
    return searchable.includes(normalizedQuery)
  })
  const totalEvents = filteredEvents.length
  const uniqueUsers = new Set(filteredEvents.map((event) => event.userId ?? event.sessionId)).size
  const topEvents = Object.entries(
    filteredEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.event] = (acc[event.event] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const selectedCountries = new Set(
    filteredEvents
      .map((event) => event.metadata.countryName)
      .filter((country): country is string => typeof country === 'string'),
  )
  const selectedTabs = new Set(
    filteredEvents
      .map((event) => event.metadata.tabName)
      .filter((tab): tab is string => typeof tab === 'string'),
  )
  const latestEvent = filteredEvents[0]

  return (
    <div className="space-y-5">
      <section className="border-b border-surface-700/80 pb-5" aria-labelledby="usage-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent-blue">Behavior report</p>
            <h3 id="usage-title" className="mt-1 text-xl font-semibold text-white">Usage Metrics</h3>
          </div>
          <p className="text-xs text-slate-500">{latestEvent ? `Latest activity ${new Date(latestEvent.timestamp).toLocaleString()}` : 'No activity captured yet'}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-surface-600 bg-surface-600 sm:grid-cols-4">
          <div className="bg-surface-800 px-3 py-3">
            <Activity size={15} className="text-accent-blue" aria-hidden="true" />
            <div className="mt-3 text-2xl font-semibold text-white">{totalEvents}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Events</div>
          </div>
          <div className="bg-surface-800 px-3 py-3">
            <Users size={15} className="text-emerald-400" aria-hidden="true" />
            <div className="mt-3 text-2xl font-semibold text-white">{uniqueUsers}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Users</div>
          </div>
          <div className="bg-surface-800 px-3 py-3">
            <MousePointer2 size={15} className="text-amber-400" aria-hidden="true" />
            <div className="mt-3 truncate text-sm font-semibold text-white">{topEvents[0] ? formatEventLabel(topEvents[0][0]) : 'None'}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Top interaction</div>
          </div>
          <div className="bg-surface-800 px-3 py-3">
            <Filter size={15} className="text-violet-400" aria-hidden="true" />
            <div className="mt-3 text-2xl font-semibold text-white">{selectedCountries.size}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Countries explored</div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-y border-surface-700/80 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="usage-event-filter">Filter by event type</label>
          <select
            id="usage-event-filter"
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
            className="h-8 rounded-md border border-surface-600 bg-surface-900 px-2 text-xs text-slate-200 [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-accent-blue/60"
          >
            <option value="all">All event types</option>
            {eventTypes.map((event) => (
              <option key={event} value={event}>{formatEventLabel(event)}</option>
            ))}
          </select>
          <div className="relative min-w-48 flex-1 sm:max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label className="sr-only" htmlFor="usage-search">Search usage events</label>
            <input
              id="usage-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country, tab, filter, session..."
              className="h-8 w-full rounded-md border border-surface-600 bg-surface-900 py-1 pl-8 pr-8 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-accent-blue/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-surface-700 hover:text-slate-200"
                aria-label="Clear usage search"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="border-y border-surface-700/80 py-4" aria-labelledby="event-insights-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Interaction mix</p>
              <h4 id="event-insights-title" className="mt-1 text-sm font-semibold text-slate-200">Event insights</h4>
            </div>
            <span className="text-xs text-slate-500">{topEvents.length} types</span>
          </div>
          <div className="mt-4 space-y-2">
            {topEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No usage events yet.</p>
            ) : (
              topEvents.slice(0, 8).map(([event, count]) => (
                <div key={event} className={`flex items-center justify-between gap-3 border-l-2 bg-surface-800/60 px-3 py-2 ${eventAccent(event)}`}>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-slate-200">{formatEventLabel(event)}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{totalEvents ? Math.round((count / totalEvents) * 100) : 0}% of visible activity</div>
                  </div>
                  <span className="font-mono text-sm font-semibold">{count}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-surface-700/80 pt-3 text-xs text-slate-500">
            {selectedTabs.size ? `${[...selectedTabs].join(', ')} tabs represented` : 'No tab context available'}
          </div>
      </section>
    </div>
  )
}
