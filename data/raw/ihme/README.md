# IHME GBD input

Place authorized IHME GBD CSV exports in this directory before running the
preprocessor. The export should include `year`, a country or location field,
and a numeric value field such as `val`; GBD DALY exports should also retain
their measure, metric, age, sex, and cause columns so the script can select
all-cause DALY rates.

The official entry point is the [IHME GBD Results Tool](https://ghdx.healthdata.org/gbd-results-tool).
The tool may require an account, an approved request, or acceptance of data
use terms. Do not commit restricted or very large raw exports to the repository.