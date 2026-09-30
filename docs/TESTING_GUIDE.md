# Verification

From `proposal/server`, run:

```text
npm test
```

The suite creates uniquely named temporary databases, restores a real SQL dump, adds disposable fixtures, starts an ephemeral API and drops only the guarded temporary databases afterward. It fingerprints every production table before and after and asserts that source records did not change. MySQL must be running and test credentials must permit temporary database creation. Tests never send external emails.

The full suite currently has 68 checks, including anonymous/role/barangay protection, session state, encrypted backup restore, PDF endpoints, forecast availability without fabricated accuracy, page script parsing, API session behavior and MHO analytics filters. `npm run test:phase-two` remains available as a smaller subset.

Admin UI checks load its feature scripts in the actual HTML order, exercise view initialization, Case ID searching and audit links, and check current/archived case navigation. The old hidden `approvalModal` still contains an unused `submitApproval()` hook with no implementation; current pending-user buttons use `approveUserDirectly()` instead. This pre-existing unused dialog is excluded from active-hook checks and should be reviewed before ever enabling it.

`tests/portal-structure.test.js` loads the BHW, MHO, login and Superadmin feature scripts in their real HTML order. It checks active event handlers, initial API loads, resident refresh/archive navigation, MHO filter/report handoffs, ledger Sync, canceled backup cleanup, Google verification-to-registration, role login and password-recovery screen handoffs. DOM/chart/Firebase/API/dialog dependencies are mocked; these checks verify wiring and behavior, not appearance, Google availability or live email delivery. Run just the frontend wiring checks with `node --test tests/ui-workflow.test.js tests/portal-structure.test.js`.

After the asset-folder move, these checks also resolve every local script, stylesheet and image referenced by the five connected pages and both prototype pages. The full suite passed 68 checks on 1 October. An additional local move audit verified all 52 script/style byte hashes and that the six affected HTML pages differ only by their asset paths. This does not replace the user's deferred visual browser check.

Phase 2 checks cover explicit case dates, computed ages, severity, resident links, repeated/concurrent duplicate submissions, archived/unknown categories, date validation, email injection, password byte limits, hashed reset codes, expiry, failed-attempt persistence, single use under concurrency, old-session revocation, public reset routes, rate limits, mocked mail failures and aggregate CSV provenance/missing-report/review behavior.

After splitting the mixed backend service on 1 October, the full suite again passed **68 tests, 0 failures**, with unchanged source database fingerprints. The existing `qa-fixes.test.js` name is retained for its regression checks: concurrent registration/duplicate prevention, registry changes, follow-up notes, archive/restore attribution and failed-audit rollback. Those endpoints now use focused registration, account-status, disease-registry and case-lifecycle services. An additional local extraction audit compared all 15 moved handler/helper bodies exactly and checked syntax for 26 active backend JavaScript files. Manual browser testing remains deferred; no new real SMTP check was made.

Date-only database assertions use SQL YYYY-MM-DD formatting, avoiding UTC shifts when the test machine is in Philippine time. The first Phase 2 run exposed that assertion issue; the corrected check verifies the actual SQL date.

Browser verification uses a disposable database and fake accounts. Do not use real patient identities or reset real credentials for demonstration tests. Real SMTP delivery must be checked separately with a deliberately chosen recipient; the automated tests do not establish inbox delivery.

Data review commands are read-only. Verify output labels and review held rows before any future import or model evaluation. Demonstration data results do not measure real Murcia forecasting accuracy.
