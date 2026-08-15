import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GlobalEntityMetric } from '../types'

type MetricKey = 'gdpPerCapitaUsd' | 'lifeExpectancy' | 'daly100k' | 'renewableSharePct' | 'primaryEnergyTwh'

const METRICS: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: 'gdpPerCapitaUsd', label: 'GDP / capita', color: '#58a6ff' },
  { key: 'lifeExpectancy', label: 'Life expectancy', color: '#facc15' },
  { key: 'daly100k', label: 'DALYs / 100k', color: '#f85149' },
  { key: 'renewableSharePct', label: 'Renewables', color: '#3fb950' },
  { key: 'primaryEnergyTwh', label: 'Primary energy', color: '#c084fc' },
]

interface MetricTrendChartProps {
  data: GlobalEntityMetric[]
}

export default function MetricTrendChart({ data }: MetricTrendChartProps) {
  const [selectedKeys, setSelectedKeys] = useState<MetricKey[]>([
    'gdpPerCapitaUsd',
    'lifeExpectancy',
    'renewableSharePct',
  ])

  const sorted = [...data].sort((left, right) => left.year - right.year)
  const baselines = new Map<MetricKey, number>()
  for (const metric of selectedKeys) {
    const first = sorted.find((row) => row[metric] != null)?.[metric]
    if (typeof first === 'number' && first !== 0) baselines.set(metric, first)
  }

  const chartData = sorted.map((row) => {
    const point: Record<string, number> = { year: row.year }
    for (const metric of selectedKeys) {
      const value = row[metric]
      const baseline = baselines.get(metric)
      if (typeof value === 'number' && baseline) point[metric] = (value / baseline) * 100
    }
    return point
  })

  const toggleMetric = (key: MetricKey) => {
    setSelectedKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key])
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Metric trends</h3>
          <p className="mt-1 text-xs text-gray-500">Indexed to the first available year in the selected range</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Select trend metrics">
          {METRICS.map((metric) => (
            <label key={metric.key} className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-400">
              <input
                type="checkbox"
                checked={selectedKeys.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
                className="accent-accent-blue"
              />
              <span>{metric.label}</span>
            </label>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="year" tick={{ fill: '#8b949e', fontSize: 11 }} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={(value: number) => `${value.toFixed(0)}`} />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value.toFixed(1)} index`, METRICS.find((metric) => metric.key === name)?.label ?? name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
          {METRICS.filter((metric) => selectedKeys.includes(metric.key)).map((metric) => (
            <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.label} stroke={metric.color} dot={false} strokeWidth={2} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}