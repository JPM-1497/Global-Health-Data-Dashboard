import { Info } from 'lucide-react'
import type { KpiMetric } from '../types'

interface KpiCardProps {
  metric: KpiMetric
  icon?: React.ReactNode
  endYear: number
  selectedValue?: string
  selectedCountryName?: string
}

const KPI_DETAILS: Record<string, Omit<KpiMetricDetail, 'calculation'>> = {
  'GDP per Capita': { definition: 'GDP per person, adjusted for population size.', interpretation: 'Higher values generally indicate greater average income and economic output per resident; lower values suggest weaker purchasing power and economic activity.', sourceLabel: 'WB', sourceDetail: 'World Bank, NY.GDP.PCAP.CD' },
  Population: { definition: 'Total population count.', interpretation: 'This indicates the scale of a country and helps interpret absolute economic and energy metrics.', sourceLabel: 'WB', sourceDetail: 'World Bank, SP.POP.TOTL' },
  'Tax Revenue': { definition: 'Total tax revenue collected as a share of gross domestic product.', interpretation: 'Higher values indicate the government raises more tax relative to the economy; lower values suggest a lighter tax burden or smaller public revenue base.', sourceLabel: 'WB', sourceDetail: 'World Bank, GC.TAX.TOTL.GD.ZS' },
  'Life Expectancy': { definition: 'Average number of years a person is expected to live at birth.', interpretation: 'Higher values usually indicate better overall public health, healthcare access, and living conditions.', sourceLabel: 'WB/IHME', sourceDetail: 'World Bank SP.DYN.LE00.IN, fallback IHME' },
  'DALYs / 100k': { definition: 'Disability-adjusted life years lost per 100,000 people.', interpretation: 'Lower is better because it means fewer years of healthy life are being lost.', sourceLabel: 'IHME', sourceDetail: 'IHME GBD export (processed)' },
  'Gini Index': { definition: 'A summary measure of income inequality.', interpretation: 'Higher values indicate greater inequality; lower values suggest a more even distribution of income.', sourceLabel: 'WB', sourceDetail: 'World Bank, SI.POV.GINI' },
  'Urban Population': { definition: 'Share of the population living in urban areas.', interpretation: 'Higher values usually reflect greater urbanisation, infrastructure concentration, and service demand.', sourceLabel: 'WB', sourceDetail: 'World Bank, SP.URB.TOTL.IN.ZS' },
  'Internet Access': { definition: 'Share of the population using the internet.', interpretation: 'Higher values indicate stronger digital connectivity and access to online services.', sourceLabel: 'WB', sourceDetail: 'World Bank, IT.NET.USER.ZS' },
  'Renewable Share': { definition: 'Share of total energy supply coming from renewable sources.', interpretation: 'Higher percentages imply a cleaner, more diversified energy mix.', sourceLabel: 'OWID', sourceDetail: 'OWID, renewables_share_energy' },
  'Primary Energy': { definition: 'Total primary energy consumed in terawatt-hours.', interpretation: 'Higher values indicate greater total energy use and should be interpreted alongside population and efficiency.', sourceLabel: 'OWID', sourceDetail: 'OWID, primary_energy_consumption' },
}

interface KpiMetricDetail {
  definition: string
  interpretation: string
  calculation: string
  sourceLabel: string
  sourceDetail: string
}

function calculationFor(label: string, endYear: number): string {
  const calculations: Record<string, string> = {
    'GDP per Capita': `World Bank indicator NY.GDP.PCAP.CD for ${endYear} (current USD).`,
    Population: `World Bank indicator SP.POP.TOTL for ${endYear}.`,
    'Tax Revenue': `World Bank indicator GC.TAX.TOTL.GD.ZS for ${endYear}.`,
    'Life Expectancy': `World Bank indicator SP.DYN.LE00.IN for ${endYear}; falls back to IHME if unavailable.`,
    'DALYs / 100k': `IHME DALY rate (all causes, both sexes, all ages) for ${endYear}.`,
    'Gini Index': `World Bank indicator SI.POV.GINI for ${endYear}.`,
    'Urban Population': `World Bank indicator SP.URB.TOTL.IN.ZS for ${endYear}.`,
    'Internet Access': `World Bank indicator IT.NET.USER.ZS for ${endYear}.`,
    'Renewable Share': `OWID renewables_share_energy for ${endYear} (percentage of energy).`,
    'Primary Energy': `OWID primary_energy_consumption for ${endYear} (TWh).`,
  }
  return calculations[label] ?? ''
}

export default function KpiCard({ metric, icon, endYear, selectedValue, selectedCountryName }: KpiCardProps) {
  const { label, value } = metric
  const detail = KPI_DETAILS[label]

  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-[#f4efe2]/30 bg-[#1d3930] px-3 py-2.5 shadow-[0_10px_20px_rgba(2,16,12,0.16)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          {icon && <span className="-translate-y-px shrink-0 text-slate-500">{icon}</span>}
          <span className="text-[10px] font-medium uppercase leading-4 tracking-[0.08em] text-slate-400">
            {label}
          </span>
        </div>
        {detail && (
          <span className="group relative inline-flex shrink-0 cursor-help text-slate-500">
            <Info size={12} aria-hidden="true" />
            <span className="pointer-events-none absolute right-0 top-full z-40 mt-2 w-72 rounded-md border border-surface-600 bg-surface-900 p-2 text-left text-[11px] font-normal normal-case leading-5 tracking-normal text-gray-300 opacity-0 shadow-xl transition group-hover:opacity-100">
              <span className="block font-medium text-accent-blue">{label}</span>
              <span className="mt-1 block text-gray-300">{detail.definition}</span>
              <span className="mt-1 block text-gray-400">{detail.interpretation}</span>
              <span className="mt-1 block text-gray-500">Calculation: {calculationFor(label, endYear)}</span>
              <span className="mt-1 block text-gray-500">Source: {detail.sourceDetail}</span>
              <span className="mt-1 block text-gray-500">Source Badge: {detail.sourceLabel}</span>
            </span>
          </span>
        )}
      </div>
      <div className="mt-1.5 break-words font-mono text-xl font-semibold leading-6 text-slate-100">
        {value}
      </div>
      {selectedValue && selectedCountryName && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-surface-700/80 pt-2 text-[10px] leading-4">
          <span className="truncate text-slate-500" title={selectedCountryName}>{selectedCountryName}</span>
          <span className="shrink-0 font-mono font-medium text-accent-blue">{selectedValue}</span>
        </div>
      )}
    </div>
  )
}
