# Verified MHO Predictions Azure release

Completed: 2026-10-25T21:49:21+08:00; CODEX-2; DEPLOY-002.

Live: https://health-intel.eastasia.cloudapp.azure.com/mho.html

Azure release completed and verified on 25 October 2026. The public MHO Predictions page now matches the reviewed local dashboard, including removal of the two requested header labels. Exactly 12 runtime/evidence files were installed; original frozen Balanced results remain 66/70 future pairs and 9/18 complete aggregates. All/all remains unavailable. October 2026 is the sole displayed forecast from September history; Run Forecast loads saved evidence, without fitting or operational-patient queries. Historical scores remain selected-scope performance, not future occurrence probabilities.

The production service now has an explicit ENABLE_SARIMA_DEMO=true systemd opt-in; default production access remains disabled without that flag. MHO authorization, no-store responses, source-integrity checks and private-path protection remain. No credentials or private .env contents changed. No dependencies, schema, model, CSV, original research result or Azure networking/VM size changed.

Activation exposed a deployment defect: two newly created evidence directories inherited root-only 0700 access. Corrected only those two directories to root-owned 0750 with the existing healthintel service group. No public access was added. The first service-user CLI probe inherited the inaccessible waagent working directory; the corrected probe used the application server directory and passed. The application then loaded choices and forecasts normally. Failed probes and the original activation script are retained as evidence.

Verification: 44 focused local tests passed in DEPLOY-002; live API verification passed 1,006 assertions across all 88 scopes, including exact saved predictions/metrics, anonymous denial, non-MHO role denial, invalid choice/origin rejection and private-path denial. All four public frontend hashes match the local release. HTTPS health passes. Actual live browser checks covered Cough/Salvacion, Cough/all barangays, all diseases/Salvacion and incomplete all/all; desktop 1440 and mobile 390 responsive layouts were inspected, graph rendered, no mobile horizontal overflow, and genuine screenshots saved. This is browser emulation, not physical-device certification.

An encrypted recovery database ZIP was created on the VM; its SHA-256 and per-entry encryption flags passed. Private settings and 12 final file hashes passed. Clinical table fingerprints remained unchanged after verification; only revoked_api_sessions and system_audit_logs changed through designated test sign-in/sign-out. Recovery: /home/azureuser/azure-mho-dashboard-20261025. No Git staging, commit, push, reset or stash; security checkpoint retained. Remote runtime remains Node 24.21.0; local 24.22.1, with no runtime upgrade in this release.

Limits: original four missing pairs and incomplete aggregate forecasts remain; no exploratory lag2 results promoted, no live retraining, genuine disease-data validation remains pending and the proposed tolerance still needs panel acceptance. Existing broad 0777 modes observed on the remote application/server/services directories predate this release; they were not changed and warrant separately scoped deployment-permission hardening. Passing these checks is not a security certification.

Evidence: deployment-result.json, service-access-diagnosis.json, correct-service-access.sh, post-deployment-check.sh, live-verification.json, public-verification.json, post-deployment-verification.json, final-database-verification.json, browser-verification.json, local-tests.log and genuine azure-desktop.jpg / azure-mobile.jpg / azure-mobile-details.jpg.
