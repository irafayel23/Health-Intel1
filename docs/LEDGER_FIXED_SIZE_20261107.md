# Stable ledger page size and full-width backup card

CODEX-2 · LEDGER-SIZE-20261107 · main/e5946d4 · local only.

## Change

The earlier column fix did not prevent taller summaries from increasing row height. The ledger now uses96px rows,56px header, bounded cell previews and a828px minimum table-region height reserving eight rows. Long action names use ellipsis, other cell previews allow two lines, and summaries allow two lines. Full original strings remain in the existing click/keyboard detail dialog. No fake spacer events are created. A partial final page leaves unused space in the region, keeping pagination below the same reserved area. Prev/Next remain visible and disable at boundaries; their widths are stable. This supersedes the earlier report's statement that ledger rows may grow vertically. The page still scrolls normally, with horizontal table scrolling on small screens.

The Database Extraction card's max-w-3xl class was replaced by w-full. Its text, inner card, button and backup handler are unchanged; only the outer card expands to the content width.

Files: superadmin.html,assets/js/superadmin/superadmin-ledger.js,assets/css/superadmin/superadmin-page.css,server/tests/portal-structure.test.js and coordination documentation. Versioned asset URLs updated; no dependency or utility build.

## Verification

31 focused tests passed across portal-structure and superadmin-usability. New regression covers eight-row and partial final-page previews, disabled boundary controls and full long text in details. Existing filtering, escaping, event actions and backup cancellation checks still pass. Final scoped CSS parsed; Git diff whitespace check passed. Independently compared the entire backup section through main closing tag with the before copy: exactly the outer width class changed.

These are code/DOM-fixture checks. Browser visual/pixel measurements remain pending; the last browser tool reported disabled. No screenshot, actual row-height measurement or phone visual pass is claimed. No real backup was executed.

Data/model/prediction policies,MySQL,Azure and backend remain unchanged. No Git commit/push. Recovery copies,focused.diff,hashes and verification.json: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/ledger-fixed-size-20261107. Reverse only these task hunks after checking for newer edits.

Next: refresh local Superadmin; compare ledger pages2/3/4 at the same zoom, then open DB Backup to inspect the wider card. Open a row to read any shortened text.
