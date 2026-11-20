# Local monthly operational predictions — 5 November 2026

Owner: CODEX-1 / Ponytail. Task MONTHLY-PREDICTIONS-20261105. Implemented locally; Azure and COM-Poisson were not changed. Existing main/e5946d4 and earlier uncommitted work were preserved. No Git commit or push.

## What now works

MHO Predictions has two accessible tabs, matching the existing Review Center pattern:

- **Predictions:** the existing disease/barangay selection, Predict button, graph, selected historical score, MAE/RMSE/MAPE, summary and recommendations.
- **Monthly Updates:** review completed reports, confirm completeness, prepare an isolated SARIMA update, review results, publish, select an earlier published version and assess later actual outcomes.

The current 6,200-case demonstration remains intact and initially selected because there is no published operational version. Its original 70 October predictions and primary 563/626 within-tolerance result, with four unavailable historical targets out of 630 attempts, remain unchanged. It is not a new operational result.

## Easy monthly process

1. Staff enter new disease cases and consultations normally. A follow-up adds a consultation to the existing case; it does not add another disease case to the prediction history.
2. After the reporting month ends, MHO opens **Predictions → Monthly Updates → Review seven barangays**. Resolve pending disease classifications in Review Center first.
3. Check each barangay's completed report against its actual records. Select **Confirm complete** only when reporting is genuinely complete. An empty confirmed report can supply zero; a missing report cannot. Confirmations are explicit and recorded in the audit history.
4. For the first operational run, review the whole operational history. The unchanged historical evaluation requires at least 45 consecutive completed months for all seven barangays. Do not certify incomplete historical months or fill gaps with demonstration counts. Choose the real first month and last completed month.
5. Select **Prepare SARIMA update**. One bounded background worker uses frozen monthly case totals and the unchanged nine-template policy. The website can remain open for other work; the local server and PC must remain running. Low free memory can delay fitting. A failed run preserves the previously published version.
6. Select **Review version** after completion. Review all 70 selections, missing outputs, numerical/seasonal limitations, each selection's own historical metrics, and the separate primary and robustness results. A numerically accepted seasonal fit does not prove significant annual seasonality.
7. Explicitly approve **Publish**. The Predictions tab switches to the published operational version. For example, completed observations through October produce November predictions. Clicking Predict displays saved verified results; it does not fit a model on every click.
8. After November ends and its reporting is confirmed, **Assess actual outcomes** compares the previously published November predictions with November counts. Predictions are never inserted as actual observations.

Publication during the target month is explicitly labeled as such and is not full-month independent validation. A version first published after the target month ended cannot be reported as a forward-issued prediction. Already inspected historical months remain exploratory evidence.

## Data and statistical boundaries

Operational totals come only from eligible case records using original case dates and canonical catalog names, including all recorded outcomes. Archived/deleted cases are excluded. Consultation rows are not counted again. Conditions outside the exact ten study categories are disclosed and excluded; unresolved classifications block completeness confirmation. All seven barangays are checked.

Confirmation digests include case identity, date, location grouping, classification and archive/deletion state. Changes make confirmations stale. New publication requires unchanged confirmed inputs. A previously published snapshot remains immutable and dated, with a warning when current records differ. Corrections can therefore block rollback to an earlier version whose inputs no longer match; prepare a corrected version instead.

The operational source is separate from the demonstration CSV and saved bundle. “Operational” means database source, not proof that a test record is genuine. Existing dummy/test records must not be represented as independently validated disease surveillance data. No patient names or records were exported into this report or the screenshots.

The fitting code, likelihood, nine candidate templates, training-only order selection, three inner targets, numerical/root/residual thresholds, seasonal period 12, tolerance and MAE/RMSE/positive-only MAPE formulas are unchanged. The original AICc branch when complete inner validation is unavailable is retained and disclosed. Failed predictions remain unavailable, with null counts and preserved attempted targets; they never become zeros. The 45-month initial evaluation is 36/9 primary and 31/14 secondary. Later runs use floor(0.8 × N) and floor(0.7 × N) initial prefixes as the history grows. The current controller accepts 45–120 consecutive months.

## Implementation

Modified:

- `mho.html`, `assets/js/mho/mho-forecast.js`, generated `assets/css/mho/mho-utilities.css`: separate source display and two-tab workspace; existing hooks retained.
- `server/server.js`, `server/middleware/access-control.js`: register new MHO-only routes. Existing authentication/session behavior is preserved.
- `.gitignore`: exclude private operational histories, diagnostics, caches and worker journals from accidental commits.
- Shared overview, handoff, tasks and append-only changelog; this new report.

Added:

- `assets/js/mho/operational-monthly.js`.
- `server/routes/monthly-prediction-routes.js`.
- `server/services/monthly-data.js`, `server/services/monthly-predictions.js`.
- `server/scripts/migrate-monthly-predictions.js`.
- `server/forecasting/policy-a/`: nine byte-identical original policy/controller files, plus a new orchestration runner and source manifest.
- `server/tests/monthly-predictions.test.js`, `server/tests/monthly-ui.test.js`.

Three additive local tracking tables hold report confirmations, run metadata and the publication pointer: `prediction_month_reports`, `prediction_runs`, `prediction_publications`. The explicit migration ran twice and verified all pre-existing rows unchanged. No patient/case/consultation records, accounts or existing table definitions were changed by this feature. No operational confirmations or runs were created during verification; only the empty publication singleton exists.

Versioned inputs, outputs, logs and reusable training-prefix caches are private under `server/data/operational-predictions/`. Selection caching uses only the exact training prefix, policy and template. Source/output hashes are checked before accepting/publishing results. One database preparation lock and an OS-held scientific-worker lease prevent duplicate fitting. A stopped worker is detected; a surviving worker is not duplicated after a web-server restart. PID reuse may conservatively delay recovery rather than terminate an unrelated process.

## Actual verification

- **379/379 full regression tests passed**, including disposable-database workflow, role restrictions, completeness, case-versus-visit counting, all 70 scope mappings, actual-outcome scoring, changed-record invalidation, explicit publication, rollback, stopped-worker recovery, old-target rejection and tamper detection.
- **18/18 final focused display and UI tests passed** after the requested two-tab change and unavailable-state cleanup. Includes source startup/races, no silent demonstration substitution, approval/Cancel, keyboard tabs and the existing 70-selection display checks.
- MHO stylesheet build and JavaScript syntax checks passed.
- One actual resource-bounded fit reproduced the original Cough/Salvacion template result exactly: 3.7852661781077956. This verifies worker parity, not new predictive validity.
- Actual controller QA completed 70 constant-zero fixture histories with 135 candidate calls; every current result remained unavailable and all 630 primary attempts were retained. No acceptable counts were fabricated. These are isolated QA fixtures, not operational histories or a newly measured operational benchmark.
- Disposable integration fixtures deliberately reused frozen native outputs to exercise adapters/publication; these are explicitly not new model fits or validation evidence.
- Real signed-in Brave MHO verification: tabs, read-only seven-barangay reports, current demonstration Predict, graph/summary/recommendations and unpublished operational state. Cough/Salvacion remained about 4 cases, 7/9 = 77.78%, MAE 0.62, RMSE 0.85, positive-only MAPE 17.83%.
- Keyboard arrow navigation passed. Actual CSS viewports 1366 × 768 and 390 × 844 had no horizontal overflow. Narrow dark-mode text/background were checked. Temporary viewport override was reset and light mode restored. Physical-phone QA and a full screen-reader audit were not performed.
- No captured browser warnings/errors in the final check. Public `/healthz` returned 200; private scientific/data URLs returned 404. The authenticated operational no-publication response correctly remains unavailable.
- All three installed CSV hashes, frozen 6,200 bundle hashes, existing saved service, original copied policy files and existing MHO IDs were checked. No duplicate MHO IDs. Server integration changes are limited to registration and the two new central access rules. Dependency manifests and Azure/deployment files were not edited.

Evidence, source checkpoint, logs, hashes and screenshots are in the external `monthly-predictions-20261105` task folder beside the earlier research evidence. The small per-fit parity JSON and complete controller QA are retained there. No secrets or patient records are included in this report.

## Limits and operating requirements

This implements a controlled update process; it does not establish improved accuracy or guarantee 70 accepted operational predictions. MHO has not certified the existing database's historical reporting. Until sufficient complete operational history exists, use the clearly separate demonstration. Genuine validation needs later complete outcomes issued under a frozen policy.

The bounded scientific controller is currently verified for **local Windows only**. Linux/Azure fitting fails closed and requires separately tested equivalent resource control before any deployment. Nothing from this task was deployed.

Set `OPERATIONAL_SARIMA_PYTHON` to the verified existing research Python environment before starting the local server. The task-owned localhost process has this variable set; an unrelated manual restart must retain/reconfigure it. The existing `experiment-resource-v2-20261023/.venv` environment was verified. Required recorded versions are numpy 2.3.5, pandas 2.3.3, scipy 1.18.1, statsmodels 0.15.0, pmdarima 2.1.1 and psutil 7.2.2; the runner fails closed on mismatch. No packages were installed or upgraded. Default interpreter file existence alone does not verify its packages.

The original 1,024 MiB host admission safeguard, 512 MiB scientific-worker limits and per-fit timeout are retained. A worker can wait when memory is insufficient. Web UI polling is not required for the worker to continue, but the PC and scientific process must stay running.

Native annual-evidence year labels are relative to the copied original policy's calendar convention. Actual operational dates in the UI come from the frozen input; native year labels are not presented as real operational calendar years.

An encrypted database backup alone does not preserve private prediction artifacts. Include the private version directory in a separately approved secure backup procedure before relying on operational version recovery outside this PC. Existing private files are preserved for local version rollback.

## Rollback

For normal use, review an earlier published operational version and explicitly select it; the pointer changes, the files do not. Data freshness safeguards still apply. The unchanged demonstration remains separately selectable.

For code rollback, first ensure no scientific worker is active and preserve private operational artifacts. Compare current hashes against this task's checkpoint. Restore only task-modified `.gitignore`, `mho.html`, MHO display script/CSS, server registration and central access rules from `before/`; do not restore shared documents wholesale over subsequent work. The new modules can remain unused. Leave the three tracking tables and private histories intact; do not delete or restore patient data. Restart the owned local server. No Azure rollback is needed because this task did not change Azure.

## Decision

Local implementation and engineering checks pass. The monthly workflow is available for controlled MHO use; an operational publication is intentionally not ready until sufficient complete reports are genuinely reviewed. COM-Poisson remains deferred, and predictive validity on new outcomes remains unverified.
