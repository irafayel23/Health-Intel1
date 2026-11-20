# Patient duplicate prevention and operational cleanup review

Prepared 13 November 2026 by CODEX-1. Local implementation completed. Cleanup preparation remains incomplete pending Azure access and provenance review.

## Implemented locally

BHW and MHO already shared Existing Patient / New Patient controls. The updated save transaction checks New Patient requests for the same birthdate and either the normalized family name or first given-name token. Purok is excluded from this candidate search. Case and spacing differences are handled. A missing middle name can match through the first given name or family name.

A possible match returns HTTP 409 with authorized candidates. Both forms return to the Patient step and display a review panel. Staff can select a saved resident ID, or explicitly confirm the new entry is a different person. The confirmation digest binds the submitted identity, address, authorized scope and current candidate rows. A stale digest causes another review. More than 20 matches require a narrower search or staff review.

Explicit new-person registration is serialized under the existing named registration-lock mechanism. Two simultaneous requests with the same review cannot both create a new profile because the second request sees the newly created resident and must review again. Existing selection reuses the resident ID. Existing-case follow-ups retain their original case and consultation counting. Registration audit metadata records the resident ID and whether staff reviewed a possible match.

Similar identities are never automatically merged. Explicitly reviewed different people can have distinct profiles even when identity fields match. Legacy callers without patient_mode retain the existing matching behavior. Both current entry forms supply patient_mode.

## Files changed

- server/services/encoding-residents.js
- server/services/case-encoding.js
- server/routes/case-routes.js
- assets/js/shared/patient-picker.js
- assets/js/shared/patient-visits.js
- assets/js/bhw/bhw-dialogs.js
- assets/js/mho/mho-walkins.js
- assets/css/shared/patient-picker.css
- bhw.html and mho.html
- server/tests/encoding-residents.test.js
- server/tests/case-visits.test.js
- server/tests/consultation-matching.test.js
- server/tests/normalized-schema.test.js
- server/scripts/review-operational-cleanup.js
- this report and shared task, handoff, overview and changelog notes

## Verification

46 tests passed across encoding-residents, consultation-matching, mho-walkin-feedback, case-visits and normalized-schema. Includes both real API save routes on disposable fixtures, selecting an existing resident, separate people, changed purok, middle-name variation, case differences under binary schema collation, simultaneous new registration, forged/stale review, case counting, authorization, normalized storage, history and audit rollback. Existing fixtures verify operational source fingerprints before and after.

The old consultation-matching assertion expected Admission wording. It now expects the approved Follow-up Visit wording. JavaScript syntax and Git diff checks passed. A signed-in visual inspection of the new review panel remains pending.

## Current operational inventories

| Environment | Cases | Residents | Consultations | Provenance finding |
|---|---:|---:|---:|---|
| Local | 2,177 | 1,089 | 2 | Zero cases match the documented DEMO-MHO synthetic-marked batch. No local deletion candidates established. |
| Azure | 874 | 874 | 8 | 865 cases match the DEMO-MHO synthetic-marked batch documented in BETA-DATA-001 on 28 October. These have zero linked consultations. |

Local actor totals are 2,162 ADM-001 cases, eight MHO-001 cases and seven BHW-001 cases. Actor identity alone cannot establish generated origin. Those rows remain held for provenance review.

Azure batch counts by barangay ID are 1=134, 2=128, 3=119, 4=112, 5=124, 6=117 and 7=131. Candidate ID digest is 98490dc627f2729eaf60d5da885c95861510574308e1c93e0610c93766bff7f2. The eight consultations and remaining nine cases are outside that batch. One other Azure case has a test-related text marker, which is insufficient provenance by itself.

The Azure result is a proposal for investigation. Exact current identifiers, individual row hashes, later edits, shared residents and child-row counts must be frozen before deletion approval. The read-only inventory script can produce identifiers in a private directory. Azure browser access became unavailable after the successful aggregate inventory, preventing the new backup and detailed inventory.

## Cleanup proposal and dependencies

Local proposed deletion count is zero until source evidence identifies specific dummy records.

For the Azure documented batch, prepare a reviewed list of exactly 865 case IDs and corresponding row hashes. Preserve any candidate modified by staff or linked to later clinical history until reviewed. Inspect case_visits, case_condition_reviews, case_locations and case_source_records references. Preserve shared resident profiles. Only consider removing an orphan generated resident after checking health_cases, resident_vital_status and resident_death_reports. Preserve original audit entries and all accounts. Record any approved maintenance in a new audit event.

Use a transaction, verify the current snapshot digest against the reviewed plan, delete only approved child rows and case IDs, verify retained rows and report totals, then commit. No FK checks may be disabled against the operational database. Audit failure or mismatch must roll back. No destructive execution occurred during this task. The new script intentionally supports inventory only; --apply is refused.

Run from proposal/server:
    node scripts/review-operational-cleanup.js --output <private directory outside the application>

The dry run writes identifiers to a private JSON file and prints only aggregate counts. It rejects output inside the application directory.

## Backups and rollback

Local encrypted backup and key verification succeeded. A full recovery into a disposable database reproduced all base-table row fingerprints and recreated all views. The disposable database was removed afterwards. Backup contains 24 tables/views and 10,168 base-table rows, including accounts and audit history. Recovery key is protected by this Windows user using DPAPI. Recovery requires this Windows user context.

Private local backup:
C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cleanup-local-verified-20261113

Evidence helpers:
C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cleanup-verified-backup.cjs
C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/restore-cleanup-backup.cjs

The restore helper requires a NEW database name beginning hi_cleanup_restore_. It rejects an existing target and verifies encrypted checksum, authenticated decryption and restored base-table fingerprints. It never targets the active operational database.

The initial backup attempt failed Windows key protection before verification. Its separate cleanup-local-backup-20261113 directory is incomplete and must not be used for recovery.

Fresh Azure backup and restoration verification remain pending. Existing PC backup-status.json reported failure on its latest recorded attempt. Historical ZIP presence alone does not satisfy the current backup requirement. Deletion approval is premature until a current Azure backup is restore-tested.

If approved cleanup later needs reversal, first restore the encrypted backup to a new disposable recovery database. Reconcile only the approved removed rows, their FK dependencies and any subsequent live changes before a supervised transactional recovery. A blanket restore could overwrite later staff entries.

## Datasets, models and analytics

79 existing files in datasets, server/data and server/forecasting were hashed into the private preservation manifest. The current 6,200-case CSVs and frozen SARIMA/COM-Poisson files were not edited. Git already reported 21 missing older dataset files at task start. Their HEAD contents were recovered to the separate evidence folder, retaining current working-tree choices.

Operational BHW/MHO dashboards, ordinary Municipal Analytics, maps, patient directories and clinical reports read operational health_cases through the existing database facade/views. Removing an approved generated case would therefore reduce the corresponding operational charts and counts. Archived cases remain included where a descriptive panel intentionally queries history.

SARIMA/COM-Poisson demonstration predictions use saved bundles and CSVs, independently of operational cleanup. Published operational versions remain private versioned outputs. analytics-sample.js is a display-only generated sample service, activated explicitly by sample=1. It creates no patient rows and does not read the 6,200-case CSV as its source. The default Municipal Analytics endpoints query operational records.

No new static-CSV descriptive analytics source was installed. Existing intended sources are preserved. If a dedicated 6,200-case descriptive view is desired after operational cleanup, it needs an explicit source selector and demonstration label.

## Remaining limitations

Possible-match review is a conservative heuristic. Simultaneous errors in birthdate and both names can evade it. Selected resident IDs remain the stable identity mechanism. Address correction or transfer is handled through authorized profile review; this task does not silently alter an existing address during consultation encoding.

Final visual accessibility checks, fresh Azure backup, exact Azure inventory and local imported-record provenance remain pending. Azure deployment and operational deletion require the owner's later approval.

