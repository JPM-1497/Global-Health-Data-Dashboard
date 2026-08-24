interface HeaderProps {
  title: string
  startYear: number
  endYear: number
  onRangeChange: (startYear: number, endYear: number) => void
}

const YEAR_MIN = 1990
const YEAR_MAX = 2026

export default function Header({ title, startYear, endYear, onRangeChange }: HeaderProps) {
  const years = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i)

  const selectClass =
    'rounded border border-surface-600/70 bg-surface-800/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent-blue/40'

  return (
    <header className="sticky top-0 z-50 border-b border-surface-600/80 bg-surface-900/85 backdrop-blur-md">
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-400">
              Global Health Data Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
          </div>

          {/* Subtle year filter */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-[10px] uppercase tracking-[0.2em]">Period</span>
            <select
              value={startYear}
              onChange={(e) => onRangeChange(Math.min(Number(e.target.value), endYear), endYear)}
              className={selectClass}
              aria-label="Start year"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="text-[10px]">–</span>
            <select
              value={endYear}
              onChange={(e) => onRangeChange(startYear, Math.max(Number(e.target.value), startYear))}
              className={selectClass}
              aria-label="End year"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  )
}
