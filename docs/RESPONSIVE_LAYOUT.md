# Responsive portal layouts

Reviewed on 3 October 2026 in the active `proposal` checkout.

## Document scope

The uploaded `WALA-PA-TAPOS-CHAPTER-3.pdf` names laptops/tablets on PDF page 28 and desktop/laptop/tablet clients on pages 34 and 42. It does not explicitly promise complete smartphone support. This engineering note records the additional phone-layout work; it does not modify the submitted chapter or establish device certification.

## Current behavior

- Login already adapts to narrow screens. Long registration and recovery screens can scroll.
- BHW, MHO, Admin and Superadmin use an overlay navigation drawer at widths of 900px and below. The menu starts closed, opens from the header, shows full navigation labels, closes after selecting a destination, and supports Close menu, backdrop and Escape. Keyboard focus stays in the open drawer; background content is inert until it closes. Account/confirmation dialogs retain keyboard control when visible.
- Above 900px, the existing role sidebar and desktop collapse behavior remain. Superadmin's new menu button is hidden on desktop.
- Portal content fills the available width. Small-screen headers, action rows, report controls, analytics filters and encoding fields fit their panels. Inputs use 16px text at narrow widths to avoid small-input zoom behavior.
- Tables retain their columns and scroll horizontally inside a focusable table region. Admin sub-tabs also scroll locally. A horizontally scrollable table is intentional; it is not a page-wide overflow defect.
- The page shell uses dynamic viewport height where supported. Existing section scrolling remains available. Reduced-motion preferences disable the drawer transition.

Shared implementation: `assets/js/shared/portal-navigation.js` and `assets/css/shared/portal-responsive.css`, loaded by the four connected portal pages. Existing HTML IDs, account handlers and API/role checks are preserved.

## Verification and limits

All 19 sidebar destinations were checked with the installed page scripts and CDN libraries in an isolated Chromium browser preview at 320px, 768px and 1280px widths in light mode, and 390px in dark mode. Document/main widths fit, and visible content outside intentional table/sub-tab/map clipping regions did not extend beyond the viewport. A further 320px pass used populated synthetic cases, a resident, a long condition name, account rows and ledger events. These are layout checks, not official clinical records.

The BHW encoding dialog and searchable condition menu, resident dossier, MHO walk-in controls, Admin registry form and Superadmin backup dialog receive separate visual checks. Preview requests are synthetic and read-only; no source patient/account mutation, email or real backup is performed by that browser preview.

The full automated suite passed 86 tests with MySQL available, including existing role/database integration checks and new drawer dismissal, keyboard focus, confirmation-dialog ownership and breakpoint/desktop behavior tests. These checks overlap with browser coverage and should not be added together as a count of independent features.

The user subsequently reported testing mobile responsiveness on each HTML page on 3 October. Device models, browsers and individual results were not supplied. Physical Android/iPhone certification, on-screen keyboard behavior, touch ergonomics and other browser engines have not been independently verified. This checkpoint establishes the tested responsive layouts, not universal phone compatibility or production readiness. Forecast accuracy and official report validation remain separate work.

Reload role pages to load the updated markup/assets. The private friend-demo gateway collects its asset allowlist at startup; if it was started before these two shared files existed, restart that demo when the current testing session is finished to serve them. This task does not restart the live demo automatically.

Proof, measurements, synthetic preview helper and recovery copies are in ignored `analysis/responsive-20261003/`. No schema migration, dependency addition, forecast change, credential change, commit or push is included in this checkpoint.

Working-change Git review found no tracked private environment/runtime credential files or dependency directories. Known private environment secret values were absent from added tracked lines and the reviewed untracked text files. `.env`, `node_modules`, `.venv` and private analysis/recovery files remain ignored; whitespace checks passed. This review concerns current working changes and does not rewrite or certify earlier Git history.
