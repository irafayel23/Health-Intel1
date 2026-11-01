# FORECAST-020 — Numerical repair succeeded; retain installed SARIMA

Completed 1 November 2026 (Asia/Manila). CODEX-1. Isolated, exploratory research only. No application, database or Azure integration.

## Decision

**KEEP CURRENT SARIMA.** The solver repair resolves the registered numerical failures without changing the statistical specification or relaxing acceptance. Experimental partial pooling now delivers 630/630 primary, 980/980 secondary and 70/70 October forecasts. It modestly reduces average error versus SARIMA, but the advantage over simple training-mean Poisson is small, difficult higher-count/increase hit rates deteriorate, and the unchanged consideration screen fails. This is not a failed numerical repair; it is insufficient evidence to replace the forecasting policy.

Installed SARIMA remains 352/630 = 55.8730% with 70/70 October outputs on the final **5,592-case** dataset. The old 5,500-case 350/630 benchmark is archived, not this experiment's reference. Within tolerance is a historical error test, not the probability a future count will happen.

## Inputs and protection

Unchanged 3,150 monthly cells, ten diseases, seven barangays, January 2023–September 2026. Dataset SHA-256: `6fa6851e203b07fe6ac6bd4013bce7dd9fa601dda7071bb23b42d1b1e7689b36`. Saved SARIMA snapshot SHA-256: `80929aa8c714e8594867b38b5a4102c84e55e6fb57a5c747794af5eb23ecff9d`. Counts were not regenerated, smoothed, redistributed or removed. Data comprise 5,500 generated cases plus 92 ITR-derived entries; this experiment does not independently certify clinical categories, duplicates or complete monthly reporting. **Genuine disease-data validation remains pending.** Existing synthetic and other research versions are preserved separately.

## What failed in FORECAST-019

Of 150 scheduled disease-prefix requests, 108 produced accepted fits. Fourteen preliminary Poisson optimizations terminated with native success but gradients above the frozen 1e-4 acceptance limit. Failed initial Cough and Fever fits prevented the locked family decision and caused 28 further prefix skips. Original coverage was 462/630, 700/980 and 56/70 October.

L-BFGS-B can terminate on relative objective improvement before satisfying the separate gradient target. Original settings were maxiter=500, ftol=1e-12, gtol=1e-7. At Cough's 31-month prefix the saved gradient was 0.000276019; at Fever it was 0.000178997. These were rejected correctly by the original acceptance gate. The stopping behavior is documented in [SciPy's L-BFGS-B reference](https://docs.scipy.org/doc/scipy/reference/optimize.minimize-lbfgsb.html).

## Repair and independent numerical evidence

One solver change was frozen before pilot fitting/scoring: keep the original L-BFGS-B initialization, bounds and options, then refine eligible native-success interior solutions using analytic Newton steps on the **same penalized likelihood**. Solve H step = -gradient; use Armijo descent (1e-4), at most 20 steps and 32 halvings per step. Refine to gradient <=1e-7; the original fit acceptance limit remains 1e-4. Native failure, unstable curvature, nonfinite values and bound failures are not waived. No settings were searched against forecasting scores.

For fixed dispersion alpha, curvature weights are mu for Poisson and mu(1+alpha*y)/(1+alpha*mu)^2 for NB2. Penalties, lag/calendar inputs, disease/area structure, training-only family selection, dispersion rule, effective-df correction, dynamic-boundary checks and other safeguards remain unchanged. Partial pooling is a penalized count model, **not SARIMA**, and its forecasts must never be labeled SARIMA.

- 12 unit tests passed, including eight independent Poisson/NB likelihood derivative fixtures, finite-difference Hessians, independent trust-exact optima, boundary/zero/future exclusion and source-equivalence tests. Numerical differentiation is an independent check, not a replacement for the acceptance tests; see [SciPy gradient-checking methodology](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.check_grad.html).
- Training-only pilot recovered all 14 explicit failed prefixes before full scoring; maximum repaired pilot gradient 3.059e-10. Matching pilot outputs were reused, not refitted unnecessarily.
- Full run accepted all 150 requests: 42 newly available, none lost. There are 165 unique preliminary/selected optimizations and 177 recorded Newton steps. All saved line-search steps satisfy descent.
- Reconstructed all 165 Hessians independently: maximum gradient 9.87e-08, maximum condition 45.107, minimum Hessian eigenvalue 36.489, minimum margin inside the dynamic bound 0.712. All original thresholds pass.
- Original native starting results reproduced for 122 prior attempted prefixes. On the 108 previously accepted requests, the largest forecast change was 0.000002674 cases. Improvement in coverage is not evidence of better estimates for these already-successful fits.
- Cough now selects NB2 using the unchanged rule at month 31; the other nine diseases select Poisson. Cough had no accepted family before, so this is completion of the original rule, not a manual family override.
- Twenty-five disease-prefix fits retain approximate residual warnings. These were advisory in FORECAST-019 and remain advisory. No warning was deleted to obtain coverage; accepted numerical convergence does not establish adequate residual structure.

| Protocol | Same old-accepted targets | Old MAE / RMSE | Repaired MAE / RMSE | Old / repaired hits |
| --- | --- | --- | --- | --- |
| 80_20 | 462 | 1.002634 / 1.279313 | 1.002634 / 1.279313 | 285 / 285 |
| 70_30 | 700 | 1.029296 / 1.294847 | 1.029296 / 1.294847 | 411 / 411 |

## Evaluation design

Primary: first 36 months train, then nine repeated one-month-ahead predictions, January–September 2026 (70 x 9 = 630 targets). Secondary: first 31 months train, then 14 repeated one-month-ahead predictions, August 2025–September 2026 (980 targets). Each prefix uses only counts available before its target. Same-disease pooling uses other barangays' historical counts, never their target-month counts. The 31-month family decision is locked for both protocols. No future weather, contemporaneous neighboring outcome or target information enters a fit.

October uses all 45 observed months through September. All five methods have 70/70 current outputs. SARIMA is reused from saved evidence; training-mean Poisson uses each history's training mean, naive uses the prior month, and seasonal naive uses the same month last year. No target is dropped. Predictions stay unrounded for evaluation.

Protocols overlap, so the secondary split is a robustness check, not an independent replicate. These historical targets have already been inspected. This experiment is exploratory, not prospective confirmation or a claim of statistical significance.

## Primary 80/20 results

| Method | Available | Within tolerance | MAE | RMSE | Positive-only MAPE | Signed bias |
| --- | --- | --- | --- | --- | --- | --- |
| SARIMA | 630/630 | 352/630 (55.87%) | 1.1475 | 1.5038 | 52.24% | -0.0377 |
| Partial pooling | 630/630 | 373/630 (59.21%) | 1.0922 | 1.4261 | 48.09% | -0.0056 |
| Training-mean Poisson | 630/630 | 367/630 (58.25%) | 1.1064 | 1.4341 | 47.47% | -0.0229 |
| Naive | 630/630 | 384/630 (60.95%) | 1.4825 | 2.0717 | 76.25% | -0.0095 |
| Seasonal naive | 630/630 | 363/630 (57.62%) | 1.5111 | 2.0292 | 78.02% | -0.0540 |

Repaired pooling passes 373/630 x 100 = **59.2063%**. Compared with SARIMA, MAE decreases 4.8197% and RMSE 5.1681%; compared with mean Poisson, reductions are only 1.2828% and 0.5620%. Naive's higher hit rate comes with much worse MAE/RMSE, illustrating why maximizing this one percentage is not sufficient.

## Separate secondary 70/30 results

| Method | Available | Within tolerance | MAE | RMSE | Positive-only MAPE | Signed bias |
| --- | --- | --- | --- | --- | --- | --- |
| SARIMA | 980/980 | 538/980 (54.90%) | 1.1696 | 1.5120 | 53.83% | 0.0207 |
| Partial pooling | 980/980 | 554/980 (56.53%) | 1.1057 | 1.4180 | 48.53% | 0.0440 |
| Training-mean Poisson | 980/980 | 551/980 (56.22%) | 1.1213 | 1.4289 | 48.34% | 0.0214 |
| Naive | 980/980 | 602/980 (61.43%) | 1.4480 | 1.9926 | 74.58% | 0.0112 |
| Seasonal naive | 980/980 | 570/980 (58.16%) | 1.5153 | 2.0195 | 79.05% | 0.0316 |

Pooling's MAE/RMSE reductions versus SARIMA are 5.4650%/6.2206%; versus mean Poisson they are 1.3966%/0.7656%. This does not overcome the primary decision failures.

## Difficult months

| Group | Method | Passed / available | Within tolerance | MAE | RMSE |
| --- | --- | --- | --- | --- | --- |
| zero | SARIMA | 10/119 | 8.40% | 1.4913 | 1.5957 |
| zero | Partial pooling | 16/119 | 13.45% | 1.4932 | 1.5524 |
| zero | Training-mean Poisson | 0/119 | 0.00% | 1.5576 | 1.5885 |
| one_two | SARIMA | 310/358 | 86.59% | 0.6701 | 0.8815 |
| one_two | Partial pooling | 330/358 | 92.18% | 0.5953 | 0.7621 |
| one_two | Training-mean Poisson | 340/358 | 94.97% | 0.5899 | 0.7242 |
| three_plus | SARIMA | 32/153 | 20.92% | 1.9971 | 2.3479 |
| three_plus | Partial pooling | 27/153 | 17.65% | 1.9430 | 2.2672 |
| three_plus | Training-mean Poisson | 27/153 | 17.65% | 1.9639 | 2.2976 |
| sudden_increase | SARIMA | 5/58 | 8.62% | 2.7804 | 3.0692 |
| sudden_increase | Partial pooling | 3/58 | 5.17% | 2.6486 | 2.9587 |
| sudden_increase | Training-mean Poisson | 3/58 | 5.17% | 2.6906 | 3.0016 |

Zero-month hits rise from 10 to 16, but zero-month MAE is slightly worse (1.4932 versus 1.4913). Ordinary one-to-two-case hits rise from 310 to 330. Three-or-more-case hits fall from 32 to 27; sudden-increase hits fall from 5 to 3, despite modestly lower errors in those groups. Higher-month underprediction remains: pooling bias -1.7703 for 3+ cases and -2.6470 for sudden increases. The 21 additional overall hits are +6 zero, +20 ordinary and -5 high. Sudden increases overlap the high group and must not be added again.

Sudden increase retains the registered definition: actual minus previous >=3 and actual >=2 x previous. It is a retrospective analysis group, not a signal known when predicting.

| Group | Method | Passed / available | Within tolerance | MAE | RMSE |
| --- | --- | --- | --- | --- | --- |
| zero | SARIMA | 18/196 | 9.18% | 1.5509 | 1.6762 |
| zero | Partial pooling | 16/196 | 8.16% | 1.5354 | 1.5916 |
| zero | Training-mean Poisson | 0/196 | 0.00% | 1.5735 | 1.6071 |
| one_two | SARIMA | 466/554 | 84.12% | 0.7122 | 0.9219 |
| one_two | Partial pooling | 493/554 | 88.99% | 0.6239 | 0.7973 |
| one_two | Training-mean Poisson | 514/554 | 92.78% | 0.6199 | 0.7707 |
| three_plus | SARIMA | 54/230 | 23.48% | 1.9464 | 2.3022 |
| three_plus | Partial pooling | 45/230 | 19.57% | 1.8999 | 2.2085 |
| three_plus | Training-mean Poisson | 37/230 | 16.09% | 1.9437 | 2.2513 |
| sudden_increase | SARIMA | 9/83 | 10.84% | 2.7376 | 3.0519 |
| sudden_increase | Partial pooling | 6/83 | 7.23% | 2.6063 | 2.9115 |
| sudden_increase | Training-mean Poisson | 4/83 | 4.82% | 2.6565 | 2.9521 |

## All 70 combinations and probability checks

| Protocol | Compared with | Improved | Worsened | Mixed / inconclusive |
| --- | --- | --- | --- | --- |
| 80_20 | SARIMA | 39 | 15 | 16 |
| 80_20 | Training-mean Poisson | 30 | 25 | 15 |
| 80_20 | Naive | 40 | 6 | 24 |
| 80_20 | Seasonal naive | 41 | 3 | 26 |
| 70_30 | SARIMA | 41 | 13 | 16 |
| 70_30 | Training-mean Poisson | 30 | 28 | 12 |
| 70_30 | Naive | 38 | 2 | 30 |
| 70_30 | Seasonal naive | 36 | 0 | 34 |

An improved label requires lower MAE AND RMSE with no fewer hits on identical targets; worsened reverses these conditions; tradeoffs are mixed/inconclusive. These descriptive labels are not significance tests. Every combination's errors and counts are in all-70-metrics.csv; classifications.csv contains every comparison and october-forecasts.csv contains all estimates and method names.

Primary pooling zero-event Brier is 0.146483 versus mean Poisson 0.151457 (lower is better), but high-count Brier is worse: 0.160606 versus 0.157961. NLL and ranked probability score modestly improve. Secondary zero/high Brier, NLL and RPS are nonworse. Sudden-increase Brier remains worse than mean Poisson in both splits. Retained plugin intervals cover 98.57% of targets, with primary mean width 4.8444 cases; high coverage with wide discrete intervals does not establish precise or calibrated future prediction. Parameter/dispersion uncertainty is omitted. Calibration bins and matched summaries are preserved, and these probabilities remain experimental.

## Unchanged decision screen

| Frozen criterion | Result |
| --- | --- |
| full_coverage | PASS |
| primary_5pct_errors_vs_SARIMA | FAIL |
| secondary_no_worse_vs_SARIMA | PASS |
| primary_5pct_errors_vs_Training-mean Poisson | FAIL |
| secondary_no_worse_vs_Training-mean Poisson | PASS |
| primary_hits_no_worse | FAIL |
| probabilities_better_primary | FAIL |
| probabilities_nonworse_secondary | PASS |

The 5% practical screen was fixed in the original research; it is not a universal statistical law or panel-approved accuracy standard. Do not lower it retrospectively. Even apart from the near miss on SARIMA MAE, the very small gain over simple Poisson and worse higher-count/increase hits argue against integration.

## Formulas and interpretation

For actual y and unrounded prediction p, absolute error = |p-y|; allowed error = max(1, 0.20y). Pass if absolute error <= allowed error. Within tolerance = 100 x passes / produced forecasts. Availability = 100 x produced / requested. No missing output is replaced with zero. MAE = sum|p-y| / N; RMSE = sqrt(sum(p-y)^2 / N); positive-only MAPE = 100 x mean(|p-y|/y for y>0); bias = mean(p-y). Primary MAPE excludes 119 zero targets, secondary excludes 196. Historical percentages are not the chance a particular future case count is true.

## Verification, reproducibility and remaining risks

Independent JavaScript checks recomputed 8,050 historical rows, 350 current rows, 3,360 probability distributions, 2,100 native means, 300 preliminary/selected gradient records (including repeated Poisson references), 830 metric summaries, 560 classifications, 80 calibration bins plus 80 matched bins, and all frozen gates. Unique optimization counts are smaller because preliminary and selected Poisson records refer to the same fit. Python independently audited saved Hessians, trajectories, old/new comparisons and all 206 prior evidence hashes. Frozen sources and original project files are verified; authorized project changes are shared documentation and this report only. No database/UI/live Azure test was needed or claimed.

One fitting worker finished under the retained 512 MiB limits (sampled peak job RSS 100.28 MiB; kernel peak commit 134.88 MiB). No model worker remains. Twelve unit tests and all arithmetic/numerical/preservation checks passed. These tests establish implementation consistency, not genuine disease-data validity. See README.md and verification JSON files for reproducible commands; archive-verification.json, saved outside the evidence ZIP, records final SHA-256 and CRC checks.

Limitations remain: short 45-month histories, mostly generated counts, fixed regularization rather than learned random-effect variance, training-only dispersion estimation uncertainty, approximate residual tests, small per-selection nine-target primary samples, common calendar dependence across barangays, inspected test outcomes and no external prospective validation. Annual harmonics do not prove annual disease seasonality. Both protocols reuse the same underlying months and observations.

## Recommendation and next action

Keep current SARIMA unchanged as required. Preserve the repaired count model as an experimentally verified numerical implementation, not an approved replacement or integrated secondary output. It improves availability, but does not reliably solve zero or sudden-increase prediction. No further model/threshold search is authorized by this completion. If later research is approved, freeze its decision rules before genuinely new observations are examined; use same-target comparisons and report calibration and higher-count errors alongside availability. No 70–80% claim or guarantee is justified here.
