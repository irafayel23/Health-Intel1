# Password-change continuity and white backup workspace

CODEX-2 · PASSWORD-CONTINUITY-20261107 · local main/e5946d4.

## Why the screen appeared

A password change invalidated the token used by the page. The old profile handler cleared the token, then waited on a success popup. Focus/background session checks could replace that popup with the generic ended-session screen. The user's clarified requirement is to show success while retaining the current tab's authenticated session.

## Fix

The password update and current-browser session renewal now commit in one transaction, reusing singleSessionLogin. The service locks/rechecks the credential row and verifies that the presenting token still owns the active session before renewal. Password hashing, password rules and account authorization remain unchanged. The old password/session version and epoch become invalid; a new token is returned. No new table or schema migration.

The frontend installs the verified password response's renewed token before the profile shows Password updated. Its in-memory page token updates too. Late responses from the old token are discarded; a newer login made during response parsing is never overwritten. The profile no longer clears credentials or redirects after a successful password change. All four shared-profile roles use this behavior. Current tab remains signed in; other already-open tabs with the old token can show a session-change screen and need refresh/sign-in. Password reset/recovery behavior is unchanged.

A password changed before this fix already ended that session. Sign in once using that new password; the fix does not resurrect an invalid token.

The Superadmin backup view marks the main workspace while active. Its surrounding area and inner panel are white in light mode, dark in dark mode; returning to another section restores its usual background. Backup button/handler/content are preserved.

## Verification and limitations

94 combined affected tests passed,0 failed: password-continuity, single-session, qa-fixes, single-session-frontend, superadmin-usability and portal-structure. Four-role disposable-DB checks cover valid renewal, wrong current password, old-token rejection, stale write rejection and old-password rejection. Existing audit-failure rollback, explicit takeover, account scope and single-session protections passed. Mocked frontend tests cover stale in-flight responses and a newer login arriving while reading a renewal response. Actual operational passwords were not changed.

Expanded testing initially caught an accidental login-consent forwarding regression, corrected before the final passing run. The disposable QA cleanup also needed its renewed token after deliberately restoring its fixture password; it cannot use the login intentionally rate-limited by an earlier test. Those corrections and failures remain recorded in external evidence.

JavaScript syntax,CSS parsing and diff whitespace passed. Only the identified local Node server was reloaded; finalPID11996,healthz200,Superadmin/session assetHTTP200. No live backup or schema/data migration. Browser visual/manual password change remains unverified because browser control was previously unavailable. Lost network responses after a committed credential change can still require signing in with the new password; do not assume a timeout means the password stayed unchanged.

## Files and recovery

Runtime: server/routes/auth-routes.js,server/services/account-credentials.js,assets/js/shared/api-session.js,assets/js/shared/account-settings.js,assets/js/superadmin/superadmin-shell.js,assets/css/superadmin/superadmin-page.css,4portalHTML cache versions. Tests: new password-continuity.test.js; updated single-session-frontend.test.js,superadmin-usability.test.js,qa-fixes.test.js. Shared documentation updated.

Before copies,focused.diff,test logs and verification.json: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/password-stay-signed-in-20261107. Reverse only these task hunks after checking newer edits; backend and frontend token-contract changes must roll back together, followed by a local server reload. Never restore an old database to undo this UI work.

No Azure deployment,operational patient edits,dataset/model/probability changes,Git staging/commit/push,dependency changes or production configuration changes. Next: refresh/sign in locally once, then manually verify a later password update shows success and continues accessing allowed sections.
