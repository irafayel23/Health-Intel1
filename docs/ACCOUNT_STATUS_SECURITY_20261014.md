# Account status security fix — 14 October 2026

## Problem

BHW and MHO account actions previously updated status without checking the current state inside their transaction. A stale approval request could therefore change a suspended account back to approved. Repeated actions could also create duplicate status audit entries. Admin accounts already had state checks.

## Change

All target roles now have current-state checks after acquiring the account row lock:

| Action | Required current status | Result |
| --- | --- | --- |
| Approve | Pending | Approved |
| Deny | Pending | Denied |
| Re-evaluate | Denied | Pending |
| Suspend | Approved | Suspended |
| Restore access | Suspended | Approved |

Stale or repeated actions return HTTP 409 and leave the account and audit history unchanged. The approval endpoint now preserves this useful conflict response instead of reporting a generic database error. Email is attempted only after a successful approval.

The account service also checks actor and target roles inside the transaction. Only Admin/Superadmin may manage BHW/MHO access; only Superadmin may manage Admin access. Superadmin accounts cannot be targeted by these actions. Existing Admin suspension reasons and atomic audit writes are preserved.

## Validation

`server/tests/account-status.test.js` covers valid/invalid states, role checks, attribution and audit failure rollback without a database.

The regression in `server/tests/qa-fixes.test.js` checks each BHW/MHO action against all four account states, simultaneous approvals, and stale approval after suspension using a disposable database. Existing suites verify anonymous access, roles, barangay boundaries and immediate suspension enforcement. Email is mocked and source records are checked for changes.

Result: **38 tests passed, zero failures** across `account-status.test.js`, `qa-fixes.test.js` and `first-fixes.test.js`. Source-data preservation checks passed and disposable databases were removed. Existing XAMPP MySQL was started for these checks; no MySQL settings were changed.

## Scope

This fix is installed locally and on Azure. No GitHub push is included. It requires no schema migration and does not change prediction behavior. It addresses a verified account-state issue; it is not a certification that every security risk has been eliminated.

## Azure deployment

After the Brave browser connection was restored, the signed-in Azure RunShellScript flow deployed the account-status service, identity routes and package test command. All three file hashes matched the prepared local code. The deployed account service passed the four isolated regression tests; real database state/concurrency checks were performed locally in disposable databases, not by changing live accounts.

Azure returned `AZURE_UPDATE_OK` with database preservation, encrypted backup verification, private-settings preservation, service health and security regression all successful. Original table/field fingerprints matched before and after while the application was stopped. No schema migration ran. Previous code and the private encrypted database backup remain at `/home/azureuser/azure-sync-account-security-1791972158927`.

Eight public checks passed: site and health endpoint responded successfully, and all six account-management actions rejected anonymous calls with HTTP 401. Deployment evidence, hash manifest and screenshot are in `analysis/account-security-20261014/`. SSH still timed out; no network access rules were changed.
