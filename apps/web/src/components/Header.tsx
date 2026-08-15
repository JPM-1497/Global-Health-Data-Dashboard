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
  year: number
  onYearChange: (year: number) => void
}

export default function Header({
  selectedIso3,
  onIso3Change,
  year,
  onYearChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-surface-900/80 backdrop-blur border-b border-surface-600">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 mr-4">
          <TrendingUp className="text-accent-blue" size={20} />
          <span className="text-sm font-semibold tracking-wide whitespace-nowrap">
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
            className="bg-surface-700 border border-surface-600 text-sm rounded-lg px-3 py-1.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          >
            {COUNTRIES.map((c) => (
              <option key={c.iso3} value={c.iso3}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timeline Slider */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-gray-400 whitespace-nowrap">1990</span>
          <input
            type="range"
            min={1990}
            max={2026}
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="flex-1 accent-accent-blue cursor-pointer"
            aria-label="Select year"
          />
          <span className="text-xs text-gray-400 whitespace-nowrap">2026</span>
          <span className="font-mono text-sm text-accent-blue font-semibold w-12 text-right">
            {year}
          </span>
        </div>
      </div>
    </header>
  )
}
