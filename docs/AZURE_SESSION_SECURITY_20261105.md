# Azure session-security release — 5 November 2026

AZURE-SESSION-20261105 COMPLETE 05/11/2026, 11:07:27 PHT, CODEX-1 / Ponytail. Owner-approved all new local runtime changes compared against live Azure:16 changed files, all deployed SHA256 verified;11 public frontend HTTPS hashes match. Single active browser session across all4roles, password-verified takeover/Cancel, red confirmation, branded Guided ended screen and confirmed-other-sign-in wording now live. Current SARIMA/data and all151 other inventoried source/data hashes unchanged.369 full local tests pass. Fresh encrypted PC DB backup45624bytes SHA256 independently verified. Runtime rollback archive /var/backups/health-intel/session-20261105-r3/runtime-before.tar.gz SHA2563dd792f2fdd5792a0c5d18a2c02bd6ca967e50270f6c507cda8cb13f04b7b53c. Session storage migrated through existing MySQL administrator socket; all pre-existing rows across20tables fingerprinted unchanged. No application-user grant, firewall, VM or deployment-config change. Live health200/anonymoussession401/privatepaths404;serviceactive. Actual Brave sign-in page and both versioned scripts verified, no captured warnings/errors. Live authenticated takeover not manually exercised;369 local regressions include disposable-DB takeover tests. Initial app-user CREATE denied and runtime auto-restored; retry archive verification corrected for a new unused source file retained after rollback; final activation successful. First tracked sign-in retires old untracked sessions; in-flight authorized saves may complete once; background timers can be delayed. No case/user/password changes, model/dataset/dependency or GitHub changes. Before/logs/manifest/public checks external azure-session-20261105; writer released.

## Deployed files

- index.html
- bhw.html
- mho.html
- admin.html
- superadmin.html
- assets/js/index/index-login.js
- assets/js/shared/api-session.js
- assets/css/admin/admin-utilities.css
- assets/css/bhw/bhw-utilities.css
- assets/css/mho/mho-utilities.css
- assets/css/superadmin/superadmin-utilities.css
- server/middleware/access-control.js
- server/routes/auth-routes.js
- server/services/session-security.js
- server/services/single-session-login.js
- server/services/system-audit.js

## Recovery

Compare later changes first. Verify the private runtime archive SHA256, stop the service, restore the previous runtime files from that archive and restart. Leave the added session table intact; do not restore an old database merely to roll back application code. The encrypted database backup is a separate disaster-recovery copy. New unused helper source may remain when restoring old runtime; it is not imported by old code.

## Verification limits

All existing rows were checked while the service was stopped. New session/audit rows will change during normal logins. Public scripts and local full regression suite were verified; no live patient encoding or forced takeover of an existing staff account was performed. No new phone visual test was performed.
