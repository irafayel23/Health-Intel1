# Local 5,500-case SARIMA integration

Completed 2026-10-26T20:43:39+08:00 by CODEX-2, task LOCAL-5500. Owner approved Policy A from FORECAST-005 for local use only.

## Installed behavior

The existing MHO Predictions page now reads the NEW frozen 5,500-case synthetic dataset: 3,150 unique monthly records, January 2023–September 2026, ten diseases and seven barangays. All 70 individual selections show their own saved October 2026 one-month-ahead forecast, selected historical percentage, MAE, RMSE and positive-only MAPE. The interactive historical/backtest/forecast graph, summary, rule-based recommendations, mobile layout and dark mode remain.

**Current method counts: 70 SARIMA, 0 Seasonal Naive, 0 unavailable.** SARIMA uses the original nine-template numerical Policy A, with period 12 and estimated seasonal terms. The previous four missing forecasts belonged to the old high-count dataset; they are not missing in this new source. This integration does not resolve them by modifying old research.

Seasonal Naive is enabled only if the saved Policy A SARIMA record is unavailable. It repeats the count from the same month of the preceding year and receives its actual method label. It receives no fabricated interval. Corrupted accepted SARIMA evidence fails closed instead of falling back silently. All current fits pass the preserved numerical checks, but only 6/70 meet the existing annual-support screen; 64 show the weak/uncertain annual-seasonality warning. Numerical acceptance is not proof of significant annual seasonality.

The new local service has no database, model-fitting or network dependency. Run Forecast retrieves saved verified results; it does not train on current patient records. Clinical data, old frozen source/results, and Azure are unchanged. Old Balanced service and private bundle remain for rollback; the active local route selects the new service. The legacy AR(1) compatibility endpoint is unchanged and is not called by this page.

## Correct calculations and limits

Primary reporting remains chronological 80/20 repeated one-month-ahead evaluation: 36 training months initially, nine held-out target months per combination (January–September 2026). Secondary 70/30 begins with 31 training months and has 14 targets; it remains available in private API evidence without new dashboard controls. At each saved origin, the corresponding training prefix/hash and native accepted result were verified. No new fitting, model retuning, revised targets or threshold selection occurred during integration. These previously inspected synthetic targets do not become independent confirmation through integration.

For actual count y and unrounded prediction p, a historical result passes if abs(p-y) <= max(1,0.20*y). Selected percentage = 100 × passing forecasts / produced forecasts. Availability = 100 × produced / attempted. MAE = mean(abs(p-y)); RMSE = sqrt(mean((p-y)^2)); MAPE = 100 × mean(abs(p-y)/y) using produced targets with y>0 only. Zero targets remain in MAE/RMSE/tolerance scoring; only MAPE excludes them. All internal calculations retain full precision. Displayed case estimates round to whole cases, while chart readouts expose decimal estimates.

| Separate policy-A + fallback evaluation | Attempts | Produced | SARIMA | Fallback | Passes | Within proposed error limit | MAE | RMSE | Positive-only MAPE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Primary 80/20 |630|630|630|0|350|55.555556%|1.142124|1.500087|52.289838%|
| Secondary 70/30 |980|980|979|1|531|54.183673%|1.162664|1.507370|53.471537%|

Primary MAPE uses 510 positive targets and excludes 120 zero targets. Secondary MAPE uses 783 positive targets and excludes 197 zero targets. The secondary fallback is the only historical unavailable native SARIMA output; it is scored as the explicitly approved Seasonal Naive policy, not relabeled SARIMA. Neither pooled percentage is substituted for a selected pair. The old 214,192-case data and 86.17% benchmark are absent from the new active result bundle. Preserved archived evidence retains those historical numbers.

Historical within-error-limit percentage is not the probability that disease cases will occur, nor a guarantee of future accuracy. The tolerance remains proposed pending panel acceptance. Synthetic validation does not establish real-world forecasting validity. Low counts make percentage errors large even when absolute errors are one or two cases. No 80% performance claim is made. Forecast intervals are saved nominal model intervals, not verified coverage guarantees. Recommendations use documented existing trigger rules and require MHO review; they do not diagnose, prescribe or declare outbreaks.

## Verification performed

- Rechecked FORECAST-005 final ZIP SHA-256, CRC and all 69 archived/local manifest hashes, source/policy-freeze hashes and both research archive hashes.
- Recomputed 3,818 cells independently in Python from the actual 70 service responses against native saved records and earlier frozen comparison evidence; checked both protocols and all current counts/bounds. Exact per-selection results are in [C:\Users\User\.codex\visualizations\2026\09\26\01a0dc67-9eb2-7d12-988d-be95e09269e0\local-lowcount-integration-20261026\per-selection-metrics.csv](C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/local-lowcount-integration-20261026/per-selection-metrics.csv).
- 66 relevant database-free Node tests passed, zero failures/skips. They cover new data and metrics, zero handling, actual method/fallback/unavailable fixtures, corrupt evidence, invalid inputs, MHO route authorization/no-store behavior, privacy/public-asset boundaries, old preserved-service regressions, responsive navigation and theme behavior. The full npm suite was not run because it includes MySQL-copy/migration/clinical workflows outside this change.
- 140 actual rendered selections passed: all 70 on 1440px desktop light and all 70 on 390px mobile dark. Checked selected estimate, percentage, MAE/RMSE/MAPE, graph forecast point/range, accessible chart readout, summary, recommendation rule IDs, annual warning and no page horizontal overflow. Full-history selector and score-popup clipping were checked. Headless browser used an isolated loopback UI harness serving the actual MHO markup/CSS/scripts and genuine results; unrelated modules/login were omitted. Authentication was tested separately with synthetic in-memory account fixtures; no live patient workflow or external email test is claimed.
- Actual application started on http://localhost:3000/mho.html, loopback only. Health ok; MHO HTML 200/new cache versions; anonymous forecast API 401; private bundle URL 404. No login or clinical endpoint was called. Server startup initially needed longer than the first probe; successful recheck is saved.
- Initial sandbox HTTP restriction, an incorrect QA navigation selector and scroll-container clipping in a tall mobile capture were test-harness issues. Corrected separate checks passed without modifying scientific results. Earlier failures are retained as evidence, not presented as final passes.

Evidence: `C:\Users\User\.codex\visualizations\2026\09\26\01a0dc67-9eb2-7d12-988d-be95e09269e0\local-lowcount-integration-20261026`. Read `independent-verification.json`, `browser-verification.json`, `regression-tests.log`, `local-runtime.json`, `visual-inspection.json`, `preservation.json`. Readable screenshots: desktop/mobile-dark `-graph.png`, `-score.png`, `-summary.png`. Original tall mobile screenshot clips at its scroll-container boundary; use the later card captures for inspection.

## Changed files

- `server/routes/balanced-sarima-routes.js`
- `assets/js/mho/sarima-presentation.js`
- `assets/js/mho/mho-forecast.js`
- `mho.html`
- `docs/CODEX_TASKS.md`
- `docs/CODEX_HANDOFF.md`
- `docs/CODEX_CHANGELOG.md`
- `docs/PROJECT_OVERVIEW.md`
- `server/services/lowcount-sarima-demo.js`
- `server/data/lowcount-sarima-5500/SYNTHETIC_monthly.csv`
- `server/data/lowcount-sarima-5500/snapshot.json`
- `server/data/lowcount-sarima-5500/manifest.json`
- `server/tests/lowcount-sarima.test.js`
- `docs/LOCAL_LOWCOUNT_INTEGRATION_20261026.md`

No package/lockfile, dependency, operational schema, patient record, Azure or deployment file was changed. New private JSON/CSV data are served only through the protected selection API, not as public files. The local-only new service rejects production activation; do not deploy this change automatically or assume Azure now uses it.

## Rollback

Recoverable Git checkpoint: `refs/checkpoints/lowcount-local-20261026-202036` → `d82539bb4ed8dd16a6156ad9eab88c01f3c4e1b4`. Branch HEAD, real staging index and security checkpoint are preserved.

Before rollback, save any later work and stop/restart only the local Health-Intel process. `C:\Users\User\.codex\visualizations\2026\09\26\01a0dc67-9eb2-7d12-988d-be95e09269e0\local-lowcount-integration-20261026\rollback-local.ps1` verifies the installed runtime hashes then restores only these four files from the pre-integration backups: `mho.html`, `assets/js/mho/mho-forecast.js`, `assets/js/mho/sarima-presentation.js`, `server/routes/balanced-sarima-routes.js`. It refuses if they have changed since this integration. It does not reset Git, restore older shared logs, delete research/data or touch MySQL/Azure. The preserved old route/service/bundle become active again after a local server restart. New inactive files remain as evidence. Review the script before running it.

## Per-selection primary results

Each row is calculated from that pair's nine historical targets; estimates are October 2026 unrounded saved results. Full primary and secondary records are in the accompanying CSV.

| Disease | Barangay | October estimate | Method | Within limit | MAE | RMSE | MAPE (positive only) |
|---|---|---:|---|---:|---:|---:|---:|
|Cough|Salvacion|3.692190|SARIMA|11.11%|2.420229|2.788357|95.552617%|
|Cough|Alegria|3.943358|SARIMA|44.44%|0.955511|1.173383|35.872732%|
|Cough|Blumentritt|4.514160|SARIMA|33.33%|2.531442|3.130416|110.147233%|
|Cough|Caliban|3.567466|SARIMA|22.22%|2.380773|2.989832|83.074920%|
|Cough|Cansilayan|2.934184|SARIMA|11.11%|2.716362|3.108260|80.302177%|
|Cough|Sta. Rosa|4.009437|SARIMA|44.44%|1.565397|1.812416|44.876934%|
|Cough|Minoyan|3.451729|SARIMA|44.44%|1.194916|1.513764|54.424380%|
|URTI|Salvacion|2.293728|SARIMA|44.44%|1.366407|1.787110|45.781504%|
|URTI|Alegria|1.620439|SARIMA|77.78%|0.936795|1.402640|35.252121%|
|URTI|Blumentritt|1.210279|SARIMA|55.56%|0.988706|1.459552|32.409702%|
|URTI|Caliban|1.423836|SARIMA|44.44%|1.204792|1.385832|52.564891%|
|URTI|Cansilayan|1.717754|SARIMA|66.67%|0.997449|1.237866|41.985278%|
|URTI|Sta. Rosa|1.333683|SARIMA|88.89%|0.569228|0.645796|36.615796%|
|URTI|Minoyan|0.581712|SARIMA|55.56%|1.120903|1.281436|73.828686%|
|Infection all types|Salvacion|1.473836|SARIMA|44.44%|1.273512|1.514798|51.922313%|
|Infection all types|Alegria|1.274526|SARIMA|77.78%|1.195616|1.953645|57.017753%|
|Infection all types|Blumentritt|1.339684|SARIMA|44.44%|1.113689|1.275857|56.651195%|
|Infection all types|Caliban|1.146126|SARIMA|66.67%|0.825558|0.904260|61.910777%|
|Infection all types|Cansilayan|1.726998|SARIMA|66.67%|0.849603|0.932410|45.611097%|
|Infection all types|Sta. Rosa|1.492105|SARIMA|77.78%|0.814105|0.977844|35.271493%|
|Infection all types|Minoyan|1.388932|SARIMA|44.44%|0.948665|1.119426|40.904981%|
|ARI|Salvacion|1.036971|SARIMA|77.78%|0.897989|1.162282|49.338638%|
|ARI|Alegria|2.115560|SARIMA|77.78%|0.742752|0.867903|38.242649%|
|ARI|Blumentritt|1.326223|SARIMA|66.67%|0.732123|0.876950|40.086718%|
|ARI|Caliban|1.506209|SARIMA|55.56%|0.804434|0.938027|47.674137%|
|ARI|Cansilayan|1.387237|SARIMA|55.56%|0.939093|1.241401|33.028130%|
|ARI|Sta. Rosa|0.629721|SARIMA|66.67%|1.127735|1.465671|44.956641%|
|ARI|Minoyan|1.965892|SARIMA|77.78%|0.779463|0.832417|60.159545%|
|Fever unknown origin|Salvacion|1.385350|SARIMA|77.78%|0.695231|0.865458|37.722904%|
|Fever unknown origin|Alegria|1.448558|SARIMA|100.00%|0.553857|0.585145|43.787246%|
|Fever unknown origin|Blumentritt|1.335604|SARIMA|55.56%|0.937994|1.101549|37.928997%|
|Fever unknown origin|Caliban|1.939362|SARIMA|44.44%|1.210825|1.420774|50.714451%|
|Fever unknown origin|Cansilayan|1.057550|SARIMA|33.33%|1.418539|1.726961|55.079232%|
|Fever unknown origin|Sta. Rosa|1.600098|SARIMA|44.44%|1.348349|1.729766|72.326607%|
|Fever unknown origin|Minoyan|1.492002|SARIMA|55.56%|0.921995|1.208609|25.808185%|
|Hypertension|Salvacion|1.611733|SARIMA|44.44%|1.192691|1.548179|38.147330%|
|Hypertension|Alegria|1.312120|SARIMA|33.33%|1.819295|2.385824|66.537807%|
|Hypertension|Blumentritt|1.621751|SARIMA|77.78%|0.869740|1.124323|45.890747%|
|Hypertension|Caliban|1.388486|SARIMA|66.67%|0.984412|1.292060|44.583488%|
|Hypertension|Cansilayan|1.536449|SARIMA|88.89%|0.722965|0.778575|58.933880%|
|Hypertension|Sta. Rosa|1.698890|SARIMA|77.78%|0.903430|1.139448|55.086890%|
|Hypertension|Minoyan|1.147127|SARIMA|66.67%|0.839457|0.962499|43.111038%|
|Influenza|Salvacion|1.570169|SARIMA|77.78%|0.919723|1.005014|68.447622%|
|Influenza|Alegria|1.522385|SARIMA|55.56%|1.010818|1.133698|36.342419%|
|Influenza|Blumentritt|2.852785|SARIMA|22.22%|1.718010|2.004919|107.379771%|
|Influenza|Caliban|1.139275|SARIMA|22.22%|1.724574|1.931142|72.236063%|
|Influenza|Cansilayan|1.769093|SARIMA|77.78%|0.901959|1.467706|30.683471%|
|Influenza|Sta. Rosa|0.893756|SARIMA|55.56%|0.886445|0.992462|28.186393%|
|Influenza|Minoyan|1.582796|SARIMA|44.44%|1.162399|1.388842|42.004278%|
|Acute Gastroenteritis|Salvacion|1.146950|SARIMA|44.44%|1.209687|1.726541|33.047766%|
|Acute Gastroenteritis|Alegria|1.193379|SARIMA|55.56%|0.767214|0.901032|25.753694%|
|Acute Gastroenteritis|Blumentritt|1.046001|SARIMA|44.44%|1.115114|1.310277|48.751167%|
|Acute Gastroenteritis|Caliban|1.342077|SARIMA|66.67%|0.956493|1.220963|38.787711%|
|Acute Gastroenteritis|Cansilayan|1.408808|SARIMA|66.67%|0.848050|0.971448|43.154883%|
|Acute Gastroenteritis|Sta. Rosa|2.005988|SARIMA|55.56%|1.139626|1.666739|75.513457%|
|Acute Gastroenteritis|Minoyan|1.396247|SARIMA|55.56%|1.108049|1.211367|66.285161%|
|Vertigo|Salvacion|2.212020|SARIMA|66.67%|1.352859|2.078122|69.715644%|
|Vertigo|Alegria|2.383413|SARIMA|44.44%|1.417374|1.726481|43.321982%|
|Vertigo|Blumentritt|0.879978|SARIMA|66.67%|0.903666|1.260021|46.572059%|
|Vertigo|Caliban|1.053566|SARIMA|66.67%|0.799619|0.942764|34.601397%|
|Vertigo|Cansilayan|1.446486|SARIMA|44.44%|1.220213|1.420295|62.063813%|
|Vertigo|Sta. Rosa|1.538658|SARIMA|55.56%|0.987003|1.103966|46.304065%|
|Vertigo|Minoyan|2.407498|SARIMA|66.67%|1.184242|1.485914|54.506938%|
|All types of skin disease|Salvacion|1.880035|SARIMA|33.33%|1.205266|1.305399|98.520086%|
|All types of skin disease|Alegria|1.464997|SARIMA|33.33%|1.230534|1.449181|31.892533%|
|All types of skin disease|Blumentritt|1.732722|SARIMA|55.56%|1.138484|1.508986|48.302212%|
|All types of skin disease|Caliban|1.763037|SARIMA|55.56%|1.136797|1.293940|68.142439%|
|All types of skin disease|Cansilayan|1.777097|SARIMA|55.56%|0.879434|0.959096|64.941994%|
|All types of skin disease|Sta. Rosa|1.577954|SARIMA|33.33%|1.544759|1.823192|42.737430%|
|All types of skin disease|Minoyan|1.405728|SARIMA|55.56%|1.068244|1.297308|42.128798%|
