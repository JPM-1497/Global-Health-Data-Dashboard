export type CountryRegion = 'americas' | 'europe' | 'other'

export interface DashboardCountry {
  iso3: string
  name: string
  region: CountryRegion
}

export const DASHBOARD_COUNTRIES: DashboardCountry[] = [
  { iso3: 'ATG', name: 'Antigua and Barbuda', region: 'americas' },
  { iso3: 'ARG', name: 'Argentina', region: 'americas' },
  { iso3: 'BHS', name: 'Bahamas', region: 'americas' },
  { iso3: 'BRB', name: 'Barbados', region: 'americas' },
  { iso3: 'BLZ', name: 'Belize', region: 'americas' },
  { iso3: 'BOL', name: 'Bolivia', region: 'americas' },
  { iso3: 'BRA', name: 'Brazil', region: 'americas' },
  { iso3: 'CAN', name: 'Canada', region: 'americas' },
  { iso3: 'CHL', name: 'Chile', region: 'americas' },
  { iso3: 'COL', name: 'Colombia', region: 'americas' },
  { iso3: 'CRI', name: 'Costa Rica', region: 'americas' },
  { iso3: 'CUB', name: 'Cuba', region: 'americas' },
  { iso3: 'DMA', name: 'Dominica', region: 'americas' },
  { iso3: 'DOM', name: 'Dominican Republic', region: 'americas' },
  { iso3: 'ECU', name: 'Ecuador', region: 'americas' },
  { iso3: 'SLV', name: 'El Salvador', region: 'americas' },
  { iso3: 'GRD', name: 'Grenada', region: 'americas' },
  { iso3: 'GTM', name: 'Guatemala', region: 'americas' },
  { iso3: 'GUY', name: 'Guyana', region: 'americas' },
  { iso3: 'HTI', name: 'Haiti', region: 'americas' },
  { iso3: 'HND', name: 'Honduras', region: 'americas' },
  { iso3: 'JAM', name: 'Jamaica', region: 'americas' },
  { iso3: 'MEX', name: 'Mexico', region: 'americas' },
  { iso3: 'NIC', name: 'Nicaragua', region: 'americas' },
  { iso3: 'PAN', name: 'Panama', region: 'americas' },
  { iso3: 'PRY', name: 'Paraguay', region: 'americas' },
  { iso3: 'PER', name: 'Peru', region: 'americas' },
  { iso3: 'KNA', name: 'Saint Kitts and Nevis', region: 'americas' },
  { iso3: 'LCA', name: 'Saint Lucia', region: 'americas' },
  { iso3: 'VCT', name: 'Saint Vincent and the Grenadines', region: 'americas' },
  { iso3: 'SUR', name: 'Suriname', region: 'americas' },
  { iso3: 'TTO', name: 'Trinidad and Tobago', region: 'americas' },
  { iso3: 'USA', name: 'United States', region: 'americas' },
  { iso3: 'URY', name: 'Uruguay', region: 'americas' },
  { iso3: 'VEN', name: 'Venezuela', region: 'americas' },

  { iso3: 'AUT', name: 'Austria', region: 'europe' },
  { iso3: 'BEL', name: 'Belgium', region: 'europe' },
  { iso3: 'CZE', name: 'Czechia', region: 'europe' },
  { iso3: 'DNK', name: 'Denmark', region: 'europe' },
  { iso3: 'FIN', name: 'Finland', region: 'europe' },
  { iso3: 'FRA', name: 'France', region: 'europe' },
  { iso3: 'DEU', name: 'Germany', region: 'europe' },
  { iso3: 'GRC', name: 'Greece', region: 'europe' },
  { iso3: 'HUN', name: 'Hungary', region: 'europe' },
  { iso3: 'IRL', name: 'Ireland', region: 'europe' },
  { iso3: 'ITA', name: 'Italy', region: 'europe' },
  { iso3: 'NLD', name: 'Netherlands', region: 'europe' },
  { iso3: 'NOR', name: 'Norway', region: 'europe' },
  { iso3: 'POL', name: 'Poland', region: 'europe' },
  { iso3: 'PRT', name: 'Portugal', region: 'europe' },
  { iso3: 'ROU', name: 'Romania', region: 'europe' },
  { iso3: 'ESP', name: 'Spain', region: 'europe' },
  { iso3: 'SWE', name: 'Sweden', region: 'europe' },
  { iso3: 'CHE', name: 'Switzerland', region: 'europe' },
  { iso3: 'UKR', name: 'Ukraine', region: 'europe' },
  { iso3: 'GBR', name: 'United Kingdom', region: 'europe' },

  { iso3: 'AUS', name: 'Australia', region: 'other' },
  { iso3: 'CHN', name: 'China', region: 'other' },
  { iso3: 'IND', name: 'India', region: 'other' },
  { iso3: 'JPN', name: 'Japan', region: 'other' },
  { iso3: 'NGA', name: 'Nigeria', region: 'other' },
  { iso3: 'ZAF', name: 'South Africa', region: 'other' },
]

export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  DASHBOARD_COUNTRIES.map((country) => [country.iso3, country.name]),
)
