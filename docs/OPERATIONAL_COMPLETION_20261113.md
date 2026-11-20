# Operational cleanup preparation and dataset analytics

CODEX-1, 13 November 2026. Branch main at e5946d4. Local implementation completed. Azure private inspection and recovery verification are blocked by access. Nothing was deleted, merged, deactivated, committed, pushed or deployed.

## Application implementation

**1. Actual local implementation.** BHW Overview and MHO Municipal Analytics now open a shared historical dataset view. Analytics source offers Historical demonstration dataset and Live operational data. The existing operational widgets, filters and endpoints remain in a separate container. Predictive Analytics and Monthly Updates were not changed. The ad-hoc sample=1 analytics path now returns 410 rather than fabricating display records.

The dataset view has year and disease filters, an MHO barangay filter, historical case totals, months represented, monthly trends, disease distributions and annual totals. MHO additionally has the municipal barangay distribution. Each dataset total and chart has the visible label **Demonstration Dataset — Synthetic Historical Data**. Each chart has an accessible text table. An error clears stale results and does not turn unavailable data into zero. Out-of-order responses cannot replace a newer filter result.

**2. All seven BHW assignments.** The server obtains the BHW's assigned barangay from the authenticated account and database. It does not trust a dropdown or query for authorization. BHW receives only its own barangay and all ten study diseases. Anonymous and wrong-role requests are refused. The existing middleware-injected barangay_id is explicitly authorized before the CSV filters are validated.

| Barangay | Historical cases, Jan 2023–Sep 2026 |
|---|---:|
| Alegria | 891 |
| Blumentritt | 911 |
| Caliban | 884 |
| Cansilayan | 862 |
| Minoyan | 882 |
| Salvacion | 887 |
| Sta. Rosa | 883 |
| Municipality | **6,200** |

**3. Municipal Analytics source.** The new default historical view reads the private preserved monthly CSV directly. Its bytes match datasets/combined_historical_cases.csv. Live operational data remains a separate selectable view. Operational ages, outcomes and severity are not derived from the demonstration dataset. Its columns contain only month, barangay, disease and cases, so those unsupported dimensions are explicitly unavailable.

**4. Reconciliation.** There are 3,150 unique monthly rows, 70 disease–barangay combinations and 45 months. Tests independently sum the original CSV and compare all 385 barangay/year/disease filter selections, plus corresponding municipal totals and every monthly value. Each disease, barangay, month and year aggregation reconciles to the selected total. Annual totals are 2023=1,776, 2024=1,662, 2025=1,562 and January–September 2026=1,200. No partial-year months are invented.

**5. Changed files.**

Runtime files for the proposed release

- bhw.html
- mho.html
- assets/js/shared/dataset-analytics.js, new shared renderer
- assets/css/bhw/bhw-utilities.css, rebuilt with the existing BHW configuration
- assets/css/mho/mho-utilities.css, rebuilt with the existing MHO configuration
- server/services/dataset-analytics.js, new read-only CSV aggregation
- server/routes/analytics-routes.js, route registration and retirement of ad-hoc samples
- server/middleware/access-control.js, explicit role rules for the two new endpoints

Private maintenance support and tests

- server/scripts/review-operational-state.js, new inventory-only command
- server/tests/dataset-analytics.test.js
- server/tests/dataset-analytics-ui.test.js
- server/tests/review-operational-state.test.js
- server/tests/municipal-analytics.test.js
- this report and the four shared coordination documents

**6. QA.** Final focused run passed **77/77**, zero failures. It includes real authenticated loopback HTTP tests for every study barangay, municipal reconciliation, source-switching DOM tests, stale/failure handling, existing operational analytics, four-role navigation, Google-token registration validation and clinical correction/rollback fixtures. Two additional existing prediction checks passed, covering all 70 frozen probability attachments and seven assigned-barangay prediction scopes. An initial integration test caught rejection of the existing middleware-injected barangay ID; the correction passed the subsequent authenticated tests.

The earlier 46-test duplicate-registration implementation remains intact and was not rewritten. It retains stable resident IDs, separate new-case/follow-up behavior and manual review for possible matches. Current source-table fingerprints also match before and after this task's QA.

JavaScript syntax and git diff --check passed. Only existing CRLF conversion warnings appeared. Local public pages and the new asset return 200; anonymous dataset requests return 401. No real-browser visual, mobile, zoom or screen-reader check was completed because tab access is unavailable. DOM/harness tests do not replace visual testing. Genuine Google sign-in, email delivery and privileged recovery were not exercised against live accounts.

## Patient cleanup

**7. Local dummy records.** Refreshed inventory contains 2,177 cases, 1,089 resident profiles and two consultations. Zero cases match the documented DEMO-MHO plus synthetic-marked provenance. No local deletion is proposed. Names, timestamps and ADM-001 ownership do not prove generated origin. Existing imported records remain unclassified until source evidence is reviewed.

**8. Azure dummy records.** Last successful earlier read-only inspection reported 874 cases, 874 residents, eight consultations and 865 documented demonstration-batch cases with no linked consultations. These figures were NOT refreshed in this task. SSH connection to the approved host times out and Brave tab access reports unavailable. They must not be treated as a current deletion list.

**9. Exact candidates and dependencies.** The new private inventory records case/resident IDs, row hashes, linked visits, shared resident cases, case-referenced audit IDs, non-creation activity and all actual FK dependencies. Every documented-batch candidate is held for original-snapshot and later-activity review, even if its current remarks still carry the marker. Local exact deletion candidate set is empty. Azure exact IDs and current hashes remain pending. The old digest is historical evidence only.

Child dependencies include cases, visits, condition reviews, source snapshots and locations, plus resident vital/death-report references where present. The actual schema FK inventory is saved privately. Audit history must remain. Case deletion must not automatically remove a shared resident or any creator account.

**10. Existing duplicate candidates.** One local possible-match group contains resident IDs **1079 and 1081**. The screen uses birthdate, normalized family name, first given-name token and suffix, while allowing different addresses. It is a possible match, not confirmed identity. A fuzzy screen can also miss other duplicates; absence from this list does not prove identity uniqueness. Private details and fingerprints are retained outside the application checkout. Azure duplicate review remains pending access.

**11. Conditional consolidation proposal.** No merge was performed or approved. Candidate survivor 1079 is a review suggestion based on linked-case counts and then earlier ID; staff must confirm the correct identity and survivor. Proposed relationships only if both profiles are confirmed to represent one person

| Case | Current resident | Proposed resident after approval |
|---|---:|---:|
| REC-5256 | 1079 | 1079 |
| REC-5258 | 1081 | 1079 |

Before approval, compare the authorized identity documents and conflicting fields, inspect every dependent row, and determine whether the two cases represent distinct encounters. Moving a resident reference must not remove a valid case, turn a follow-up into a new case or rewrite historical audit actors. Conflicting vital-status and other unique child records require a separate explicit resolution. Only an unused duplicate profile could be considered for later removal after all FK checks.

## Account cleanup

**12. Inventories.** The complete local inventory has ten accounts and no beta/test naming flags. All ten are preserved in their current statuses. The tool inventories all accounts, not only flagged names. Azure's complete current account list remains unavailable; no example beta ID from earlier chats is approved for action.

**13. Authentication and Google linkage.** Health-Intel uses its application password for normal login. The current public registration flow verifies a Google/Firebase token and email ownership before storing that password. The user table does not persist a Google provider UID or registration-proof history. Consequently, this review cannot verify Google linkage for each stored account. An email address, beta-like name or missing Google linkage is insufficient to classify an account as fake. The private report explicitly records this uncertainty. It contains no password hashes or session tokens.

**14–16. Retained accounts and approval actions.**

| Local account | Role | Current status | Recommendation now |
|---|---|---|---|
| ADM-001 | Admin | approved | KEEP |
| ADM-002 | Admin | suspended | KEEP current status |
| BHW-001 | BHW | approved | KEEP |
| BHW-002 | BHW | approved | KEEP |
| BHW-003 | BHW | approved | KEEP |
| BHW-004 | BHW | suspended | KEEP current status |
| MHO-001 | MHO | approved | KEEP |
| MHO-002 | MHO | approved | KEEP |
| MHO-003 | MHO | pending | KEEP current status |
| SUPER-001 | Superadmin | approved | KEEP |

KEEP preserves the account and its status. It does not approve pending staff or restore suspended access. Current ownership/authorization must still be confirmed by the project owner. No exact account ID is currently recommended for deactivation or deletion. A future beta-like flag defaults to REVIEW, never automatic deactivation. First verify setup provenance and owner authorization. Prefer deactivation with session revocation over deletion when clinical/audit ownership exists.

**17. Account dependencies and recovery.** The private report includes actor audit IDs, explicitly linked account-audit IDs, related case/visit IDs, row hashes, and unexpired/non-revoked session registry metadata without tokens. Last successful login is reported only when supported by saved audit events. All local accounts have recorded email addresses, but recovery delivery and ownership have not been tested. Preserve the approved Admin and Superadmin accounts. Test a legitimate privileged login and recovery path before disabling any account. Preserve case creators, historical actors, retained clinical references and original audit rows.

## Safety and deployment

**18. Dataset/model preservation.** All **79** previously inventoried dataset/model/policy files match their saved SHA-256 hashes. This includes the 6,200-case CSV and frozen saved SARIMA/CMP evidence. Source hash for the descriptive dataset is 49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7. The 21 older files already missing before this work remain separately recovered from HEAD in the previous private evidence folder. No regeneration, model fitting, probability retuning or dataset editing occurred.

**19. Backup and restore.** A fresh local AES-256-GCM encrypted backup authenticated/decrypted and restored successfully into a new disposable database, recreating views and matching every base-table row fingerprint. It contains 24 tables/views and 10,170 base-table rows. The key is protected by Windows DPAPI. The scratch restore was removed. The encrypted SHA-256 is 61304a9babcb63a8c01268297a93be3043f9c739c372a0c39ca085b4a8a54bc7. The current Windows user context and retained DPAPI material are required for recovery.

Fresh Azure backup/decryption/full restoration is **not verified**. No Azure cleanup can proceed on the strength of the old ZIP or old row counts.

**20. Future transactional cleanup procedure.** This task implements review only, not a mutation command. A future separately approved implementation must

1. Refresh the appropriate environment's private inventory and backup. Independently restore and verify the backup.
2. Obtain owner approval for exact case IDs, dependent rows, account actions and any confirmed patient-survivor plan, bound to hashes.
3. Enter a transaction and lock the approved entities in stable ID order. Re-read all row versions, links and clinical activity. Abort on any mismatch or new dependency.
4. Exclude modified, shared, uncertain or newly linked records until individually reviewed. A timestamp or demonstration marker alone is insufficient.
5. Apply only the approved child/case removals or reviewed identity-reference changes in FK-safe order, with FK checks enabled. Do not bulk-wipe tables or delete clinical history based on a test-account creator.
6. For any approved account deactivation, preserve ownership/audits and revoke sessions using the existing service. Recheck legitimate privileged access and recovery prerequisites.
7. Add a maintenance audit record, verify expected retained counts and no broken references, then commit. Any error or audit failure rolls back the entire transaction.

Current expected local retained counts are unchanged at 2,177 cases, 1,089 residents, two consultations and ten accounts. Conditional consolidation would retain both cases and their history; its survivor decision is not approved. Azure retained counts cannot be specified until the exact current plan is available.

**21. Rollback/recovery.** Local code before-copies are retained privately for the eight-file release and rebuilt styles. To roll back the UI, restore those exact before files, remove only this release's newly introduced service/renderer if reverting their route imports, and restart the existing local service. Preserve all other dirty work. Keep the current process-only CMP enable flags when restarting.

For a future data cleanup rollback, restore the encrypted backup into a NEW isolated recovery database and reconcile only the approved removed rows/links with subsequent operational activity. Do not restore an entire old database over newer staff entries. Do not depend on a Git commit to restore patient records. Never drop or replace the active database during recovery testing.

**22. Azure readiness and release checklist.** Public HTTPS inspection succeeded. Both portal HTML files and both compiled styles differ from local; the new shared dataset asset returns 404, as expected because it is not deployed. Public file hashes are saved privately. Private backend versions, environment flags, dataset hash and DB compatibility could not be freshly inspected. There is no schema migration in this change. The private preserved CSV is already the intended saved prediction source, but its actual Azure hash still requires verification.

An eight-runtime-file proposed release with exact local SHA-256 hashes is staged privately. It is NOT deployment-approved or certified compatible with all current live backend changes. Before deployment

1. Restore approved SSH or browser Run Command access without widening firewall rules.
2. Refresh the remote source/version/config inventory and compare each changed file and its current dependencies. Reconcile separately pending local releases instead of overwriting a newer live file.
3. Verify the private CSV hash, Node dependency availability, existing DB facade, account assignments, worker/CMP flags and last publication pointer.
4. Create/restore-test the current encrypted remote database backup. Save exact remote code/config rollback copies and publication hashes.
5. Obtain explicit approval for the exact runtime release and a brief backend restart. Obtain separate approval for any database/account cleanup; deployment approval does not authorize it.
6. Transfer the approved files, verify every hash, restart through the established service and check /healthz. Verify both signed-in portals, source selection, all seven BHW scopes and absence of synthetic/operational mixing.
7. Verify unchanged prediction source/version, SARIMA/CMP bindings, publication pointer and patient/audit counts. Restore the exact code rollback on failure. No model publication or patient mutation is needed for this release.

**23. Outstanding decisions and limits.** Local application changes and focused engineering QA are complete. Current Azure inventories, beta provenance, original batch comparisons, backup restoration and signed-in visual QA are pending access. Confirm the identity and survivor for resident IDs 1079/1081 before any merge proposal becomes actionable. Verify legitimate account ownership and recovery before account removals. No destructive approval is requested yet because Azure's current exact affected set is not reviewable. These descriptive dataset figures and unchanged research predictions do not establish real-world probability reliability.

## Operating instructions and evidence

Open http://localhost:3000/ and sign in normally. BHW Dashboard and MHO Municipal Analytics default to the labeled historical dataset. Use Analytics source to view operational records separately.

Read-only inventory from proposal/server

    node scripts/review-operational-state.js --environment local --output <private-directory-outside-the-checkout>

For Azure, run the same script only after approved admin access is available, using --environment azure and a private non-web-served output directory. The command refuses unexpected arguments and has no --apply mode. It writes a new timestamped file with exclusive creation and prints only aggregate counts.

Private evidence root

    C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/operational-completion-20261113

Contains private-local/ timestamped exact review inventories, local-backup/ encrypted backup and restore verification, before/ source checkpoints, both compiled-style checkpoints, summary.json, azure-public-comparison.json, proposed-release/ and release-manifest.json. Identifying review details, credentials and backup material must remain outside shared source/commits.

Reproduce the focused run from proposal

    node --test server/tests/dataset-analytics.test.js server/tests/dataset-analytics-ui.test.js server/tests/review-operational-state.test.js server/tests/municipal-analytics.test.js server/tests/analytics-readability.test.js server/tests/workflow-fixes.test.js server/tests/portal-structure.test.js server/tests/portal-navigation.test.js

The separate two prediction regressions were limited to the existing all-70-attachments and seven-BHW-assignments cases in conditional-cmp-integration.test.js. They did not retrain models or repeat probability calibration experiments.
