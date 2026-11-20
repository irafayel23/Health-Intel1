# Local pagination, backup dialog and browser navigation

Completed 2026-11-08T17:43:27+08:00 by CODEX-1. Local changes only; Azure is unchanged.

- Admin User Management: ten accounts per page in Pending, Active and Archived/Denied; numbered blue current-page button; independently retained list pages; in-place changes without another request. Short/empty/error lists and shrinking results are handled.
- Superadmin Database Backup: compact centered form, full-width password inputs, persistent labels, clear encrypted-ZIP guidance, blue Create backup, rightmost Cancel and top-right close. Existing validation/download code is exactly preserved. No real backup was started.
- Four portals: allowlisted section IDs in URL hashes support browser Back/Forward, reload and overview shortcuts. Sign-in replaces the login history entry. Restoring a cached page rechecks its session and restarts polling. Expired/revoked sessions remain blocked. This restores sections rather than unsaved form contents or filters.

## Verification

88 related regression tests and six contrast/CSS checks passed. The six history tests were rerun after removing reliance on externally installed jsdom; they use Node VM fixtures. Tests cover correct second-page account details, last/empty/error pages, independent lists, confirmation cancellation, all4role history routes, no duplicate history entries, invalid hashes, cached-page revocation and existing session/password rules. The isolated database fixture verifies the operational database fingerprint is preserved.

All11 changed local public files return HTTP200 and match disk bytes. CSS parses; saved prediction bundle hashes remain unchanged. Browser checks used an isolated fictional-data fixture with actual scripts/styles. Checked page2 account identity, browser Back/Forward, Superadmin dark desktop layout and light390x844 mobile fit (366x449 dialog; no body scrolling). No browser warning/error captured. Signed-in operational role workflows were not rerun. Temporary fixture servers are stopped.

## Changed files

- admin.html, bhw.html, mho.html, superadmin.html, index.html.
- assets/js/admin/admin-users.js.
- assets/js/superadmin/superadmin-backup.js; assets/css/superadmin/superadmin-page.css.
- assets/js/shared/portal-history.js (new); assets/js/shared/api-session.js; assets/js/index/index-login.js.
- server/tests/admin-personnel-ui.test.js, ui-workflow.test.js, single-session-frontend.test.js.
- server/tests/portal-history.test.js and superadmin-backup-ui.test.js (new).
- Shared coordination documents and this report.

Preserved existing work. No model/dataset, operational schema, deployment configuration or Azure changes. No Git commit or push. External recovery copies and screenshots: personnel-paging-backup-20261108 in the shared visualization workspace. Deploying later must include the new portal-history.js and changed references together.
