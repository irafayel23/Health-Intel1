# Superadmin ledger row interactions — 7 November 2026

CODEX-2, LEDGER-ROW-20261107. Local only on main/e5946d4.

Master Ledger rows with valid event IDs now open the existing detail dialog by click, Enter or Space. Nested interactive controls do not trigger a second row action. Invalid-ID legacy rows remain readable without an unusable detail action. Removed the redundant Details column and buttons, including the empty-state column count. Existing filters, Philippine-time formatting, pagination, escaping and saved before/after details remain unchanged.

The six columns use fixed percentage widths (16/14/10/34/14/12). Long words wrap within cells instead of changing column width across pages. The existing three-line summary preview remains; full text is preserved in the detail popup. Rows can grow vertically for readable text; narrow screens retain horizontal table scrolling. Hover and keyboard focus identify clickable rows in light/dark mode.

Access Control refresh now uses the existing refresh-cw icon with a visible tooltip and accessible name. Its existing loadAdmins handler is preserved.

Changed runtime files: superadmin.html; assets/js/superadmin/superadmin-ledger.js; assets/css/superadmin/superadmin-page.css. Focused regression file: server/tests/portal-structure.test.js. Cache URLs updated; no utility rebuild or dependency added.

Verification: 30 tests passed across portal-structure and superadmin-usability, including click/keyboard matching, nested-control guards, invalid IDs, long full detail text, filtering, escaped details, pagination/account profiles and immediate logout. Scoped CSS parse passed. Three local page/asset HTTP checks returned200. Focused diff whitespace check passed. No real account or patient writes were used. Browser visual check remains unavailable because the browser tool reports disabled; DOM fixtures do not establish actual layout.

No backend, permission, dataset, model, MySQL or Azure change. External before copies and focused.diff: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/ledger-row-20261107. Reverse only these scoped hunks after checking for newer work; do not restore the entire checkout.

Next: open the local Superadmin Master Ledger and verify row interactions and wrapping at the user's zoom level. Azure deployment is outside this task.
