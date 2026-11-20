# Conditional-pooled COM-Poisson local preview

7 November 2026 · CODEX-1 · Ready for owner review at http://127.0.0.1:8771/

This separate loopback preview displays the frozen conditional-pooled policy with the unchanged SARIMA point predictions. Previous preview and research artifacts remain preserved. The running Health-Intel website is separate.

## Actual checks completed

- Frozen POLICY.md and research.py match freeze.json. October CSV and matched target CSV match the preserved research manifest.
- All 70 frozen October means, dispersions, rounded counts, exact probabilities and nearby probabilities checked. Mean parametrization and distributions independently reconstructed with the existing preview mathematics. No dispersion optimization or SARIMA fitting ran.
- All 70 selections exercised through real Brave dropdown actions and Predict clicks. Saved browser text matches the frozen CSV and every selected SARIMA metric. All graph scopes, distribution bars, 80%/95% interval labels and historical row counts checked. Source ranges were recomputed from each new conditional distribution.
- Cough / Salvacion displays 4 cases, 32.27% exactly 4 and 79.89% for 3–5. Its 80% model interval is 2–5 and 95% interval is 2–6. The 77.78% historical within-limit score, MAE .62, RMSE .85 and MAPE 17.83% are displayed separately.
- Four unavailable primary Influenza / Caliban predictions remain visibly unavailable in historical rows and gaps in the graph. Conditional probability evidence availability is 626/630 primary and 626/980 secondary. SARIMA point metrics retain their own denominators, including 973/980 secondary.
- Ten Node tests passed. Tests include all selected metrics against the existing application service, saved browser results, new intervals, missing/nonfinite means, bad distributions, zero mean, honest near-certainty formatting, historical gaps, loopback server write/source/Host rejection and failed-load/invalid-bundle alert rendering. Four Python boundary tests passed.
- Actual responsive checks at 1366×768, 1280×720, 768×1024 and 390×844. No horizontal overflow. Mobile light/dark screenshots saved and desktop inspected. Native keyboard arrows, Tab, Enter on Predict and a disclosure worked. The 45-month history option drew 45 recorded points. No warning/error logs captured in the successful browser checks. The initial browser visit before bundle generation displayed its expected missing-evidence alert and recovered on reload.
- Post-test fingerprints matched 3,461 existing application, old preview and research files. No patient/database activity, model fitting, dataset changes, production installation or Azure actions.

## Files and reproduction

This directory contains index.html, preview.css, preview.js, data.json, logo.png, serve.cjs, build.py, verify.py, preview.test.cjs and test_math.py, plus JSON/log/screenshot evidence. It reuses the preserved older builder's probability functions and frozen original research snapshot to check histories and compute selected point metrics. Both evidence directories must remain available.

From this directory, run the existing research Python with `-X utf8 -B build.py` to reproduce data and `-m unittest test_math.py` for boundary checks. Run `node --test preview.test.cjs` for the Node checks. Browser evidence is saved in browser-selections.json and browser-controls.json. Run the same Python with `verify.py` to compare browser text with the frozen CSV and check preservation fingerprints. `node serve.cjs` starts the preview on loopback port 8771. No dependencies were installed.

To stop the preview, stop only the process recorded in server.pid after checking it still belongs to this directory. Application rollback is unnecessary. Keep the old original-CMP preview on its own port 8770.

## Limits

This is an experimental synthetic-data preview. Computation and display tests do not establish real-world calibration. The longer protocol's matched probability targets repeat the primary months. No genuine zero months or new prospective outcomes were evaluated. Cough retains weaker calibration. No full screen-reader audit was performed. Missing current probabilities hide the result and raise an alert rather than substituting an older probability or zero. A standalone preview has no patient authentication because it reads only frozen demonstration artifacts and binds to loopback.
