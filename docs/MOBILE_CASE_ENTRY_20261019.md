# Mobile case entry and disease catalog update

Implemented locally and deployed to Azure on October 19, 2026.

## Behavior

- BHW case entry and MHO walk-in entry use the same searchable disease picker. The first page contains up to ten catalog choices, with recorded diseases ordered by case count. Search all diseases searches the full active catalog, including names outside the first ten.
- The picker does not invent ranks for diseases without saved cases. Where fewer than ten diseases have cases, other catalog choices remain available and are labeled as having no recorded cases in that scope.
- Condition not listed is for a condition missing from the full active catalog. It preserves the reported wording and source for Review Center → Disease Review. A disease outside the top ten that is already in the catalog can be selected directly without classification review.
- Mobile pickers use the visible viewport, scroll within their own list, use a 16px search input, and provide a Done action. Opening or navigating a picker does not scroll the entire form to the highlighted option.
- Blood pressure has separate numeric Systolic and Diastolic fields in both forms. Both must be completed; the existing API/database representation remains a single value such as 120/80. Resetting the form clears both fields.
- Disease Review and Resident Status use compact icon headings and responsive cards, replacing the two redundant uppercase green labels. Disease Review's refresh action moves below its description on narrow screens.
- Both portals use versioned asset references for the mobile release.

These changes do not alter the forecasting model, forecast eligibility or forecast horizon. The intended top-ten prediction limit was clarified by the project owner; it is separate from allowing other diseases to be recorded. The supplied manuscript did not contain an explicit top-ten prediction restriction in its searchable text.

## Verification

- 34 focused frontend/measurement checks passed.
- 25 catalog, consultation and normalization integration checks passed using disposable local databases.
- Manual browser checks at 390 × 844 covered both role forms. A reduced 390 × 440 viewport checked the disease picker with limited space; the picker stayed within the viewport and search text remained 16px. These are browser simulations, not a physical-phone certification.
- MHO saved a synthetic catalog disease outside the initial ten choices. Missing diastolic pressure was rejected and focused correctly. Correcting it saved the consultation, then reset both pressure inputs.
- BHW saved a synthetic unlisted condition. MHO found the same case in Disease Review and linked an existing catalog name without creating another case. All writes were confined to disposable fixtures, whose cleanup verified the preserved source database unchanged.
- Azure's initial catalog contained only Hypertension, Dengue and Influenza. The existing project seed added eight missing case-category names and an audit record. The resulting catalog has eleven active names; only three currently have recorded-case ranks. No patient cases were generated or uploaded.
- Azure BHW browser checks confirmed separate pressure fields, ten initial catalog choices, Search all diseases (11), and searching/selecting Vertigo from the full catalog. The fictional draft was canceled without saving.
- An independent approved beta MHO verification session confirmed eleven choices through the hosted walk-in-options endpoint and was logged out afterward.
- All ten deployed static-file hashes matched the local release; the public health endpoint returned HTTP 200.

Static recovery copies: `/home/azureuser/mobile-entry-fix-1792421571`. No service restart was required for the static update. Private manifests and verification results are retained under `analysis/mobile-fix-20261019/`, excluded from publication.

Screenshots: [BHW measurements](ui-verification/mobile-entry-20261019/bhw-measurements.png), [Disease Review](ui-verification/mobile-entry-20261019/disease-review.png), [Resident Status](ui-verification/mobile-entry-20261019/resident-status.png), [Azure disease picker](ui-verification/mobile-entry-20261019/azure-disease-picker.png).
