# Azure four-feature release

CODEX-1, 14 November 2026, 08:11 PHT. Owner-authorized deployment completed. Existing dirty local application work was preserved. No Git commit or push.

## Deployed behavior

1. Duplicate-patient prevention. Updated BHW and MHO registration, resident lookup/revalidation, reviewed possible matches, explicit existing resident IDs and concurrent-registration protection. Live signed-in BHW and MHO dialogs show Existing patient / New patient. Local isolated integration tests verified original case/consultation counts, concurrency and authorization. No production patient save or merge was attempted.
2. Seven BHW historical dataset overviews. Deployed shared CSV analytics and presentation. Assigned-barangay filtering is server-side. Live BHW-002 displayed Alegria with 891 cases. All seven server totals verified below.
3. Municipal dataset analytics. Live MHO showed 6,200 historical cases and 45 months with the required Demonstration Dataset — Synthetic Historical Data label. Switching to Live operational data showed eight cases. The views remain distinct.
4. SARIMA and COM-Poisson. Deployed current publication synchronization and operational probability preparation support. Both roles use the same publication pointer. Frozen probability mathematics and saved data already matched Azure. New probability calculations require reviewed genuine historical errors and retain unavailable results where evidence is insufficient. Live BHW Predict showed a SARIMA count with matching experimental exact/nearby probabilities. All 70 scoped saved selections returned successfully in the deployed route harness.

## Reconciliation

| Barangay | Cases |
|---|---:|
| Alegria | 891 |
| Blumentritt | 911 |
| Caliban | 884 |
| Cansilayan | 862 |
| Minoyan | 882 |
| Salvacion | 887 |
| Sta. Rosa | 883 |
| Municipality | 6,200 |

Private CSV SHA-256 remained 49b4ca92eff35bc574b61f46cde982a35b4d843b84d71228158e1941829c84e7. All ten diseases and Jan 2023–Sep 2026 were retained.

## Existing Azure functionality preserved

The frozen conditional-pooled-CMP service, forecasting capacity code and original SARIMA worker directories matched local or were retained. The production Python remains /var/lib/health-intel-monthly-stage-20261113/venv/bin/python. Linux preflight using the running service environment passed with about 2,791 MiB available. An initial root-context probe lacked the delegated memory root and was replaced with the service-context probe.

Azure-only account-directory.js and account-status.js remain untouched by this release. They continue excluding the 29 retired accounts and blocking restoration. No active beta/demo accounts were found. Production remained eight cases, eight residents and eight consultations. Deployed file hashes, original account rows, clinical tables, original audits, dataset, .env and worker files were compared before and after installation. Publication remained null. No operational prediction was trained, prepared or published.

## Tests and browser checks

- 38 focused local tests passed for duplicate matching, registration, dataset aggregation, source separation, all-70 CMP attachments, role/barangay scope and account transitions.
- 14 further local monthly/publication/UI/CMP tests passed with the pinned scientific Python configured. Total 52 passed, zero final failures.
- Initial sandbox test failures were localhost access restrictions. Rerunning outside the sandbox passed. Two initial monthly tests lacked HEALTH_INTEL_QA_CMP_PYTHON; the configured rerun passed.
- Azure server harness verified all seven totals, municipal total, all 70 saved prediction selections, cross-role and forged-barangay denial, all 23 deployed hashes, saved experimental probabilities enabled and unchanged publication.
- Actual running API anonymously rejected both dataset endpoints and the publication endpoint with 401.
- Signed-in BHW and MHO browser checks passed for source views and both patient entry dialogs. BHW Predict rendered the count and experimental probabilities.
- MHO Monthly Updates loaded October reports read-only, showing 0 of 7 confirmed and no published version. Preparation is unavailable until the existing 45-consecutive-month reporting requirement is met.
- Fresh real patient creation, production concurrent saves, new operational publication and new real-world probability validation were intentionally unexercised. Their failure/rollback paths passed isolated local tests.

## Backup and rollback

Fresh encrypted Azure backup /var/backups/health-intel/four-feature-db-99I2DZ passed authenticated decryption and isolated restore of all 24 tables and 1,067 rows. SHA-256 f790b18003b0a5c6ed70dfe07d6890767a7137989570f23afc27f46db3ca6438.

Exact release evidence and before-files are in /var/backups/health-intel/four-features-20261114. manifest.json records each before and after hash. rollback-manifest.json includes original owners and permissions. Every before-file hash was verified. The syntax-checked rollback procedure is rollback.cjs. Run sudo /usr/local/bin/node /var/backups/health-intel/four-features-20261114/rollback.cjs to restore this release's files, guarded against subsequent changes, then check health. The procedure restores application code only and does not overwrite the cleaned production database. No destructive schema change or dependency reinstall was needed.

SSH remained unreachable. The authorized Brave Run Command tab received and verified the release through a temporary localhost-only transfer endpoint. The endpoint was stopped after deployment.

## Exact deployed files and SHA-256

- assets/css/bhw/bhw-utilities.css — b2d73835c740252a0f05ee3d0415442fedcc77282ecaf759f76656ecb84db400
- assets/css/mho/mho-utilities.css — 952a6a7fd23bbe5b081dca6f40e35946568f087f443d9fc29dc27b13ad6ff4c0
- assets/js/bhw/bhw-dialogs.js — 2abb9a105e5175b7402d3fbf8182adcc46f31c3f0c9245771bc3e1170da63415
- assets/js/mho/cmp-presentation.js — f74198277d6fc558cba729576511d5f9b5a426f56f912fc0e980b171b247a270
- assets/js/mho/mho-forecast.js — 001c9730ecc60fd1f18114d75500ee37596d12894d7a87650fdde1f866368718
- assets/js/mho/mho-walkins.js — dd088731772c51a82689cdd3089f0e5aca36e3b6d4122b21eeee0224418343f9
- assets/js/mho/operational-monthly.js — dfccd346beac5dc1e551c290e5bed3ab0dabe575b0f0caec1580f6c2eca7d284
- assets/js/shared/dataset-analytics.js — 89cc846afd295967aae49a3d5f373cf0f9af4b1ace1163a6f7372ab0b7212279
- assets/js/shared/patient-picker.js — 2675ca00d10ca63fedc0689f9c0d4c594d8e714784cd0f11940ed2569f30f25c
- assets/js/shared/patient-visits.js — 0c8c54364406f262b4031ab99943daf24bebeb550e170bf797a132c2670d6c13
- bhw.html — 6726ca9fe33693fa1059917ae4a3d3ec59031baa1010b78f04ac6e3257a4c403
- mho.html — 60ad29d967fdb1afddc1fe20897cc401f5c5e15f48c2e0aa00cbecfcbf427cc8
- server/middleware/access-control.js — 36d45791c9594fa2813e0d6f3e6a405bd8970304949410945929dc8ff4d87b2b
- server/routes/analytics-routes.js — a226e8c8e33cf684abc37abfe14302e11aa3dce349202023458ade1d1101f583
- server/routes/case-routes.js — 2889295ffe27a7d6066ee40391f9337213ce784a1a4234b816a00b9b15fa14f3
- server/routes/monthly-prediction-routes.js — 9645f83e5a47f88840eb4ebcfcd2d177b7e6a391ac5cc3c8613d945711e93f7a
- server/services/case-encoding.js — 73ed68db9c59c7d7128f866d1a7049d57c6acda1b14829d149d8e4ce9b08216d
- server/services/dataset-analytics.js — 99ca45590763516b51a3c0a52cac1d06ceb99cd103aaf72b222cffb17e33c94d
- server/services/encoding-residents.js — ddcb879ae5c581a5f6df616a32f6ad4853a2a44eb5d88b247daaf384a01f1a49
- server/services/monthly-predictions.js — 067d03a65e7d8036400b67880ff719ace2ea457aaadb024800e0161d4f6eb5a4
- server/services/operational-cmp.js — 760e9d0ece5d93f01cb6e00cc5e45dc2d7141eaf0b0283a5d590115dcd061829
- server/forecasting/conditional-cmp/calculate.py — 3fd17002bd8854c3f4fa6bcee0b8bb98824ff20e7a6e58ea474c9254e13093f3
- server/forecasting/conditional-cmp/frozen_math.py — 89b77ff5ac90875462a39f8e73eba621d75ad377374faf513601e9da1cff9915