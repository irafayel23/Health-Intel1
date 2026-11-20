# Revised seasonal scenario and Predict wording

Completed 2 November2026, CODEX-1. User authorized local Predict wording and a revised generated dataset scenario. Existing installed predictions and all original data/evidence preserved.

## Delivered changes

Local mho.html and assets/js/mho/mho-forecast.js now say Predict in initial, selection-changed and post-request button states. HTML ID/onclick, fetch route, model settings, scores and values are unchanged. Cache version updated. No Azure change.

New candidate CSV scenario:5592cases,3150monthly rows,45months Jan2023-Sep2026,10original diseases/7original barangays. Generated component5500cases split2750/2750;92ITR-derived entries retain their exact month/disease/barangay contributions. Each70history cumulative total preserved. This is a new sensitivity scenario, not an algorithm improvement or a verified50/50 actual/generated dataset.

Rules and seed2026110201 were frozen before a single generation. Expected count weights use disease-specific annual profiles, modest correlated log variation and occasional1.5x shocks; counts use fixed-budget largest-remainder allocation instead of the old multinomial draw. This greatly reduces observation noise. The output has0zero cells and maximum7cases per monthly disease/barangay cell. It is an easier, regularized synthetic scenario and must not be presented as realistic observed incidence. No redraw after these properties were inspected. Broad categories do not receive forced strong seasonality. All seasonal profiles are assumptions, not measured Murcia peaks.

No SARIMA fitting or accuracy evaluation has been run on this candidate. It is not connected to Predictions. Activating changed counts with the old saved models/metrics would be incorrect; first run the existing policy on the candidate and produce its own historical/current outputs. Do not assign55.87% or86.17% to this scenario. Genuine-data validation pending.

## Review of the supplied explanation

The requested reference describes seasonal AR/MA lags, differencing and constants; it does not prescribe disease-specific orders or guarantee accuracy. MA terms use past errors, not advance knowledge of unexpected outbreaks. https://openforecast.org/adam/seasonal-arima.html

Corrections:36months contain3annual cycles but are not a universal minimum guaranteeing reliable estimation. d/D address stationarity, not proven demographic causes. Do not force D=1/Q=1 for a disease name. ADF alone is not a seasonal-order procedure. log1p is a candidate transformation, not a structural-zero fix; exponentiating its mean does not generally recover the count mean without adjustment. Missing reports must not automatically become zero. Compare orders with compatible likelihoods and train-only decisions. References: https://otexts.com/fpp3/arima.html and https://otexts.com/fpp3/toolbox.html

Use primary36/9 expanding one-step evaluation and separate31/14. At each historical target, use only earlier observations, including already observed earlier test months. This is not a single nine-step prediction from December2025. Refit all45months only for October2026 one-step output. Dengue, typhoid and leptospirosis examples in the pasted text are outside the installed ten disease selections; none was added.

## Monthly operational update plan (not implemented)

Staff encode cases and consultations in MySQL. Build monthly NEW-disease-case counts per disease/barangay; return consultations do not create additional cases. MHO confirms reporting completeness. Fit updated histories offline, verify numerical checks and own historical metrics, then atomically activate a versioned result bundle with rollback. After September closes, predict October; after October closes, predict November. Partial-month updating needs a separately evaluated nowcasting method. Current saved results remain through September2026.

## Checks and rollback

Nine existing combined-SARIMA tests pass, including all70 frontend selections and their own saved estimates, metrics, charts, summaries, actions and scope restrictions. JS syntax passes. Exact before/after comparison permits only requested wording and cache version. Independent Python verifies4CSVtables,3150unique cells each, nonnegative integers, exact totals2750/2750/92/5592 and every original70history cumulative total.267protected existingfiles unchanged (the other2are authorized HTML/JS label edits). No fresh browser visual check was made.

Rollback only the label/cache changes using the external before copies or reverse the exact replacements. Do not restore unrelated whole-repository state. Candidate files are separate and need no active-data rollback. Original source datasets, current snapshot, model/evaluation code, MySQL and Azure remain unchanged.
