# Final probability policy review | 7 November 2026
**Decision — Freeze disease-specific conditional-pooled COM-Poisson as the single candidate for prospective testing and a separate local research preview across all 70 selections.** Keep the original COM-Poisson as a comparison. SARIMA supplies the same point estimate throughout. No operational release is recommended on these results.

## What was compared
The 6,200-case demonstration consists of 45 monthly counts for each of ten diseases in seven barangays. It contains generated counts and ITR-derived entries. There are no zero-count observations. Earlier experiments on different histories cannot supply additional confirming months for this comparison. The November 2 Poisson study established mathematical feasibility; the November 3 original CMP improved on ordinary Poisson; the November 6 preview verified rendering the original policy. The November 6 reliability experiment supplied the matched challenger evidence.

Original CMP estimates spread separately from each selection’s raw historical counts around their average. Conditional CMP estimates one spread per disease from errors made by SARIMA on earlier months across its seven barangays. Both use exactly the same unrounded SARIMA mean for the new month. Exact means the observed count equals the rounded estimate; nearby means within one integer case of that estimate, with a floor of zero. SARIMA’s 563/626 within its separate proposed error limit is a point-estimate result.

## Matched historical evidence
I joined the saved target rows by disease, barangay and month, checked the means, outcomes and event flags, recalculated exact-event Brier scores from the probabilities, and averaged the saved distribution scores. Both protocols yielded identical matched scores. Lower is better for all four columns.

| Method | Exact Brier | Nearby Brier | Log loss | RPS |
|---|---:|---:|---:|---:|
| Training-mean Poisson | .3446 | .0973 | 1.3474 | .4188 |
| SARIMA + ordinary Poisson | .3370 | .0859 | 1.3395 | .4125 |
| Original CMP | .2362 | .0407 | .9975 | .3250 |
| Conditional-pooled CMP | **.2133** | **.0387** | **.9393** | **.3123** |

Brier measures probability error for a specified event. Log loss penalizes assigning very little probability to the count that occurred. RPS measures error across all count thresholds and reflects how far probability falls from the outcome. The saved exploratory month-cluster bootstrap intervals for the pooled-minus-original score differences were −.0866 to −.0267 for log loss and −.0153 to −.0105 for RPS. Only nine distinct target months contribute.

| Availability | Original | Conditional | Identical targets |
|---|---:|---:|---:|
| 36 training months / 9 test months | 626/630 | 626/630 | 626 |
| 31 training months / 14 test months | 973/980 | 626/980 | 626 |
| October 2026 demonstration estimates | 70/70 | 70/70 | No subsequent outcome used |

The four primary missing SARIMA predictions belong to Influenza / Caliban. Conditional pooling additionally requires a history of earlier accepted SARIMA predictions. Fifty early disease/origin groups lacked enough history. The longer comparison therefore reuses precisely the primary matched months, January–September 2026. Its extra five months establish a real cost in availability. October availability establishes computation only.

## Why some combinations gained and others lost
Across 626 paired predictions, the conditional distribution tightened on 564 and widened on 62. For the 365 tighter predictions whose rounded estimate was exactly right, average log loss improved by .2368. For the 199 tighter predictions that missed, it worsened by .2641. In the wider group the reverse held on average: loss increased by .0799 for the 23 exact hits and decreased by .1129 for the 39 misses. These are observed score contributions, not features available at prediction time.

Sharing spread gives a barangay more historical errors to learn from. It can also hide local differences. Both effects are consistent with the results; the nine months per selection cannot isolate the cause for each site. Forty-three selections improved on both log loss and RPS, 17 worsened on both and 10 had mixed signs. This classification describes score direction, not statistical significance. Seven diseases improved both scores in aggregate. Acute Gastroenteritis, Fever unknown origin and Infection all types had mixed results.

**Cough.** The original model’s average predicted variance was 1.17 cases squared against an observed mean squared prediction error of 1.81. Pooling generally widened Cough’s distribution. Its average nearby probability fell from 83.83% to 79.95%, closer to 47/63 observed (74.60%) but still optimistic. Cough / Cansilayan and Cough / Sta. Rosa improved yet still had the worst absolute pooled RPS (1.088 and 1.061); Cough / Caliban was third (.845). Cough / Salvacion, Alegria, Minoyan and Blumentritt each worsened on both scores. For October Cough / Salvacion, the unchanged mean 3.7853 rounds to 4. Original assigned 38.29% to exactly 4 and 87.79% to 3–5; pooled assigns 32.27% and 79.89%.

**Other weak spots.** Influenza / Sta. Rosa had the largest log-loss deterioration (+.5013). Vertigo / Alegria (+.4418), Acute Gastroenteritis / Cansilayan (+.3802) and Infection all types / Blumentritt (+.3242) also lost on both measures. All types of skin disease / Blumentritt had the fourth-highest absolute pooled RPS (.614). The table below includes all selections. Do not choose site-specific winners after seeing these results.

## Calibration and stability
| Event | Original average assigned | Pooled average assigned | Observed |
|---|---:|---:|---:|
| Exact rounded count | 49.20% | 60.70% | 61.98% |
| Within one case | 94.32% | 97.13% | 95.53% |

Exact calibration improved overall but differs by probability band. For example, 214 pooled estimates averaging 64.59% matched exactly 72.43% of the time. In 39 averaging 46.45%, only 28.21% matched. Nearby Brier improved even though its overall calibration gap increased from 1.21 to 1.60 percentage points in absolute value. Pooled central 80% / 95% interval coverage was 94.89% / 97.28% (original 96.33% / 98.08%). With integer counts, the included counts often carry more mass than the nominal interval: the pooled intervals assigned 95.72% / 98.98% on average. No zero months were observed, so positive-versus-zero discrimination cannot be assessed.

The saved independent audit checked 2,504 distributions and 100 eligible dispersion fits, including gradient checks. All eligible fits passed. This review rechecked archive CRCs for the Poisson, original CMP and conditional CMP bundles and the hashes of the frozen challenger policy and code. No model was refit. Numerical success means the probabilities can be computed; calibration still depends on outcomes.

## Practical handoff to Sol High
1. For a separate approved local preview, use [the frozen policy](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-reliability-20261106/POLICY.md), [source hashes](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-reliability-20261106/freeze.json) and [candidate October output](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-reliability-20261106/october.csv). Identify the source snapshot, policy version, disease, barangay and target month together. Do not mix old probabilities, charts or intervals into a pooled result. The old preview’s visual checks cover the original policy only.
2. Preserve the eligibility rule: at least 28 informative earlier prediction/outcome pairs spanning five origins and five barangays for the disease. Preserve mean matching, parameter bounds, optimizer, derivative, curvature and tail checks. Any failed check produces an explicit unavailable result. Keep SARIMA’s case count available when valid independently.
3. Before displaying even a separate preview, test all 70 selectors against the frozen export. Verify rounding only of the displayed count, fraction-to-percent conversion, exact and nearby wording, and missing-output handling. Label the data and policy as a demonstration. Show historical performance separately. Do not present a chance of disease occurrence as validated.
4. For genuine evaluation, use [the existing issue/score guide](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-reliability-20261106/FUTURE_TEST_GUIDE.md) and [timing correction](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-reliability-20261106/PROSPECTIVE_POLICY.md). MHO confirms all seven barangays’ operational histories, completeness, eligible cases and genuine zeros; the current pipeline requires at least 45 consecutive completed months. Use operational histories separate from the demonstration.
5. Fix the issue deadline and review dates before scoring. Save the first eligible packet with all 70 requested targets, model versions, source hashes, issue time, distributions, SARIMA means, baselines and failures. Retain an independent timestamped receipt with the MHO/adviser. Exclude target-month inputs. If reporting closes during the target month, disclose the issue date and elapsed days. A fully ahead-of-month test needs a separately agreed earlier cutoff and compatible horizon.
6. After each month closes, have MHO sign off complete actual counts. Delayed/missing reports stay missing until verified; distinguish them from a confirmed zero. Match all 70 by disease, barangay and month. Report coverage before comparing matched Brier, log loss, RPS, calibration bands and interval coverage. Preserve infinite losses. Review Cough, high counts and any genuine zeros separately. Record revisions, never silently overwrite an issued packet. Evaluate across multiple new months and seasons with uncertainty by month. Predeclare any operational acceptance margins with MHO before seeing outcomes. A policy revision requires fresh confirmation.

## All 70 primary comparisons
Pooled minus original. Negative values favor pooling. Rows with fewer usable predictions show their actual denominators.

| Disease / barangay | Matched months | Δ log loss | Δ RPS | Direction |
|---|---:|---:|---:|---|
| ARI/Alegria | 9 | -0.1334 | -0.0240 | improved |
| ARI/Blumentritt | 9 | -0.1558 | -0.0244 | improved |
| ARI/Caliban | 9 | -0.1455 | -0.0273 | improved |
| ARI/Cansilayan | 9 | 0.1481 | 0.0113 | worsened |
| ARI/Minoyan | 9 | 0.0133 | -0.0201 | mixed_or_tied |
| ARI/Salvacion | 9 | -0.2610 | -0.0586 | improved |
| ARI/Sta. Rosa | 9 | -0.1694 | -0.0314 | improved |
| Acute Gastroenteritis/Alegria | 9 | -0.1170 | -0.0111 | improved |
| Acute Gastroenteritis/Blumentritt | 9 | 0.2575 | -0.0127 | mixed_or_tied |
| Acute Gastroenteritis/Caliban | 9 | -0.1913 | -0.0334 | improved |
| Acute Gastroenteritis/Cansilayan | 9 | 0.3802 | 0.0635 | worsened |
| Acute Gastroenteritis/Minoyan | 9 | -0.2826 | -0.0613 | improved |
| Acute Gastroenteritis/Salvacion | 9 | 0.0681 | -0.0233 | mixed_or_tied |
| Acute Gastroenteritis/Sta. Rosa | 9 | -0.0202 | 0.0072 | mixed_or_tied |
| All types of skin disease/Alegria | 9 | -0.0159 | -0.0006 | improved |
| All types of skin disease/Blumentritt | 9 | 0.3155 | 0.0011 | worsened |
| All types of skin disease/Caliban | 9 | -0.0245 | 0.0009 | mixed_or_tied |
| All types of skin disease/Cansilayan | 9 | 0.1619 | 0.0091 | worsened |
| All types of skin disease/Minoyan | 9 | -0.2472 | -0.0494 | improved |
| All types of skin disease/Salvacion | 9 | -0.0150 | 0.0148 | mixed_or_tied |
| All types of skin disease/Sta. Rosa | 9 | -0.1786 | -0.0436 | improved |
| Cough/Alegria | 9 | 0.0138 | 0.0006 | worsened |
| Cough/Blumentritt | 9 | 0.0027 | 0.0021 | worsened |
| Cough/Caliban | 9 | -0.0536 | -0.0107 | improved |
| Cough/Cansilayan | 9 | -0.0760 | -0.0070 | improved |
| Cough/Minoyan | 9 | 0.0342 | 0.0081 | worsened |
| Cough/Salvacion | 9 | 0.0547 | 0.0136 | worsened |
| Cough/Sta. Rosa | 9 | -0.2822 | -0.0578 | improved |
| Fever unknown origin/Alegria | 9 | -0.0181 | 0.0076 | mixed_or_tied |
| Fever unknown origin/Blumentritt | 9 | -0.0499 | 0.0324 | mixed_or_tied |
| Fever unknown origin/Caliban | 9 | -0.0828 | -0.0222 | improved |
| Fever unknown origin/Cansilayan | 9 | -0.1311 | -0.0228 | improved |
| Fever unknown origin/Minoyan | 9 | 0.0515 | 0.0296 | worsened |
| Fever unknown origin/Salvacion | 9 | -0.0273 | -0.0067 | improved |
| Fever unknown origin/Sta. Rosa | 9 | -0.0181 | 0.0099 | mixed_or_tied |
| Hypertension/Alegria | 9 | -0.0795 | -0.0036 | improved |
| Hypertension/Blumentritt | 9 | -0.3496 | -0.0856 | improved |
| Hypertension/Caliban | 9 | -0.0930 | -0.0146 | improved |
| Hypertension/Cansilayan | 9 | -0.2261 | -0.0503 | improved |
| Hypertension/Minoyan | 9 | -0.0833 | -0.0053 | improved |
| Hypertension/Salvacion | 9 | -0.1042 | -0.0153 | improved |
| Hypertension/Sta. Rosa | 9 | -0.1247 | -0.0237 | improved |
| Infection all types/Alegria | 9 | -0.0192 | -0.0039 | improved |
| Infection all types/Blumentritt | 9 | 0.3242 | 0.0635 | worsened |
| Infection all types/Caliban | 9 | -0.0753 | -0.0037 | improved |
| Infection all types/Cansilayan | 9 | -0.0971 | -0.0133 | improved |
| Infection all types/Minoyan | 9 | -0.0646 | -0.0053 | improved |
| Infection all types/Salvacion | 9 | -0.0945 | -0.0065 | improved |
| Infection all types/Sta. Rosa | 9 | 0.0088 | 0.0185 | worsened |
| Influenza/Alegria | 9 | -0.3109 | -0.0660 | improved |
| Influenza/Blumentritt | 9 | -0.2600 | -0.0466 | improved |
| Influenza/Caliban | 5 | -0.3698 | -0.0738 | improved |
| Influenza/Cansilayan | 9 | -0.2980 | -0.0505 | improved |
| Influenza/Minoyan | 9 | -0.1502 | -0.0127 | improved |
| Influenza/Salvacion | 9 | -0.2794 | -0.0442 | improved |
| Influenza/Sta. Rosa | 9 | 0.5013 | 0.0072 | worsened |
| URTI/Alegria | 9 | -0.0795 | -0.0064 | improved |
| URTI/Blumentritt | 9 | 0.0762 | 0.0101 | worsened |
| URTI/Caliban | 9 | 0.1084 | 0.0016 | worsened |
| URTI/Cansilayan | 9 | -0.0683 | -0.0170 | improved |
| URTI/Minoyan | 9 | -0.1666 | -0.0298 | improved |
| URTI/Salvacion | 9 | 0.0216 | 0.0027 | worsened |
| URTI/Sta. Rosa | 9 | -0.0842 | -0.0103 | improved |
| Vertigo/Alegria | 9 | 0.4418 | 0.0670 | worsened |
| Vertigo/Blumentritt | 9 | -0.2819 | -0.0656 | improved |
| Vertigo/Caliban | 9 | -0.0617 | 0.0065 | mixed_or_tied |
| Vertigo/Cansilayan | 9 | 0.0385 | 0.0425 | worsened |
| Vertigo/Minoyan | 9 | -0.2241 | -0.0437 | improved |
| Vertigo/Salvacion | 9 | -0.2360 | -0.0472 | improved |
| Vertigo/Sta. Rosa | 9 | -0.2568 | -0.0565 | improved |
