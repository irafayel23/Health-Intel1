# FORECAST-021: targeted prediction error investigation

**Decision: KEEP CURRENT SARIMA.** Completed isolated replay on the final 5,592-case dataset. No fitting, application changes, integration, MySQL access or Azure operations. The new rule is exploratory and does not establish a reliable replacement.

## Main findings

The Cough/Salvacion screenshot is mathematically correct: MAE 2.3891, RMSE 2.8363, positive-only MAPE 98.3639%, and 3/9 predictions within the unchanged error limit. **None of those nine actual months is zero.** In fact this history has no zeros across its 45 months. Removing zero months cannot fix this example.

The new fixed SARIMA-default selector increases pooled passes from 352 to 356 of 630, and reduces MAE by about 1.79% and RMSE by about 0.85%. However, 3+ case passes decrease from 32 to 30 and sudden-increase passes from 5 to 4. It does not beat the simple training-mean reference in MAE/RMSE. This is not enough evidence to change the installed system.

All methods produce every historical target and 70/70 October point estimates. Availability is not evidence of accurate estimates. Original installed October forecasts remain 70 SARIMA outputs; the experimental selector would use 51 SARIMA and 19 partial-pooling outputs, explicitly labelled as such.

## Inputs, provenance and alignment

Final monthly CSV: 3,150 records, 70 disease-barangay histories, 45 months January 2023–September 2026; total 5,592 cases. SHA-256: `6fa6851e203b07fe6ac6bd4013bce7dd9fa601dda7071bb23b42d1b1e7689b36`. The combined source contains 5,500 generated cases plus 92 ITR-derived entries; it is not a fully verified genuine disease series. This audit does not revalidate ITR images, clinical classification or reporting completeness. Genuine disease-data validation remains **Validation pending**.

The installed snapshot and all FORECAST-020 predictions were checked against their actuals, dates, preceding counts and training-prefix SHA-256 digests. All 150 native disease-level pooling fits were read and their seven predictions matched to the CSV. Naive, seasonal-naive and training-mean predictions were independently rebuilt from history before each target. FORECAST-020's 382-file evidence manifest and 14-file policy freeze were verified; there is no substitution of the older 5,500-case benchmark.

350/630 belongs to the original 5,500-case dataset. **352/630 belongs to this final 5,592-case dataset.** These are different inputs, not conflicting arithmetic or a model improvement.

## Evaluation and frozen selection rule

Primary: first 36 months followed by nine one-month-ahead expanding-window predictions, January–September 2026 (630 targets). Secondary: first 31 months followed by 14 predictions, August 2025–September 2026 (980 targets). They overlap and are reported separately, never averaged or treated as independent replications. October 2026 is the unscored future estimate from September history.

POLICY.md and selector.py were hashed before calculating this rule's scores. At origin n, inspect only the five preceding observed targets. Select repaired partial pooling only if it has lower MAE AND lower MSE and a smaller absolute error on at least four of those five targets; otherwise retain SARIMA. Every required pair must be available. Constants were fixed and not searched or adjusted. Five months is a consistency screen, not a significance test or an established optimal window.

Saved base predictions start at origin31. Thus origins31–35 use SARIMA; origin36 can use five pre-primary targets. Later decisions can use earlier outer months only AFTER they have occurred. This is a frozen prequential/expanding-window procedure, not retrospective selection of a winner from all nine test outcomes. October uses only origins40–44. No current/future actual enters selection. Secondary warm-up makes its results partly identical to SARIMA and limits the robustness interpretation. All inspected historical outcomes remain exploratory; the freeze does not erase prior exposure to these periods.

## Primary results

| Method | Passes / available | Within tolerance | MAE | RMSE | Positive MAPE % | Signed bias |
|---|---|---|---|---|---|---|
| SARIMA | 352/630 | 55.87% | 1.1475 | 1.5038 | 52.2389 | -0.0377 |
| Partial pooling | 373/630 | 59.21% | 1.0922 | 1.4261 | 48.0937 | -0.0056 |
| Training-mean Poisson | 367/630 | 58.25% | 1.1064 | 1.4341 | 47.4740 | -0.0229 |
| Naive | 384/630 | 60.95% | 1.4825 | 2.0717 | 76.2538 | -0.0095 |
| Seasonal naive | 363/630 | 57.62% | 1.5111 | 2.0292 | 78.0160 | -0.0540 |
| SARIMA-default selector | 356/630 | 56.51% | 1.1270 | 1.4910 | 50.5093 | -0.0320 |

All six methods have 630/630 availability; positive-only MAPE includes 511 targets and excludes 119 zeros. Since none is missing, produced-target and all-request hit rates coincide. Naive has the highest hit count but substantially larger errors: integer predictions frequently land within one case, while occasional large misses increase MAE/RMSE. Maximizing this hit rate alone would choose a different objective from minimizing errors.

## Separate secondary results

| Method | Passes / available | Within tolerance | MAE | RMSE | Positive MAPE % | Signed bias |
|---|---|---|---|---|---|---|
| SARIMA | 538/980 | 54.90% | 1.1696 | 1.5120 | 53.8324 | 0.0207 |
| Partial pooling | 554/980 | 56.53% | 1.1057 | 1.4180 | 48.5277 | 0.0440 |
| Training-mean Poisson | 551/980 | 56.22% | 1.1213 | 1.4289 | 48.3402 | 0.0214 |
| Naive | 602/980 | 61.43% | 1.4480 | 1.9926 | 74.5821 | 0.0112 |
| Seasonal naive | 570/980 | 58.16% | 1.5153 | 2.0195 | 79.0546 | 0.0316 |
| SARIMA-default selector | 542/980 | 55.31% | 1.1564 | 1.5038 | 52.7051 | 0.0244 |

All six methods have 980/980 availability; positive MAPE denominator784, excluded zeros196. Partial pooling has the lowest MAE/RMSE in both splits, but only small improvements over the training mean and weaker high-count hit performance than SARIMA. Its pooled scores cannot be assigned to each dropdown.

## Cough / Salvacion: every primary target

| Month | Actual | SARIMA | Absolute error | Allowed error | Pass | Percentage error |
|---|---|---|---|---|---|---|
| 2026-01 | 4 | 2.5077 | 1.4923 | 1.0000 | False | 37.3066 |
| 2026-02 | 1 | 3.8893 | 2.8893 | 1.0000 | False | 288.9268 |
| 2026-03 | 1 | 4.3611 | 3.3611 | 1.0000 | False | 336.1059 |
| 2026-04 | 6 | 3.4513 | 2.5487 | 1.2000 | False | 42.4785 |
| 2026-05 | 4 | 3.3181 | 0.6819 | 1.0000 | True | 17.0479 |
| 2026-06 | 9 | 3.4195 | 5.5805 | 1.8000 | False | 62.0058 |
| 2026-07 | 7 | 3.6639 | 3.3361 | 1.4000 | False | 47.6583 |
| 2026-08 | 3 | 3.8085 | 0.8085 | 1.0000 | True | 26.9492 |
| 2026-09 | 3 | 3.8039 | 0.8039 | 1.0000 | True | 26.7962 |

Values above are rounded only for display; evaluation uses full precision. February and March alone contribute about 69.45 percentage points to the nine-month mean MAPE because each actual is only one. The remaining approximately28.92 points come from the other seven months. A high MAPE is not 1 minus accuracy, nor a future event probability.

There are four overpredictions and five underpredictions; signed mean bias is -0.6419 cases. Cancellation hides large two-sided errors. The estimates remain roughly2.51–4.36 while actuals range1–9. There are no raw exact matches and no nearest-integer exact matches despite three tolerance passes. High actuals6,9,7 are underpredicted; the two one-case months are strongly overpredicted. Simply lowering every estimate would worsen the high months.

Training-prefix36 mean3.5556, variance4.8254, lag1 correlation0.0475, lag12 correlation0.2204; saved annual-evidence p0.5723 and strength0.0343 are weak. Prefix45 lag12 correlation is -0.0206, annual p0.6432, strength0.0213; selected October SARIMA(0,0,0)(1,0,0,12) seasonal coefficient -0.0223. Its 3.7248 estimate is close to the historical mean3.6889. Numerical acceptance of a seasonal parameter is not proof of meaningful annual seasonality.

The smooth, level-centred behavior and noisy changes are verified. Slow adaptation is a plausible description, but the evidence does not show a consistent exploitable lag rule or prove all jumps intrinsically unpredictable. The immediate prior count does not solve it: naive is worse on MAE/RMSE. The weak prefix correlations do not rule out every nonlinear signal.

| Method | Passes | MAE | RMSE | Positive MAPE % |
|---|---|---|---|---|
| SARIMA | 3/9 | 2.3891 | 2.8363 | 98.3639 |
| Partial pooling | 4/9 | 2.0720 | 2.6492 | 84.0470 |
| Training-mean Poisson | 4/9 | 2.0941 | 2.6303 | 81.0615 |
| Naive | 2/9 | 2.5556 | 3.1091 | 77.8660 |
| Seasonal naive | 1/9 | 3.5556 | 4.1096 | 165.9171 |
| SARIMA-default selector | 3/9 | 2.3012 | 2.7934 | 96.0585 |

Partial pooling and training mean look better retrospectively for this selection. The fixed selector captures only a small portion: still3/9 passes, MAE2.3012 and RMSE2.7934. Choosing partial pooling now just because its nine-month result is better would be post-hoc selection, not confirmation of a deployable improvement.

## Other struggling combinations

Largest primary SARIMA MAE, descriptive only:

| Disease | Barangay | MAE | RMSE | Positive MAPE % | Passes |
|---|---|---|---|---|---|
| Cough | Cansilayan | 2.6396 | 3.0447 | 76.5338 | 1/9 |
| Cough | Blumentritt | 2.5320 | 3.1241 | 112.4043 | 3/9 |
| Cough | Salvacion | 2.3891 | 2.8363 | 98.3639 | 3/9 |
| Cough | Caliban | 2.3808 | 2.9898 | 83.0749 | 2/9 |
| Hypertension | Alegria | 1.8193 | 2.3858 | 66.5378 | 3/9 |
| Influenza | Caliban | 1.7246 | 1.9311 | 72.2361 | 2/9 |
| Influenza | Blumentritt | 1.7180 | 2.0049 | 107.3798 | 2/9 |
| Infection all types | Salvacion | 1.5687 | 1.7567 | 67.1535 | 3/9 |

Cough dominates the largest absolute errors; its larger level and variability make cross-disease MAE ranks scale-dependent. Per-history zero/high/increase groups and signed errors are supplied in all-70-metrics-and-subgroups.csv rather than assuming the same cause for every high-MAPE selection. descriptive-winners-not-selection.csv lists retrospective minima only; neither rankings nor winner labels drive selection.

## Difficult-month performance

| Actual-count group | Method | Passes / targets | MAE | RMSE | Bias |
|---|---|---|---|---|---|
| zero | SARIMA | 10/119 | 1.4913 | 1.5957 | 1.4913 |
| zero | Partial pooling | 16/119 | 1.4932 | 1.5524 | 1.4932 |
| zero | Training-mean Poisson | 0/119 | 1.5576 | 1.5885 | 1.5576 |
| zero | SARIMA-default selector | 13/119 | 1.4916 | 1.5964 | 1.4916 |
| one_two | SARIMA | 310/358 | 0.6701 | 0.8815 | 0.2218 |
| one_two | Partial pooling | 330/358 | 0.5953 | 0.7621 | 0.2504 |
| one_two | Training-mean Poisson | 340/358 | 0.5899 | 0.7242 | 0.2101 |
| one_two | SARIMA-default selector | 313/358 | 0.6358 | 0.8368 | 0.2284 |
| three_plus | SARIMA | 32/153 | 1.9971 | 2.3479 | -1.8342 |
| three_plus | Partial pooling | 27/153 | 1.9430 | 2.2672 | -1.7703 |
| three_plus | Training-mean Poisson | 27/153 | 1.9639 | 2.2976 | -1.7971 |
| three_plus | SARIMA-default selector | 30/153 | 1.9925 | 2.3522 | -1.8264 |
| sudden_increase | SARIMA | 5/58 | 2.7804 | 3.0692 | -2.7804 |
| sudden_increase | Partial pooling | 3/58 | 2.6486 | 2.9587 | -2.6470 |
| sudden_increase | Training-mean Poisson | 3/58 | 2.6906 | 3.0016 | -2.6888 |
| sudden_increase | SARIMA-default selector | 4/58 | 2.7963 | 3.0935 | -2.7963 |

Sudden increase means actual minus preceding month >=3 AND actual >=2 times preceding month, fixed as a research stratum, not an outbreak definition. It overlaps the3+ group and must not be added to the other groups. The selector improves zero hits10→13 and ordinary hits310→313, but zero MAE/RMSE are very slightly worse and sudden-increase MAE/RMSE worsen. All58 sudden-increase selector predictions are underestimates. A few extra passes are therefore not a general solution to zeros or spikes.

## All70 comparisons

Improved means lower MAE AND RMSE, no fewer tolerance passes and no reduced availability versus SARIMA; worsened is the converse. Other cases are mixed/inconclusive. These are descriptive classifications, not significance findings.

| Protocol | Challenger | Improved | Worsened | Mixed / inconclusive |
|---|---|---|---|---|
| 80_20 | Partial pooling | 39 | 15 | 16 |
| 80_20 | Training-mean Poisson | 41 | 15 | 14 |
| 80_20 | Naive | 9 | 31 | 30 |
| 80_20 | Seasonal naive | 6 | 37 | 27 |
| 80_20 | SARIMA-default selector | 19 | 25 | 26 |
| 70_30 | Partial pooling | 41 | 13 | 16 |
| 70_30 | Training-mean Poisson | 43 | 12 | 15 |
| 70_30 | Naive | 6 | 29 | 35 |
| 70_30 | Seasonal naive | 6 | 31 | 33 |
| 70_30 | SARIMA-default selector | 19 | 25 | 26 |

The selector improves19, worsens25 and is mixed for26. Counts are the same in both protocols because its early secondary origins default to SARIMA. This is not an independent replication. selection-audit.csv records every decision, earlier validation origins, comparison errors and actual chosen method.

## Supported causes and limits

1. **Low-count percentage sensitivity:** a two-case error at actual1 is200%, while the same error at actual10 is20%. Positive-only MAPE excludes zeros rather than concealing the exclusion. MAE/RMSE show the case-count consequences. [Forecasting: Principles and Practice, accuracy measures](https://otexts.com/fpp3/accuracy.html).
2. **Mean estimates versus random realizations:** both SARIMA and pooled conditional means tend toward ordinary counts; low and high realizations can deviate substantially. Near-zero overall bias does not mean accurate month-by-month predictions.
3. **Weak demonstrated seasonality and short histories:** only31–36 initial months and limited earlier validation errors support order/method selection. Seasonal coefficients are fitted, but their presence does not establish predictive seasonal evidence. No new per-history parameter search was run.
4. **Generation structure:** inspected generator source uses independent Gamma random month weights, occasional random multiplier shocks, seasonal profiles and fixed-budget multinomial allocations. Cough has a flat specified seasonal profile. There is no recursive lagged-count mechanism or exported advance shock signal. Fixed quotas induce dependence, so this is not exactly independent Poisson data. The later92 ITR entries do not turn the full history into a verified clinical series. These facts support a missing-information limitation but do not prove an accuracy ceiling or identify individual jumps' causes.
5. **Pooling reduces some estimation noise:** sharing disease-level effects across seven barangays improves average errors here. But gains over the simple mean are small; primary high-month passes are lower. Information sharing does not recover unobserved shock drivers.
6. **Earlier errors are an unreliable winner signal in this small sample:** the fixed rule gives mixed individual results and fails the review screen. No threshold or window retuning was attempted after observing scores.

The reused pooling fit's residual Ljung–Box values are approximate descriptive warnings, not rejection gates in its frozen specification. 25 of150 selected fits carry residual warnings; maximum saved gradient is9.873e-8 and maximum Hessian condition is44.83. All150 selected fits meet its saved numerical acceptance checks (gradient<=1e-4, positive Hessian eigenvalue, condition<=1e10 and interior dynamic coefficient). This does not certify calibration or the correctness of a distribution. Original SARIMA acceptance and numerical seasonal fits were preserved.

## Decision and next steps

**KEEP CURRENT SARIMA.** Complete coverage passes, but the selector fails the fixed5% primary MAE/RMSE improvement screen against both SARIMA and the training mean, secondary nonworsening against the mean, and high/sudden-group hit safeguards. The screen is a research convention, not a clinical or panel-approved universal threshold. Even passing would only permit further review.

No new algorithm search or application change is justified by this investigation. Keep the installed70 SARIMA estimates and each combination's honest historical metrics. Preserve the partial-pooling challenger as evidence; do not label its outputs SARIMA or transplant its pooled score to a dropdown.

If future comparison is pursued, freeze the current competing policies and register an evaluation on genuinely uninspected observations with verified monthly coverage. Archive predictions before outcomes are known, retain failed forecasts, score complete requests and difficult groups, and account for shared months and related barangays. Specify precision/event-count goals beforehand rather than stopping at a favorable percentage. More synthetic scenarios can test software robustness but cannot establish real-world validity. [Rolling forecasting origins](https://otexts.com/fpp3/tscv.html).

## Metric definitions

For actual y and unrounded prediction p, error e = p - y. On N available targets, MAE = sum(abs(e))/N, RMSE = sqrt(sum(e squared)/N), and signed bias = sum(e)/N. Positive-only MAPE = 100 * sum(abs(e)/y over y>0)/N_positive; zero actuals are excluded and disclosed. A tolerance pass satisfies abs(e) <= max(1, 0.20*y). Within tolerance = 100*passes/N; availability = 100*N/attempts. Empty groups are unavailable, never zero error. Raw exact matches use a numerical equality tolerance of1e-10; nearest-integer exact matches are reported separately and do not change continuous-value evaluation.

For Cough/Salvacion, the nine percentage errors sum to885.2753%; dividing by9 gives98.3639%. Three tolerance passes divided by9 give33.3333%, a different quantity. Neither percentage is the probability of future cases.

## Verification and reproducibility

12 unit tests cover prefix cutoffs, future-data invariance, fixed selection requirements, missing outputs, zero MAPE, tolerance and exact-match distinctions. Independent JavaScript recomputation checks9,660 historical method-target rows,1,050 decisions,4,200 individual group summaries,60 pooled summaries and420 October method-scope outputs. Python matches8,400 reused source rows and150 native fits to their training histories. No fitting was necessary. Chart figures show measured saved results, not UI fixtures.

Run `python test_analysis.py`, `python analyze.py`, `node verify.cjs`, `python deliver.py` from this directory; Charts are standalone SVG files generated with Python standard libraries. Analysis and verification also use standard libraries. See verification logs, protected-after.json, native-diagnostic-check.json and archive-verification.json for exact preservation and integrity checks. All research remains isolated; only shared coordination and the new report are added to the project docs. No full application/browser/database test is claimed because the application is unchanged.

Files: historical-all-targets.csv (every prediction/error), all-70-metrics-and-subgroups.csv, all-70-comparisons.csv, SARIMA-descriptive-rankings.csv, training-diagnostics.csv, selection-audit.csv, october-all-70.csv, cough-salvacion-nine-months.csv, POLICY.md, policy-freeze.json, final-decision.json, independent-verification.json and the verified ZIP. The primary and secondary rows intentionally overlap; do not pool them.


## Local evidence location

[Full isolated evidence](<C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/forecast-021-targeted-errors-20261102/REPORT.md>) · [Verified ZIP](<C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/forecast-021-targeted-errors-20261102/verified-FORECAST-021-evidence.zip>)
