# Exploratory model challengers v1

Two independent challengers, fixed before this run. All evaluation outcomes have been inspected in earlier research. No model selection uses these evaluation scores.

## SARIMA count challenger

Keep the saved one-step SARIMA output from each origin. Estimate one disease-level, zero-intercept ridge coefficient for its one-step residual (actual minus SARIMA mean) against the average change from month t-2 to t-1 among the six other barangays. This tests whether a disease-wide rise propagates with a lag. It shares evidence across barangays and avoids double-counting the target's own recent history. The signed correction is symmetric to allow either persistence or reversal. Use expanding origins 31 through t-1 with available SARIMA estimates, requiring at least 28 pairs across 5 origins and 5 barangays. Fix the ridge penalty to 7 in squared-case feature units, equivalent to seven unit-feature observations favoring no correction. Use max(0, SARIMA mean + coefficient * neighbor change). Preserve missing SARIMA outputs as missing. No new SARIMA template selection or fit and no target-month feature.

## COM-Poisson challenger

Keep the original conditional-pooled disease-level log dispersion for each origin as the center. Estimate a barangay-specific log dispersion by minimizing earlier same-disease, same-barangay negative log likelihood plus (log nu - log nu_disease)^2 / (2 * 0.5^2). A fixed 0.5 log-scale shrinkage standard deviation penalizes deviations from the pooled value. The pooled center is itself trained on the disease's prior pairs, including the barangay. This is penalized partial pooling around an empirical center, with no claim of estimating a hierarchical posterior. Use at least 3 positive-mean earlier pairs in the barangay. A zero mean with a positive observed count makes the fit unavailable. Keep the frozen SARIMA mean and rounded-count event in both distributions. Use frozen distribution and scoring math, dispersion bounds 0.05 to 100, bounded scalar optimization and the frozen acceptance checks on the penalized objective. No silent fallback on unavailable fits. Optimization uses no target observation.

## Evaluation

Use the same 70 scopes and expanding one-month predictions, January to September 2026 (primary 36/9), and the 31/14 window as a nested availability check. Both challengers intentionally lack dispersion or correction training at origins 31 through 35, so matched secondary scores reuse primary months. October forecasts have no outcome. All scoring uses common targets per objective. Report availability separately on all attempts. Report sudden increases using the earlier +2 case subgroup and the stricter +3 cases and at least double definition. These are outcome-defined descriptive strata. Report underprediction, event reliability in fixed deciles, and interval coverage, width and mass with paired wider/narrower counts. Examine Cough and per-scope differences. No tuning or promotion based on this retrospective experiment.

The existing source includes only reviewed aggregate demonstration counts. No clinical, weather or reporting-delay data are introduced. Predictor values and earlier prediction/outcome pairs are reconstructed chronologically from the frozen snapshot. Dependence across barangays and only nine matched months limit the evidence.

Method reference: [Huang (2017), mean-parametrized COM-Poisson](https://arxiv.org/abs/1606.03214).

