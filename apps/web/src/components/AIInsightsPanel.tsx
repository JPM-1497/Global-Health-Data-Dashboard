import { Sparkles } from 'lucide-react'
import type { AISummary } from '../types'

interface AIInsightsPanelProps {
  summary: AISummary | null
  loading: boolean
  onRefresh: () => void
}

function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 rounded"
          style={{ width: `${85 - i * 8}%` }}
        />
      ))}
    </div>
  )
}

export default function AIInsightsPanel({
  summary,
  loading,
  onRefresh,
}: AIInsightsPanelProps) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-yellow" />
          <h3 className="text-sm font-semibold text-gray-300">AI Insights</h3>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-accent-blue hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating…' : 'Refresh'}
        </button>
      </div>

      <div className="min-h-[80px]">
        {loading ? (
          <SkeletonLines count={4} />
        ) : summary ? (
          <>
            <p className="text-sm text-gray-300 leading-relaxed">
              {summary.text}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Generated {new Date(summary.generatedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Click &ldquo;Refresh&rdquo; to generate an AI-powered summary for
            the selected country and year.
          </p>
        )}
      </div>
    </div>
  )
}
