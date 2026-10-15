# BHW follow-up case matching — local fix completed

Recorded: 14 October 2026 (Asia/Manila)
Status: Fixed and verified locally after the user's explicit fix request. Azure and GitHub updates are still pending. Existing potentially duplicated records have not been merged.

## User-reported problem

The BHW Patient case / visit form, Step 2: Consultation, shows **No matching case — check name, suffix and birthdate** after selecting **Follow-up visit**. The user reports creating a new case with the same patient name and birthdate, but the existing-case dropdown still shows no match.

The earlier explanation that an incorrectly entered birthdate might cause this is not a confirmed diagnosis. The new report requires investigation; do not assume the user entered the birthday incorrectly.

Related observation: two visually identical resident cards each open a separate single-case history. Screenshots show REC-1151 and REC-1153. Confirm their stored identity and resident links before treating them as duplicate profiles.

## Expected behavior

- A follow-up should find eligible existing disease cases for the verified patient in the authorized barangay.
- Saving a follow-up or admission should add a consultation linked to the selected original case, preserving the patient profile and disease-case totals.
- A different disease/new case for the same verified resident should remain in the same resident profile.
- Distinct people with matching names must remain separate. Existing profiles must not be merged solely by name, age or appearance.

## Investigation and fix checklist

- [ ] Establish whether the screenshot is from the local application or Azure, and verify the running version before reproduction.
- [x] Reproduce a newly saved case followed by a follow-up using an isolated synthetic database.
- [ ] Compare the BHW form's match request and API response against the saved identity, suffix (including None/empty/null), birthdate format, barangay scope, archive state and consultation date.
- [ ] Check dropdown refresh, request timing and stale frontend state; distinguish an empty valid result from a failed request.
- [ ] Check resident-profile reuse and whether address formatting or historical missing fields caused separate profiles. Verify the two reported records before proposing any data correction.
- [x] Fix the confirmed cause and give a useful message when a record cannot be matched. Preserve role restrictions, deceased-resident date rules and duplicate-visit protection.
- [x] Verify BHW and MHO matching, linked follow-up/admission saves, unchanged disease totals and resident history with meaningful regression tests.
- [x] Provide screenshots and a concise explanation after the fix.

No application code or original database records were changed. The local reproducible issues below are confirmed; the exact identity fields of the user's two existing records and their deployment environment have not been inspected. Azure deployment remains deferred until the local work is complete.

## Test findings — 14 October 2026

The requested New consultation/case, New admission and Follow-up visit logic was checked against unchanged local application code using disposable synthetic records.

1. **Confirmed BHW matching defect:** `GET /api/patients` returns the MySQL birthdate as a JavaScript Date serialized to a UTC timestamp. In the local Asia/Manila environment a synthetic stored birthday of `1975-04-10` was returned as `1975-04-09T16:00:00.000Z`. BHW compares `String(row.birthdate).slice(0,10)` against the entered date-only birthday. Both Follow-up visit and New admission therefore displayed No matching case with an exactly matching name, suffix and entered birthday. Feeding the same current frontend code date-only values as a diagnostic positive control made both original cases available. This was a test control, not an application fix.
2. **Confirmed profile-reuse weakness:** changing the synthetic purok from `QA Zone` to `QA  Zone` created a different resident link even with unchanged first/family name, suffix, birthday and barangay. The resident lookup includes exact purok text. This is a reproducible explanation for visually similar separate cards, but does not prove the cause of the user's existing two profiles.
3. **Confirmed date-selection UI gap:** in the date-only positive control, BHW offered an original case dated after the consultation date. The backend correctly refused to save it. The dropdown should avoid or explain this invalid choice earlier.
4. **Workflow behavior:** selecting New consultation/case for the same condition on another date creates another disease case. The current duplicate check blocks the same condition on the same case date; it does not automatically decide whether a later encounter is a return visit. Consider an existing-case reminder without assuming that every repeated condition is the same episode.

Saving valid admissions and follow-ups through the API worked, preserved the original case status/severity/date, and added visits to resident history without increasing the disease count. Exact duplicate cases/visits, missing measurements, invalid nature/link combinations, wrong identities and dates before the original case were refused. A different disease with unchanged identity and address reused the existing profile.

**Validation:** 34 existing scoped regression tests passed; the additional diagnostic reproduced the defects above and completed 8 passing safeguard checks. The first attempt could not connect because XAMPP MySQL was stopped; tests passed after starting the existing instance. Disposable test databases were removed and source database row fingerprints remained unchanged.

Browser controls failed to initialize twice, so a fresh live browser walkthrough and screenshots were not completed. The frontend matching diagnosis executed the current production JavaScript in an isolated DOM test harness with actual synthetic API responses, not browser automation.

Evidence: `analysis/consultation-logic-review-20261014/audit.cjs`, `audit-results.json` and `regression-output.txt` (ignored diagnostic artifacts). Future fixes should normalize date-only API values, improve resident reuse without merging distinct people automatically, and guard invalid original-case dates in the BHW form, then repeat a real browser walkthrough.

## Fix and verification — 14 October 2026

Deployment update: these fixes are live on Azure as of **15 October 2026**. See [final release verification](AZURE_RELEASE_20261015.md). The two reported pre-existing profiles were reviewed and kept separate because their stored birthdays differ.

The subsequent fix request authorized application changes. Patient-list and resident-list API birthdays now use explicit SQL DATE_FORMAT values; case dates also stay date-only. BHW matches these date-only birthdays and excludes original cases newer than the selected consultation date, archived cases and ineligible deceased-resident dates. Changing the date clears an invalid selection and explains why no eligible case is available. Failed loading is distinguished from no matching patient.

New purok values collapse whitespace before saving. Resident reuse compares a whitespace-normalized stored purok as well as the original name, suffix, birthday and authorized barangay. Existing extra spacing therefore does not create another profile. Distinct suffixes, birthdays and genuinely different addresses remain separate. Multiple pre-existing normalized matches stop the save with a review message rather than choosing or merging a person automatically. Existing source profiles and records were not rewritten; no schema migration is required for these three fixes.

Added six focused regression tests in `server/tests/consultation-matching.test.js`, included in `npm test`. **22 focused tests and all 158 full regression tests passed.** The new tests use actual synthetic API responses with current frontend code and cover both returning visit types, stale date selections, normalized historical addresses, distinct identities and ambiguous-profile rejection.

The standard browser tool still could not initialize. Using the previously approved isolated headless Chrome workflow, the full real BHW UI saved a new disease case, a second different disease with extra address spaces, a follow-up and an admission. It showed one resident profile, two disease cases and four consultations, including one follow-up and one admission. Earlier dates displayed the new eligibility explanation. The headless walkthrough completed without page JavaScript errors; the first screenshot run needed a test-only correction to trigger the resident search's actual keyup event. No application workaround was introduced for that test issue.

Screenshots and results are in `analysis/consultation-matching-fix-20261014/`: `matching-cases-dropdown.png`, `followup-original-case-selected.png`, `earlier-date-explained.png`, `one-resident-profile.png`, `linked-consultation-history.png`, `browser-results.json`, `focused-tests.txt` and `full-tests.txt`. The disposable databases were removed, isolated browsers/servers closed, and the source database fingerprint remained unchanged.
