# Local beta testing report — October 7, 2026

## 1. Fixes completed

- Step 2 registration Cancel now uses the same full-width, 44-pixel-high control as Step 1, labeled **Cancel and return to Login**. Desktop and phone checks confirmed it returns to the login form.
- BHW downloads PDF tools only when exporting. A failed plugin download can be retried without downloading the core library again. MHO no longer loads unused jsPDF libraries at startup; its server-generated reports still download.
- Failed Admin patient archive/restore requests stay in the confirmation dialog and show the error. Retry succeeds. Account and disease registry changes now show failed saves instead of silently failing or reporting success.
- Improved table headings, case statuses, audit labels, correction/archive/report buttons and empty-state contrast in light/dark themes.
- Fixed skipped headings in Resident Profiles and account dialogs. Improved dark-theme password buttons and light-theme Superadmin history labels.
- Google sign-in guards against competing popups and gives useful blocked/closed/network error messages.

## 2. Workflows checked

| Area | Result |
| --- | --- |
| BHW | Added a synthetic newborn; age displayed as 0. Corrected severity with a reason, updated status/follow-up, archived/restored, searched directory and opened dossier. Keyboard focus stayed inside dossier; Escape closed it. |
| MHO | Saved a synthetic walk-in with an unlisted condition and source; classified it against an existing registry entry; queue cleared. Downloaded an actual summary PDF. |
| Admin | Approved a pending test account; denied/re-evaluated another request; suspended/restored access; created/archived/restored a disease. Injected patient archive failure showed an error without false success; retry and restore passed. |
| Superadmin | Downloaded an encrypted ZIP. Required a suspension reason, revoked disposable Admin access, restored it and displayed the saved reason in account history. |
| Google registration | User completed real Google verification, submitted the disposable profile, saw Registration Received, then successfully logged in as test BHW-001 after approval. Approval email was captured locally. |
| Recovery | Browser requested a code, rejected mismatched passwords, reset a disposable account and logged in with the new password. API also rejected reuse of a consumed code. |
| Actual Gmail delivery | Two explicitly authorized dummy approval/recovery example emails were accepted by SMTP. User confirmed both arrived. |

All browser data changes used a disposable database, not the original patient database. The test BHW-001 account does not establish or change that account in the main database.

## 3. Mobile and theme checks

- Checked **72 main-view combinations** across four roles, light/dark themes, desktop 1440×960 and phone 390×844. Prediction view was excluded as requested.
- Checked **52 additional combinations** covering account/new-patient/correction/history/backup dialogs, Admin archived/active subviews, registry form and service instructions.
- Retested the **12 affected dialog combinations** after correcting their findings.
- Final targeted checks found no remaining violations of the selected contrast, heading-order, button-name and form-label rules in the tested views. No document-wide horizontal overflow was detected there.
- Recovery form also passed the selected rules at desktop and phone sizes.
- These are targeted automated checks plus selected visual/keyboard checks, not a complete accessibility certification or a guarantee for every device.

## 4. Performance and recovery

| Local burst | Requests | Failed requests | Median | 95th percentile |
| --- | ---: | ---: | ---: | ---: |
| 10 concurrent clients | 90 | 0 | 92 ms | 198 ms |
| 25 concurrent clients | 225 | 0 | 173 ms | 364 ms |

The test seeded 1,000 synthetic cases and confirmed 35 new records saved during the measured bursts. Clients shared a disposable BHW token; this was a short API burst on this PC, not 25 separate browser sessions, a sustained-load test or proof of Azure VM capacity. Predictions were not load-tested.

An actual authenticated encrypted HTTP backup was decrypted and restored into a separate disposable database. Eight tables matched the backup data; the audit comparison allowed the new backup audit entry created after the dump. Restored credentials worked and the restored BHW system opened in a browser. Restore database was removed afterward.

## 5. Regression results and limits

- Full project regression suite: **103 passed, 0 failed**.
- After the final dialog styling changes, focused UI/theme regression checks: **14 passed, 0 failed**; affected browser dialogs passed again.
- Local changes only. **These changes were not deployed to Azure in this task.**
- Prediction model work and accuracy validation remain postponed at the user's request.
- A longer beta rehearsal on representative phones and the hosted VM is still needed before claiming production capacity. Current results do not certify daily operational use with real health records.

## Evidence

- [Main-view audit results](../analysis/local-beta-20261007/audit-results.json)
- [Deeper workflow/dialog results](../analysis/local-beta-20261007/deep-browser-results.json)
- [Corrected dialog recheck](../analysis/local-beta-20261007/dialog-recheck-results.json)
- [Recovery browser results](../analysis/local-beta-20261007/recovery-browser-results.json)
- [Google registration results](../analysis/local-beta-20261007/google-results.json)
- [Superadmin governance results](../analysis/local-beta-20261007/super-governance-results.json)
- [Load and restore results](../analysis/local-beta-20261007/services-results.json)
- [Regression log](../analysis/local-beta-20261007/regression-results.txt)
- [Cancel on phone](../analysis/local-beta-20261007/profile-cancel-390.png)
- [Archive failure handled in dialog](../analysis/local-beta-20261007/admin-save-failure.png)
- [Restored system screenshot](../analysis/local-beta-20261007/restored-dashboard.png)

Cleanup confirmation is recorded in `analysis/local-beta-20261007/cleanup-results.txt`.
