# Health-Intel prediction defense guide

7 November 2026 · CODEX-1 · Frozen conditional-pooled COM-Poisson preview · October 2026 demonstration estimates from history through September 2026.

Use this guide to explain the prototype and its measured evidence. All 6,200 cases belong to a synthetic demonstration scenario that includes ITR-derived entries. The guide contains saved historical and October model outputs. New verified monthly outcomes remain necessary for real-world validation.

## 1. What to say to the panel

“Health-Intel lets MHO select one disease and one barangay. SARIMA uses their monthly history to estimate the next month’s case count. A second method, conditional-pooled COM-Poisson, assigns experimental probabilities to different possible counts. We evaluated the probabilities on identical historical months and tested that all 70 selections display their own results correctly.”

“For Cough in Salvacion, SARIMA estimates approximately four cases. The probability model assigns 32.27% to exactly four, and 79.89% to any count from three through five. The second event includes three possible outcomes, so its probability is larger. The separate 77.78% historical score means seven of nine earlier count predictions met our proposed error limit.”

“These results support a capstone research preview. Some selections became worse with pooling, and Cough still has weaker calibration. We froze one policy across all 70 and will save predictions before comparing them with new MHO-confirmed outcomes.”

## 2. What each model does

| Part | Plain explanation | What it produces |
| --- | --- | --- |
| SARIMA | Uses earlier counts and estimated lag/seasonal relationships to predict a monthly series. The saved nine-template policy uses training data for selection. | An expected count, such as 3.7853; the screen rounds it to 4. |
| Seasonal period 12 | Allows relationships with the same time of year. Passing numerical checks alone does not establish a strong yearly pattern. | A modeling assumption whose evidence varies by selection. |
| Conditional-pooled COM-Poisson | Learns the spread of earlier SARIMA prediction errors for one disease across seven barangays. Uses earlier accepted prediction/outcome pairs only. | A distribution of possible counts around the unchanged SARIMA mean. |
| Disease pooling | Shares a dispersion parameter across barangays for the same disease. At least 28 informative earlier pairs, five origins and five barangays are required. | More information for spread estimation, with a risk of hiding local differences. |

The mean-parametrized COM-Poisson assigns P(Y=k)=exp(kθ−ν ln(k!))/Z, where Z sums those weights over all nonnegative integers. θ is solved so that the distribution mean equals SARIMA’s nonnegative unrounded mean. The frozen dispersion ν controls spread. The preview solves this parametrization with the saved ν; it never optimizes a new dispersion.

Exactly N uses one probability mass, P(Y=N). Nearby counts use the sum from max(0,N−1) through N+1. A model interval uses cumulative probabilities. Because counts are integers, a central interval can include more probability mass than its nominal 80% or 95% label.

## 3. Read the four kinds of numbers

| Display | Meaning |
| --- | --- |
| Predicted cases | SARIMA’s rounded expected monthly count. All evaluation uses the unrounded prediction. |
| Exactly N / N±1 probability | Experimental probability assigned by conditional-pooled COM-Poisson to that specified event. |
| 80% / 95% model interval | Bounds derived from the same experimental count distribution. |
| Historical within-limit score | Passing earlier predictions ÷ available earlier predictions ×100. Always show the denominator and unavailable results. |
| Availability | Produced predictions ÷ requested predictions ×100. Availability measures whether an output exists. |
| Calibration | Checks whether events assigned a probability happen at roughly that frequency over many recorded predictions. |

The demonstration has 3,150 monthly records, 70 histories and 45 months per history. Primary evaluation begins with January 2023–December 2025, then predicts each month January–September 2026 one step ahead using observations available at that origin. An expanding walk-forward test can use an earlier test month only after it has occurred. October is the saved future example. Clicking Predict loads this frozen version.

## 4. Actual error calculations for Cough / Salvacion

| Month | Actual | Predicted | Absolute error | Allowed error | Result |
| --- | --- | --- | --- | --- | --- |
| 2026-01 | 3 | 3.4690 | 0.4690 | 1.0000 | Pass |
| 2026-02 | 5 | 4.6748 | 0.3252 | 1.0000 | Pass |
| 2026-03 | 3 | 4.9939 | 1.9939 | 1.0000 | Outside limit |
| 2026-04 | 3 | 3.8301 | 0.8301 | 1.0000 | Pass |
| 2026-05 | 4 | 3.6040 | 0.3960 | 1.0000 | Pass |
| 2026-06 | 4 | 3.8652 | 0.1348 | 1.0000 | Pass |
| 2026-07 | 4 | 3.7813 | 0.2187 | 1.0000 | Pass |
| 2026-08 | 4 | 3.8771 | 0.1229 | 1.0000 | Pass |
| 2026-09 | 5 | 3.8822 | 1.1178 | 1.0000 | Outside limit |

Absolute error = |prediction − actual|. Allowed error = max(1 case, 0.20 × actual). Here, 7 of 9 predictions pass. Historical within-limit performance = 7 ÷ 9 ×100 = 77.78%. Availability = 9 ÷ 9 ×100 = 100%. This is the project’s proposed tolerance rule and needs panel acceptance.

MAE = Σ|prediction − actual| ÷ number available = 5.608323 ÷ 9 = 0.623147 cases. In plain language, the average absolute error was about 0.62 cases.

RMSE = √(Σ(prediction − actual)² ÷ number available) = √(6.477655 ÷ 9) = 0.848375 cases. Squaring makes larger mistakes contribute more.

MAPE = 100 × mean(|prediction − actual| ÷ actual) over positive actual counts = 100 × 1.604338 ÷ 9 = 17.825976%. Zero actuals are excluded from MAPE because division by zero is undefined. The full calculation uses unrounded saved predictions; printed intermediate values are shortened.

A selected combination can have 100% historical within-limit performance when every available past prediction passes. State the actual fraction, such as 5/5, alongside it. A short historical sample leaves substantial uncertainty about future performance.

## 5. What the probability experiments measured

| Policy | Matched targets | Exact Brier | Nearby Brier | Log loss | RPS |
| --- | --- | --- | --- | --- | --- |
| Original COM-Poisson | 626 | 0.2362 | 0.0407 | 0.9975 | 0.3250 |
| Conditional-pooled COM-Poisson | 626 | 0.2133 | 0.0387 | 0.9393 | 0.3123 |
| SARIMA + ordinary Poisson | 626 | 0.3370 | 0.0859 | 1.3395 | 0.4125 |
| Historical-mean Poisson | 626 | 0.3446 | 0.0973 | 1.3474 | 0.4188 |

For Brier score, record 1 if the specified event happens and 0 otherwise. Square the difference between assigned probability and that outcome, then average. Log loss = −ln(probability assigned to the actual count). RPS sums squared differences between the predicted cumulative distribution and the observed count thresholds. Lower scores are better for all three.

A real saved example is January 2026 Cough / Salvacion. The rounded estimate and actual both equal 3. The pooled model assigned 37.29% to exactly 3, so its exact-event Brier contribution is (0.372879 − 1)² = 0.393281.

Both probability policies produced 626/630 primary results. The four missing primary SARIMA results are Influenza / Caliban. In the longer 31/14 protocol, the original model produced 973/980 and pooling 626/980 because early origins lacked enough earlier prediction pairs. The 626 common targets repeat the same January–September 2026 months. This does not supply an additional independent test.

| Event | Original average probability | Pooled average probability | Observed frequency |
| --- | --- | --- | --- |
| Exactly rounded count | 49.20% | 60.70% | 61.98% |
| Within one case | 94.32% | 97.13% | 95.53% |

The exact-count average moved closer to the observed frequency, but individual probability bands and selections still differ. The nearby overall average became more optimistic despite a lower Brier score. Both facts belong in the defense. Historical within-tolerance SARIMA performance remains 563/626 = 89.94%.

## 6. Where the model remains weak

The classification uses changes in both full-distribution log loss and RPS. Forty-three selections improved both scores, 17 worsened both and 10 were mixed. These are descriptive results on previously inspected months. They do not establish statistical significance for individual selections. We keep one frozen pooled policy rather than selecting whichever method won at each site.

Pooling tightened the distribution on 564 of 626 targets and widened it on 62. Among tighter distributions, 365 exact hits gained on average and 199 misses lost on average. Sharing dispersion can provide more examples while hiding barangay-specific differences. This is consistent with the mixed results; the small sample cannot establish a unique cause at every site.

Cough still overestimates nearby-range coverage. Its pooled average is 79.95%, compared with 47/63 = 74.60% observed. Cough / Cansilayan and Sta. Rosa improved yet retained the two worst absolute pooled RPS values. Cough / Salvacion, Alegria, Minoyan and Blumentritt worsened on both scores. No zero-case months occur in this scenario, so probability discrimination between zero and positive counts remains untested.

| Selections needing scrutiny | Δ log loss | Δ RPS | Matched months |
| --- | --- | --- | --- |
| Influenza/Sta. Rosa | +0.5013 | +0.0072 | 9 |
| Vertigo/Alegria | +0.4418 | +0.0670 | 9 |
| Acute Gastroenteritis/Cansilayan | +0.3802 | +0.0635 | 9 |
| Infection all types/Blumentritt | +0.3242 | +0.0635 | 9 |
| All types of skin disease/Blumentritt | +0.3155 | +0.0011 | 9 |

Positive deltas mean worse pooled scores. Forecast bias in SARIMA’s mean remains present when probabilities are added. Probability spread cannot repair that point estimate. Useful next evidence is whether these errors persist on subsequently verified monthly outcomes.

## 7. A short live demonstration

Open http://127.0.0.1:8771/ on this PC. This is the separate local experimental preview. If it is closed, start node serve.cjs from the cmp-pooled-preview-20261107 directory. Keep the demonstration dataset, policy and result version fixed throughout the defense.

Demonstration 1. Choose Cough and Salvacion, then press Predict. Expected result is 4 cases, 32.27% exactly 4, and 79.89% for 3–5. Historical count performance is 7/9 (77.78%), with 0 of 9 requested targets unavailable. Explain the difference between exact and nearby probability.

Demonstration 2. Choose Influenza and Caliban, then press Predict. Expected result is 3 cases, 49.05% exactly 3, and 95.07% for 2–4. Historical count performance is 5/5 (100.00%), with 4 of 9 requested targets unavailable. Open historical results and show the four unavailable predictions honestly.

Demonstration 3. Choose Infection all types and Blumentritt, then press Predict. Expected result is 2 cases, 51.65% exactly 2, and 99.07% for 1–3. Historical count performance is 7/9 (77.78%), with 0 of 9 requested targets unavailable. Explain a selection where pooled probability scores worsened.

Show the recorded/past-prediction/next-month legend, switch between 24 and 45 months, and point to the experimental range. Show MAE, RMSE and MAPE below the probability cards. Finish with mobile/dark mode if asked. Explain that the present preview loads saved October estimates and does not contact the patient database.

## 8. Practical checklist for new monthly validation

1. Agree the reporting-completeness criteria, issue deadline and decision criteria with MHO/adviser before observing the new outcomes. Keep the chosen pooled policy, event definitions, safeguards and baseline comparisons fixed.

2. Confirm operational histories and mapping for all ten diseases and seven barangays. The current operational pipeline requires 45 consecutive complete monthly reports. Record new disease cases once; a follow-up consultation should not duplicate the original case. An absent report remains missing until reporting is verified.

3. After the cutoff month closes, obtain the reviewed operational SARIMA input/output exports. Keep genuine operational histories separate from the demonstration. Conditional spread also needs the registered earlier accepted SARIMA prediction/actual pairs.

4. Save the first declared monthly packet for all 70 attempted selections before final outcomes are scored. Include issue time, cutoff/target month, unchanged means, complete distributions, failures, policy/code/environment versions and source hashes. Keep a receipt independently with MHO/adviser so later edits are detectable.

5. Record issue timing honestly. Completing October reporting in early November generally means the November estimate is issued during November. Exclude target-month counts from fitting and disclose elapsed days. An entirely ahead-of-month claim requires a separately agreed cutoff/horizon process. Do not backdate or issue October 2026 demonstration outputs as new evidence.

6. After the target month ends, have MHO confirm all 70 actual counts, including genuine zeros and reporting corrections. Retain a versioned record of changes. Keep actual outcome data private.

7. Use the existing separate issue/score tool to check the saved receipt, scope/month alignment and completeness. Report attempted/available/missing for every method. Compare methods on identical available targets and retain failures and infinite log losses.

8. Report exact/nearby Brier, full-count log loss, RPS, calibration bins and range coverage/assigned mass. Separately report SARIMA MAE/RMSE/positive-only MAPE and within-limit score. Inspect Cough, zero months and higher counts by disease/barangay.

9. Repeat across new months and seasonal conditions. Include uncertainty that accounts for shared months and diseases. No fixed number of months guarantees sufficient validation. If a policy is changed using these results, freeze the revision and evaluate it on later observations.

Use cmp-reliability-20261106/FUTURE_TEST_GUIDE.md and PROSPECTIVE_POLICY.md for exact reviewed commands. This guide creates no issued packet or actual outcome. The issue tool computes the original, pooled and Poisson baseline probabilities for comparison. The selected candidate remains conditional-pooled CMP. Existing hashes provide edit detection against a separately retained receipt, not a trusted external timestamp by themselves.

## 9. Quick answers for panel questions

| Question | Suggested answer |
| --- | --- |
| Why is exactly 4 lower than 3–5? | Exactly 4 contains one outcome. The range contains 3,4 and5, so we sum three probability masses. |
| Does 79.89% mean 79.89% accuracy? | It is the model’s probability assigned to the specified range. We measure its reliability using repeated predictions and outcomes. |
| Can a historical score be 100%? | Yes, if every available test prediction passes the error rule. We show the count and sample size alongside the percentage. |
| Why add COM-Poisson? | It models count-distribution spread, including underdispersion. The conditional version estimates that spread from earlier SARIMA prediction errors shared within disease. |
| Did SARIMA itself improve? | This probability-policy comparison preserves SARIMA means. Its measured improvements concern distribution scores. |
| Why use it if some sites worsen? | It improved overall matched historical scores under the frozen comparison rule. We disclose the losing sites and test the same policy on later observations. |
| Are the percentages validated for Murcia? | They were checked mathematically and evaluated on the synthetic scenario. New verified operational monthly outcomes are needed to assess local real-world reliability. |
| What if no acceptable output exists? | Show unavailable with a reason and keep it in the requested-target count. |
| What does Predict do today? | The separate preview loads the selected frozen October output. The operational update workflow requires completed monthly histories, reviewed model results and publication. |

## 10. All 70 October selections

Each row is October 2026 with cutoff September 2026. Cases are rounded for presentation. ±1 percentages and ranges come from the same conditional-pooled distribution. Past results use the primary 36/9 chronological SARIMA test. MAE/RMSE use cases; MAPE excludes actual zero counts. Direction compares probability log loss and RPS against original COM-Poisson on identical primary targets. Greater than 99.99% formatting avoids rounding a probability below one to 100%.

### Cough

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 4 | 32.27% | 3–5 / 79.89% | 2–6 | 7/9 (77.78%) | 9/9 | 0.62 | 0.85 | 17.83% | Worsened |
| Alegria | 4 | 30.45% | 3–5 / 75.24% | 2–7 | 5/9 (55.56%) | 9/9 | 0.86 | 1.07 | 16.97% | Worsened |
| Blumentritt | 5 | 29.61% | 4–6 / 74.81% | 3–8 | 7/9 (77.78%) | 9/9 | 0.87 | 1.00 | 23.63% | Worsened |
| Caliban | 5 | 27.78% | 4–6 / 72.70% | 2–7 | 4/9 (44.44%) | 9/9 | 1.24 | 1.43 | 22.60% | Improved |
| Cansilayan | 4 | 32.58% | 3–5 / 79.32% | 2–7 | 5/9 (55.56%) | 9/9 | 1.40 | 1.99 | 27.30% | Improved |
| Sta. Rosa | 5 | 27.60% | 4–6 / 72.45% | 2–7 | 2/9 (22.22%) | 9/9 | 1.58 | 1.66 | 28.08% | Improved |
| Minoyan | 4 | 31.44% | 3–5 / 77.04% | 2–7 | 5/9 (55.56%) | 9/9 | 0.81 | 1.04 | 22.80% | Worsened |

### URTI

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 3 | 41.23% | 2–4 / 94.01% | 1–4 | 7/9 (77.78%) | 9/9 | 0.67 | 0.85 | 27.23% | Worsened |
| Alegria | 2 | 52.44% | 1–3 / 99.05% | 1–3 | 9/9 (100.00%) | 9/9 | 0.50 | 0.54 | 33.12% | Improved |
| Blumentritt | 1 | 61.44% | 0–2 / 97.87% | 0–2 | 7/9 (77.78%) | 9/9 | 0.58 | 0.76 | 34.82% | Worsened |
| Caliban | 3 | 44.54% | 2–4 / 95.14% | 1–4 | 8/9 (88.89%) | 9/9 | 0.66 | 0.91 | 35.89% | Worsened |
| Cansilayan | 2 | 58.85% | 1–3 / 98.52% | 1–3 | 9/9 (100.00%) | 9/9 | 0.00 | 0.00 | 0.10% | Improved |
| Sta. Rosa | 1 | 67.01% | 0–2 / 98.68% | 0–2 | 9/9 (100.00%) | 9/9 | 0.41 | 0.46 | 36.69% | Improved |
| Minoyan | 1 | 62.39% | 0–2 / 98.03% | 0–2 | 9/9 (100.00%) | 9/9 | 0.34 | 0.43 | 18.92% | Improved |

### Infection all types

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 2 | 58.64% | 1–3 / 98.95% | 1–3 | 7/9 (77.78%) | 9/9 | 0.56 | 0.69 | 41.56% | Improved |
| Alegria | 2 | 57.63% | 1–3 / 97.48% | 1–3 | 8/9 (88.89%) | 9/9 | 0.41 | 0.61 | 21.81% | Improved |
| Blumentritt | 2 | 51.65% | 1–3 / 99.07% | 1–3 | 7/9 (77.78%) | 9/9 | 0.78 | 0.87 | 65.94% | Worsened |
| Caliban | 2 | 58.74% | 1–3 / 98.93% | 1–3 | 8/9 (88.89%) | 9/9 | 0.51 | 0.60 | 35.14% | Improved |
| Cansilayan | 2 | 50.83% | 1–3 / 99.03% | 1–3 | 9/9 (100.00%) | 9/9 | 0.40 | 0.45 | 29.79% | Improved |
| Sta. Rosa | 2 | 46.30% | 1–3 / 98.77% | 1–3 | 9/9 (100.00%) | 9/9 | 0.62 | 0.64 | 56.72% | Worsened |
| Minoyan | 2 | 46.84% | 1–3 / 98.81% | 1–3 | 9/9 (100.00%) | 9/9 | 0.44 | 0.51 | 36.80% | Improved |

### ARI

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 2 | 64.85% | 1–3 / 99.25% | 1–3 | 9/9 (100.00%) | 9/9 | 0.22 | 0.31 | 18.33% | Improved |
| Alegria | 2 | 63.39% | 1–3 / 99.58% | 1–3 | 9/9 (100.00%) | 9/9 | 0.34 | 0.43 | 26.44% | Improved |
| Blumentritt | 2 | 59.94% | 1–3 / 99.66% | 1–3 | 9/9 (100.00%) | 9/9 | 0.34 | 0.40 | 23.95% | Improved |
| Caliban | 2 | 64.76% | 1–3 / 99.40% | 1–3 | 9/9 (100.00%) | 9/9 | 0.32 | 0.40 | 26.39% | Improved |
| Cansilayan | 1 | 82.63% | 0–2 / 99.96% | 0–2 | 7/9 (77.78%) | 9/9 | 0.56 | 0.84 | 31.23% | Worsened |
| Sta. Rosa | 2 | 57.37% | 1–3 / 99.65% | 1–3 | 9/9 (100.00%) | 9/9 | 0.31 | 0.40 | 21.79% | Improved |
| Minoyan | 3 | 52.78% | 2–4 / 97.86% | 2–4 | 8/9 (88.89%) | 9/9 | 0.42 | 0.74 | 22.50% | Mixed |

### Fever unknown origin

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 2 | 57.65% | 1–3 / 99.09% | 1–3 | 7/9 (77.78%) | 9/9 | 0.52 | 0.70 | 32.91% | Improved |
| Alegria | 1 | 65.84% | 0–2 / 98.55% | 0–2 | 9/9 (100.00%) | 9/9 | 0.54 | 0.63 | 48.79% | Mixed |
| Blumentritt | 2 | 55.13% | 1–3 / 99.16% | 1–3 | 9/9 (100.00%) | 9/9 | 0.66 | 0.68 | 60.45% | Mixed |
| Caliban | 2 | 49.63% | 1–3 / 98.99% | 1–3 | 7/9 (77.78%) | 9/9 | 0.41 | 0.63 | 30.65% | Improved |
| Cansilayan | 1 | 76.66% | 0–2 / 99.84% | 0–2 | 9/9 (100.00%) | 9/9 | 0.26 | 0.31 | 25.85% | Improved |
| Sta. Rosa | 2 | 56.74% | 1–3 / 99.14% | 1–3 | 9/9 (100.00%) | 9/9 | 0.52 | 0.63 | 44.84% | Mixed |
| Minoyan | 1 | 56.72% | 0–2 / 97.10% | 1–3 | 8/9 (88.89%) | 9/9 | 0.64 | 0.71 | 62.02% | Worsened |

### Hypertension

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 1 | 90.55% | 0–2 / >99.99% | 0–2 | 9/9 (100.00%) | 9/9 | 0.28 | 0.48 | 20.84% | Improved |
| Alegria | 2 | 59.32% | 1–3 / 99.92% | 1–3 | 9/9 (100.00%) | 9/9 | 0.45 | 0.50 | 39.26% | Improved |
| Blumentritt | 2 | 73.63% | 1–3 / 99.79% | 1–3 | 9/9 (100.00%) | 9/9 | 0.16 | 0.20 | 7.89% | Improved |
| Caliban | 2 | 70.22% | 1–3 / 99.92% | 1–3 | 8/9 (88.89%) | 9/9 | 0.40 | 0.51 | 32.56% | Improved |
| Cansilayan | 2 | 65.90% | 1–3 / 99.94% | 1–3 | 9/9 (100.00%) | 9/9 | 0.31 | 0.34 | 15.57% | Improved |
| Sta. Rosa | 2 | 72.80% | 1–3 / 99.88% | 1–3 | 9/9 (100.00%) | 9/9 | 0.33 | 0.42 | 23.52% | Improved |
| Minoyan | 1 | 63.89% | 0–2 / 99.39% | 1–2 | 9/9 (100.00%) | 9/9 | 0.48 | 0.48 | 41.46% | Improved |

### Influenza

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 2 | 74.48% | 1–3 / 99.91% | 1–3 | 9/9 (100.00%) | 9/9 | 0.31 | 0.38 | 24.94% | Improved |
| Alegria | 2 | 70.59% | 1–3 / 99.95% | 1–3 | 9/9 (100.00%) | 9/9 | 0.25 | 0.27 | 19.74% | Improved |
| Blumentritt | 2 | 73.93% | 1–3 / 99.92% | 1–3 | 9/9 (100.00%) | 9/9 | 0.33 | 0.38 | 24.22% | Improved |
| Caliban | 3 | 49.05% | 2–4 / 95.07% | 2–5 | 5/5 (100.00%) | 5/9 | 0.27 | 0.32 | 16.32% | Improved |
| Cansilayan | 2 | 64.14% | 1–3 / 99.95% | 1–3 | 9/9 (100.00%) | 9/9 | 0.32 | 0.45 | 20.53% | Improved |
| Sta. Rosa | 3 | 61.01% | 2–4 / 98.35% | 2–4 | 8/9 (88.89%) | 9/9 | 0.50 | 0.84 | 19.52% | Worsened |
| Minoyan | 2 | 74.43% | 1–3 / 99.91% | 1–3 | 9/9 (100.00%) | 9/9 | 0.36 | 0.47 | 24.43% | Improved |

### Acute Gastroenteritis

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 1 | 76.16% | 0–2 / 99.61% | 0–2 | 8/9 (88.89%) | 9/9 | 0.27 | 0.51 | 20.27% | Mixed |
| Alegria | 1 | 76.31% | 0–2 / 99.61% | 0–2 | 9/9 (100.00%) | 9/9 | 0.35 | 0.43 | 30.67% | Improved |
| Blumentritt | 2 | 64.18% | 1–3 / 99.22% | 1–3 | 8/9 (88.89%) | 9/9 | 0.56 | 0.93 | 26.86% | Mixed |
| Caliban | 1 | 64.48% | 0–2 / 98.75% | 1–2 | 9/9 (100.00%) | 9/9 | 0.36 | 0.44 | 28.75% | Improved |
| Cansilayan | 1 | 77.69% | 0–2 / 99.69% | 0–2 | 8/9 (88.89%) | 9/9 | 0.65 | 0.75 | 58.81% | Worsened |
| Sta. Rosa | 2 | 62.18% | 1–3 / 99.56% | 1–3 | 8/9 (88.89%) | 9/9 | 0.47 | 0.56 | 37.67% | Mixed |
| Minoyan | 2 | 54.73% | 1–3 / 99.58% | 1–3 | 9/9 (100.00%) | 9/9 | 0.21 | 0.30 | 10.65% | Improved |

### Vertigo

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 2 | 65.37% | 1–3 / 99.92% | 1–3 | 9/9 (100.00%) | 9/9 | 0.40 | 0.42 | 19.98% | Improved |
| Alegria | 1 | 78.72% | 0–2 / 99.82% | 1–2 | 8/9 (88.89%) | 9/9 | 0.75 | 0.89 | 64.13% | Worsened |
| Blumentritt | 3 | 47.77% | 2–4 / 98.36% | 2–4 | 9/9 (100.00%) | 9/9 | 0.03 | 0.06 | 1.48% | Improved |
| Caliban | 1 | 74.50% | 0–2 / 99.72% | 1–2 | 9/9 (100.00%) | 9/9 | 0.48 | 0.50 | 39.92% | Mixed |
| Cansilayan | 1 | 53.78% | 0–2 / 98.68% | 1–2 | 9/9 (100.00%) | 9/9 | 0.58 | 0.64 | 53.87% | Worsened |
| Sta. Rosa | 2 | 67.99% | 1–3 / 99.91% | 1–3 | 9/9 (100.00%) | 9/9 | 0.29 | 0.35 | 19.10% | Improved |
| Minoyan | 2 | 62.11% | 1–3 / 99.91% | 1–3 | 9/9 (100.00%) | 9/9 | 0.38 | 0.42 | 26.96% | Improved |

### All types of skin disease

| Barangay | Cases | Exactly N | Nearby / probability | 95% range | Past within limit | Available | MAE | RMSE | MAPE | Probability comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Salvacion | 2 | 42.91% | 1–3 / 97.79% | 1–3 | 9/9 (100.00%) | 9/9 | 0.61 | 0.62 | 46.77% | Mixed |
| Alegria | 2 | 46.61% | 1–3 / 98.21% | 1–3 | 8/9 (88.89%) | 9/9 | 0.41 | 0.54 | 33.73% | Improved |
| Blumentritt | 2 | 55.66% | 1–3 / 97.64% | 1–3 | 6/9 (66.67%) | 9/9 | 0.71 | 1.24 | 20.47% | Worsened |
| Caliban | 1 | 65.67% | 0–2 / 98.39% | 0–2 | 7/9 (77.78%) | 9/9 | 0.61 | 0.74 | 43.45% | Mixed |
| Cansilayan | 2 | 43.23% | 1–3 / 97.83% | 1–3 | 6/9 (66.67%) | 9/9 | 0.66 | 0.95 | 32.61% | Worsened |
| Sta. Rosa | 2 | 55.66% | 1–3 / 98.11% | 1–3 | 9/9 (100.00%) | 9/9 | 0.15 | 0.19 | 7.29% | Improved |
| Minoyan | 2 | 46.74% | 1–3 / 98.22% | 1–3 | 9/9 (100.00%) | 9/9 | 0.37 | 0.45 | 25.23% | Improved |

## Source and verification record

Prepared from frozen cmp-reliability-20261106/october.csv, scope-changes.csv, matched-targets.csv, matched-summary.csv, freeze.json and the verified cmp6200-20261103 SARIMA snapshot. Preview intervals were checked against its probability distribution. All 70 primary point metrics were independently recalculated from that snapshot. Existing browser QA is documented in CMP_POOLED_PREVIEW_20261107.md. Source hashes are recorded with this package.

Documentation only. No current application, dataset, MySQL, Azure or frozen experiment was changed. No new clinical outcomes were obtained, and no new probability policy was fitted. This guide accompanies a local experimental preview, with prospective validation outstanding.
