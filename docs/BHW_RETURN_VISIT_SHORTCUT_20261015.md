# BHW return-visit shortcut — 15 October 2026

BHW can now open **Resident Profiles → View Medical Dossier → Disease case history → Record follow-up / admission** beside an eligible case. View visits remains available in the same Actions column.

The action reloads that resident's scoped dossier before opening the existing consultation wizard. It starts at Consultation, fills the patient's name, suffix, birthdate and purok from the resident profile, and keeps those identity fields read-only. The patient's name stays visible in the step header. The user explicitly chooses New admission or Follow-up visit; New consultation/case is unavailable through this shortcut.

The original case is automatically selected. Matching refreshes only the selected resident's dossier, rather than loading the whole barangay patient list. Changed consultation dates recheck case eligibility. A stale resident link, mismatched identity, unavailable case or failed load cannot silently select a different case. Existing server checks continue to enforce identity, dates, required measurements, duplicate visits, archive/death restrictions and the BHW's assigned barangay.

Consultation date starts at today in Manila. Time, transaction mode, referral details, all four measurements, visit severity and notes start blank. Saved measurements and notes belong to the new visit; the original case date, status and severity stay unchanged. Cancel returns to the resident dossier. Missing or conflicting identity details, archived cases and confirmed deceased profiles do not show the shortcut. Existing historical-visit entry remains available through the normal form under its existing rules.

## Validation

- **162 full regression tests passed**, zero failures. Three added checks cover the pinned resident/case, eligibility restrictions and BHW admission/follow-up writes without changing original cases or resident totals.
- Browser checks used a disposable synthetic database. Verified read-only identity prefill, explicit return-only visit choices, fresh blank visit values, measurement validation, admission/follow-up saves and cancellation back to history.
- The test resident retained **2 disease cases**, while structured consultations increased from **12 to 14** after one follow-up and one admission.
- Dark mode and 390×844 phone checks passed. The form fit the viewport and Cancel stayed visible.
- The disposable database was removed and original local database contents passed fingerprint preservation checks.

## Deployment

Deployed five changed runtime files to Azure. All **133 runtime file hashes** matched the prepared local runtime, the service passed its health check, existing database row/field fingerprints matched, and the encrypted recovery archive and unchanged private settings were verified. No schema migration was required for this feature, and no local database was uploaded.

Live browser verification confirmed BHW demo login, the archived-case restriction, and an eligible case opening with the correct original case preselected. The live form was cancelled and the demo account signed out. No live patient records were added or changed during verification.

Private evidence and screenshots are retained under the ignored `analysis/bhw-return-shortcut-20261015/` folder. The two previously reviewed profiles with conflicting birthdays were not corrected or merged.
