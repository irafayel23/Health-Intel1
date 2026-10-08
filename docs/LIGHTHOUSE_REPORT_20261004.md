# HEALTH-INTEL Lighthouse audit — 4 October 2026

## Scope and method

Google Lighthouse 13.5.0 ran in a separate headless Chrome test profile. All eight HTML files in the active `proposal` checkout were covered: five supported pages and three archived prototypes. Duplicate checkouts and Azure packaging backups were excluded. There were 17 initial reports: mobile and desktop light-mode audits of the five supported pages, mobile dark-mode accessibility audits of four portals, and mobile audits of three prototypes. A public Azure login audit and one Superadmin desktop repeat were added.

Portal runs used UI login with synthetic accounts against a disposable local MySQL database. Page identity was verified from the final URL; all five supported pages stayed on the requested page. Existing source records were not edited or sent to Azure. Email delivery was stubbed. The local preview only adds a small API-origin/error-observation script to full HTML documents; this can slightly affect timing. Local sessions were preserved for Lighthouse and can benefit from cached libraries. The Azure login used a fresh unauthenticated profile. These are single-run laboratory scores, not production uptime, load-test or model-validation results.

No application code or Azure configuration was changed by this audit. Reports are saved in ignored `analysis/lighthouse-20261004/`; retain this folder to keep the linked HTML reports.

All 19 Lighthouse reports completed without runtime errors. Cleanup verified the original database fingerprint was unchanged and removed the disposable audit database. The local preview and isolated audit browsers were stopped.

## Supported pages — light mode

| Page | Mobile performance | Desktop performance | Mobile accessibility | Desktop accessibility | Best practices (both) | SEO (both) |
|---|---:|---:|---:|---:|---:|---:|
| index.html | 96 | 100 | 94 | 92 | 100 / 100 | 82 / 82 |
| bhw.html | 57 | 100 | 98 | 93 | 100 / 100 | 90 / 90 |
| mho.html | 66 | 100 | 92 | 94 | 100 / 100 | 100 / 100 |
| admin.html | 87 | 100 | 96 | 96 | 100 / 100 | 90 / 90 |
| superadmin.html | 98 | 60 | 89 | 86 | 100 / 100 | 90 / 90 |

Scores 90–100 are good, 50–89 need improvement, and below 50 are poor. A score is not an assurance that every workflow or security control passes.

## Mobile dark-mode accessibility

| Portal | Accessibility | Scored failures |
|---|---:|---|
| bhw | 98 | Heading elements are not in a sequentially-descending order |
| mho | 98 | Heading elements are not in a sequentially-descending order |
| admin | 100 | None in this view |
| superadmin | 89 | Buttons do not have an accessible name; Heading elements are not in a sequentially-descending order |

## Highest-priority findings

1. **BHW/MHO mobile JavaScript work:** BHW scored 57 with 1,880 ms total blocking time and a 3.4 s largest contentful paint. MHO scored 66 with 990 ms blocking time and a 3.1 s largest contentful paint. Lighthouse attributed substantial work to chart/map libraries, page code, and runtime Tailwind compilation. Inspect startup duplication and defer hidden maps/charts; consider compiling Tailwind ahead of time and loading PDF/export libraries only when used. This is browser-side evidence and does not establish that 1 GiB server RAM caused the lag.
2. **Live Azure login loading:** See the hosted result below. The large logo and render-blocking scripts/fonts are measurable opportunities; the Satin Flow WebP itself is only about 21 KB. Resize/compress the logo and review loading order without breaking Firebase or sign-in dependencies.
3. **Contrast:** The security note on Login is 4.42:1, below 4.5:1. Desktop BHW flags Log Out, Mild Cases/Recorded Mild, Recorded Monitored, High Risk/Recorded High Risk. MHO flags Active Cases, Total Recovered and Active High Risk Cases; desktop also flags Log Out and the sidebar terms footer. Admin flags the ACTIONS table heading and desktop Log Out. Superadmin desktop flags Connected statuses at 2.53:1 on white. Dark-mode audits did not flag contrast in the initial portal views tested.
4. **Superadmin unnamed controls:** Both System Actions chevron buttons lack accessible names. Their markup also has no visible click handler; this is a source observation, not proof that a carousel is required. Give them meaningful behavior/labels or remove decorative controls after review.
5. **Structure:** Login has no main landmark. Login desktop and BHW/MHO/Superadmin headings skip levels (for example h1 to h3/h4), making screen-reader navigation less clear.
6. **SEO:** Login, BHW, Admin and Superadmin lack meta descriptions; MHO passed SEO. Login has a hidden Cancel anchor without an href. That action should be a button rather than made crawlable. Protected dashboards do not need public search indexing; assess SEO recommendations in that context. Open Graph sharing metadata is separate from these scores and remains absent from Login.

## Exact scored failures and evidence

### index.html

- **accessibility: Background and foreground colors do not have a sufficient contrast ratio.** (index-mobile-light, index-desktop-light).
  - "Access is based on your assigned role" — selector: `div.split-layout > div.form-side > div.login-card > div.security-badge`; Fix any of the following:   Element has insufficient color contrast of 4.42 (foreground color: #657b88, background color: #ffffff, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1.
- **accessibility: Document does not have a main landmark.** (index-mobile-light, index-desktop-light).
  - "html" — selector: `html`; Fix all of the following:   Document does not have a main landmark.
- **seo: Document does not have a meta description** (index-mobile-light, index-desktop-light).
- **seo: Links are not crawlable** (index-mobile-light, index-desktop-light).
  - "Cancel" — selector: `div.form-side > div.login-card > form#profile-screen > a.access-cancel-profile`; see HTML report.
- **accessibility: Heading elements are not in a sequentially-descending order** (index-desktop-light).
  - "Patient information" — selector: `div.feature-list > div.feature-item > div.feature-text > h4`; Fix any of the following:   Heading order invalid.

[index-mobile-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/index-mobile-light.html>) · [index-desktop-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/index-desktop-light.html>)

### bhw.html

- **accessibility: Heading elements are not in a sequentially-descending order** (bhw-mobile-light, bhw-desktop-light, bhw-mobile-dark).
  - "Case Status & Recorded Severity" — selector: `div#view-dashboard > div.grid > div.bg-[hsl(var(--card))] > h3.font-semibold`; Fix any of the following:   Heading order invalid.
- **seo: Document does not have a meta description** (bhw-mobile-light, bhw-desktop-light).
- **accessibility: Background and foreground colors do not have a sufficient contrast ratio.** (bhw-desktop-light).
  - "Log Out" — selector: `aside#sidebar > div.p-4 > a.nav-item > span.sidebar-label`; Fix any of the following:   Element has insufficient color contrast of 4.4 (foreground color: #dc2626, background color: #f1f5f9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "Mild Cases" — selector: `div.bg-[hsl(var(--card))] > div.hi-grid-small > div.rounded-xl > div.text-sm`; Fix any of the following:   Element has insufficient color contrast of 3.15 (foreground color: #16a34a, background color: #f4fcf7, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "Recorded Mild" — selector: `div.bg-[hsl(var(--card))] > div.hi-grid-small > div.rounded-xl > div.text-xs`; Fix any of the following:   Element has insufficient color contrast of 2.21 (foreground color: #59be7e, background color: #f4fcf7, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "Recorded Monitored" — selector: `div.bg-[hsl(var(--card))] > div.hi-grid-small > div.rounded-xl > div.text-xs`; Fix any of the following:   Element has insufficient color contrast of 2.92 (foreground color: #6390f1, background color: #f5f9ff, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "High Risk" — selector: `div.bg-[hsl(var(--card))] > div.hi-grid-small > div.rounded-xl > div.text-sm`; Fix any of the following:   Element has insufficient color contrast of 3.38 (foreground color: #ea580c, background color: #fff8f3, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "Recorded High Risk" — selector: `div.bg-[hsl(var(--card))] > div.hi-grid-small > div.rounded-xl > div.text-xs`; Fix any of the following:   Element has insufficient color contrast of 2.39 (foreground color: #f08851, background color: #fff8f3, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1.

[bhw-mobile-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/bhw-mobile-light.html>) · [bhw-desktop-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/bhw-desktop-light.html>) · [bhw-mobile-dark](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/bhw-mobile-dark.html>)

### mho.html

- **accessibility: Background and foreground colors do not have a sufficient contrast ratio.** (mho-mobile-light, mho-desktop-light).
  - "Active Cases" — selector: `div#view-analytics > div.grid > div.rounded-xl > div.text-sm`; Fix any of the following:   Element has insufficient color contrast of 4.38 (foreground color: #e11d48, background color: #fef5f7, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "Total Recovered" — selector: `div#view-analytics > div.grid > div.rounded-xl > div.text-sm`; Fix any of the following:   Element has insufficient color contrast of 3.6 (foreground color: #059669, background color: #f3fcf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "Active High Risk Cases" — selector: `div#view-analytics > div.grid > div.rounded-xl > div.text-sm`; Fix any of the following:   Element has insufficient color contrast of 3.38 (foreground color: #ea580c, background color: #fff8f3, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "Log Out" — selector: `aside#sidebar > div.p-4 > a.nav-item > span.sidebar-label`; Fix any of the following:   Element has insufficient color contrast of 4.4 (foreground color: #dc2626, background color: #f1f5f9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
  - "© 2026 Health-Intel • Terms & Recognitions" — selector: `aside#sidebar > div.p-4 > div.mt-4 > a.sidebar-label`; Fix any of the following:   Element has insufficient color contrast of 4.34 (foreground color: #64748b, background color: #f1f5f9, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1.
- **accessibility: Heading elements are not in a sequentially-descending order** (mho-mobile-light, mho-desktop-light, mho-mobile-dark).
  - "Epidemiological Health Profile" — selector: `div#view-analytics > div.bg-[hsl(var(--card))] > div.mho-card-heading > h3.text-xl`; Fix any of the following:   Heading order invalid.

[mho-mobile-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/mho-mobile-light.html>) · [mho-desktop-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/mho-desktop-light.html>) · [mho-mobile-dark](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/mho-mobile-dark.html>)

### admin.html

- **accessibility: Background and foreground colors do not have a sufficient contrast ratio.** (admin-mobile-light, admin-desktop-light).
  - "ACTIONS" — selector: `table > thead > tr > th`; Fix any of the following:   Element has insufficient color contrast of 4.34 (foreground color: #64748b, background color: #f1f5f9, font size: 8.3pt (11px), font weight: bold). Expected contrast ratio of 4.5:1.
  - "Log Out" — selector: `aside#main-sidebar > div.p-4 > a.nav-item > span.sidebar-label`; Fix any of the following:   Element has insufficient color contrast of 4.4 (foreground color: #dc2626, background color: #f1f5f9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1.
- **seo: Document does not have a meta description** (admin-mobile-light, admin-desktop-light).

[admin-mobile-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/admin-mobile-light.html>) · [admin-desktop-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/admin-desktop-light.html>) · [admin-mobile-dark](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/admin-mobile-dark.html>)

### superadmin.html

- **accessibility: Buttons do not have an accessible name** (superadmin-mobile-light, superadmin-desktop-light, superadmin-mobile-dark).
  - "div.lg:col-span-2 > div.hi-wrap-actions > div.flex > button.w-8" — selector: `div.lg:col-span-2 > div.hi-wrap-actions > div.flex > button.w-8`; Fix any of the following:   Element does not have inner text that is visible to screen readers   aria-label attribute does not exist or is empty   aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty   Element has no title attribute   Element does not have an implicit (wrapped) <label>   Element does not have an explicit <label>   Element's default semantics were not overridden with role="none" or role="presentation".
- **accessibility: Heading elements are not in a sequentially-descending order** (superadmin-mobile-light, superadmin-desktop-light, superadmin-mobile-dark).
  - "Server Uptime" — selector: `div#view-dashboard > div.grid > div.bg-white > h3.text-slate-600`; Fix any of the following:   Heading order invalid.
- **seo: Document does not have a meta description** (superadmin-mobile-light, superadmin-desktop-light).
- **accessibility: Background and foreground colors do not have a sufficient contrast ratio.** (superadmin-desktop-light).
  - "Connected" — selector: `div.bg-white > div.space-y-4 > div.flex > span#status-db`; Fix any of the following:   Element has insufficient color contrast of 2.53 (foreground color: #10b981, background color: #ffffff, font size: 10.5pt (14px), font weight: bold). Expected contrast ratio of 4.5:1.
  - "Connected" — selector: `div.bg-white > div.space-y-4 > div.flex > span#status-api`; Fix any of the following:   Element has insufficient color contrast of 2.53 (foreground color: #10b981, background color: #ffffff, font size: 10.5pt (14px), font weight: bold). Expected contrast ratio of 4.5:1.

[superadmin-mobile-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/superadmin-mobile-light.html>) · [superadmin-desktop-light](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/superadmin-desktop-light.html>) · [superadmin-mobile-dark](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/superadmin-mobile-dark.html>)

## Archived prototypes — not supported standalone pages

| File | Mobile performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| register.html | 77 | 64 | 88 | 80 |
| municipal.html | 85 | 87 | 100 | 90 |
| admin-approval-dialog.html | 81 | 47 | 92 | 80 |

`legacy/README.md` already identifies registration and approval as fragments and municipal as a disconnected sample Mayor prototype. Missing document titles, language, doctype/charset, main landmark, select labels and small click targets in the fragments are expected standalone limitations, not regressions in the supported Admin/registration workflow. The municipal prototype flags contrast and heading hierarchy. The registration fragment also produced a favicon.ico 404. Do not deploy these as completed pages.

[legacy-register](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/legacy-register.html>): document-title, html-has-lang, select-name, landmark-one-main, doctype, charset, errors-in-console, document-title, meta-description

[legacy-municipal](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/legacy-municipal.html>): color-contrast, heading-order, meta-description

[legacy-admin-approval-dialog](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/legacy-admin-approval-dialog.html>): document-title, html-has-lang, select-name, target-size, landmark-one-main, doctype, charset, document-title, meta-description

## Public Azure login — mobile

Scores: performance **66**, accessibility **94**, best practices **100**, SEO **82**.

- First Contentful Paint: 4.0 s.
- Largest Contentful Paint: 7.1 s.
- Total Blocking Time: 30 ms.
- Cumulative Layout Shift: 0.
- Initial server response time was short: Root document took 350 ms.
- Avoids enormous network payloads: Total size was 1,314 KiB.

The report flags an approximately 489,716-byte, 1254×1254 PNG logo displayed at a much smaller size, with roughly 474 KiB estimated image savings. Render-blocking resources have an estimated 2,330 ms saving opportunity. These estimates are not additive or guaranteed. Root-document response was about 350 ms; the audit does not show a server-memory shortage. The public result measures only Login; live signed-in portal loading was not audited.

[azure-login-mobile](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/azure-login-mobile.html>)

## Superadmin desktop repeat

The initial score was **60** (1,340 ms blocking time); a separate authenticated repeat scored **100**, with **0 ms** blocking time. This variability prevents treating one performance score as a stable baseline. Preserve both reports and recheck under controlled conditions before deciding on a larger VM.

[superadmin-desktop-repeat](<C:/Users/User/Downloads/Final proj/proposal/analysis/lighthouse-20261004/superadmin-desktop-repeat.html>)

## Limits and next steps

The initial visible page/dashboard was audited. Hidden tabs, popup forms, registration/recovery states, every table page and chart canvas labels were not exhaustively assessed. Lighthouse cannot validate database correctness, authorization across roles, forecast accuracy, email delivery or defense-day concurrent capacity. The four dark reports cover accessibility only, not dark-mode performance. Canvas/chart accessibility also needs manual review.

Recommended order: optimize the live login logo/loading, profile BHW/MHO startup work, fix named contrast/label/heading issues, then rerun the same audits. No fixes were applied as part of this request.

Method references: [Google Lighthouse](https://github.com/GoogleChrome/lighthouse) and [Google authenticated-page recipe](https://github.com/GoogleChrome/lighthouse/blob/main/docs/recipes/auth/README.md).
