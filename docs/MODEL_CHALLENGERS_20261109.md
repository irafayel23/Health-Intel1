# Experimental SARIMA and COM-Poisson challengers

9 November 2026, CODEX-1. Both implementations run offline against the frozen 6,200-case demonstration. This is a chronological replay of previously inspected months. It provides exploratory evidence only.

**Decision: retain both frozen baselines.** Peer-trend SARIMA lowered primary MAE by 0.0040 cases and RMSE by 0.0063. It still underestimated every one of the 24 matched rises of at least two cases, and error increased on the three strict rises. The previous-month baseline had the lowest overall MAE.

Barangay shrinkage improved overall exact-count calibration and slightly improved log loss and RPS. Nearby probabilities remained optimistic. For sudden rises, nearby probability averaged 91.50% and the nearby range contained only 16.67% of outcomes. Sudden-rise log loss worsened even though the central 95% interval covered two more of the 24 targets. This tradeoff does not justify replacement.

## What was implemented

- **Peer-trend SARIMA.** A disease-level ridge correction is added to the frozen SARIMA estimate. Its only feature is the preceding one-month change averaged across the six other barangays. Each coefficient uses earlier one-step SARIMA errors for the same disease. Missing SARIMA outputs stay missing. The original template and fitting policy are preserved.
- **Barangay-shrunk COM-Poisson.** Each barangay estimates its own dispersion from earlier SARIMA mean/outcome pairs, with a fixed quadratic penalty on log dispersion toward the frozen disease-level value. Both probability methods use the same unrounded SARIMA mean and the same exact and nearby events. This evaluates uncertainty independently of the count correction.

The earliest fitted origin is January 2026. Both methods need five earlier disease-wide origins, so the secondary 31/14 window tests the cost of that requirement and repeats the same matched months. The frozen policy records the feature, penalty, minimum training sizes, numerical acceptance checks and evaluation groups. [Protocol and assumptions](../tools/research/model-challengers-20261109/POLICY.md)

## Count results

| Group | Method | Available / requested | Common | MAE | RMSE | Signed error | Underpredicted |
|---|---|---:|---:|---:|---:|---:|---:|
| Primary | Frozen SARIMA | 626/630 | 626 | 0.4921 | 0.7019 | 0.0138 | 291 |
| Primary | Peer-trend SARIMA | 626/630 | 626 | 0.4881 | 0.6956 | 0.0255 | 280 |
| Primary | Previous month | 630/630 | 626 | 0.3674 | 0.7391 | -0.0511 | 103 |
| Secondary | Frozen SARIMA | 973/980 | 626 | 0.4921 | 0.7019 | 0.0138 | 291 |
| Secondary | Peer-trend SARIMA | 626/980 | 626 | 0.4881 | 0.6956 | 0.0255 | 280 |
| Secondary | Previous month | 980/980 | 626 | 0.3674 | 0.7391 | -0.0511 | 103 |
| Sudden +2 | Frozen SARIMA | 24/25 | 24 | 2.0370 | 2.1703 | -2.0370 | 24 |
| Sudden +2 | Peer-trend SARIMA | 24/25 | 24 | 1.9800 | 2.1255 | -1.9800 | 24 |
| Sudden +2 | Previous month | 25/25 | 24 | 2.1667 | 2.2174 | -2.1667 | 24 |
| Sudden +3 and double | Frozen SARIMA | 3/3 | 3 | 3.0565 | 3.1693 | -3.0565 | 3 |
| Sudden +3 and double | Peer-trend SARIMA | 3/3 | 3 | 3.1206 | 3.1771 | -3.1206 | 3 |
| Sudden +3 and double | Previous month | 3/3 | 3 | 3.3333 | 3.3665 | -3.3333 | 3 |
| Cough primary | Frozen SARIMA | 63/63 | 63 | 1.0550 | 1.3468 | -0.2846 | 31 |
| Cough primary | Peer-trend SARIMA | 63/63 | 63 | 1.0147 | 1.3095 | -0.2515 | 29 |
| Cough primary | Previous month | 63/63 | 63 | 0.8254 | 1.3452 | -0.1905 | 18 |

Signed error is predicted minus actual cases. Both sudden-increase groups use the eventual outcome to define the subgroup. The strict group requires at least three additional cases and at least double the preceding month. These groups are not alerts.

Across all 70 selections, the count challenger improved both MAE and RMSE in 31, worsened both in 29 and had mixed or tied scores in 10.

Training-only diagnostics used the first 36 observed months. Across diseases, the relationship between the peer trend and earlier SARIMA residuals was weak to modest and changed sign. Average within-scope lag-1 and lag-12 correlations were recorded for context. They did not select the feature, model or penalty.

## Probability results

| Group | Method | Available / requested | Common | Exact Brier | Nearby Brier | Log loss | RPS |
|---|---|---:|---:|---:|---:|---:|---:|
| Primary | Frozen disease-pooled CMP | 626/630 | 626 | 0.2133 | 0.0387 | 0.9393 | 0.3123 |
| Primary | Barangay-shrunk CMP | 626/630 | 626 | 0.2090 | 0.0388 | 0.9367 | 0.3100 |
| Secondary | Frozen disease-pooled CMP | 626/980 | 626 | 0.2133 | 0.0387 | 0.9393 | 0.3123 |
| Secondary | Barangay-shrunk CMP | 626/980 | 626 | 0.2090 | 0.0388 | 0.9367 | 0.3100 |
| Sudden +2 | Frozen disease-pooled CMP | 24/25 | 24 | 0.2851 | 0.6903 | 4.5185 | 1.6473 |
| Sudden +2 | Barangay-shrunk CMP | 24/25 | 24 | 0.2986 | 0.6994 | 4.7495 | 1.6556 |
| Sudden +3 and double | Frozen disease-pooled CMP | 3/3 | 3 | 0.2282 | 0.7891 | 6.3097 | 2.5616 |
| Sudden +3 and double | Barangay-shrunk CMP | 3/3 | 3 | 0.2928 | 0.7668 | 7.4488 | 2.5671 |
| Other primary | Frozen disease-pooled CMP | 602/605 | 602 | 0.2104 | 0.0127 | 0.7966 | 0.2591 |
| Other primary | Barangay-shrunk CMP | 602/605 | 602 | 0.2055 | 0.0124 | 0.7847 | 0.2564 |
| Cough primary | Frozen disease-pooled CMP | 63/63 | 63 | 0.2171 | 0.1959 | 1.7354 | 0.7373 |
| Cough primary | Barangay-shrunk CMP | 63/63 | 63 | 0.2174 | 0.1990 | 1.7319 | 0.7374 |

Lower Brier, log loss and ranked probability score (RPS) are better. The numbers below compare average assigned probability with observed frequency on the same targets. Fixed-decile reliability tables are in the summary.

| Group | Method | Exact assigned / observed | Nearby assigned / observed | 80% coverage / assigned mass / mean width | 95% coverage / assigned mass / mean width |
|---|---|---|---|---|---|
| Primary | Frozen disease-pooled CMP | 60.70% / 61.98% | 97.13% / 95.53% | 94.89% / 95.72% / 1.4601 | 97.28% / 98.98% / 2.0863 |
| Primary | Barangay-shrunk CMP | 61.97% / 61.98% | 97.11% / 95.53% | 94.09% / 95.30% / 1.3882 | 97.92% / 98.98% / 2.0543 |
| Sudden +2 | Frozen disease-pooled CMP | 49.51% / 4.17% | 91.08% / 16.67% | 25.00% / 94.20% / 2.0833 | 45.83% / 98.43% / 2.8750 |
| Sudden +2 | Barangay-shrunk CMP | 50.63% / 4.17% | 91.50% / 16.67% | 16.67% / 93.55% / 2.0000 | 54.17% / 98.92% / 3.0833 |
| Cough primary | Frozen disease-pooled CMP | 32.94% / 33.33% | 79.95% / 74.60% | 85.71% / 91.09% / 2.9841 | 95.24% / 98.08% / 4.4444 |
| Cough primary | Barangay-shrunk CMP | 33.79% / 33.33% | 80.74% / 74.60% | 85.71% / 90.99% / 2.8889 | 95.24% / 98.15% / 4.3968 |

Primary 80% intervals were wider / the same width / narrower for **40/510/76** targets. The 95% intervals were **51/507/68**. Width is upper minus lower count. Discrete equal-tail intervals can assign more than their nominal coverage.

Across all 70 selections, the dispersion challenger improved both log loss and RPS in 28, worsened both in 29 and had mixed or tied scores in 13.

| Cough barangay | Matched | Count MAE change | Log loss change | RPS change |
|---|---:|---:|---:|---:|
| Salvacion | 9 | -0.0551 | -0.0006 | -0.0003 |
| Alegria | 9 | -0.1236 | 0.0176 | 0.0027 |
| Blumentritt | 9 | 0.0027 | -0.0047 | -0.0025 |
| Caliban | 9 | -0.0952 | 0.1065 | 0.0103 |
| Cansilayan | 9 | -0.0375 | -0.1521 | -0.0082 |
| Sta. Rosa | 9 | -0.0018 | 0.0185 | 0.0009 |
| Minoyan | 9 | 0.0285 | -0.0097 | -0.0021 |

Changes are challenger minus baseline. Negative values favor the challenger.

## Availability, limits and next decision

October is unscored. All four models produced estimates for all 70 October selections. The export leaves the October actual empty. The original data contain no zero-case months, so behavior on genuine zeros and zero-versus-positive calibration still needs operational evidence.

Keep the current working models. Before considering a replacement, fix the candidate policy, acceptance margins and comparison groups before viewing new data. Register both methods' 70 predictions with dates and hashes before outcomes are known. Use independently retained receipts and several months and seasons of complete MHO-confirmed totals. Keep delayed reports missing, score genuine zeros, compare matched targets with all-attempt availability, and assess month-cluster uncertainty. Require a sustained advantage on predeclared count or probability measures and verify that sudden rises and ordinary months meet the agreed limits. See the [existing MHO validation checklist](CMP_MHO_VALIDATION_CHECKLIST_20261107.md).

## Reproduction and evidence

Use the existing scientific Python environment with NumPy and SciPy. From the repository root, run the research scripts with the three read-only source directories and a new output path outside the checkout.

```powershell
& $researchPython -B tools/research/model-challengers-20261109/test_challengers.py
& $researchPython -B tools/research/model-challengers-20261109/run.py --project $project --original $originalCmpEvidence --pooled $pooledCmpEvidence --output $newEvidenceDirectory
```

Use the project checkout, the existing cmp6200-20261103 and cmp-reliability-20261106 evidence directories, and an unused output directory. The runner verifies frozen SHA-256 values and baseline score reproduction. Evidence includes all 980 historical rows, 70 unscored October rows, all 70 primary scope summaries, training-only diagnostics, fixed-decile calibration, and input and source hashes. Six focused tests passed. The separate output audit checks scope uniqueness, identical means and events, Brier math, interval accounting, tail/mean checks, availability, and count metrics. The first attempt stopped before scoring on a CSV iterator error. The completed run used the same algorithm parameters with the reader corrected.

The experiment lives under tools/research and has no runtime integration. No model bundle, historical evidence, dataset, page, database or Azure resource was modified by the experiment.
