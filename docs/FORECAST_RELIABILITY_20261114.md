# Health-Intel forecast reliability review

14 November 2026 · CODEX-1 · Offline research and local shadow monitoring

**Decision.** Retain frozen SARIMA and conditional-pooled COM-Poisson (CMP). The fixed CMP/Poisson mixture merits a prospective shadow comparison only. Its tail losses improved in the demonstration replay, but the improvement was uncertain overall and came with regressions in ordinary months, ranked probability score and exact-count performance. Keep the existing experimental label.

## Frozen evidence and gaps

The preserved snapshot contains 45 months, 3,150 disease–barangay monthly counts and 6,200 cases across 70 scopes. Zero of the 3,150 counts are zero. Both historical windows were previously inspected. The secondary window starts in August 2025 and overlaps all nine primary months. The frozen conditional probability fit is available only on the same January–September 2026 targets, so there is no second probability validation set. October was unscored. No fresh genuine monthly outcomes were supplied or scored.

The replay verifies frozen CSV and SARIMA snapshot SHA-256, each SARIMA training prefix, the CMP evidence manifest and chronological dispersion-pair digests, and reproduces saved CMP log loss, RPS, exact/nearby probabilities and 80%/95% coverages. It uses the installed frozen distribution calculation, leaving baseline settings unchanged. The previous [SARIMA availability audit](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/sarima-availability-audit-20261111/REPORT.md) showed all 36 candidates for the four missing Influenza / Caliban months passed convergence and numerical checks and failed the Ljung–Box screen at 0.01. Preserve those rejections. Prior simple advance warnings gave many false alarms and missed most rises. This experiment introduces no new SARIMA feature or warning trigger.

The local publication service requires 45 closed, confirmed months across all seven barangays and rejects stale report digests and pending classifications. Explicit completed zero counts remain valid. Unreported scopes are incomplete. It checks frozen dependencies, matching prediction version and MHO publication approval before serving operational results. Its existing retrospective output measures point errors. The shadow register supplies independently retained receipts and a multi-month probability comparator without using the publication pointer or changing MHO/BHW permissions.

## Case-count benchmarks

Errors in cases on the same 626 of 630 primary targets. Seasonal naive means the count 12 months before the target.

| Method | Available | MAE | RMSE | Rise MAE | Rise RMSE |
|---|---:|---:|---:|---:|---:|
| Frozen SARIMA | 626/630 | 0.4921 | 0.7019 | 2.0370 | 2.1703 |
| Previous month | 630/630 | 0.3674 | 0.7391 | 2.1667 | 2.2174 |
| Seasonal naive | 630/630 | 0.5559 | 0.9079 | 2.0833 | 2.2174 |

Previous month had lower average absolute error. SARIMA had lower error after squaring misses and had a smaller average miss on observed rises. SARIMA still underestimated all 24 matched rises by an average of 2.04 cases. A rise means two or more above the previous month. There were 25 rises and one was unavailable. These groups use actual counts after scoring and do not define an issue-time trigger. The 973 matched secondary point targets had MAE/RMSE of 0.4869/0.6864 (SARIMA), 0.3690/0.7303 (previous month) and 0.5766/0.9186 (seasonal naive). Both naive baselines had all 980 secondary estimates.

## Probability challenger

A fixed 90% CMP and 10% ordinary Poisson mixture at the same unrounded SARIMA mean. The weight was recorded before running the replay. It is a hypothesis about error tails, and the base outcome distribution or availability never depends on the target actual. The method preserves the point mean and leaves a zero estimate at a degenerate zero distribution. It never attaches a probability to a rejected SARIMA estimate. Full-density log score and RPS assess different aspects of the distribution. Log score measures probability on the observed count, while RPS penalizes errors in cumulative probabilities across count thresholds. [Strictly proper scoring rules](https://doi.org/10.1198/016214506000001437) · [Combining predictive distributions](https://arxiv.org/abs/1106.1638)

| Primary metric | Frozen CMP | Fixed mixture |
|---|---:|---:|
| Available / attempted | 626/630 | 626/630 |
| Log loss | 0.9393 | 0.9287 |
| RPS | 0.3123 | 0.3133 |
| Exact Brier | 0.2133 | 0.2156 |
| Nearby Brier | 0.0387 | 0.0384 |
| Exact assigned / observed | 60.70% / 61.98% | 57.50% / 61.98% |
| Nearby assigned / observed | 97.13% / 95.53% | 94.90% / 95.53% |
| 80% interval coverage / assigned mass | 94.89% / 95.72% | 95.85% / 93.38% |
| 95% interval coverage / assigned mass | 97.28% / 98.98% | 98.08% / 97.74% |
| 80% / 95% mean width in cases | 1.46 / 2.09 | 1.57 / 2.55 |
| Sudden rise log loss, 24 matched | 4.5185 | 3.5471 |
| Sudden rise RPS, 24 matched | 1.6473 | 1.6178 |
| Sudden rise 80% / 95% coverage | 25.00% / 45.83% | 29.17% / 58.33% |
| Sudden rise nearby assigned / observed | 91.08% / 16.67% | 88.57% / 16.67% |
| Ordinary log loss, 602 matched | 0.7966 | 0.8243 |

Discrete intervals can include more than their nominal mass. Compare coverage with the mass actually assigned and report width. The mixture reduced the loss on large surprises by allowing more probability away from the center. The reduced sharpness also increased losses on ordinary counts. The observed-rise subset still had four nearby outcomes, and the mixture did not make the SARIMA estimate track the increase. Across all 626 available targets the rise-event Brier was 0.03715 vs 0.03713, a very small exploratory change. That across-target score is the relevant event comparison. No observed zeros means there is no evidence for zero-versus-positive discrimination. On Cough (63), log loss was 1.7354 vs 1.7179, RPS 0.7373 vs 0.7364, and nearby assigned probability moved from 79.95% to 77.27% compared with 74.60% observed.

The 9-month primary paired circular three-month-block bootstrap gives a descriptive 95% interval of −0.05334 to +0.02395 for mixture minus CMP log loss and +0.00021 to +0.00179 for RPS. Nine months are few and the full outcome history was already inspected. These intervals express sensitivity to resampling those months and cannot certify improvement. The broader secondary window has five months with no eligible probability pairs and reuses every primary probability observation.

Prior peer-trend SARIMA and barangay-shrunk CMP remain rejected for replacement. The former still missed all 24 rises and worsened strict-rise errors (3 targets). The latter worsened sudden-rise log loss (4.5185 to 4.7495). The [earlier report](MODEL_CHALLENGERS_20261109.md) gives matched details. Retain both naive benchmarks in future comparison. Prior seasonal fallback improves availability on the four examined gaps under a separate label. Its effectiveness on future failures remains unverified and it gets no CMP probabilities.

## Monitoring and next action

The isolated tool extends the existing verified issue/score workflow. It writes 70 shadow attempts with source-bound SARIMA means, baseline and challenger distributions and intervals, naive comparator values, model/source hashes, timestamps, and unavailable statuses before target outcomes are known. It refuses to overwrite an issued folder. The local scorer uses separately kept issuance and scoring receipts, requires complete MHO review and reads the exact reviewed actuals CSV. It separates prospective operational evidence from explicit synthetic QA, retains infinite losses, verifies unique months, and reports count and probability denominators, deciles and month-block intervals. The issued date is within the target month following the closed cutoff. Forecast timing is not backdated or presented as a complete ahead-of-month trial.

Ready for supervised use as a private local CLI. No application integration or Azure deployment was performed. Application integration would need an approved protected read-only surface, source-vintage and receipt custody decisions, and a trial with actual MHO exports. Files and reviewer attestations cannot independently prove historic reporting vintages, the truth of an attestation or when a person learned the outcome. Keep copies of issue-time snapshots and the first receipt with an independent custodian. Where old paired outcomes were later corrected, obtain the archived vintage or omit that pair under a declared protocol. Keep corrected actuals and their review in a separately versioned record, and do not overwrite original scores.

Next action: designate an MHO reviewer and request a genuine, consecutive 45-month history, including archived issue-time aggregate vintages and eligibility rules, resolved classifications, complete reports and explicit zeros. Request private hash-bound input/output artifacts from an authorized completed monthly run. Confirm the 28 informative SARIMA pairs across five origins and five barangays per disease for eligible CMP, or report unavailable. Keep all 70 requested scopes. Register the protocol and first shadow packet before final target outcomes are known. MHO then confirms all 70 target counts after close. Unconfirmed reports postpone the cohort. See the operating guide and protocol for the prespecified acceptance proposal. A month range with genuine outcomes already known cannot be enrolled as an untouched holdout.

### Checks and artifacts

The reproduction is in the separate [research folder](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/forecast-reliability-20261114/). It includes the retained protocol, replay-final.json with all 980 rows, local issue/report tool, operator commands and tests. Three new focused synthetic tests and all ten existing operator tests passed. The final replay reverified the earlier-pair digests and reproduced the baseline. The small numerical log-mass safeguard uses a modal count to avoid taking the logarithm of an underflowed zero-count probability. The synthetic QA uses mocked dispersion fits to isolate workflow behavior and the real frozen distribution engine to form and score the probabilities. No genuine operational cohort was evaluated.
