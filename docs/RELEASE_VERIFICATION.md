# Reusable release verification

CODEX-2, 17 November 2026. Local implementation only. No Azure deployment, service restart, account cleanup, clinical writes or schema migrations are authorized by this checklist.

## Prepare locally

1. Read AGENTS.md, identify the editing account, check ownership and preserve the dirty checkout. Select explicit runtime files; do not deploy the complete dirty tree.
2. Save a JSON array of runtime filenames. Only frontend HTML/JS/CSS, backend services/routes/middleware/config/server.js and package metadata are accepted. Environment files, clinical databases, uploads, backups and research inputs cannot enter the release list. Symlinks escaping the selected source root are rejected.
3. Run from the repository root:

   `node server/scripts/release-verification.js --files release-files.json --out NEW-release-directory --database --tests tests/release-pagination.test.js,tests/patient-loading.test.js,tests/deployment.test.js`

   The output directory must not exist. The workflow hashes exact bytes, validates runtime dependencies/lockfile and JavaScript syntax, runs the named tests, performs read-only schema/publication checks, invokes the existing pinned Python preflight without fitting models, and records preservation hashes for installed model/research assets. Failures use sanitized messages. This is a configuration check on the host where it runs; local success does not establish Azure compatibility.

4. Keep complete test logs separately. A passing focused suite does not replace browser acceptance, scientific validation or all-suite regression checks. Intensive scientific tests stay separate from `/readyz`.

## Compare Azure before approval

1. Obtain a fresh authorized read-only snapshot of exactly the selected Azure runtime paths. Retain a host receipt recording owner/mode, running application/service configuration names, Node/Python versions, HTTPS health, schema version, publication pointer and research/model hashes. Never copy secrets into shared evidence.
2. Supply `--deployed-root SNAPSHOT --previous prior-deployed-hashes.json` to a new verification output. The previous JSON maps runtime filename to its last reviewed deployed SHA-256. The tool copies exact supplied originals into `before/` and verifies their hashes.
3. Reconcile every `reconciliation-required`, missing or unexpected difference. The baseline must be independently established; do not manufacture an expected baseline by copying current Azure hashes without review. Preserve the documented Azure-only account-directory.js and account-status.js fixes. These files are outside this release's runtime list.
4. Missing live comparison leaves `azure-unverified`; the tool never declares Azure deployment approved. Revalidate current Azure files immediately before copying because an old snapshot can become stale.
5. Verify a new encrypted database backup by authenticated decryption and isolated restore. Retain the receipt and protect clinical contents. Do not restore production merely to test recovery. The historical 14 November receipt does not replace a fresh backup.
6. Verify the legitimate accounts and operational counts against the approved eight-record baseline plus legitimate additions. Preserve the completed beta/demo cleanup and all audit history. Do not import local fixtures or local patient data.

## Approved deployment only

- Obtain owner approval for exact reconciled files and any required application restart. This tool never deploys, restarts, copies environment files or changes Azure.
- Copy selected runtime files atomically using the established deployment procedure. Preserve current owners/modes. Recheck installed hashes against the approved manifest and preserve dataset/model hashes and publication pointer.
- Run host configuration and pinned scientific preflight as the actual service identity. Local Windows checks do not prove Linux delegation/capacity compatibility.
- Check `/healthz` (process liveness) and `/readyz` (bounded read-only database/schema-detection and required forecast asset availability). Readiness does not execute Python or train. It does not prove complete forecasting validity or validate all database columns; use the release schema/preflight checks as well.
- Signed-in BHW: own barangay only, resident search/purok/age filters, active and archived case filters, all three dashboard case lists, page navigation, empty/error/retry state, dossier selection and duplicate-patient prevention.
- Signed-in MHO: directory search/barangay/page navigation and the same published prediction version as BHW. Verify Admin/Superadmin permissions remain unchanged. Anonymous and forged-barangay requests must fail.
- Compare case, consultation, resident and audit integrity with the predeployment receipt. No normal verification step creates a patient or confirms a monthly report.

## Rollback

Use each report's `ROLLBACK.md`. Restore exact originals only when current installed hashes still match that release's new hashes; stop for reconciliation if later changes exist. Review removal for genuinely new files. Restore owners/modes, obtain approval for service actions, verify both health endpoints and legitimate signed-in workflows. A code-only rollback must not overwrite clinical data or publication history.

## Known scope limits

- New SQL paging is opt-in on `/api/patients`, `/api/patients/archived` and `/api/residents` using `page`/`page_size`. Legacy unpaged callers retain their array contract. Main BHW lists and case popups opt in. MHO directory already paged in SQL and now accepts validated page sizes up to 100 (default 25).
- Stable tie-breaking uses case creation time plus case ID, or resident last/first name plus ID. Offset paging is consistent for a stable result set; concurrent inserts, deletions or sort-field edits can move records between pages. It is not a frozen database snapshot.
- Complete case/visit histories remain intact for dossiers and PDF generation. Small recent walk-in lists already cap at 25. Administrative account lists are unchanged pending reconciliation of the documented Azure-only account service fixes. Fixed dataset charts and 70 prediction combinations are deliberately unchanged.
- Remaining scaling work: unpaged legacy callers, long dossiers/visit histories, administrative lists, deep offsets and aggregate count/filter scans. Measure representative query plans before proposing any separately reviewed index/schema changes.

