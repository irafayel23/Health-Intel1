# Disease Catalog simplification — October 18, 2026

The Admin Disease Catalog manages the names available when BHW and MHO record new disease cases. It does not create patient records, diagnose conditions or assign patient severity.

## Changes

- Renamed the sidebar, heading and add action to Disease Catalog / Add Disease Name.
- Simplified both tables to Disease Name, Availability and Actions. Removed the displayed category and legacy risk classification.
- Simplified creation to a disease name, with clear explanatory text, validation, duplicate/rejected-save feedback and prevention of repeated submissions while saving.
- Kept Archive and Restore, with explanations that archiving removes a choice from new case entry while retaining historical records.
- Preserved existing HTML hooks and endpoint names. The API accepts name-only creation, defaulting legacy metadata to morbidity / Standard. Existing metadata is retained for compatibility; no database migration or historical rewrite is required.
- Kept searchable/top-10 BHW/MHO choices and the unlisted-condition MHO review workflow.

## Verification

42 focused checks passed across disease review, UI workflow, portal structure and theme/accessibility suites. Integration checks used a disposable local database and verified name-only creation, duplicate prevention, BHW/MHO choice availability, archive/restore and retained case severity/history. Browser checks covered the active and archived views, duplicate feedback, desktop light/dark mode and the form at a 390 × 844 phone viewport.

Screenshots use only synthetic catalog entries. The disposable browser database is removed after verification, with the original database fingerprint checked unchanged.

This change was implemented and checked locally. It has not been deployed to Azure as part of this task.

## Complete local role-flow rehearsal

An additional run of `catalog-role-flow.test.js`, `disease-review.test.js` and `ui-workflow.test.js` passed **22 of 22 checks**. The three added role-flow checks use actual local sign-in and HTTP endpoints:

1. Admin adds a name → it appears in BHW choices → BHW records a case and initial consultation → MHO finds the same resident, case and consultation through Patient Directory.
2. BHW saves an unlisted condition → the pending record appears in both roles → MHO links it to an existing catalog name → BHW and MHO histories show the reviewed classification. Case/resident IDs, identity, severity, status, original wording and source are retained; case and consultation counts do not increase during review. BHW cannot execute the MHO review action.
3. MHO approves a new name for an unlisted condition → the same reviewed name appears in the Admin catalog and both BHW/MHO consultation choices.

The temporary test database was removed and its fixture verified that the original local database fingerprint remained unchanged. This was an automated local integration rehearsal, not a fresh manual browser click-through or an Azure test. The regression checks are included in the default backend test command for future changes.

## Azure deployment update

Deployed to Azure on October 18, 2026. See [the Azure release record](AZURE_UPDATE_20261018.md). All 141 runtime hashes were verified; original database fields and private settings were preserved.
