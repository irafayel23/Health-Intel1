# Local SARIMA and COM-Poisson integration

CODEX-1 · 9 November 2026 · main/e5946d4

MHO and BHW Predictions now display frozen conditional-pooled COM-Poisson probabilities with the existing SARIMA estimate on the local server. MHO can select all 70 disease and barangay combinations. BHW can select the ten diseases for the barangay assigned to the signed-in account. The dashboard shows the case count and two experimental probabilities beside the history chart. The count distribution, historical performance and automated recommendations have separate sections.

For October 2026, Cough in Salvacion shows 4 estimated cases, 32.27% for exactly 4 and 79.89% for 3–5. The experimental central 80% interval is 2–5 and the central 95% interval is 2–6. The chart identifies the interval source, and the original SARIMA range remains accessible in model details. The 77.78% historical score for this selection comes from 7 of 9 tests within the proposed error limit. The overall historical figure is 563 of 626 available tests, or 89.94%. Four primary historical estimates remain unavailable.

The existing authenticated routes attach a single scope's verified probabilities to the matching saved SARIMA response. The adapter checks package and source hashes, model version, date, scope and unrounded mean. Missing evidence or a mismatch leaves SARIMA available and suppresses COM-Poisson values. The frozen package covers the 6,200-case demonstration through September 2026, targeting October 2026. Newly published operational versions use SARIMA until matching probability evidence is separately verified. Real-world validation requires new MHO-confirmed outcomes.

## Verification

- 32 focused tests passed across the probability adapter, saved SARIMA service, presentation and deployment protections. Tests covered mismatched evidence, role restrictions, missing historical predictions and a zero-mean fixture.
- In an isolated browser fixture, 70 MHO and 70 BHW selections matched the frozen case counts, probabilities and intervals. BHW results were checked across seven test account assignments. MHO historical metrics, charts and the existing recommendation rules also matched.
- The signed-in MHO portal returned the expected Cough/Salvacion values. Monthly Updates and Predictions tab navigation worked. Browser checks covered stale result clearing, flag-off behavior, mismatched results, keyboard access to the probability chart, and the four unavailable historical fits for Influenza/Caliban.
- The signed-in view fit 1366×768, 1280×720, 768×1024 and 390×844 CSS viewports without horizontal page overflow. Live light/dark switching recolored the existing probability chart without changing the selected result. Exact browser zoom levels and a standalone screen reader were outside the verified coverage.
- All 12 installed paths and 473 protected files matched their expected hashes. This includes the frozen research, original datasets and the earlier probability preview. The local change involved no model fitting, database schema or case-data edits, or Azure release.

## Local startup and rollback

The approved local process listens at `http://localhost:3000/` on loopback. It was started with `HOST=127.0.0.1`, `PORT=3000`, `SERVE_FRONTEND=true`, `NODE_ENV=development` and `ENABLE_EXPERIMENTAL_CMP=true`. Set these in the process environment when restarting from the project’s `server` directory with `node server.js`. Production and non-loopback binds leave this flag inactive. The saved SARIMA layout is restored by restarting with `ENABLE_EXPERIMENTAL_CMP=false` and reloading the page.

For a source rollback, compare the 12 paths against the hashes in `state.json`. Only restore matching changed files from `before/` and remove the five matching integration-only additions listed in `workspace.py`. Preserve any subsequent edits. Keep both standalone previews and all prediction evidence.

Verification artifacts, screenshots, checksums and before copies are in `C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-local-integration-20261109`.
