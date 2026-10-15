# Azure release — 15 October 2026

The current local MHO/BHW runtime is deployed to Azure. This includes the MHO Patient Directory, Review Center, return-visit shortcut, date-only birthday matching, normalized address spacing, account-state safeguards and persistent session revocation. Predictions remain unchanged.

## Data and configuration

- Reviewed the two existing profiles from the reported screenshots before deploying. Their stored birthdays differ, so no merge or identity correction was made. A matching name, address and displayed age are insufficient to establish the correct birthday.
- No local database was uploaded. Azure's existing table fields and rows matched the private pre/post-deployment fingerprints while the application was stopped.
- Created and verified private encrypted database recovery archives before applying code. Existing private environment settings were preserved.
- Added the two session-security tables through the existing database administrator. The application database login was not granted schema-administration rights.

## Azure-specific correction

Live login checks revealed that the existing users table and the new session epoch table use different MySQL collations. Joining their text identifiers produced `ER_CANT_AGGREGATE_2COLLATIONS` after successful login. Session verification now retrieves the epoch with a separate parameterized query using the canonical user identifier. No stored identifiers or table collations were changed.

A disposable local regression first reproduced the HTTP 503 error, then passed with the fix. The remaining session tests also ran with intentionally different collations, covering logout replay, independent sessions and suspension/restoration.

## Verification

- **159 local regression tests passed**, zero failures; disposable databases were removed and source-data preservation checks passed.
- **116 live checks passed**, zero failures, including HTTPS, public file hashes, private-path blocking, all four demo-role sessions, role restrictions, read-only patient/directory views, date-only birthdays, PDF reports and logout replay rejection.
- **133 runtime file hashes verified** on the VM after the final correction.
- Live verification did not add, merge, edit or delete patient records. Demo sign-in/audit and session-revocation writes were expected.

## PC backup recovery

The PC's outgoing public IPv4 address had changed. With explicit approval, the existing SSH-only source restriction was replaced by the PC's current single-address `/32`; no public SSH rule was added. Existing SSH identity and strict host-key verification were retained.

The existing PowerShell backup script then completed successfully. A new encrypted ZIP was verified against fresh successful status, byte length, encryption flag and SHA-256. Retained backups were not deleted. A later public-IP change may require updating the same narrow SSH source rule again.

Private manifests, sanitized deployment results, test logs and screenshots are retained under the ignored `analysis/azure-release-20261015/` folder. Credentials, database contents, backup passwords and archive files are excluded from the GitHub changes.
