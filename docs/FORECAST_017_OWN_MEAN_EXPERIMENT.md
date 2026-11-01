# FORECAST-017 — Fixed SARIMA / own-history mean blend

CODEX-1 · 31 October 2026

**Decision: KEEP CURRENT SARIMA.** The fixed adjustment produced small exploratory gains but failed the frozen further-review screen. No integration or new model fitting.

## Method and safeguards

Exactly one candidate: 75% unchanged SARIMA + 25% expanding own-history mean, using only months before each target. Weights frozen before scoring; no weight search or retrospective tuning. This is a SARIMA–Own-History Mean Blend, not SARIMA alone. Unlike FORECAST-014 it uses the same series’ overall training mean, not pooled same-disease seasonal estimates.

Source: unchanged installed 5,592-case combined dataset: 5,500 generated cases +92 ITR-derived entries, 3,150 monthly cells, 70 histories, January 2023–September 2026. ITR entries were not clinically revalidated here. Existing unrounded predictions reused. Primary 36-month initial history/9 test months; secondary31/14. Test months overlap and have been inspected repeatedly. These are exploratory results, not independent validation.

Frozen screen: at least5% lower MAE AND RMSE in both protocols, no loss of tolerance hits or zero/increase hits, complete coverage. The5% criterion is a pragmatic research screen, not an adviser-approved accuracy threshold or statistical significance claim.

## Results

| Protocol | Method | Passes | Within limit | MAE | RMSE | Positive MAPE | Bias |
|---|---|---:|---:|---:|---:|---:|---:|
| 80/20 | SARIMA | 352/630 | 55.87% | 1.1475 | 1.5038 | 52.24% | -0.0377 |
| 80/20 | mean | 367/630 | 58.25% | 1.1064 | 1.4341 | 47.47% | -0.0229 |
| 80/20 | challenger | 363/630 | 57.62% | 1.1287 | 1.4734 | 50.24% | -0.0340 |
| 70/30 | SARIMA | 538/980 | 54.90% | 1.1696 | 1.5120 | 53.83% | 0.0207 |
| 70/30 | mean | 551/980 | 56.22% | 1.1213 | 1.4289 | 48.34% | 0.0214 |
| 70/30 | challenger | 543/980 | 55.41% | 1.1479 | 1.4755 | 51.58% | 0.0209 |

MAE = mean absolute error; RMSE = square root of mean squared error; positive MAPE =100×mean(abs(error)/actual) only for actual>0. Bias is prediction−actual. A pass is abs(error)≤max(1,20%actual). No rounding before scoring. All methods have630/630 primary and980/980 secondary availability. Percentage is past performance, not the chance that future cases happen.

## Zero counts and increases

| Protocol | Method | Group | Passes | MAE |
|---|---|---|---:|---:|
| 80/20 | SARIMA | zero | 10/119 | 1.4913 |
| 80/20 | SARIMA | one_two | 310/358 | 0.6701 |
| 80/20 | SARIMA | three_plus | 32/153 | 1.9971 |
| 80/20 | SARIMA | increase | 5/58 | 2.7804 |
| 80/20 | challenger | zero | 7/119 | 1.5079 |
| 80/20 | challenger | one_two | 324/358 | 0.6370 |
| 80/20 | challenger | three_plus | 32/153 | 1.9841 |
| 80/20 | challenger | increase | 5/58 | 2.7575 |
| 70/30 | SARIMA | zero | 18/196 | 1.5509 |
| 70/30 | SARIMA | one_two | 466/554 | 0.7122 |
| 70/30 | SARIMA | three_plus | 54/230 | 1.9464 |
| 70/30 | SARIMA | increase | 9/83 | 2.7376 |
| 70/30 | challenger | zero | 13/196 | 1.5565 |
| 70/30 | challenger | one_two | 481/554 | 0.6744 |
| 70/30 | challenger | three_plus | 49/230 | 1.9401 |
| 70/30 | challenger | increase | 8/83 | 2.7161 |

Increase subgroup: observed rise>=3 cases AND actual>=2×previous count. Descriptive only, not a risk trigger; overlaps other groups.

## Per-selection comparisons

- 80/20: both errors lower in48/70; both higher in10; mixed/tied in12. MAE reduction1.64%, RMSE reduction2.02%. Frozen screen passed: False.
- 70/30: both errors lower in53/70; both higher in7; mixed/tied in10. MAE reduction1.85%, RMSE reduction2.42%. Frozen screen passed: False.

Complete per-selection metrics are in all70.csv; all test predictions in targets.csv. Current October point estimates available70/70 in current.csv; no blended prediction intervals are fabricated or inherited from SARIMA. No historical hit rate is assigned to an individual future outcome.

## Recommendation for final defense

Keep the current working application. Report the actual selected historical score and error metrics, not a disease-occurrence probability. This test improved average errors modestly but does not resolve zero months or sudden increases. Do not keep searching weights on the same inspected months. If70% is a strict requirement, clarify its metric, tolerance, evaluation scope and acceptance with the adviser; the present evidence does not satisfy70% within tolerance. Do not rename a percentage, remove zeros or change cases to meet it.

A defensible next step is a source-quality review of the92 ITR-derived entries and a written evaluation/acceptance definition. New verified chronological observations can subsequently support independent assessment. Continue synthetic research only under a new bounded policy; no promise of reaching70% and no need to disrupt the working capstone modules.

## Verification

Independent Python verified all1610 historical plus70 current blend calculations and450 metric summaries against original snapshot and training prefixes. Protected application, dataset and bundle hashes unchanged. No MySQL or Azure operations. SARIMA fitting, residual checks and seasonal diagnostics were reused, not rerun. No GUI or deployed tests claimed. Sources/scripts/policy/results remain isolated. Reproduction: experiment.cjs writes a frozen policy once (use a new output folder for reruns); verify_report.py independently verifies and writes this report.
