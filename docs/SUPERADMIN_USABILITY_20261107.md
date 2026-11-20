# Privileged portal account controls

CODEX-2, 7 November 2026. Local task SUPERADMIN-USABILITY-20261107.

Admin and Superadmin headers now have an accessible profile button. The shared account-settings.js reads the current session, displays the signed-in account ID and role, and provides Current password, New password and Confirm new password fields. All three fields are required. New passwords must match and satisfy the existing eight-character/72-byte constraint. Submission uses the existing change-password endpoint and its authenticated account identity. Failure retains the dialog with the server message. Confirmed success clears the local session and returns to sign-in. All test credentials were synthetic, and no actual account password was changed.

Superadmin Refresh Overview is now a labeled refresh-icon button, retaining overview-refresh and its existing handler. Header controls wrap on narrower screens.

Admin Access rows open their existing details on click, Enter or Space. Restore, Suspend and Approve remain separate buttons, excluded from row activation. The redundant View details button was removed. Table semantics, escaping, search, status filtering and confirmation behavior for access changes remain intact.

Account access history displays five events per page with Previous, numbered pages, ellipses and Next. The current page is marked with aria-current and receives keyboard focus after navigation. Page boundaries and empty history are handled. Pagination covers the endpoint's latest 100 returned events. When has_more is true, the existing message refers users to Master Ledger for older records. No backend API or query changes were required.

Verification performed now

- 60 tests passed across the new Superadmin usability suite, existing portal structure, overview, contrast and session frontend suites.
- Password field requirements, mismatch/length blocking, server failure, success cleanup and redirect tested with mocked API responses for both privileged roles.
- Account row click/Enter/Space, action-button exclusion, history page changes/bounds/ellipsis and escaped data checked using synthetic fixtures.
- Existing stale portal logout test updated to the previously authorized direct logout behavior.
- Existing Tailwind builds completed for Admin and Superadmin. mho.css is the existing shared three-directive build input for Superadmin, confirmed in build-portals.cjs. Initial auto-review rejection was resolved with that evidence. The package emitted an outdated browserslist database notice, dependencies were preserved.
- Local sign-in, Admin, Superadmin and shared profile script returned HTTP 200. Diff whitespace checks passed.
- Browser visual testing was blocked by the browser tool reporting disabled. Physical-device appearance and a live password change are pending. The tests exercise interactions through synthetic DOM fixtures.

Files added are assets/js/shared/account-settings.js, server/tests/superadmin-usability.test.js and this report. Runtime files modified are admin.html, superadmin.html, assets/js/superadmin/superadmin-users.js and the two compiled role utility styles. server/tests/portal-structure.test.js and shared task/handoff/changelog record verification. Backups, focused diffs and tests.log are in external superadmin-usability-20261107.

The installed prediction models, datasets, operational records and Azure were preserved. Backend authentication and password validation were reused. Rollback requires comparing the named files with evidence/before copies and removing only this task's new shared account script and tests if no later work depends on them. Preserve subsequent edits and the rest of the checkout. Main/e5946d4 pre-existing work remains.
