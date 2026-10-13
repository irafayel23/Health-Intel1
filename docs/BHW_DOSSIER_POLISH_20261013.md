# Required measurements and resident dossier update

Completed locally on 13 October 2026. The Azure website has not been deployed in this batch.

## Updated form

The form now uses four steps: Patient → Consultation → Measurements → Disease & notes. Related questions stay together, previously entered answers remain available when going Back, and the current step remains visible while scrolling. Continue validates the current step. Save record appears on the final step, with a sentence explaining whether the save creates a new disease case or adds a visit to an existing case. Cancel uses a quiet outlined treatment in both themes.

All four measurements—blood pressure, temperature in °C, height in cm and weight in kg—are required. This is enforced in the form and in the BHW API, including refusing requests that omit the entire consultation object. Blank or malformed values do not create a partial case or visit. Measurements do not automatically establish a diagnosis or change recorded severity. Suffix and consultation time remain optional.

The existing MHO walk-in form was outside this BHW request; its existing case-entry contract remains supported. An explicit structured visit sent through it still uses the same measurement validation.

## Resident profile

The dossier now shows four separate summaries: Total cases, Active cases, High Risk and Consultations. A description explains that disease cases and consultations are counted separately. Case history retains the original disease records, and consultation history displays each linked visit directly.

Admission and follow-up cards include their nature, transaction mode, consultation date/time, linked case ID, condition, four measurements, referral details, visit severity and notes. A summary counts admissions and follow-ups. A follow-up or admission retains the original disease-case count. It does not automatically clear or change the original case.

When a resident has no linked case, the dossier says so without guessing a person link. When there are no structured visits, it explains that admissions and follow-ups recorded with the updated form will appear there, and that older disease cases remain above. Existing null measurements are displayed as Not recorded.

Current resident age is derived from a valid birthdate consistently in the BHW directory and dossier, with the recorded age used when no valid birthdate is available. Disease-case age continues to represent age on the original case date; stored values are not rewritten.

## Database answer

Today's preceding migration added suffix fields to residents and health_cases and created the case_visits table. Case visits store the consultation date/time, transaction mode, nature, referral source/reason, measurements, visit severity, notes and encoder, linked to the original case ID.

This polish uses those existing fields and adds the visits array to the resident dossier response. It requires no new schema migration and does not change historical records. The private pre-migration SQL backup and previous code remain in the ignored analysis directories. They must not be committed or shared as public examples.

## Sidebar logo in dark mode

The logo PNG is transparent. The white badge came from a fixed bg-white class on its SVG container. The shared sidebar treatment now uses a transparent container and increases symbol brightness in dark mode. This was applied consistently to the BHW, MHO, Admin and Superadmin sidebars. No image asset was edited.

## Design references

The grouping, previous-answer preservation and explicit final submission draw on [GOV.UK question-page guidance](https://design-system.service.gov.uk/patterns/question-pages/) and [check-answers guidance](https://design-system.service.gov.uk/patterns/check-answers/). The application retains its own theme, labels and vanilla JavaScript. This is an adaptation for a disease-recording workflow, not a copy of an entire design system.

## Validation

- Full project suite: 128 tests passed, zero failures.
- Desktop 1366 px and phone 390 × 844 px, both light and dark: step validation, required measurements, preserved answers, linked follow-up payload, resident case/visit totals, admission/follow-up labels, empty history and transparent logo checks passed.
- Tests use disposable MySQL databases and synthetic browser fixtures. Original source records are fingerprinted and kept unchanged.
- Local API restarted to load the new validation and resident history query.
- Code recovery copies and screenshots are in analysis/bhw-dossier-polish-20261013/.
