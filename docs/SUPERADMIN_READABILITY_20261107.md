# Superadmin readability and ledger dividers — 7 November 2026

CODEX-2 · SUPERADMIN-CONTRAST · main/e5946d4 · local only.

Source-reviewed Overview, Access Control/search/account details/history, Master Ledger/filter/detail/related pages, Database Extraction/backup dialog, Profile/password dialog, confirmation/error messages and manual restart dialog. No operational records were accessed to inspect styling.

Superadmin-only light-mode rules now darken neutral secondary text to #1e293b, dialog content/field values to #0f172a, form labels/help to #1e293b and placeholders to #334155 at full opacity. This reaches dynamically created SweetAlert content through the existing body class. Font sizes, weights, spacing and layout are unchanged by the contrast rules. Blue/green branding, colored status/button treatments,white text on dark hero surfaces and intentionally disabled states are preserved. Dark-mode text rules are untouched.

Ledger facts now use individual semantic dl/dt/dd label/value pairs with a thin divider below each. Full values, object serialization and escaping are preserved; the existing related-events renderer reuses these rows. Divider has a dark-mode border color. Label weight stays equivalent to the previous strong label; only separator padding/spacing changes in these new detail rows.

Reference: [GOV.UK summary list](https://design-system.service.gov.uk/components/summary-list/), a label/value pattern with row borders. Existing dependencies reused; no framework,utility rebuild or package added.

Files: assets/css/superadmin/superadmin-page.css;assets/js/superadmin/superadmin-ledger.js;superadmin.html cache versions;server/tests/role-contrast.test.js;server/tests/portal-structure.test.js. Shared coordination documentation updated.

Verification:38 tests pass across role-contrast,portal-structure,superadmin-usability. New checks parse the CSS, confirm all four new contrast override rules are light-mode scoped and contain only color/placeholder opacity, and calculate >=4.5:1 for the selected foreground colors on white/slate50-blue50 light surfaces. Ledger details retain escaped data and semantic rows; existing pagination/profile/backup-cancel/navigation checks pass. Three local HTTP page/asset checks returned200; diff whitespace check passed.

Limit: source inspection,color calculations and mocked DOM tests are not a real browser accessibility audit. Browser visual/zoom checks remain pending (last tool reported disabled),including native controls,disabled opacity and any untested background. No universal rendering/zoom guarantee or full WCAG conformance claim. Browser zoom can alter text rasterization even when the CSS color stays fixed.

No backend/auth,password,model,dataset,patient/MySQL or Azure changes;no real backup run. Before copies,focused.diff and verification.json: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/superadmin-contrast-20261107. Reverse only the scoped task hunks after checking for newer work.

Next: refresh local Superadmin and visually review each page plus Profile,Backup,Access history andLedger details at the usual zoom level. Keep browser controls and blue/green status/brand colors distinguishable.
