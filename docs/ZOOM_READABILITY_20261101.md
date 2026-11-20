# Persistent light-mode typography


## ZOOM-READABILITY-20261101 — CODEX-1 — 2026-11-01T14:20:47+08:00
Persistent local light-mode typography improvement for all four role readability layers: 16px inherited body size, 15px semibold targeted captions, semibold muted utility text, medium minimum normal/light text, strengthened clinical helpers/input values, automatic font smoothing rather than imposed antialiased rendering. Explicit heavy headings preserved. No browser zoom detection, CSS zoom/transform or resize listener; normal user zoom remains available. Physical text still shrinks and rasterization varies when zooming out; no guarantee of identical perceived darkness at arbitrary zoom.
Files: role-readability.cjs, clinical-readability.cjs, four role HTML CSS-version URLs, four compiled role utility CSS, role-contrast.test.js and shared docs. 51 focused tests passed; whitespace check passed; no dependency installs. Browser zoom/mobile rendered QA unverified because browser control disabled. No data/backend/auth/model/Azure/GitHub changes. Before-files external zoom-readability-20261101/before. Ownership released.
