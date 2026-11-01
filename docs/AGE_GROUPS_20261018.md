# Automatic age groups — October 18, 2026

Age groups are derived values, not another editable patient field. This update uses the groups already present in MHO analytics: **0–5, 6–12, 13–17, 18–59 and 60+ years**. These are the project's existing ranges, not a claim of official reporting-standard compliance.

## Behavior

- BHW and MHO case histories display age at the original case date and its age group.
- Consultation histories and BHW View visits display age at each visit date and its age group.
- BHW monthly/surveillance lists include age at case and age group.
- BHW/MHO Today reports group disease cases by original case age and consultations by visit age. Grouping does not change the overall case/visit counts.
- MHO monthly and weekly sample reports include the original-case age group.
- MHO age filters use the same original-case calculation, rather than allowing a stale stored age to override an available birthdate/case date.
- A valid recorded case age can be used for older cases missing birthdate. Unknown, blank, impossible or out-of-range ages remain **Not recorded**. A visit without birthdate does not inherit the original case's age as though it were age at the later visit.

Example: a child born October 17, 2020 has a case on October 16, 2026 and a follow-up on October 17. The case stays age 5 / group 0–5. The return consultation is age 6 / group 6–12. Current resident age is separate from these historical ages.

## Implementation and validation

No database migration or historical-record rewrite is required. Groups are computed from existing data and returned in case/visit API responses. The group policy is defined once in `assets/js/shared/age-groups.js`, with server SQL expressions using those same range definitions.

All **197 backend regression checks passed**. New coverage includes every range boundary, infant age zero, leap-day birthdays, invalid/missing ages, a birthday between visits, BHW/MHO dossier responses, age-filter consistency, monthly/weekly exports and daily case-versus-consultation totals.

Browser checks confirmed the case and consultation labels in BHW and MHO histories. The BHW monthly PDF was downloaded through the browser. BHW monthly, MHO monthly, MHO weekly and Today PDFs were rendered and inspected for legibility and clipping. The preview used only synthetic records and a disposable database; original database preservation is checked on cleanup.

Originally implemented and checked locally. Sex capture is intentionally excluded, as requested by the user because their supplied ITR has no sex field. See the Azure release record for deployment status.
