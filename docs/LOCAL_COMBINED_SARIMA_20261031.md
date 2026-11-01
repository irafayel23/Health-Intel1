# FORECAST-015 — Completed local integration

31 October 2026, CODEX-1. This report supersedes the earlier staged-only status in REPORT.md and CHECKPOINT.md. Research workers and staging watcher have exited successfully. Local application session50325 was started after stopping only this task's earlier isolated server session96552. Do not stop unrelated processes.

## Installed result

Local MHO Predictions now uses the existing numerical nine-template seasonal SARIMA policy A fitted to the combined dataset: 5,592 cases in 3,150 monthly cells, January2023–September2026. All70 October2026 outputs use accepted SARIMA, no current or historical Seasonal Naive fallback was required. The fallback remains available only for rejected fits. Keep weak annual-evidence warnings: only6/70 current series pass the annual screen; a seasonal parameter does not prove meaningful clinical seasonality.

| Historical protocol | Produced | Passes | Within proposed limit | MAE | RMSE | Positive-only MAPE |
|---|---:|---:|---:|---:|---:|---:|
| Primary80/20, one-month ahead | 630/630 | 352 | 55.8730% | 1.147493 | 1.503777 | 52.238909% |
| Secondary70/30, one-month ahead | 980/980 | 538 | 54.8980% | 1.169578 | 1.512037 | 53.832390% |

Each selected disease/barangay displays its OWN metrics from nine primary test months. Pooled352/630 is not copied into each selection and is not the chance that disease occurs. Unrounded errors use max(1case,20%actual); MAPE excludes zero actuals (primary511 positive targets,119 zeros). No invented intervals for fallback, fake probabilities, altered counts or zeros.

This is a dataset change, not an improved model. Original5500-case results were350/630=55.56%, MAE1.142124/RMSE1.500087. Combined hit rate rises by0.31746 percentage points, while MAE and RMSE rise slightly. These previously inspected historical months are exploratory; no independent performance improvement or70%minimum is established.

## Data preparation and provenance

The original combined CSV has6392records/5592cases. Calendar aggregation sums all valid contributions into3150monthly cells; zero rows remain. No invalid rows, excluded cases, missing months or deduplication. Identical monthly rows can belong to distinct generated groups and must not simply be dropped. Four columns cannot establish that two ITR clinical entries describe distinct events; independent ITR extraction/duplicate-event confirmation remains pending.

The file contains5500generated cases plus92ITR-derived case entries. It is not50%verified real data. The generated groups remain generated regardless of filenames. Neither the original combined CSV nor original model/dataset was edited. Preparation outputs and exact source/clean SHA256 values are in audit.json.

## Files changed locally

- Added server/data/combined-sarima-5592/{snapshot.json,SYNTHETIC_monthly.csv,manifest.json}.
- Added server/services/combined-sarima-demo.js: versioned copy of existing service with new fixed source hash, case total, version, data directory and recalculated integrity benchmark; original SARIMA fitting/selection unchanged.
- Changed server/routes/balanced-sarima-routes.js: default service import only; route paths, role checks and response shape preserved.
- Added server/tests/combined-sarima.test.js: new dataset and all70 frontend selection regressions.
- Updated one route-default case-total assertion in server/tests/lowcount-sarima.test.js; original5500-case service tests and golden results retained.
- Updated shared tasks/handoff/changelog/overview. No frontend design or sidebar changes.

## Actual verification

- All70 native results and saved chronological prefixes checked; retained original root/convergence/Ljung–Box/covariance and interval guards.
- Python arithmetic independently compared with application JavaScript resolver/metrics; all matches pass. Per-selection results: ALL_70.csv; every target: PREDICTIONS.csv; current estimates: CURRENT.csv.
- 63 automated tests passed: combined/old lowcount SARIMA, forecast presentation/capacity, portal structure and UI workflow. Includes actual frontend JS in a mocked DOM across all70 choices at320/1000 width parameters, graph estimates/interval output, correct selected metrics, warnings, summaries/recommendation rules, fallback/unavailable behavior, stale-response/error handling and MHO-only routes. This is not a rendered-browser viewport test.
- Local /healthz HTTP200, /mho.html HTTP200, unauthenticated forecast options HTTP401. Server ready at http://localhost:3000/.
- New service/module syntax and scoped diff checks pass; original forecasting inputs, sourcecombined CSV, all prior evidence and unrelated checkout hashes preserved.
- No new authenticated browser/session or live patient-save verification. Browser-tab tools were not available in this turn; respected user's tab-only preference and did not control the whole PC. Fresh visual desktop/mobile checks remain a limitation.
- No full database-writing npm test suite run, no npm installation, no database/schema/operational record changes or Azure writes.

## Resource and recovery evidence

One worker, original512MiB RSS/commit,10second calls,60second startup and1024MiB RAM admission. Candidate fits reused only on identical prefix digests. Windows sharing violation stopped the first process after18histories; no incomplete call journal was discarded. IO-only bounded retry and shared-delete watcher reads were added, with three recovery tests passed. Original IO code and prior freeze records preserved. Model/data/selection/metrics/thresholds were not changed. Embedded Node verifier's extra parenthesis was fixed as a documented packaging-only erratum. Initial version/freeze is preserved.

Completed fitting used3,252new calls and4,945reused candidates in the resumed process; earlier completed journals preserve1,727new calls and1,160reuses from the first process. Do not treat per-process counters as whole-run totals or reused resource records as newly measured.

## Rollback

Change only the route's service require from ../services/combined-sarima-demo back to ../services/lowcount-sarima-demo, and restore the route-default assertion to5500 if testing that rollback. Original5500 service and bundle remain intact. Restart only the owned local app process and verify health. Exact preactivation route/test copies are in activation-backups. Do not restore an old whole working tree or discard unrelated changes. Azure rollback is unnecessary because Azure was untouched.

Original53k/214k demonstration evidence and86.17% benchmark have no role in these new results. Genuine disease-data validation and acceptance of the proposed error limit remain pending.
