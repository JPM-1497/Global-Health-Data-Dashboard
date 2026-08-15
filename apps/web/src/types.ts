/** Merged schema for economic, energy, and health sector data */
export interface GlobalEntityMetric {
  /** ISO 3166-1 alpha-3 country code */
  iso3: string;
  /** Country display name */
  countryName: string;
  /** Reference year */
  year: number;

  // --- Economic (World Bank) ---
  /** GDP in current USD */
  gdpUsd: number | null;
  /** GDP per capita in current USD */
  gdpPerCapitaUsd: number | null;
  /** GDP annual growth rate (%) */
  gdpGrowthRate: number | null;
  /** Population count */
  population: number | null;
  /** Gini coefficient (0–100) */
  giniCoefficient: number | null;

  // --- Health (OWID / IHME) ---
  /** Life expectancy at birth (years) */
  lifeExpectancy: number | null;
  /** Under-5 mortality rate (per 1,000 live births) */
  under5MortalityRate: number | null;
  /** Disability-Adjusted Life Years per 100,000 population */
  daly100k: number | null;
  /** Healthcare expenditure as % of GDP */
  healthExpenditurePctGdp: number | null;

  // --- Energy ---
  /** Primary energy consumption (TWh) */
  primaryEnergyTwh: number | null;
  /** Primary energy consumption per person (kWh/person) */
  primaryEnergyPerCapitaKwh?: number | null;
  /** Energy intensity (MJ per USD GDP) */
  energyIntensityMjPerUsd: number | null;
  /** Renewable energy share (%) */
  renewableSharePct: number | null;
  /** CO2 emissions (MtCO2) */
  co2MtCo2: number | null;
}

export interface KpiMetric {
  label: string;
  value: string;
  yoyDelta: number | null;
  unit?: string;
}

export interface AISummary {
  text: string;
  generatedAt: string;
}

export interface ApiDataResponse {
  data: GlobalEntityMetric[];
  cached: boolean;
  lastUpdated: string;
}
