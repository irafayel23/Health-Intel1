# Setup

Verified on Windows with Node.js 24, Python 3.12 and the local XAMPP MySQL-compatible database. Use a supported Node.js 22 or newer release. Required packages are declared in `server/package.json` and pinned Python requirements in `server/requirements.txt`.

## Existing installation

1. Start MySQL in XAMPP. The current local database is `health_intel`.
2. Open a terminal in `proposal/server` and run `npm ci` when installing on another machine.
3. Create a Python environment with `python -m venv .venv`, then run `.venv\Scripts\python.exe -m pip install -r requirements.txt` on Windows.
4. Copy `.env.example` to `.env` on a fresh installation and configure the database and email. Keep `.env` private. Keep the local JWT secret and virtual environment under `server/`; never commit them. Do not overwrite a working configuration.
5. Run `npm start`. The API uses port 3000 unless PORT is configured.
6. Serve the frontend from `proposal` using your existing local frontend server and open `index.html`. Frontend requests default to `http://localhost:3000`. A different deployment can set `window.HEALTH_INTEL_API_ORIGIN` before `assets/js/api-session.js` loads.

For a fresh database, restore a trusted SQL backup containing the eight documented tables. Creating an empty database alone is insufficient. There is no automatic, verified CSV-to-patient import script.

## Private configuration

`.env.example` lists DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT, JWT_SECRET and SMTP settings. Existing process environment variables take priority over `.env`.

Set a strong, stable JWT_SECRET for a shared deployment. Local development otherwise uses the ignored `server/.local-jwt-secret`. Changing this key invalidates sessions and pending reset codes. Password changes and resets also invalidate existing login sessions; sign in again.

SMTP_SERVICE or SMTP_HOST, SMTP_USER and SMTP_PASSWORD enable email. Gmail requires appropriate account authentication, such as an app password. Keep any account credentials out of commits and shared reports. Real delivery depends on the account, network and hosting provider; local tests mock email and do not verify inbox delivery.

Approval reports whether email was sent, failed or was not configured. If approval succeeds but email fails, the approved account remains approved. Recovery codes expire after 15 minutes, are single-use and allow at most five incorrect code attempts. Request and submission rate limits also apply. Legacy plaintext reset codes are no longer accepted.

## Aggregate forecasting data

From `server`:

```text
npm run data:review
npm run data:prepare -- --input PATH_TO_CSV --source-type real --source-ref "MHO report identifier" --aliases PATH_TO_REVIEW_CSV
```

CSV requires Date, Barangay, Disease, Cases; optional ReportingStatus is complete, partial or unknown. Dates can be YYYY-MM or YYYY-MM-DD. Counts must be nonnegative integers. Use the seven exact barangay names returned by the database.

Run real, synthetic and unverified source batches separately. Source declarations and file fingerprints support traceability; verify authenticity against your source documents. Reviewed alias mappings require Decision=approved, Reviewer, ReviewDate and an active canonical disease. Existing database disease names are not renamed. Injury/bite categories are held outside disease forecasting. Possible overlapping totals are held for review. Missing reports remain blank, never silently zero.

Every run creates a new output folder under `analysis/data_preparation` unless --output is supplied. It contains previews, coverage, review items and provenance. These are read-only preparation tools and do not feed the current forecast automatically.

## QA fixes and verification

Run `npm test` from `server` while MySQL is running. The integration suites restore disposable databases, mock email delivery, and compare original database records before and after their checks. The database user needs permission to create/drop test schemas. Never run tests against a public/shared production database account.

Registration allocates the final system ID at save time; the form preview is not a reservation. Normalized emails and disease names are unique, including archived disease names. On another installation with an older schema, run `node scripts/apply-qa-constraints.js --backup PRIVATE_NEW_SQL_PATH` from `server/` once. The command saves a private SQL backup and adds generated normalization columns and unique indexes. Existing duplicates stop the migration for review; it never merges or deletes them. This local installation has already been migrated.

BHW monthly exports use `date_recorded` and the selected month/year. Explicit historical exports include archived records from that period; the operational patient list excludes them. MHO monthly reports also include historical archived cases and use the registry category, with unmatched names marked Unclassified. The weekly report selector uses a year and ISO Monday–Sunday week; some years have no week 53. MHO must still review the surveillance calendar and official report template before institutional use.

Status updates append timestamped follow-up notes and preserve earlier remarks. Case/disease archive and restore, registry creation, and account status actions write their audit entry in the same transaction. The audit table remains an application log, not an immutable ledger.

Both heatmaps refresh on view entry, after successful case changes, when returning to a visible tab, and every 30 seconds while the map is visible. Refresh map also provides a manual retry. Failed refreshes retain the last loaded totals with a visible failure message. The barangay popup groups active, non-archived High Risk cases by their recorded disease/case category; it shows counts, not patient identities. High Risk is the recorded case severity, not a rating of the disease or an outbreak finding.

The BHW heatmap shows **aggregate active-case totals for all seven barangays**, matching the MHO map. BHW patient lists, resident dossiers, corrections and status changes remain limited to the assigned barangay. The map shows no patient names or records from other barangays. Circle color is the highest recorded severity among active cases, not proof of an outbreak. A zero means no active case was recorded; it does not establish complete reporting.

The BHW encoding form displays birthdate as `MM/DD/YYYY`, validates the actual calendar date, and converts it to ISO `YYYY-MM-DD` for the unchanged API/database. The case-date picker remains browser-native. The form shows the BHW's assigned barangay and asks for a purok/zone *within it*. Purok values already live in `health_cases` and `residents`; report filter choices now come from recorded locations for that BHW's barangay, and the selected purok limits the surveillance case-list PDF. This PDF is a recorded case list for review, not a certified DOH submission.

The encoding disease picker includes active registry names and historical names not explicitly archived. It is not limited to the ten disease categories being considered for forecasting. BHWs should ask Admin to add a genuinely new category; historical names still require registry review. Existing case strings are not renamed automatically. The patient-list **Case details** action shows recorded information for legacy cases with no resident-profile link without guessing identity; linked cases retain their resident dossier action. Recorded severity is an entered case label used by the map and breakdown, not an automatic diagnosis or care instruction.

The ten most frequent case labels in the current 2023–2025 demonstration records can be added to a fresh registry with `cd server` then `node scripts/seed-top10-registry.js`. The seed is repeatable: it skips names already present, keeps archived entries archived, and writes an audit entry for additions. These are recorded case labels, not ten clinically validated diseases; several are symptoms or broad case groups. The Admin should review their classification before using the registry as an official clinical taxonomy. The seed does not rename or alter historical case rows.

Restart the backend after updating code and refresh browser tabs. The QA file rollback is `../.rollback/20260927-qa-fixes/Undo-QA-Fixes.ps1`; use `-CheckOnly` to validate it first. It refuses to overwrite subsequent edits. File rollback keeps the additive database protections; ask for a reviewed schema rollback if needed rather than restoring a whole database over newer records.

## Google registration verification

The Google popup provides a Firebase ID token. Both `/api/check-email` and `/api/register` require `firebase_id_token`, with a verified Google email matching the submitted email. The backend checks Google's RS256 signature, Firebase project, issuer, expiry, issue/authentication times and provider using the existing JWT dependency. Successful registration still creates a pending account requiring approval.

`FIREBASE_PROJECT_ID` defaults to `health-intel-2a0ed`, matching the current frontend Firebase configuration. If changing projects, update both settings. The backend must reach Google's fixed public certificate endpoint over HTTPS. Public keys are cached according to their expiry; certificate failure rejects verification temporarily rather than accepting unverified registration. No service-account private key is required. This implementation does not query Firebase for revoked tokens or disabled Firebase users. Local account approval/suspension and existing session checks still apply.

Verification follows [Firebase's ID-token verification requirements](https://firebase.google.com/docs/auth/admin/verify-id-tokens). Use HTTPS for a shared deployment and configure its domain in Firebase. Tests use disposable signing keys, accounts and mocked email; they do not establish private Google popup or real inbox delivery. The production verifier never imports the test fixture.

## Reviewed case corrections

Patient Records now offers **Correct** for active records to BHWs within their assigned barangay and Admins. MHO and Superadmin cannot edit clinical records. Review the source before changing the case date, disease or recorded severity, then enter a reason. The same transaction saves previous values, new values, reason and actor in the audit trail. Identity, resident links, status and remarks are preserved.

The MHO sidebar has **Walk-in Patients** for patients presenting at the Municipal Health Office. The MHO must select the resident's actual barangay and enter the same required case details as a BHW; the new case starts Active. The server checks valid dates, disease category, severity, duplicates and barangay, links or creates the resident, and records the MHO actor and audit entry in one transaction. Recent entries show only cases encoded by that MHO account. The MHO does not gain correction, status-update, archive or BHW patient-list permissions; the assigned BHW or Admin handles subsequent corrections according to existing rules.

The form refuses future/impossible dates, dates before a known birthdate, new unknown categories, changes to archived categories, potential duplicate cases and simultaneous stale edits. Known birthdates recalculate age at the corrected case date. Missing birthdates preserve the stored age. Historical records without a resident link or complete name/birthdate can receive a severity correction, but date/disease corrections require source/profile review first. Archived cases must be restored before correction. No bulk correction or resident matching is performed.

This batch's file rollback is `../.rollback/20260927-verification-corrections/Undo-Workflow-Fixes.ps1`. Run with `-CheckOnly` first. It preserves database records and refuses to overwrite later edits. Undoing files does not reverse any subsequently saved case corrections; review those individually using their audit entry.
