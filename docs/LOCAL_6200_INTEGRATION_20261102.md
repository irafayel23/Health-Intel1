# Local 6,200-case SARIMA integration — 2 November 2026

Completed with explicit owner approval for local activation and three root CSV replacements. Azure was not accessed or changed. No MySQL import,patient-data update,migration,model fitting,policy tuning or dataset regeneration occurred. Existing nine-template numerical SARIMA source/thresholds and all frozen research remain unchanged.

## Active local application

http://localhost:3000/mho.html → Predictions → Predict. Local app server started session62064 with process-only SERVE_FRONTEND=true;no environment file or deployment configuration edit. Leave it running. Signed-in MHO browser verification completed;70actual selections independently matched the installed service and native candidate results. Graph,ownselectedscore/MAE/RMSE/MAPE,summary and recommendation output match. No captured browser errors/warnings during checks. Preview desktop/mobile/light/dark evidence remains applicable because frontend files are unchanged;fresh installed portal was checked at desktop size.

70/70October2026SARIMAestimates,0currentfallbacks,historyendsSeptember2026. Primary563/626=89.9361%,4/630historicaloutputs unavailable;MAE0.492066/RMSE0.701862/MAPE29.934570%. Secondary866/973=89.0031%,7/980unavailable. Each selection displays its own metrics. Influenza/Caliban has5/9historicaloutputs;100%amongthose5does not imply100%futureaccuracy. Null historical fits remain missing;no baseline substitution. This is the previewed SARIMA-only reporting contract,distinct from an optionalfallback-policyresult.

## Dataset files

|File under datasets/|Monthly rows|Cases|
|---|---:|---:|
|itr_historical_cases_7_barangays.csv|3150|3146|
|synthetic_group_b.csv|3150|3054|
|combined_historical_cases.csv|3150|6200|

Exact four-column schema Date,Barangay,Disease,Cases. Cellwise first+second=combined;combined histories independently match installedsnapshot. First file retains owner-requestedlegacyname but contains3054generatedGroupAcases+92preservedITR-derivedcases. It is not3146verifiedITRcases. Genuine92ITRmonthly source preserved unchanged in frozen scenario. Sources documented in datasets/CURRENT_PREDICTIONS_DATASET.md without adding CSVcolumns. Candidate source hashes validated;formatting differences between rootCSVandprivateCSVdo not change any cellcounts. Predictions serve savedsnapshot;editingrootCSValone does not retrainorrefresh it.

## Changed files

- New server/services/seasonal6200-sarima-demo.js:versioned saved-evidence adapter with candidate hash/context/metrics checks;original5592service preserved.
- New server/data/seasonal-sarima-6200/{snapshot.json,SYNTHETIC_monthly.csv,manifest.json}:verifiedcandidatebundle;old5592bundle untouched.
- server/routes/balanced-sarima-routes.js:one import switched to new service;authentication,role checks,API contract preserved.
- Three datasets/*.csvabove replaced;datasets/CURRENT_PREDICTIONS_DATASET.mdadded.
- New server/tests/seasonal6200-sarima.test.js;oldcombined/lowcounttests updatedonlytheircurrentroutetotalexpectation5592→6200,while originaldata/benchmarktests remain intact.
- This report and sharedCODEXtasks/handoff/changelog/overviewupdated. Existingdirtywork preserved;noGitcommit/reset/push.

## Actual checks

- Full npm test:334passed,0failed,0skipped;see externalnpm-test.log.
- Focused27tests passed,including all70realfrontendhandlers at4widths,missinghistoricaltargets,zero-MAPEarithmetic/unavailability,tamperedbundle,requesterrors,archiveddataandrole/activationchecks.
- InstalledBrave70completedPredictrequests;independentdisplaycomparison withsavedresultsexactatdisplayprecision,all70forecastlinespresent. Initialtestcapturewithoutcompletionwait was superseded by correctedcapture waitingforthePredictlabeltoreturn;noapplicationbugorcodechangeusedtosuppressit.
- IndependentPythonCSVcell/snapshotreconciliation3150/6200and3146+3054;artifact-toolblockroundtripforCSVauthoring;SHAprotectedsource/data/researchchecks pass. No source or model generation changed.
- Old5592service/bundle/CSVbackups andworkingGitdiff saved before edits. RollbackZIPactualSHA256andCRCverified.

## Limitations

Same synthetic scenario caveats remain:lower-noisegenerationdoesnotprovealgorithmimprovement,genuinevalidationpending;nozeromonthsinthiscandidate;3+targetwithinlimit46.34%;Cough/Sta.Rosa22.22%;53/70scopesreach80%;naivewinsprimaryMAE/hitratewhileSARIMAhaslowerRMSE. Annualevidencesupported28/70;42retainwarning. Historicalpercentagesarenotfutureoccurrenceprobabilities. No live monthlyrefreshimplemented. No AzurechangeorclaimthatAzurematcheslocal.

## Rollback

Checkpoint directory: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/local6200-integration-20261102

Stop only this task's local application process (session62064),then run rollback.ps1 from the checkpoint. It checks installed hashes and backup integrity before restoring the previousroute,threeCSVs,two routeexpectationtests. Newversionfiles are retained ratherthandeleted. Restart the existing app with process-only SERVE_FRONTEND=true and verify5592cases,70currentSARIMAand352/630. NoDBrestore needed. Do not resetGit orrestoretheentirecheckout.
