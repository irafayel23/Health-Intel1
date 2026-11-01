# HEALTH-INTEL invited beta checklist

Use synthetic patient details only. Record the release, date, account role, assigned barangay, device, browser and connection type for each session. Do not use a real person's name, birthday, contact information or health history. Keep the account handout private; do not attach credentials to a bug report.

## Scope

This beta covers disease recording, linked consultations, resident history, review, reports and mapping. Predictions are outside the acceptance scope until their data and accuracy are validated. The map summarizes recorded case severities; it does not declare outbreaks or diagnose disease.

## Tester tasks and expected results

| Task | Expected result |
| --- | --- |
| Sign in with your assigned BHW account | Correct role and barangay appear. Another barangay's patient records cannot be accessed. |
| Create a synthetic new case | Family name, first name, suffix and birthday save correctly. Birthday accepts numbers and formats the date. All four measurements are required. |
| Choose a disease | The initial suggestions and typed search work. An unlisted condition goes through the existing review flow rather than becoming a guessed diagnosis. |
| Record a return plan | A date before consultation is rejected. Valid date and instructions appear in the pending-plan list. |
| Record a follow-up on that case | Patient and original case are selected correctly. Enter fresh measurements and notes. History shows one case and two consultations. |
| Record an admission against that case | The admission is a third consultation, not another disease case. Prior measurements, encoder and advice remain available. |
| Same identity, harmless address spacing | Reusing the same patient does not create a second resident solely because of spacing. Different birthdays stay separate pending identity review. |
| MHO Patient Directory | Search finds the synthetic resident and opens complete case and consultation history. The follow-up shortcut uses the selected case. |
| MHO Review Center | Authorized reviewers can process disease classification and resident-status requests; BHW cannot confirm an MHO-only action. |
| Today report | BHW report is barangay-scoped; MHO report is municipal. New cases and linked consultations remain distinct. Dates follow Philippine time. |
| Map | Ring segments show each severity's share. Center shows active total. Monitored/High Risk counts remain visible. Unknown severity is explicit. Cleared/archived cases are excluded. |
| Map fullscreen | Fullscreen, Exit and Escape work. Details remain readable and scrollable. Closing details restores keyboard focus. |
| Save failure or interrupted connection | A failed save does not appear successful. Retry does not silently duplicate the case/visit. |
| Sign out and reopen a protected page | A signed-out session cannot request protected records. Test accounts cannot use administrator routes. |

## Device checks

The owner should coordinate one Android Chrome and one iPhone Safari test where available, plus desktop. Test light and dark themes, portrait/landscape, an ordinary mobile-data connection and a deliberately slower connection. Verify form scrolling, numeric keyboard, dropdown reset/None, validation messages, report downloads, map details and fullscreen exit. Browser viewport simulation is useful but does not replace these real-device checks.

## Bug report template

- Short title:
- Release/date and time (Philippine time):
- Role and barangay (no password):
- Device, OS, browser and connection:
- Steps to reproduce:
- Expected result:
- Actual result/error text:
- Synthetic case/visit ID, if relevant:
- Screenshot using synthetic data only:
- Does retry succeed? Does it create duplicates?
- Severity: blocks work / wrong result / usability problem / cosmetic.

## Owner launch checks

- Confirm the current Azure release and record the regression and load-test results with their limits.
- Verify a new encrypted PC backup, its integrity and the scheduled backup path. A one-off download does not establish scheduled-job reliability.
- Give each tester a separate account and an assigned barangay. Share credentials privately. Temporary beta accounts have normal BHW permissions within their barangay; no automatic expiry or forced first-login password change is promised.
- Confirm that the database offered to testers contains only approved synthetic test data. Do not invite external testers into a database containing real health records with shared temporary credentials.
- Keep uncertain existing duplicate profiles separate until an authorized person confirms identity.
- After beta, suspend temporary accounts through the existing account controls and review synthetic records before any transition to real use. Do not bulk-delete or merge patient history without review.
- Start with a small invited group; increase concurrency only after observed results support it.
