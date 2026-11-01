# MHO breakdown and descriptive findings — 18 October 2026

## Implemented

- Case breakdown has accessible Barangay / Age group tabs, horizontal count bars, percentage tooltips and screen-reader chart data. It follows year, barangay, age and outcome selection. Empty matches are represented as missing bars, not asserted zero community disease.
- Descriptive findings show the leading recorded disease, highest recorded barangay count, largest known age group and peak recorded month, with count/share. Shared maxima are identified as ties; unknown ages remain a separate group. Peak month uses original case dates, not follow-up visit dates.
- The responsive layout retains the top-ten bars, year comparison, trend line and deceased-case donut. No visible table expanders were added.

## Sample data

Show sample data switches the whole analytics page to a consistent, deterministic fictional dataset with ten conditions, all configured barangays, four years, all age groups including missing ages, and five categories of sample Deceased case outcomes. The source banner and scope badge identify sample mode. The switch defaults off and returning to recorded data resets filters and restores saved-case aggregates.

The sample provider only generates display responses for MHO analytics GET endpoints. It does not write residents, cases, visits, catalog entries, reports or forecasts. Sample values are not mixed into the database or other workflows. No sex field or database migration is included.

## Validation

23 UI/theme checks and eight analytics tests passed. Integration checks reconcile case totals across barangay, age, month, top diseases, trend and outcomes; verify filters and MHO-only access; and confirm sample requests do not change saved case counts. Fixture cleanup checks the original database fingerprint. Browser checks covered both tabs, ties, unknown ages, sample/recorded switching, filtered findings and a 390px viewport without horizontal overflow.

Private screenshots and preview: analysis/analytics-breakdown-20261018/. Azure release evidence: analysis/azure-breakdown-20261018/.

## Azure deployment

Deployed successfully on October 18, 2026: seven files updated and all 142 runtime hashes verified. Digest: `28b1da5e7678ad06a7285c3e72cd32d9767e61ca845dd05ab97430bb8b248582`. An encrypted recovery backup was verified; database fields and private configuration were preserved and the running service passed its health check. Recovery files: `/home/azureuser/azure-sync-release-1792325413307`.

All 18 live checks passed. Sample data populates ten conditions, seven configured barangays, all age groups and five donut categories. Browser verification confirmed the new findings and both breakdown tabs. Saved-case breakdown totals also reconcile with saved-case summaries. No patient data was written or uploaded. Sample mode is enabled in the delivered browser tab for inspection; new page loads default to recorded data.
