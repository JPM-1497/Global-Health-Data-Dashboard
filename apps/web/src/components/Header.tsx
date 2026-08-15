import { Globe, TrendingUp } from 'lucide-react'

const COUNTRIES = [
  { iso3: 'USA', name: 'United States' },
  { iso3: 'CHN', name: 'China' },
  { iso3: 'IND', name: 'India' },
  { iso3: 'DEU', name: 'Germany' },
  { iso3: 'GBR', name: 'United Kingdom' },
  { iso3: 'BRA', name: 'Brazil' },
  { iso3: 'NGA', name: 'Nigeria' },
  { iso3: 'ZAF', name: 'South Africa' },
  { iso3: 'JPN', name: 'Japan' },
  { iso3: 'AUS', name: 'Australia' },
]

interface HeaderProps {
  selectedIso3: string
  onIso3Change: (iso3: string) => void
  startYear: number
  endYear: number
  onRangeChange: (startYear: number, endYear: number) => void
}

export default function Header({
  selectedIso3,
  onIso3Change,
  startYear,
  endYear,
  onRangeChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-600 bg-surface-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center">
        {/* Brand */}
        <div className="mr-2 flex items-center gap-2">
          <TrendingUp className="text-accent-blue" size={17} />
          <span className="whitespace-nowrap text-xs font-semibold tracking-wide">
            Global Intelligence Analytics
          </span>
        </div>

        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-gray-400" />
          <label htmlFor="country-select" className="sr-only">
            Select country
          </label>
          <select
            id="country-select"
            value={selectedIso3}
            onChange={(e) => onIso3Change(e.target.value)}
            className="rounded-md border border-surface-600 bg-surface-700 px-2.5 py-1 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          >
            {COUNTRIES.map((c) => (
              <option key={c.iso3} value={c.iso3}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:pl-2">
          <span className="whitespace-nowrap text-[10px] text-gray-500">1990</span>
          <div className="relative h-5 min-w-[120px] flex-1">
            <div className="absolute left-0 right-0 top-2 h-1 rounded-full bg-surface-600" />
            <input
              type="range"
              min={1990}
              max={2026}
              value={startYear}
              onChange={(e) => onRangeChange(Math.min(Number(e.target.value), endYear), endYear)}
              className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent accent-accent-blue [&::-webkit-slider-thumb]:pointer-events-auto"
              aria-label="Select start year"
            />
            <input
              type="range"
              min={1990}
              max={2026}
              value={endYear}
              onChange={(e) => onRangeChange(startYear, Math.max(Number(e.target.value), startYear))}
              className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent accent-accent-yellow [&::-webkit-slider-thumb]:pointer-events-auto"
              aria-label="Select end year"
            />
          </div>
          <span className="whitespace-nowrap text-[10px] text-gray-500">2026</span>
          <span className="w-20 whitespace-nowrap text-right font-mono text-[11px] font-semibold text-accent-blue">
            {startYear} - {endYear}
          </span>
        </div>
      </div>
    </header>
  )
}
