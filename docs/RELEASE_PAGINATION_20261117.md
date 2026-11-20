# Priority 5 and 6 local release report

CODEX-2, 17 November 2026 (Asia/Manila). Branch main, HEAD e5946d4. Existing dirty changes preserved; no staging, commit or push.

## Implemented

- Added server/scripts/release-verification.js and docs/RELEASE_VERIFICATION.md: explicit allowlisted runtime file selection, exact SHA-256 manifest, installed dependency/lockfile/Node checks, JS syntax, selected regression runner, read-only schema and publication verification, pinned Python preflight, protected dataset/model hashes and rollback instructions. The verifier records its own hash and Node version.
- A fresh supplied Azure snapshot plus independently reviewed previous hashes enables comparison and exact before-file copies. Unexpected Azure changes are reconciliation-required. No snapshots were fetched in this session; every deployment-file comparison is azure-unverified. The tool never deploys and never automatically grants Azure readiness.
- Added /readyz separately from unchanged /healthz. It bounds/coalesces read-only database probes, checks schema detection and zero-row interfaces for users, barangays, residents, cases and consultations, checks required forecast assets and returns 503 for failures. It exposes only boolean dependency results. It never starts Python or fits a model. Full scientific compatibility remains a separate release check.
- BHW Resident Profiles now uses SQL page/count queries with name, purok and age filters. Case Records, Archived Records and all three dashboard case popups use the same scoped SQL case paging service. Existing MHO directory already paged in SQL; it now shares pagination validation and accepts page_size up to 100, default 25. BHW residents default 12 and case lists 10.
- Parameter validation rejects malformed/unsafe page and size values; maximum page size is 100. Counts use the same authorized filters as rows, names use escaped parameterized LIKE, resident ties use ID, and case ties use creation time plus ID. Empty results and beyond-last-page requests return safe metadata. Loading, retry, stale-response suppression and search reset are retained. Dashboard patient details return to the prior list/page.
- Legacy callers that omit page/page_size retain the unpaged array contract. No new API roles, clinical writes, live migrations, model changes, dummy operational data, account changes or production cleanup were performed. The only added indexes are inside the disposable historical publication test fixture, reducing repeated test scans; no local application or Azure schema changed.

## Changed files

Runtime files are listed with exact hashes below. Support files: server/scripts/release-verification.js; server/tests/release-pagination.test.js; server/tests/pagination-integration.test.js; updated server/tests/patient-loading.test.js, server/tests/portal-structure.test.js and server/tests/monthly-predictions.test.js; docs/RELEASE_VERIFICATION.md, this report and shared tracker/handoff/changelog/overview.

## Verification

| Check | Result |
|---|---|
| Focused regression set | 43 passed, 0 failed: pagination, real disposable SQL, all four canonical roles, anonymous/forged scope denial, duplicate prevention, consultation/case separation, dataset source separation, all 70 saved SARIMA/CMP attachments, deployment and loading behavior |
| Historical operational publication suite | 7 passed with HEALTH_INTEL_QA_CMP_PYTHON set to the pinned interpreter; tests confirmation, publication gating, MHO/BHW shared pointer, alternate-version rollback, stale input and probability failure/success behavior in a disposable database |
| Full portal-structure suite | 28 passed, 2 failed: older MHO startup expectation still requires mho/trend; Admin decline expectation says Decline while current UI says Decline and notify. These assertions concern unmodified MHO/Admin runtime files and were left unchanged. |
| Synthetic headless Chrome | Passed actual initial resident page, Next, search resetting to page 1 and request-error state. A Next reset bug discovered here was fixed. No patient records were used. |
| Live local HTTP after approved restart | /healthz 200; /readyz 200; anonymous /api/residents?page=1, /api/patients?page=1 and /api/mho/patients?page=1 all 401 |
| Release verifier | Node/dependencies/lockfile, all nine runtime syntax checks, selected regressions, read-only schema and publication checks passed; pinned worker preflight passed in the final run |
| Published local pointer | None; no operational version was published as part of verification |
| Protected installed model/research files | 34 exact hashes recorded and unchanged across the verification snapshots; frozen dataset/source and all-70 evidence tests passed |

Earlier attempts were not all green: the original historical fixture helper was incompatible with current normalized source views and was replaced in the new pagination test by an independent minimal disposable database; initial frontend tests were updated for server queries. The first publication run lacked its pinned test Python variable; the configured rerun passed. Initial worker preflight temporarily failed because less than 1024 MiB memory was available; final preflight passed without lowering resource safeguards. Readiness was corrected to use users.system_id and then verified against the actual read-only local schema.

The entire repository test suite was not run. Signed-in end-to-end browser testing against genuine local or Azure accounts was not performed. Browser fixtures and canonical middleware/SQL tests do not substitute for that final acceptance check.

## Deliberately unchanged and remaining bottlenecks

Full resident/case consultation histories remain complete for dossiers and PDF generation; converting those shared payloads to partial pages would break their consumers without a separate paged history contract. Recent MHO walk-in lists already cap at 25. Administrative account lists are unchanged because the latest Azure release report identifies Azure-only account-directory.js/account-status.js fixes; reconcile those before touching deployment-sensitive account services. These unpaged histories/admin/legacy lists, deep offsets and aggregate count/filter scans remain potential scaling bottlenecks. No production query-plan or load benchmark was run. Fixed dataset charts and the 70 forecast combinations remain unchanged.

Offset ordering is deterministic for a stable result set; concurrent inserts/deletes or name/creation-time edits can shift page membership. The API does not claim snapshot isolation across separate page requests. No schema/index migration is proposed here.

## Exact candidate deployment files

Copy these as one reconciled frontend/backend release after approval; do not copy the whole dirty checkout. All hashes are SHA-256.

| File | SHA-256 |
|---|---|
| assets/js/bhw/bhw-records.js | 788cbdcebf4f6c00b3d172d6b36086653e645661050ed1ee4456179098ec46a6 |
| assets/js/bhw/bhw-residents.js | c83b139790a50ba32b06f1c21251a26cf3361bc881b744040c7d4093ccb26449 |
| server/routes/case-routes.js | 37301b1d1c0e02d910c9f76e006eb1f87ba04714f8c05f4dff12641322c68d59 |
| server/server.js | 2b4741cd4547cafafc06d0fb6245ac2cde93e32df6e02c57de79be4c94f74f8f |
| server/services/case-directory.js | ab04841ebbc98572d68e3269062dc3a71bf69a59bbf66b2f20601d7eca421a12 |
| server/services/list-pagination.js | e65d090b56a0976632bd090fd6f7964f55bfe5c76a2965bb054c16b6a1b1135c |
| server/services/mho-patients.js | 56c9f7c954e00ea19c581c393d4f211cf08b0ce3ace04bfa8cac2d2721eefb4e |
| server/services/readiness.js | bb61826b7c4ecdb125eb8503146bfacb85f1a06670063cbc8648ebf54c6e504c |
| server/services/resident-directory.js | e100a2cc1e814f15c9f9fa81529fd5592a438d3a1161b0501ea54d15ded298e4 |

The machine-readable manifest is in the external release-20261117/release-final-review directory. Exact original local files are retained in release-20261117/before. They are not a substitute for current Azure originals. Never copy .env, local patient data, test databases, screenshots of patient data or backups into the web tree.

## Deployment and rollback

Azure was not modified, restarted, trained, cleaned or deployed. The last inspected release report is AZURE_FOUR_FEATURE_DEPLOYMENT_20261114.md, reporting eight retained operational records, null publication, 6,200 research cases, Azure-only account fixes and a verified backup/restore receipt at that time. Those are historical reported facts, not a fresh verification of production.

Azure readiness remains false until a fresh authorized host snapshot/configuration/schema/pointer comparison, reconciliation of Azure-only changes, new encrypted backup with restore receipt, current dataset/model hashes, genuine signed-in MHO/BHW checks and owner approval. Preserve the eight-record baseline plus any legitimate additions; never import local records. Host Node/Python packages, Linux delegated resource configuration and service identity must be checked on Azure itself.

Before a later approved copy, use the reusable verifier's --deployed-root and --previous inputs to retain exact reviewed originals and host owner/mode metadata. Revalidate original hashes immediately before installation. For rollback, verify installed hashes still equal this candidate before restoring originals; stop for reconciliation if later changes exist. Review deletion of genuinely new files, restore permissions, restart only with approval, and check both health endpoints, signed-in roles and the unchanged publication pointer. A code rollback must not restore an older clinical database. See docs/RELEASE_VERIFICATION.md and the generated ROLLBACK.md for the complete checklist.

The owner explicitly approved restarting localhost only during this task. The application was restarted hidden on 127.0.0.1:3000, PID 13476, retaining frontend and experimental CMP settings. No public tunnel was created. Python memory admission can still fail under host pressure; a successful preflight is a point-in-time check, not a guarantee that every future fit will finish.
