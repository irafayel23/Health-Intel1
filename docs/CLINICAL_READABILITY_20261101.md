# BHW/MHO light-mode readability and referral wording — 2026-11-01T14:13:51+08:00

CODEX-1; CLINICAL-READABILITY-20261101. Completed locally only.

Both portals opt into existing scoped light-mode utility rules. New clinical plugin strengthens inherited muted/form colors, form labels, hints, consultation history, select arrows/group labels and placeholders. Small clinical helper text is at least 14px with 1.6 line height. Explicit headings, focus/validation/disabled states and dark-mode selectors remain intact. This applies to static views and dynamically created form/history content. BHW inherits plugins from the MHO Tailwind base config; only these two compiled styles were rebuilt. Existing Admin/Superadmin runtime files unchanged.

Referral wording is clearer in MHO walk-in forms and shared BHW/return-visit forms: Referring health worker / facility (optional); Enter why the patient was referred. If verbal, indicate “Verbal referral.” History labels and related frontend error guidance match. Field IDs, payloads, optional source/required reason validation and save behavior unchanged. No document upload, referral dispatch, transfer acceptance or return-slip tracking added.

Files: bhw.html; mho.html; assets/js/shared/patient-visits.js; assets/js/mho/mho-walkins.js; assets/js/mho/mho-patients.js; tools/styles/tailwind.config.cjs; tools/styles/role-readability.cjs (comment only); new tools/styles/clinical-readability.cjs; assets/css/bhw/bhw-utilities.css; assets/css/mho/mho-utilities.css; server/tests/role-contrast.test.js; shared docs.

Checks: 42 focused portal-navigation/portal-structure/ui-workflow/role-contrast tests passed; all three edited frontend JS syntax checks passed; git diff --check clean. Both roles compiled with existing Tailwind, no dependencies installed. Existing numerical palette contrast tests passed; five protected forecasting hashes unchanged. Browser visual QA remains pending due to disabled browser control; no screenshot or all-view manual-verification claim. No operational save submitted.

No backend, API, auth, database, records, forecast calculation/data/research, Azure or GitHub change. Recovery before-files: external clinical-readability-20261101/before. Undo only this scoped diff after checking for newer edits; do not reset the repository.

Local preview was stopped during final HTTP checks. Restarted the existing Node server with SERVE_FRONTEND=true (process only), session54508. Both role pages and styles returned HTTP200 afterward. No .env or deployment configuration changes.
