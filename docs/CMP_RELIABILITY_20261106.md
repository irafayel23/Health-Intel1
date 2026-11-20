# Probability reliability audit and conditional-spread experiment

6 November2026 · CODEX-1 · Isolated exploratory research. No application/preview/data/Azure changes.

Decision: **FURTHER_VERIFICATION_ONLY**. SARIMA point estimates and their MAE/RMSE/tolerance scores are unchanged. This research tests probability spread only.

## Original calibration, all available targets

|Protocol/group|N|Exact assigned / observed|Nearby assigned / observed|Predicted variance / squared error|
|---|---:|---:|---:|---:|
|31_14 ALL|973|48.45% / 61.97%|93.97% / 95.99%|0.6515 / 0.4711|
|31_14 disease:Cough|98|36.18% / 35.71%|84.07% / 78.57%|1.1592 / 1.6268|
|80_20 ALL|626|49.20% / 61.98%|94.32% / 95.53%|0.6310 / 0.4926|
|80_20 disease:Cough|63|35.88% / 33.33%|83.83% / 74.60%|1.1666 / 1.8139|

Predicted variance versus squared error is descriptive; bias, conditional mean errors and data dependence also contribute. It is not a fit-selection rule. All ten diseases,70 scopes and fixed deciles are exported. An overall calibration average can hide group errors. No observed zero months exist, so zero-versus-positive discrimination remains untested.

## Fixed conditional-spread comparison

Original marginal CMP learns spread from raw training counts. The challenger learns one dispersion per disease from strictly earlier SARIMA prediction/actual pairs across seven barangays. It preserves the SARIMA mean. The policy was fixed before challenger scoring but after earlier historical outcomes had been inspected; it is not independent confirmation. Pair, origin and barangay minimums are engineering research eligibility rules, not established adequacy guarantees. No model-selection/parameter uncertainty is integrated.

|Protocol|Requested|Original available|Conditional available|Common targets|
|---|---:|---:|---:|---:|
|80_20|630|626|626|626|
|31_14|980|973|626|626|

|Protocol/method|N|Exact Brier|Nearby Brier|Log loss|RPS|
|---|---:|---:|---:|---:|---:|
|31_14 Conditional-pooled-CMP|626|0.2133|0.0387|0.9393|0.3123|
|31_14 Mean-Poisson|626|0.3446|0.0973|1.3474|0.4188|
|31_14 SARIMA-CMP|626|0.2362|0.0407|0.9975|0.3250|
|31_14 SARIMA-Poisson|626|0.3370|0.0859|1.3395|0.4125|
|80_20 Conditional-pooled-CMP|626|0.2133|0.0387|0.9393|0.3123|
|80_20 Mean-Poisson|626|0.3446|0.0973|1.3474|0.4188|
|80_20 SARIMA-CMP|626|0.2362|0.0407|0.9975|0.3250|
|80_20 SARIMA-Poisson|626|0.3370|0.0859|1.3395|0.4125|

October challenger availability: 70/70. Original70/70 is preserved. Fit statuses: {'insufficient_prior_prediction_pairs': 50, 'ok': 100}.
Per-scope directions: {'80_20': {'improved': 43, 'worsened': 17, 'mixed_or_tied': 10}, '31_14': {'improved': 43, 'worsened': 17, 'mixed_or_tied': 10}}. These directions do not establish statistical significance or future validity.

Paired differences and2000 month-cluster bootstrap intervals are in month-cluster-intervals.csv. Only nine distinct months remain in either matched comparison. The secondary common targets are exactly the same626 targets as primary, because earlier secondary targets lack enough earlier prediction pairs. Identical secondary scores are therefore not robustness confirmation. Resampling preserves within-month dependence but does not resolve adjacent-month dependence, group dependence or repeated historical inspection.

## Remaining work and safe use

No statistical safeguard, count, zero or tolerance was changed. Numerical failures remain missing. Earlier secondary targets have too few earlier saved prediction pairs; availability is disclosed rather than silently reverting to marginal CMP. The existing preview remains the original probability policy regardless of this comparison. The final decision is conditional research readiness, not permission to integrate.

Prospective.py provides separate issue/score records with receipt hashes and closed-cutoff, registration-before-target-completion and scoring-after-completion gates. Its tests use explicitly labeled QA fixtures, not evidence of future predictive skill. Actual new completed monthly outcomes cannot be produced by this task. Source provenance and month completeness must be confirmed by MHO. Local hashes are not a trusted external timestamp.

## Method sources

Huang2017 mean-parametrized CMP: https://arxiv.org/abs/1606.03214 . Gneiting/Raftery2007 proper scoring rules: https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf . They justify methods, not Health-Intel calibration claims.

Reproduce: run test_research.py; research.py resumes frozen per-disease/origin fits; audit.py rebuilds these tables without tuning. Preserve the frozen original archive. See POLICY.md,freeze.json,fits.csv,matched-targets.csv,availability.csv,original-calibration.csv,original-bins.csv,training-diagnostics.csv,matched-summary.csv,scope-changes.csv and october.csv.

## Final verification and recommendation

Completed 2026-11-06T21:49:46+08:00. Thirteen final focused tests passed: ten Python (five research and five prospective) and three Node adapter tests. Independent bisection probabilities and direct scoring verified2504 unique method/target distributions (2175 unique parameter pairs); analytic mean-fixed CMP likelihood scores and independent curvature checks verified all100 accepted dispersion fits. Fifty short-history disease/origin rows were ineligible before optimization, not silently accepted numerical failures. All3198 existing protected runtime/data/source files are unchanged, and all archived evidence manifest hashes still match.

The most useful improvement found is a probability-spread estimate based on earlier SARIMA errors, pooled within a disease. On626 identical primary targets, exact Brier improved0.2362→0.2133; log loss0.9975→0.9393; RPS0.3250→0.3123. Mean exact probability moved49.20%→60.70%, compared with61.98% observed exact matches. Nearby probability moved94.32%→97.13%, compared with95.53% observed: this average calibration gap became slightly worse despite the lower nearby Brier score. Do not claim every calibration measure improved.

For Cough, mean nearby probability moved83.83%→79.95%, compared with74.60% observed: the overestimate narrowed but did not disappear. Seven diseases improved both log loss/RPS overall; Acute Gastroenteritis, Fever unknown origin and Infection all types were mixed. Across70 individual scopes,43 improved,17 worsened and10 were mixed/tied. This is not sufficient for blanket promotion.

The secondary challenger has only626/980 outputs, because its early origins lack enough earlier prediction pairs. Its matched626 targets are exactly the primary targets; identical scores are not independent robustness evidence. Original secondary973/980 and original October70/70 remain unchanged. The challenger has October70/70 and preserves every SARIMA mean. For Cough/Salvacion it assigns32.27% to exactly4 and79.89% to3–5, compared with original38.29%/87.79%. A lower percentage is not a worse result by itself; the event and observed calibration matter.

**Recommendation: retain the installed SARIMA and current probability preview. Keep the conditional probability layer separate for prospective comparison; do not automatically select per-scope winners from these inspected results.** Point-estimate MAE/RMSE/MAPE and the installed563/626 within-tolerance score did not change. Probability-layer gains do not improve SARIMA case-count errors.

The separate future-validation tool now issues both probability policies and the two Poisson baselines side by side from a structurally/numerically verified operational SARIMA export, then scores only after confirmed target-month completion. It preserves missing forecasts, real zeros, infinite losses and matched-target accounting, binds sources/tool versions/libraries with hashes, and refuses overwrite. Only temporary QA fixtures were used here. No actual operational prediction or actual future assessment was created.

**Timing correction:** the before-target-month promise in the original POLICY.md's prospective paragraph is incompatible with confirming the immediately preceding calendar month after it ends. The historical frozen research policy is preserved; PROSPECTIVE_POLICY.md supersedes that prospective engineering paragraph only. The tool records normal one-month updates as issued during the target month, with the issue date/lag, never as predictions of a wholly unseen full month. Testing a whole future month before it starts would need separately approved two-step predictions or a different verified reporting process. No SARIMA horizon was changed.

Future evidence still requires MHO-confirmed complete monthly histories and later actual counts, several subsequent evaluations with disease-specific calibration, and review of source provenance/reporting completeness. Do not call generated history operational actual records. Local receipt hashes are not trusted external timestamps, and the adapter does not independently establish MHO approval or genuine data provenance. See FUTURE_TEST_GUIDE.md for exact commands, interpretation and limitations.

## Preservation and rollback

The website, current standalone preview, frozen SARIMA, CSVs, MySQL, Azure, accounts, dependencies and deployment are unchanged. No model integration, live DB connection, migrations, actual patient-row reads, Git commit/push or new server was performed. Repository edits are shared coordination docs and this report only. All research code, caches, scores and QA logs are in the separate cmp-reliability-20261106 folder. Existing local preview server on8770 was not stopped or changed.

No application rollback is necessary. Retain these evidence files and stop using the new research tools if they are not selected. Do not restore an old application checkout or dataset wholesale. Reproduction requires the preserved sibling cmp6200-20261103 evidence and the existing scientific environment; this archive is not a dependency installer or a standalone copy of the full application.
