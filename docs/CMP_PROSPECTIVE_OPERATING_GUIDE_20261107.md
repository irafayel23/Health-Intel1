# Future monthly prediction validation

7 November 2026 · Sol engineering / CODEX-1 · Separate operator workflow

This folder adds review records and readable reports around the preserved `cmp-reliability-20261106/prospective.py`. It uses the selected conditional-pooled COM-Poisson policy and preserves the original CMP and two Poisson baselines for comparison. No policy selection occurs here.

## Before using this with operational exports

MHO confirms the source and completeness of monthly totals for all ten diseases and seven barangays. The current operational SARIMA pipeline requires at least 45 consecutive complete months. An omitted report stays missing. A zero means reporting is complete and no eligible new cases were recorded for that selection. A returning consultation must not count as a duplicate new disease case.

The wrapper validates reviewed exports and all 70 selections. It cannot establish the truth of reporting-completeness attestations or verify that a `mode=operational` tag represents genuine records. MHO must do that review. Keep operational data private. Keep demonstration histories and synthetic QA fixtures separate.

## 1. Open PowerShell in this folder

```powershell
Set-Location 'C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/cmp-prospective-qa-20261107'
$researchPython = 'C:/Users/User/Downloads/Final proj/SARIMA_GitHub_Research/experiment-resource-v2-20261023/.venv/Scripts/python.exe'
```

Retain the entire original research folders, this wrapper, tool-locks.json and the scientific environment. No installation is needed on this PC. For the commands below, replace `PATH/TO/...` with private, reviewed files. These examples create no case data or operational prediction packet by themselves.

## 2. Check the reviewed SARIMA exports

Use the completed monthly run's input.json and output.json. The existing adapter checks their source binding, chronology, registered SARIMA diagnostics, source manifest and mapping. Additional wrapper checks reject duplicate prior prediction pairs, future pairs, missing months and invalid counts before probability fitting.

```powershell
& $researchPython -X utf8 -B workflow.py check --input 'PATH/TO/input.json' --sarima-output 'PATH/TO/output.json'
```

Save the printed cutoff, target and two file hashes. This check is structural. Approval, issue timing and final-outcome knowledge are checked at issue time as described below.

## 3. MHO completes a history review record

Create a separate UTF-8 `history-review.json`. Copy both file hashes printed by step 2. Use the actual MHO account/role identifier and a private reporting-review reference. Do not put patient identities in this file. Confirm all seven reports and that final target-month outcomes are still unknown.

```json
{
  "stage": "history",
  "cutoff": "YYYY-MM",
  "target": "YYYY-MM",
  "reviewed_by": "MHO-ACCOUNT-ID",
  "review_reference": "PRIVATE-REVIEW-REFERENCE",
  "confirmed_barangays": ["Salvacion", "Alegria", "Blumentritt", "Caliban", "Cansilayan", "Sta. Rosa", "Minoyan"],
  "reporting_complete": true,
  "target_outcomes_unknown": true,
  "source_input_file_sha256": "COPY-INPUT-FILE-HASH",
  "source_output_file_sha256": "COPY-OUTPUT-FILE-HASH"
}
```

Use exact names from the reviewed export. Hashes are lower-case. This is an MHO attestation record. The software does not independently authenticate its author.

## 4. Issue and freeze the monthly packet

The cutoff month must have closed, the target must be its following month and the target month must still be in progress. The CLI uses the PC's current UTC clock and records Philippines month boundaries. It has no date override. Exclude target-month data from fitting. Issuing after October reporting closes in early November is recorded as issued during November, with the elapsed days. It cannot support a fully ahead-of-November claim. A completely future calendar-month protocol needs separate horizon approval and verification.

```powershell
& $researchPython -X utf8 -B workflow.py issue --input 'PATH/TO/input.json' --sarima-output 'PATH/TO/output.json' --review 'PATH/TO/history-review.json' --directory 'PATH/TO/NEW/private-monthly-packet'
```

Use a new directory. The existing issue tool calculates dispersion under the frozen policy from earlier accepted pairs and saves all four methods. It does not refit SARIMA. The calculation may take several minutes. Existing numerical safeguards apply. A failed probability calculation stays unavailable with its status.

Success requires `workflow-complete.json` and the receipt printed by the wrapper. This receipt is the SHA-256 of that manifest. It covers the original prediction receipt and the companion exports and review. The manifest records when issuance finished as well as the engine's start timestamp in the packet. Retain the **printed wrapper receipt** independently with MHO/adviser before final outcomes are available. Use it for scoring. The engine's internal receipt.sha256 is a separate file. The directory contains:

| File | Purpose |
|---|---|
| predictions.json | All 70 attempted selections, timestamp, dates, unchanged SARIMA means, rounded counts, full probability distributions, status and source/environment hashes for each method |
| receipt.sha256 | Existing canonical packet digest |
| probability-summary.csv | 280 method/selection rows, including the selected policy flag, exact and nearby probabilities, ranges, unavailable statuses and SARIMA counts |
| mho-history-review.json | MHO attestation and reviewed file hashes |
| workflow-complete.json | Policy identifier, wrapper version/hash and hashes binding all companion files |

CSV probabilities use fractions from 0 through 1. For example .3227 corresponds to 32.27%. Missing probabilities are blank and retain an unavailable status. When SARIMA has no estimate, no exact/nearby event is defined for that selection even if a baseline distribution exists.

No issued file is overwritten. If a run is interrupted or fails after creating files, retain its directory for investigation. A directory without its completion marker is incomplete. Do not treat it as approved or silently replace it. Never issue several versions and later select the most favorable. Use the first declared eligible packet and document any corrections.

## 5. Close reporting and prepare actual totals

After the target month ends, MHO confirms all seven reports. Supply exactly 70 unique aggregate rows, with the exact header below. Use the target month's first day for Date. Cases must be nonnegative integers. Every disease/barangay pair must appear. Missing rows, blank counts, duplicate pairs, wrong dates, negatives and decimal counts are rejected. A confirmed zero is accepted and scored.

```text
Date,Barangay,Disease,Cases
```

This guide deliberately supplies no invented operational outcomes. Corrections require explicit versioned review. To get the reviewed actuals file's hash in PowerShell:

```powershell
(Get-FileHash -LiteralPath 'PATH/TO/confirmed-actuals.csv' -Algorithm SHA256).Hash.ToLowerInvariant()
```

MHO creates `outcome-review.json` with the actual target, independent prediction receipt and actuals file hash:

```json
{
  "stage": "outcomes",
  "target": "YYYY-MM",
  "reviewed_by": "MHO-ACCOUNT-ID",
  "review_reference": "PRIVATE-COMPLETED-REPORT-REFERENCE",
  "confirmed_barangays": ["Salvacion", "Alegria", "Blumentritt", "Caliban", "Cansilayan", "Sta. Rosa", "Minoyan"],
  "reporting_complete": true,
  "prediction_receipt": "INDEPENDENTLY-RETAINED-RECEIPT",
  "actual_file_sha256": "ACTUALS-FILE-HASH"
}
```

## 6. Score the frozen packet

```powershell
& $researchPython -X utf8 -B workflow.py score --directory 'PATH/TO/private-monthly-packet' --receipt-sha256 'INDEPENDENTLY-RETAINED-RECEIPT' --actuals 'PATH/TO/confirmed-actuals.csv' --review 'PATH/TO/outcome-review.json'
```

The existing tool verifies receipt, registered scientific environment/source versions, timing and complete actuals. The wrapper also checks its review/export fingerprints. A changed packet or companion file is rejected. Success requires `scoring-complete.json`. It saves the original assessment.json, mho-outcome-review.json, operator-assessment.json and calibration-bins.csv. A repeated assessment is refused. Retain incomplete files for investigation if scoring fails partway.

The operator assessment contains own-availability results, the intersection of all four methods, and the original-versus-pooled intersection. Compare scores within the same target set. Each metric has its own valid denominator. Calibration uses fixed probability bands and shows sample count, mean assigned probability, observed frequency and their difference. Empty bands are omitted; if no exact/nearby events are defined, the calibration CSV contains its header only.

| Field | Interpretation |
|---|---|
| attempted / available / unavailable | Count every requested selection and preserve failures |
| exact_probability / exact_observed | Average exact-event probability and actual exact-match frequency |
| nearby_probability / nearby_observed | Average nearby-range probability and actual range-hit frequency |
| exact_brier / nearby_brier | Average squared probability errors, lower is better |
| nll | Log loss of the observed count, lower is better |
| rps | Full-distribution ranked probability score, lower is better |
| coverage80 / coverage95 | Fraction of outcomes inside the model intervals |
| mass80 / mass95 | Average distribution mass actually included in these discrete intervals |
| width80 / width95 | Average interval widths in cases |

An impossible positive outcome under a zero-mean distribution retains infinite log loss, serialized as `Infinity`. The reports do not replace it with a finite number or drop it. One month's calibration bands are descriptive and often small. Accumulate new issued monthly packets, examine Cough, zero and high-count outcomes, and retain month/group dependence when assessing uncertainty. Do not refit to these outcomes and claim the rescored result as independent confirmation.

## Limits and recovery

These tools require reviewed operational exports. They cannot verify staff honesty, discover report omissions, prevent someone registering a second packet in a different directory, provide an independent trusted timestamp, or prove the local PC clock is correct. Have MHO/adviser retain the first receipt and signed review independently. Patient records and export acquisition remain outside this tool.

Keep this wrapper and its lock file at their issued versions until scoring is complete. Removing the separate QA folder stops using the helper without application rollback. Preserve all issued packet directories and the original research directories. No application integration is performed.

## QA only

From this folder, run `python -B -m unittest -v test_workflow.py` with the research Python. Tests label their temporary directories SYNTHETIC_QA_ONLY, use fixed test dates and mock dispersion optimization to exercise failures deterministically. Real COM-Poisson probability/scoring functions are checked against independent Poisson mathematics and an RPS identity. Fixture dates and outcomes are software tests and must never be reported as prospective evidence.
