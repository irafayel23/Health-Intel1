# Resident death reporting and confirmation

Implemented locally on 14 October 2026. Azure deployment and GitHub publishing are not part of this change.

## Where to use it

- BHW: Resident Profiles → View Medical Dossier → Report deceased. Enter the reported date if known and a required source/reference. The report remains pending until MHO reviews it.
- MHO: Resident Status in the sidebar, below Disease Review. Review pending reports and confirm or reject them with a required reason. Filter by barangay and switch to confirmed deceased residents.
- MHO: Correct status allows correcting a death date or removing an incorrect confirmation. The reason is required and recorded in the audit history; stale corrections are rejected.
- BHW: Resident Profiles has All, Living, and Deceased filters. Living means not confirmed deceased, including reports still pending review.
- MHO: Export confirmed residents creates an academic sample PDF with one entry per resident ID, distinct from case-outcome statistics.

## Record behavior

Confirmation preserves resident profiles, disease cases, consultations, and prior case outcomes. Archive remains a separate action. Existing case-level Deceased outcomes do not automatically become confirmed resident deaths, and a confirmed resident death does not establish its cause.

After confirmation, new cases, follow-ups, admissions, and changes to consultation dates are rejected if dated after the death date. Historical records on or before a known death date remain permitted. If the death date is unknown, further visit entry is blocked until MHO records a date; the system does not invent one.

The directory shows age at death when both dates are valid. It shows no calculated age when a confirmed deceased resident has an unknown death date or missing birthdate. Existing consultations are not rewritten when a death is confirmed or corrected.

Identity checks cover exact family name, first name, suffix, birthdate, and barangay, ignoring purok so changing purok cannot bypass a confirmed death. This does not merge duplicate resident profiles or establish identity across barangays. The registry counts resident IDs once; existing duplicate profiles require a separate identity review.

## Database and recovery

Two new tables were added: `resident_death_reports` for reporting/review history and `resident_vital_status` for the current confirmed status. Run `node scripts/migrate-resident-vital.js` from `server/` when installing this code against another database. The migration is idempotent and does not backfill from disease case outcomes.

The local migration verified that all pre-existing table rows were unchanged. Its pre-migration schema and row fingerprints are stored in `analysis/resident-vital-20261014/pre-migration-schema.json`; this is verification metadata, not a database backup. Before-edit source copies are in `analysis/resident-vital-20261014/before/`.

Do not drop the new tables after users start entering reports; they contain review and correction history. Retention decisions remain subject to the project's approved record policy.

## Validation

- Full automated suite: 139 tests passed, including six new database integration tests using a disposable database.
- Follow-up portal/UI regression checks: 29 passed after the final age-display adjustment.
- Headless Chrome: four desktop/phone and light/dark combinations passed reporting, pending status, history preservation, filters, MHO confirmation/correction/reversal, required reasons, export invocation, and overflow checks. Synthetic fixtures were used; screenshots are in `analysis/resident-vital-20261014/`.
- Age boundary checks: age at death, unknown death date, and missing birthdate passed.
- Synthetic PDF: 35 residents rendered across three pages with repeated headings and all entries retained.

Role restrictions, BHW barangay scope, duplicate/concurrent reports, concurrent confirmation, rollback on audit failure, stale corrections, historical visit rules, and preserved source-database fingerprints were checked in the new integration tests.
