# Four-portal Azure release — 8 November 2026

Completed 2026-11-08T17:06:48+08:00 by CODEX-1. Owner authorized all current local portal updates on GitHub and Azure.

- GitHub release: [77e33a4](https://github.com/irafayel23/Health-Intel1/commit/77e33a469de54a41ddaeb994c2f5451c516ee426).
- Azure: https://health-intel.eastasia.cloudapp.azure.com/.
- Scope: all four portal HTML pages, sign-in page, shared and role-specific styles/scripts, and supporting services.119 selected Git paths;93 runtime paths installed.
- Verified all88 public HTML/assets by SHA-256 against the current local bytes.138 local regressions pass. New server-side JavaScript syntax checks passed before activation.
- Live service and read-only database/account-directory queries passed. Anonymous /api/session returns401. Private environment and snapshot URLs return404.
- Live BHW browser: blue sidebar and greeting; Predictions has all ten diseases and only assigned barangay; saved Cough result/chart/metrics/summary/recommendations load; profile dialog and patient form/calendar button open. No console warnings/errors captured. No form, password or record changes submitted.
- Other roles: all deployed asset bytes verified; no new authenticated visual walkthrough for MHO/Admin/Superadmin. Tests are not proof that every live workflow has been exercised.
- Preserved all ten existing server/data file hashes, including the6200 saved SARIMA bundle. No database schema/data changes, dataset regeneration, fitting or statistical-policy changes. Existing .env, deployment configuration, firewall and dependencies untouched.
- Monthly controls remain hidden as requested earlier. The operational Windows worker route is registered only outside production; it is not activated on Azure. Experimental COM-Poisson is not integrated.

## Recovery and coordination

Private Azure runtime rollback: /var/backups/health-intel/four-portals-20261108.6pbagwg5. manifest.json records93 expected and previous-file hashes; before/ holds originals. Stop health-intel.service, restore existing files with recorded metadata, remove only newly introduced runtime files listed as previously absent, start the service and repeat health/hash checks. Do not touch retained backups or data.

External PC evidence: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/four-portal-release-20261108 (release.json, archive, scripts, activation output, HTTPS verification and screenshots). No database backup was created by this application-only release.

Local branch remains main/e5946d4 and the existing index/dirty tree are preserved. Do not pull or reset over them; reconcile with GitHub deliberately in a later task. Shared writer released. Hard-refresh already-open Azure pages to load changed assets.
