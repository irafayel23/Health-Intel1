# Replacement wording after normalization

This wording describes the database implemented locally and deployed on Azure as of 19 October 2026. The Azure migration and 40 live smoke checks passed. Do not describe the earlier proposed 16-table diagram as the implemented schema. The original manuscript has not been edited.

## Database Architecture

The database architecture of HEALTH-INTEL organizes information into related records for barangays, user accounts, residents, disease cases, consultation visits, disease categories and review processes. Resident profiles, disease cases and consultation visits are stored separately. One resident may have several disease cases, and each case may have several consultation visits. This structure allows an admission or follow-up visit to be recorded without creating another disease case.

The barangays table stores the configured geographic areas. The users table stores account information, assigned roles, access status and password hashes. The residents table stores current resident identity and residence information. The health_cases table stores the disease episode, resident and disease references, case date, recorded severity, outcome and record-management information. Case-time location is stored in case_locations rather than treated as a duplicate of the resident's current address.

The disease_registry table maintains standardized disease names and catalog metadata. Case-specific reported wording, source and MHO review information are stored in case_condition_reviews. The case_visits table stores consultation dates and times, visit nature, referrals, measurements, encounter severity, notes and advised follow-up plans. Full names and ages based on valid birthdates are calculated when information is retrieved; age is calculated for the relevant case or consultation date.

Historical records that lack a verified resident link or catalog mapping retain their available source information in case_source_records. This also preserves historical identity differences and reported ages where birthdates are unavailable. The migration does not invent missing birthdates, assign unverified diagnoses or combine uncertain resident profiles. Independently recorded source names and reported ages are distinguished from calculated current profile values.

The resident_death_reports table stores death reports for review, while resident_vital_status maintains the current reviewed status for each resident. These records are separate from a disease case marked Deceased and do not establish a verified cause of death. The system_audit_logs table records important activities. Supporting tables manage password recovery, session invalidation and login restrictions. Passwords are stored as bcrypt hashes.

Primary keys identify individual records, and declared foreign keys associate related tables. Some account references remain application-managed and are not shown as database-enforced relationships. The database read views combine related information for the application without storing additional editable copies of resident identity or catalog disease names in health_cases.

## Database Schema

The implemented schema contains eighteen physical tables and two read views. The health_cases table has twelve columns and references the related resident and disease category. The case_locations, case_condition_reviews and case_source_records tables hold case-time location, condition-review information and necessary historical source facts. The normalization_migrations table records the installed migration version. Supporting authentication, audit, resident-status and existing prediction structures are also represented in the detailed schema.

The case_records and resident_records views provide derived names, ages and related information in the response format used by the application. They are retrieval structures rather than additional physical patient-record tables. The generated catalog archive flag and generated lookup/index fields are derived projections. The predictions table is retained as an existing legacy structure; its presence does not mean that the current forecasting endpoint saves its outputs there.

The normalized clinical design applies First Normal Form through separate rows and scalar fields, Second Normal Form through dependence on complete keys, and Third Normal Form through the separation of resident identity, catalog descriptions and disease-episode facts. Historical snapshots and original reported wording represent source facts associated with their recorded cases, rather than independently editable copies of the current resident profile or catalog name. These meanings must be maintained when records are corrected or extended.

Suggested schema caption: Figure X. HEALTH-INTEL Normalized Database Schema.

Use Implemented_Normalized_Database_Schema.png for the detailed schema. The older Database_Schema_Unified.png represents the retained pre-normalization source, while Proposed_Normalized_Schema_ERD.png represents the earlier design proposal.
