# MHO consultation form - October 13, 2026

Implemented and activated in the local project. Azure has not been updated in this task.

## Form and presentation

- Family name before first name; a compact suffix selector with a selectable None value.
- Numbers-only birthdate assistance with persistent MM/DD/YYYY instructions. Age is calculated on the consultation date, including age zero.
- Four numbered sections: resident details, consultation, measurements, disease/visit notes. Larger entry text, 52px controls, responsive name grids and consistent light/dark colors.
- Mode: Walk-in, Visited or Referral. Referral reason is required only for Referral; referred by is optional. Irrelevant referral information is cleared from the submitted visit.
- Consultation date and optional hour/minutes/AM-PM time. The AM/PM selector can be cleared if the time is not recorded.
- Nature: New consultation/case, New admission or Follow-up visit. Required blood pressure, temperature, height and weight use the same client/server validation as BHW.
- Inline field errors identify missing or invalid information. Failed saves retain entered answers.

## Linked cases, database and permissions

The form saves to the existing residents, health_cases and case_visits schema. No new schema migration was needed.

- New case: creates a disease case and its first consultation atomically, including suffix and measurements.
- Admission/follow-up: selects an existing available case matched by first/family name, suffix, birthdate and resident barangay. It adds a consultation while retaining the original case date, status, severity and disease-case count.
- MHO lookup uses authenticated POST /api/mho/walk-in-matches. It requires complete identity and scope, returns at most 50 matching cases and excludes archived cases. It returns condition/date/status/ID only, not unrelated patient lists or clinical notes. Other roles cannot use it.
- Lookup is debounced; changing identity or barangay invalidates old selections. Older responses cannot replace newer matches; failures offer Retry matching cases.
- Both MHO and BHW creation routes now require consultation details and all four measurements. Existing stored legacy cases are retained.
- MHO recent entries include its own structured consultations, including return visits to BHW-created cases. Older encoded cases without structured visits are labeled honestly rather than inventing visits.
- Resident dossiers already display these saved visits under consultation history. Today reports count the visit date separately from the original disease-case date, so returning visits are not extra disease cases.
- MHO retains its existing encoding privileges across resident barangays; no BHW editing, correction or status-change permissions were granted.

## Verification

- Full automated suite: 133 passing tests, including MHO structured creation, mandatory measurements, exact identity/barangay matching, archived exclusion, role restrictions, BHW-case follow-ups/admissions, resident dossier history and MHO audit attribution.
- Source database fingerprints remained unchanged. Tests used disposable databases and synthetic data; no real patient/account rows were written.
- Headless Chrome: desktop/mobile and light/dark new case -> follow-up -> admission, suffix None by mouse/keyboard, optional time clearing, AM/PM conversion, failed-save retention, lookup retry, stale-response protection and safe recent-entry rendering.
- BHW headless checks rerun after shared measurement validation changed; all four desktop/mobile/theme combinations passed.
- Local API restarted. Recovery copies and synthetic screenshots are in analysis/mho-consultation-polish-20261013/.

Refresh the local MHO page with Ctrl+F5 to load the revised form. No GitHub push or Azure deployment was performed.
