# Follow-up plans — 16 October 2026

BHW and MHO can record an optional **Next follow-up date** and **Follow-up instructions** in Disease and visit notes, for a new case, admission or follow-up. The date may be in the future but cannot precede that consultation. Instructions accept up to 2,000 characters, including line breaks. Either field can be left blank independently.

These fields copy advice given by the attending health professional. They do not book an appointment, send reminders, change case status or confirm that a return visit happened. A later return is recorded as a separate consultation against the original case. Each consultation retains its own plan; opening a fresh consultation does not copy earlier advice.

Plans appear in the BHW resident dossier, per-case View visits, and the MHO Patient Directory consultation history. Older visits show that no plan was recorded; no advice or dates are inferred. History text is escaped before display.

## Database update

The existing `migrateCaseVisits` migration adds nullable `case_visits.next_followup_date DATE` and `case_visits.followup_instructions VARCHAR(2000)`. It is safe to run repeatedly and preserves existing fields and rows. Dates return as `YYYY-MM-DD` strings, avoiding timezone conversion. Saving the consultation, plan and audit remains one transaction. Existing role and barangay restrictions apply.

Back up first, then run the existing private-backup migration command:

```powershell
cd server
node scripts/apply-case-visits.js --backup <new-private-backup-path.sql>
```

Apply the migration before starting the updated backend. The Azure deployment workflow creates an encrypted recovery backup, runs the migration twice and verifies all original database fields before restarting the service. It does not upload the local database.

## Verification

Regression tests cover initial and returning consultations, invalid and earlier dates, independent optional fields, multiline instructions, separate plans in BHW/MHO history, date-only responses, repeated migration, escaped history text, preserved original cases/residents, and rollback/access controls. Browser checks use a disposable synthetic database and exercise both roles, blank fresh forms, saving, history and light/dark rendering.

Local migration was verified against a private backup restored into a disposable database; every original row and field matched. Azure deployment updated ten runtime files and verified parity across all 133 runtime files, with an encrypted recovery backup, preserved original database fields and healthy services. No local patient database was uploaded.
