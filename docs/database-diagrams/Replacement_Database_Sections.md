# Replacement wording for the manuscript

## Database Architecture

The database architecture of HEALTH-INTEL organizes information into connected tables for user accounts, barangays, residents, disease cases and consultation visits. Each resident has a unique profile and may have several disease cases. Each disease case may have several consultation records, including the initial consultation, an admission or a follow-up visit. This structure allows the system to preserve a patient's history without counting every return visit as a new disease case.

The barangays table stores the configured geographic areas, while users stores account information, assigned roles and access status. The residents table stores patient identity and location information, including the birthdate. The health_cases table stores the disease case, original case date, recorded severity and case outcome. The case_visits table stores each encounter's date, measurements, notes and advised follow-up plan.

The disease_registry table provides standardized disease names. Disease review information is recorded with the related health case. The resident_death_reports table stores reports submitted for review, while resident_vital_status stores the resident's current confirmed status. This separates a resident's confirmed death from an individual disease case marked Deceased. The system_audit_logs table records important user actions for traceability.

These tables are connected using primary keys and the declared foreign keys shown in the detailed schema. Some account identifiers are linked through application logic rather than database-enforced foreign keys. Supporting tables manage password resets, login limits and session security. Passwords are stored as bcrypt hashes rather than readable or reversibly encrypted passwords.

Suggested caption: Figure [your next figure number]. HEALTH-INTEL Database Architecture.

## Database Schema

The database schema presents the current table names, column names, data types, keys and relationships used by HEALTH-INTEL. The main clinical relationship is residents.id to health_cases.resident_id, followed by health_cases.id to case_visits.case_id. A follow-up or admission creates another visit under the selected original case. The diagram uses birthdate for the date of birth and password_hash for the stored password hash. The current resident form and schema do not contain a sex or gender field.

The health_cases table uses Active, Cleared and Deceased as case outcomes, and Mild, Monitored and High Risk as recorded severity values. These values serve different purposes and are not interchangeable. The disease_registry table is linked to a case through disease_id. Death-review records are linked to the resident, with resident_vital_status maintaining at most one current status row for each resident.

The detailed schema also includes the supporting authentication and session tables. The existing predictions table is shown as a legacy structure because the current demonstration forecast is returned by the forecasting request and is not saved into that table by the current route. Its presence must not be presented as evidence of stored or validated forecasts.

Suggested captions: Figure [your next figure number]. HEALTH-INTEL Core Database Schema. Figure [your next figure number]. HEALTH-INTEL Review and Audit Schema. Figure [your next figure number]. HEALTH-INTEL Supporting Database Schema.

## Insertion guide

- Pages 41-42: use 01_database_architecture.png and the Database Architecture wording above.
- Page 49: use 02_physical_schema_core.png; add 03_physical_schema_review.png and 04_physical_schema_support.png on following pages or in the database appendix so the diagram remains readable.
- PNG images are high-resolution versions for Word. SVG files and the Mermaid .mmd source are editable. The PDF retains vector text for printing and zooming.
- Schema source: local MySQL metadata checked on 19 October 2026, compared with current application migrations and handlers. No patient rows were read. This check did not independently introspect Azure; recheck a changed deployment before claiming its physical schema is identical.
- Diagram legend: PK primary key; FK declared foreign key; UK unique key; N nullable. Full ENUM values appear below the relevant schema. Columns such as qa_email_key and qa_name_key are retained because they are part of the actual schema, not ordinary form inputs.
