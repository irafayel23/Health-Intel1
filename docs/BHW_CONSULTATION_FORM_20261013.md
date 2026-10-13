# BHW disease-case and consultation form

Updated locally on 13 October 2026. This change follows the requested fields from the photographed Individual Treatment Record while keeping the application focused on human disease records. Azure has not been updated in this change.

## Form and required fields

1. **Patient details:** Family name first, First name, optional Suffix (None, Jr., Sr., I–X), numeric birthdate with persistent MM/DD/YYYY guidance, age calculated on the consultation date, and Purok / zone. The BHW's assigned barangay remains enforced by the server.
2. **Consultation details:** Required mode (Walk-in, Visited, Referral) and nature (New consultation/case, New admission, Follow-up visit); consultation date and optional time entered using hour, minutes, and AM/PM.
3. **Measurements:** Required Blood pressure (mmHg), Temperature (°C), Height (cm), and Weight (kg), following the user's subsequent requirement. The BHW API refuses a missing consultation object or a blank measurement. Older stored blanks remain unknown, not zero. Numeric format, positive values, decimal precision and broad storage bounds are validated. These checks do not diagnose a disease, classify clinical risk, or establish normal clinical ranges.
4. **Disease and notes:** Reported disease/condition for a new case, recorded severity, and optional symptoms/remarks. The existing unlisted-condition review remains available.

Referral shows Referred by (optional) and Reason for referral (required for Referral). Changing the mode away from Referral prevents stale referral text from being stored. The required fields above are application workflow choices, not a claim that an official agency mandates every field. The appropriate local health office can review these choices.

The broad consultation-purpose list (family planning, prenatal care, immunizations, injuries, etc.) is omitted from this disease-focused form. No new animal-record workflow or automated diagnosis was added. Existing disease registry entries and historical records were not removed.

## Birthdate assistance

- Typing eight digits inserts slash separators into MM/DD/YYYY.
- Letter input is rejected without clearing the entered date.
- Pasting unrelated text leaves the entered date intact.
- The format explanation stays visible below the field even after entry.
- Calendar validation still rejects impossible dates, future dates, dates after the consultation, and unsupported ages. The API stores ISO dates and computes age independently.

## New cases and returning visits

**New consultation/case:** creates one disease case and its first consultation. Its consultation date is the new case date used in existing disease reports.

**Follow-up visit / New admission:** requires an explicitly selected existing disease case. The dropdown matches the patient's first name, family name, suffix and birthdate; the API independently checks those fields and barangay ownership. If the original case is not recorded, encode it as a new consultation/case first. The returning visit must not predate the original case. Archived cases cannot receive new visits.

Returning visits create rows in `case_visits` linked to the original `health_cases.id`. They do not create a second resident or a second disease case, change the original disease date, overwrite its notes/severity, or automatically mark it Cleared. Visit severity and notes are stored with that visit. The existing case-status control remains the explicit way to change case status.

The same case/date/time/nature combination is treated as a possible duplicate. Transaction locks ensure parallel submissions have a single winner. If the audit write fails, the whole visit is rolled back.

Open **Resident Profiles → View Medical Dossier** to see consultation history directly, with admission/follow-up labels, dates/times, transaction modes, measurements, referral details, visit severity and notes. The case reference still has a View visits button. Older cases without structured visits display an honest empty-history explanation.

## Storage and recovery

The explicit migration adds `suffix VARCHAR(20) NOT NULL DEFAULT ''` to `residents` and `health_cases` and creates `case_visits`, indexed by case/date with a foreign key to the disease case. Existing names, birthdates, disease values and counts are preserved. Blank suffixes on historical rows mean the suffix was not separately recorded; the migration does not guess it from names.

Migration command: `node server/scripts/apply-case-visits.js --backup <new private SQL file>` from the project root. The migration saves a private recovery dump first, runs idempotently and verifies fingerprints of all original columns and rows. It does not require the runtime application to hold CREATE/ALTER privileges.

Local backup and original code copies are in the ignored `analysis/bhw-visit-form-20261013/` directory. The SQL dump contains private database content; do not commit or share it. Restore must be reviewed before overwriting any records entered after this backup.

The local API was started with the updated backend. Azure deployment requires a separately reviewed schema migration and code update; the live site's existing database has not been touched.

## Verification

- **128 regression tests passed** after the required-measurement and dossier update, covering new cases/visits, suffix identity, referrals, count preservation, access restrictions, concurrent duplicate submissions, refusal of missing measurements and rollback on audit failure.
- Isolated Chrome checks passed for desktop (1366 px) and phone (390 px), light and dark themes. They exercise the actual form, persistent numeric-date help, time conversion, conditional referral fields, and linked follow-up saves with synthetic responses.
- Disposable MySQL tests verified new consultation storage and the original database's row fingerprints. The local migration separately verified existing original fields unchanged.
- UI screenshots and the check results are retained in `analysis/bhw-visit-form-20261013/`.

This verifies the requested form behavior. It does not claim certification as a complete electronic clinical record system.
