# Prospective monthly validation QA

7 November 2026 · CODEX-1 / Sol engineering

**Decision — Ready for later supervised operational testing with reviewed exports.**

The separate workflow reuses the existing prospective.py issue/assess functions and verify-operational.cjs adapter. Conditional-pooled COM-Poisson remains the frozen candidate. Original CMP and the two existing Poisson baselines accompany it for comparison.

## Engineering additions

- workflow.py provides check, issue and score commands. It adds an MHO history/outcome review record with seven-barangay completeness confirmations and file hashes.
- Input and actual files are read into fixed private temporary snapshots so a concurrently edited file cannot change the reviewed bytes while verification/scoring is running.
- Structural validation rejects invalid histories, duplicate scopes and duplicate/future earlier-prediction pairs before fitting.
- Issuance records all 70 attempted combinations and exports 280 method/selection rows with status, SARIMA count, exact/nearby probability and intervals.
- A SHA-256 receipt over workflow-complete.json binds the original prediction digest, probability CSV, MHO history review, wrapper version and source locks. Keep the printed wrapper receipt independently and use it for scoring.
- A run that finishes after the target month ends receives no completion marker. Its retained files require investigation. Existing destinations and completed assessments refuse overwrite.
- Scoring retains the existing per-target assessment and adds aggregate Brier, log loss, RPS, event calibration, fixed calibration bands and interval coverage/mass/width. Each metric has its own denominator.
- Own-availability, all-four-common and original-versus-pooled-common comparisons remain explicit. The last comparison includes only original and pooled CMP.

## Checks executed

| Suite | Result | Scope |
|---|---|---|
| Wrapper suite in receipt-final-tests.log | 9 passed | All70 packets/280 exports, scores, calibration summaries, real check CLI using temporary structural fixtures, review/hash checks, duplicates, missing/invalid counts, zeros, unavailable fits and timing |
| Additional failure-test.log | 1 passed | Distribution failure remains unavailable; month-boundary completion leaves an incomplete packet |
| Existing prospective engine tests | 5 passed | Issue/score timing, original receipts, exclusive writes, missing/duplicate outcomes, zeros, infinite log loss and independent RPS identity |
| Existing Node operational adapter tests | 3 passed | Source binding, all70 scope mapping, registered numerical diagnostics and rejection of demonstration mode |
| Preservation check | 3485 files matched | Existing application, research, datasets and both previews |

Ten wrapper tests passed in total, with the last added failure test run separately. The earlier qa-tests.log contains a test-only unclosed-file warning that was fixed before receipt-final-tests.log. The final checks passed.

The new tests use explicitly named SYNTHETIC_QA_ONLY temporary directories, fixed dates and mocked dispersion fits for deterministic control-flow tests. Probability distributions and scoring run through the real existing functions. Independent Poisson formulas verify exact/nearby probabilities, Brier and log loss. An absolute-distance identity verifies RPS. Calibration totals, interval coverage/width and target intersections are asserted. The actual check CLI calls the preserved Node adapter against temporary synthetic aggregate exports. No patient data was accessed.

These tests exercise the operator path and scoring. The original dispersion optimizer's statistical/numerical validation remains in Astra's prior research evidence. A new unmocked optimizer end-to-end run on operational records was outside this QA run. No genuine future outcome or issued operational packet was created.

## How MHO operates it

1. Obtain and review complete operational monthly SARIMA input/output exports.
2. Run workflow.py check and use its hashes in history-review.json.
3. Run workflow.py issue during the permitted target month and retain the printed wrapper receipt independently. Confirm workflow-complete.json exists.
4. After that month ends, confirm all70 actual monthly totals, including genuine zero totals. Prepare outcome-review.json with the original wrapper receipt and actuals file hash.
5. Run workflow.py score and confirm scoring-complete.json exists. Review calibration-bins.csv and operator-assessment.json alongside the original assessment.

Exact copyable PowerShell commands and review schemas are in [operating guide](CMP_PROSPECTIVE_OPERATING_GUIDE_20261107.md). The CLI uses the actual PC clock. The fixture test dates remain confined to test code.

## Remaining operational limits

MHO attestation is required to establish genuine reporting completeness and source authenticity. Local tools cannot verify the author's identity, prevent a separate registration in another directory, prove the PC clock or provide an independent trusted timestamp. Retain the first receipt and signed review with MHO/adviser. A completed immediately preceding month generally becomes available during the target month, so the packet records issuance during that month and elapsed days. Fully ahead-of-month validation requires a separately agreed compatible cutoff/horizon.

Actual operational exports, adequate prior prediction pairs and later completed monthly totals are the remaining inputs for supervised testing. Statistical reliability requires new outcomes over time. These software checks provide no new forecasting-accuracy evidence.

## Files and recovery

New external files include workflow.py, test_workflow.py, fixture_exports.cjs, record_environment.py, verify_preservation.py, tool-locks.json, protected-before.json, OPERATING_GUIDE.md, QA_REPORT.md, preservation.json and test logs. Shared project changes are this report and the CODEX task/handoff/changelog records. No application rollback is needed to stop using this separate helper. Retain any issued packet and the registered tool/environment versions until scoring completes.

Astra handoff — the frozen policy, source files, datasets and preview fingerprints matched after QA. This engineering wrapper makes no statistical choice or policy modification. Any subsequent statistical changes belong in a newly versioned experiment and need fresh validation.
