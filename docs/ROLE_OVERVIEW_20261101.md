# Admin and Superadmin Overview — 2026-11-01T11:07:53+08:00

CODEX-1; ROLE-OVERVIEW-20261101. Approved preview implemented locally. Azure and GitHub were not changed by this UI task.

## Result

Admin now starts in Overview with a separate navigation item; all prior User Management, Patient Records, Disease Catalog and Audit views remain. Both roles have a teal welcome banner displaying the actual verified session system_id, also shown in the header. Sample values from the mockup are not used.

Admin cards: unique BHW/MHO account total across pending/active/denied-suspended lists; pending requests; non-archived Active cases; active catalog entries. Admin account requests and latest three operational audit actions come from existing authorized read endpoints. Cards open the corresponding view and pending/active user tab.

Superadmin cards: all registered accounts from existing health totals; Admin accounts from the Admin-role subset; recorded case total from health totals; total audit entries from health totals. System accounts card opens Admin Access (this is the existing access-management capability); record-count card explicitly opens record references in the Master Ledger, not a new patient directory. Pending Admin queue is separate, with pending count, process uptime and database size retained. Backup shortcut opens the existing password-protected dialog section; it does not generate a backup automatically. Manual restart instructions retained. Connection labels say server/database responded rather than claim every module or authentication has been tested. Failed connection checks say not verified instead of asserting a database outage from any fetch error.

Overview loads existing read endpoints in parallel at startup, on Refresh, and when re-entering Overview. It does not automatically refresh every three seconds; the existing separate Superadmin health polling remains. Loading, partial failure, empty state and last-refresh time are explicit. Failed counts show an em dash, not a fabricated zero. Session IDs/actions use textContent. No new API contracts, backend, auth logic, schema, records or forecasting source/data were modified.

## Design

Shared design language: green/teal welcome banner, four clickable white summary cards, readable icons, request and recent-activity panels, quick actions, dark-mode variants. Tailwind grids stack1/2/4columns across widths. All existing IDs required by health/ledger/user features are retained. Existing Tailwind3.4.17 compiled only Admin/Superadmin styles; no installation/framework added. Sidebar collapse/mobile behavior preserved. Card navigation transfers focus to the destination heading.

## Actual checks

- 44 focused tests passed: six new overview tests plus existing navigation, real-page script-order/startup, role behavior and UI workflows.
- Full npm test:298passed,0failed,0skipped. Includes operational workflow tests using disposable DB copies; source records preserved by existing test safeguards.
- Tests cover derived counts, account-role separation, real session greeting, scoped navigation, text rendering/XSS input, failure/retry behavior, markup hooks and script order. Existing backup/restart/auth and prediction tests passed.
- New shared script syntax checked. HTTP200 verified for localhost:3000/healthz, /admin.html, /superadmin.html and shared overview script. Both HTML responses contain the new welcome markup.
- Protected SARIMA/forecast assets and data hashes match initial snapshot (5files). Pre-existing dataset deletions/untracked records and docs retained, no Git staging/commit/reset/push.
- Browser tools remained disabled even after fresh connection/reset; inventory attempt also timed out. No desktop/mobile rendered screenshots, overflow measurements or new logged-in real-browser session were verified. Tests use DOM fixtures, not a substitute for visual QA. Do not claim screenshots exist.

## Resume / rollback

Local app is running in owned exec session52925 with SERVE_FRONTEND=true for this process; .env unchanged. Open http://localhost:3000/ and sign in as Admin/Superadmin. Browser verification remains pending; resume with “continue Overview UI verification” when available. No need to rerun models or DB migrations.

Backups and staged source: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/role-overview-20261101. Restore only listed files from before/ if reverting; new shared overview script/test can be removed only as part of that coordinated rollback. Do not restore an entire old checkout or alter unrelated datasets. Original new-file snapshots and REPORT.md retained externally.

## Changed files

- admin.html
- superadmin.html
- assets/js/shared/role-overview.js
- assets/js/admin/admin-shell.js
- assets/js/superadmin/superadmin-shell.js
- assets/js/superadmin/superadmin-health.js
- assets/css/admin/admin-utilities.css
- assets/css/superadmin/superadmin-utilities.css
- server/tests/role-overview.test.js
