# Azure MHO/BHW update — 14 October 2026

Deployed the current local runtime to https://health-intel.eastasia.cloudapp.azure.com/ through the signed-in Azure portal's RunShellScript command. Browser access recovered after the Codex restart; verified SSH remained unavailable. No network or VM-size settings were changed.

## Included behavior

- MHO's revised consultation form: family name first, compact suffix with None, assisted birthdate, consultation mode/date/time, required measurements, linked follow-ups/admissions, and separate Record Case / Visit and Recent Consultations tabs.
- BHW's revised case/visit wizard, resident dossier history, directory filters/pagination, and shared consultation validation.
- Today-only BHW/MHO report endpoints and updated report controls.
- BHW death reporting and MHO Resident Status review, confirmation/correction, unique-resident registry, visit-date safeguards, and preserved clinical history. Case-level Deceased outcomes are not automatically converted to confirmed resident deaths.
- Matching shared UI/theme improvements and supporting Admin/Superadmin changes already present locally.

36 differing or new files were installed; all 127 allowlisted runtime file hashes matched the local project, with text line endings normalized. Runtime digest: `1687f88e45948398f6bce1c3618384dc6d7b9cc0ac1b6adcac90c75e4fc38f18`.

## Data and migration

The existing Azure database and accounts were retained. No local records or private configuration were included in the upload. Before/after fingerprints of every original table's original fields matched while the application was stopped. The private environment hash was unchanged.

The consultation migration adds suffix columns where missing and creates `case_visits`. The resident-status migration creates `resident_death_reports` and `resident_vital_status`. Both were executed twice to verify idempotence. Existing rows were not backfilled into invented consultations or resident death confirmations.

Azure's application database login intentionally lacks schema-creation privileges. The first migration attempt rolled the code back after its encrypted backup succeeded. The final deployment used the VM's existing Unix-socket database administrator only for schema maintenance; application database permissions were not expanded.

## Verification and recovery

The final deployment returned `AZURE_UPDATE_OK` with database preservation, encrypted backup integrity, private-settings preservation, complete runtime integrity, and healthy service checks all true.

108 hosted checks passed with no failures: code hashes, HTTPS, canonical URLs, blocked private files, anonymous access denial, existing demo-role logins/sessions and role restrictions, patient/resident/consultation reads, MHO pending/confirmed resident status, invalid resident-ID write rejection, FHSIS/PIDSR PDFs, both today PDFs, and the confirmed-resident registry PDF. A separate public-only pass had 87 successful checks. Authenticated verification proceeded after the user's explicit approval; no patient records were added, changed, or deleted. Existing login/export audit behavior can add normal audit entries.

Browser checks confirmed MHO form/navigation, Resident Status loading, BHW form/cancel, resident filters/pagination, and logout. Demo sessions were signed out. Hosted screenshots and verification metadata are in `analysis/azure-sync-20261014/`.

Private encrypted database backup, previous code, and preservation metadata are retained on the VM at `/home/azureuser/azure-sync-1791934613892`. Earlier failed-attempt recovery files remain at `/home/azureuser/azure-sync-1791933146541`. These VM recovery copies do not replace the separate PC backup job, whose SSH connectivity is a separate issue.

Google registration/email recovery were not repeated; their deployed code matched the current local runtime and the earlier user-completed hosted checks remain the evidence. Forecast/model changes and GitHub publishing were not part of this deployment.
