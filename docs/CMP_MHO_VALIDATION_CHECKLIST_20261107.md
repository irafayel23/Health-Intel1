# MHO checklist for future prediction validation

7 November 2026 · CODEX-2 · CMP-VALIDATION-READINESS-20261107

The isolated workflow can register all 70 disease–barangay selections for a supervised trial. Availability depends on the verified SARIMA outputs and eligible prior prediction pairs. The 70 demonstration results establish prototype coverage on that dataset.

## What MHO supplies

1. **Name a reviewer and a receipt custodian.** The reviewer checks the source and completeness of reports. MHO or the adviser keeps the first prediction receipt and the dated review independently of the prediction folder.
2. **Confirm at least 45 consecutive closed months** of genuine aggregate reports for the seven pilot barangays and ten study diseases. Include the reporting period, eligibility rules and completeness confirmations. Count new disease cases once. Resolve pending classifications and distinguish confirmed zero from a report still missing. Exclude test and demonstration records. Keep patient-level information out of shared evidence.
3. **Supply one verified local SARIMA run's input.json and output.json** for those months, including its earlier eligible predictions. The authorized operator can obtain the paired artifacts from the completed run's private local storage. Publishing the run is unnecessary for this study. The frozen conditional policy requires at least 28 informative earlier pairs across five origins and five barangays per disease. Record any failure or unavailable result.
4. **Before final target-month outcomes are known**, follow the existing check and issue instructions. MHO binds its review to both export hashes and confirms all seven barangays. Issue into a new private folder, confirm workflow-complete.json and retain the printed wrapper receipt. Registration takes place during the target month after the preceding month closes. Record its actual timestamp and elapsed days. Keep all target-month counts out of fitting and model selection.
5. **After the target month closes**, MHO supplies reviewed actual totals for all 70 selections in Date,Barangay,Disease,Cases format. A confirmed zero is an explicit row. A missing report postpones scoring. Bind the outcome review to the independent receipt and actuals file hash, then run the existing score step.

The [operating guide](CMP_PROSPECTIVE_OPERATING_GUIDE_20261107.md) has the exact commands and review record fields. The operator should retain the private input/output pair, issued packet, review records and receipt together with a separate custodian copy of the receipt.

## What the packet records

- Estimated cases are the original unrounded SARIMA mean plus its displayed rounded count. The CSV gives exact-count and nearby probabilities for each available method, and explicit status for unavailable selections.
- The issue date is the packet's UTC timestamp. The cutoff, target month, days elapsed and wrapper completion time record timing separately.
- Dataset version is the SHA-256 identity of the reviewed input, including monthly totals and report digests. The two original file hashes are in the MHO review. Model version is the frozen SARIMA policy hash plus CMP policy label and code hashes. Keep the whole packet because the CSV by itself does not carry all version fields.
- A complete packet has 70 attempts and 280 method rows. Unavailable output stays blank and retains its reason. A late or interrupted issue without a completion marker needs review.

## What the scores tell us

The existing score command provides exact and nearby calibration, Brier scores, full-distribution log loss and ranked probability score, interval coverage/mass, and matched comparisons. Run the separate read-only report after successful scoring to also obtain SARIMA MAE, RMSE, signed bias, positive-only MAPE and within-tolerance counts. Zero actuals remain in MAE and RMSE. The report compares forecasts to the actual count and breaks results out for zeros, 1–2, 3+ and increases of at least two cases from the confirmed cutoff month. It also checks the issued probability of zero and of that increase across all available selections. The observed-rise subgroup describes error on months that rose. Use the across-selection event scores to evaluate whether rise probabilities were useful.

Run this with the same research Python named in the operating guide and supply the same reviewed source files:

```powershell
& $researchPython -X utf8 -B 'C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-validation-readiness-20261107/review_scores.py' --directory 'PATH/TO/ISSUED-PACKET' --receipt-sha256 'INDEPENDENT-WRAPPER-RECEIPT' --input 'PATH/TO/input.json' --sarima-output 'PATH/TO/output.json'
```

The report reads verified completed results and prints JSON to the terminal. Store a copy privately if needed. Missing prediction counts, observed counts and per-metric denominators are separate. Report the threshold and small subgroup sample sizes. Use the existing calibration bins for exact/nearby probabilities. Keep month-level dependence in mind when comparing pooled results.

## Evidence and limits

- [Astra's final policy decision](CMP_FINAL_POLICY_REVIEW_20261107.md) and [Sol's operator QA](CMP_PROSPECTIVE_QA_20261107.md) are already in the shared records. The subsequent all-70 reliability review is indexed in the handoff. In its 24 previously inspected synthetic rises, the nearby range received 91.08% mean assigned probability and covered 16.67% of outcomes. This outcome-defined subset motivates the added report and remains retrospective.
- The MHO attests provenance, completeness and issue-time outcome knowledge. The local clock and a hash alone cannot establish these. Receipt custody is part of the protocol. Keep issued-during-month results separate from predictions made before an entire target month begins.
- Preparation can be completed now. The first supervised operational issue requires the verified historical exports and MHO review. Real-world scoring requires later confirmed target-month totals. Follow the frozen review plan for successive months, with descriptive reviews at six and twelve eligible months, and preserve missed or delayed outcomes.

**Next action:** ask the designated MHO reviewer whether the seven barangays have at least 45 consecutive complete genuine months. If they do, request the two private verified SARIMA artifacts for the latest completed cutoff and run the operating guide's check command before issuing. If they do not, document the missing months and continue collection.
