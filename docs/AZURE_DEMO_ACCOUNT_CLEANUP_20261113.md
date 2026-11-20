# Azure demonstration-account cleanup status

11/13/26, 10:17:40 PM PHT, CODEX-1. No deletion or deactivation has occurred.

## Current requested scope

Individually verify BHW beta/test accounts numbered1 through20, including exact BETA-BHW-01 through BETA-BHW-20 where present. Also inspect DEMO-BHW, DEMO-MHO, DEMO-ADMIN and DEMO-SUPERADMIN. These are requested candidates, not evidence of current presence. Other identifier formats require discovery and individual origin/ownership review. No wildcard mutation or numeric-range deletion is authorized. BETA-MHO accounts discussed previously are outside this new scope. All local accounts remain untouched.

## Current result

| Outcome | Verified result |
|---|---|
| Permanently deleted | None |
| Deactivated | None |
| Already absent | Unknown; live inventory unavailable |
| Retained | No account access was changed; current live inventory not established |
| Fresh Azure encrypted backup/full restore | Not performed; administrative access unavailable |
| Retained legitimate Admin/Superadmin login and recovery | Not verified |
| Clinical/audit preservation | No mutation attempted; exact baseline comparison pending access |

SSH timed out using the existing approved identity, verified known-host file and unchanged firewall. Brave tab access also reports unavailable for this chat. Azure CLI is not available on PATH. No firewall, permission, credential, VM or network change was made to bypass this blocker.

## Required next steps

Restore chat-level authorized Brave tab access to Azure Run Command or the existing approved SSH path. Retrieve the complete current account inventory and individually map requested IDs, roles, provenance, statuses and ownership. Read exact clinical/consultation/actor-audit/FK dependencies, current sessions, reset/recovery references and row fingerprints privately. A beta name or familiar numeric ID alone is insufficient.

Create a fresh encrypted full database backup, verify authenticated decryption and checksums, and restore into a newly created isolated recovery database. Confirm retained legitimate Admin and Superadmin sign-in and a tested recovery path before any account can be removed. Do not reset credentials merely to test recovery. Never remove the last usable privileged account.

Present a final exact current-ID/action list, exceptions, absence results, hashes and rollback for explicit approval. Prefer deactivation plus revocation for accounts with clinical or audit accountability. Permanent deletion is eligible only after all historical references and FK effects are checked and retained audit evidence cannot be cascaded away. Existing demo provenance is historical evidence, not proof a current row has the same owner.

After approval, lock exact approved rows in a transaction, recheck versions/dependencies and retained privileged access, apply only approved actions with FK checks enabled, revoke sessions through the existing session service, and append maintenance audit evidence. Roll back on mismatch/error. Preserve all patient cases, consultations and original audit rows. Verify removed/disabled login is rejected, old sessions cannot authorize requests, legitimate staff still work, and clinical/audit baselines are preserved. Avoid repeated wrong-password attempts that would trigger unrelated lockouts.

This is an unfinished execution task blocked by Azure administrative access. No executable cleanup list has been approved, and no removal success is claimed. Private requested-scope/gate evidence is retained outside the checkout under azure-account-cleanup-20261113.

## 2026-11-14 PHT live verification update

Azure Run Command access recovered in Brave. This update supersedes the earlier access-blocked status. The individually verified requested inventory contains 24 accounts. None were absent. No account access was changed.

- Proposed suspension and session revocation (23): BETA-BHW-01, BETA-BHW-02, BETA-BHW-03, BETA-BHW-04, BETA-BHW-05, BETA-BHW-06, BETA-BHW-07, BETA-BHW-08, BETA-BHW-09, BETA-BHW-10, BETA-BHW-11, BETA-BHW-12, BETA-BHW-13, BETA-BHW-15, BETA-BHW-16, BETA-BHW-17, BETA-BHW-18, BETA-BHW-19, BETA-BHW-20, DEMO-BHW, DEMO-MHO, DEMO-ADMIN and DEMO-SUPERADMIN.
- Retain the existing suspension for BETA-BHW-14 and verify session revocation. Every in-scope account has audit references. BETA-BHW-01, DEMO-BHW and DEMO-MHO also have clinical references, including cases protected by a user foreign key. No permanent deletion is proposed.
- A fresh encrypted on-VM backup passed authenticated decryption and an isolated restore. All 24 tables and 5,326 rows matched. Archive directory: /var/backups/health-intel/account-review-NDvH0t. SHA-256: 1e159a64207fc06fe9ee5ffc37b14108f7b1d37ece1fcb79ca72b3900cd95254. Two earlier verification attempts exposed a restore-script issue handling columns marked DEFAULT_GENERATED. The successful test included those stored timestamp values.
- ADM-001 and SUPER-001 are approved and outside the cleanup scope. ADM-001 has a recovery email and the service reports SMTP configured. Recovery delivery and both sign-ins remain unverified. SUPER-001 has no recovery email, so its alternative recovery procedure still needs confirmation.
- Next: verify retained administrator sign-in and recovery, recheck current account and dependency state, then obtain owner approval for the exact actions above. After approved suspension, verify access denial and clinical/audit preservation. A mistaken suspension can be reversed by restoring access through the normal account controls. Revoked sessions require fresh sign-in.


## 2026-11-14 07:06 PHT expanded scope

- Owner expanded scope to all verified Azure beta/demo accounts and explicitly retained ADM-001 and SUPER-001. Live read-only Run Command inventory returned 29 beta/demo accounts with matching roles, test-origin or bootstrap evidence, and audit references. No live or local records were changed.
- Proposed suspension and session revocation (28): all 23 in the prior list, plus BETA-ADMIN-001, BETA-MHO-001, BETA-MHO-002, BETA-MHO-003, and BETA-SUPERADMIN-001. Retain BETA-BHW-14 suspended and verify session state. Retain all other staff and all original audit history. Permanent account deletions proposed: zero.
- Live audit showed six successful ADM-001 sign-ins and no successful SUPER-001 sign-in. Both accounts are approved. Recovery delivery for ADM-001 remains unverified. SUPER-001 has no recovery email. Owner sign-in and alternate recovery confirmation requested. No credential change attempted.
- Resident follow-up: the known DEMO-MHO batch still has 865 case IDs and 865 distinct resident profiles. Candidate case-ID digest matches the previous inventory. No other cases share those profiles. There are 865 linked classification, 865 location, and 865 source records, and no linked visits, vital-status rows, or death reports. This verifies the batch identity and counted dependencies. Individual post-creation edits and any other demo batches still need review before a separate resident cleanup plan can be executed. Account suspension does not remove resident rows.
- Existing encrypted Azure backup passed isolated restore as documented above. Complete retained-access checks and exact action approval before executing account changes. Prepare a separate reviewed deletion plan for any proven demo clinical rows. No patient records or audit events were altered.


## 2026-11-14 07:15 PHT completion

- The owner approved the 29 verified IDs. The live inventory matched the exact list. Azure audit confirmed recent successful ADM-001 and owner SUPER-001 sign-ins. The SUPER-001 dashboard and its current session were checked again after the operation.
- Fresh encrypted on-VM backup and isolated restore passed with 24 tables and 5,336 rows. Backup directory /var/backups/health-intel/account-review-5ETGHJ and SHA-256 fa966a2fcc6f1e0fec15c0653462105e0dc79a8b3148a14794a54b6ad6f4525a. The recovery test used Azure Run Command on the isolated restore to reset a temporary password for the copied Superadmin, verify the password, and issue a working session through the application login service. The live credential was untouched. The production transaction verified the backup checksum again.
- Transaction committed 28 new suspensions. BETA-BHW-14 stayed suspended. All 29 session epochs advanced, two expired session entries were cleared, and zero session entries remain for the 29. No account was deleted or left pending.
- The transaction matched fingerprints for cases, consultations, clinical references, resident tables, original audit rows, and all other account rows. It recorded 29 maintenance audit events. No local accounts, models, datasets or application files changed.
- Deployed authorization middleware rejected a generated prior-session credential for each of the 29 with ACCOUNT_INACTIVE. The password login route rejects suspended accounts after credential verification. No real demo passwords were used in verification.
- Retained ADM-001, SUPER-001, MHO-002 and BHW-001 through BHW-004 remained approved. The owner confirmed SUPER-001 sign-in and its live session was current after cleanup. ADM-001 and representative MHO/BHW access were checked through approved status and successful audit sign-ins. Fresh MHO/BHW browser sign-ins were not performed. The initial read-only postcheck query encountered a collation mismatch and passed after exact binary ID joins.


## 2026-11-14 07:31 PHT account-list removal and verified demo-record deletion

The owner requested removal from Azure account lists after the initial suspension. Azure-only account-directory.js and account-status.js were updated. The exact 29 accounts are excluded using their existing owner-approved maintenance audit entries with batch AZURE-DEMO-CLEANUP-20261114. Suspended login rejection and session invalidation remain enforced. Denied and all-user lists, account counts, direct Admin account history, and account restoration checks exclude these retired identities. Original database user rows remain for clinical and audit ownership. ADM-001, SUPER-001 and other staff remain eligible. Five directory methods and all 29 restoration attempts passed assertions. The service restarted successfully and /healthz returned ok. A refreshed signed-in Admin Archived / Denied view showed the legitimate suspended MHO-001 and no beta/demo accounts.

An initial proposed status-enum migration and combined release was rejected by automatic review before execution. It was replaced with the narrower approved two-file deployment using existing audit metadata. No status schema migration occurred. One release-script syntax failure stopped before edits; the corrected release passed.

The owner separately confirmed permanent removal of the reviewed 866 demo cases and 866 associated resident profiles. This includes the 865 seeded DEMO-MHO batch and independently synthetic-QA-marked REC-1150. An isolated restored database rehearsal passed. The production transaction committed removal of those cases/profiles and 866 rows from each of case_condition_reviews, case_locations and case_source_records. Candidate row fingerprint 6834b270c1930fc71807dea8fe3009134b1870f5e3190db80c50c6b166f7665f matched the rehearsal. All retained row fingerprints and original audit events matched. No consultations were removed. One maintenance audit event was added.

Four remaining cases REC-1151, REC-1155, REC-1156 and REC-1157 were entered under beta/demo accounts but lack verified generated-record provenance. They remain pending owner identity/source clarification. Account identity alone is insufficient proof. The refreshed Admin patient list showed those records and no verified removed demo profiles.

Fresh encrypted backup /var/backups/health-intel/account-review-NQD3wH restored 24 tables and 5,391 rows successfully, SHA-256 d82dbbd773f5840e8a53963e479613a1ac4bd8bc96b2d0b2fe2948ab2ed2a4aa. Additional isolated restore/rehearsal backup /var/backups/health-intel/account-review-xWzQD6 passed, SHA-256 b2b24589a283e79eece4635e9569a68e26986e4b27e4d6e304bdde778688b491.

Deployment drift warning for the next agent: the two Azure service files have changes absent from local source. Preserve these exclusions and restoration guards when deploying local code. Prior remote files are saved as account-directory.js.visibility-previous and account-status.js.visibility-previous in the NQD3wH backup directory. No local account, dataset or predictive-model changes occurred. Browser access became unavailable during the subsequent user continuation, so no fresh live recheck was possible then.

