# FORECAST-019 — Disease-specific partial pooling

Completed 31 October 2026 by CODEX-1. Isolated exploratory research; **KEEP CURRENT SARIMA. Do not integrate this candidate.**

## Decision and dataset

Sharing information across barangays modestly reduced errors on common available targets. It did not establish a reliable secondary method: primary availability fell to 462/630, October availability to 56/70, gains over a simple training-mean Poisson baseline were small, and high-count/increase performance remained weak. This does not prove partial pooling can never help. Numerical stopping failures prevented a complete evaluation of this particular frozen policy.

The owner's FINAL primary dataset is the combined **5,592 cases, 3,150 monthly records, 70 histories, 45 months January 2023–September 2026**. The original 5,500-case data remain archived and were not substituted or scored as the primary dataset.

- Dataset: `C:\Users\User\Downloads\Final proj\proposal\server\data\combined-sarima-5592\SYNTHETIC_monthly.csv`
- Dataset SHA-256: `6fa6851e203b07fe6ac6bd4013bce7dd9fa601dda7071bb23b42d1b1e7689b36`
- Saved SARIMA snapshot: `C:\Users\User\Downloads\Final proj\proposal\server\data\combined-sarima-5592\snapshot.json`
- Snapshot SHA-256: `80929aa8c714e8594867b38b5a4102c84e55e6fb57a5c747794af5eb23ecff9d`
- Verified original-on-this-dataset primary benchmark: **352/630 = 55.8730%**, MAE 1.147492567 and RMSE 1.503777106. The older 350/630 belongs to 5,500 cases; it is not this experiment's baseline.

The dataset is largely generated counts plus 92 ITR-derived entries. Their presence is preserved, but clinical classification, duplicate consultations/case uniqueness and complete monthly reporting have not been independently established. This experiment neither authenticates those records nor treats all 5,592 cases as real patient observations. No source counts were edited.

## Frozen method and leakage controls

Exactly one specification was evaluated separately for each disease across its seven barangays:

`log(mu[b,t]) = intercept + area_effect[b] + beta*log(1+y[b,t-1]) + s*sin(2*pi*t/12) + c*cos(2*pi*t/12)`.

Seven area effects sum to zero (six orthonormal Helmert coefficients), preserving area differences while shrinking them toward the disease level. Fixed Gaussian penalties have scales 0.5 for area contrasts and 0.35 for lag/harmonic coefficients; intercept is unpenalized. This is a penalized conditional/MAP count regression with fixed regularization, **not** a fitted random-effect variance or full Bayesian posterior. The annual terms are permitted features, not evidence of significant annual seasonality. This secondary method is not SARIMA.

Poisson versus NB2 was decided once from the earliest 31-month training prefix per disease. NB2 required Pearson dispersion >1.25 and estimated dispersion alpha >=0.05; family was locked thereafter. Each subsequent origin refitted coefficients using only that disease's preceding months. Only lagged own-area counts and deterministic calendar terms enter the prediction; no target-month peer counts, future observations, other diseases or weather are used. Accepted initial dispersion values ranged approximately 0.899–1.184: all eight successfully initialized diseases selected Poisson. Two initial fits failed numerically. Consequently this run does not show that NB is inferior; it did not qualify under the predefined training rule.

`POLICY.md` and model/runner/scoring sources were SHA-256 frozen before fitting. Primary uses origins 36–44 (nine test months); secondary uses 31–44 (14). Overlapping origins are reused, not represented as independent confirmation. October uses all 45 observed months. Test targets have been inspected before; all comparisons are exploratory.

## Numerical failures and diagnostics

There were 150 scheduled disease-origin requests, of which 108 accepted, 14 rejected the preliminary optimizer gradient, and 28 skipped after initial family selection was unavailable. There were **122 actual optimization calls**, not 150 successful fits. Each disease fit affects seven barangay outputs.

At origin 31, Cough's maximum absolute penalized gradient was 0.000276019 and Fever unknown origin's was 0.000178997, exceeding the frozen 0.0001 requirement. Their Hessian condition numbers were only about 43.95 and 13.04. L-BFGS-B reported function-reduction convergence before meeting the separate gradient safeguard. The other 12 preliminary failures had gradients about 0.000109–0.000299. The two initial failures made all later outputs for those diseases unavailable under the registered family-lock rule. No retry or post-result relaxation was performed.

This is principally a **numerical stopping and failure-propagation limitation**, not evidence that these two diseases cannot be modeled. SciPy documents separate function-reduction and gradient stopping conditions; optimizer `success` alone does not establish the required gradient accuracy. [SciPy L-BFGS-B documentation](https://docs.scipy.org/doc/scipy/reference/optimize.minimize-lbfgsb.html).

Accepted fits also required finite coefficients/predictions, positive Hessian, condition <=1e10, lag coefficient away from the +/-0.95 boundary, and finite bounded linear predictors. Eighteen of 108 accepted fits had at least one descriptive Ljung–Box residual warning. Those tests use 12 degrees of freedom without adjustment for fitted/regularized parameters or multiple comparisons; they are approximate warnings, not proof of white noise. Full per-area lag-1/lag-12 residual diagnostics and covariance matrices remain in `fits/`. Shared observations and regularization also limit naive parameter-significance interpretation. No SARIMA root, convergence or residual rule was changed.

## Full request results

Within-limit percentage below divides by **produced forecasts**. Different produced sets make their MAE/RMSE rows unsuitable for direct superiority claims; see the matched comparison next. Missing predictions are never zeros.

### Primary 80/20: full request accounting

| Method | Produced / requested | Passes / produced | Within limit | MAE | RMSE | Positive-only MAPE | Signed bias | Exact hits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SARIMA | 630/630 | 352/630 | 55.87% | 1.1475 | 1.5038 | 52.24% | -0.0377 | 158 |
| Partial pooling | 462/630 | 285/462 | 61.69% | 1.0026 | 1.2793 | 45.41% | 0.0206 | 137 |
| Training-mean Poisson | 630/630 | 367/630 | 58.25% | 1.1064 | 1.4341 | 47.47% | -0.0229 | 177 |
| Naive | 630/630 | 384/630 | 60.95% | 1.4825 | 2.0717 | 76.25% | -0.0095 | 167 |
| Seasonal naive | 630/630 | 363/630 | 57.62% | 1.5111 | 2.0292 | 78.02% | -0.0540 | 145 |

### Secondary 70/30: full request accounting

| Method | Produced / requested | Passes / produced | Within limit | MAE | RMSE | Positive-only MAPE | Signed bias | Exact hits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SARIMA | 980/980 | 538/980 | 54.90% | 1.1696 | 1.5120 | 53.83% | 0.0207 | 237 |
| Partial pooling | 700/980 | 411/700 | 58.71% | 1.0293 | 1.2948 | 45.21% | 0.0380 | 202 |
| Training-mean Poisson | 980/980 | 551/980 | 56.22% | 1.1213 | 1.4289 | 48.34% | 0.0214 | 261 |
| Naive | 980/980 | 602/980 | 61.43% | 1.4480 | 1.9926 | 74.58% | 0.0112 | 252 |
| Seasonal naive | 980/980 | 570/980 | 58.16% | 1.5153 | 2.0195 | 79.05% | 0.0316 | 220 |


Partial pooling's primary 285/462 = 61.69% is **not** 61.69% success across all 630 requests: 285/630 = 45.24%, with 73.33% availability. Secondary is 411/700 = 58.71%; 411/980 = 41.94% across requests, with 71.43% availability. SARIMA retains 100% request coverage. Current October outputs: SARIMA 70/70, partial pooling 56/70; all three simple comparators 70/70. Experimental outputs have not replaced any installed forecasts.

## Fair comparisons on the same months

### Primary 80/20: identical available targets

| Method | Produced / requested | Passes / produced | Within limit | MAE | RMSE | Positive-only MAPE | Signed bias | Exact hits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SARIMA | 462/462 | 267/462 | 57.79% | 1.0585 | 1.3490 | 50.48% | -0.0145 | 116 |
| Training-mean Poisson | 462/462 | 282/462 | 61.04% | 1.0163 | 1.2892 | 45.22% | 0.0047 | 135 |
| Naive | 462/462 | 301/462 | 65.15% | 1.3333 | 1.8458 | 75.37% | 0.0130 | 129 |
| Seasonal naive | 462/462 | 279/462 | 60.39% | 1.3658 | 1.7783 | 76.23% | -0.0281 | 107 |
| Partial pooling | 462/462 | 285/462 | 61.69% | 1.0026 | 1.2793 | 45.41% | 0.0206 | 137 |

### Secondary 70/30: identical available targets

| Method | Produced / requested | Passes / produced | Within limit | MAE | RMSE | Positive-only MAPE | Signed bias | Exact hits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SARIMA | 700/700 | 393/700 | 56.14% | 1.0972 | 1.3866 | 51.55% | 0.0019 | 172 |
| Training-mean Poisson | 700/700 | 409/700 | 58.43% | 1.0422 | 1.3078 | 44.90% | 0.0032 | 200 |
| Naive | 700/700 | 452/700 | 64.57% | 1.3243 | 1.8083 | 72.59% | 0.0300 | 192 |
| Seasonal naive | 700/700 | 422/700 | 60.29% | 1.3957 | 1.8154 | 77.16% | 0.0386 | 157 |
| Partial pooling | 700/700 | 411/700 | 58.71% | 1.0293 | 1.2948 | 45.21% | 0.0380 | 202 |


Primary partial pooling reduced MAE by 5.28% and RMSE by 5.16% versus SARIMA on 462 identical targets. Against the training-mean Poisson baseline, reductions were only **1.35% and 0.77%**, with three additional passes (285 versus 282). Secondary matched reductions versus SARIMA were 6.19%/6.61%; versus Poisson 1.23%/0.99%. These are descriptive differences, not significance claims.

Naive and seasonal-naive have higher MAE/RMSE but often more within-limit hits. This is possible: the threshold score ignores the size of errors once they exceed the limit, whereas RMSE penalizes large misses. No single percentage establishes the best model. Missing Cough and Fever histories make the available-target subset easier/different than the complete task.

Across 70 combinations, the frozen coverage-aware classification versus SARIMA is **15 improved, 52 worsened, 3 mixed/inconclusive** under primary; secondary **9 improved, 58 worsened, 3 mixed**. Worsened includes any loss of forecast availability, even when errors on remaining months improved. Against training-mean Poisson, primary is 10 improved/57 worsened/3 mixed; secondary 8/62/0. Per-combination comparisons include every requested target and are in `all-70-metrics.csv` and `classifications.csv`; no individual winners were selected for deployment.

## Zero months, high counts and sudden changes

| Primary matched group | Targets | SARIMA passes | Partial-pooling passes | SARIMA MAE | Partial MAE | SARIMA bias | Partial bias |
|---|---:|---:|---:|---:|---:|---:|---:|
| zero | 94 | 8 | 10 | 1.4655 | 1.4933 | 1.4655 | 1.4933 |
| one_two | 283 | 251 | 272 | 0.6057 | 0.5208 | 0.1250 | 0.1576 |
| three_plus | 85 | 8 | 3 | 2.1160 | 2.0641 | -2.1160 | -2.0641 |
| sudden_increase | 35 | 1 | 1 | 2.7555 | 2.5799 | -2.7555 | -2.5799 |

Sudden increase was fixed as actual-minus-previous >=3 AND actual >=2*previous. It is a retrospective subgroup for evaluation, not a model input or medical alert threshold. It overlaps the 3+ group and must not be added to the other groups.

Most of the primary hit gain came from 1–2 case months (272 versus 251). For zeros, passing targets increased by two but average error slightly worsened. For 3+ counts, average errors improved modestly but passing targets fell from eight to three. The candidate still overpredicts zeros and underpredicts high months; it did not solve prediction of which month will spike. Sudden-increase passes stayed **1/35**, despite a modest error reduction. Shrinkage toward typical counts explains much of the central-count success; sharing seven histories did not reveal a reliable precursor to jumps.

## Probabilities and calibration

| Protocol / method (matched targets) | Zero Brier | 3+ Brier | Increase Brier | NLL | RPS | 95% coverage | Mean width |
|---|---:|---:|---:|---:|---:|---:|---:|
| 80_20 / Training-mean Poisson | 0.1634 | 0.1534 | 0.0654 | 1.5711 | 0.6807 | 98.05% | 4.3463 |
| 80_20 / Partial pooling | 0.1605 | 0.1543 | 0.0661 | 1.5615 | 0.6734 | 98.70% | 4.3636 |
| 70_30 / Training-mean Poisson | 0.1739 | 0.1605 | 0.0635 | 1.5919 | 0.6993 | 97.86% | 4.3429 |
| 70_30 / Partial pooling | 0.1714 | 0.1600 | 0.0644 | 1.5802 | 0.6903 | 98.57% | 4.3943 |

Lower Brier, negative log loss (NLL) and ranked probability score (RPS) are better. These rows compare the same 462 or 700 targets. Poisson plug-in probabilities are mathematically coherent conditional on estimated parameters; they omit coefficient uncertainty and do not establish calibrated real-world occurrence chances. No count distribution was invented for the saved Gaussian SARIMA or deterministic naive forecasts.

Zero-event Brier, log score and RPS improved modestly over Poisson baseline. Primary 3+-event Brier worsened, and sudden-increase Brier worsened in both splits. High interval coverage with a range roughly four cases wide in a low-count problem does not establish accurate point estimates. Discreteness and conservatism also affect nominal 95% coverage.

Primary candidate calibration (fixed bins; empty bins omitted):

| Event / fixed probability bin | n | Mean predicted probability | Observed event rate |
|---|---:|---:|---:|
| zero / 0.0–0.2 | 177 | 15.93% | 18.08% |
| zero / 0.2–0.4 | 274 | 25.25% | 20.80% |
| zero / 0.4–0.6 | 11 | 45.24% | 45.45% |
| high / 0.0–0.2 | 238 | 15.06% | 17.23% |
| high / 0.2–0.4 | 210 | 25.78% | 19.05% |
| high / 0.4–0.6 | 14 | 45.18% | 28.57% |
| increase / 0.0–0.2 | 408 | 5.26% | 6.13% |
| increase / 0.2–0.4 | 50 | 26.16% | 16.00% |
| increase / 0.4–0.6 | 4 | 43.55% | 50.00% |

Calibration bins have limited support, especially rare increases; they must not be interpreted as a certified probability for a particular disease/barangay. Detailed bins for both splits are saved. Only 9 or 14 tests exist per combination. No 70%/80% guarantee follows from these probabilities.

## Scoring definitions and reproducibility

For error e = prediction minus actual, on N produced targets: MAE = sum(abs(e))/N; RMSE = sqrt(sum(e^2)/N); bias = sum(e)/N. Positive-only MAPE = 100*mean(abs(e)/actual) for actual>0, with excluded zero counts recorded. A pass requires abs(e)<=max(1,0.20*actual). Within-limit percentage=100*passes/N; availability=100*N/requests. Exact hits use nearest-integer half-up floor(prediction+0.5) only for that explicitly separate score. No rounding precedes other scores. The error limit remains proposed, not asserted panel-approved.

Brier is mean((predicted event probability-event indicator)^2); NLL is mean(-log PMF(actual)); RPS sums (predicted CDF(k)-I(actual<=k))^2 across integer thresholds. Annual terms and model likelihood do not convert historical tolerance into the probability that a predicted count will happen.

Seven unit tests passed, covering analytic derivatives, Poisson/NB likelihoods, contrast constraints, future exclusion/calendar alignment, area-order invariance, zero-total handling and the NB Poisson limit. Independent Node verification recomputed 8,050 historical rows, 350 October rows, 2,898 probability distributions, 1,512 native mean equations, 216 native gradient checks (preliminary/selected Poisson copies counted separately), 830 metric summaries, 560 classifications and 160 calibration bins including the matched audit. Input hashes, training-prefix digests and frozen sources passed. One Windows worker stayed within the 512 MiB job limit and stopped normally; no background fitting remains.

**Analysis correction:** initial frozen `score.py` wired the decision gate to unequal produced sets, although its matched comparison CSV was correct. The independent audit corrected the gate using identical targets in `audit_matched.py` and `final-decision.json`; `results.json` and frozen source remain preserved as the original calculation. The apparent >=5% advantage over Poisson becomes FALSE (actual reductions 1.35%/0.77%). Matched probability gates were corrected likewise. Independent JS checks verify every final gate. The overall keep-SARIMA decision is unchanged. This is an arithmetic correction, not post-outcome tuning of a policy. Use `final-decision.json` as authoritative.

## Limitations and next decision

The combined dataset remains largely synthetic. Its original generator has independent random fluctuations and occasional jumps, not a known disease-transmission or weather process; fixed total-case allocation also creates dependence. A conditional count likelihood is an approximation. Adding 92 ITR-derived entries does not validate the generator or create independent prospective testing. The overlapping protocols and repeatedly inspected outcomes cannot establish confirmed generalization. Failure subsets are not missing at random. No external clinical validation has been claimed.

**Answers to the ten requested questions:** (1) partial pooling improves matched available-target errors, not full-service reliability; (2) MAE/RMSE reductions are real but modest versus simple Poisson; (3) zeros and high months remain poorly identified; (4) sudden increases remain mostly missed; (5) point errors beat naive methods, but their hit rates can be higher and the Poisson advantage is small; (6) improvements are not consistent across all 70 and coverage drops; (7) probabilities are coherent experimental estimates, not validated percentages; (8) synthetic generation and uncertain ITR completeness limit transfer; (9) this version is not suitable for integration; (10) retain installed SARIMA.

If further research is approved, first register a **numerical repair of this same objective**: use a solver/termination procedure verified against analytic gradient/Hessian and converged synthetic fixtures, while retaining the existing gradient and stability acceptance criteria. Assess it without choosing settings by forecast scores. Then rerun the frozen policy as a separately versioned exploratory evaluation, preserving this failure evidence. This may repair availability but provides no promise of better accuracy. It is not authorization to widen a model search or relax safeguards.

Any improvement claim needs a prospective protocol locked before genuinely unseen observations, timestamped predictions, confirmed reporting completeness and case definitions, sufficient zero/high/increase events, and uncertainty methods accounting for correlated months/areas. Do not treat a rerun of these same test months as new confirmation.

The application, frontend/backend, current SARIMA outputs, both original and combined datasets, operational MySQL, patient records and Azure were unchanged. Only isolated research artifacts and authorized shared documentation were created/updated. Genuine disease-data validation remains pending.
