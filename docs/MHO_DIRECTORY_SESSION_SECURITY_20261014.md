# MHO patient directory and session security — 14 October 2026

## Patient directory

MHO now has a separate **Patient Directory** sidebar item directly below Walk-in Patients. Walk-in entry and recent consultations remain in their existing page.

The directory searches names or `RES-`/`REC-` references, filters by barangay and resident confirmation status, and loads 25 entries per page from the server. Each linked resident appears once. Historical cases with no resident link are explicitly shown as separate unlinked records, including archived entries. Matching names are never silently merged. Directory totals are entry counts, not a claim about the number of unique people when unlinked records exist.

View history shows identity, suffix, recorded birthdate, barangay/purok, resident status, disease-case counts and all linked consultations. Disease cases and consultations have separate tabs with ten items per history page. Admissions and follow-ups retain the original case reference and do not inflate disease-case counts. Archived cases, recorded measurements, consultation times, referral details, remarks and encoder references remain visible. Unknown information is labeled as not recorded. An unlinked case shows only its own history, not other people with a matching name.

The history dialog supports keyboard tab navigation, light/dark modes and phone layouts, with a persistent Close button. Stored date-only birthdates and case dates are formatted in SQL to avoid shifting them by timezone when serializing a dossier.

The new endpoints are read-only and restricted to MHO:

- `GET /api/mho/patients`
- `GET /api/mho/patients/resident/:id`
- `GET /api/mho/patients/legacy/:id`

Search parameters are bound SQL values; `%`, `_` and `!` are treated literally. Page sizes are fixed and totals are fetched in batches for the displayed page. BHW keeps its existing barangay-scoped access.

## Session security

Previously, suspension denied access while an account was suspended, but restoration could revive an older signed token. Logout also only removed the token from the browser.

Now each login receives a unique token identifier and the current account session epoch. A successful account status change increments that epoch inside the same transaction as the status and audit write. Older tokens remain invalid after restoration; a new login is needed. Login locks the account row before issuing a token to coordinate with status changes. Password change/reset retains its existing password-version revocation.

`POST /api/logout` saves only a SHA-256 token digest and its expiry in persistent MySQL storage. Replaying that token is denied, including through a newly initialized middleware instance. Other independently issued sessions stay active. Expired revocation entries are removed. Token expiry is required.

All four roles use server-confirmed logout, including Superadmin's confirmation dialog. A failed server logout leaves the local session intact and tells the user to retry instead of claiming success. Clearing a shared browser token also returns other portal tabs to sign-in. Tabs in the same browser profile still share the existing localStorage login; this change does not introduce separate accounts per tab or HttpOnly cookies.

Added tables: `account_session_epochs` and `revoked_api_sessions`. The local migration ran twice and verified that all existing table rows were unchanged. No patient data, accounts or passwords were changed by the migration.

## Verification

- **151 regression tests passed, zero failures**, using disposable databases and mocked emails. The full suite checked original-data preservation.
- New integration tests covered MHO-only access, paging, literal search characters, barangay/deceased filters, archived and unlinked histories, admissions/follow-ups, token replay, independent logins, suspension/restoration, audit rollback and invalid token expiry/epochs.
- Browser checks used a separate database containing only synthetic patients and synthetic test accounts. Verified search, filters, directory/history pagination, correct birthdates, measurements, archive labels, admissions/follow-ups, logout and reopening a protected portal after logout.
- Desktop 1366×900 and phone 390×844 checks passed in light/dark themes. Phone history fit within the viewport and Close stayed visible.
- Source recovery copies, regression output, screenshots and QA cleanup confirmation are in `analysis/mho-directory-sessions-20261014/`.

## Deployment scope

These additions were initially local only. They were deployed to Azure on **15 October 2026**; see [Azure release verification](AZURE_RELEASE_20261015.md) for final validation, the MySQL collation correction and backup recovery.

Before a future Azure rollout, create the two session tables with the existing schema administrator, then deploy the session service/middleware/routes, updated frontend, patient directory service/routes and generated MHO CSS together. The production app login must retain its limited privileges; do not grant it CREATE rights just to avoid running the migration. Validate the deployment and preserve Azure's existing database and private configuration.

Predictions and the separate Azure-to-PC backup connectivity problem remain outside this change.
