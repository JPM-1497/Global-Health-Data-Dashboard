import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import type { GlobalEntityMetric } from '../types'

interface GdpLifeExpChartProps {
  data: GlobalEntityMetric[]
}

export function GdpLifeExpChart({ data }: GdpLifeExpChartProps) {
  const points = data
    .filter((d) => d.gdpPerCapitaUsd !== null && d.lifeExpectancy !== null)
    .map((d) => ({
      name: d.countryName,
      gdpPerCapita: d.gdpPerCapitaUsd!,
      lifeExp: d.lifeExpectancy!,
    }))

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">
        GDP per Capita vs Life Expectancy
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="gdpPerCapita"
            name="GDP per Capita (USD)"
            tick={{ fill: '#8b949e', fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
          />
          <YAxis
            dataKey="lifeExp"
            name="Life Expectancy (yrs)"
            tick={{ fill: '#8b949e', fontSize: 11 }}
            domain={[40, 90]}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              name === 'gdpPerCapita'
                ? `$${value.toLocaleString()}`
                : `${value} yrs`,
              name === 'gdpPerCapita' ? 'GDP/capita' : 'Life Exp.',
            ]}
          />
          <Scatter data={points} fill="#58a6ff" opacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

interface EnergyHealthChartProps {
  data: GlobalEntityMetric[]
}

export function EnergyHealthChart({ data }: EnergyHealthChartProps) {
  const sorted = [...data].sort((a, b) => a.year - b.year)

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">
        Primary Energy Consumption vs Health DALYs
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={sorted}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#8b949e', fontSize: 11 }}
          />
          <YAxis
            yAxisId="energy"
            orientation="left"
            tick={{ fill: '#8b949e', fontSize: 11 }}
            tickFormatter={(v: number) => `${v} TWh`}
          />
          <YAxis
            yAxisId="daly"
            orientation="right"
            tick={{ fill: '#8b949e', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#8b949e' }}
          />
          <Line
            yAxisId="energy"
            type="monotone"
            dataKey="primaryEnergyTwh"
            stroke="#58a6ff"
            dot={false}
            name="Energy (TWh)"
          />
          <Line
            yAxisId="daly"
            type="monotone"
            dataKey="daly100k"
            stroke="#3fb950"
            dot={false}
            name="DALYs (per 100k)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
