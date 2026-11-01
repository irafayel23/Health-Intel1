# FORECAST-016 — Combined dataset baseline and error audit

CODEX-1 · 31 October 2026 · Isolated analysis; no integration or retraining.

## Decision

Keep the installed system unchanged. The training-history mean deserves investigation as a regularization reference, but this audit does not justify replacing SARIMA or promise 70–80% performance. More complex seasonal modeling is not supported merely by these results.

## Evidence and protocol

Actual installed combined-sarima-5592 snapshot and monthly CSV, cross-checked with FORECAST-015 native PREDICTIONS.csv. 70 histories, 45 months (January 2023–September 2026), 3,150 monthly cells and 5,592 cases. Provenance is 5,500 generated cases plus 92 ITR-derived entries, not 5,592 verified real cases. The 92 entries were NOT independently re-read from original ITR images in this task; dates, category assignment and repeat consultations still need source reconciliation.

Primary chronological 80/20 starts with 36 months and evaluates January–September 2026 (9 × 70 = 630 targets). Separate secondary 70/30 starts with 31 months and evaluates August 2025–September 2026 (14 × 70 = 980 targets). Training grows after each actual month. The protocols overlap and are not independent confirmation. All methods use identical targets; every method has 100% historical availability. SARIMA is reused, not refitted. No rounding before scoring.

Baselines: training mean = sum of all counts before the target / training months; previous month = immediately preceding count; seasonal naive = count 12 months before target. Baselines are constructed from training prefixes only. No method was selected for installation using these outcomes. policy.json was written before scoring; this is a descriptive audit, not an independent preregistered trial on unseen data.

## Calculations

For actual y and prediction p: error = p − y; MAE = mean(|error|); RMSE = sqrt(mean(error²)); signed bias = mean(error), positive means overprediction. Positive-only MAPE = 100 × mean(|error|/y) over y>0; zero actual counts are excluded only from MAPE. A tolerance pass requires |error| ≤ max(1, 0.20y); percentage = passes / produced forecasts ×100. Availability = produced / requested ×100. The tolerance is proposed, not a guaranteed or officially validated disease probability.

## 80/20 results

| Method | Passes / targets | Within limit | MAE | RMSE | MAPE (positive only) | Bias |
|---|---:|---:|---:|---:|---:|---:|
| SARIMA | 352/630 | 55.87% | 1.1475 | 1.5038 | 52.24% | -0.0377 |
| Training mean | 367/630 | 58.25% | 1.1064 | 1.4341 | 47.47% | -0.0229 |
| Previous month | 384/630 | 60.95% | 1.4825 | 2.0717 | 76.25% | -0.0095 |
| Seasonal naive | 363/630 | 57.62% | 1.5111 | 2.0292 | 78.02% | -0.0540 |

SARIMA error groups (subgroup membership uses observed outcomes for diagnosis only):

| Group | Passes / targets | Within limit | MAE | Bias |
|---|---:|---:|---:|---:|
| Zero | 10/119 | 8.40% | 1.4913 | 1.4913 |
| One–two | 310/358 | 86.59% | 0.6701 | 0.2218 |
| Three-plus | 32/153 | 20.92% | 1.9971 | -1.8342 |
| Sudden increase | 5/58 | 8.62% | 2.7804 | -2.7804 |

Sudden increase means actual − previous ≥3 and actual ≥2×previous. This is an explicitly chosen descriptive subgroup, not an outbreak rule or a predictable event definition. It overlaps the count groups and must not be added to their totals.

| Baseline versus SARIMA | Both MAE/RMSE lower | Both higher | Mixed/tied |
|---|---:|---:|---:|
| Training mean | 43 | 17 | 10 |
| Previous month | 9 | 55 | 6 |
| Seasonal naive | 6 | 58 | 6 |

These are descriptive pair counts, not statistically significant wins or per-pair model selection recommendations. Nine or fourteen targets are small samples.

## 70/30 results

| Method | Passes / targets | Within limit | MAE | RMSE | MAPE (positive only) | Bias |
|---|---:|---:|---:|---:|---:|---:|
| SARIMA | 538/980 | 54.90% | 1.1696 | 1.5120 | 53.83% | 0.0207 |
| Training mean | 551/980 | 56.22% | 1.1213 | 1.4289 | 48.34% | 0.0214 |
| Previous month | 602/980 | 61.43% | 1.4480 | 1.9926 | 74.58% | 0.0112 |
| Seasonal naive | 570/980 | 58.16% | 1.5153 | 2.0195 | 79.05% | 0.0316 |

SARIMA error groups (subgroup membership uses observed outcomes for diagnosis only):

| Group | Passes / targets | Within limit | MAE | Bias |
|---|---:|---:|---:|---:|
| Zero | 18/196 | 9.18% | 1.5509 | 1.5509 |
| One–two | 466/554 | 84.12% | 0.7122 | 0.2404 |
| Three-plus | 54/230 | 23.48% | 1.9464 | -1.8122 |
| Sudden increase | 9/83 | 10.84% | 2.7376 | -2.7364 |

Sudden increase means actual − previous ≥3 and actual ≥2×previous. This is an explicitly chosen descriptive subgroup, not an outbreak rule or a predictable event definition. It overlaps the count groups and must not be added to their totals.

| Baseline versus SARIMA | Both MAE/RMSE lower | Both higher | Mixed/tied |
|---|---:|---:|---:|
| Training mean | 48 | 13 | 9 |
| Previous month | 6 | 52 | 12 |
| Seasonal naive | 6 | 60 | 4 |

These are descriptive pair counts, not statistically significant wins or per-pair model selection recommendations. Nine or fourteen targets are small samples.

## What the errors show

1. The near-zero pooled bias hides opposite errors: SARIMA predicts too high in zero months and too low in larger-count months. A uniform downward adjustment would worsen high-count underprediction; a uniform upward adjustment would worsen zero-month errors.
2. The historical mean reduces MAE and RMSE in both protocols, suggesting the fitted SARIMA variation is not consistently useful beyond the series level in this dataset. This is evidence of a weak practical advantage, not proof that every seasonal pattern is absent or that parameter overfitting has been diagnosed.
3. Previous-month and seasonal-naive predictions achieve higher hit rates but much worse MAE/RMSE. Their integer-valued outputs and the one-case tolerance help explain why hit rate can prefer them even when large errors worsen. Do not choose a model solely for the larger percentage.
4. Sudden increases remain difficult for every baseline; no result establishes they can be forecast reliably with the available count history.
5. The earlier annual-evidence check supported 6/70 current fits. This audit did not repeat those statistical diagnostics; a numerical seasonal fit is not proof of meaningful annual seasonality.

## Prioritized next experiment proposal — not implemented

First reconcile the 92 ITR-derived records against source images, preserving a duplicate/uncertainty ledger. Do not alter actuals to improve the score. Next, consider ONE bounded experiment that shrinks SARIMA predictions toward each series’ expanding training mean. Fix the blend and any training-only selection rule before evaluation, retain seasonal SARIMA and identify blended outputs honestly. This differs from the previous cross-barangay pooled seasonal correction, but may still give only small gains and may worsen sudden increases. Review previous experiments before fitting; this audit itself runs none.

Use all identical 630 targets plus separate 980-target robustness checks, unchanged tolerance, all requested origins, zero and increase subgroups, and paired MAE/RMSE comparisons. Require error reductions in both protocols without concealed missing forecasts. Any gains on these repeatedly inspected months remain exploratory. Genuine new chronological observations are needed for independent confirmation, not for continuing this synthetic prototype research. No evidence here establishes that 70% is achievable.

## Per-selection SARIMA diagnosis

Signed bias and observed error groups are listed for all 70 selections. “Overpredicted” counts p>y; “underpredicted” counts p<y; these are descriptions, not significance tests. Full all-method metrics are in all-70-comparisons.csv; every calculation is in target-errors.csv.

| Disease | Barangay | Primary passes | MAE | RMSE | Bias | Over / under | Zero passes | 1–2 passes | 3+ passes | Increase passes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Cough | Salvacion | 3/9 | 2.39 | 2.84 | -0.64 | 4/5 | 0/0 | 0/2 | 3/7 | 0/2 |
| Cough | Alegria | 6/9 | 0.82 | 1.08 | 0.43 | 6/3 | 0/0 | 0/2 | 6/7 | 1/1 |
| Cough | Blumentritt | 3/9 | 2.53 | 3.12 | -0.53 | 3/6 | 0/0 | 0/3 | 3/6 | 1/2 |
| Cough | Caliban | 2/9 | 2.38 | 2.99 | -0.88 | 4/5 | 0/0 | 0/1 | 2/8 | 0/3 |
| Cough | Cansilayan | 1/9 | 2.64 | 3.04 | 0.33 | 5/4 | 0/1 | 0/3 | 1/5 | 0/2 |
| Cough | Sta. Rosa | 4/9 | 1.57 | 1.81 | 0.17 | 7/2 | 0/0 | 0/2 | 4/7 | 0/2 |
| Cough | Minoyan | 4/9 | 1.33 | 1.62 | -0.32 | 4/5 | 0/0 | 0/1 | 4/8 | 1/2 |
| URTI | Salvacion | 4/9 | 1.37 | 1.79 | 0.30 | 6/3 | 0/2 | 2/4 | 2/3 | 1/2 |
| URTI | Alegria | 7/9 | 0.94 | 1.40 | -0.39 | 4/5 | 0/1 | 7/7 | 0/1 | 0/1 |
| URTI | Blumentritt | 5/9 | 0.99 | 1.46 | -0.03 | 7/2 | 0/3 | 5/5 | 0/1 | 0/1 |
| URTI | Caliban | 4/9 | 1.20 | 1.39 | -0.34 | 3/6 | 0/3 | 4/4 | 0/2 | 0/1 |
| URTI | Cansilayan | 6/9 | 1.00 | 1.24 | 0.25 | 5/4 | 1/3 | 5/5 | 0/1 | 0/1 |
| URTI | Sta. Rosa | 8/9 | 0.61 | 0.68 | 0.25 | 6/3 | 0/1 | 8/8 | 0/0 | 0/0 |
| URTI | Minoyan | 5/9 | 1.02 | 1.17 | 0.34 | 6/2 | 2/5 | 3/3 | 0/1 | 0/1 |
| Infection all types | Salvacion | 3/9 | 1.57 | 1.76 | -0.27 | 4/5 | 0/2 | 3/4 | 0/3 | 0/2 |
| Infection all types | Alegria | 7/9 | 1.15 | 1.88 | -0.45 | 4/5 | 0/0 | 7/7 | 0/2 | 0/1 |
| Infection all types | Blumentritt | 4/9 | 0.95 | 1.18 | 0.09 | 4/5 | 0/1 | 4/6 | 0/2 | 0/0 |
| Infection all types | Caliban | 4/9 | 1.15 | 1.32 | -0.07 | 4/5 | 0/0 | 4/7 | 0/2 | 0/1 |
| Infection all types | Cansilayan | 5/9 | 0.86 | 0.93 | -0.02 | 4/5 | 0/2 | 5/7 | 0/0 | 0/0 |
| Infection all types | Sta. Rosa | 7/9 | 0.81 | 0.98 | -0.31 | 2/7 | 0/1 | 7/7 | 0/1 | 0/0 |
| Infection all types | Minoyan | 4/9 | 0.95 | 1.12 | 0.15 | 6/3 | 0/3 | 4/4 | 0/2 | 0/2 |
| ARI | Salvacion | 7/9 | 0.90 | 1.16 | 0.08 | 5/4 | 0/1 | 7/7 | 0/1 | 0/1 |
| ARI | Alegria | 7/9 | 0.74 | 0.87 | 0.23 | 5/4 | 0/2 | 7/7 | 0/0 | 0/0 |
| ARI | Blumentritt | 6/9 | 0.73 | 0.88 | -0.03 | 6/3 | 0/1 | 6/7 | 0/1 | 0/0 |
| ARI | Caliban | 6/9 | 0.89 | 1.01 | 0.51 | 7/2 | 0/2 | 5/6 | 1/1 | 0/0 |
| ARI | Cansilayan | 5/9 | 0.94 | 1.24 | 0.01 | 3/6 | 1/3 | 4/5 | 0/1 | 0/0 |
| ARI | Sta. Rosa | 6/9 | 1.13 | 1.47 | -0.16 | 4/5 | 0/2 | 6/6 | 0/1 | 0/1 |
| ARI | Minoyan | 7/9 | 0.78 | 0.83 | 0.21 | 5/4 | 0/0 | 6/7 | 1/2 | 0/0 |
| Fever unknown origin | Salvacion | 7/9 | 0.71 | 0.84 | 0.43 | 6/3 | 0/2 | 7/7 | 0/0 | 0/0 |
| Fever unknown origin | Alegria | 9/9 | 0.57 | 0.61 | 0.11 | 5/4 | 0/0 | 9/9 | 0/0 | 0/0 |
| Fever unknown origin | Blumentritt | 4/9 | 1.17 | 1.36 | 0.33 | 6/3 | 0/3 | 4/4 | 0/2 | 0/0 |
| Fever unknown origin | Caliban | 4/9 | 1.29 | 1.39 | 0.31 | 6/3 | 0/3 | 3/3 | 1/3 | 1/2 |
| Fever unknown origin | Cansilayan | 3/9 | 1.42 | 1.73 | -0.74 | 3/6 | 1/3 | 2/3 | 0/3 | 0/2 |
| Fever unknown origin | Sta. Rosa | 6/9 | 1.10 | 1.48 | -0.66 | 4/5 | 0/0 | 6/6 | 0/3 | 0/1 |
| Fever unknown origin | Minoyan | 5/9 | 0.92 | 1.21 | -0.23 | 3/6 | 0/2 | 5/5 | 0/2 | 0/0 |
| Hypertension | Salvacion | 4/9 | 1.22 | 1.57 | 0.30 | 7/2 | 0/4 | 4/4 | 0/1 | 0/1 |
| Hypertension | Alegria | 3/9 | 1.82 | 2.39 | -0.95 | 4/5 | 0/2 | 3/5 | 0/2 | 0/2 |
| Hypertension | Blumentritt | 7/9 | 0.87 | 1.14 | 0.10 | 5/4 | 0/1 | 7/7 | 0/1 | 0/1 |
| Hypertension | Caliban | 6/9 | 1.04 | 1.35 | -0.71 | 4/5 | 0/0 | 5/6 | 1/3 | 0/0 |
| Hypertension | Cansilayan | 8/9 | 0.72 | 0.78 | 0.36 | 6/3 | 0/1 | 8/8 | 0/0 | 0/0 |
| Hypertension | Sta. Rosa | 7/9 | 0.90 | 1.14 | -0.11 | 5/4 | 0/0 | 7/7 | 0/2 | 0/1 |
| Hypertension | Minoyan | 6/9 | 0.84 | 0.96 | 0.10 | 6/3 | 0/2 | 6/6 | 0/1 | 0/0 |
| Influenza | Salvacion | 7/9 | 0.92 | 1.01 | 0.59 | 8/1 | 0/1 | 7/7 | 0/1 | 0/1 |
| Influenza | Alegria | 5/9 | 1.01 | 1.13 | 0.08 | 4/5 | 0/3 | 5/5 | 0/1 | 0/0 |
| Influenza | Blumentritt | 2/9 | 1.72 | 2.00 | 0.23 | 7/2 | 1/5 | 1/2 | 0/2 | 0/2 |
| Influenza | Caliban | 2/9 | 1.72 | 1.93 | -0.84 | 4/5 | 1/2 | 1/2 | 0/5 | 0/2 |
| Influenza | Cansilayan | 7/9 | 0.90 | 1.47 | -0.39 | 4/5 | 0/1 | 7/7 | 0/1 | 0/1 |
| Influenza | Sta. Rosa | 5/9 | 0.89 | 0.99 | 0.28 | 5/4 | 0/4 | 5/5 | 0/0 | 0/0 |
| Influenza | Minoyan | 4/9 | 1.16 | 1.39 | -0.48 | 4/5 | 0/2 | 3/3 | 1/4 | 0/1 |
| Acute Gastroenteritis | Salvacion | 4/9 | 1.21 | 1.73 | -0.23 | 5/4 | 0/3 | 4/4 | 0/2 | 0/1 |
| Acute Gastroenteritis | Alegria | 5/9 | 0.77 | 0.90 | 0.36 | 7/2 | 0/4 | 5/5 | 0/0 | 0/0 |
| Acute Gastroenteritis | Blumentritt | 4/9 | 1.12 | 1.31 | -0.46 | 4/5 | 0/1 | 4/4 | 0/4 | 0/1 |
| Acute Gastroenteritis | Caliban | 6/9 | 0.96 | 1.22 | -0.39 | 3/6 | 0/1 | 6/6 | 0/2 | 0/1 |
| Acute Gastroenteritis | Cansilayan | 6/9 | 0.85 | 0.97 | 0.22 | 6/3 | 0/2 | 6/6 | 0/1 | 0/0 |
| Acute Gastroenteritis | Sta. Rosa | 5/9 | 1.14 | 1.67 | -0.01 | 5/4 | 2/3 | 3/5 | 0/1 | 0/1 |
| Acute Gastroenteritis | Minoyan | 5/9 | 1.11 | 1.21 | 1.11 | 9/0 | 0/4 | 5/5 | 0/0 | 0/0 |
| Vertigo | Salvacion | 6/9 | 1.24 | 2.10 | -0.49 | 5/4 | 0/1 | 6/7 | 0/1 | 0/1 |
| Vertigo | Alegria | 3/9 | 1.56 | 1.91 | -0.95 | 3/6 | 0/0 | 2/4 | 1/5 | 0/1 |
| Vertigo | Blumentritt | 6/9 | 0.94 | 1.29 | 0.27 | 6/3 | 0/1 | 6/7 | 0/1 | 0/0 |
| Vertigo | Caliban | 6/9 | 0.80 | 0.94 | -0.04 | 5/4 | 0/2 | 6/6 | 0/1 | 0/0 |
| Vertigo | Cansilayan | 3/9 | 1.19 | 1.42 | -0.52 | 3/6 | 0/0 | 3/6 | 0/3 | 0/0 |
| Vertigo | Sta. Rosa | 5/9 | 0.99 | 1.10 | -0.27 | 4/5 | 0/1 | 5/5 | 0/3 | 0/0 |
| Vertigo | Minoyan | 6/9 | 1.18 | 1.49 | -0.56 | 5/4 | 1/1 | 5/5 | 0/3 | 0/1 |
| All types of skin disease | Salvacion | 4/9 | 1.16 | 1.25 | 0.59 | 7/2 | 0/2 | 4/7 | 0/0 | 0/0 |
| All types of skin disease | Alegria | 3/9 | 1.23 | 1.45 | 0.58 | 5/4 | 0/3 | 3/4 | 0/2 | 0/1 |
| All types of skin disease | Blumentritt | 5/9 | 1.34 | 1.52 | 0.32 | 6/3 | 0/2 | 5/5 | 0/2 | 0/2 |
| All types of skin disease | Caliban | 4/9 | 1.14 | 1.29 | 0.60 | 6/3 | 0/3 | 4/5 | 0/1 | 0/1 |
| All types of skin disease | Cansilayan | 7/9 | 0.83 | 0.99 | 0.52 | 7/2 | 0/1 | 7/7 | 0/1 | 0/0 |
| All types of skin disease | Sta. Rosa | 3/9 | 1.39 | 1.58 | 0.51 | 5/4 | 0/4 | 3/3 | 0/2 | 0/1 |
| All types of skin disease | Minoyan | 5/9 | 0.94 | 1.19 | -0.80 | 3/6 | 0/0 | 4/4 | 1/5 | 0/0 |

## Verification and preservation

Node reconstructed all 6,440 method-target records (1,610 split-specific targets ×4 methods). Separate Python verification reproduced predictions from the monthly CSV and native saved export, checked target uniqueness/alignment, independently recalculated summary metrics, and checked protected hashes. All checks passed. Existing source dataset, installed forecast bundle/service/route/frontend hashes are unchanged. No models fitted, no application or patient records changed, no database calls, no Azure operations. This was an offline numerical audit; no UI/manual browser testing was necessary or claimed. Reproduce with node audit.cjs, Python verify.py, then node report.cjs.
