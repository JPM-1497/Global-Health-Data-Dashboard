import { Download, Search, X } from 'lucide-react'
import { useState } from 'react'

type UsageEvent = {
  event: string
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

function toCsvValue(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
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
      event.sessionId,
      event.pathname,
      event.ipCountry,
      event.ipCity,
      JSON.stringify(event.metadata),
    ].join(' ').toLowerCase()
    return searchable.includes(normalizedQuery)
  })
  const totalEvents = filteredEvents.length
  const uniqueSessions = new Set(filteredEvents.map((event) => event.sessionId)).size
  const topEvents = Object.entries(
    filteredEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.event] = (acc[event.event] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const exportCsv = () => {
    const header = ['Timestamp', 'Event', 'Session ID', 'Path', 'Visitor country', 'Visitor city', 'Metadata']
    const rows = filteredEvents.map((event) => [
      event.timestamp,
      formatEventLabel(event.event),
      event.sessionId,
      event.pathname,
      event.ipCountry,
      event.ipCity,
      JSON.stringify(event.metadata),
    ])
    const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `usage-events-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-surface-600 bg-surface-900/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Total events</div>
          <div className="mt-1 text-xl font-semibold text-white">{totalEvents}</div>
        </div>
        <div className="rounded-lg border border-surface-600 bg-surface-900/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Active sessions</div>
          <div className="mt-1 text-xl font-semibold text-white">{uniqueSessions}</div>
        </div>
        <div className="rounded-lg border border-surface-600 bg-surface-900/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Top event</div>
          <div className="mt-1 text-sm font-semibold text-white">
            {topEvents[0] ? formatEventLabel(topEvents[0][0]) : 'None'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-surface-700/80 py-3">
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
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredEvents.length === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-600 bg-surface-800 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-accent-blue/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          title="Download filtered events as CSV"
        >
          <Download size={14} aria-hidden="true" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_2fr]">
        <div className="rounded-lg border border-surface-600 bg-surface-900/50 p-3">
          <h4 className="text-sm font-semibold text-slate-200">Event breakdown</h4>
          <div className="mt-3 space-y-2">
            {topEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No usage events yet.</p>
            ) : (
              topEvents.slice(0, 8).map(([event, count]) => (
                <div key={event} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">{formatEventLabel(event)}</span>
                  <span className="rounded-full border border-surface-600 bg-surface-800 px-2 py-0.5 text-[10px] text-accent-blue">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-surface-600 bg-surface-900/50">
          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-900/95 text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Session</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                      {events.length === 0 ? 'No usage activity captured yet.' : 'No events match these filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event, index) => (
                    <tr key={`${event.sessionId}-${event.timestamp}-${index}`} className="border-t border-surface-700/80">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">{event.sessionId.slice(0, 8)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-200">{formatEventLabel(event.event)}</td>
                      <td className="px-3 py-2 text-slate-400">
                        <div className="space-y-1">
                          {event.ipCountry && <div>Country: {event.ipCountry}</div>}
                          {event.ipCity && <div>City: {event.ipCity}</div>}
                          {Object.entries(event.metadata).length > 0 && (
                            <div>
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <div key={`${event.event}-${key}`}>
                                  {key}: {String(value)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
