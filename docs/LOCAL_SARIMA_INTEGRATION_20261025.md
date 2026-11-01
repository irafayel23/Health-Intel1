# Local MHO balanced SARIMA demonstration

Local integration approved on 25 October 2026. Azure deployment, production database changes and GitHub main pushes were not approved and were not performed.

## What the MHO page now does

Predictions loads the verified balanced synthetic SARIMA results through authenticated MHO-only endpoints. Run Forecast loads saved calculations; it does not fit or retrain a model, invoke Python, or query operational cases. The regular municipal analytics, patient directory, walk-ins, heatmap and reports continue using their existing operational APIs.

The page supports the ten original diseases and seven original barangays plus all-disease/all-barangay selections. All 88 selections have a working interface. Missing complete forecasts remain unavailable. The graph shows recorded synthetic history, the selected protocol/horizon's saved backtest predictions, and October/November estimates. It has hover/focus details, a historical-window selector, a forecast-region boundary and individual nominal 95% model intervals. No aggregate interval is fabricated.

The layout follows the supplied design reference: large chart on the left, circular selection-specific performance and metrics on the right, estimates and a separate overall benchmark, followed by Forecast Summary and transparent MHO-review recommendations. The reference image's illustrative counts, dates, metrics and clinical-success claims were not copied.

The default historical protocol is primary 80/20 and the default evaluation horizon is one month, matching the primary research endpoint. Switching to secondary 70/30 or two-month evaluation updates the selected metrics, backtest graph and pooled benchmark together. The main future estimate remains November 2026, two months after the frozen September cutoff; October is displayed separately as the intermediate one-month estimate. Protocol selection does not refit the final production-style model or change those saved future estimates.

## Measures and exact provenance

SYNTHETIC DATA — CAPSTONE DEMONSTRATION ONLY. REAL-WORLD VALIDATION PENDING.

| Primary 80/20 h1 measure | Value |
|---|---:|
| Requested | 630 |
| Produced | 600 |
| Passed proposed tolerance | 517 |
| Within tolerance | 517/600 × 100 = 86.16666667% |
| Passing/all requests | 517/630 × 100 = 82.06349206% |
| Availability | 600/630 × 100 = 95.23809524% |
| MAE | 6.24364363 cases |
| RMSE | 8.25431238 cases |
| Positive-only MAPE | 10.85120985% |

Allowed error = max(1 case, 0.20 × actual). A target passes when |prediction−actual| is no greater than this tolerance, with the existing numerical tie epsilon 1e-12. This proposed demonstration measure awaits panel acceptance; it is not MAPE, 100−MAPE or the probability an unknown future forecast is correct.

MAE = Σ|error|/N. RMSE = √(Σerror²/N). MAPE = Σ(100×|error|/actual)/Npositive. Zero-actual targets are excluded only from MAPE and counted. Missing forecasts are not scored as zeros. Aggregate scores use complete aggregate totals rather than averaging component percentages. Every selected target, error, allowed tolerance, outcome, denominator and arithmetic step is available in the page's calculation section.

Cough + Salvacion primary h1 is 6/9 = 66.66666667%, not 86.17%. Its h2 score is 6/8 = 75%. Its saved October estimate is 69.6931883980 and November estimate 65.4040190611; the November nominal interval is 42.5234107418–88.2846273804. These are estimates on synthetic data, not verified real-world predictions.

The original 3,150-record CSV, seed 2026102503, generator, model policy, all 45 historical months, results and evidence remain frozen. The private local copy is byte-checked against its import manifest. Dataset SHA-256: eb6f5e97cbaeca41a775d41c43c66f7ae7d4c2d591e639be2639fd558bcf28d4. Evidence ZIP SHA-256: 269c2696c0136cd6562a50f39c3d1386afd48ec61c57790409bd6b56f7be1511.

## Missing future results

66/70 individual combinations have both October and November outputs; 9/18 aggregate selections have complete future totals. All-ten/all-seven future totals are unavailable. Some historical aggregate views also lack a complete score. They display Not Available rather than a guessed value.

| Unavailable combination | Native current-prefix candidate failures |
|---|---|
| Infection all types / Cansilayan | 8 residual-correlation failures; 1 root-stability failure |
| ARI / Blumentritt | 9 residual-correlation failures |
| Influenza / Minoyan | 8 residual-correlation failures; 1 root-stability failure |
| Acute Gastroenteritis / Caliban | 7 residual-correlation failures; 2 root-stability failures |

These causes were read from the original nine-candidate journals at training length 45. No safeguards were weakened, no fit rerun, no records changed and no other forecasting model substituted. The page identifies missing components and gives readable reasons. No forecast-dependent recommendations are generated for an unavailable complete total.

## Files and boundaries

Modified: mho.html, assets/js/mho/mho-forecast.js, compiled assets/css/mho/mho-utilities.css, server/server.js and server/middleware/access-control.js.

Added: server/services/balanced-sarima-demo.js, server/routes/balanced-sarima-routes.js, server/tests/balanced-sarima.test.js, and private server/data/balanced-sarima-demo/{snapshot.json,manifest.json,SYNTHETIC_BALANCED_monthly.csv,unavailable-causes.json}.

GET /api/mho/sarima-demo/options returns the fixed study selectors and metadata. GET /api/mho/sarima-demo?disease=Cough&barangay=Salvacion&protocol=80_20&horizon=1 returns that selection's saved results. ALL is the only aggregate sentinel. Unsupported labels, arrays, protocols, horizons or parameter names are rejected. Existing JWT, account status, password version, session epoch and revocation checks are retained. BHW, Admin, Superadmin and anonymous requests do not gain access. Responses use no-store. The service fails closed if its private evidence fails its SHA-256 checks.

The new service is intentionally disabled when NODE_ENV=production. The snapshot and CSV are not placed under public static assets. The existing /api/predict AR(1) bridge remains for compatibility, but the updated MHO page does not call it. No original patient table is modified or replaced with synthetic rows.

## Backup and verification

Recoverable original files, their SHA-256 manifest, the original Git HEAD, initial Git status and full tracked working-tree diff are saved in:

C:\Users\User\.codex\visualizations\2026\09\26\01a0dc67-9eb2-7d12-988d-be95e09269e0\local-balanced-integration-20261025\backup

No unrelated work was reset, stashed, staged or committed. Original security/dependency improvements are retained. The source research manifest and ZIP are rechecked separately.

Automated regression: 235 tests passed, 0 failed/skipped. Targeted SARIMA/capacity/security run: 15 passed. The new tests independently checked 352 scope/protocol/horizon combinations, correct scores and aggregate behavior, private-source integrity, input validation and existing MHO authorization. Browser QA used a normal sign-in against a disposable synthetic database and the real frozen forecast results: 88 selections, 352 views, 5,632 assertions. Mobile views at 390/360 px and an additional 320 px aggregate state had no horizontal overflow. Keyboard/pointer chart details, stale-result clearing and dark-mode score contrast were checked. Existing analytics, patient directory, reports and rendered heatmap were smoke-tested. QA records and credentials are test fixtures, never measured forecasting evidence.

See the integration REPORT.md for final cleanup/preservation status, screenshots and any limitations in screenshot capture. Tests that use a database create disposable databases and verify their source fingerprints. Real patient records are not used as generated SARIMA observations.

## Run locally

Use the existing Node 24.22.1 / npm 11.19.1 environment; no dependency reinstall is needed. Restart the Node backend after changing route registration. In PowerShell:

```powershell
cd 'C:\Users\User\Downloads\Final proj\proposal\server'
$env:NODE_ENV = 'development'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
$env:SERVE_FRONTEND = 'true'
npm start
```

These are temporary local process variables, not an edit to .env or Azure. Keep the existing local MySQL service available for normal sign-in and operational portal features. Open http://localhost:3000/, use the usual approved MHO account, choose Predictions, hard-refresh with Ctrl+F5 if needed and click Run Forecast. Review Cough/Salvacion, the two single-dimension aggregates, all/all and ARI/Blumentritt. The simplified dashboard uses the primary chronological 80/20 one-month tests automatically; secondary 70/30 and two-month comparisons remain in the unchanged research evidence. Other portal roles continue using their own pages and permissions.

Future October observations must be genuine, complete observations in a separately authorized and verified evidence release before November can be treated as h1. The current module is a frozen saved-results demonstration and does not implement data ingestion or retraining. Predicted October values must not be inserted as actuals.

## Deployment recommendation

Ready for local capstone review with the disclosed missing forecasts and pending validation. Do not deploy this local-only module unchanged: production mode intentionally disables it. Any later Azure change needs separate approval, explicit synthetic-demonstration presentation, private evidence packaging/integrity verification and deployment/authentication checks. None of the synthetic percentages establishes real-disease forecasting validity.


## Presentation simplification — 25 October 2026

At the user's request, the local MHO page now removes the large demonstration banner, visible validation-pending wording, protocol/horizon selectors, separate overall benchmark and availability cards, and detailed calculation table. A small Synthetic demo data label remains. This is a presentation change: the frozen research status and provenance are unchanged and no genuine-disease validation is claimed.

Forecast Accuracy / Historical test shows only the selected scope's unchanged proposed within-tolerance percentage, with passed/available counts and available/requested counts. A collapsed explanation states the ±20% or one-case rule, pending panel acceptance, chronological 80/20 protocol, and that this is not future correctness probability. Missing scores stay unavailable; the pooled 86.17% is never substituted. MAE, RMSE and MAPE retain original values with plain labels.

October and November estimates are rounded to approximate case counts for display. Native precision remains in chart details, saved predictions and scoring. October is h1 and November is h2 from September 2026; no horizon or model changed. Summary copy is shortened; recommendation wording maps to the existing frozen rule IDs. Synthetic-data advice is represented by the small label, and the date-update advice by the forecast cards/footer. Rule triggers and saved research evidence are unchanged.

Verification: all 235 existing automated tests passed. All 88 dashboard selections passed 792 display checks against genuine saved results. Selection changes and backend failure clear stale results and allow retry. All existing HTML IDs and unrelated portal content were preserved. No desktop/window or other-tab controls were used; this revision was inspected at the current tab's natural size. The earlier integration's responsive checks remain historical evidence, not a new viewport test. The disposable QA database was removed with source fingerprint unchanged. No Azure changes.

Current revision evidence, recoverable backups and screenshots: C:\Users\User\.codex\visualizations\2026\09\26\01a0dc67-9eb2-7d12-988d-be95e09269e0\simplify-mho-20261025


## Latest UI-001 presentation override — single-month forecast

The owner authorized a newer minimal local design on25October2026. Only October2026 h1 is displayed, derived from September history. November remains in private saved evidence/API and is not a second graph/result. Historical performance remains primary80/20 h1, selection-specific; aggregate sums preserve missing components. Graph/performance grid is followed by Forecast Summary and then Automated Recommendations. Small synthetic and real-world-validation labels remain visible. No live model fitting, DB write or backend change.

Added display helper assets/js/mho/sarima-presentation.js and focused tests server/tests/mho-forecast-presentation.test.js. Saved November narrative is not used for October explanations; existing rule meanings are evaluated for the displayed h1 count.51 selected tests passed. Current Browser setting appears on but this session's browser tool is disabled; genuine desktop/mobile screenshots and final browser verification remain pending. Do not mistake the earlier integration/simplification screenshots for this new design. See CODEX_HANDOFF.md and UI-001 in CODEX_TASKS.md for resume instructions.


### UI-001 actual browser verification completed

25October2026, CODEX-2:51 focused tests pass after the final320px explanation-popup width correction. All88 actual browser selections passed968 count/score/error/date/missing-state assertions.1440px desktop,390px/320px responsive layouts, full history, graph click/keyboard inspection, explanation/Escape, dark mode and stopped-service stale-output clearing checked. Genuine screenshots: external mho-predictions-redesign-20261025/{desktop-forecast.jpg,desktop-summary.jpg,mobile-top.jpg,mobile-graph.jpg,mobile-performance.jpg,mobile-summary.jpg,mobile-recommendations.jpg,mobile-320-information.jpg,mobile-dark.jpg}. Research results and original application boundaries unchanged. Disposable QA database removed/source fingerprint preserved; normal localhost:3000 restored and browser viewport reset. Remaining original unavailable forecasts are not a graph-rendering bug. No physical-device/provider certification or Azure release is claimed.
