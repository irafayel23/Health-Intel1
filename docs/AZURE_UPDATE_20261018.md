# Azure update — 18 October 2026

The user requested deployment of the completed local updates and explicitly excluded sex capture because their supplied ITR has no sex field.

## Included
- Simplified Admin Disease Catalog; name-only creation, archive/restore and duplicate feedback.
- Automatic age groups in case and visit histories, analytics and reports.
- BHW/MHO daily report date selection with Philippine-day defaults and future-date rejection.
- Clean Municipal Analytics layout with filters above totals, horizontal top-disease bars, short summaries, annual/monthly trend line, deceased-case donut and accessible table alternatives.
- Retained grouped disease comparison: All Years displays all available recorded years; one selected year compares with its preceding year. Current calendar year is labeled YTD and partial-year limits are explained. On narrow screens the comparison chart scrolls inside its card.

No database schema migration, local patient-data upload, account changes or sex field is part of this release.

## Deployment and preservation
The initial release updated 30 files and verified all 141 runtime hashes through Azure Run Command. The app's database fields and private settings were fingerprint-checked unchanged; an encrypted VM recovery backup and rollback files were retained. The running service passed its health check. A separate small release adds the multi-year comparison after the user requested that it remain alongside the line graph.

SSH from this PC timed out. A fresh encrypted PC backup was instead completed through the existing authenticated HTTPS backup endpoint. The saved archive, SHA-256, AES encryption flag and password authentication were verified. No firewall or network-access rules were changed; the scheduled SSH backup path still needs connectivity diagnosis.

## Validation
- Full local regression after the comparison addition: 204 passed, 0 failed.
- Initial live release: 32 checks passed, 0 failed, with no patient writes. Covers public asset hashes, BHW/MHO/Admin sessions, catalog availability, annual/monthly trend agreement, age groups, daily PDFs, invalid/future dates, role isolation and logout replay.
- Local visual checks covered comparison years 2023–2026, year-pair mode and a 390px viewport. The chart itself scrolls; the document stays 390px wide. This is not a physical-phone certification.
- Local preview used disposable synthetic records; cleanup verified the original local database unchanged.

Private manifests, results and screenshots are retained under analysis/azure-update-20261018/ and analysis/azure-comparison-20261018/, excluded from Git publication. The final comparison-release result and live checks are recorded there after completion.

## Final result

The comparison addition deployed successfully: six files updated and all 141 runtime hashes verified. Both releases preserved database fields and private settings, retained verified encrypted recovery backups and passed the service health check. Final live verification passed 21 of 21 checks, including all available comparison years, year-pair mode, annual/monthly agreement, BHW/MHO daily PDFs and access isolation. No patient records were written by these checks. Browser verification confirmed CY 2023, CY 2024, CY 2025 and CY 2026 YTD in the live chart and table. The deceased-case panel remains empty when no matching Deceased case outcomes exist.

## Latest analytics controls and colors

Deployed the five-file local MHO follow-up on October 18, 2026 through Azure RunShellScript in a dedicated Brave tab. Includes the restored Epidemiological Health Profile and full descriptive summary, donut center count, removal of visible table/count expanders, independent All available years / Choose years controls, calendar-total / equivalent-date comparison, and purple 2025 bars with blue 2026 bars. Screen-reader chart data remains available. Preview-only dummy data and proposed barangay/age breakdown panels were not uploaded.

Five files updated; all 141 runtime hashes verified. Digest: `9c0c3425cf71d139f3813e9bf078cf7e79b7f2ff08beba99ebab16a4181db677`. The service health check passed, existing database fields and private settings were preserved, and an encrypted recovery backup was verified. No schema migration, account changes, firewall changes or local patient-data upload occurred.

Live verification: 14 passed, 0 failed. Checks cover public asset hashes, existing MHO/BHW demo sessions, all years, nonadjacent selected years, global-year independence, the Philippine same-date cutoff, invalid/future/duplicate year rejection, BHW access isolation, existing analytics panels and verification-session logout. No patient records were written. Browser inspection confirmed the new controls and purple/blue bars on the live page.

Private result, manifest, verification log and screenshot: analysis/azure-analytics-controls-20261018/. Recovery files: `/home/azureuser/azure-sync-release-1792324148097`. SSH still timed out; this release used the existing Azure VM agent without widening network access.

## Breakdown, findings and sample graphs

The remaining mockup features were implemented locally and deployed to Azure: Barangay / Age group breakdown tabs and descriptive findings for disease, barangay, known age group and peak month. A labeled Show sample data switch populates all analytics charts using consistent display-only fictional values. It does not insert patient records, change reports, or affect predictions. Recorded-data mode remains the default. See ANALYTICS_BREAKDOWN_20261018.md.

Seven files updated; all 142 runtime hashes verified. Digest: `28b1da5e7678ad06a7285c3e72cd32d9767e61ca845dd05ab97430bb8b248582`. Encrypted recovery backup, existing database fields, private settings and service health all verified. 31 targeted local checks and 18 live checks passed. Private evidence: analysis/azure-breakdown-20261018/. Recovery: `/home/azureuser/azure-sync-release-1792325413307`.
