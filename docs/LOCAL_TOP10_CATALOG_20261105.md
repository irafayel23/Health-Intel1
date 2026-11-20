# Local ten-disease catalog cleanup — 5 November 2026

LOCAL-TOP10-20261105 completed locally 2026-11-05T11:46:51.017Z, CODEX-1 / Ponytail. Three extra active catalog entries (Dengue Fever, Red Eye / Sore Eyes, Typhoid) recoverably archived; exactly10 study categories remain active. No patient/case/resident/visit archive or deletion. Transaction independently verified all20 other base tables unchanged; clinical hashes checked again after browser QA. MHO chart options, Admin disease filters and correction alternatives now use active catalog instead of recreating old labels from history. Current historical correction category and Condition not listed → MHO review preserved. Display-only analytics sample uses same10 study names; SARIMA data/model unchanged. 383/383 final regressions pass. Actual signed-in BHW form contains10 study choices plus review option; cancelled without saving. MHO municipal and all7 BHW choice scopes independently verified10. CSV/bundle hashes and local health verified. Azure/dependencies/GitHub unchanged; local server left running. Shared guide: LOCAL_TOP10_CATALOG_20261105.md. External before copies/catalog recovery/verification/logs: top10-local-20261105. Ownership released.

## Scope and result

The user requested removal of diseases outside the ten study categories locally. The clarification reply was “yes do it”; the agent explicitly proceeded with the recommended, reversible choices-only scope. Historical patient records were preserved, rather than interpreting an ambiguous reply as permission to archive cases.

The active catalog is now Cough, URTI, Infection all types, ARI, Fever unknown origin, Hypertension, Influenza, Acute Gastroenteritis, Vertigo and All types of skin disease. Three extra active catalog entries were archived using the existing status/deleted-at convention. A catalog-only recovery copy was saved before the transaction. Explicit maintenance audit entries identify CODEX-1 and this task; no existing account was impersonated.

Historical records retain their original disease labels and remain available in history, reports and overall recorded-case totals. This task does not relabel existing conditions, remove clinically relevant records or silently subtract them from descriptive totals. A historical correction form can retain its own original category, alongside the active catalog, without offering that old label to another case. The unlisted-condition review process and existing authorized Admin add/restore controls remain available. This is a cleanup of the current local configuration, not a new permanent catalog authorization rule.

## Changed files

- admin.html: removed static Dengue option, neutral catalog placeholder, versioned changed Admin script.
- assets/js/admin/admin-records.js: active catalog supplies filter choices; historical labels no longer reappear automatically.
- server/services/dashboard-data.js: MHO trend choices use active catalog; recorded data and totals remain unfiltered.
- server/services/case-corrections.js: active alternatives plus the current historical category.
- server/services/analytics-sample.js: display-only sample labels reuse the existing ten-category constant; no stored samples, forecasting datasets or prediction results were changed.
- server/tests/catalog-choices.test.js: four focused regressions for sample names, Admin choices, historical corrections and MHO options.
- server/tests/municipal-analytics.test.js: active fixture registration and assertion that historical-only names are excluded from new choices.
- server/tests/ui-workflow.test.js: test loader recognizes versioned script URLs. The initial full run had four harness failures because its old regex skipped the changed Admin script; corrected loader and final full run pass all383 tests.
- Shared overview, handoff, task tracker and append-only changelog; this new report.

No CSS/build dependency change was necessary. Syntax and scoped whitespace checks passed after removing an introduced end-of-file blank line. Existing monthly operational workflow, session security, access restrictions and disease-review safeguards were retained.

## Verification and limits

Final full suite:383passed,0failed. Catalog status transaction:10active,3archived,0patient rows changed,20other base-table fingerprints unchanged. Subsequent actual service calls returned exactly10 choices for MHO and each of seven BHW barangay scopes. MHO analytics options returned10. All three installed CSV hashes and the frozen6200 snapshot/manifest/service remain unchanged. Local healthz200; task-owned server restarted with the existing scientific interpreter configuration.

Actual browser verification used the available signed-in BHW-001 session. Opened an empty case/visit form, verified its populated native disease choices, then cancelled; no record was saved. The form contained10study diseases, the empty prompt and the separate Condition not listed review option. No captured browser warnings/errors. MHO/Admin/Superadmin were not freshly signed into during this task; their affected code paths are covered by service/UI/regression tests. Superadmin has no active disease-selection editor to alter. Historical labels are intentionally retained when displaying existing records.

No Azure deployment, case archiving, deletion, synthetic-data edits, model retraining, package installation, schema change, commit or push.

## Recovery

The private external task folder contains catalog-before.json and scoped source before copies. To reverse the catalog cleanup, restore only the three recorded catalog IDs' previous status/deleted-at values after comparing current state; preserve every other row and record a new maintenance audit event. Existing Admin Restore also provides the normal recoverable catalog action. Do not restore the entire database or erase the audit history. For code rollback, compare and restore only task-touched files from before copies, preserving subsequent work. Refresh affected portal pages after changes.

The monthly operational update process is implemented locally as documented in [the monthly guide](MONTHLY_PREDICTIONS_20261105.md); earlier overview notes calling it only planned are historical. Operational publication still requires genuine completed reporting history and explicit MHO review.
