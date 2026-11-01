# Clinical database normalization - 19 October 2026

## Status

Implemented and activated locally using a verified database copy, then deployed and verified on Azure on 19 October 2026. The former local database is retained as a recovery source and a read-only template for disposable integration fixtures. Azure was updated through the existing signed-in portal's VM Run Command after browser control recovered; SSH remained unavailable.

The local application is available at http://127.0.0.1:3000. The original manuscript was not edited.

## What changed

- `health_cases` decreased from 27 physical columns to 12: id, resident_id, disease_id, remarks, encoded_by, status, severity, date_recorded, created_at, updated_at, deleted_at and is_archived.
- `case_locations` stores the location recorded for the case. This is distinct from a resident's current address.
- `case_condition_reviews` stores the original reported condition/source and case-specific MHO review state, notes, reviewer and review time.
- Resident identity is read through `resident_id`; full names and known-birthdate ages are derived in read views. Residents retain a separately named `reported_age` only when birthdate is unavailable, and `source_name` only for an independently recorded name that cannot be reconstructed from its parts.
- Catalog disease labels are read through `disease_id`. Original unmapped labels are retained as historical source facts; the migration does not silently assign a diagnosis or add a catalog entry.
- `case_source_records` preserves otherwise-unlinked or differing historical identity, reported age without birthdate, independent recorded name and legacy condition labels. It is not a duplicate-resident merging mechanism.
- The catalog archive flag is a generated projection of catalog status, rather than a second independently editable status value.
- `case_records` and `resident_records` are read views. They restore the API field names used by matching, directory, follow-ups, analytics, maps and reports. They do not reintroduce those columns as independently stored case facts.
- The database facade reads those views and translates the application's parameterized clinical writes into transactional writes to the physical tables. Unsupported write forms fail closed.
- A migration marker records the installed schema version. An interrupted DDL migration is not automatically retried: restore the recovery source first.

## Preservation evidence

The source has 2,175 cases, 1,087 residents and zero structured visits. There are 2,165 unlinked legacy cases, 2,070 cases with age but no birthdate, and 1,077 residents with age but no birthdate. Therefore the earlier 16-table proposal was insufficient as a lossless migration plan. The implementation has 18 physical tables, including the source-record and migration-metadata tables, plus two read views.

The verified copy retained the case/resident/visit counts and 2,165 necessary identity snapshots. Six before/after comparisons checked identities, dates, disease labels, case outcomes, severity, location, encoder/review details, monthly/disease/barangay totals, visits and reported ages without birthdates. The original source fingerprint stayed unchanged during copying and migration.

Calculated ages can differ from stale stored values when a valid birthdate is present. Known-birthdate case age uses the case date; visit age uses its consultation date. An undated reported age is preserved as reported information, not represented as a newly verified current age. No unknown birthdate or resident link was invented. No people were merged.

## Normal-form interpretation

The normalized clinical design follows 1NF (separate rows and scalar fields), 2NF (facts depend on their complete keys), and 3NF (resident identity and catalog descriptors are not copied into the case entity). Candidate dependencies include:

| Relation | Main dependency |
|---|---|
| residents | id -> current identity, residence and independently reported source facts |
| disease_registry | id -> catalog name, category, classification and status |
| health_cases | id -> resident/catalog references and episode facts |
| case_locations | case_id -> case-time barangay and purok |
| case_condition_reviews | case_id -> current review state and original reported wording/source |
| case_visits | id -> case reference and encounter facts |
| case_source_records | case_id -> preserved historical source facts for that case |

Case-time address, historical source identity, actor role at the time of an audit event, and undated reported age are different facts from current profile values. They are not presented as additional current sources of truth. Calculated API fields and generated lookup/index fields are projections. Having foreign keys is not itself proof of normalization; the meanings and dependencies above are part of the design rationale. Existing security, audit and unused prediction structures were retained; their retention does not validate a forecasting model or make logs tamper-proof.

## Validation

`npm test` completed with **219 passing tests** and zero failures, including eleven integration tests for the normalized schema. The scenarios cover idempotence, preserved legacy dossiers, catalog encoding, matching identity/date behavior, follow-up/admission counts, clarification and MHO classification, correction, case/catalog archive/restore, analytics/maps/follow-up reads, daily/monthly/weekly PDF exports, and twenty concurrent normalized saves. Twenty requests produced twenty cases and twenty initial visits. These are local results, not Azure capacity measurements.

The forecast-capacity test fixture was updated to recognize the already-existing analytics sample dependency; no forecast model was changed.

Azure uses MySQL text defaults that differ from the original tables. The first live migration encountered a collation conflict and automatically restored its original database and code; the recovery health check passed. The migration now explicitly retains each moved text column's original character set and collation. A disposable local fixture with a deliberately different database default passed all eleven normalized workflow tests after this fix. An isolated Azure clone was verified before migration, then all six before/after comparisons passed.

The successful Azure release preserved **1,154 cases, 1,154 residents and four visits**, including the compared identity, condition, location, review and monthly-count projections, and all untouched supporting-table fingerprints. The active Azure schema has **18 physical tables, two read views and twelve health_cases columns**. These are Azure counts; they differ from the local development dataset.

All **40 live smoke checks passed** using existing demonstration accounts and short-lived test sessions. Checks covered health, anonymous-access rejection, backup protection, municipal analytics/options/trend/comparison/breakdown/outcomes, map data, follow-ups, both review queues, patient directory and dossier, BHW data, role restrictions, daily/monthly/weekly PDF generation, future-date rejection, public HTTPS, unchanged clinical counts, and logout/session rejection. Test tokens and report contents were not logged or downloaded. Clinical records were not created or changed during these smoke checks; report exports generated their normal audit entries and test sessions were revoked afterward. This is functional verification, not a load test or a manual phone/browser visual assessment.

## Recovery and release

- The private local dump and previous environment settings are retained under the ignored `private-backups/normalization/` directory. Do not attach or publish these files.
- `server/scripts/prepare-normalization-copy.js` creates a fresh local copy and recovery dump; it refuses non-loopback hosts.
- `analysis/normalization-20261019/local-copy.json` identifies the verified target and source without credentials. Verification and schema metadata are saved beside it.
- `DB_TEST_SOURCE_NAME` points the test runner to the retained original schema as a read-only fixture template; the app uses the normalized copy selected by `DB_NAME`.
- The prepared Azure command contains seven runtime code files, no local data and no private environment configuration. It stops the service, makes an encrypted recovery archive, retains a private restore dump, fingerprints data, migrates using the VM's local root socket, checks preserved projections, then starts and checks the service. Failure restores the previous schema and code. It changes no VM size, billing, firewall rule or SSH access rule.
- The corrected release completed with `NORMALIZATION_AZURE_OK`, followed by 40 passing live checks. Recovery files are retained in `/home/azureuser/azure-normalization-1792395826/`, including an encrypted archive, protected recovery key, private restore-dump reference, preservation evidence, deployment result and smoke-test report. Do not publish this directory or its contents. The earlier failed attempt's recovery and isolated rehearsal databases are retained separately.

## Replacement manuscript wording

The database separates resident profiles, disease episodes and consultation visits. Resident identity is associated with each case through a resident reference, while standardized disease information is obtained from the disease registry. Case-time location and MHO classification review are maintained in dedicated related tables. Full names and ages based on known birthdates are calculated when information is retrieved. Historical records without verified resident links, birthdates or catalog mappings retain their original source information in a separate source-record table. This arrangement reduces independently editable duplication while preserving the available historical evidence. Follow-up and admission encounters remain linked to the original disease case and do not increase its case count.

Deployment description: this normalized implementation is active locally and on the Azure Ubuntu virtual machine as of 19 October 2026. Caddy provides public HTTPS access to the Node/Express application; MySQL remains local to the VM. The original manuscript has not been edited automatically.
