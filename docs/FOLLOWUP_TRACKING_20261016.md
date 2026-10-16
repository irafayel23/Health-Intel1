# Follow-up tracking — 16 October 2026

BHW Resident Profiles and MHO Patient Directory each have two tabs: the existing directory and **Follow-up tracking**. No sidebar item was added. Tracking supports Due today, Upcoming and Past due, search by patient name/resident ID/case ID, twelve plans per page, Refresh and Retry. MHO can additionally filter by barangay; BHW scope is always the authenticated account's assigned barangay.

## Pending-plan rules

- One pending plan per disease case, using the latest consultation date. The last saved visit breaks ties on the same date, including visits with no recorded time. Consultation time is not used to break these ties.
- The latest consultation must have a next follow-up date on or after its own consultation date. A later consultation without a new date leaves no pending plan; it never falls back to an earlier dated plan.
- A later return with a new date replaces the earlier pending plan. Past dates entered later cannot reactivate a plan from an older consultation day.
- All advice remains in the original visit history. Cases, resident profiles, disease dates, case outcomes and report totals are not rewritten by tracking.
- Archived cases, cases marked Deceased and confirmed deceased residents are excluded. Cleared cases may still have an advised review and remain eligible if they have a current plan.
- Multiple cases belonging to the same patient retain separate plans and case IDs. Missing or conflicting resident identities are shown for review with the return shortcut disabled.
- Due buckets use the Philippines calendar date. Past due means a recorded return date has passed with no later consultation recorded; it does not establish that the patient missed an appointment.

**Record follow-up** reloads the patient's dossier and checks that the same plan is still current. A changed plan requires a refresh. The existing consultation form then opens with patient, original case and Follow-up visit selected; measurements, remarks and the next plan remain blank. BHW cancellation returns to tracking. Neither opening a form nor passing a due date marks a return as completed. A consultation must be saved.

## Storage, access and verification

No additional database migration is required. Tracking reads the existing `case_visits` date and instruction fields, using the case/date index. It does not create appointment records, infer a diagnosis or send reminders. Authenticated GET endpoints are `/api/bhw/followups` and `/api/mho/followups`; cross-role requests and BHW attempts to select another barangay are denied. Results are paginated on the server, and rendered patient text is escaped.

The full local regression suite passed 174 tests. Dedicated disposable-database tests cover date buckets, scope, malformed filters, clearing/replacing plans through both save APIs, preserved original records, backdated and same-day visits, multiple case plans, identity conflicts, pagination and escaped search wildcards. Browser tests cover both roles, completed-return removal, new upcoming plans, stale-entry rejection, barangay filters, keyboard tabs and light/dark rendering, with no console issues.

Azure deployment updated twelve runtime files and verified parity across all 136 runtime files, with an encrypted recovery backup and original database fields preserved. All 24 live checks passed, including both roles' three queues, scoped counts, access restrictions, public assets, service health and logout replay rejection. Live verification added no patient records.
