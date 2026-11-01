# Daily report date selector — October 18, 2026

BHW and MHO daily report cards now offer a Report date field, defaulting to today in Asia/Manila, a Today reset button and Download daily PDF.

## Behavior

- Choose today or a valid earlier calendar date, from 1900 onward. Invalid, empty and future dates are rejected rather than silently downloading another date.
- New endpoints: `GET /api/bhw/reports/daily?date=YYYY-MM-DD` and `GET /api/mho/reports/daily?date=YYYY-MM-DD`. Omitted dates default to the server's Philippine day. Existing `/reports/today` endpoints remain server-selected for compatibility.
- Cases are selected by original case date. Consultations, admissions and follow-ups are selected by consultation date and counted separately from disease cases.
- BHW exports remain restricted to their assigned barangay; MHO exports cover the municipal scope. Role checks and audit logging apply to the new endpoints.
- The PDF heading and filename identify the selected date. Age groups remain included.
- Late entries dated for the selected day appear in a newly generated report. Corrections and current status/classification may change a regenerated report; it is not a frozen copy of a previous download.
- Downloading is not an approval, submission or deletion of patient records.

## Verification

All **200 regression checks passed**. Coverage includes Philippine midnight, leap days and year boundaries; invalid/future dates; frontend default/reset and selected URL/filename; backdated entries; separate case/visit totals; empty dates with no matching records; role/barangay isolation; and audit period metadata.

Browser checks verified both roles' selected-date download actions, BHW Today reset, and a 390-pixel MHO dark-mode layout. Selected-date BHW/MHO PDFs containing a synthetic follow-up were rendered and visually inspected. All browser records were disposable synthetic fixtures; cleanup verifies the original local database fingerprint unchanged.

No database migration is needed. Azure has not been updated in this task.

## Azure deployment update

Deployed to Azure on October 18, 2026. See [the Azure release record](AZURE_UPDATE_20261018.md). All 141 runtime hashes were verified; original database fields and private settings were preserved.
