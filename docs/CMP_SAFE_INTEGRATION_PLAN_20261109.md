# Safe COM-Poisson integration plan — approval required

9 November 2026 · CODEX-1 · Planning/documentation only. No integration performed.

## Proposed decision

Approve a reversible **local-only, feature-flagged enhancement** of the existing MHO and BHW Predictions views. Preserve their routes, HTML hooks, SARIMA point predictions, historical scores, recommendations and barangay access controls. Use the supplied screenshots as layout references while loading **only frozen disease-specific conditional-pooled COM-Poisson results**, not the earlier original CMP results visible in those screenshots.

SARIMA remains the primary case-count model. COM-Poisson supplies a count probability distribution around its unchanged mean. This is not an ensemble that averages two predicted counts. No models are retrained and no dataset, patient records, database schema or Azure service is changed.

## Inspected current architecture

- `mho.html` and `bhw.html` already share `assets/js/mho/mho-forecast.js`, `sarima-presentation.js` and `mho-action-guidance.js`. Existing presentation handles chart history, unrounded scoring, recommendations, unavailable results and selection request sequencing.
- `server/routes/balanced-sarima-routes.js` uses the saved `seasonal6200-sarima-demo.js` service. MHO can choose 70 scopes. BHW's barangay is resolved from its authenticated assignment on the server; a browser-supplied barangay must never determine the scope.
- BHW currently receives a reduced SARIMA response without the full demonstration provenance. A safe probability attachment needs explicit, non-sensitive source/version metadata as part of that response, without exposing other barangays.
- MHO's Monthly Updates can select operational SARIMA results through separate services. The frozen October demonstration probabilities cannot be reused for those runs.
- The current probability preview is external to the application. Existing all-70 technical QA and frozen policy remain valid; no scientific experiments need repetition for planning. See [integration QA](PREDICTION_INTEGRATION_QA_20261109.md) and [preview QA](CMP_POOLED_PREVIEW_20261107.md).

## Proposed UI

Keep the existing sidebar, header, selection controls, Predict action and Monthly Updates functionality. Preserve the account numbers and role-specific choices. Rearrange the result area in the same view rather than replacing the page or creating another operational application.

| Position | Proposed content |
|---|---|
| Top left | Existing cases-and-prediction chart, selected disease/barangay and history-length control. SARIMA supplies the predicted point. |
| Top right | **Count and probabilities** card: large SARIMA estimated count, then separately labeled experimental probability of exactly N and of max(0,N−1) through N+1. Show model ranges and the selected prediction month. |
| Second row left | **Possible case counts** distribution, with nearby counts highlighted. Hover and keyboard focus expose count/probability; provide an accessible text/table alternative. Retain the small remaining-tail explanation. |
| Second row right | **Historical SARIMA performance** with selected-scope tolerance score, numerator/denominator, unavailable count, MAE, RMSE and positive-actual MAPE. Historical target table and secondary check remain accessible. |
| Below results | Keep **Automated Recommendations**, matching screenshot 3: two readable cards, numbered accents, responsible-team strip and existing MHO-approval label. One column on narrow screens. |

The method badge becomes **SARIMA + COM-Poisson** when a verified probability attachment is available. Its nearby explanation says **Case count: SARIMA · Experimental probabilities: conditional-pooled COM-Poisson**. If probability evidence is unavailable, show SARIMA and a clear probability-unavailable status, not a misleading two-model success badge.

Show **Experimental model estimate** beside the probability section and intervals. Do not call these percentages accuracy or confidence that a particular prediction will happen. Keep a concise mixed-data source/history statement. Do not hard-code the overall **89.94%** into selected-scope cards: that number is 563/626 available historical tests across all scopes; the chosen scope has its own score.

### Interval handling

To match screenshot 1, the chart may show the **experimental conditional-pooled CMP central 95% interval** when the evidence matches. Its legend, tooltip and chart note must explicitly name that source. Keep the existing SARIMA 95% interval separately labeled in model details. Do not overwrite SARIMA's interval fields or imply that the two intervals are identical. If CMP is missing/mismatched, retain the existing SARIMA chart/range and clearly state that CMP probabilities are unavailable.

The ±1 nearby range and central 80%/95% intervals are different summaries. For the approved frozen Cough/Salvacion example: 4 estimated cases; exactly 4 = 32.27%; 3–5 = 79.89%; central 80% = 2–5; central 95% = 2–6. Do not copy the original CMP 38.29%/87.79% or original 3–5 central 80% range from the earlier preview.

### Styling and accessibility

Use the existing blue primary, green/teal secondary, neutral surfaces and red only for failures/destructive actions. Match screenshot spacing and borders without enlarging fonts globally. Scope styles to prediction components. At laptop sizes use two columns; on mobile stack panels with no horizontal page overflow. Test real browser zoom at 80%, 100%, 125% and 200%; allow necessary vertical scrolling rather than clipping content. Support light/dark mode, visible focus, accessible labels, text equivalents for charts and live result announcements. Retain current request-cancellation/sequence protection.

Recommendations keep their existing disease/count-based rules. Do not add new medical recommendations or probability thresholds, or make services/staffing depend on unvalidated percentages. Visual changes only; MHO approval remains explicit.

## Required code changes after approval

1. **Private frozen probability package:** create a small versioned directory under `server/data/` from the already verified conditional preview/frozen October artifacts. Copy exact stored numeric outputs and necessary probability masses; do not fit or retune. Include a manifest binding the dataset, SARIMA snapshot/version, CMP frozen policy/code hashes, probability artifact hash, cutoff, target and scope list. Preserve both prior standalone previews and original evidence.
2. **Read-only adapter:** add a focused service, proposed `server/services/conditional-pooled-cmp.js`, that verifies the package and attaches only the selected record. Existing SARIMA fitting/scoring services stay unchanged. Integrity/normalization checks are validation, not a new probability estimator. Keep mean-parameterized CMP handling consistent with the frozen results; do not treat SARIMA's mean as the ordinary CMP lambda parameter.
3. **Authenticated response attachment:** extend the existing saved-prediction route with an optional, versioned `experimental_probability` object/status. Keep SARIMA fields intact. Prefer a single response containing the selected SARIMA result and its verified probability attachment to prevent separately fetched data from crossing selections. BHW attachment is derived only after the server resolves its assigned barangay. Do not publish the all-70 probability bundle as an unrestricted static asset.
4. **Presentation module:** add a small renderer/validator, proposed `assets/js/mho/cmp-presentation.js`, and extend the existing shared renderer to populate the added cards/distribution/range labels. Use the same code for MHO/BHW; preserve existing HTML IDs and event hooks. New elements get scoped IDs/classes and cache-version updates.
5. **Markup/styles:** additive edits to `mho.html`/`bhw.html`, with existing role stylesheet/Tailwind build sources and their correctly generated assets. Do not build one role's stylesheet from another role's source. The unrelated forms/sidebar remain untouched.
6. **Local feature flag and rollback:** proposed `ENABLE_EXPERIMENTAL_CMP`, default off and refused in production. Enable only on the local application process for acceptance testing; no `.env` edits or production configuration changes. When off, return/render the original SARIMA interface. Back up affected files with hashes before implementation; rollback restores only those exact files or turns the flag off, never resets the dirty checkout or rolls back data.
7. **Focused tests and documentation:** add route/adapter/presentation integration tests using synthetic fixtures and frozen evidence; update shared records. No migrations, imports, installations or changes to model formulas.

Exact filenames may be adjusted to existing module conventions during approved implementation; scope and invariants above remain the same. No application change is authorized by saving this plan.

## Prevent mismatched outputs

Before attaching/displaying probabilities, verify all of:

- Dataset SHA-256 and mode (demonstration versus operational).
- SARIMA snapshot hash, policy hash/version and, for future operational work, exact published run identity.
- Conditional CMP policy identity, source-code freeze hashes and output-file hash; explicitly reject the original CMP variant.
- Selected disease/barangay, history cutoff and target month (target follows cutoff under the registered horizon).
- Unrounded SARIMA mean and rounded count agreement. Compare using the registered numeric tolerance only; never round the mean first to choose an artifact.
- Probability mass validity/total, exact/nearby entries and intervals matching the same stored distribution, with explicit finite/missing statuses.

A mismatch hides the CMP values/interval layer and shows **Probability estimate unavailable for this prediction version**. Valid SARIMA results and historical metrics remain usable. Clear previous probabilities immediately on selection/source changes; never retain another scope's values while loading. Missing data is not zero probability.

**First integration scope:** the saved 6,200-case demonstration through September 2026, predicting October 2026. Newly published operational predictions, later dates or other datasets remain SARIMA-only until a separately verified matching frozen-policy probability packet is available. Supporting automatic probability production for those runs is a future, separately scoped task; this plan does not implement it.

## Acceptance tests after local implementation

| Test | Required pass condition |
|---|---|
| Frozen integrity | No changes to statistical code, datasets, previous previews or original predictions; manifest hashes match. |
| All 70 combinations | For each 10×7 selection, new adapter and DOM values match frozen mean/count/exact/nearby/distribution/intervals and the current SARIMA historical metrics; verify labels and target. |
| Cough/Salvacion anchor | Exactly 4 = 32.27%; 3–5 = 79.89%; 80% 2–5 and 95% 2–6; unchanged SARIMA mean/count. |
| Cough and weak combinations | Explicit checks for Cansilayan, Sta. Rosa, Caliban and the four locally worsened Cough scopes; no preferred-outcome filtering, inflated percentages or changed scores. |
| Missing historical fits | Influenza/Caliban retains Jan/May/Jul/Aug gaps and 5/9 availability; overall 626/630 retained. No zero filling. |
| Current-output failure | In isolated fixtures, missing/nonfinite/negative SARIMA result, invalid distribution, corrupt files, absent probability or failed load produces clear unavailability with no invented values. |
| Zero and formatting | Zero-mean fixture shows its actual point mass and range without a disease-certainty claim. Nonunit values near 1/0 do not round misleadingly to 100%/0%. |
| Binding failures | Independently tamper month, cutoff, dataset/snapshot/policy/hash, variant, mean, scope and interval; reject CMP while preserving valid SARIMA. |
| Request races | Rapid scope/source changes, delayed responses and retries never show stale probabilities for a different scope. |
| BHW authorization | Across seven synthetic assigned-account fixtures, only that barangay's ten diseases can be returned/displayed. Tampered query/body/ID cannot access another barangay; absent assignment and wrong roles fail. No real account changes needed. |
| MHO/source handling | All 70 scopes available; switch to operational/new version and show CMP unavailable rather than reusing October values. Monthly Updates and publication logic unchanged. |
| History versus probability | Selected numerator/denominator/MAE/RMSE/MAPE remain unchanged; historical 89.94% aggregate never described as future probability. |
| Charts and recommendations | Correct scope/history/point and explicitly sourced range; distribution hover/focus works; recommendations retain current rules and MHO approval. |
| Responsive/accessibility | Desktop/laptop/tablet/mobile and 80/100/125/200% zoom, light/dark, keyboard and targeted screen-reader checks pass without clipped controls or horizontal page overflow. |
| Regression/rollback | Flag off restores existing page; current SARIMA unavailable behavior, account/session protection, tab navigation and assigned scope still work. No database-writing or live Azure tests. |

Reuse existing distribution mathematics/numerical QA and historical research. Test the newly introduced application integration thoroughly; do not refit models or repeat completed scientific experiments to claim fresh accuracy.

## Risks and approval

Remaining statistical limitations are unchanged: sudden increases, Cough calibration, no zero months in demonstration history, small overlapping historical samples and unavailable fits. Local integration can present correct numbers, but cannot establish real-world probability reliability. No labels should suggest otherwise. See the [MHO validation checklist](CMP_MHO_VALIDATION_CHECKLIST_20261107.md) for genuine future evidence.

Approve this concrete scope before implementation:

1. The screenshot-based layout and **SARIMA + COM-Poisson** badge with the experimental/method explanation above.
2. Local MHO and BHW enhancements, preserving BHW barangay restrictions and the existing Predictions page behind an off-by-default feature flag.
3. Read-only authenticated adapter and private frozen **conditional-pooled** outputs for the matching October demonstration version only.
4. Clearly sourced CMP chart intervals, separately retained SARIMA ranges, unchanged historical metrics and existing recommendations.
5. The acceptance/rollback plan. No model, dataset, MySQL or Azure changes, retraining, automatic future-month probability generation or deployment.

This is a plan for approval, not an integration completion report. No new application tests are claimed as run during planning.
