# Health-Intel project context

Last reviewed: 30 September 2026. This is a handoff for a fresh Codex thread, not a claim that the system is ready for production or that its reports are official forms.

## Where to work and what to trust

- **Active repository:** `C:\Users\User\Downloads\Final proj\proposal`; GitHub: `https://github.com/irafayel23/Health-Intel1` (`main`). At this review, the latest existing commit was `44a94c9` (`Show High Risk case categories on both heatmaps`). Sibling folders such as `health-intel-structure` and `health-intel-css-cleanup` are not the active application checkout.
- Start with this file, then `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SETUP.md`, and the implementation. `analysis/qa_20260927/QA_REPORT.txt` is the original **pre-fix** review: many findings were subsequently fixed. `docs/CHANGELOG.md`, `docs/TODO.md`, and older defense/model notes contain prototype-era statements; verify them against current code before acting.
- The project is an **academic prototype** for seven configured Murcia barangays: Blumentritt, Salvacion, Minoyan, Caliban, Cansilayan, Alegria, and Sta. Rosa. Historical data provenance and reporting completeness have not been established. Do not describe current forecasts as validated predictions, map circles as outbreak boundaries, or generated PDFs as approved government forms.
- Do not put patient identifiers, passwords, `.env` contents, JWTs, Google tokens, or SMTP credentials in this file, commits, screenshots, or a new chat. The user wants predictive-data/model work deferred until the remaining reviewed data arrives.

## Architecture and code layout

| Layer | Current implementation |
|---|---|
| Browser | `index.html` is the connected login, Google-verified registration, and password-recovery gateway. `bhw.html`, `mho.html`, `admin.html`, and `superadmin.html` are connected role portals. `register.html` and `municipal.html` are disconnected/legacy prototypes; there is no connected Mayor role. |
| UI assets | `assets/css/` contains page/shared styles; `assets/js/` contains shared session, date, safe-text, map, walk-in, insight, and correction logic plus page-specific scripts (`index-page.js`, `bhw-*.js`, `mho-*.js`, `admin-page.js`, `superadmin-page.js`). The connected pages load those scripts in their original order. Tailwind configuration and the small MHO icon initializer remain inline; Tailwind loads from a CDN, with no frontend CLI/build pipeline. Chart.js, Leaflet, SweetAlert2, map tiles, and Firebase/Google also have network dependencies. |
| API | `server/server.js` is the short Express entry point (`npm start`, default port 3000): it configures the pool, access control, and route registration. Routes live in `auth-routes.js`, `identity-routes.js`, `case-routes.js`, `analytics-routes.js`, `mho-reports.js`, and `backup-routes.js`. Existing helpers remain beside them: `access-control.js`, `qa-fixes.js`, `case-corrections.js`, `patient-validation.js`, `mho-analytics.js`, `report-periods.js`, `database-backup.js`, `password-recovery.js`, `firebase-verification.js`, and `security-config.js`. |
| Authentication | Bcrypt password hashes; signed JWT bearer sessions through `assets/js/api-session.js`; backend checks the account's current role/status and password-derived session version on protected requests. BHW case/resident actions are confined to their assigned barangay. Google Firebase ID tokens are verified server-side for onboarding; registration remains pending until approval. |
| Persistence | MySQL-compatible `health_intel` database, normally local XAMPP. PDFKit produces report PDFs. Nodemailer uses private SMTP settings for approval/recovery mail. Superadmin backup is an encrypted ZIP containing a SQL dump. |
| Prediction bridge | `/api/predict` starts `server/analytics.py` as a child process. That Python script reads MySQL directly. `server/prepare-forecast-data.js` is a separate read-only preparation/review tool and does **not** feed the live model yet. |

## Active database shape

Eight tables are documented in `docs/DATABASE.md`:

| Table | Purpose / important relationship |
|---|---|
| `barangays` | Seven configured names and **barangay-centroid** latitude/longitude for map summaries. |
| `users` | System ID, role (`bhw`, `mho`, `admin`, `superadmin`), approval status, password hash, optional barangay assignment and email. Normalized-email uniqueness is enforced by a generated key/index. |
| `residents` | Resident profile, birthdate, names, purok and barangay. New cases can link to a resident; many historical cases have no reviewed link. |
| `health_cases` | Case date, disease text, severity, status, barangay, purok, resident link, encoder, notes and archive fields. New BHW/MHO cases use explicit date/severity and transactional resident linking plus audit. Archived history can still appear in explicitly historical reports. |
| `disease_registry` | Admin-managed category names, classification/category and archive state; normalized-name uniqueness includes archived names. Historical case strings are **not** automatically renamed or converted to foreign keys. |
| `password_resets` | Hashed/HMAC-protected one-time recovery codes with expiry and attempt tracking. |
| `system_audit_logs` | Application-level action history, including status, archive/restore and reviewed case corrections; it is **not** an immutable ledger. |
| `predictions` | Present in schema but **not populated** by the live forecast endpoint. |

The map uses `barangays` coordinates, not exact patient locations. The case table has no case-level latitude/longitude, normalized `disease_id`, or real/synthetic provenance field. `barangay_id` and `purok` already exist separately in current cases, despite older TODO wording. Do not add migrations merely because a stale checklist says to; first review sources, data effects, and the presentation scope.

## Predictive model: implemented versus pending

- The current Python fit is `statsmodels` SARIMAX with nonseasonal `order=(1,0,0)`—an **AR(1) demonstration**, not a validated seasonal SARIMA model. It aggregates monthly disease counts, uses an 80/20 chronological split internally, produces three future monthly estimates, then allocates the municipal estimate to a barangay by historical case share. The API reports `validation_status: pending`; it does not return an honest tested accuracy figure.
- The live script currently reindexes from January 2023 through the current month and fills missing months with zero. That can confuse absent/incomplete reports with true zero cases; the current month can be partial. It queries MySQL itself and does not persist results to `predictions`. Its `status != 'Archived'` condition does not implement case `is_archived` filtering because `Archived` is not a case status. Historical inclusion policy needs review.
- `npm run data:review` and `npm run data:prepare` create separate provenance/coverage/alias-review outputs without changing patient rows or model inputs. They preserve missing-report gaps for review and distinguish user-declared real, synthetic and unverified sources. Their readiness checks do not prove authenticity or model accuracy.
- **User decision:** postpone data reconciliation, model choice, backtesting, accuracy metrics, and model replacement until the remaining real/reviewed data is supplied. Keep the demo label and avoid invented accuracy claims meanwhile.

## Changes already made and verified

- Backend and integration tests were consolidated under `server/`; page styles were moved into `assets/css/`; BHW table actions were made more readable. Those earlier structure commits are already in `main`.
- On 30 September, the connected pages' large inline scripts were extracted to `assets/js/` without changing their contents or load order. API routes were moved from the monolithic `server/server.js` to six route modules, while the entry point retains pool and access-control setup. Work began on branch `refactor/code-structure-20260930` from clean `main` commit `24761c6`; switching back to `main` is the rollback path after committing the refactor branch. All 49 backend/integration tests pass after both moves, including report PDFs and all four roles.
- Role workflows now include Google-verified pending registration and approval, password reset/change, account suspension, audit views, encrypted backup, BHW patient/resident management, audited case correction, MHO walk-in encoding, and Admin disease registry. A real inbox password-reset code and login with the changed password were confirmed by the user in this chat; that does not prove all email providers/deployments.
- The shared `assets/js/health-map.js` drives BHW and MHO barangay maps. Both show aggregate active, non-archived totals and severity color, refresh on view/changes/interval with a manual Refresh control, and display counted High Risk disease/case categories without patient names. High Risk is an entered **case severity**, not a clinical rating of the disease.
- On 29 September, live-browser QA showed Caliban's one active High Risk case as `Vertigo (1)` in **both** BHW and MHO popups, in light and dark modes. Walk-in and report navigation also loaded.
- On 29 September, an **isolated database clone** was used for a synthetic MHO walk-in. The case appeared in the assigned Blumentritt BHW list/dashboard; both maps changed from two to three active cases and displayed `ARI (1)` under High Risk. September FHSIS and ISO Week 40 PIDSR PDFs both contained the synthetic case and rendered clearly. The disposable database and test servers were removed; a read-only check found no synthetic QA case in the source database. Sample PDFs remain locally in `analysis/qa_walkin_20260929/` and are **not** live reports; `analysis/` is ignored by Git.
- The working Git tree was clean after that QA session. The 30 September structure work is isolated on branch `refactor/code-structure-20260930`.
- The full `npm test` suite was rerun on 29 September with MySQL running: **49 passed, 0 failed**. Its database tests use disposable clones and mocked email; this does not replace live delivery, official-form, accessibility, or deployment checks.

## Open issues and practical limits

1. **Report authority/semantics:** The generated FHSIS PDF currently carries a Department of Health-style header and a certification that data is “true and correct.” That is misleading for sample/unverified data unless the responsible MHO reviews and signs off. The FHSIS/PIDSR layouts, fields, calendar, disease classifications and official submission status still need MHO validation. Unmatched historical disease names can display as `Unclassified`. PDF download/render success alone is not official-form compliance.
2. **Historical data quality:** Legacy cases include unreviewed resident links, disease-name mismatches, uncertain source/provenance and possible reporting gaps. Do not auto-link people, rewrite names, or infer true zero counts. This is the main blocker for trustworthy forecasting and some report interpretation.
3. **Forecast demonstration limits:** Missing months become zero in the live model, current periods may be partial, seasonal fit/backtests/MAE or RMSE are not implemented, and the predictions table is unused. This is explicitly deferred per the user decision above.
4. **Prototype/deployment limits:** `register.html` and `municipal.html` are not connected role flows. Browser libraries/maps/Firebase and Google certificate verification need internet. HTTPS, hosting, backup restoration in the target environment, all device sizes, and municipal-scale load have not been fully demonstrated.
5. **Schema improvements are proposals, not urgent fixes:** Case-level geolocation, normalized disease foreign keys, consolidated name fields, provenance, and forecast metadata would require reviewed migrations. Existing `barangay_id` plus `purok` already separate assignment and local zone for new cases.

## Recommended next steps

1. For a presentation, keep the stable app and rehearse the exact role sequence with clearly labeled disposable data. Confirm the normal API/frontend/MySQL are running, then show BHW recording, MHO walk-in, map changes, reports, Admin approval/audit, and Superadmin backup. Use a disposable clone for any test writes; do not leave fictional patients in the real database.
2. Before showing report PDFs as official, ask the MHO to check actual FHSIS/PIDSR requirements and the generated scope/wording. If approval is absent, label the exports visibly as **academic sample / not for official submission** and remove or qualify the certification statement.
3. Address remaining data and predictive work **after** the user obtains the remaining reviewed dataset: source inventory and provenance; reporting coverage and category aliases; then chronological baselines/backtests and error metrics; then model selection/integration and prediction-history schema if warranted.
4. On another machine or after code changes, follow `docs/SETUP.md`; run `npm test` from `server/` with MySQL running. Integration tests restore source data into temporary databases, mock email, and compare source fingerprints. For live demo, separately check real inbox delivery and browser behavior. Avoid running tests with shared production DB credentials.

## Quick start for a fresh thread

1. Open this checkout at `C:\Users\User\Downloads\Final proj\proposal` and read this file plus `docs/SETUP.md`.
2. Start MySQL/XAMPP. In `proposal/server`, run `npm ci` only if dependencies are missing, then `npm start` (not `npm start` from the repository root). Start a frontend static server from `proposal` and open `index.html`; normal API origin is `http://localhost:3000`.
3. Keep `server/.env`, `server/.local-jwt-secret`, `server/.venv/`, `server/node_modules/`, local `analysis/`, and private database backups out of Git. Never paste credentials into chat. `server/.env.example` lists required keys without secrets.
4. Before editing, inspect `git status`, the current implementation, and newer user instructions. Preserve the user's deferral of predictive data/model work. Confirm whether a new request concerns the active connected portal or an old prototype page.
