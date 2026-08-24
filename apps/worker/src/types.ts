/**
 * Shared data types for the Global Intelligence Analytics Worker.
 * Mirrors apps/web/src/types.ts – the merged schema across economic,
 * energy, and health sectors, keyed by ISO3 + year.
 */
export interface GlobalEntityMetric {
  iso3: string
  countryName: string
  year: number

  // World Bank
  gdpUsd: number | null
  gdpPerCapitaUsd: number | null
  gdpGrowthRate: number | null
  population: number | null
  taxRevenuePctGdp: number | null
  giniCoefficient: number | null
  internetPenetrationPct: number | null
  urbanPopulationPct: number | null

  // OWID / IHME
  lifeExpectancy: number | null
  under5MortalityRate: number | null
  daly100k: number | null
  dalysRateUpper?: number | null
  dalysRateLower?: number | null
  healthExpenditurePctGdp: number | null

  // Energy
  primaryEnergyTwh: number | null
  primaryEnergyPerCapitaKwh?: number | null
  energyIntensityMjPerUsd: number | null
  renewableSharePct: number | null
  co2MtCo2: number | null
}

export interface Env {
  GLOBAL_DATA_KV: KVNamespace
  AI: Ai
}
