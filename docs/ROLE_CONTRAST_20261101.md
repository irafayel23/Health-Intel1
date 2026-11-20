# Admin and Superadmin light-mode readability — 2026-11-01T11:28:24+08:00

CODEX-1; ROLE-CONTRAST-20261101. Local implementation complete; rendered browser verification remains pending because browser control reports disabled.

Applied a shared Tailwind plugin to these two roles only. Every generated rule is scoped to `html:not(.dark) .hi-role-readable`; dark-mode classes and the BHW/MHO builds are unchanged. This covers dynamically rendered account lists, ledger records, case histories and SweetAlert content as well as static sections.

- Primary inherited text: slate 800, medium weight; explicit bold/semibold classes retained.
- Faint neutral secondary text: slate 700. Input placeholders: slate 600 at full opacity.
- Captions, dates and small table labels: at least 14px, 1.5 line height for the targeted small utility classes.
- Label/header weight strengthened without reducing existing explicit bold text.
- Light green/red/blue status and action text darkened where necessary; no status meaning or action changed.

Files: admin.html; superadmin.html; tools/styles/role-readability.cjs (new); tools/styles/admin.config.cjs; tools/styles/superadmin.config.cjs; assets/css/admin/admin-utilities.css; assets/css/superadmin/superadmin-utilities.css; server/tests/role-contrast.test.js (new); shared task/handoff/changelog and this report.

Verification: 49 focused tests passed (contrast, Overview, portal structure/navigation/workflows). Selected secondary, placeholder and status colors meet at least 4.5:1 against their registered white/slate/soft status backgrounds using the sRGB luminance formula. This numerical palette check does not claim a complete rendered WCAG audit. Both role styles rebuilt using installed Tailwind; no dependency installs. Five protected prediction source/bundle hashes unchanged. Local page/style HTTP checks and final whitespace check recorded in tool output.

No JavaScript business logic, API, authentication, case data, database, model, research, Azure, or GitHub change. Unrelated pre-existing edits preserved.

Recovery: external role-contrast-20261101/before holds pre-task copies. Restore only these task changes after comparing newer work; do not reset the repository. Remove the marker/plugin configuration and regenerate the two role styles to undo the contrast layer without undoing earlier Overview work.
