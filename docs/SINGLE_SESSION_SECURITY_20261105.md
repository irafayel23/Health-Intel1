# Single-session security — local completion

SINGLE-SESSION-20261104 COMPLETE locally 2026-11-05 10:05:13 PHT, CODEX-1 with Ponytail full. Paused23-file hashes matched before resuming.365/365 full regressions pass across52 files;33 focused portal/frontend tests also pass after fixing an old-tab logout race. Password-verified session conflict, Cancel, explicit two-minute session-bound takeover, database-serialized epoch/active-token replacement and redacted audit implemented for all4 roles. Same-token tabs reuse login; old tab cannot submit, use newer identity, overwrite newer ID or sign out a newer session. Focus/30-second idle checks clear patient DOM. Normal network/DB outages do not falsely end sessions. Local session-storage migration ran twice and independently fingerprinted every pre-existing table/row unchanged; account_active_sessions added locally. Local server started hidden on3000, healthz200, anonymoussession401,index/helper200. Actual isolated Brave Cancel preserved original form and takeover hid it; final-ended.jpg saved. Mobile DOM390x844 had no horizontal overflow and both buttons within viewport; screenshot rendering inconsistent, physical-phone visual check not claimed. In-flight authorized submissions may complete once; subsequent old-session requests denied. Background timers may be delayed. First tracked sign-in retires older untracked tokens. No Azure deployment, operational case/resident changes, model/dataset changes, dependencies or GitHub changes. Shared task/handoff/overview/report updated; pre-existing dirty work preserved. Before/paused-working copies, current hashes, test/build/migration logs and screenshots in C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/single-session-20261104. Local runtime left running. Writer released.

## Behavior

After credentials/status are verified, another browser receives409 SESSION_CONFLICT without a login token. Cancel leaves the original session valid. Confirm submits a signed, two-minute consent token bound to the account, active token hash, epoch and password version. Credentials are checked again; the locked account row serializes replacement. Concurrent/replayed/expired confirmation cannot silently evict a newer session. Epoch, active-session hash and audit commit together; audit failure rolls back replacement. Only hashes and fixed metadata are stored. Existing8-hour lifetime and role/barangay checks remain.

Multiple tabs sharing the same token remain valid. Other-tab token changes lock old portals before further requests; stale responses and obsolete logout cannot overwrite/revoke a newer login. The idle check runs every30seconds and on focus/visibility; server enforcement is per request. Unsaved medical forms are removed, never persisted as drafts.

## Actual checks

-365 full regressions passed (52 test files, concurrency2).
-33 frontend/portal checks passed after final old-tab logout repair.
-All4 existing Tailwind builds passed during implementation.
-DB migration idempotence and pre-existing row hashes passed. No patient-case or account credential edits.
-Local healthz200; anonymous session401; index/current helper200.
-Isolated browser warning, Cancel and ended-form state verified. Mobile DOM bounds passed; screenshot emulation inconsistent. No real patient saves in browser.

## Files

Five portal/login HTML cache references; index-login.js; shared api-session.js; auth-routes.js; access-control.js; session-security.js; new single-session-login.js; system-audit.js; four compiled role CSS files; new single-session backend/frontend tests; existing login-throttle,directory-sessions,first-fixes,workflow-fixes,qa-fixes tests adapted to the new issued-token policy. No security assertions weakened. Coordination documentation updated.

## Rollback

Stop only this task's local server (PID recorded in local-server.pid), compare current hashes with final-working-hashes.json, and restore ONLY affected files from before copies after preserving any newer edits. before contains full relative paths for application files; older regression-test copies use their basenames. Remove the two newly added test files and single-session-login.js only after restoring their callers. Rebuild CSS if desired using existing per-role configs (MHO uses tailwind.config.cjs). Leave the unused account_active_sessions table in place; no patient restore or destructive DB cleanup is needed. Reload browser tabs and sign in again. Do not restore entire shared checkout over later work.

## Deployment boundary

Local only. Azure needs a separately authorized release, verified recovery backup, storage migration before activation and post-release checks. Local signed-in interaction uses disposable synthetic fixtures; real-account logged-in local browser sign-in was not requested from the owner.
