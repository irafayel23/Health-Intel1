# Disease and original-case dropdowns — 15 October 2026

## Disease choices

BHW and MHO disease controls initially show up to ten active catalog diseases with recorded cases, ordered by case count, then name for ties. BHW ranking uses only the signed-in user's assigned barangay; MHO ranking uses the municipality. Counts use disease cases rather than consultations, include historical archived cases, and exclude conditions awaiting classification or clarification. Archived catalog categories remain unavailable for new encoding.

The menu shows recorded counts and rank. **Show all** exposes the complete active catalog. Typing searches the full catalog even when a disease is outside the first ten. With no recorded cases in scope, the menu shows available catalog choices without inventing a frequency rank. Opening a searchable control and typing, or typing while its trigger has focus, filters the choices; Enter selects the highlighted choice.

Choosing **Condition not listed — submit for review** after typing carries the query into the editable reported-condition field. A source/reference is still required. Existing validation saves the case as pending MHO review; typing does not add a catalog category or establish a classification automatically.

## Returning visits

Original-case options show disease and current case status, followed by an explicit **Case ID**, **Original case** date and **Last consultation** date. Missing structured consultation history is labeled Not recorded, rather than substituting a guessed visit date. Case ID, disease and displayed dates are searchable.

Multiple matching cases remain unselected in the general BHW/MHO forms. The explanatory text asks the user to compare the cases; selection updates the summary with the exact case reference. The resident-history shortcut retains its intentional preselection of the case the user opened. Existing identity, date, archive, deceased-resident and role checks remain enforced. MHO matching now excludes cases newer than the selected consultation date, consistently with saving and BHW filtering.

Latest consultation metadata is calculated from the existing indexed case visits. No new tables or stored patient fields are required. Ranking queries use bound barangay parameters and aggregate names separately from the catalog, avoiding text joins across potentially different MySQL collations.

## Verification and deployment

- **164 full regression tests passed**, zero failures; focused disease/matching suite: **17 passed**.
- Added integration coverage for top-ten ranking, full catalog retention, BHW versus municipal counts, cross-barangay denial, exclusion of pending/archived catalog conditions, consultation counts not inflating case rankings, multi-case summaries and date-only latest-visit metadata.
- Browser verification used a disposable synthetic database. Both roles showed ten ranked choices plus the unlisted option; Show all exposed the full catalog. Typing found diseases outside the top ten, keyboard selection worked, and an unknown typed condition saved as pending MHO review.
- Two same-patient, same-disease cases showed different original dates/statuses and real or missing last-consultation dates. Neither was automatically selected. Case-ID search and selected-case summaries worked.
- Dark mode and 390×844 phone checks passed for the case and disease menus, with no console errors. Temporary databases were removed and original local records passed preservation checks.
- Deployed nine runtime files to Azure. All **133 runtime hashes** matched, the encrypted recovery backup verified, existing database fields/rows were preserved and private configuration was unchanged.
- **17 live checks passed**, covering updated public assets, both demo sessions, scoped ranking metadata, role boundaries, case/dossier/matching metadata and logout replay rejection. Live verification did not add or change patient records.

Private verification artifacts and screenshots are retained under the ignored `analysis/disease-case-choices-20261015/` directory. No local database or private credentials were uploaded to GitHub. The two profiles with unverified conflicting birthdays remain separate.
