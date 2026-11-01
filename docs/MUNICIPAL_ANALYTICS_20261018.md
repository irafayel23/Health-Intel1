# Municipal Analytics redesign — 2026-10-18

Implemented locally; Azure has not been updated by this task.

## Page behavior
- Global Barangay, Recorded year and Age at case date filters appear above compact KPI cards.
- All years lists stored years dynamically. All configured barangays are loaded from reference data.
- Top recorded diseases remains a horizontal bar chart, with visible counts, full-name tooltips and a table alternative. Long axis labels are shortened on smaller screens.
- At a glance gives the leading category, count and share without a long scope paragraph. Ties are described as shared highest counts.
- Recorded cases over time is a line chart: annual totals for All Years; January–December for one year. The optional disease selector affects this chart only. Current year is labeled Year to date.
- Missing periods are null gaps, not asserted zero reporting. Counts use original case dates and do not multiply cases by follow-up visits.
- Cases marked Deceased retains its donut chart, condition counts and percentage tooltips. All conditions are included in its denominator; the earlier top-five cutoff is removed. Empty filters show an honest, compact empty state.
- Data tables are available for all three charts. Light/dark themes and responsive layouts are supported. Chart animations are disabled for stable filter and resize rendering.
- The outcome selector affects Top recorded diseases and At a glance only. KPI/trend/donut behavior remains explicitly described.
- Existing archived historical cases are retained; active totals exclude archived cases. A case marked Deceased is not a unique confirmed resident or a verified cause of death.

## Backend
Added MHO-only GET /api/mho/analytics-options and /api/mho/trend. Existing /api/mho/yoy is retained for compatibility. Parameterized queries reuse established age and barangay filters. No schema migration or original patient-data changes are required.

## Validation
- Full regression suite: 203 passed, 0 failed.
- Final UI/theme checks after chart refinements: 23 passed, 0 failed.
- Three new integration tests check annual/monthly aggregation, disease/barangay/age filters, case-versus-visit counts, empty results, invalid filters, MHO-only access, dynamic choices and all deceased conditions.
- Browser checked at 1440px desktop and 390px mobile widths, including monthly disease filtering, tables, dark mode and empty charts. No horizontal overflow at 390px and no browser console errors observed. This does not replace physical-phone testing.
- Screenshots use an isolated disposable database populated with synthetic records. Original local database is fingerprint-checked on preview cleanup.

## Design references
- https://ukhsa-dashboard.data.gov.uk/respiratory-viruses/covid-19 — explicit scope/period, headline totals and chart/table presentation.
- https://www.cdc.gov/resp-net/dashboard/ — healthcare trend exploration and chart/table access.

Screenshots and logs: analysis/municipal-analytics-20261018/.

## Azure deployment update

Deployed to Azure on October 18, 2026. See [the Azure release record](AZURE_UPDATE_20261018.md). All 141 runtime hashes were verified; original database fields and private settings were preserved.

The grouped disease-by-year bar chart is also retained alongside the trend line: All Years displays every available year, and a selected year compares with its previous year. Current-year data is labeled YTD. The final full local suite passed 204 checks.
