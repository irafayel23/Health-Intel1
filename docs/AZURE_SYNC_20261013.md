# Azure code sync — 13 October 2026

The hosted HEALTH-INTEL application now matches the current local runtime code. All 116 allowlisted runtime files were verified using SHA-256, normalizing Windows/Linux line endings for text files.

Six files differed and were replaced:

- `assets/js/bhw/bhw-dialogs.js`
- `assets/js/bhw/bhw-residents.js`
- `assets/js/bhw/bhw-startup.js`
- `bhw.html`
- `mho.html`
- `server/package.json`

This includes the BHW resident rendering and hidden-view refresh optimizations. Backend routes, account/security services, styles, image assets and prediction code already matched. Dependencies were unchanged; no installation was needed.

The existing Azure demo database and accounts were retained. Before/after fingerprints of all database tables matched while the application was stopped for the update. The private `.env` hash also matched. No local records or credentials were included in the deployment payload. MySQL/network permissions, VM size and billing settings were unchanged.

SSH timed out. The update used the already signed-in Azure portal's Linux Run Command; the SSH rule was not widened. The application restarted successfully and its health check passed.

## Validation

93 live checks passed, with zero failures: public assets/pages match local content, HTTPS health, canonical portal URLs, unsigned access denial, private-file protection, four existing demo-role logins and sessions, BHW patient/archive/resident/encoding/purok reads, MHO statistics, Admin pending accounts, Superadmin health, BHW role restrictions, and FHSIS/PIDSR PDFs.

The live registration screen and its Cancel return to login were also checked in Brave. Google authentication, new registration and email/reset were not repeated: their code already matched, and their prior user-completed live checks remain the recorded evidence. No patient writes or email tests were performed during this verification.

## Recovery

Previous copies of the six files and private deployment verification metadata are retained on the VM at:

`/home/azureuser/azure-sync-1791865544511`

The deployment script automatically restores previous code if its integrity, database-preservation or health checks fail. Deployment succeeded, so rollback was not used. The temporary loopback staging page/server was closed after transfer.

Runtime digest: `df6934645770c819a0af37a79283c8a4e09aaeea5675b283c9d2c00db6c77a13`.

Site: https://health-intel.eastasia.cloudapp.azure.com/

Local evidence and deployment tooling: `analysis/azure-sync-20261013/` (ignored by Git). Source-control publication was not part of this request. Prediction validation remains pending.
