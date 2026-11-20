# Profile chart fit and Predictions card polish

1 November 2026 — CODEX-1. Local frontend only; Azure unchanged.

## Final changes

- Removed Municipal Analytics chart-card stretching with `items-start` on the profile grid. Moved the factual Recorded-case summary out of the narrow descriptive aside and below both columns. Retained all descriptive findings and IDs; no Analytics recommendations added.
- Top-disease canvas labels are black in light mode with medium500 lettering at the existing size. Other charts retain their previous colors/weights; dark text colors stay light. No global font enlargement.
- Redesigned Forecast Summary with a stronger teal estimate surface, a model badge, distinct selected-scope/previous-count/change fields, and a concise About the estimate area. Kept the real uncertainty and annual-evidence note visible as applicable. Fixed singular change label e.g. +1 case; calculations remain unrounded.
- Redesigned Automated Recommendations into compact action cards with an index, clear heading, responsible-team strip and readable action text. Per latest owner request, removed the visible Why this is suggested block and guideline link. Rule reasons and sources remain in the policy helper and prior guidance report; no recommendation-selection change.
- Replaced repeated synthetic wording in summary, tooltips/accessible chart labels and footer. One visible, accurate source note states Generated demonstration counts, not actual patient records, followed by the historical cutoff. The interface does not claim generated data are real patient records. Underlying provenance/model/results unchanged.
- Existing vanilla/Tailwind setup retained; no new dependencies. Summary/recommendation body typography changed only within these requested cards, not other portal pages/forms. Main estimate size and chart size retained.

## Design references

- [USWDS cards](https://designsystem.digital.gov/components/card/): clear headings, grouped related content and appropriate reading hierarchy.
- [NHS cards](https://service-manual.nhs.uk/design-system/components/card): simple, readable content grouping.
- [WCAG contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html): normal-text contrast guidance. Selected colors and actual display inspected; this is not a complete WCAG certification.

## Changed application files

- mho.html
- assets/js/shared/chart-theme.js (profile canvas text only)
- assets/js/mho/mho-forecast.js (card renderer and display wording)
- assets/js/mho/sarima-presentation.js (summary wording and singular unit only)
- assets/css/mho/mho-utilities.css (existing Tailwind build)
- This new report and shared CODEX logs.

## Actual verification

73 focused regressions passed; zero failed/skipped, including all70 saved-current selections and preserved historical display fixtures. JavaScript syntax checks and existing Tailwind build passed. The optional stale Browserslist database warning was not acted on. Independent chart-plugin check verifies black500 labels retain12px and other chart colors/weights are unchanged.

In the signed-in local MHO tab, measured chart440px/card547px with17px normal bottom space; summary below profile columns and no page overflow. Verified new saved Cough/Salvacion result, summary, responsible-team/action cards, zero source links and no reason block. Saved original values remain about4 cases, previous3, +1 rounded case/+24.2% unrounded-based change. Source note identifies demonstration counts once. No captured console warnings/errors.

Narrow viewport override390x844 gave actual433x938CSSpx at the user's existing zoom: no horizontal page overflow, cards stack. Dark mode checked with light action text; restored light mode and original viewport. Current screenshots: analytics-fit.png, forecast-summary.png, recommendations.png, recommendations-mobile.png and recommendations-dark.png in the external profile-chart-fit-20261101 workspace. Screenshot cropping reflects the current browser window, not a complete-page screenshot. Old forecast-summary.png may show the pre-singular-correction '+1 cases' because it was captured during implementation; use the final browser or recommendations screenshot for current wording.

Frozen combined CSV/snapshot/manifest SHA-256 hashes unchanged. Model/backend/deployment source unchanged; no patient writes or retraining. Earlier UI work retained. main/e5946d4 unchanged; no Git staging/commit/push or Azure operation. Local server74535 remains running.

## Recovery

External before checkpoint profile-chart-fit-20261101/before. Revert only this task's scoped hunks after checking for newer work; do not reset the checkout. Restore backed-up HTML/renderers/theme and MHO CSS together if rolling back. Preserve previous recommendation policy and shared history.
