import type { GlobalEntityMetric } from './types'
import ihmeHealth from '../../../data/processed/ihme/health.json'

const IHME_DALY_BY_KEY = new Map(
  ihmeHealth.records.map((record) => [
    `${record.countryCode}:${record.year}`,
    record,
  ]),
)

/** Simulated World Bank rows keyed by iso3 */
const WORLD_BANK_ROWS: Record<string, Partial<GlobalEntityMetric>> = {
  USA: { gdpUsd: 27360e9, gdpPerCapitaUsd: 80412, gdpGrowthRate: 2.5, population: 340e6, giniCoefficient: 41.5 },
  CHN: { gdpUsd: 18530e9, gdpPerCapitaUsd: 13136, gdpGrowthRate: 5.2, population: 1412e6, giniCoefficient: 38.5 },
  IND: { gdpUsd: 3737e9, gdpPerCapitaUsd: 2601, gdpGrowthRate: 7.0, population: 1440e6, giniCoefficient: 35.7 },
  DEU: { gdpUsd: 4457e9, gdpPerCapitaUsd: 53560, gdpGrowthRate: -0.3, population: 84e6, giniCoefficient: 31.7 },
  GBR: { gdpUsd: 3089e9, gdpPerCapitaUsd: 45295, gdpGrowthRate: 0.4, population: 68e6, giniCoefficient: 36.3 },
  BRA: { gdpUsd: 2174e9, gdpPerCapitaUsd: 10138, gdpGrowthRate: 2.9, population: 215e6, giniCoefficient: 53.4 },
  NGA: { gdpUsd: 472e9, gdpPerCapitaUsd: 2184, gdpGrowthRate: 2.9, population: 220e6, giniCoefficient: 43.0 },
  ZAF: { gdpUsd: 380e9, gdpPerCapitaUsd: 6194, gdpGrowthRate: 1.1, population: 61e6, giniCoefficient: 63.0 },
  JPN: { gdpUsd: 4213e9, gdpPerCapitaUsd: 33950, gdpGrowthRate: 1.9, population: 124e6, giniCoefficient: 32.9 },
  AUS: { gdpUsd: 1693e9, gdpPerCapitaUsd: 64960, gdpGrowthRate: 2.0, population: 26e6, giniCoefficient: 34.3 },
}

/** Simulated OWID / IHME rows keyed by iso3 */
const HEALTH_ROWS: Record<string, Partial<GlobalEntityMetric>> = {
  USA: { lifeExpectancy: 78.9, under5MortalityRate: 5.8, daly100k: 23500, healthExpenditurePctGdp: 17.3 },
  CHN: { lifeExpectancy: 77.3, under5MortalityRate: 6.3, daly100k: 25000, healthExpenditurePctGdp: 5.7 },
  IND: { lifeExpectancy: 70.1, under5MortalityRate: 30.7, daly100k: 34000, healthExpenditurePctGdp: 3.0 },
  DEU: { lifeExpectancy: 81.2, under5MortalityRate: 3.5, daly100k: 21000, healthExpenditurePctGdp: 12.9 },
  GBR: { lifeExpectancy: 81.0, under5MortalityRate: 3.7, daly100k: 22000, healthExpenditurePctGdp: 10.9 },
  BRA: { lifeExpectancy: 75.9, under5MortalityRate: 12.4, daly100k: 28000, healthExpenditurePctGdp: 9.9 },
  NGA: { lifeExpectancy: 63.0, under5MortalityRate: 75.4, daly100k: 52000, healthExpenditurePctGdp: 3.9 },
  ZAF: { lifeExpectancy: 64.9, under5MortalityRate: 30.3, daly100k: 47000, healthExpenditurePctGdp: 8.3 },
  JPN: { lifeExpectancy: 84.3, under5MortalityRate: 2.3, daly100k: 19000, healthExpenditurePctGdp: 11.5 },
  AUS: { lifeExpectancy: 83.4, under5MortalityRate: 3.4, daly100k: 20000, healthExpenditurePctGdp: 10.7 },
}

/** Simulated energy rows keyed by iso3 */
const ENERGY_ROWS: Record<string, Partial<GlobalEntityMetric>> = {
  USA: { primaryEnergyTwh: 23000, energyIntensityMjPerUsd: 4.1, renewableSharePct: 12.8, co2MtCo2: 5016 },
  CHN: { primaryEnergyTwh: 35000, energyIntensityMjPerUsd: 8.7, renewableSharePct: 28.4, co2MtCo2: 12700 },
  IND: { primaryEnergyTwh: 9000, energyIntensityMjPerUsd: 11.0, renewableSharePct: 17.5, co2MtCo2: 2837 },
  DEU: { primaryEnergyTwh: 3300, energyIntensityMjPerUsd: 3.5, renewableSharePct: 46.0, co2MtCo2: 675 },
  GBR: { primaryEnergyTwh: 2100, energyIntensityMjPerUsd: 3.3, renewableSharePct: 40.0, co2MtCo2: 332 },
  BRA: { primaryEnergyTwh: 3000, energyIntensityMjPerUsd: 6.3, renewableSharePct: 45.0, co2MtCo2: 462 },
  NGA: { primaryEnergyTwh: 160, energyIntensityMjPerUsd: 15.0, renewableSharePct: 20.0, co2MtCo2: 83 },
  ZAF: { primaryEnergyTwh: 580, energyIntensityMjPerUsd: 7.0, renewableSharePct: 8.0, co2MtCo2: 456 },
  JPN: { primaryEnergyTwh: 4300, energyIntensityMjPerUsd: 3.8, renewableSharePct: 22.0, co2MtCo2: 1056 },
  AUS: { primaryEnergyTwh: 1600, energyIntensityMjPerUsd: 4.6, renewableSharePct: 24.0, co2MtCo2: 414 },
}

const COUNTRY_NAMES: Record<string, string> = {
  USA: 'United States', CHN: 'China', IND: 'India', DEU: 'Germany',
  GBR: 'United Kingdom', BRA: 'Brazil', NGA: 'Nigeria', ZAF: 'South Africa',
  JPN: 'Japan', AUS: 'Australia',
}

/**
 * Join World Bank, OWID/IHME, and energy metrics by ISO3 country code and year.
 * In a real implementation this would pull from upstream APIs or D1 tables.
 */
export function joinMetrics(iso3: string, year: number): GlobalEntityMetric {
  const wb = WORLD_BANK_ROWS[iso3] ?? {}
  const health = HEALTH_ROWS[iso3] ?? {}
  const energy = ENERGY_ROWS[iso3] ?? {}
  const ihme = IHME_DALY_BY_KEY.get(`${iso3}:${year}`)

  // Simulate minor year-over-year drift so historical queries are plausible
  const yrDelta = year - 2023
  const growth = 1 + yrDelta * 0.022

  return {
    iso3,
    countryName: COUNTRY_NAMES[iso3] ?? iso3,
    year,
    // World Bank
    gdpUsd: wb.gdpUsd != null ? Math.round(wb.gdpUsd * growth) : null,
    gdpPerCapitaUsd: wb.gdpPerCapitaUsd != null ? Math.round(wb.gdpPerCapitaUsd * growth) : null,
    gdpGrowthRate: wb.gdpGrowthRate ?? null,
    population: wb.population ?? null,
    giniCoefficient: wb.giniCoefficient ?? null,
    internetPenetrationPct: null,
    urbanPopulationPct: null,
    // Health
    lifeExpectancy: health.lifeExpectancy != null
      ? parseFloat((health.lifeExpectancy + yrDelta * 0.06).toFixed(1))
      : null,
    under5MortalityRate: health.under5MortalityRate != null
      ? parseFloat((health.under5MortalityRate * (1 - yrDelta * 0.01)).toFixed(1))
      : null,
    daly100k: ihme?.dalysRate ?? (health.daly100k != null
      ? Math.round(health.daly100k * (1 - yrDelta * 0.008))
      : null),
    dalysRateUpper: ihme?.dalysRateUpper ?? null,
    dalysRateLower: ihme?.dalysRateLower ?? null,
    healthExpenditurePctGdp: health.healthExpenditurePctGdp ?? null,
    // Energy
    primaryEnergyTwh: energy.primaryEnergyTwh != null ? Math.round(energy.primaryEnergyTwh * growth) : null,
    primaryEnergyPerCapitaKwh: null,
    energyIntensityMjPerUsd: energy.energyIntensityMjPerUsd ?? null,
    renewableSharePct: energy.renewableSharePct != null
      ? parseFloat((energy.renewableSharePct + yrDelta * 0.5).toFixed(1))
      : null,
    co2MtCo2: energy.co2MtCo2 != null ? Math.round(energy.co2MtCo2 * (1 + yrDelta * 0.005)) : null,
  }
}
