# Shared completion record

CMP-6200 completed — CODEX-1 — 2026-11-03T07:28:36+08:00. All 70 unchanged SARIMA/6,200-case histories evaluated with a training-only, mean-aligned COM-Poisson probability layer. Primary 626/630: CMP Brier 0.236219, NLL 0.997520, RPS 0.325019 versus SARIMA-Poisson 0.337006/1.339526/0.412512; mean-Poisson 0.344647/1.347421/0.418816. Secondary 973/980: CMP 0.241107/1.000185/0.322788. Exact assigned probability 49.20% versus observed 61.98% primary; calibration improved but remains imperfect. Primary scope comparison: 67 improved, 2 worsened, 1 mixed; secondary 67 improved, 3 worsened (both NLL/RPS criterion, descriptive only). All 70 October probabilities available; no CMP numerical failures in 1,050 training fits. Original four/seven missing historical SARIMA targets retained. No-zero synthetic scenario cannot validate zero-versus-positive discrimination. No application, model, dataset, DB or Azure changes. Recommendation: separately approved experimental preview only; no integration authorized. Full report: CMP_6200_PROBABILITY_20261103.md. Evidence: C:\Users\User\.codex\visualizations\2026\09\26\01a0dc67-9eb2-7d12-988d-be95e09269e0\cmp6200-20261103.

Verified ZIP SHA-256: `6ca6b6a463b3621a6ce69666421f0007793ed30bc2133ab3786aac0b752c1ab9`. CRC and all 30 evidence hashes passed. Independent recurrence verified all 1,599 protocol-target distributions and all 70 October results; analytical gradient/Hessian checks passed for 1,050 fits. Portable reproduction preparation and source parsing passed; no redundant second fitting run. 188 protected runtime/data files and pre-scoring policy/source hashes remain unchanged.

# SARIMA + COM-Poisson: all-70 research report

3 November 2026 • CODEX-1 • Separate exploratory experiment. No application integration.

## Frozen method and numerical verification

See POLICY.md and freeze.json. SARIMA means and targets were read unchanged. CMP P(Y=k)=exp(kθ−ν log(k!)−log Z); solve θ so E(Y) equals the saved nonnegative SARIMA mean. Its rate exp(θ) is not automatically the mean. Training-only intercept CMP maximum likelihood estimates ν separately for each expanding history. This estimates marginal dispersion, not conditional SARIMA residual dispersion; transferring it to the SARIMA mean is the specific assumption tested. No score-driven retuning.

A preflight-only bracketing bug initially caused a tail-bound exception before any target scoring. The initial upper bracket was replaced with ν log(μ+2), avoiding enormous irrelevant means. The final policy/source hashes were frozen before the successful evaluation. Acceptance checks were unchanged.

Poisson equivalence, independent long-double recurrence and mean/normalization checks passed. Every scored distribution also passed an independent RPS identity. Tail bounds, training prefix hashes and all runtime/data preservation hashes were checked. Finite-difference optimizer gradients and curvatures are exported. Zero mean is a point mass at zero, with infinite log loss for positive actual counts; no epsilon floor. Missing/failed fits are retained explicitly.

## Data and coverage

The verified CSV has 3,150 distinct month/disease/barangay cells, 6,200 cases, 70 histories and 45 months (January 2023–September 2026). There are no zero-count months. Names exactly match the active service dropdown configuration. All 70 October rows are in october-all70.csv. The old 5,592 archive is preserved.

## Primary 36/9

Expanding one-month-ahead predictions; matched intersection of all three methods. All original requested targets remain in availability.csv.


Method | Available/requested | Matched N | Exact assigned | Exact observed | Brier | NLL | RPS | Nearby assigned/observed | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | --- | ---
SARIMA-Poisson | 626/630 | 626 | 28.73% | 61.98% | 0.3370 | 1.3395 | 0.4125 | 74.79% / 95.53% | 99.20% / 100.00%
SARIMA-CMP | 626/630 | 626 | 49.20% | 61.98% | 0.2362 | 0.9975 | 0.3250 | 94.32% / 95.53% | 96.33% / 98.08%
Mean-Poisson | 630/630 | 626 | 27.45% | 61.98% | 0.3446 | 1.3474 | 0.4188 | 71.87% / 95.53% | 99.04% / 100.00%



Method | 80% width | 95% width | 80% actual assigned mass | 95% actual assigned mass
--- | --- | --- | --- | ---
SARIMA-Poisson | 3.5783 | 4.8978 | 0.9358 | 0.9854
SARIMA-CMP | 1.8498 | 2.8339 | 0.9362 | 0.9851
Mean-Poisson | 3.6038 | 4.9712 | 0.9303 | 0.9845


### Calibration by fixed probability bin


Method | Event | Bin | N | Assigned | Observed
--- | --- | --- | --- | --- | ---
SARIMA-Poisson | exact | 10–20% | 56 | 18.57% | 32.14%
SARIMA-Poisson | exact | 20–30% | 359 | 26.35% | 62.12%
SARIMA-Poisson | exact | 30–40% | 211 | 35.48% | 69.67%
SARIMA-Poisson | near | 40–50% | 22 | 49.33% | 81.82%
SARIMA-Poisson | near | 50–60% | 39 | 54.94% | 71.79%
SARIMA-Poisson | near | 60–70% | 24 | 62.68% | 91.67%
SARIMA-Poisson | near | 70–80% | 330 | 72.27% | 97.88%
SARIMA-Poisson | near | 80–90% | 182 | 85.57% | 97.80%
SARIMA-Poisson | near | 90–100% | 29 | 91.93% | 100.00%
SARIMA-CMP | exact | 20–30% | 2 | 28.54% | 0.00%
SARIMA-CMP | exact | 30–40% | 97 | 36.37% | 36.08%
SARIMA-CMP | exact | 40–50% | 254 | 45.85% | 59.84%
SARIMA-CMP | exact | 50–60% | 206 | 54.43% | 72.33%
SARIMA-CMP | exact | 60–70% | 55 | 63.18% | 78.18%
SARIMA-CMP | exact | 70–80% | 12 | 73.38% | 75.00%
SARIMA-CMP | near | 70–80% | 9 | 77.07% | 66.67%
SARIMA-CMP | near | 80–90% | 90 | 85.72% | 86.67%
SARIMA-CMP | near | 90–100% | 527 | 96.08% | 97.53%
Mean-Poisson | exact | 10–20% | 75 | 17.88% | 28.00%
Mean-Poisson | exact | 20–30% | 372 | 26.63% | 64.78%
Mean-Poisson | exact | 30–40% | 179 | 33.16% | 70.39%
Mean-Poisson | near | 30–40% | 2 | 36.86% | 50.00%
Mean-Poisson | near | 40–50% | 24 | 47.63% | 87.50%
Mean-Poisson | near | 50–60% | 50 | 53.53% | 74.00%
Mean-Poisson | near | 60–70% | 18 | 66.52% | 88.89%
Mean-Poisson | near | 70–80% | 450 | 73.40% | 98.89%
Mean-Poisson | near | 80–90% | 82 | 83.77% | 95.12%


CMP vs ordinary Poisson, requiring both NLL and RPS: {'improved': 67, 'worsened': 2, 'tied': 0, 'mixed': 1}. Mixed means score directions differ, not proof of equivalence.

### disease results (best to worst CMP RPS; descriptive rankings)


Group | N | CMP RPS | Poisson RPS | CMP NLL | Mean-Poisson NLL
--- | --- | --- | --- | --- | ---
Hypertension | 63 | 0.2185 | 0.3310 | 0.7887 | 1.2509
Influenza | 59 | 0.2239 | 0.3326 | 0.8250 | 1.3386
ARI | 63 | 0.2464 | 0.3535 | 0.8792 | 1.2977
Vertigo | 63 | 0.2593 | 0.3624 | 0.8650 | 1.2776
Acute Gastroenteritis | 63 | 0.2680 | 0.3611 | 0.8855 | 1.2398
URTI | 63 | 0.3001 | 0.3981 | 0.9647 | 1.3226
Fever unknown origin | 63 | 0.3076 | 0.3663 | 0.9297 | 1.2482
Infection all types | 63 | 0.3227 | 0.3872 | 0.9654 | 1.2720
All types of skin disease | 63 | 0.3526 | 0.4332 | 1.0818 | 1.3586
Cough | 63 | 0.7445 | 0.7947 | 1.7792 | 1.8676


### barangay results (best to worst CMP RPS; descriptive rankings)


Group | N | CMP RPS | Poisson RPS | CMP NLL | Mean-Poisson NLL
--- | --- | --- | --- | --- | ---
Minoyan | 90 | 0.2892 | 0.3852 | 0.9295 | 1.3240
Salvacion | 90 | 0.2968 | 0.3896 | 0.9497 | 1.3209
Alegria | 90 | 0.3017 | 0.3912 | 0.9231 | 1.3098
Sta. Rosa | 90 | 0.3420 | 0.4249 | 1.0146 | 1.3805
Blumentritt | 90 | 0.3454 | 0.4328 | 1.0787 | 1.3740
Caliban | 86 | 0.3459 | 0.4269 | 1.0230 | 1.3864
Cansilayan | 90 | 0.3551 | 0.4377 | 1.0651 | 1.3381


## Secondary 31/14

Expanding one-month-ahead predictions; matched intersection of all three methods. All original requested targets remain in availability.csv.


Method | Available/requested | Matched N | Exact assigned | Exact observed | Brier | NLL | RPS | Nearby assigned/observed | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | --- | ---
SARIMA-Poisson | 973/980 | 973 | 28.61% | 61.97% | 0.3391 | 1.3357 | 0.4084 | 74.57% / 95.99% | 99.38% / 100.00%
SARIMA-CMP | 973/980 | 973 | 48.45% | 61.97% | 0.2411 | 1.0002 | 0.3228 | 93.97% / 95.99% | 96.81% / 98.36%
Mean-Poisson | 980/980 | 973 | 27.23% | 61.97% | 0.3465 | 1.3388 | 0.4099 | 71.50% / 95.99% | 99.28% / 100.00%



Method | 80% width | 95% width | 80% actual assigned mass | 95% actual assigned mass
--- | --- | --- | --- | ---
SARIMA-Poisson | 3.5807 | 4.9054 | 0.9348 | 0.9851
SARIMA-CMP | 1.8798 | 2.9065 | 0.9348 | 0.9855
Mean-Poisson | 3.6280 | 5.0051 | 0.9304 | 0.9847


### Calibration by fixed probability bin


Method | Event | Bin | N | Assigned | Observed
--- | --- | --- | --- | --- | ---
SARIMA-Poisson | exact | 10–20% | 91 | 18.66% | 35.16%
SARIMA-Poisson | exact | 20–30% | 571 | 26.37% | 62.00%
SARIMA-Poisson | exact | 30–40% | 310 | 35.50% | 70.00%
SARIMA-Poisson | exact | 70–80% | 1 | 76.82% | 0.00%
SARIMA-Poisson | near | 40–50% | 31 | 49.18% | 77.42%
SARIMA-Poisson | near | 50–60% | 67 | 54.84% | 79.10%
SARIMA-Poisson | near | 60–70% | 37 | 63.18% | 91.89%
SARIMA-Poisson | near | 70–80% | 527 | 72.22% | 98.48%
SARIMA-Poisson | near | 80–90% | 256 | 85.48% | 97.66%
SARIMA-Poisson | near | 90–100% | 55 | 92.41% | 98.18%
SARIMA-CMP | exact | 20–30% | 4 | 28.76% | 0.00%
SARIMA-CMP | exact | 30–40% | 164 | 36.39% | 37.80%
SARIMA-CMP | exact | 40–50% | 424 | 45.57% | 61.56%
SARIMA-CMP | exact | 50–60% | 287 | 54.38% | 72.13%
SARIMA-CMP | exact | 60–70% | 78 | 63.32% | 82.05%
SARIMA-CMP | exact | 70–80% | 15 | 73.68% | 60.00%
SARIMA-CMP | exact | 80–90% | 1 | 86.08% | 0.00%
SARIMA-CMP | near | 70–80% | 17 | 76.79% | 64.71%
SARIMA-CMP | near | 80–90% | 142 | 85.64% | 88.73%
SARIMA-CMP | near | 90–100% | 814 | 95.78% | 97.91%
Mean-Poisson | exact | 10–20% | 120 | 17.90% | 30.00%
Mean-Poisson | exact | 20–30% | 599 | 26.62% | 64.61%
Mean-Poisson | exact | 30–40% | 254 | 33.05% | 70.87%
Mean-Poisson | near | 30–40% | 2 | 36.86% | 50.00%
Mean-Poisson | near | 40–50% | 37 | 46.97% | 81.08%
Mean-Poisson | near | 50–60% | 82 | 53.53% | 80.49%
Mean-Poisson | near | 60–70% | 35 | 66.90% | 91.43%
Mean-Poisson | near | 70–80% | 704 | 73.24% | 99.29%
Mean-Poisson | near | 80–90% | 112 | 83.74% | 94.64%
Mean-Poisson | near | 90–100% | 1 | 90.11% | 0.00%


CMP vs ordinary Poisson, requiring both NLL and RPS: {'improved': 67, 'worsened': 3, 'tied': 0, 'mixed': 0}. Mixed means score directions differ, not proof of equivalence.

### disease results (best to worst CMP RPS; descriptive rankings)


Group | N | CMP RPS | Poisson RPS | CMP NLL | Mean-Poisson NLL
--- | --- | --- | --- | --- | ---
Influenza | 91 | 0.2326 | 0.3387 | 0.8415 | 1.3166
Hypertension | 98 | 0.2422 | 0.3441 | 0.8346 | 1.2505
Acute Gastroenteritis | 98 | 0.2508 | 0.3442 | 0.8460 | 1.2264
Vertigo | 98 | 0.2655 | 0.3572 | 0.8715 | 1.2687
ARI | 98 | 0.2754 | 0.3721 | 0.9893 | 1.3152
Infection all types | 98 | 0.3002 | 0.3740 | 0.9415 | 1.2689
Fever unknown origin | 98 | 0.3067 | 0.3721 | 0.9456 | 1.2532
URTI | 98 | 0.3089 | 0.4043 | 0.9987 | 1.3324
All types of skin disease | 98 | 0.3432 | 0.4153 | 1.0431 | 1.3283
Cough | 98 | 0.6960 | 0.7571 | 1.6786 | 1.8265


### barangay results (best to worst CMP RPS; descriptive rankings)


Group | N | CMP RPS | Poisson RPS | CMP NLL | Mean-Poisson NLL
--- | --- | --- | --- | --- | ---
Minoyan | 140 | 0.2856 | 0.3806 | 0.9236 | 1.3174
Alegria | 140 | 0.2889 | 0.3847 | 0.9152 | 1.3074
Caliban | 135 | 0.3118 | 0.4009 | 0.9706 | 1.3549
Salvacion | 140 | 0.3136 | 0.3980 | 0.9799 | 1.3301
Sta. Rosa | 140 | 0.3262 | 0.4114 | 0.9865 | 1.3551
Blumentritt | 140 | 0.3580 | 0.4366 | 1.0934 | 1.3623
Cansilayan | 138 | 0.3758 | 0.4468 | 1.1330 | 1.3453


## October 2026 — every combination

Probabilities below are unvalidated model estimates. October outcomes have not been observed in this research. Nearby means the displayed integer ±1, bounded at zero.


Disease | Barangay | SARIMA mean | Rounded cases | Poisson exact % | CMP exact % | CMP nearby % | CMP at least one % | CMP 80% interval | CMP 95% interval | Status
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
Cough | Salvacion | 3.785266 | 4 | 19.42 | 38.29 | 87.79 | 99.999286 | 3–5 | 2–6 | ok
Cough | Alegria | 4.483161 | 4 | 19.02 | 35.66 | 82.49 | 99.999969 | 3–6 | 3–7 | ok
Cough | Blumentritt | 5.039218 | 5 | 17.54 | 30.87 | 76.87 | 99.999768 | 3–7 | 3–8 | ok
Cough | Caliban | 4.533549 | 5 | 17.14 | 29.28 | 75.48 | 99.999292 | 3–6 | 2–7 | ok
Cough | Cansilayan | 4.141246 | 4 | 19.49 | 33.20 | 80.20 | 99.994790 | 3–6 | 2–7 | ok
Cough | Sta. Rosa | 4.512049 | 5 | 17.11 | 32.50 | 81.10 | 99.999975 | 3–6 | 3–7 | ok
Cough | Minoyan | 4.361664 | 4 | 19.24 | 37.02 | 84.35 | 99.999932 | 3–6 | 3–6 | ok
URTI | Salvacion | 2.534468 | 3 | 21.52 | 37.46 | 89.58 | 99.879927 | 2–4 | 1–4 | ok
URTI | Alegria | 1.687365 | 2 | 26.34 | 46.20 | 96.85 | 97.738134 | 1–3 | 1–3 | ok
URTI | Blumentritt | 1.352995 | 1 | 34.97 | 57.88 | 96.48 | 94.781225 | 1–2 | 0–3 | ok
URTI | Caliban | 2.639388 | 3 | 21.88 | 37.49 | 88.40 | 99.813282 | 2–4 | 1–5 | ok
URTI | Cansilayan | 2.001855 | 2 | 27.07 | 58.91 | 98.53 | 99.823105 | 1–3 | 1–3 | ok
URTI | Sta. Rosa | 1.264998 | 1 | 35.70 | 59.45 | 96.93 | 91.388969 | 1–2 | 0–3 | ok
URTI | Minoyan | 1.338702 | 1 | 35.10 | 54.64 | 95.13 | 91.692747 | 1–2 | 0–3 | ok
Infection all types | Salvacion | 1.904252 | 2 | 27.00 | 38.21 | 88.47 | 94.536318 | 1–3 | 0–4 | ok
Infection all types | Alegria | 2.161371 | 2 | 26.90 | 61.67 | 98.33 | 99.971147 | 1–3 | 1–3 | ok
Infection all types | Blumentritt | 1.662068 | 2 | 26.21 | 41.76 | 94.11 | 95.616963 | 1–3 | 0–3 | ok
Infection all types | Caliban | 1.912060 | 2 | 27.01 | 46.08 | 94.80 | 97.983984 | 1–3 | 1–4 | ok
Infection all types | Cansilayan | 1.643851 | 2 | 26.11 | 45.45 | 96.97 | 97.628048 | 1–3 | 1–3 | ok
Infection all types | Sta. Rosa | 1.554294 | 2 | 25.53 | 42.08 | 96.24 | 96.695465 | 1–2 | 0–3 | ok
Infection all types | Minoyan | 1.564120 | 2 | 25.60 | 42.89 | 96.66 | 97.084091 | 1–2 | 0–3 | ok
ARI | Salvacion | 2.012237 | 2 | 27.07 | 48.12 | 95.14 | 98.840688 | 1–3 | 1–4 | ok
ARI | Alegria | 1.870389 | 2 | 26.95 | 50.80 | 97.30 | 98.941304 | 1–3 | 1–3 | ok
ARI | Blumentritt | 1.761543 | 2 | 26.65 | 47.23 | 96.65 | 97.993528 | 1–3 | 1–3 | ok
ARI | Caliban | 1.964452 | 2 | 27.06 | 52.00 | 97.06 | 99.289102 | 1–3 | 1–3 | ok
ARI | Cansilayan | 0.972750 | 1 | 36.77 | 72.59 | 99.73 | 84.795180 | 0–2 | 0–2 | ok
ARI | Sta. Rosa | 1.703997 | 2 | 26.42 | 46.81 | 96.99 | 97.914622 | 1–3 | 1–3 | ok
ARI | Minoyan | 2.805430 | 3 | 22.26 | 42.79 | 92.47 | 99.962924 | 2–4 | 1–5 | ok
Fever unknown origin | Salvacion | 1.842108 | 2 | 26.89 | 44.24 | 94.20 | 97.103163 | 1–3 | 0–4 | ok
Fever unknown origin | Alegria | 1.289098 | 1 | 35.52 | 59.73 | 96.98 | 92.760416 | 1–2 | 0–3 | ok
Fever unknown origin | Blumentritt | 1.750419 | 2 | 26.61 | 37.86 | 89.29 | 93.206262 | 1–3 | 0–4 | ok
Fever unknown origin | Caliban | 1.617701 | 2 | 25.95 | 42.64 | 95.47 | 96.350787 | 1–3 | 0–3 | ok
Fever unknown origin | Cansilayan | 0.985078 | 1 | 36.78 | 66.61 | 99.34 | 82.225389 | 0–2 | 0–2 | ok
Fever unknown origin | Sta. Rosa | 1.804273 | 2 | 26.79 | 48.50 | 96.88 | 98.371602 | 1–3 | 1–3 | ok
Fever unknown origin | Minoyan | 1.424246 | 1 | 34.28 | 52.27 | 94.17 | 94.279968 | 1–2 | 0–3 | ok
Hypertension | Salvacion | 1.000007 | 1 | 36.79 | 64.52 | 99.09 | 81.798158 | 0–2 | 0–2 | ok
Hypertension | Alegria | 1.651951 | 2 | 26.15 | 44.65 | 96.38 | 97.223511 | 1–3 | 0–3 | ok
Hypertension | Blumentritt | 2.005179 | 2 | 27.07 | 47.64 | 94.95 | 98.722518 | 1–3 | 1–4 | ok
Hypertension | Caliban | 1.839703 | 2 | 26.88 | 52.14 | 97.94 | 99.119903 | 1–3 | 1–3 | ok
Hypertension | Cansilayan | 1.752937 | 2 | 26.62 | 48.06 | 97.11 | 98.241583 | 1–3 | 1–3 | ok
Hypertension | Sta. Rosa | 1.921967 | 2 | 27.02 | 55.07 | 98.19 | 99.531360 | 1–3 | 1–3 | ok
Hypertension | Minoyan | 1.360971 | 1 | 34.90 | 56.68 | 96.02 | 94.328543 | 1–2 | 0–3 | ok
Influenza | Salvacion | 1.928656 | 2 | 27.03 | 45.88 | 94.56 | 97.993796 | 1–3 | 1–4 | ok
Influenza | Alegria | 1.818983 | 2 | 26.83 | 48.75 | 96.88 | 98.449979 | 1–3 | 1–3 | ok
Influenza | Blumentritt | 1.905750 | 2 | 27.01 | 49.52 | 96.55 | 98.778373 | 1–3 | 1–3 | ok
Influenza | Caliban | 3.470821 | 3 | 21.67 | 33.02 | 78.90 | 99.925663 | 2–5 | 1–6 | ok
Influenza | Cansilayan | 1.709409 | 2 | 26.44 | 42.13 | 93.86 | 95.799907 | 1–3 | 0–3 | ok
Influenza | Sta. Rosa | 3.190508 | 3 | 22.27 | 38.14 | 86.19 | 99.942096 | 2–5 | 1–5 | ok
Influenza | Minoyan | 1.926312 | 2 | 27.03 | 50.49 | 96.79 | 98.995803 | 1–3 | 1–3 | ok
Acute Gastroenteritis | Salvacion | 1.174097 | 1 | 36.29 | 64.41 | 98.29 | 90.037332 | 1–2 | 0–2 | ok
Acute Gastroenteritis | Alegria | 1.171590 | 1 | 36.30 | 65.47 | 98.47 | 90.533829 | 1–2 | 0–2 | ok
Acute Gastroenteritis | Blumentritt | 2.001876 | 2 | 27.07 | 47.33 | 94.82 | 98.647838 | 1–3 | 1–4 | ok
Acute Gastroenteritis | Caliban | 1.337779 | 1 | 35.11 | 57.14 | 96.14 | 93.457186 | 1–2 | 0–3 | ok
Acute Gastroenteritis | Cansilayan | 1.147431 | 1 | 36.43 | 59.84 | 97.57 | 86.028459 | 0–2 | 0–2 | ok
Acute Gastroenteritis | Sta. Rosa | 1.846554 | 2 | 26.90 | 53.13 | 98.17 | 99.259570 | 1–3 | 1–3 | ok
Acute Gastroenteritis | Minoyan | 1.660878 | 2 | 26.20 | 47.63 | 97.83 | 98.345290 | 1–2 | 1–3 | ok
Vertigo | Salvacion | 1.757063 | 2 | 26.64 | 48.87 | 97.42 | 98.456793 | 1–3 | 1–3 | ok
Vertigo | Alegria | 1.194240 | 1 | 36.18 | 56.75 | 96.52 | 86.259945 | 0–2 | 0–3 | ok
Vertigo | Blumentritt | 2.556874 | 3 | 21.60 | 41.24 | 93.56 | 99.977450 | 2–3 | 1–4 | ok
Vertigo | Caliban | 1.242902 | 1 | 35.86 | 61.76 | 97.57 | 91.779594 | 1–2 | 0–2 | ok
Vertigo | Cansilayan | 1.471166 | 1 | 33.79 | 49.02 | 92.37 | 93.985002 | 1–2 | 0–3 | ok
Vertigo | Sta. Rosa | 1.809421 | 2 | 26.81 | 49.58 | 97.29 | 98.631097 | 1–3 | 1–3 | ok
Vertigo | Minoyan | 1.702005 | 2 | 26.41 | 46.76 | 96.98 | 97.901378 | 1–3 | 1–3 | ok
All types of skin disease | Salvacion | 1.519164 | 2 | 25.26 | 40.24 | 95.46 | 95.900074 | 1–2 | 0–3 | ok
All types of skin disease | Alegria | 1.596987 | 2 | 25.82 | 45.04 | 97.43 | 97.830323 | 1–2 | 1–3 | ok
All types of skin disease | Blumentritt | 2.039613 | 2 | 27.06 | 47.20 | 94.47 | 98.771475 | 1–3 | 1–4 | ok
All types of skin disease | Caliban | 1.245861 | 1 | 35.84 | 58.30 | 96.67 | 89.709757 | 0–2 | 0–3 | ok
All types of skin disease | Cansilayan | 1.525583 | 2 | 25.31 | 40.07 | 95.09 | 95.609261 | 1–2 | 0–3 | ok
All types of skin disease | Sta. Rosa | 1.960324 | 2 | 27.06 | 51.98 | 97.09 | 99.278949 | 1–3 | 1–3 | ok
All types of skin disease | Minoyan | 1.600007 | 2 | 25.84 | 38.53 | 91.78 | 93.432319 | 1–3 | 0–3 | ok

## Individual historical tables — all 70 selections

Both protocols are separate below. Full precision is retained in per-combination.csv and targets.csv. Brier evaluates the same SARIMA-defined integer event in all three methods.

### Cough / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 19.23% / 66.67% | 54.01% / 88.89% | 0.4448 | 1.6984 | 0.5793 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 36.36% / 66.67% | 84.97% / 88.89% | 0.3154 | 1.2688 | 0.4409 | 88.89% / 100.00%
80_20 | Mean-Poisson | 9 | 18.68% / 66.67% | 52.53% / 88.89% | 0.4507 | 1.6890 | 0.5635 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 19.02% / 42.86% | 53.46% / 78.57% | 0.2984 | 1.7868 | 0.6810 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 36.47% / 42.86% | 84.92% / 78.57% | 0.2510 | 1.4864 | 0.5889 | 85.71% / 100.00%
31_14 | Mean-Poisson | 14 | 18.50% / 42.86% | 52.17% / 78.57% | 0.3017 | 1.7872 | 0.6837 | 100.00% / 100.00%


### Cough / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 18.28% / 33.33% | 51.56% / 77.78% | 0.2416 | 1.8300 | 0.6992 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 36.49% / 33.33% | 84.75% / 77.78% | 0.2146 | 1.4912 | 0.5917 | 88.89% / 100.00%
80_20 | Mean-Poisson | 9 | 17.89% / 33.33% | 50.69% / 77.78% | 0.2423 | 1.8164 | 0.6793 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 18.69% / 50.00% | 52.63% / 85.71% | 0.3434 | 1.7807 | 0.6379 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 36.65% / 50.00% | 85.08% / 85.71% | 0.2609 | 1.3630 | 0.4966 | 92.86% / 100.00%
31_14 | Mean-Poisson | 14 | 18.38% / 50.00% | 51.77% / 85.71% | 0.3447 | 1.7661 | 0.6147 | 100.00% / 100.00%


### Cough / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 18.72% / 22.22% | 52.71% / 77.78% | 0.1712 | 1.7341 | 0.6346 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 32.60% / 22.22% | 79.75% / 77.78% | 0.1817 | 1.4170 | 0.5487 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 18.26% / 22.22% | 51.27% / 77.78% | 0.1720 | 1.8318 | 0.7883 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 18.25% / 21.43% | 51.47% / 78.57% | 0.1652 | 1.7873 | 0.6916 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 31.78% / 21.43% | 78.26% / 78.57% | 0.1753 | 1.5054 | 0.6206 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 17.78% / 21.43% | 50.17% / 78.57% | 0.1661 | 1.8248 | 0.7472 | 100.00% / 100.00%


### Cough / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 18.70% / 22.22% | 52.67% / 77.78% | 0.1721 | 1.9750 | 0.8881 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 34.85% / 22.22% | 82.87% / 77.78% | 0.1852 | 1.9303 | 0.8559 | 77.78% / 88.89%
80_20 | Mean-Poisson | 9 | 17.91% / 22.22% | 50.85% / 77.78% | 0.1680 | 2.0516 | 1.0183 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 18.95% / 28.57% | 53.33% / 85.71% | 0.2113 | 1.8467 | 0.7523 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 35.81% / 28.57% | 84.27% / 85.71% | 0.2051 | 1.6421 | 0.6815 | 85.71% / 92.86%
31_14 | Mean-Poisson | 14 | 18.49% / 28.57% | 52.23% / 85.71% | 0.2086 | 1.8990 | 0.8403 | 100.00% / 100.00%


### Cough / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 19.95% / 33.33% | 55.66% / 66.67% | 0.2320 | 2.0982 | 1.0898 | 77.78% / 100.00%
80_20 | SARIMA-CMP | 9 | 34.66% / 33.33% | 82.31% / 66.67% | 0.2103 | 2.5102 | 1.0952 | 77.78% / 77.78%
80_20 | Mean-Poisson | 9 | 18.02% / 33.33% | 50.50% / 66.67% | 0.2391 | 1.9082 | 0.8676 | 88.89% / 100.00%
31_14 | SARIMA-Poisson | 14 | 19.96% / 35.71% | 55.64% / 64.29% | 0.2471 | 2.0382 | 1.0393 | 85.71% / 100.00%
31_14 | SARIMA-CMP | 14 | 34.97% / 35.71% | 82.54% / 64.29% | 0.2184 | 2.3690 | 1.0630 | 71.43% / 78.57%
31_14 | Mean-Poisson | 14 | 18.18% / 35.71% | 50.93% / 64.29% | 0.2546 | 1.8617 | 0.8180 | 92.86% / 100.00%


### Cough / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 18.55% / 0.00% | 52.19% / 55.56% | 0.0346 | 2.0829 | 1.0296 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 39.49% / 0.00% | 87.80% / 55.56% | 0.1575 | 2.4167 | 1.1187 | 66.67% / 88.89%
80_20 | Mean-Poisson | 9 | 17.63% / 0.00% | 50.05% / 55.56% | 0.0313 | 2.0460 | 0.9844 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 18.73% / 14.29% | 52.63% / 71.43% | 0.1223 | 1.9356 | 0.8634 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 41.03% / 14.29% | 89.24% / 71.43% | 0.1831 | 1.9929 | 0.8816 | 78.57% / 92.86%
31_14 | Mean-Poisson | 14 | 18.05% / 14.29% | 51.07% / 71.43% | 0.1199 | 1.9040 | 0.8218 | 100.00% / 100.00%


### Cough / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 19.12% / 55.56% | 53.48% / 77.78% | 0.3771 | 1.7371 | 0.6421 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 36.72% / 55.56% | 84.40% / 77.78% | 0.2782 | 1.4202 | 0.5608 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 19.02% / 55.56% | 53.21% / 77.78% | 0.3772 | 1.7306 | 0.6317 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 19.03% / 57.14% | 53.26% / 85.71% | 0.3867 | 1.7391 | 0.6342 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 36.52% / 57.14% | 84.19% / 85.71% | 0.2809 | 1.3914 | 0.5399 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 18.88% / 57.14% | 52.86% / 85.71% | 0.3876 | 1.7423 | 0.6392 | 100.00% / 100.00%


### URTI / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 24.57% / 33.33% | 66.52% / 88.89% | 0.2151 | 1.5011 | 0.5048 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 43.59% / 33.33% | 91.86% / 88.89% | 0.2054 | 1.2022 | 0.4329 | 88.89% / 100.00%
80_20 | Mean-Poisson | 9 | 23.74% / 33.33% | 64.31% / 88.89% | 0.2199 | 1.4562 | 0.4502 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 23.94% / 35.71% | 65.03% / 78.57% | 0.2342 | 1.5780 | 0.5667 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 42.61% / 35.71% | 90.76% / 78.57% | 0.2171 | 1.3455 | 0.5077 | 85.71% / 100.00%
31_14 | Mean-Poisson | 14 | 22.39% / 35.71% | 61.29% / 78.57% | 0.2445 | 1.5677 | 0.5575 | 100.00% / 100.00%


### URTI / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 29.27% / 44.44% | 76.36% / 100.00% | 0.2965 | 1.3323 | 0.3873 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 48.39% / 44.44% | 95.73% / 100.00% | 0.2705 | 0.9284 | 0.2942 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.06% / 44.44% | 74.34% / 100.00% | 0.2961 | 1.3078 | 0.3642 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 30.19% / 50.00% | 77.82% / 100.00% | 0.3036 | 1.2932 | 0.3725 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 48.99% / 50.00% | 95.49% / 100.00% | 0.2651 | 0.9098 | 0.2868 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 28.71% / 50.00% | 75.02% / 100.00% | 0.3072 | 1.2757 | 0.3555 | 100.00% / 100.00%


### URTI / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 35.81% / 66.67% | 87.61% / 88.89% | 0.3207 | 1.3132 | 0.4344 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 63.41% / 66.67% | 98.01% / 88.89% | 0.2432 | 1.1424 | 0.3804 | 88.89% / 88.89%
80_20 | Mean-Poisson | 9 | 35.67% / 66.67% | 86.42% / 88.89% | 0.3181 | 1.2794 | 0.4036 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 35.85% / 71.43% | 88.01% / 85.71% | 0.3338 | 1.3508 | 0.4615 | 92.86% / 100.00%
31_14 | SARIMA-CMP | 14 | 63.17% / 71.43% | 97.99% / 85.71% | 0.2345 | 1.3002 | 0.4054 | 85.71% / 85.71%
31_14 | Mean-Poisson | 14 | 35.61% / 71.43% | 86.24% / 85.71% | 0.3327 | 1.2875 | 0.4158 | 100.00% / 100.00%


### URTI / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 31.32% / 55.56% | 79.49% / 88.89% | 0.3035 | 1.4136 | 0.4962 | 88.89% / 100.00%
80_20 | SARIMA-CMP | 9 | 52.74% / 55.56% | 96.51% / 88.89% | 0.2486 | 1.2889 | 0.4427 | 88.89% / 88.89%
80_20 | Mean-Poisson | 9 | 29.59% / 55.56% | 75.96% / 88.89% | 0.3130 | 1.4317 | 0.5099 | 88.89% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.60% / 64.29% | 76.96% / 92.86% | 0.3550 | 1.3769 | 0.4472 | 92.86% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.11% / 64.29% | 96.26% / 92.86% | 0.2638 | 1.1394 | 0.3730 | 92.86% / 92.86%
31_14 | Mean-Poisson | 14 | 28.19% / 64.29% | 74.46% / 92.86% | 0.3640 | 1.3901 | 0.4591 | 92.86% / 100.00%


### URTI / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.07% / 100.00% | 72.17% / 100.00% | 0.5319 | 1.3069 | 0.3111 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 55.43% / 100.00% | 97.77% / 100.00% | 0.1990 | 0.5905 | 0.1000 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.06% / 100.00% | 72.06% / 100.00% | 0.5320 | 1.3070 | 0.3109 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 26.70% / 92.86% | 71.45% / 100.00% | 0.4979 | 1.3182 | 0.3250 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 52.84% / 92.86% | 96.87% / 100.00% | 0.2110 | 0.6614 | 0.1351 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.44% / 92.86% | 70.81% / 100.00% | 0.4964 | 1.3070 | 0.3109 | 100.00% / 100.00%


### URTI / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.40% / 77.78% | 84.16% / 100.00% | 0.3473 | 1.1089 | 0.2867 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 56.08% / 77.78% | 96.10% / 100.00% | 0.2053 | 0.6925 | 0.2020 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 31.33% / 77.78% | 77.07% / 100.00% | 0.3774 | 1.1598 | 0.3304 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 32.27% / 85.71% | 80.72% / 100.00% | 0.4066 | 1.1639 | 0.2941 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 52.98% / 85.71% | 95.61% / 100.00% | 0.2311 | 0.7125 | 0.1872 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 29.86% / 85.71% | 75.63% / 100.00% | 0.4320 | 1.2114 | 0.3387 | 100.00% / 100.00%


### URTI / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 30.66% / 66.67% | 78.30% / 100.00% | 0.3848 | 1.3325 | 0.3659 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 48.62% / 66.67% | 94.59% / 100.00% | 0.2867 | 0.9081 | 0.2483 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.56% / 66.67% | 74.13% / 100.00% | 0.3868 | 1.3160 | 0.3496 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 31.03% / 64.29% | 78.64% / 100.00% | 0.3614 | 1.2983 | 0.3634 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 47.84% / 64.29% | 93.49% / 100.00% | 0.2804 | 0.9224 | 0.2674 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 28.85% / 64.29% | 74.36% / 100.00% | 0.3670 | 1.2871 | 0.3513 | 100.00% / 100.00%


### Infection all types / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.79% / 55.56% | 72.24% / 100.00% | 0.3310 | 1.3622 | 0.4267 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 36.29% / 55.56% | 86.47% / 100.00% | 0.2870 | 1.1625 | 0.3795 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.01% / 55.56% | 72.48% / 100.00% | 0.3284 | 1.3478 | 0.4103 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 26.79% / 71.43% | 72.07% / 100.00% | 0.4042 | 1.3460 | 0.3896 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 35.36% / 71.43% | 85.04% / 100.00% | 0.3415 | 1.1360 | 0.3325 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.02% / 71.43% | 72.46% / 100.00% | 0.4012 | 1.3335 | 0.3757 | 100.00% / 100.00%


### Infection all types / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.26% / 55.56% | 72.47% / 100.00% | 0.3311 | 1.3934 | 0.4158 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 59.45% / 55.56% | 98.67% / 100.00% | 0.2307 | 0.9464 | 0.3010 | 88.89% / 100.00%
80_20 | Mean-Poisson | 9 | 25.99% / 55.56% | 69.20% / 100.00% | 0.3238 | 1.3557 | 0.3738 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.84% / 64.29% | 73.67% / 100.00% | 0.3752 | 1.3918 | 0.4070 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 59.91% / 64.29% | 98.57% / 100.00% | 0.2388 | 0.9139 | 0.2776 | 92.86% / 100.00%
31_14 | Mean-Poisson | 14 | 26.23% / 64.29% | 69.49% / 100.00% | 0.3651 | 1.3395 | 0.3522 | 100.00% / 100.00%


### Infection all types / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 29.61% / 22.22% | 77.99% / 100.00% | 0.1762 | 1.3701 | 0.4863 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.71% / 22.22% | 94.35% / 100.00% | 0.2365 | 1.2547 | 0.4861 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.59% / 22.22% | 72.06% / 100.00% | 0.1741 | 1.2727 | 0.4020 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.63% / 28.57% | 78.16% / 100.00% | 0.1983 | 1.4031 | 0.4893 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 46.41% / 28.57% | 94.00% / 100.00% | 0.2332 | 1.2458 | 0.4665 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.84% / 28.57% | 70.38% / 100.00% | 0.2001 | 1.3153 | 0.4104 | 100.00% / 100.00%


### Infection all types / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 31.28% / 66.67% | 79.29% / 100.00% | 0.3393 | 1.2634 | 0.3722 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 48.61% / 66.67% | 94.20% / 100.00% | 0.2566 | 0.9341 | 0.3013 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 29.37% / 66.67% | 75.38% / 100.00% | 0.3532 | 1.3038 | 0.4098 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 32.71% / 71.43% | 81.77% / 100.00% | 0.3442 | 1.2051 | 0.3343 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 49.94% / 71.43% | 94.29% / 100.00% | 0.2407 | 0.8490 | 0.2530 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 30.01% / 71.43% | 75.58% / 100.00% | 0.3691 | 1.2658 | 0.3891 | 100.00% / 100.00%


### Infection all types / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 32.42% / 66.67% | 81.27% / 100.00% | 0.3400 | 1.2082 | 0.3237 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 54.34% / 66.67% | 96.49% / 100.00% | 0.2342 | 0.7632 | 0.2216 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 29.76% / 66.67% | 75.17% / 100.00% | 0.3597 | 1.2393 | 0.3509 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 31.97% / 64.29% | 80.57% / 100.00% | 0.3187 | 1.1615 | 0.3051 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 52.58% / 64.29% | 96.06% / 100.00% | 0.2186 | 0.7306 | 0.2125 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 29.43% / 64.29% | 74.58% / 100.00% | 0.3456 | 1.2232 | 0.3627 | 100.00% / 100.00%


### Infection all types / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.83% / 22.22% | 74.14% / 100.00% | 0.1679 | 1.2060 | 0.3585 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.24% / 22.22% | 95.71% / 100.00% | 0.2284 | 0.9078 | 0.3253 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.52% / 22.22% | 73.39% / 100.00% | 0.1694 | 1.1998 | 0.3503 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.39% / 42.86% | 73.44% / 100.00% | 0.2674 | 1.2538 | 0.3692 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 46.06% / 42.86% | 95.60% / 100.00% | 0.2492 | 0.9259 | 0.3142 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.15% / 42.86% | 73.06% / 100.00% | 0.2684 | 1.2356 | 0.3495 | 100.00% / 100.00%


### Infection all types / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 32.29% / 77.78% | 80.89% / 100.00% | 0.3786 | 1.1924 | 0.3273 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 53.86% / 77.78% | 96.19% / 100.00% | 0.2459 | 0.7893 | 0.2444 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 31.11% / 77.78% | 78.96% / 100.00% | 0.3862 | 1.1848 | 0.3218 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 32.56% / 71.43% | 81.26% / 100.00% | 0.3486 | 1.1795 | 0.3233 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 53.02% / 71.43% | 95.68% / 100.00% | 0.2412 | 0.7891 | 0.2451 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 31.57% / 71.43% | 79.49% / 100.00% | 0.3537 | 1.1696 | 0.3146 | 100.00% / 100.00%


### ARI / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 29.96% / 88.89% | 77.64% / 100.00% | 0.4408 | 1.2027 | 0.2955 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 49.28% / 88.89% | 95.38% / 100.00% | 0.2470 | 0.7381 | 0.1704 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.86% / 88.89% | 73.23% / 100.00% | 0.4690 | 1.2672 | 0.3585 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.44% / 78.57% | 76.83% / 100.00% | 0.4114 | 1.2425 | 0.3182 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 47.71% / 78.57% | 94.73% / 100.00% | 0.2599 | 0.8067 | 0.2002 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.70% / 78.57% | 73.09% / 100.00% | 0.4282 | 1.2782 | 0.3534 | 100.00% / 100.00%


### ARI / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 30.77% / 77.78% | 78.63% / 100.00% | 0.3984 | 1.2326 | 0.3257 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 53.36% / 77.78% | 96.69% / 100.00% | 0.2389 | 0.7650 | 0.2104 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.62% / 77.78% | 74.30% / 100.00% | 0.4176 | 1.2601 | 0.3526 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.37% / 85.71% | 76.47% / 100.00% | 0.4473 | 1.2622 | 0.3252 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.74% / 85.71% | 96.25% / 100.00% | 0.2577 | 0.7690 | 0.1934 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.76% / 85.71% | 73.58% / 100.00% | 0.4628 | 1.2880 | 0.3527 | 100.00% / 100.00%


### ARI / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.33% / 66.67% | 84.10% / 100.00% | 0.3285 | 1.1909 | 0.3106 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 54.76% / 66.67% | 95.63% / 100.00% | 0.2265 | 0.7419 | 0.2022 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 33.01% / 66.67% | 80.95% / 100.00% | 0.3440 | 1.2237 | 0.3405 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 32.02% / 64.29% | 80.29% / 100.00% | 0.3253 | 1.2247 | 0.3355 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 51.68% / 64.29% | 94.81% / 100.00% | 0.2264 | 0.8152 | 0.2415 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 29.82% / 64.29% | 75.97% / 100.00% | 0.3387 | 1.2412 | 0.3482 | 100.00% / 100.00%


### ARI / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 28.46% / 55.56% | 75.29% / 100.00% | 0.3165 | 1.2269 | 0.3186 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 49.44% / 55.56% | 96.34% / 100.00% | 0.2171 | 0.7446 | 0.2008 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.44% / 55.56% | 72.55% / 100.00% | 0.3277 | 1.2811 | 0.3707 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.89% / 57.14% | 74.19% / 100.00% | 0.3275 | 1.2432 | 0.3303 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 49.24% / 57.14% | 96.30% / 100.00% | 0.2271 | 0.7882 | 0.2217 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.29% / 57.14% | 72.51% / 100.00% | 0.3351 | 1.2855 | 0.3716 | 100.00% / 100.00%


### ARI / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.90% / 66.67% | 86.02% / 77.78% | 0.3054 | 1.3176 | 0.4494 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 69.56% / 66.67% | 98.99% / 77.78% | 0.1670 | 1.2914 | 0.3892 | 77.78% / 88.89%
80_20 | Mean-Poisson | 9 | 34.70% / 66.67% | 85.99% / 77.78% | 0.3057 | 1.3381 | 0.4634 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 34.69% / 57.14% | 85.57% / 71.43% | 0.2791 | 1.4558 | 0.5587 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 70.35% / 57.14% | 98.99% / 71.43% | 0.2389 | 1.9592 | 0.5619 | 71.43% / 78.57%
31_14 | Mean-Poisson | 14 | 34.24% / 57.14% | 85.39% / 71.43% | 0.2772 | 1.4445 | 0.5428 | 92.86% / 100.00%


### ARI / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 30.55% / 66.67% | 78.01% / 100.00% | 0.3640 | 1.2612 | 0.3330 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 51.02% / 66.67% | 95.49% / 100.00% | 0.2447 | 0.7942 | 0.2122 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.55% / 66.67% | 74.06% / 100.00% | 0.3761 | 1.2799 | 0.3522 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.00% / 64.29% | 75.89% / 100.00% | 0.3580 | 1.2509 | 0.3263 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 48.08% / 64.29% | 95.18% / 100.00% | 0.2446 | 0.7913 | 0.2080 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.86% / 64.29% | 73.52% / 100.00% | 0.3673 | 1.2768 | 0.3528 | 100.00% / 100.00%


### ARI / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.70% / 66.67% | 72.17% / 88.89% | 0.3798 | 1.3979 | 0.4415 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 50.42% / 66.67% | 97.16% / 88.89% | 0.2383 | 1.0795 | 0.3395 | 88.89% / 88.89%
80_20 | Mean-Poisson | 9 | 27.06% / 66.67% | 72.13% / 88.89% | 0.3790 | 1.4336 | 0.4764 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 26.82% / 71.43% | 72.06% / 92.86% | 0.4015 | 1.3677 | 0.4106 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.80% / 71.43% | 96.81% / 92.86% | 0.2418 | 0.9957 | 0.3011 | 92.86% / 92.86%
31_14 | Mean-Poisson | 14 | 27.05% / 71.43% | 71.97% / 92.86% | 0.4011 | 1.3920 | 0.4343 | 100.00% / 100.00%


### Fever unknown origin / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 30.20% / 66.67% | 78.38% / 100.00% | 0.3236 | 1.2849 | 0.3994 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.86% / 66.67% | 93.65% / 100.00% | 0.2219 | 1.0087 | 0.3392 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.38% / 66.67% | 71.76% / 100.00% | 0.3430 | 1.3038 | 0.4095 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.74% / 64.29% | 77.38% / 100.00% | 0.3229 | 1.2838 | 0.4013 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 45.95% / 64.29% | 93.01% / 100.00% | 0.2291 | 1.0263 | 0.3486 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.29% / 64.29% | 72.19% / 100.00% | 0.3422 | 1.2775 | 0.3884 | 100.00% / 100.00%


### Fever unknown origin / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.44% / 44.44% | 72.14% / 100.00% | 0.2802 | 1.2646 | 0.3755 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.78% / 44.44% | 96.42% / 100.00% | 0.2548 | 0.9414 | 0.3240 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.68% / 44.44% | 72.57% / 100.00% | 0.2787 | 1.2553 | 0.3655 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.17% / 57.14% | 73.63% / 100.00% | 0.3442 | 1.3224 | 0.3936 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 47.18% / 57.14% | 96.17% / 100.00% | 0.2751 | 0.9753 | 0.3182 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.94% / 57.14% | 72.66% / 100.00% | 0.3389 | 1.2781 | 0.3525 | 100.00% / 100.00%


### Fever unknown origin / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.97% / 22.22% | 74.29% / 100.00% | 0.1704 | 1.2212 | 0.3736 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 37.49% / 22.22% | 87.49% / 100.00% | 0.1953 | 1.0352 | 0.3478 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.61% / 22.22% | 73.31% / 100.00% | 0.1699 | 1.2139 | 0.3639 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.61% / 28.57% | 73.49% / 100.00% | 0.2012 | 1.2451 | 0.3846 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 36.92% / 28.57% | 86.71% / 100.00% | 0.2132 | 1.0708 | 0.3599 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.34% / 28.57% | 73.05% / 100.00% | 0.2010 | 1.2301 | 0.3683 | 100.00% / 100.00%


### Fever unknown origin / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.93% / 66.67% | 72.12% / 100.00% | 0.3793 | 1.3655 | 0.4081 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.81% / 66.67% | 94.80% / 100.00% | 0.2643 | 1.0188 | 0.3217 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.78% / 66.67% | 72.60% / 100.00% | 0.3817 | 1.3536 | 0.3980 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.57% / 64.29% | 73.06% / 100.00% | 0.3731 | 1.3603 | 0.4037 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 46.41% / 64.29% | 94.00% / 100.00% | 0.2767 | 1.0206 | 0.3197 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.01% / 64.29% | 72.68% / 100.00% | 0.3720 | 1.3338 | 0.3789 | 100.00% / 100.00%


### Fever unknown origin / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.76% / 88.89% | 85.78% / 100.00% | 0.3731 | 1.0374 | 0.2383 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 58.55% / 88.89% | 97.14% / 100.00% | 0.1607 | 0.5409 | 0.1244 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 32.60% / 88.89% | 79.90% / 100.00% | 0.4004 | 1.0955 | 0.2875 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 33.83% / 85.71% | 84.51% / 100.00% | 0.3716 | 1.0667 | 0.2547 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 56.79% / 85.71% | 97.00% / 100.00% | 0.1770 | 0.5910 | 0.1461 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 31.62% / 85.71% | 78.50% / 100.00% | 0.3992 | 1.1233 | 0.3022 | 100.00% / 100.00%


### Fever unknown origin / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.71% / 44.44% | 73.75% / 100.00% | 0.2842 | 1.2976 | 0.3884 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 48.31% / 44.44% | 95.90% / 100.00% | 0.2628 | 0.9761 | 0.3308 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.00% / 44.44% | 72.85% / 100.00% | 0.2822 | 1.2620 | 0.3533 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.65% / 42.86% | 75.40% / 100.00% | 0.2699 | 1.3058 | 0.4102 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 48.62% / 42.86% | 95.45% / 100.00% | 0.2562 | 1.0340 | 0.3685 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.43% / 42.86% | 73.08% / 100.00% | 0.2716 | 1.2564 | 0.3576 | 100.00% / 100.00%


### Fever unknown origin / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.50% / 33.33% | 73.41% / 100.00% | 0.2160 | 1.2307 | 0.3811 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 48.02% / 33.33% | 96.06% / 100.00% | 0.2434 | 0.9870 | 0.3657 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.26% / 33.33% | 72.62% / 100.00% | 0.2216 | 1.2535 | 0.4029 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.34% / 57.14% | 72.95% / 100.00% | 0.3289 | 1.2581 | 0.3563 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 47.80% / 57.14% | 95.61% / 100.00% | 0.2554 | 0.9012 | 0.2855 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.17% / 57.14% | 72.58% / 100.00% | 0.3327 | 1.2733 | 0.3716 | 100.00% / 100.00%


### Hypertension / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.50% / 77.78% | 87.05% / 100.00% | 0.3504 | 1.1493 | 0.3108 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 59.43% / 77.78% | 98.03% / 100.00% | 0.1918 | 0.7385 | 0.2110 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 31.05% / 77.78% | 77.27% / 100.00% | 0.3832 | 1.1750 | 0.3267 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 35.31% / 85.71% | 88.81% / 100.00% | 0.3680 | 1.0960 | 0.2755 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 60.02% / 85.71% | 98.27% / 100.00% | 0.1774 | 0.6508 | 0.1628 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 31.20% / 85.71% | 77.02% / 100.00% | 0.4141 | 1.1684 | 0.3336 | 100.00% / 100.00%


### Hypertension / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 33.15% / 77.78% | 81.97% / 100.00% | 0.3661 | 1.1585 | 0.3123 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 52.96% / 77.78% | 95.28% / 100.00% | 0.2400 | 0.7749 | 0.2346 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 31.45% / 77.78% | 78.27% / 100.00% | 0.3806 | 1.1696 | 0.3228 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 32.69% / 64.29% | 81.22% / 100.00% | 0.3152 | 1.1835 | 0.3393 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 52.13% / 64.29% | 95.06% / 100.00% | 0.2382 | 0.8555 | 0.2825 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 30.83% / 64.29% | 77.36% / 100.00% | 0.3277 | 1.1737 | 0.3277 | 100.00% / 100.00%


### Hypertension / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.77% / 100.00% | 72.37% / 100.00% | 0.5363 | 1.3181 | 0.3269 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 43.84% / 100.00% | 93.84% / 100.00% | 0.3159 | 0.8261 | 0.1780 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.77% / 100.00% | 72.60% / 100.00% | 0.5362 | 1.3177 | 0.3275 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.74% / 64.29% | 73.93% / 100.00% | 0.3765 | 1.2972 | 0.3467 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 43.35% / 64.29% | 93.02% / 100.00% | 0.2684 | 0.8897 | 0.2356 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.21% / 64.29% | 72.65% / 100.00% | 0.3727 | 1.2969 | 0.3452 | 100.00% / 100.00%


### Hypertension / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.60% / 55.56% | 73.56% / 100.00% | 0.3332 | 1.2883 | 0.3583 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 50.10% / 55.56% | 96.79% / 100.00% | 0.2442 | 0.8467 | 0.2557 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.17% / 55.56% | 72.71% / 100.00% | 0.3317 | 1.2854 | 0.3551 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.32% / 71.43% | 73.12% / 100.00% | 0.4055 | 1.2983 | 0.3462 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 49.01% / 71.43% | 96.37% / 100.00% | 0.2572 | 0.8139 | 0.2207 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.05% / 71.43% | 72.67% / 100.00% | 0.4044 | 1.2962 | 0.3443 | 100.00% / 100.00%


### Hypertension / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.51% / 88.89% | 73.93% / 100.00% | 0.4937 | 1.3425 | 0.3555 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.98% / 88.89% | 96.10% / 100.00% | 0.2975 | 0.8264 | 0.2096 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.43% / 88.89% | 72.54% / 100.00% | 0.5031 | 1.3604 | 0.3782 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.13% / 71.43% | 75.79% / 100.00% | 0.4159 | 1.3957 | 0.4061 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 46.29% / 71.43% | 95.69% / 100.00% | 0.2835 | 0.9846 | 0.2854 | 92.86% / 100.00%
31_14 | Mean-Poisson | 14 | 27.18% / 71.43% | 73.51% / 100.00% | 0.4242 | 1.3481 | 0.3790 | 100.00% / 100.00%


### Hypertension / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 28.52% / 77.78% | 74.76% / 100.00% | 0.4270 | 1.2947 | 0.3454 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 52.23% / 77.78% | 97.01% / 100.00% | 0.2485 | 0.7675 | 0.2115 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.43% / 77.78% | 72.48% / 100.00% | 0.4298 | 1.2968 | 0.3456 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.33% / 71.43% | 74.54% / 100.00% | 0.4049 | 1.3213 | 0.3726 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.67% / 71.43% | 96.54% / 100.00% | 0.2637 | 0.8627 | 0.2608 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.41% / 71.43% | 72.43% / 100.00% | 0.4018 | 1.2976 | 0.3447 | 100.00% / 100.00%


### Hypertension / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 33.30% / 66.67% | 81.45% / 100.00% | 0.3216 | 1.1525 | 0.3077 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 51.51% / 66.67% | 94.55% / 100.00% | 0.2324 | 0.7411 | 0.2293 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 33.23% / 66.67% | 81.44% / 100.00% | 0.3219 | 1.1512 | 0.3066 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 31.80% / 57.14% | 79.51% / 100.00% | 0.2955 | 1.1784 | 0.3220 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 49.22% / 57.14% | 94.45% / 100.00% | 0.2364 | 0.7853 | 0.2476 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 31.56% / 57.14% | 79.21% / 100.00% | 0.2956 | 1.1725 | 0.3164 | 100.00% / 100.00%


### Influenza / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 32.78% / 77.78% | 82.58% / 100.00% | 0.3691 | 1.1554 | 0.2930 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 50.76% / 77.78% | 95.14% / 100.00% | 0.2348 | 0.7573 | 0.1938 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.82% / 77.78% | 73.07% / 100.00% | 0.4124 | 1.2519 | 0.3822 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 30.33% / 71.43% | 78.09% / 100.00% | 0.3608 | 1.2170 | 0.3221 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 47.37% / 71.43% | 93.61% / 100.00% | 0.2444 | 0.8373 | 0.2280 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.43% / 71.43% | 71.39% / 100.00% | 0.3866 | 1.2687 | 0.3681 | 100.00% / 100.00%


### Influenza / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 31.64% / 100.00% | 80.33% / 100.00% | 0.4694 | 1.1617 | 0.2780 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 52.64% / 100.00% | 96.34% / 100.00% | 0.2281 | 0.6488 | 0.1437 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 29.42% / 100.00% | 75.63% / 100.00% | 0.4994 | 1.2307 | 0.3448 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 30.45% / 92.86% | 78.77% / 100.00% | 0.4529 | 1.1946 | 0.3012 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.40% / 92.86% | 95.93% / 100.00% | 0.2463 | 0.7199 | 0.1795 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 28.63% / 92.86% | 74.76% / 100.00% | 0.4763 | 1.2434 | 0.3472 | 100.00% / 100.00%


### Influenza / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 29.71% / 88.89% | 76.39% / 100.00% | 0.4340 | 1.2139 | 0.3080 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 48.25% / 88.89% | 94.38% / 100.00% | 0.2451 | 0.7410 | 0.1892 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.71% / 88.89% | 69.93% / 100.00% | 0.4630 | 1.2772 | 0.3672 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.36% / 78.57% | 74.20% / 100.00% | 0.4027 | 1.2567 | 0.3347 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 46.80% / 78.57% | 94.04% / 100.00% | 0.2482 | 0.8186 | 0.2272 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.08% / 78.57% | 69.37% / 100.00% | 0.4192 | 1.2850 | 0.3585 | 100.00% / 100.00%


### Influenza / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 5 | 31.45% / 80.00% | 79.19% / 100.00% | 0.3610 | 1.2102 | 0.3040 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 5 | 49.58% / 80.00% | 92.99% / 100.00% | 0.2018 | 0.7604 | 0.1771 | 100.00% / 100.00%
80_20 | Mean-Poisson | 5 | 26.37% / 80.00% | 68.29% / 100.00% | 0.4107 | 1.5112 | 0.6176 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 9 | 29.50% / 88.89% | 76.15% / 100.00% | 0.4371 | 1.2534 | 0.3078 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 9 | 46.61% / 88.89% | 92.69% / 100.00% | 0.2571 | 0.7987 | 0.1733 | 100.00% / 100.00%
31_14 | Mean-Poisson | 9 | 26.60% / 88.89% | 70.20% / 100.00% | 0.4657 | 1.4232 | 0.4860 | 100.00% / 100.00%


### Influenza / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 31.59% / 77.78% | 79.84% / 100.00% | 0.3794 | 1.2274 | 0.3245 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 47.80% / 77.78% | 93.22% / 100.00% | 0.2559 | 0.8636 | 0.2297 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.10% / 77.78% | 70.09% / 100.00% | 0.4134 | 1.2772 | 0.3672 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 12 | 29.96% / 66.67% | 76.95% / 100.00% | 0.3386 | 1.2592 | 0.3552 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 12 | 45.32% / 66.67% | 91.81% / 100.00% | 0.2422 | 0.9289 | 0.2763 | 100.00% / 100.00%
31_14 | Mean-Poisson | 12 | 26.22% / 66.67% | 68.97% / 100.00% | 0.3630 | 1.2806 | 0.3652 | 100.00% / 100.00%


### Influenza / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 32.86% / 66.67% | 82.95% / 88.89% | 0.3108 | 1.3668 | 0.4633 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 63.80% / 66.67% | 98.00% / 88.89% | 0.1798 | 1.1539 | 0.3735 | 88.89% / 88.89%
80_20 | Mean-Poisson | 9 | 29.95% / 66.67% | 76.55% / 88.89% | 0.3197 | 1.6419 | 0.6976 | 77.78% / 100.00%
31_14 | SARIMA-Poisson | 14 | 32.05% / 71.43% | 81.70% / 92.86% | 0.3392 | 1.2955 | 0.4022 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 61.41% / 71.43% | 98.11% / 92.86% | 0.1830 | 0.9656 | 0.2977 | 92.86% / 92.86%
31_14 | Mean-Poisson | 14 | 29.30% / 71.43% | 76.12% / 92.86% | 0.3536 | 1.4880 | 0.5690 | 85.71% / 100.00%


### Influenza / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 32.01% / 66.67% | 81.45% / 100.00% | 0.3505 | 1.2488 | 0.3445 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 54.78% / 66.67% | 97.06% / 100.00% | 0.2438 | 0.8210 | 0.2394 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 29.38% / 66.67% | 75.36% / 100.00% | 0.3678 | 1.2571 | 0.3509 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 30.89% / 71.43% | 79.83% / 100.00% | 0.3737 | 1.2469 | 0.3388 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 52.83% / 71.43% | 96.64% / 100.00% | 0.2460 | 0.8186 | 0.2312 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 28.63% / 71.43% | 74.58% / 100.00% | 0.3916 | 1.2605 | 0.3511 | 100.00% / 100.00%


### Acute Gastroenteritis / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.23% / 77.78% | 87.18% / 100.00% | 0.3503 | 1.1785 | 0.3272 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 59.88% / 77.78% | 98.30% / 100.00% | 0.1864 | 0.8021 | 0.2245 | 88.89% / 100.00%
80_20 | Mean-Poisson | 9 | 32.27% / 77.78% | 80.53% / 100.00% | 0.3695 | 1.1441 | 0.3006 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 34.29% / 78.57% | 87.27% / 100.00% | 0.3447 | 1.1245 | 0.2939 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 58.88% / 78.57% | 98.09% / 100.00% | 0.1741 | 0.7125 | 0.1859 | 92.86% / 100.00%
31_14 | Mean-Poisson | 14 | 32.25% / 78.57% | 80.32% / 100.00% | 0.3663 | 1.1213 | 0.2908 | 100.00% / 100.00%


### Acute Gastroenteritis / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.92% / 77.78% | 85.81% / 100.00% | 0.3420 | 1.1011 | 0.2804 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 60.11% / 77.78% | 97.57% / 100.00% | 0.1896 | 0.6548 | 0.1844 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 33.84% / 77.78% | 83.15% / 100.00% | 0.3474 | 1.0923 | 0.2697 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 35.31% / 85.71% | 86.42% / 100.00% | 0.3661 | 1.0725 | 0.2598 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 59.68% / 85.71% | 97.35% / 100.00% | 0.1823 | 0.6101 | 0.1554 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 34.10% / 85.71% | 83.26% / 100.00% | 0.3762 | 1.0815 | 0.2652 | 100.00% / 100.00%


### Acute Gastroenteritis / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 34.82% / 77.78% | 85.48% / 88.89% | 0.3604 | 1.3536 | 0.4698 | 88.89% / 100.00%
80_20 | SARIMA-CMP | 9 | 58.61% / 77.78% | 96.21% / 88.89% | 0.2132 | 1.2574 | 0.4000 | 88.89% / 88.89%
80_20 | Mean-Poisson | 9 | 32.23% / 77.78% | 79.05% / 88.89% | 0.3861 | 1.3827 | 0.4964 | 88.89% / 100.00%
31_14 | SARIMA-Poisson | 14 | 33.03% / 57.14% | 82.44% / 92.86% | 0.2863 | 1.3087 | 0.4397 | 92.86% / 100.00%
31_14 | SARIMA-CMP | 14 | 55.18% / 57.14% | 95.92% / 92.86% | 0.2196 | 1.1609 | 0.3895 | 92.86% / 92.86%
31_14 | Mean-Poisson | 14 | 30.90% / 57.14% | 77.45% / 92.86% | 0.3029 | 1.3107 | 0.4392 | 92.86% / 100.00%


### Acute Gastroenteritis / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 30.49% / 77.78% | 77.95% / 100.00% | 0.4005 | 1.2343 | 0.3274 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 51.48% / 77.78% | 96.05% / 100.00% | 0.2480 | 0.7823 | 0.2181 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.38% / 77.78% | 73.59% / 100.00% | 0.4190 | 1.2644 | 0.3555 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.79% / 78.57% | 76.84% / 100.00% | 0.4075 | 1.2400 | 0.3292 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.24% / 78.57% | 95.77% / 100.00% | 0.2532 | 0.7993 | 0.2220 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 28.03% / 78.57% | 73.32% / 100.00% | 0.4244 | 1.2677 | 0.3556 | 100.00% / 100.00%


### Acute Gastroenteritis / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 30.66% / 44.44% | 78.58% / 100.00% | 0.2461 | 1.2506 | 0.4021 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 49.29% / 44.44% | 94.76% / 100.00% | 0.2329 | 1.0406 | 0.3810 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.62% / 44.44% | 74.51% / 100.00% | 0.2570 | 1.1869 | 0.3382 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 30.95% / 42.86% | 78.95% / 100.00% | 0.2487 | 1.2582 | 0.3872 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 48.44% / 42.86% | 94.24% / 100.00% | 0.2381 | 0.9981 | 0.3441 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 28.89% / 42.86% | 74.61% / 100.00% | 0.2568 | 1.2157 | 0.3431 | 100.00% / 100.00%


### Acute Gastroenteritis / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.53% / 55.56% | 73.52% / 100.00% | 0.3357 | 1.3048 | 0.3765 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 50.57% / 55.56% | 97.20% / 100.00% | 0.2569 | 0.8945 | 0.2887 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.18% / 55.56% | 72.62% / 100.00% | 0.3310 | 1.2876 | 0.3568 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.33% / 64.29% | 73.15% / 100.00% | 0.3735 | 1.3050 | 0.3667 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.32% / 64.29% | 97.03% / 100.00% | 0.2576 | 0.8714 | 0.2657 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.10% / 64.29% | 72.60% / 100.00% | 0.3704 | 1.2917 | 0.3518 | 100.00% / 100.00%


### Acute Gastroenteritis / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.91% / 88.89% | 74.20% / 100.00% | 0.4894 | 1.3355 | 0.3446 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 50.79% / 88.89% | 96.95% / 100.00% | 0.2631 | 0.7665 | 0.1793 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.12% / 88.89% | 72.78% / 100.00% | 0.4878 | 1.3207 | 0.3314 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.03% / 78.57% | 74.41% / 100.00% | 0.4307 | 1.2846 | 0.3326 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 49.44% / 78.57% | 96.41% / 100.00% | 0.2512 | 0.7700 | 0.1930 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.21% / 78.57% | 72.76% / 100.00% | 0.4355 | 1.2964 | 0.3452 | 100.00% / 100.00%


### Vertigo / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 28.91% / 66.67% | 75.70% / 100.00% | 0.4012 | 1.3601 | 0.3763 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 47.23% / 66.67% | 95.46% / 100.00% | 0.2898 | 0.8688 | 0.2448 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 28.03% / 66.67% | 74.02% / 100.00% | 0.3994 | 1.3477 | 0.3638 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.44% / 50.00% | 75.02% / 100.00% | 0.3087 | 1.2855 | 0.3642 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 45.87% / 50.00% | 94.91% / 100.00% | 0.2563 | 0.8786 | 0.2728 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.79% / 50.00% | 73.80% / 100.00% | 0.3090 | 1.2751 | 0.3533 | 100.00% / 100.00%


### Vertigo / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 28.07% / 22.22% | 74.44% / 88.89% | 0.1838 | 1.3613 | 0.4763 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 44.59% / 22.22% | 93.44% / 88.89% | 0.2317 | 1.2223 | 0.4652 | 88.89% / 100.00%
80_20 | Mean-Poisson | 9 | 26.34% / 22.22% | 69.85% / 88.89% | 0.1723 | 1.2943 | 0.4032 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.81% / 35.71% | 75.66% / 92.86% | 0.2261 | 1.2870 | 0.4169 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 45.70% / 35.71% | 93.78% / 92.86% | 0.2296 | 1.0760 | 0.3861 | 92.86% / 100.00%
31_14 | Mean-Poisson | 14 | 26.50% / 35.71% | 69.72% / 92.86% | 0.2365 | 1.3102 | 0.4358 | 100.00% / 100.00%


### Vertigo / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.04% / 100.00% | 72.04% / 100.00% | 0.5322 | 1.3077 | 0.3118 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 53.73% / 100.00% | 97.15% / 100.00% | 0.2145 | 0.6220 | 0.1090 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.07% / 100.00% | 72.18% / 100.00% | 0.5319 | 1.3069 | 0.3112 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.70% / 92.86% | 73.51% / 100.00% | 0.4906 | 1.2887 | 0.3219 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 53.52% / 92.86% | 97.09% / 100.00% | 0.2204 | 0.6870 | 0.1514 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.03% / 92.86% | 71.73% / 100.00% | 0.4996 | 1.3102 | 0.3414 | 100.00% / 100.00%


### Vertigo / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 32.87% / 55.56% | 81.71% / 100.00% | 0.2778 | 1.1591 | 0.3150 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 52.74% / 55.56% | 95.71% / 100.00% | 0.2210 | 0.7603 | 0.2388 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 31.90% / 55.56% | 79.47% / 100.00% | 0.2816 | 1.1512 | 0.3060 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 31.72% / 50.00% | 79.99% / 100.00% | 0.2537 | 1.1499 | 0.3193 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.92% / 50.00% | 95.40% / 100.00% | 0.2115 | 0.7892 | 0.2579 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 30.73% / 50.00% | 77.97% / 100.00% | 0.2579 | 1.1329 | 0.3009 | 100.00% / 100.00%


### Vertigo / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.54% / 33.33% | 72.37% / 100.00% | 0.2269 | 1.2377 | 0.3678 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 44.22% / 33.33% | 94.95% / 100.00% | 0.2377 | 0.9502 | 0.3268 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.61% / 33.33% | 72.53% / 100.00% | 0.2264 | 1.2331 | 0.3630 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.15% / 42.86% | 73.16% / 100.00% | 0.2742 | 1.2646 | 0.3654 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 44.11% / 42.86% | 94.32% / 100.00% | 0.2525 | 0.9426 | 0.3031 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.88% / 42.86% | 72.62% / 100.00% | 0.2723 | 1.2563 | 0.3564 | 100.00% / 100.00%


### Vertigo / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.62% / 88.89% | 72.47% / 100.00% | 0.4867 | 1.3111 | 0.3420 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.73% / 88.89% | 96.30% / 100.00% | 0.2827 | 0.8021 | 0.2024 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.50% / 88.89% | 72.48% / 100.00% | 0.4882 | 1.3131 | 0.3454 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 26.60% / 78.57% | 72.44% / 100.00% | 0.4398 | 1.3087 | 0.3587 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 45.56% / 78.57% | 95.61% / 100.00% | 0.2826 | 0.8682 | 0.2465 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.46% / 78.57% | 72.45% / 100.00% | 0.4401 | 1.2975 | 0.3482 | 100.00% / 100.00%


### Vertigo / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.43% / 77.78% | 72.42% / 100.00% | 0.4365 | 1.2957 | 0.3479 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 45.19% / 77.78% | 95.99% / 100.00% | 0.2778 | 0.8291 | 0.2282 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.37% / 77.78% | 72.39% / 100.00% | 0.4373 | 1.2970 | 0.3497 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 26.32% / 78.57% | 72.31% / 100.00% | 0.4421 | 1.3027 | 0.3541 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 43.85% / 78.57% | 95.24% / 100.00% | 0.2913 | 0.8592 | 0.2407 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.34% / 78.57% | 72.37% / 100.00% | 0.4413 | 1.2987 | 0.3502 | 100.00% / 100.00%


### All types of skin disease / Salvacion


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 28.85% / 11.11% | 76.29% / 100.00% | 0.1400 | 1.2686 | 0.3827 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.23% / 11.11% | 95.48% / 100.00% | 0.2397 | 0.9499 | 0.3309 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 27.99% / 11.11% | 74.21% / 100.00% | 0.1335 | 1.2267 | 0.3405 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.95% / 21.43% | 76.13% / 100.00% | 0.1777 | 1.2506 | 0.3673 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 45.52% / 21.43% | 94.70% / 100.00% | 0.2365 | 0.9186 | 0.3087 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 28.11% / 21.43% | 74.29% / 100.00% | 0.1751 | 1.2236 | 0.3402 | 100.00% / 100.00%


### All types of skin disease / Alegria


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.27% / 55.56% | 70.94% / 100.00% | 0.3256 | 1.2921 | 0.3615 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 50.78% / 55.56% | 96.88% / 100.00% | 0.2351 | 0.8578 | 0.2672 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.11% / 55.56% | 70.01% / 100.00% | 0.3241 | 1.3158 | 0.3824 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 27.11% / 57.14% | 72.49% / 100.00% | 0.3401 | 1.3343 | 0.3941 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 51.05% / 57.14% | 96.42% / 100.00% | 0.2608 | 0.9599 | 0.3129 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.30% / 57.14% | 70.02% / 100.00% | 0.3325 | 1.3178 | 0.3754 | 100.00% / 100.00%


### All types of skin disease / Blumentritt


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.51% / 66.67% | 70.74% / 77.78% | 0.3766 | 1.6680 | 0.6721 | 88.89% / 100.00%
80_20 | SARIMA-CMP | 9 | 50.08% / 66.67% | 95.35% / 77.78% | 0.2336 | 1.7492 | 0.6129 | 77.78% / 88.89%
80_20 | Mean-Poisson | 9 | 26.15% / 66.67% | 70.11% / 77.78% | 0.3750 | 1.6339 | 0.6308 | 88.89% / 100.00%
31_14 | SARIMA-Poisson | 14 | 26.63% / 71.43% | 70.99% / 85.71% | 0.4004 | 1.5426 | 0.5604 | 92.86% / 100.00%
31_14 | SARIMA-CMP | 14 | 49.14% / 71.43% | 94.93% / 85.71% | 0.2477 | 1.4401 | 0.4827 | 85.71% / 92.86%
31_14 | Mean-Poisson | 14 | 26.46% / 71.43% | 70.70% / 85.71% | 0.3985 | 1.5208 | 0.5337 | 92.86% / 100.00%


### All types of skin disease / Caliban


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 28.74% / 44.44% | 74.44% / 100.00% | 0.2715 | 1.3428 | 0.4263 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.29% / 44.44% | 92.89% / 100.00% | 0.2295 | 1.0471 | 0.3720 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.59% / 44.44% | 70.17% / 100.00% | 0.2720 | 1.2853 | 0.3546 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 34.13% / 50.00% | 79.45% / 100.00% | 0.3154 | 1.3087 | 0.4058 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 50.44% / 50.00% | 93.94% / 100.00% | 0.2562 | 1.0043 | 0.3457 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.38% / 50.00% | 68.51% / 100.00% | 0.2928 | 1.2788 | 0.3784 | 100.00% / 100.00%


### All types of skin disease / Cansilayan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.54% / 55.56% | 70.73% / 88.89% | 0.3105 | 1.4535 | 0.5151 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 46.55% / 55.56% | 93.69% / 88.89% | 0.2199 | 1.2742 | 0.4733 | 88.89% / 88.89%
80_20 | Mean-Poisson | 9 | 24.88% / 55.56% | 67.70% / 88.89% | 0.3175 | 1.4358 | 0.4785 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.42% / 50.00% | 74.91% / 92.86% | 0.2790 | 1.3609 | 0.4586 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 49.02% / 50.00% | 94.93% / 92.86% | 0.2257 | 1.1352 | 0.4158 | 92.86% / 92.86%
31_14 | Mean-Poisson | 14 | 25.80% / 50.00% | 68.62% / 92.86% | 0.2937 | 1.3836 | 0.4660 | 100.00% / 100.00%


### All types of skin disease / Sta. Rosa


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 26.79% / 100.00% | 72.33% / 100.00% | 0.5359 | 1.3172 | 0.3253 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 47.76% / 100.00% | 95.99% / 100.00% | 0.2738 | 0.7411 | 0.1547 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.77% / 100.00% | 72.60% / 100.00% | 0.5362 | 1.3177 | 0.3275 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 29.08% / 85.71% | 75.53% / 100.00% | 0.4490 | 1.2871 | 0.3509 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 48.79% / 85.71% | 94.94% / 100.00% | 0.2569 | 0.8406 | 0.2321 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 27.61% / 85.71% | 72.67% / 100.00% | 0.4629 | 1.2919 | 0.3532 | 100.00% / 100.00%


### All types of skin disease / Minoyan


Protocol | Method | N | Exact assigned/observed | Nearby assigned/observed | Brier | NLL | RPS | 80%/95% coverage
--- | --- | --- | --- | --- | --- | --- | --- | ---
80_20 | SARIMA-Poisson | 9 | 27.92% / 66.67% | 73.49% / 100.00% | 0.3712 | 1.2968 | 0.3491 | 100.00% / 100.00%
80_20 | SARIMA-CMP | 9 | 41.00% / 66.67% | 90.08% / 100.00% | 0.2802 | 0.9533 | 0.2573 | 100.00% / 100.00%
80_20 | Mean-Poisson | 9 | 26.28% / 66.67% | 70.18% / 100.00% | 0.3733 | 1.2953 | 0.3446 | 100.00% / 100.00%
31_14 | SARIMA-Poisson | 14 | 28.16% / 64.29% | 73.63% / 92.86% | 0.3465 | 1.2793 | 0.3703 | 100.00% / 100.00%
31_14 | SARIMA-CMP | 14 | 40.17% / 64.29% | 88.79% / 92.86% | 0.2672 | 1.0032 | 0.3046 | 100.00% / 100.00%
31_14 | Mean-Poisson | 14 | 26.12% / 64.29% | 69.45% / 92.86% | 0.3573 | 1.2813 | 0.3677 | 100.00% / 100.00%


## Missing results


Protocol | Disease | Barangay | Training months | Method | Reason
--- | --- | --- | --- | --- | ---
31_14 | Influenza | Caliban | 35 | SARIMA-Poisson | SARIMA unavailable
31_14 | Influenza | Caliban | 35 | SARIMA-CMP | SARIMA unavailable
80_20 | Influenza | Caliban | 36 | SARIMA-Poisson | SARIMA unavailable
80_20 | Influenza | Caliban | 36 | SARIMA-CMP | SARIMA unavailable
31_14 | Influenza | Caliban | 36 | SARIMA-Poisson | SARIMA unavailable
31_14 | Influenza | Caliban | 36 | SARIMA-CMP | SARIMA unavailable
80_20 | Influenza | Caliban | 40 | SARIMA-Poisson | SARIMA unavailable
80_20 | Influenza | Caliban | 40 | SARIMA-CMP | SARIMA unavailable
31_14 | Influenza | Caliban | 40 | SARIMA-Poisson | SARIMA unavailable
31_14 | Influenza | Caliban | 40 | SARIMA-CMP | SARIMA unavailable
80_20 | Influenza | Caliban | 42 | SARIMA-Poisson | SARIMA unavailable
80_20 | Influenza | Caliban | 42 | SARIMA-CMP | SARIMA unavailable
31_14 | Influenza | Caliban | 42 | SARIMA-Poisson | SARIMA unavailable
31_14 | Influenza | Caliban | 42 | SARIMA-CMP | SARIMA unavailable
80_20 | Influenza | Caliban | 43 | SARIMA-Poisson | SARIMA unavailable
80_20 | Influenza | Caliban | 43 | SARIMA-CMP | SARIMA unavailable
31_14 | Influenza | Caliban | 43 | SARIMA-Poisson | SARIMA unavailable
31_14 | Influenza | Caliban | 43 | SARIMA-CMP | SARIMA unavailable
31_14 | Influenza | Cansilayan | 31 | SARIMA-Poisson | SARIMA unavailable
31_14 | Influenza | Cansilayan | 31 | SARIMA-CMP | SARIMA unavailable
31_14 | Influenza | Cansilayan | 32 | SARIMA-Poisson | SARIMA unavailable
31_14 | Influenza | Cansilayan | 32 | SARIMA-CMP | SARIMA unavailable


## Interpretation and limits

Exact-count probability concerns one integer; nearby probability concerns a range; neither is the historical SARIMA within-tolerance score. NLL=−ln p(y); RPS=Σk≥0(F(k)−1[y≤k])²; Brier=(p(event)−1[event])². All are lower-is-better. Mean assigned probabilities and empirical event frequencies describe calibration; decile-bin estimates from small dependent samples are uncertain. Interval coverages must be interpreted with discrete assigned mass and width, not nominal coverage alone.

No zero monthly outcomes exist, so at-least-one probabilities cannot establish zero-versus-positive discrimination. Training counts are artificially smooth and underdispersed. The dataset was designed after prior research; this tests probability behavior on that scenario, not real disease incidence. The historical test months have already been inspected; the secondary protocol overlaps the primary and is not independent confirmation. No meaningful gain or future reliability can be established solely from improved pooled scores.

An experimental preview could be justified only with clear model-assumption and validation labels and per-selection limitations after reviewing these results; no integration was performed. Trustworthy deployment requires a frozen probability method evaluated prospectively on new, complete monthly observations, calibration across sufficiently many targets, zero-inclusive histories, and checks for changes in reporting and dispersion. Retain existing SARIMA case estimates pending separate approval.

## References

Huang (2017), mean-parametrized CMP: https://arxiv.org/abs/1606.03214 . Author-maintained implementation: https://thomas-fung.github.io/mpcmp/ . These support the distribution and mean parameterization, not Health-Intel accuracy claims.

## Final assessment after independent checks

**Decision: consider a separately approved experimental preview; do not claim validated future probabilities or integrate automatically.** COM-Poisson has better pooled Brier, NLL and RPS than both requested Poisson comparisons in both protocols. It changes the probability distribution around the same SARIMA mean, not the predicted case counts or their historical within-tolerance score.

Primary exact-count mean assigned probability rises from 28.73% to 49.20%, against 61.98% observed exact matches. The absolute pooled calibration gap shrinks from 33.25 to 12.78 percentage points; a substantial gap remains. Nearby probability is 94.32% versus 95.53% observed. These pooled frequencies are not calibrated assurances for each selection.

The secondary exact-count mean is 48.45% against 61.97% observed (13.52-point gap); nearby is 93.97% against 95.99%. The repeated targets in the two protocols are shared evidence, not two independent replications.

All 1,050 training-dispersion fits passed the frozen numerical checks. All 70 October probabilities are available. Primary historical availability remains 626/630 and secondary 973/980 because the unchanged SARIMA source has four/seven unavailable predictions. The mean-Poisson baseline is available for all 630/980 requests; matched scoring excludes missing SARIMA targets for every method.

Independent recurrence verified every historical CMP probability/score and all October outputs. Analytical profile gradients and Hessians agree with the original finite-difference optimization checks at all 1,050 training fits. See independent-verification.json for numerical error bounds.

### Expected calibration error (fixed decile bins)


Protocol | Method | Event | ECE (percentage points)
--- | --- | --- | ---
80_20 | SARIMA-Poisson | exact | 33.250
80_20 | SARIMA-Poisson | near | 20.733
80_20 | SARIMA-CMP | exact | 13.055
80_20 | SARIMA-CMP | near | 1.506
80_20 | Mean-Poisson | exact | 34.534
80_20 | Mean-Poisson | near | 23.659
31_14 | SARIMA-Poisson | exact | 33.524
31_14 | SARIMA-Poisson | near | 21.418
31_14 | SARIMA-CMP | exact | 14.357
31_14 | SARIMA-CMP | near | 2.442
31_14 | Mean-Poisson | exact | 34.747
31_14 | Mean-Poisson | near | 24.675


ECE depends on binning and sample size. Small per-selection samples (at most 9 primary and 14 secondary) do not establish individual calibration.

### Bins with empirical overconfidence


Protocol | Event | Bin | N | Assigned % | Observed %
--- | --- | --- | --- | --- | ---
80_20 | exact | 20–30% | 2 | 28.54 | 0.00
80_20 | exact | 30–40% | 97 | 36.37 | 36.08
80_20 | near | 70–80% | 9 | 77.07 | 66.67
31_14 | exact | 20–30% | 4 | 28.76 | 0.00
31_14 | exact | 70–80% | 15 | 73.68 | 60.00
31_14 | exact | 80–90% | 1 | 86.08 | 0.00
31_14 | near | 70–80% | 17 | 76.79 | 64.71


These observed bin gaps flag limitations; their small/dependent samples do not prove systematic overconfidence. Very high positive-case probabilities are especially unvalidated because no zero outcomes occur anywhere in this dataset.

### Selections not improved on both distribution scores


Protocol | Disease | Barangay | Classification | CMP NLL | CMP RPS
--- | --- | --- | --- | --- | ---
80_20 | Cough | Cansilayan | worsened | 2.5102 | 1.0952
80_20 | Cough | Sta. Rosa | worsened | 2.4167 | 1.1187
80_20 | All types of skin disease | Blumentritt | mixed | 1.7492 | 0.6129
31_14 | Cough | Cansilayan | worsened | 2.3690 | 1.0630
31_14 | Cough | Sta. Rosa | worsened | 1.9929 | 0.8816
31_14 | ARI | Cansilayan | worsened | 1.9592 | 0.5619


NLL and RPS comparisons assess probabilities, not the accuracy of SARIMA point predictions. The 67 improved selections in each protocol are descriptive results, not significance tests. CMP can assign too little mass to unexpected extremes; those failures are fully charged in log loss.

### Why it helps here, and what is still unknown

Estimated training dispersion nu ranges from 1.596 to 8.465. Every fitted nu exceeds one, consistent with underdispersion. Ordinary Poisson spreads probability too widely for these unusually regular synthetic counts. CMP narrows the distribution while retaining the SARIMA mean. The comparison does not isolate the value of SARIMA versus a mean-CMP model; only the three requested policies were evaluated.

The fitted nu is estimated from marginal training counts. It is assumed to transfer to uncertainty about the SARIMA mean, but that is not guaranteed. No parameter-estimation uncertainty is added. Central discrete intervals often contain substantially more probability than the nominal level: compare observed coverage with the actual assigned mass and interval width in the tables above.

Freeze this probability layer before any prospective evaluation. Collect complete new monthly outcomes under consistent reporting, retain failures and unexpected zeros, compare predeclared proper scores/baselines, and inspect calibration across disease/barangay and probability levels. Determine any recalibration using training data only and assess it on a separate subsequent period. No claim of real-world reliability follows from this synthetic exploratory result.
