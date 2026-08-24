import type { KpiMetric } from '../types'

interface KpiCardProps {
  metric: KpiMetric
  icon?: React.ReactNode
  period?: string
}

export default function KpiCard({ metric, icon, period }: KpiCardProps) {
  const { label, value, unit } = metric

  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-surface-600/60 bg-surface-800/50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-medium uppercase leading-4 tracking-[0.08em] text-slate-400">
          {label}
        </span>
        {icon && <span className="mt-0.5 shrink-0 text-slate-500">{icon}</span>}
      </div>
      <div className="mt-1.5 break-words font-mono text-xl font-semibold leading-6 text-slate-100">
        {value}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[10px] text-slate-500">
        {unit && <span className="leading-4">{unit}</span>}
        {period && <span className="shrink-0 font-mono">{period}</span>}
      </div>
    </div>
  )
}
