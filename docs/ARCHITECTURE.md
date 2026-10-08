# Current architecture

Deployment preparation adds `server/config/deployment-config.js` before route registration: production setting validation, limited origins, optional public-page/asset serving and a minimal liveness endpoint. It does not expose the repository root. `server/scripts/check-deployment.js` checks settings/tools without DB access. See `deployment_guide.md` and `MHO_REPORT_REVIEW.md` for target-specific acceptance and report approval boundaries.

Verified against the active implementation on 1 October 2026.

## Browser

The role portals use HTML, Tailwind, vanilla JavaScript and section navigation. Connected pages load feature scripts from role folders under `assets/js/`, alongside helpers in `assets/js/shared/`. Styles use role folders and `assets/css/shared/`; Tailwind configuration remains inline. Chart.js draws descriptive and forecast charts; Leaflet shows barangay summaries. `assets/js/shared/api-session.js` attaches the stored JWT only to the configured API and handles session expiry. MHO reports use backend PDFKit; BHW reports use scoped API data and browser PDF generation.

The four portals also load `portal-navigation.js` after their role scripts and `portal-responsive.css` after their role styles. At widths up to 900px they provide an accessible overlay navigation drawer, full-width content and local table scrolling. Desktop collapse handlers remain role-owned. See [verified layouts and device-testing limits](RESPONSIVE_LAYOUT.md).

## Application

`server/server.js` configures the Express app, database pool, and access-control middleware, then registers the modules in `server/routes/`. `server/middleware/access-control.js` checks database role/status on protected requests and enforces BHW barangay scope. Tokens contain a password-hash-derived session version; resetting or changing a password revokes older tokens. Public onboarding/recovery endpoints still require their own validation and rate limits.

`server/services/password-recovery.js` implements transaction-protected, hashed OTP recovery. `server/config/security-config.js` reads private environment configuration and handles email. Approval and mail delivery are separate outcomes. `server/services/patient-validation.js` validates explicit case date, severity and age; case creation links a resident and audit action in one transaction and blocks possible same-person/same-disease/same-date duplicates.

`server/services/system-audit.js` writes fixed, redacted event metadata and normalizes saved references/outcomes for Superadmin. The Admin Operational Audit Trail excludes Superadmin and the new login/password/report-export event types through `account-directory.js`; Master Ledger retains all roles, including Superadmin. Password changes/resets commit their audit writes in the same transaction. Login success requires an audit write before issuing its response. `report-export.js` supplies assigned-barangay `/api/bhw/report-data` and MHO report preparation/failure auditing. Export events distinguish server preparation/data release from unverified browser file saving. Filters and read-only event inspection live in `assets/js/superadmin/superadmin-ledger.js`. See [coverage, limits and recovery](AUDIT_LEDGER.md).

The MHO Walk-in Patients page can create a case for a resident of one of the configured barangays through a separate MHO-only endpoint. It reuses BHW case validation and resident linking, attributes the case and audit entry to the signed-in MHO, and shows that MHO's recent entries. MHO cannot use BHW patient-editing routes; BHW records remain restricted to their assigned barangay.

`server/services/mho-analytics.js` supplies year/age/barangay filtering. GIS colors summarize the highest recorded severity among active cases; they do not establish outbreak status. The map's explanation panel stays within the visible map area. Forecast summaries and rules-based planning suggestions appear below the chart; these are not independent clinical or AI-generated decisions.

## Folder layout and recovery

```text
proposal/
  admin.html, bhw.html, mho.html, index.html, superadmin.html
  assets/
    css/
      admin/, bhw/, index/, mho/, superadmin/ # Page-specific styles
      shared/        # Common portal theme, dialogs, maps and encoding controls
    js/
      admin/         # Shell, accounts, records, registry, audit
      bhw/           # Shell, cases, residents, dashboard, startup, dialogs
      mho/           # Analytics, forecast UI, reports, walk-ins, review, account
      index/         # Firebase, screens, recovery, registration, login
      superadmin/    # Shell, health, users, ledger, backup, startup
      shared/        # API sessions, dates, text, maps, corrections, encoding
    img/             # Existing images
  legacy/
    README.md        # Archive inventory, limitations and recovery
    prototypes/      # Disconnected registration, municipal and approval fragments
    assets/css/      # Unused older styles and prototype styles
    assets/js/vendor/ # Unused local libraries; active pages still use CDNs
  server/
    server.js        # Entry point: npm start
    config/          # Environment and email configuration
    middleware/      # Authentication and role/barangay access
    routes/          # HTTP endpoints and report delivery
    services/        # Validation, case/account operations and backups
    scripts/         # Explicit maintenance/data-review commands
    data/            # Existing CSV files; not automatically imported
    tests/           # Disposable database integration and UI checks
    analytics.py     # Unchanged demonstration model
    package.json, package-lock.json, requirements.txt
    .env, .local-jwt-secret, .venv/, node_modules/  # Private/ignored
  docs/
  datasets/
  analysis/          # Local QA output; ignored
  PROJECT_CONTEXT.md
```

Admin scripts are classic scripts loaded in shell → users → records → registry → audit order. Their existing globals keep HTML event handlers and cross-feature calls working. Load all five scripts when testing the Admin page; `DOMContentLoaded` initializes views after loading finishes. No framework or frontend build step was added.

The local tag `pre-folder-structure-20260930` points to tested commit `1ce6193`, before the Admin split and backend moves. The completed folder refactor is tagged `folder-structure-20260930`. To undo only these two structure commits while keeping the resident/map/audit fixes, first preserve any newer work, then run from the repository root:

```text
git revert --no-edit folder-structure-20260930 b58df60
```

This creates reversal commits; it does not restore a database, erase saved patients, or replace private configuration. Review conflicts if later work changed the same files. Restart the backend and refresh browser tabs after either refactoring or reverting. These tags and commits are local until pushed.

### Portal feature scripts (1 October)

The remaining large BHW, MHO, access-page and Superadmin scripts are separated by feature. The HTML pages remain at the repository root; the later asset-layout checkpoint groups these feature scripts under `assets/js/<role>/`, retaining their role-prefixed filenames. API URLs, HTML IDs, inline event handlers and extracted function bodies are preserved. Shared helpers remain separate from page behavior.

Load these classic scripts in the order used by their HTML; do not add `async` or load a feature alone. Page-wide lexical state and existing global functions still connect the features. BHW startup follows its records, residents and dashboard declarations, so its direct resident-refresh event registration has a defined function to register.

| Page | Page-specific script order |
|---|---|
| BHW | `bhw-shell.js` → `bhw-records.js` → `bhw-residents.js` → `bhw-dashboard.js` → `bhw-startup.js` → `bhw-dialogs.js`; shared `health-map.js` follows. |
| MHO | `mho-insights.js` → `mho-walkins.js` → `mho-disease-review.js` → `mho-shell.js` → `mho-forecast.js` → `mho-analytics.js` → `mho-reports.js` → `mho-account.js`. |
| Access / login | `index-firebase.js` → `index-shell.js` → `index-recovery.js` → `index-registration.js` → `index-login.js`. Firebase compatibility libraries load first. |
| Superadmin | `superadmin-shell.js` → `superadmin-health.js` → `superadmin-users.js` → `superadmin-ledger.js` → `superadmin-backup.js` → `superadmin-startup.js`. |

`index-page.js`, `mho-page.js` and `superadmin-page.js` are retired. `bhw-records.js` now owns only case state/table/actions; resident dossiers and dashboard logic have their own files. The unused `healthDatabase` sample-data literal was removed from the former MHO script after confirming it had no references. Live descriptive charts continue to read the same API endpoints. Forecast code was moved without changing its behavior; `analytics.py` and its data were not edited.

The full suite passed **67 checks** after this refactor, including actual-HTML script order, startup/active hooks, cross-feature resident refresh, mocked Google verification/registration/login/recovery, MHO filters/report downloads and Superadmin ledger/backup behavior. A source-block comparison verified that all extracted code was retained apart from trailing-whitespace cleanup. Backend integration tests again confirmed unchanged source database fingerprints. These are automated checks, not a new visual browser or real SMTP verification.

Recovery checkpoint `pre-portal-structure-20261001` points to `34f3fc2`, which already includes disease review. The completed refactor is tagged `portal-structure-20261001`. To reverse only this refactor while keeping disease review and previous work, preserve newer changes and run from the repository root:

```text
git revert --no-edit portal-structure-20261001
```

Then refresh the role/login tabs. Backend startup remains `npm start` from `server/`. No schema migration or database restore is needed for this code-only rollback. Local source/HTML copies are also retained in ignored `analysis/portal-structure-20261001/`; the Git checkpoint is the recovery path intended for another checkout.

### Asset folders (1 October)

All 52 existing script/style files were moved into the folders above, with their byte hashes preserved. The six pages with local references now use the new paths; HTML hooks, script order and behavior remain unchanged. `register.html` has no affected local references. Tests and current documentation follow the new paths. `server/tests/helpers/frontend-assets.js` resolves moved scripts for the frontend test harnesses. The full suite passed **68 checks**, including local script/style/image references on every connected and prototype page; source database fingerprints again remained unchanged.

The shared `mho.css` is the existing base theme used by both MHO and Admin, so it lives in `assets/css/shared/`. At this checkpoint, older styles were preserved in `assets/css/legacy/` and local Chart.js/Lucide copies in `assets/js/vendor/`. The subsequent legacy cleanup moves those unused files into the separate root `legacy/` archive. Connected pages retain their existing CDN library loads. These moves do not switch library versions or establish offline operation.

Checkpoint `pre-assets-layout-20261001` preserves `053e3d7`, after the feature split. The completed folder move is tagged `assets-layout-20261001`. To undo only this latest folder move, preserve newer changes and run from `proposal`:

```text
git revert --no-edit assets-layout-20261001
```

To undo both 1 October structure checkpoints, reverse the newer folder move first:

```text
git revert --no-edit assets-layout-20261001 portal-structure-20261001
```

Refresh browser tabs afterward. No database rollback or dependency reinstall is required. These checkpoints are local until pushed; ignored path/hash manifests and previous reference files are in `analysis/assets-layout-20261001/`.

### Backend service responsibilities (1 October)

The mixed `server/services/qa-fixes.js` is retired. Route modules now construct the focused handlers they use, rather than receiving a shared object containing unrelated operations. The entry point still owns the database pool and access-control middleware.

| Service | Responsibility |
|---|---|
| `registration.js` | System ID allocation, Google-verified email checking and pending-account registration. |
| `account-status.js` | Account approval, suspension, denial and restoration with transactional audit logging. |
| `disease-registry.js` | Catalog creation and its archive/restore handlers. |
| `case-lifecycle.js` | Case status/follow-up updates and case archive/restore handlers. |
| `record-archive.js` | Shared transactional archive/restore implementation; callers supply fixed internal table names. |
| `database-transaction.js` | Connection ownership, commit/rollback and database-specific named locks. |
| `service-errors.js` | Shared text validation and safe API error responses. |

Existing correction, classification/review and report modules import these helpers directly. All 15 extracted handler/helper function bodies match the previous implementation exactly; all 26 active backend JavaScript files pass syntax checks. The full suite passed **68 tests, 0 failures**, including registration concurrency, failed-audit rollback, role/barangay restrictions, status remarks and disease review. Source database fingerprints were unchanged. API routes, limiter placement, SQL, response text and private configuration were preserved. No schema migration, model/data change or new browser/mail verification was performed.

At this checkpoint, case creation and several database queries still lived in route modules. The subsequent route-services checkpoint below completes that extraction.

Recovery checkpoint `pre-backend-services-20261001` preserves `c65fb4b`. The completed service split is tagged `backend-services-20261001`. To reverse only this step, preserve newer work and run from `proposal`:

```text
git revert --no-edit backend-services-20261001
```

Restart the backend with `npm start` from `server/` after updating or reverting. No database rollback or dependency reinstall is required. The checkpoint is local until pushed. Original files and the extraction verification script are retained in ignored `analysis/backend-services-20261001/`. The test filename `qa-fixes.test.js` remains as the existing regression suite; it no longer denotes an active service module.

### Database operations behind routes (1 October)

All seven route modules now delegate database queries and transactions to services. They retain HTTP input validation, status/error responses, rate limiters, email outcomes, report streaming and Python process handling. The entry point and access-control middleware keep their existing pool and authorization responsibilities.

| Service | Database responsibility |
|---|---|
| `case-encoding.js` | Save a BHW/MHO case, reuse or create its resident profile, and write its explicit audit reference atomically. |
| `case-records.js` | Encoding choices, assigned context/puroks, recent walk-ins, current/archived cases, resident dossiers and explicit case history. |
| `case-map-data.js` | Existing monthly trend and barangay severity/disease aggregates. |
| `account-credentials.js` | Account lookup and password-hash persistence; existing bcrypt/JWT rules remain in the auth route. |
| `account-directory.js` | Staff directories, Admin/Superadmin audit reads and database health counts. |
| `dashboard-data.js` | Existing dashboard, demographic, KPI/year comparison/mortality queries and forecast-selection checks. |
| `report-data.js` | Existing monthly consolidation and weekly case queries; PDF rendering remains in the report route. |
| `condition-review.js` | Review queue, BHW clarification and transaction-protected MHO classification decisions. |
| `backup-audit.js` | Record the existing backup-generation audit action; download/cancellation/cleanup remain in the backup route. |
| Existing `disease-registry.js` | Active and archived catalog reads, alongside its previously extracted change handlers. |

The extraction moves 41 operations into nine new service modules and the existing registry service. New services accept ordinary values/objects and return data; they do not depend on Express requests or responses. Case encoding reuses `database-transaction.js`; the existing barangay row lock, duplicate/resident checks, insert order and case/audit contents are retained. Validation and duplicate-conflict HTTP payloads stay the same. No schema migration or dependency installation is required.

Verification: **69 tests passed, 0 failures**. A new integration test deliberately fails audit persistence for both BHW and MHO creation and confirms that neither a new resident nor a partial case survives. All existing concurrency, classification, access, report and backup tests pass, with unchanged source database fingerprints. A separate local comparison preserved all **60 endpoint/middleware registrations** and matched query order/parameters and HTTP responses in **120 synthetic read/error scenarios**. That comparison normalizes SQL whitespace and excludes changing fetch timestamps/uptime; it does not claim to test every possible input. All **35 active backend JavaScript files** parse. Changed backend modules were formatted using the user's already installed VS Code formatter; no build step was added.

Recovery checkpoint `pre-route-services-20261001` preserves `cf5b668`. The finished extraction is tagged `route-services-20261001`. Preserve newer work, then reverse only this step from `proposal`:

```text
git revert --no-edit route-services-20261001
```

Restart using `npm start` from `server/` after updating or reverting. No database restore is needed. Both checkpoint tags and this commit are local until pushed. Original route/service snapshots, extraction scripts and the local comparison harness are retained in ignored `analysis/route-services-20261001/`. Manual browser testing remains deferred; the automated checks mock email delivery. Frontend assets and predictive-model/data files were not edited.

### Shared frontend helpers (1 October)

`assets/js/shared/safe-text.js` is the common five-character HTML escaping implementation. BHW and Admin keep their existing global `escapeText(value)` hooks as wrappers around `window.HealthIntelText.escape`. Shared correction dialogs and encoding controls reference that same implementation instead of maintaining copies. Superadmin already used the shared helper. BHW and MHO now load `safe-text.js` in the head before dependent scripts; Admin/Superadmin already did so. When reusing `case-corrections.js` or `encoding-controls.js`, load `safe-text.js` first.

`assets/js/shared/date-format.js` now also owns `todayInManila()`, used by the BHW new-case dialog and MHO walk-in form for the default/max case date. Existing date parsing and case-date display remain unchanged. Map text serialization and other timestamp/month/report formatting were deliberately kept separate because their behavior is different. Page-specific sidebar/theme functions also remain separate.

The full suite passed **69 tests, 0 failures**, with unchanged source database fingerprints. A supplemental local audit matched **80 old/new text/date results** and verified helper ordering on BHW, MHO, Admin and Superadmin; BHW/MHO HTML changes consist only of the added script reference. Existing HTML hooks and layouts are preserved. Frontend test fixtures now load the shared escaping dependency before encoding controls, matching the pages. No backend, database, model or private configuration change was made; manual browser testing remains deferred.

Checkpoint `pre-frontend-helpers-20261001` preserves `ceac063`. The completed cleanup is tagged `frontend-helpers-20261001`. To reverse only this cleanup, preserve newer work and run from `proposal`:

```text
git revert --no-edit frontend-helpers-20261001
```

Refresh the portal tabs after updating or reverting. This frontend-only checkpoint needs no backend restart or database rollback. Tags/commit remain local until pushed. Original files and the parity audit are retained in ignored `analysis/frontend-helpers-20261001/`.

### Legacy frontend archive (1 October)

The disconnected `register.html` and `municipal.html` prototypes now live in `legacy/prototypes/`. Four older stylesheets and two unused local library copies live under `legacy/assets/`. Moved assets retain their original bytes; municipal HTML has only three local-path changes. See [archive inventory](../legacy/README.md) for each file's limitations.

The unreachable Admin approval dialog and its five styles are preserved as separate archive fragments. Current approval buttons still use `approveUserDirectly()`; the live Disease Registry dialog is unchanged. The active Admin handler check no longer skips the missing `submitApproval()` hook. `assets/js/shared/app.js` stays in place because MHO still loads it. No active portal script, backend, database, model, configuration or library version was changed.

The path check covers local scripts, styles, images and page links in connected and archived pages, including root-relative paths. All **69 tests passed, 0 failures**, after MySQL was started; source database fingerprint assertions passed. The standalone frontend run also passed all 12 checks. Details are recorded in `TESTING_GUIDE.md`; visual testing remains deferred. Original snapshots and the move/hash audit are in ignored `analysis/legacy-cleanup-20261001/`.

Checkpoint `pre-legacy-cleanup-20261001` preserves `49619bd`; the completed cleanup is tagged `legacy-cleanup-20261001`. Preserve newer work, then undo only this cleanup from `proposal`:

```text
git revert --no-edit legacy-cleanup-20261001
```

Refresh portal tabs afterward. No backend restart, database restore or dependency reinstall is needed. These checkpoints remain local until pushed.

## Disease encoding and review

`assets/js/shared/encoding-controls.js` and `assets/css/shared/encoding-controls.css` provide shared searchable dropdowns and pending-condition display. `assets/js/mho/mho-disease-review.js` implements the MHO review screen. `server/routes/disease-review-routes.js` exposes protected review/clarification endpoints through `server/services/condition-review.js`. `server/services/disease-review.js` validates catalog selection and contains the explicit additive migration used by `server/scripts/apply-disease-review.js`. Case creation is dispatched by `server/routes/case-routes.js` to `server/services/case-encoding.js`, which owns resident/case/audit transactions. See [DISEASE_REGISTRY.md](DISEASE_REGISTRY.md) for the workflow and recovery limits.

## Prediction details

Node starts `server/analytics.py` as a child process and returns its JSON result. Python currently queries MySQL directly using environment credentials. It does not yet use a database-isolated input pipeline. The statsmodels SARIMAX fit currently has nonseasonal order (1,0,0), an AR(1) model, and allocates municipal estimates using historical barangay shares. Forecasts remain demonstrations with validation pending. Missing months in this older pipeline are still filled with zero; the new review tool preserves missing reports instead, but is not yet integrated into model training.

The `predictions` table exists, but the current forecast route does not save its results there. The data review CLI only reads registry/aggregate metadata and writes separate review files. Training, comparisons and integration await the verified real dataset.

## Persistence and limits

MySQL-compatible storage contains the eight tables described in DATABASE.md. Important actions generate audit entries; the database does not enforce an immutable ledger and not every click is logged. Superadmin backups use a complete SQL dump in an AES-256 encrypted ZIP. Access controls and backup restore tests use disposable database copies.

The archived `legacy/prototypes/municipal.html` is disconnected. There is no municipal/Mayor account role. The Admin role governs accounts and the disease registry; it is distinct from the MHO role.
