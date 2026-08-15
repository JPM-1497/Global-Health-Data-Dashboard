import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { KpiMetric } from '../types'

interface KpiCardProps {
  metric: KpiMetric
  icon?: React.ReactNode
}

export default function KpiCard({ metric, icon }: KpiCardProps) {
  const { label, value, yoyDelta, unit } = metric

  const DeltaBadge = () => {
    if (yoyDelta === null) {
      return <span className="badge-neutral">N/A</span>
    }
    if (yoyDelta > 0) {
      return (
        <span className="badge-positive">
          <TrendingUp size={10} />
          +{yoyDelta.toFixed(1)}%
        </span>
      )
    }
    if (yoyDelta < 0) {
      return (
        <span className="badge-negative">
          <TrendingDown size={10} />
          {yoyDelta.toFixed(1)}%
        </span>
      )
    }
    return (
      <span className="badge-neutral">
        <Minus size={10} />
        0.0%
      </span>
    )
  }

  return (
    <div className="card flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && <span className="text-gray-500 shrink-0">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold font-mono text-gray-100 truncate">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-gray-500 mb-1 shrink-0">{unit}</span>
        )}
      </div>
      <DeltaBadge />
    </div>
  )
}
