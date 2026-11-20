# Account-origin cleanup approval preparation

CODEX-1, 2026-11-13T13:56:36.514Z. Investigation only. No account access, credentials, patients or audit history changed.

## Local

The owner explicitly confirmed all local accounts are legitimate. Preserve ADM-001, ADM-002, BHW-001, BHW-002, BHW-003, BHW-004, MHO-001, MHO-002, MHO-003 and SUPER-001 in their existing statuses. No local deactivation candidate remains. This decision uses owner confirmation, not ID format, account approval status or Google linkage. A fresh read-only inspection recorded all ten account creation timestamps and related saved audit events privately. No explicit creation events were found among their linked audit entries; that absence is not evidence of test origin.

## Azure historical origin evidence

| Exact historical ID | Evidence | Proposed action after current verification and approval |
|---|---|---|
| BETA-MHO-001 | docs/ANALYTICS_RECORDED_DATA_20261019.md explicitly documents Azure-only beta account creation and login testing; November4 deployment notes independently record its beta verification session. | Deactivate and revoke sessions if still present and obsolete. |
| BETA-MHO-002 | Same October19 creation record. | Deactivate and revoke sessions if still present and obsolete. |
| BETA-MHO-003 | Same October19 creation record. | Deactivate and revoke sessions if still present and obsolete. |
| DEMO-BHW | azure-review/bootstrap-demo.cjs creates demonstration role accounts; its private account handout independently lists this exact ID. | Deactivate if still present and obsolete; preserve clinical ownership. |
| DEMO-MHO | Same bootstrap and handout evidence. | Deactivate if still present and obsolete; preserve clinical ownership. |
| DEMO-ADMIN | Same bootstrap and handout evidence. | Deactivate only after retained legitimate Admin access/recovery is verified. |
| DEMO-SUPERADMIN | Same bootstrap and handout evidence. | Deactivate only after retained legitimate Superadmin access/recovery is verified. |

This is a historical-origin shortlist, not a complete current Azure inventory or approved mutation list. The handout contains credentials and must remain private; only IDs/roles were extracted. The bootstrap script was inspected as text and was NOT executed. Beta-like names alone do not establish obsolete ownership. Earlier screenshots additionally show BETA-BHW-01 and BETA-BHW-14; their current presence and individual origin/ownership need verification. Do not assume a contiguous account range or invent beta-admin IDs.

## Access and safety gates

Azure SSH timed out with the existing approved identity and strict verified host key. Brave access was tried again after the owner's reply and still reports unavailable for this chat. No firewall change was attempted. Azure current status, complete account IDs, last logins, live sessions and clinical/audit dependencies remain unverified. The proposed list is not ready for final execution approval.

The previous local encrypted backup passed full restoration, but no access changes are needed locally. Azure requires a fresh encrypted backup, authenticated integrity check and full isolated restore before changes. Historical backup presence is insufficient. Test the retained legitimate Admin and SUPER-001 login and recovery method first; their existence/format alone does not verify recovery. Never disable the last usable privileged account.

Once authorized Azure access works, use the existing read-only review-operational-state.js inventory command privately to enumerate ALL accounts and dependencies, then compare test candidates with creation records and owner confirmation. Inspect credential types without exporting password hashes/tokens. Present exact current IDs, statuses, reasons, retained privileged accounts and rollback for approval. Only after explicit ID approval, recheck row versions, suspend through the existing transactional account-status/session-revocation services, preserve all ownership and audit history, and verify rejected login plus rejected old sessions. Any already suspended account requires verification rather than misleadingly reporting a new deactivation.

## Evidence and scope

Private evidence is in C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/account-origin-review-20261113. Local identifying details are outside the checkout. Runtime/application code was not modified, and no dataset analytics or patient-cleanup work was repeated. No accounts were deactivated. Next action is restoring chat-level Brave tab access or the existing approved SSH path, then producing the fresh Azure list.
