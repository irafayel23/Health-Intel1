# Health-Intel integration and prediction QA — 9 November 2026

CODEX-1. Verification and documentation only; main/e5946d4 with pre-existing uncommitted work preserved. No application, preview, model, dataset, MySQL or Azure changes; no fitting, operational packet issuance, deployment or new statistical experiment.

## Decision

**PASS for the existing separate experimental preview and supervised validation-tool preparation. FAIL against a claim that COM-Poisson is already integrated or established as reliable for actual disease incidence.** The integration failure is an intentionally unfinished feature, not a broken SARIMA calculation. Controlled local integration testing can be planned after approval; production readiness is not established by this audit.

| Check | Result | Evidence and limit |
|---|---|---|
| Frozen conditional-pooled policy and source integrity | PASS | POLICY.md/research.py match freeze.json; registered prospective-tool and prior review hashes match. |
| SARIMA counts, CMP probabilities, intervals and labels | PASS | All 70 saved rows match frozen October CSV and current installed SARIMA history/means. Existing browser text/interval records match. All 24 preview files in the prior QA preservation record remain identical. |
| Main application contains CMP probability feature | FAIL — not integrated | MHO/BHW shared renderer calls SARIMA services. The conditional CMP HTML/data/renderer are outside the application in a separate loopback preview. |
| Missing predictions and numerical/display failures | PASS | Six focused preview regressions and nine prospective regressions passed. Missing results remain unavailable, with correct metric denominators and chart gaps. |
| Zero counts versus missing reports | PASS — engineering | Explicit reviewed integer zero accepted; missing/blank/duplicate/wrong-month/invalid actuals rejected. All seven reporting confirmations required. |
| Future prediction saving/scoring tools | PASS — conditional readiness | Review, timestamps, source/model hashes, independent receipt, overwrite rejection and scoring guards verified. Requires genuine reviewed operational exports and adequate earlier SARIMA error pairs. |
| Sudden-increase probability reliability | FAIL — unresolved weakness | Previously inspected 24 synthetic rise targets show serious range overconfidence; see below. No new outcomes supplied or invented. |
| Real-world calibration, including zero months | NOT ESTABLISHED | Demonstration dataset has no zero months; new MHO-confirmed outcomes are required. |

## What is installed versus separate

The working MHO and BHW pages share `assets/js/mho/mho-forecast.js` and `sarima-presentation.js`. The saved source is `server/services/seasonal6200-sarima-demo.js` through `balanced-sarima-routes.js`. MHO can additionally select a published operational SARIMA version through the monthly service. Neither branch returns the frozen conditional-pooled CMP percentages. BHW scope is set by its server-side barangay assignment. This audit called the pure saved service/presentation only; it made no HTTP or database requests.

The experimental preview is `cmp-pooled-preview-20261107`, historically served on 127.0.0.1:8771. It reads a static bundle, not operational patients. This audit did not start its server or assert that that URL is currently running. The earlier original CMP preview is separate and preserved. Main-page SARIMA uncertainty intervals and preview conditional CMP intervals are different objects and must not be substituted for each other.

For **Cough / Salvacion, October 2026**, the unchanged SARIMA mean is approximately 3.7853, displayed as **4 cases**. The conditional-pooled CMP preview shows **32.27% for exactly 4**, **79.89% for 3–5**, central **80% interval 2–5**, and **95% interval 2–6**. The historical SARIMA tolerance percentage is displayed separately. These are not the original CMP 38.29%/87.79% probabilities or its 3–5 central 80% interval.

## Verification performed now

- Rechecked 6,200 demonstration cases in 3,150 monthly rows, 70 unique selections, 45 months and **zero zero-count months**. Dataset SHA-256: `49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7`.
- Reconciled all 70 frozen October rows with the saved preview, current SARIMA snapshot and previously captured browser values/intervals. This was an artifact-integrity check, not another 70-selection browser exercise.
- Called the current pure SARIMA service and presentation for all seven Cough barangays: means, historical MAE/RMSE/MAPE/tolerance results and target dates match the preview. Validated their CMP distributions and intervals with the unchanged preview consistency checks.
- Checked Influenza/Caliban: January, May, July and August 2026 remain unavailable; primary metrics retain 5 available out of 9. Also tested unavailable next-month presentation using an in-memory copy, never by editing evidence.
- Ran **6 existing focused preview tests**: invalid/missing evidence, zero mean, honest near-certainty formatting, missing graph points, Cough/Salvacion probabilities, and failed loading/malformed bundles.
- Ran **9 existing focused prospective tests**: invalid prior histories, unconfirmed/known-outcome reviews, packet tampering, missing/duplicate/invalid actuals, zero outcomes and common-target accounting, calculation failure, issue/score timing and impossible outcomes, failed distribution/late completion, and supplemental count/zero/rise scoring. All use explicitly synthetic temporary fixtures and mocked fitting; these results are software QA, not prediction-performance evidence.
- A first prospective-test invocation encountered Windows sandbox temporary-directory permissions before test setup. Retained its failure log, then reran with temporary fixtures inside this audit directory: **9 passed, no failures/errors**. No statistical or application fix was made.
- **479 scoped application, dataset, preview and research artifacts** have matching before/after hashes; no added artifacts in those protected directories. New audit files and shared documentation are outside that protected set.

Previously completed work reused: all 70 real browser dropdown/Predict checks, selected chart scopes and intervals, desktop/mobile/light/dark/keyboard checks, 10 Node and 4 Python preview checks, existing numerical gradient/distribution verification and prospective QA. No browser rerun, fitting or duplicated model comparison. A full screen-reader audit remains outside the completed UI evidence.

## Historical evidence and priority weaknesses

The primary SARIMA tolerance result remains **563/626 available = 89.94%**, out of 630 attempts (four unavailable). This is not future probability. Unavailable outputs must remain counted separately. Conditional CMP has 626/630 primary and **626/980 secondary** outputs; SARIMA itself has 973/980 secondary. Early conditional origins lack the required prior error pairs. Matched secondary probability comparisons repeat the same 626 January–September targets and are not independent confirmation.

Existing frozen paired results reproduce **43 improved / 17 worsened / 10 mixed** selections. These are log-loss/RPS score directions, not significance or reliability ratings. Aggregate conditional scores are exact-event Brier .2133, nearby Brier .0387, log loss .9393 and RPS .3123. Mean exact probability is 60.70% versus 61.98% observed; mean nearby probability is 97.13% versus 95.53% observed. Aggregate closeness can hide local errors.

Priority order:

1. **Unexpected increases:** in the already examined, outcome-defined subgroup with actual count at least two above the previous month, 24 available targets received 91.08% average nearby probability, but only **4/24 (16.67%)** fell in the nearby range. Log loss 4.5185; RPS 1.6473. This diagnoses vulnerability after outcomes are known; it does not show that such rises can be identified beforehand.
2. **Cough:** mean nearby probability 79.95% versus 47/63 (74.60%) observed. Cansilayan, Sta. Rosa and Caliban retain high absolute RPS; Salvacion, Alegria, Minoyan and Blumentritt worsened on both paired scores despite the overall pooled improvement.
3. **Other local deterioration:** Influenza/Sta. Rosa, Vertigo/Alegria, Acute Gastroenteritis/Cansilayan and Infection all types/Blumentritt. Skin disease/Blumentritt has high absolute RPS. Preserve the full all-70 report rather than selecting winners.
4. **Unavailable predictions, true zeros and small samples:** five evaluated primary outcomes for Influenza/Caliban, nine for most selections; no genuine zero-month discrimination demonstrated. Do not hide failed fits or turn missing reporting into zero.

Count intervals are discrete: central 80% intervals assigned 95.72% average mass and covered 94.89% of historical outcomes; central 95% assigned 98.98% and covered 97.28%. Compare observed coverage with assigned mass as well as the nominal level. None of these historical synthetic figures establishes real-world calibration.

## Future-data workflow and remaining requirements

The existing `workflow.py` wraps the preserved `prospective.py`; `review_scores.py` adds count-error and zero/rise reports. It does not compete with or retrain SARIMA. Keep the complete packet, not only its CSV: it includes unrounded/rounded counts, exact/nearby probabilities, target, issue time, reporting cutoff, dataset identity, policy/model hashes, unavailable results and completion receipt. There are 70 attempts and 280 rows across the selected method and comparison methods. All calculations retain their own and common-target denominators.

Explicit zeros are valid only after reporting completeness is attested. Missing actuals postpone scoring; an incomplete month cannot silently become 70 zeros. Hashes detect changes relative to an independently retained receipt. They do not authenticate the reviewer, certify patient provenance, provide a trusted external clock or prevent issuing competing packets in different folders. These remain operating controls. Existing operator commands depend on the documented Windows Python/Node paths; Linux portability and an unmocked supervised operational end-to-end run are not demonstrated by these fixture tests.

Exact next steps:

1. Designate an MHO reviewer and separate receipt custodian. Use the existing MHO checklist and operating guide.
2. Confirm at least **45 consecutive, complete genuine monthly histories** for all seven barangays and ten diseases, plus adequate prior accepted SARIMA predictions for conditional pooling (at least 28 informative pairs across five origins and five barangays per disease). Separate the demonstration history from operational records; do not append patients to it and relabel the mixture as actual incidence.
3. Supply one private verified operational SARIMA input/output pair and signed-off review metadata. Run the existing check, then supervised issue with real frozen fitting. Do not attach patient identifiers to shared evidence.
4. Save predictions before final target outcomes are known, retain the first receipt independently and keep all unavailable selections. Normal one-month issuance is during the target month after the cutoff month closes; record elapsed days and the explicit issued-during-month limitation. It is not fully ahead-of-month validation.
5. After the target month closes, obtain all 70 reviewed actual monthly totals, including explicit zeros. Score the unchanged packet, then run the supplemental count/zero/rise report. Preserve delayed/missing outcomes and corrections as dated versions.
6. Continue the frozen plan over consecutive eligible months, with descriptive reviews at six and twelve months. Those are review milestones, not guaranteed sample sufficiency. Report disease/local calibration, proper scores, difficult months and availability before considering a targeted policy change.

Can finish now: preservation/integration audit, regression evidence, operator preparation and approval-scoped integration planning. Must wait for verified inputs/outcomes: the supervised real-data issue, prospective reliability assessment, genuine zero/rise performance and any justified future model improvement. No further retuning on inspected synthetic months.

## Documentation and evidence index

Existing final policy, preview, Sol QA and Astra reliability review were already indexed in shared coordination records; the older external Astra report's statement that it was not yet indexed was superseded by the 7 November validation-readiness handoff. No repair to AGENTS.md or architecture overview is required: both preserve the separate-preview/frozen-policy boundary. This report and the completion note fill the current integration-status/targeted-QA gap.

- [Existing all-70 browser preview QA](CMP_POOLED_PREVIEW_20261107.md)
- [Final frozen policy decision](CMP_FINAL_POLICY_REVIEW_20261107.md)
- [Prospective tool QA](CMP_PROSPECTIVE_QA_20261107.md)
- [MHO checklist](CMP_MHO_VALIDATION_CHECKLIST_20261107.md) and [operating guide](CMP_PROSPECTIVE_OPERATING_GUIDE_20261107.md)
- External evidence root: `C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/integration-prediction-qa-20261109/`: `audit.json`, `runtime-focused.json`, `preview-focused-tests.log`, `prospective-focused-tests-retry.log`, initial sandbox-failure log, preservation fingerprints and reproducible read-only scripts.
- Full per-selection reliability evidence: `C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-review-20261107/REPORT.md` and `all-70-reliability.csv`.
