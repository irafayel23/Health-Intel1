# MHO descriptions and concrete prediction actions

1 November 2026 — CODEX-1. Local only; no Azure release.

## Final scope after owner clarification

Municipal Analytics is descriptive only. The former Suggested MHO action is now a factual Recorded-case summary. Existing four findings, explanations, data filters, darker colors and typography are preserved. No disease-action renderer or recommendations are connected to Municipal Analytics. Its legacy `action-text` ID is retained for compatibility and now contains only the descriptive summary. The duplicate hidden full summary is excluded from the accessibility tree.

Predictions alone receives concrete suggested health actions, with an identified responsible role, a reason using the selected saved result and a primary-source link. These are proposals for MHO approval, not automatically executed activities, diagnoses, prescriptions or outbreak declarations. No messages are sent, appointments booked, supplies ordered or staff assigned by the application.

## Transparent action rules

- Finite positive prediction: select a disease-specific action for the selected barangay. No occurrence probability is inferred.
- Cough/URTI/ARI/Influenza: include cough-etiquette and handwashing demonstrations in an already scheduled health activity; check ventilation and hand-hygiene facilities. Cough is not assumed to have an infectious diagnosis.
- Acute Gastroenteritis: safe-water storage, food-handling and handwashing education; refer reported water-quality concerns for sanitation assessment, without claiming the count proves contamination.
- Hypertension: arrange blood-pressure checks within existing activities, check monitor availability and reinforce clinician-directed care and general prevention.
- Vertigo: safe seating, fall-prevention information and access to assessment for persistent/recurrent symptoms.
- Broad skin categories: clinical assessment before condition-specific advice. Fever unknown origin/Infection all types: access to clinician assessment; do not infer a specific pathogen or choose treatment from broad labels.
- Rise/fall/stability uses the existing dashboard rounded-count stability definition. An increase triggers flexible, disease-appropriate readiness suggestions, never an emergency/risk threshold. A decrease keeps existing activities/return advice in place. No assertion that small count changes are clinically significant.
- Exact zero prediction: preserve access to existing services; do not infer no future cases. A positive rounded estimate after a recorded zero receives a zero-versus-missing-report clarification; no undefined percentage change.
- Unavailable result: existing R7 unavailable explanation only; no forecast-dependent disease actions.
- Historical selected metrics, weak-seasonality note, original model configurations, one-month target, values, ranges and source disclosure remain unchanged. The separate generic R6 recommendation card is replaced by the existing dedicated annual-evidence warning; warning semantics remain visible.

These are application rules adapted from the sources below, not WHO/CDC-endorsed Health-Intel triggers. Guidance supports the prevention/assessment content; local action selection, timing and delivery require MHO approval. No arbitrary outbreak thresholds, staffing quantities or medicine doses are introduced. Broad disease categories limit how specific advice can be.

## Sources consulted

- CDC respiratory prevention: https://www.cdc.gov/project-firstline/hcp/infection-control/index.html
- WHO influenza prevention: https://www.who.int/news-room/questions-and-answers/item/how-can-I-avoid-getting-the-flu
- WHO diarrhoeal disease: https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease
- WHO hypertension: https://www.who.int/news-room/fact-sheets/detail/hypertension
- NHS vertigo: https://www.nhs.uk/conditions/Vertigo/
- WHO common skin conditions: https://cdn.who.int/media/docs/default-source/ntds/skin-ntds/common-skin-diseases-for-managemen-or-referral-at-primary-health-care-level.pdf
- WHO surveillance/response: https://www.who.int/emergencies/alert-and-response
- CDC forecast use/uncertainty: https://www.cdc.gov/cfa-behind-the-model/php/data-research/covid-short-term-forecasts.html

## Changed files

- New assets/js/mho/mho-action-guidance.js (pure recommendation policy; no model fitting)
- mho.html (script order/cache versions, descriptions-only summary)
- assets/js/mho/mho-analytics.js and mho-insights.js (descriptive summary only)
- assets/js/mho/sarima-presentation.js (display recommendation selection only)
- assets/js/mho/mho-forecast.js (action/owner/reason/source card renderer)
- assets/css/mho/mho-utilities.css (existing Tailwind build)
- New server/tests/action-guidance.test.js and this report; shared CODEX records updated.

## Verification

73 focused tests passed, zero failed/skipped. New checks cover every study disease, concrete/different actions, rounded stability, rise/fall/zero/unavailable states, non-mutation, correct October target and descriptive-only Analytics. Existing combined/low-count/Balanced presentation tests exercise all70 current selections and historical preserved scopes, checking the selected metrics, graph/summary and recommendation renderer. No model retraining or database fixture writes.

Actual signed-in local MHO UI checked after user renewed the expired session. Analytics shows four descriptions and a factual summary without recommendations. Cough, Hypertension and Acute Gastroenteritis / Salvacion produced distinct action cards after Run Forecast. Cough4 versus previous3, Hypertension2 versus1, and Gastroenteritis1 versus0 were displayed rounded saved results, not new fits. No captured console warnings/errors. Narrow viewport override390x844 (actual433x938 CSSpx at existing user zoom): no page horizontal overflow; cards wrap; override reset. No new complete dark-mode visual audit this task; existing dark utilities preserved and prior contrast tests pass. Existing zoom, fonts and weights unchanged. Local server started on loopback in session74535 because prior server had stopped; left running.

All three frozen combined-bundle files (CSV/snapshot/manifest) match the preserved SHA-256 reference. Model/backend/deploy source unchanged; main/e5946d4 retained. Existing unrelated dirty files/data deletions retained. No Azure/GitHub/database changes.

## Recovery

External checkpoint: mho-action-guidance-20261101/before. Revert only this task's application hunks after checking for newer edits; do not reset the checkout. Restore the backed-up frontend files and previous MHO CSS together if reverting the recommendation feature. New helper/test can be retained as isolated reference if not loaded. Preserve shared append-only history. Screenshots/logs/verification are outside the application. The old analytics-actions.png in this external workspace was an intermediate, superseded by the owner correction; do not present it as final UI.
