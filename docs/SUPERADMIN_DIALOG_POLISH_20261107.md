# Superadmin panel and dialog polish — 7 November 2026

CODEX-2 · SUPERADMIN-DIALOG-POLISH · main/e5946d4 · local only.

Database Extraction now grows vertically into the remaining main workspace as well as using its full width. Inner text and backup controls remain at their existing positions/content. This is a workspace panel, not browser fullscreen mode.

Ledger row hints now use immediate CSS hover/focus display instead of the browser-controlled title delay. Native title removed from these rows; accessible row names retained. Read-only hint is hidden from assistive technology because it duplicates the row action label.

The ledger detail popup paginates matching loaded reference events, five per page, using the existing historyPageNumbers pattern. It no longer silently slices the matching list to20 events. Page count says loaded events; this does not imply all backend-retained history has been fetched. Buttons validate page bounds, preserve escaped full details and support normal keyboard activation/focus. No new API requests or server pagination were added.

Superadmin feature dialogs now have a top-right close X. Footer actions align right via portal-scoped CSS; existing shared Profile already has its X. Cancellation/confirmation and validation logic remain unchanged. The Creating backup busy screen deliberately retains its existing non-dismissible behavior and does not get an X; closing a screen must not imply cancellation of an active operation. No backup/password/account write was performed.

Changed runtime files: superadmin.html,superadmin-page.css,superadmin-ledger.js,superadmin-users.js,superadmin-health.js,superadmin-backup.js,superadmin-shell.js. Script/style cache URLs updated. Tests extended in portal-structure.test.js. No framework, dependency or build added.

Verification:32 focused tests passed across portal-structure and superadmin-usability; new test exercises13 matching related events over three pages, invalid page bounds, close control and replacement hint markup. Existing cancellation/escaping/account/session/navigation regressions pass. Scoped CSS parse and focused diff whitespace check pass. Actual browser visual/viewport checks remain pending; last browser tool reported disabled. No screenshot or real pixel layout verification is claimed.

Application data, forecasting, permissions, backend, MySQL and Azure unchanged. No deployment or Git commit/push. Before copies,focused.diff and verification.json live at C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/superadmin-dialog-polish-20261107. Reverse only these focused hunks after checking for newer work.

Next: refresh local Superadmin; inspect backup panel bottom, related-event pages, immediate hint, top-right X and right footer actions at the user's zoom level.
