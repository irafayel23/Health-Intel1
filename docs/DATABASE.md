# Active database schema

Observed from `health_intel` on 27 September 2026. This describes the current database rather than an unimplemented design. Phase 2 preserved all eight table structures. The later QA fixes added two generated columns and two unique indexes; no historical patient data was rewritten.

| Table | Main fields and purpose |
|---|---|
| barangays | id, name, latitude, longitude; configured geographic reference |
| users | system_id PK, first_name, last_name, role, barangay_id, password_hash, status, email, employee_id, created_at, qa_email_key (generated) |
| residents | id PK, first_name, last_name, patient_name, birthdate, age, purok, barangay_id, created_at |
| health_cases | id PK, resident_id, first_name, last_name, patient_name, birthdate, age, purok, disease, remarks, barangay_id, encoded_by, status, severity, date_recorded, created_at, updated_at, deleted_at, is_archived |
| disease_registry | id PK, name, category, classification, status, deleted_at, is_archived, qa_name_key (generated) |
| password_resets | id PK, email, token, expires_at |
| system_audit_logs | id PK, user_id, role, action, details, timestamp |
| predictions | id PK, barangay_id, disease_id, predicted_date, predicted_cases, confidence_lower_bound, confidence_upper_bound, generated_at |

Users have role values `bhw`, `mho`, `admin`, `superadmin`, and status values `pending`, `approved`, `denied`, `suspended`. Cases have status `Active`, `Cleared`, `Deceased`, and severity `Mild`, `Monitored`, `High Risk`. Disease registry category is `morbidity` or `mortality`; classification is a varchar, and status is `Active` or `Archived`.

Barangays: Blumentritt, Salvacion, Minoyan, Caliban, Cansilayan, Alegria and Sta. Rosa.

## Relationships and dates

Users and residents refer to barangays. Health cases refer to barangays, resident profiles and the encoding user. The predictions design refers to a barangay and disease registry ID. Nullable legacy resident links remain possible.

The QA migration generates `qa_email_key = NULLIF(LOWER(TRIM(email)), '')` and `qa_name_key = NULLIF(LOWER(TRIM(name)), '')`. Unique indexes `uq_users_email_key` and `uq_registry_name_key` prevent duplicates regardless of surrounding spaces or letter case, using the installed table collation. Null/blank legacy emails are allowed. Applications never supply generated values. Archived disease names remain reserved; restore an existing category rather than creating a second copy. The migration first checks for duplicates and stops for review if any exist.

`date_recorded` is the case date used for monthly aggregation. `created_at` is the time the database row was inserted and may reflect an import rather than disease occurrence. New BHW encoding requires a valid case date and explicit severity. Case age is calculated at that date; a newly created resident profile age is calculated for today. Existing resident ages are stored values and may become stale.

New case creation checks matching names, birthdate, disease, date and barangay for possible duplicates. Resident linking additionally matches purok and refuses multiple matching profiles. This is conservative matching, not a guaranteed unique person identifier. Old cases with missing resident links remain unresolved and require reviewed source matching.

## Review and security

The 30 September disease-review migration adds nullable `disease_id` (foreign key to the registry), `disease_review_status` (Recorded/Pending/Clarification/Reviewed), `disease_reported`, `condition_source`, `disease_review_note`, `disease_reviewed_by` and `disease_reviewed_at`, plus a queue index. Existing cases retain their original fields and Recorded state; old names are not automatically mapped. New active-catalog selections store a registry ID. Unlisted cases retain the reported wording/source while using Pending classification for aggregates until MHO review. See [DISEASE_REGISTRY.md](DISEASE_REGISTRY.md).

Historical disease strings still do not all match registry names. Historical names remain in saved cases and reviewed corrections, but new encoding uses active catalog names or the unlisted-condition review path. The preparation CLI requires active disease names or explicitly reviewed aliases for its monthly preview. It never rewrites historical names.

The case table still has no real/synthetic provenance field. Separate preparation outputs record source type, source reference and input SHA-256; these are not migrations or independent proof of authenticity.

Password reset `token` now holds `v1:<HMAC-SHA256>:<failed-attempt-count>`; the emailed six-digit code is not stored in plaintext. Expiry remains in `expires_at`. The format fits the existing varchar(255), so no column change was needed. Audit entries are application logs rather than a tamper-proof database ledger.

The predictions table is currently unused by the live forecast endpoint. Reliable future forecast tracking also needs model version, training cutoff, source snapshot and forecast horizon; that migration is deferred.

## Audited case correction (27 September 2026)

No tables or columns were added in this batch. Authorized corrections update only `health_cases.date_recorded`, `disease`, `severity` and `age`. A `Case Corrected` audit entry stores JSON with `case_id`, `reason`, `before` and `after`; each value snapshot contains these four fields. Admin and Superadmin audit screens display readable differences and escape their text. Saving the case and audit entry is atomic; an audit failure rolls back the change.

Corrections lock the barangay before the case, check for duplicate resident/disease/date combinations (including full-name/birthdate matches), and compare a version hash to reject stale edits. They never populate a missing resident link or guess an absent birthdate/case date. Existing notes and status remain intact. Cases with insufficient identity information need reviewed source matching before date or disease correction. These checks support record review; names and dates do not guarantee unique personal identity.
