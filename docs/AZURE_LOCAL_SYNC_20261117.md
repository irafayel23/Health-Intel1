# Azure current-local release — 17 November 2026

CODEX-2. Owner explicitly authorized applying pending local application changes to Azure. Deployment completed at 16:41 PHT (08:41 UTC). Branch main/e5946d4; pre-existing dirty checkout preserved. No Git stage/commit/push.

## Applied

Compared 181 current application runtime/public files against the actual Azure VM. Installed 79 changed/missing files, including the prior pending registration review, patient-history/PDF/correction/reporting flows, BHW and MHO presentation/map updates, monthly-update workflow, and the new SQL paging and readiness endpoint. All 181 intended runtime hashes were verified on the host; 100 public HTML/assets matched exact local hashes independently over HTTPS.

The candidate manifest includes all frontend HTML/JS/CSS/images, backend configuration/middleware/routes/services, package metadata, and the two current portable monthly-worker runtime files. Frozen research data, saved predictions, existing operational prediction directories, production environment secrets and patient databases were not transferred from local.

## Azure-only reconciliation

Two files deliberately retain additional Azure retirement protections while incorporating the current local registration-review behavior. Their deployed bytes therefore differ from plain local files:

| File | Deployed SHA-256 |
|---|---|
| server/services/account-directory.js | 37a98b2851d2a2d8106b93b83d9ad9ff56a168ebcb7385f2fdbfcae98892045d |
| server/services/account-status.js | cdf4a710f3d4fea6c4a1da25b8b62166753f5dd5f309f64568c9850931741404 |

The original Azure SQL filters were retained in each directory/account-history/count query; the status-transition retirement guard remains before any account update. New registration submission/version and identity-review gates remain present. The 29 retired accounts were not restored or made visible. Do not overwrite these two reconciled files with the plain local copies in a future deployment.

Sharp and the exact package-lock dependencies were installed in private staging with npm lifecycle scripts disabled. Synthetic 200x200 image processing passed before activation. Previous node_modules was retained as /opt/health-intel/server/node_modules.before-sync-20261117. A private service-owned registration-review directory was prepared, and a scoped ReadWritePaths drop-in was added at /etc/systemd/system/health-intel.service.d/registration-review-20261117.conf for the existing strict filesystem protection. Production .env was not edited; no firewall, DNS, VM-size, credential or role-grant change was made.

## Backup, data and models

Fresh encrypted backup /var/backups/health-intel/local-sync-20261117/database-backup.aes passed AES-GCM authenticated decryption and an independent isolated restore/fingerprint comparison of all 22 base tables and 1,156 rows. The temporary restore database was removed after verification. Backup SHA-256: 093223e10da955188fdcf0727b45b243fe088a1f5583d729670c68646e724536. The private recovery material remains root-only on the host; it was not printed or transferred to local.

Immediately after activation, complete base-table fingerprints matched the before-deployment snapshot. Production contained 11 cases, 10 resident profiles and 11 consultations. This is the actual current baseline, including additions since the earlier eight-record release. No patient deletion, status cleanup, account modification or database schema migration was performed. Local operational data and the earlier local-only clearing of older cases were not copied or replayed on Azure.

All 13 protected existing data/environment files matched their predeployment hashes. The research dataset and saved evidence were preserved. The production publication pointer remained null. No model training, probability preparation, report confirmation or forecast publication was initiated. Subsequent owner-driven MHO/BHW sign-ins performed normal session/audit activity; the activation fingerprint receipt predates those acceptance logins.

## Verified live

- systemd health-intel active; /healthz HTTP200; /readyz HTTP200; pinned scientific preflight passed using the existing service environment/interpreter.
- Anonymous paginated resident/case/MHO-directory requests and operational publication request return401. /server/.env returns404. TLS verification was retained.
- All100 public HTML/assets match expected SHA-256; all181 host runtime files match the reconciled candidate manifest.
- Actual signed-in MHO: municipal chart total6,200 retained; recorded-case card6,211; directory10 entries; Caliban filter correctly returned0 entries. Saved Cough/Salvacion forecast showed4 cases, exact-count32.27%, nearby79.89%, with uncertainty and historical-performance labels.
- Actual signed-in BHW, Blumentritt: own seven patient records and nine resident profiles loaded; all existing case filters and resident age/purok choices present; no-match search returned an empty state. Saved assigned-barangay forecast showed5 cases, exact-count29.61%, nearby74.81%. No clinical record was opened for editing or saved during acceptance.
- Existing local evidence:43 focused tests and7 pinned-Python publication tests passed, including role/scope, duplicate prevention, SQL paging, source separation and all70 saved probability attachments. Full local portal suite still has two older assertion mismatches concerning an MHO startup endpoint and Admin decline label; these were documented before deployment.

No fresh production patient creation, photo submission, email delivery, correction/archive action, large-volume production load benchmark or new operational publication was performed. Those would alter data or contact people. Browser paging on large synthetic lists and failure states was checked locally; the live assigned lists currently fit one page.

## Recovery and exact evidence

Private host directory: /var/backups/health-intel/local-sync-20261117. It contains inventory-before.json, original-files.json, exact before/ runtime copies with ownership/mode metadata, candidate-manifest.json, database-before.json, protected-before.json, backup-receipt.json, stage-ready.json, deployment-receipt.json, rollback-state.json and syntax-checked rollback.cjs.

For an owner-approved code rollback run:

sudo /usr/local/bin/node /var/backups/health-intel/local-sync-20261117/rollback.cjs --restore-approved-release

The script first rejects later runtime/configuration changes or corrupted original copies. It restores only this release's application files, dependencies and scoped storage allowlist, retaining new files in a recovery folder. It does not restore or overwrite the patient database or private evidence. Then verify HTTPS health, signed-in access and prediction provenance. The code rollback was syntax-checked and recovery inputs were hash-verified; it was not executed after the successful release.

The machine-readable local deployed-manifest.json contains all181 final file hashes, including both reconciled exceptions, and the HTTPS verification receipt. Existing host rollback copies remain authoritative for original Azure bytes. Temporary loopback transfer was used solely for application source; no public tunnel or patient-data transfer was created.
