# FORECAST-018 — Prediction failure root-cause investigation

CODEX-1 · 31 October 2026. Decision: preserve current SARIMA; address information and validation limitations before additional complexity. No model integrated, no data regenerated or modified.

## 1. Reconcile the benchmarks first

| Evidence | Cases in dataset | Primary passes | Zero months | 1–2 months | 3+ months |
|---|---:|---:|---:|---:|---:|
| Frozen original low-count policy A, FORECAST-005 | 5,500 | 350/630 =55.56% | 12/120 | 312/365 | 26/145 |
| Current combined-data run, FORECAST-015 (audited in016) | 5,592 | 352/630 =55.87% | 10/119 | 310/358 | 32/153 |

The supplied subgroup figures belong to the second row. They are not a decomposition of the frozen350 benchmark. The92 added ITR-derived entries alter71 monthly cells in32 histories;16 historical passes are gained and14 lost, yielding net+2. Both actual counts and fitted predictions can change. This is a dataset-change comparison, not evidence of an improved algorithm. Every pass flip is preserved in benchmark-pass-flips.csv. The separate retrospectively revised5,500-case scenario (previously reported61.59%) is neither of these two datasets and was not used here.

The original installed CSV SHA256 exactly matches the random-balanced5500 generator's frozen output: f015cb27a399c3bd3202d864e8474201746188252d3f7da7902ca9f96766cd27. Current combined CSV:6fa6851e203b07fe6ac6bd4013bce7dd9fa601dda7071bb23b42d1b1e7689b36. The original has660 zero cells; the combined has646 across all3,150 cells. The119/120 denominators refer only to primary test months, not the complete dataset.

## 2. Scope and evidence quality

Read actual generator/configuration, original and combined snapshot predictions, selection.py, engine.py, current fitting runner and prior studies. No generator was executed. Diagnostics use only initial31-month or36-month training prefixes, separately, on original and combined histories. We did not rank new forecasting algorithms on the outer test outcomes.

For correlations, target indices12..N−1 use only lagged predictors: previous month, prior3-month mean, prior3 minus preceding3-month mean, lag12, and the other six barangays' same-disease total at lag1. Each correlation uses only19 or24 matched pairs. These are descriptive Pearson associations, not causal effects or multiplicity-adjusted significance tests. Opposite associations can cancel in the median; per-history results are retained. The other six areas are peers, not a verified geographic adjacency network.

A small diagnostic check estimates zero/high/increase probabilities from empirical past frequencies. It operates at origins24..N−1 strictly inside each initial training period (490 or840 series-month targets), with no access to the next observation until scoring. Events: zero=0; high>=3; sudden increase=at least3 above previous and at least twice previous. These are descriptive groups, not clinical alert thresholds. Conditional frequencies use fixed categories and four pseudo-observations toward own-history prevalence; no category/weight search. Same-disease pooled prevalence is a separate comparator. Brier score=mean((estimated probability−event indicator)²), lower is better. These are probes of information, not a proposed production probability model or a calibrated occurrence percentage.

All months have been inspected in earlier research. Training-only computation prevents direct look-ahead in these probes, but does not make the research independent confirmation. The31/36 prefix experiments overlap; their results must not be combined as independent evidence. No clinical source verification of the92 entries was performed here.

## 3. Strongest evidence-backed cause: how the data was generated

generate.py lines18–21 draw45 independent Gamma weights (shape12, mean1; coefficient of variation about29%), multiply by fixed disease/month profiles and mild year factors, apply independent1.5% twofold weight shocks, then allocate each fixed disease/barangay quota across45 months with a multinomial draw. Two synthetic groups are added. Source quotas and all output cases are preserved.

There is no autoregressive recurrence from last month's cases, no infection-transmission network, no latent shared monthly outbreak signal, no rainfall observations, no population exposure dynamics and no reporting-completeness variable. Cough, Infection all types, Fever unknown origin, Hypertension and Vertigo have flat annual profiles. Influenza has the strongest imposed calendar pattern; URTI/ARI/AGE/skin profiles are mild. These are simulation assumptions, not measured Murcia disease behavior.

Consequences:

- Past counts can reveal approximate level and some calendar effects; they do not reveal the independently drawn future shock or multinomial realization.
- A large observed jump need not have resulted from the explicit shock branch: ordinary allocation noise can produce jumps too. Shock locations/weights were not exported, so this audit cannot label each observed jump as a specific simulated shock.
- Counts are NOT independent Poisson draws: fixed45-month quotas induce dependence across months, and fixed margins also couple area totals. Do not claim absolute independence or an exact theoretical accuracy ceiling. Knowing full-period quotas or random seeds would be privileged simulator information, not a legitimate operational predictor.
- This generator does not simulate clinical spread. More elaborate lag models cannot manufacture absent transmission signals. That is a limitation of this particular demonstration process, not proof that disease counts in Murcia are inherently unpredictable.

## 4. Measured training signals

Combined36-month prefix, median across70 histories:

| Available predictor | Median correlation with next count | Median absolute correlation |
|---|---:|---:|
| lag1 | -0.0519 | 0.1338 |
| mean3 | -0.0976 | 0.1750 |
| trend3 | 0.0098 | 0.1491 |
| lag12 | 0.0065 | 0.1365 |
| other_six_lag1 | 0.0393 | 0.1797 |

These are weak typical linear associations, with considerable per-series variation. They do not rule out nonlinear or disease-specific information. Only8/70 current histories at the36-month training cutoff and6/70 at31 months pass the saved harmonic/lag12 annual-evidence screen; the same counts occur in the original dataset. The previously reported6/70 at45 months is a different cutoff. Screen failure is uncertainty, not proof of no seasonality; passing numerical SARIMA checks is not proof of meaningful seasonal signal.

Median training variance/mean is about1.11 at36 months (original1.1044, combined1.1069) and1.07 for combined31 months. This is not strong blanket evidence for a highly overdispersed or structurally zero-inflated process. Heterogeneous levels and seasons also affect these ratios. Zeros are plausible at such low means; their existence alone does not justify a hurdle/zero-inflated model. Some individual histories may differ substantially.

Combined36-month training-only event probes:

| Conditioning information | Zero Brier | >=3 cases Brier | Increase Brier |
|---|---:|---:|---:|
| own_prevalence | 0.17641 | 0.18290 | 0.08482 |
| lag1 | 0.18479 | 0.18574 | 0.07974 |
| mean3 | 0.17740 | 0.18656 | 0.08433 |
| trend3 | 0.18411 | 0.18789 | 0.08600 |
| lag12 | 0.18387 | 0.18884 | 0.08772 |
| other_six_lag1 | 0.18028 | 0.18702 | 0.08546 |
| month | 0.17879 | 0.19080 | 0.08796 |
| disease_pooled_prevalence | 0.16971 | 0.17512 | 0.07941 |

All six individual conditioning channels worsen the zero and high-count Brier scores relative to own-prefix prevalence in this probe. The pooled disease prevalence improves them modestly. The31-month check shows the same pooled direction: zero0.17688→0.16993; high0.18404→0.17842; increase0.09383→0.08799. Full original/combined results are in signal-probe-summary.csv.

Lag1 helps the increase-event Brier score, but the event itself is defined relative to the previous count. A low starting count mechanically makes a relative increase easier. This is not evidence that lag1 predicts the magnitude or timing of an unexpected disease outbreak. Similarly, a pooled event frequency can improve probability estimation without identifying which next month will contain a zero or jump. No performance significance or reliable clinical event probability is established.

## 5. Model and information-loss assessment

**Separate fitting may waste level information.** Each series has only31–36 observations at initial evaluation and2–3 annual cycles; nine candidate templates are ranked using only three inner one-step errors, then compatible AICc and numerical safeguards. Three inner errors are a noisy ranking basis. Multiple seasonal parameters can fit random fluctuations. This is a plausible variance/selection limitation, not a newly proven code bug. Prior simpler-policy experiments did not establish a reliable overall improvement, so blindly reducing or increasing orders is not justified.

**Gaussian conditional-mean predictions and event hits differ.** The inspected engine uses pmdarima ARIMA/SARIMA with Gaussian state-space errors and clips negative point estimates at zero. It does not model a count-distribution probability of zero. With sparse noisy counts, a smooth positive mean can have acceptable squared error while missing actual zeros and jumps under the one-case tolerance. MAE, MAPE, hit rate and event probability optimize different questions. Do not round before scoring or change the error limit to conceal this.

**Pooled/hierarchical counts are justified for bounded research, not promotion.** Modest pooled-prevalence gains suggest stabilizing disease-level frequencies across seven areas may help. This is not proof that a hierarchical count model improves case estimates. Hierarchical area intercepts could share information without assuming identical rates; disease-specific seasonal coefficients could be partially pooled. Exchangeability is more plausible within a disease than across all ten categories. These labels include symptoms and chronic/noncommunicable conditions, so do not impose an infectious transmission model on every category. Equal-ish synthetic area quotas are not measured population exposures. A geographic/spatial term needs validated adjacency/contact/reporting evidence, not simply the other six areas. See the primary [surveillance methods paper](https://www.jstatsoft.org/article/view/v077i11) for the framework, not validation of this dataset.

**SARIMAX is technically possible but covariates are absent.** [Statsmodels SARIMAX](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.html) supports exogenous regressors. Candidate information could include lagged validated weather, reporting completeness, clinic attendance/testing volume, and known-calendar effects appropriate to a disease. Their availability and clinical rationale must be established first. Synthetic counts were not generated from measured weather; joining weather to these dates cannot establish a causal weather effect or real-world improvement. Future-month measured weather or completed reporting totals are not known at prediction time; using them retrospectively would leak. Use release-vintage lagged observations, or independently archived weather forecasts and propagate their uncertainty. [Statsmodels prediction documentation](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAXResults.get_prediction.html) describes out-of-sample regressor inputs. No predictor was collected, invented or fitted here.

## 6. Potentially fixable versus missing-information limits

| Finding | Evidence level | What can legitimately improve it | Remaining limit |
|---|---|---|---|
|350 vs352 confusion|Verified snapshot arithmetic|Version every result and dataset|Cannot attribute changed-data gains to model quality|
|Short separate series/noisy selection|Verified sample lengths and code; impact partly hypothetical|Partial pooling or stronger predeclared regularization|May mainly improve average level, not event timing|
|Weak annual/recent/peer signals|Measured training diagnostics and generator inspection|Use supported disease-specific information|No universal seasonal or neighbor signal established|
|Independent simulation shocks/allocation noise|Verified generator mechanism|Represent uncertainty honestly|History cannot reveal each random innovation; no exact accuracy ceiling inferred|
|Zero observations|Verified counts; not proven data errors|Distinguish true zero from missing reporting when source metadata exists|Do not replace or remove zeros by assumption|
|92 ITR-derived additions|Verified92-case difference, not clinical validation|Reconcile dates, categories, repeat visits and coverage with source records|Four-column CSV alone cannot prove unique cases or complete monthly capture|
|Unsupported future percentage interpretation|Known metric definition|Separate count estimate, uncertainty, historical error and calibrated event probability|55.87% is not chance that cases occur|

## 7. Separate early-warning detection assessment

A detection feature can be useful after new reports arrive: compare current observed counts with a prespecified expected distribution and flag an unusual observation for MHO review. It is not advance prediction of an unobserved random jump. Monthly data can detect only after that month's reporting is sufficiently complete; timely weekly/daily reporting would be a different data pipeline and needs separate authorization. Clinical adjudication, reporting-delay checks and false-alert workload matter. No automated outbreak declaration.

Primary [aberration-detection research](https://pmc.ncbi.nlm.nih.gov/articles/PMC6736430/) evaluates surveillance detection methods separately. It does not establish suitable thresholds for Murcia. Use frozen thresholds, log alert precision/false positives and detection delay against independently adjudicated events. The existing lack of verified outbreak labels prevents claiming sensitivity/specificity now. This is an assessment only, not a third model-development experiment or an implemented feature.

## 8. At most two proposed research directions

**Direction1 — disease-specific partial pooling for low-count uncertainty.** Predefine one parsimonious hierarchical count specification with area intercepts and shared disease-level information; keep SARIMA unchanged as the required reference. Choose Poisson versus modest overdispersion from training-only diagnostics under a frozen rule, not test-score shopping; do not assume extra zeros are structural. No rich spatial lag without evidence. Assumptions: comparable reporting and related disease-specific area rates; risks: overshrinkage of exceptional barangays, misleading synthetic similarity, parameter/interval miscalibration. Objective: better zero/high-count probabilities and case errors, not just tolerance hits. Current evidence justifies research into information sharing, not a production replacement or a claim of70–80%.

**Direction2 — a narrowly specified SARIMAX information test when genuine origin-available covariates exist.** Preselect at most one or two disease-appropriate lagged covariates after source/reporting review; retain seasonal period12 and the existing numerical safeguards. Compare the same base model with and without those inputs. Freeze their release timing, lag, missingness handling and training scaling. Assumptions: the predictor actually precedes cases, is consistently recorded and has stable association; risks: reporting confounding, delayed releases, chance correlation, future-regressor leakage and extra estimation variance. Do not manufacture covariates or use generator seed/shock flags as features. Until usable covariates exist this direction is conditional, not a runnable improvement claim.

**Prospective evaluation plan for both:** register the final method, endpoint, all70 selections, scoring, eligibility and failure handling before opening any new outcomes. Keep original350/630 and current352/630 locked. Use newly collected, verified chronological observations that were not used to design/tune any method; a fresh random split of old months is not independent. Preserve publication/reporting vintages and distinguish missing from zero. Timestamp each one-month prediction before the target month; archive SARIMA, fixed training mean and seasonal-naive references on identical targets. Report MAE/RMSE, positive-only MAPE with zero exclusions, fixed within-tolerance rate, coverage, signed bias, zero/high/increase strata, probability Brier/calibration and interval coverage/width where legitimately available. A full new annual cycle is desirable for seasonal assessment, but12 months is not automatically sufficient: assess needed precision/event counts beforehand, and report inconclusive rare-event results rather than optional stopping. Account for common month effects and related areas when estimating uncertainty; do not treat70 simultaneous forecasts as independent replicates. Do not tune after each disappointing month. Predictive testing may continue using synthetic data, but such results must remain synthetic evidence, not genuine disease validation.

## 9. Verification, files and limitations

Independent Node verification recalculated63,840 training-only diagnostic probability rows,96 Brier summary groups,1,400 lag correlations and both historical benchmark pass totals. Original generator output matches installed original CSV by SHA256. All protected application, dataset and research-source hashes are unchanged. No statistical model fitting, data generation, application edits, MySQL access or Azure operations occurred. All source histories and previous experiments remain preserved; no new browser tests were needed or claimed.

Files: policy.json (diagnostic definitions/source hashes), investigate.py, verify.cjs, training-diagnostics.csv (280 initial-prefix histories), correlation-summary.csv, training-event-probes.csv, signal-probe-summary.csv, benchmark-pass-flips.csv, changed-histories.csv, results.json and verification.json. Small diagnostic probes do not exhaust all nonlinear signals or prove impossibility. Original ITR images, weather availability and clinical outbreak labels were not independently verified in this investigation. The appropriate conclusion is limited demonstrated information and noisy low-count estimation—not that the capstone software is broken or that improvement is guaranteed.
