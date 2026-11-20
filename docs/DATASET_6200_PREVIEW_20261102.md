# Browser QA completed — 2 November 2026

Browser control restored after restart. Dedicated Brave tab only; no desktop control. Isolated preview restarted as exec session78154 on loopback8768.

PASS: all70 live Predict selections. browser-70.json DOM outputs independently compared with saved responses and presentation source: all estimates, own accuracy/MAE/RMSE/MAPE, summaries match; each renders a forecast line and recommendations. Influenza/Caliban correctly shows5/9available,4unavailable,100%among5 produced targets; this is not future probability.

Four viewport widths1366x768,1280x720,768x1024,390x844 inspected; page widths fit without horizontal overflow. Light/dark inspected;24-month/full45-month history,chart focus/previous/next and score explanation/Escape tested. Mobile graph,summary and recommendations inspected. Captured console errors/warnings:none. Local HTML/assets/API were already checked overHTTP; this browser API exposes console logs but no complete network trace, so no full HAR/network audit is claimed.

Found and fixed only the isolated preview wrapper's double scrolling: main height:auto and overflow:visible in preview.css. Existing copied application frontend/model/data remain unchanged. Minor decorative icon containers have no icon in the standalone preview (Lucide is not loaded); this does not affect outputs or controls and is not a production defect claim.

Engineering verdict: PASS for isolated preview. Safe to prepare a versioned local promotion with rollback, but replacement still requires user approval. Scientific limitations remain:7scopes below70%,Cough/Sta.Rosa22.22%,3+target hitrate46.34%,nozeromonths,andprior-month naive winsMAE/hitrate. These do not disappear after UIQA.

Evidence: browser-verification.json,browser-70.json,browser-layouts.json,browser-desktop-verified.png,browser-mobile.png,browser-mobile-dark.png,browser-summary-mobile.png,browser-recommendations-mobile.png. Screenshot capture briefly timed out for full-page mode; viewport captures succeeded. Final QA supersedes earlier blocked-browser statements. report.py is the earlier pre-browser report generator; use this addendum for final status.

---
> UPDATE: Browser QA now completed: isolated preview engineering PASS. See BROWSER_QA.md. Earlier blocked-browser statements below are historical. No replacement authorized.

# 6,200-case isolated local integration preview — 2 November 2026

Decision: CONDITIONAL PASS for engineering and evidence consistency. Browser-rendered desktop/mobile QA is BLOCKED; do not promote yet. Statistical superiority is not established. User approval remains required before any permanent replacement.

## Preview

Open http://127.0.0.1:8768/ . No login is needed: this standalone loopback-only preview exposes only non-identifying candidate monthly counts and saved research outputs. It runs the existing Predictions frontend/presentation/action-guidance source, copied byte-for-byte, with the existing CSS assets. It is not a second operational application and does not import the application server, auth, MySQL or Azure. The MHO portal shell/login are outside this preview's tested scope.

Synthetic Seasonal Demonstration — Not Real Disease Data is displayed prominently. Provenance remains visible. 6,108 generated cases plus 92 ITR-derived contributions; this does not represent a verified 50/50 actual/generated split. Validation pending. The lower-noise scenario was constructed after earlier tests were inspected, so these results are exploratory dataset sensitivity, not independent confirmation or algorithm improvement.

## Verified evidence and behavior

- Dataset CSV reconciles exactly with all70 snapshot histories:3,150 monthly records,6,200 cases,January2023–September2026. No case counts changed.
- October2026:70/70 original saved accepted SARIMA estimates and intervals match native evidence. Model fitting/policy unchanged; no retraining performed.
- All70 HTTP selections and140 per-selection protocol metrics independently recalculated using Python Decimal arithmetic. Target/date/prediction/interval/history/denominator checks passed. API result context and source hashes identify6200candidate.
- Primary80/20:563/626=89.9361% within limit;626/630 available,4 unavailable. MAE0.492066,RMSE0.701862,positive-onlyMAPE29.934570%.
- Secondary70/30:866/973=89.0031%;973/980 available,7 unavailable. MAE0.486890,RMSE0.686362,MAPE30.724448%.
- All four primary missing targets belong to Influenza/Caliban:January,May,July,August2026. They remain null; no zero substitution or historical Seasonal Naive fallback. The selected card uses its five available historical predictions. Historical and October availability are different measures.
- Important adapter difference:the installed5592service normally supplies Seasonal Naive on failed historical fits. Only the isolated6200adapter suppresses fallback so that it represents the SARIMA-only research result. Model specification is unchanged. A future integration must explicitly retain this denominator behavior or report the distinct fallback policy's own metrics instead.
- Five automated test cases passed, including280 selected Predict-handler executions (70scopes×4chart widths:300,700,1000,1250px). Actual frontend code generated the SVG history/backtest/forecast lines and intervals; estimate/score/MAE/RMSE/MAPE/method/weak-seasonality warning/summary/recommendation rules matched each response. These are DOM-double tests, not browser layout tests.
- Edge checks:missing forecasts,zero arithmetic/MAPE exclusion,unavailable UI,no invented graph/forecast-dependent actions,network failure/stale-state clearing,invalid selections and tampered copied data. Zero cases here are synthetic test fixtures, not observed candidate evaluation months.
- Existing installed combined-SARIMA/action-guidance regression suite:14tests passed. No new build required; frontend files copied unchanged.
- HTTP checks:all8HTML-referenced assets responded200; private bundle/source paths and unknown API paths denied. Loopback server permits GET only.
- Browser verification attempted twice plus inventory:tool reports Local browser use is disabled in Work settings. Brave opening did not restore it. No screenshots,no browser console/network claim,and no visual responsive/dark-mode pass claimed. A theme switch and responsive page are available for subsequent visual QA.

## Performance limitations

53/70 selections reach80% within the proposed error limit;7/70 are below70%. Cough/Sta.Rosa:2/9=22.22%,MAE1.5763,RMSE1.6583,MAPE28.0830%. Cough/Caliban:4/9=44.44%;Cough/Alegria:5/9=55.56%. No pooled score is copied to individual cards.

Primary1–2case months:525/544=96.51%;3+case months:38/82=46.34%. There are NO zero-case months in this candidate, so zero-month predictive quality cannot be assessed. All counts range1–8. High overall performance is dominated by low counts and the unchanged one-case tolerance. It is not the probability of next-month disease occurrence. Proposed tolerance still requires panel acceptance.

On626identical available primary targets,previous-month naive scores93.61%,MAE0.3674,RMSE0.7391;SARIMA scores89.94%,MAE0.4921,RMSE0.7019. SARIMA improves RMSE but loses on MAE/within-limit. Annual evidence is supported in28/70currentfits;42retain the weak/uncertain-seasonality warning. Nine primary targets per scope give coarse percentages and substantial uncertainty. No claim of all70having good accuracy is warranted.

## Promotion and rollback plan

1. Restore browser connection and visually inspect1366×768,1280×720,768×1024,390×844,light/dark,keyboard/tooltip/chart arrows,especially Influenza/Caliban and worst-performing Cough selections. Confirm console/network health.
2. Owner reviews per-selection results and accepts synthetic scenario limitations; no promotion based solely on pooled89.94%.
3. If separately approved,back up exact active5592service,route,bundle,frontendfiles and hashes;add versioned6200bundle and source-hash validation. PreserveSARIMA-onlymissing-target semantics;do not accidentally report fallback metrics asSARIMA.
4. Activate only local service selection,rerun70API/UIchecks and compare old/newmetadata. Azure requires its own authorization.
5. Rollback by restoring the backed-up service/route selection to combined-sarima-5592,then restart only that local process and verify oldhash,5592cases,70/70and352/630. No database restore is required.

Current rollback: none needed. The installed application was never modified. Stop the preview process (serve.cjs;execsession87791) to closeport8768. To resume,run node serve.cjs from this directory. Never stop an unrelated Node process.

## Complete primary per-selection review

|Disease|Barangay|Available/requested|Within limit|MAE|RMSE|MAPE|
|---|---|---:|---:|---:|---:|---:|
|Cough|Salvacion|9/9|77.78%|0.6231|0.8484|17.83%|
|Cough|Alegria|9/9|55.56%|0.8573|1.0677|16.97%|
|Cough|Blumentritt|9/9|77.78%|0.8656|1.0024|23.63%|
|Cough|Caliban|9/9|44.44%|1.2431|1.4342|22.60%|
|Cough|Cansilayan|9/9|55.56%|1.4044|1.9869|27.30%|
|Cough|Sta. Rosa|9/9|22.22%|1.5763|1.6583|28.08%|
|Cough|Minoyan|9/9|55.56%|0.8149|1.0383|22.80%|
|URTI|Salvacion|9/9|77.78%|0.6690|0.8519|27.23%|
|URTI|Alegria|9/9|100.00%|0.5003|0.5379|33.12%|
|URTI|Blumentritt|9/9|77.78%|0.5794|0.7630|34.82%|
|URTI|Caliban|9/9|88.89%|0.6578|0.9101|35.89%|
|URTI|Cansilayan|9/9|100.00%|0.0020|0.0020|0.10%|
|URTI|Sta. Rosa|9/9|100.00%|0.4057|0.4573|36.69%|
|URTI|Minoyan|9/9|100.00%|0.3432|0.4256|18.92%|
|Infection all types|Salvacion|9/9|77.78%|0.5583|0.6950|41.56%|
|Infection all types|Alegria|9/9|88.89%|0.4072|0.6060|21.81%|
|Infection all types|Blumentritt|9/9|77.78%|0.7837|0.8660|65.94%|
|Infection all types|Caliban|9/9|88.89%|0.5107|0.5956|35.14%|
|Infection all types|Cansilayan|9/9|100.00%|0.3977|0.4490|29.79%|
|Infection all types|Sta. Rosa|9/9|100.00%|0.6168|0.6401|56.72%|
|Infection all types|Minoyan|9/9|100.00%|0.4443|0.5083|36.80%|
|ARI|Salvacion|9/9|100.00%|0.2151|0.3078|18.33%|
|ARI|Alegria|9/9|100.00%|0.3374|0.4271|26.44%|
|ARI|Blumentritt|9/9|100.00%|0.3445|0.4022|23.95%|
|ARI|Caliban|9/9|100.00%|0.3157|0.4049|26.39%|
|ARI|Cansilayan|9/9|77.78%|0.5618|0.8406|31.23%|
|ARI|Sta. Rosa|9/9|100.00%|0.3069|0.4034|21.79%|
|ARI|Minoyan|9/9|88.89%|0.4205|0.7436|22.50%|
|Fever unknown origin|Salvacion|9/9|77.78%|0.5161|0.6981|32.91%|
|Fever unknown origin|Alegria|9/9|100.00%|0.5410|0.6295|48.79%|
|Fever unknown origin|Blumentritt|9/9|100.00%|0.6606|0.6767|60.45%|
|Fever unknown origin|Caliban|9/9|77.78%|0.4097|0.6281|30.65%|
|Fever unknown origin|Cansilayan|9/9|100.00%|0.2585|0.3095|25.85%|
|Fever unknown origin|Sta. Rosa|9/9|100.00%|0.5193|0.6302|44.84%|
|Fever unknown origin|Minoyan|9/9|88.89%|0.6420|0.7052|62.02%|
|Hypertension|Salvacion|9/9|100.00%|0.2773|0.4837|20.84%|
|Hypertension|Alegria|9/9|100.00%|0.4491|0.4967|39.26%|
|Hypertension|Blumentritt|9/9|100.00%|0.1577|0.2012|7.89%|
|Hypertension|Caliban|9/9|88.89%|0.4006|0.5098|32.56%|
|Hypertension|Cansilayan|9/9|100.00%|0.3114|0.3440|15.57%|
|Hypertension|Sta. Rosa|9/9|100.00%|0.3304|0.4178|23.52%|
|Hypertension|Minoyan|9/9|100.00%|0.4773|0.4832|41.46%|
|Influenza|Salvacion|9/9|100.00%|0.3062|0.3834|24.94%|
|Influenza|Alegria|9/9|100.00%|0.2523|0.2657|19.74%|
|Influenza|Blumentritt|9/9|100.00%|0.3276|0.3753|24.22%|
|Influenza|Caliban|5/9|100.00%|0.2660|0.3225|16.32%|
|Influenza|Cansilayan|9/9|100.00%|0.3216|0.4470|20.53%|
|Influenza|Sta. Rosa|9/9|88.89%|0.5023|0.8427|19.52%|
|Influenza|Minoyan|9/9|100.00%|0.3581|0.4746|24.43%|
|Acute Gastroenteritis|Salvacion|9/9|88.89%|0.2721|0.5149|20.27%|
|Acute Gastroenteritis|Alegria|9/9|100.00%|0.3530|0.4279|30.67%|
|Acute Gastroenteritis|Blumentritt|9/9|88.89%|0.5576|0.9269|26.86%|
|Acute Gastroenteritis|Caliban|9/9|100.00%|0.3627|0.4359|28.75%|
|Acute Gastroenteritis|Cansilayan|9/9|88.89%|0.6542|0.7471|58.81%|
|Acute Gastroenteritis|Sta. Rosa|9/9|88.89%|0.4664|0.5647|37.67%|
|Acute Gastroenteritis|Minoyan|9/9|100.00%|0.2130|0.2968|10.65%|
|Vertigo|Salvacion|9/9|100.00%|0.3995|0.4207|19.98%|
|Vertigo|Alegria|9/9|88.89%|0.7481|0.8857|64.13%|
|Vertigo|Blumentritt|9/9|100.00%|0.0297|0.0587|1.48%|
|Vertigo|Caliban|9/9|100.00%|0.4752|0.5012|39.92%|
|Vertigo|Cansilayan|9/9|100.00%|0.5752|0.6382|53.87%|
|Vertigo|Sta. Rosa|9/9|100.00%|0.2941|0.3526|19.10%|
|Vertigo|Minoyan|9/9|100.00%|0.3817|0.4224|26.96%|
|All types of skin disease|Salvacion|9/9|100.00%|0.6083|0.6172|46.77%|
|All types of skin disease|Alegria|9/9|88.89%|0.4095|0.5450|33.73%|
|All types of skin disease|Blumentritt|9/9|66.67%|0.7135|1.2449|20.47%|
|All types of skin disease|Caliban|9/9|77.78%|0.6053|0.7415|43.45%|
|All types of skin disease|Cansilayan|9/9|66.67%|0.6637|0.9546|32.61%|
|All types of skin disease|Sta. Rosa|9/9|100.00%|0.1457|0.1917|7.29%|
|All types of skin disease|Minoyan|9/9|100.00%|0.3676|0.4490|25.23%|

Both protocols:per-selection-audit.json. Full HTTP responses:responses.json. Independent checks:audit.py/audit.json. UI checks:preview.test.cjs. Original evaluation remains in sibling sarima6200-evaluation-20261102.
