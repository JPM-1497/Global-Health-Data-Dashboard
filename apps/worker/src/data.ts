import type { GlobalEntityMetric } from './types'
import ihmeHealth from '../../../data/processed/ihme/health.json'
import { COUNTRY_NAMES } from './countryCatalog'

const IHME_DALY_BY_KEY = new Map(
  ihmeHealth.records.map((record) => [
    `${record.countryCode}:${record.year}`,
    record,
  ]),
)

/**
 * Build a source-only base metric for an ISO3/year.
 * This function intentionally does not synthesize World Bank or OWID values.
 * Those are merged from live source fetchers in index.ts.
 */
export function joinMetrics(iso3: string, year: number): GlobalEntityMetric {
  const ihme = IHME_DALY_BY_KEY.get(`${iso3}:${year}`)

  return {
    iso3,
    countryName: COUNTRY_NAMES[iso3] ?? iso3,
    year,

    // World Bank fields (filled by fetchWorldBankMetrics/fetchWorldBankMetricsForCountries)
    gdpUsd: null,
    gdpPerCapitaUsd: null,
    gdpGrowthRate: null,
    population: null,
    taxRevenuePctGdp: null,
    giniCoefficient: null,
    internetPenetrationPct: null,
    urbanPopulationPct: null,

    // Health fields (IHME where available)
    lifeExpectancy: ihme?.lifeExpectancy ?? null,
    under5MortalityRate: null,
    daly100k: ihme?.dalysRate ?? null,
    dalysRateUpper: ihme?.dalysRateUpper ?? null,
    dalysRateLower: ihme?.dalysRateLower ?? null,
    healthExpenditurePctGdp: null,

    // Energy fields (filled by fetchOwidMetrics)
    primaryEnergyTwh: null,
    primaryEnergyPerCapitaKwh: null,
    energyIntensityMjPerUsd: null,
    renewableSharePct: null,
    co2MtCo2: null,
  }
}
