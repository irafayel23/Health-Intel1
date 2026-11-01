# Azure local-runtime synchronization — 2026-11-01T10:11:46+08:00

CODEX-1, user-authorized Azure deployment followed by GitHub publication. Azure activation and authenticated API verification are complete. GitHub commit/push follows this record; the final response and external publication-result.json identify the actual pushed commit.

Live: https://health-intel.eastasia.cloudapp.azure.com/mho.html

## Released

148 runtime/evidence files matched the prepared SHA-256 manifest. Current local combined5,592-case SARIMA bundle is deployed:3,150monthly records,January2023–September2026,10diseases,7barangays,70/70October2026SARIMA outputs. Primary352/630=55.8730%,MAE1.147493,RMSE1.503777,positive-onlyMAPE52.2389%. Every selection's own results were verified through authenticated HTTPS against the saved evidence. No FORECAST-020 partial-pooling model was integrated. Saved outputs do not retrain on Run Forecast. Genuine disease-data validation remains pending.

Local role sidebar/navigation, MHO stepwise entry/feedback, measurement alignment, scoped BHW heatmap, heat view/breakdown/severity, and other reviewed runtime changes were included. Backend dependencies installed for Linux from local package-lock using npm ci --omit=dev; bcrypt/Express/mysql2/nodemailer loaded. Existing systemd ENABLE_SARIMA_DEMO=true opt-in retained; combined service now requires that opt-in in production. Existing authentication and private-data boundaries retained. RuntimeNode24.21.0 was inspected, not upgraded.

## Recovery and data

Previous Azure Predictions and runtime preserved privately at /var/backups/health-intel/azure-sync-20261101/runtime-before.tar.gz. SHA2564e1515b4e3a2c0bca7e4593daea888c23229f12bc97c0d2a6760fc8aa7d3f60a. Archive listing and checksum passed. Old Linux dependencies retained at the same backup directory/node_modules-before. No schema migrations or operational case/resident/account modifications were deployed. Before/after operational row counts matched. A verification sign-in/sign-out generated normal account audit records; no claim of zero database writes from authentication. Raw ITR source files, local .env, credentials, research archives and DB backups were not uploaded in the release package or selected for GitHub.

Rollback: stop health-intel; restore the exact runtime archive into /opt/health-intel; move the current node_modules aside and restore node_modules-before; start service and verify health/auth/oldforecast. Retain new combined data as inactive evidence rather than deleting it. Backups contain private application evidence and must remain outside public web roots.

## Verification and limitations

- 63 initial focused tests passed including all70frontend selections and scope/metrics/graph/summary/recommendation arithmetic.
- 9 combined SARIMA tests passed after production opt-in, including70production-mode selections and default denial.
- Full existing suite:292tests,290passed,2failed initially. BHW legacy test expected7municipal map rows; corrected to1assigned row with matchingid. Rerunning the two affected test files:30passed,1failed. Final broad rerun291passed,1failed. Remaining failure: legacy /api/predict AR(1) timed out after120seconds; it is separate from current saved SARIMA endpoints. Do not claim all tests passed. No timeout increase or algorithm change made.
- Live authenticated HTTPS70/70forecasts exactly match installed service views;148installedfile hashes verified; public script/CSS hashes match; unauthorized forecast401, private snapshot/.env404, HTTPShealth200,serviceactive,rollbackchecksumvalid.
- Browser signed-in appearance verification interrupted by disabled browser control/usage approval limits; no new desktop/mobile screenshots claimed. Prior63tests use frontend DOM fixtures, not a fresh live visual certification.
- SSH source changed only from143.44.168.114/32to143.44.168.87/32,TCP22,priority910,after explicit userapproval. HTTP/HTTPS/otherNSGrules unchanged. Verifiedhostkey retained. NoVMresize or credentials/network-isolation relaxation.

External evidence: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/azure-sync-20261101. Existing main/a65e804 source checkpoint retained in Git history; local-before.patch and source manifests retained outside repository. GitHub publication includes reviewed code/tests/docs and aggregate saved forecast bundles, excluding rawdatasets/, binary manuscript artifacts, private backup and security logs. Pre-existing excluded local files remain on disk. The original Git-tracked dataset deletions are left unstaged rather than publishing raw source changes.


## GitHub publication verified

Release commit b1ef39e78c19ffefc53b3914d2cd61a065c31d3f was pushed and verified against origin/main (142files). This documentation follow-up records completion and releases ownership.
