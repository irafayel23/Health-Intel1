# Admin audit and Superadmin Master Ledger

Implemented on 1 October 2026. Both views read `system_audit_logs`; their access and purpose differ. No database migration or rewrite of existing events was required.

| View | Purpose | Visible activity |
|---|---|---|
| Admin Operational Audit Trail | Follow daily account, case and registry work | Recorded BHW, MHO and Admin operations, with explicit case links to Admin Master Records. Superadmin activity and the new authentication/password/report-export event types are excluded by the backend. |
| Superadmin Master Ledger | Accountability across roles, including Superadmin | All saved events, including operational activity, Superadmin account/backup actions and the new access/password/report-export events. |

System-wide accountability means recording who performed an important action, when, what was affected and the saved result. It includes Superadmin's own actions. It does not mean recording every click or granting unrestricted clinical access.

## Using the ledger

1. Open Master Ledger and click Sync to load saved events.
2. Search an actor or affected reference, such as `BHW-001` or `REC-123`. Role, action and inclusive Philippine-calendar date filters can be combined.
3. Open Details to inspect saved actor, time, action, outcome and reference. Before/after values, reasons, report periods/counts and attribution appear when recorded.
4. Related activity uses an explicit reference. Case references stay separate from account and report references; old missing case IDs are never guessed from names, disease or dates.

Details are read-only saved event information. They do not fetch the current patient profile or make Superadmin eligible for the Admin-only clinical detail endpoint. Related report events are grouped by report type; their saved periods identify individual exports. The dialog shows at most 20 matching related events.

## New and enriched events

| Event | Recorded meaning |
|---|---|
| Login Succeeded | Correct credentials and eligible account; audit persistence is required before issuing the session response. |
| Login Failed | Wrong/malformed credentials or a correctly authenticated account refused for its status. Wrong-password attempts use an Unauthenticated actor; the attempted account ID is a target, not proof its owner acted. |
| Login Rate Limited | Login request rejected by the limiter. |
| Password Changed / Password Reset | Password update and audit commit together; earlier sessions are revoked. Passwords, hashes, reset codes and tokens are never included in audit metadata. |
| Report Data Exported | BHW report data was released for the assigned barangay and chosen period/purok, with the server-derived count. PDF generation and saving happen in the browser. |
| Report Export Prepared | MHO report data was prepared before PDF rendering, with its validated period and case count. This does not confirm completed rendering, browser download or file saving. A later preparation failure can produce a separate failure event. |
| Report Export Failed | Invalid report selection or preparation failure, with a fixed safe reason. Failure logging is best effort when the database itself is unavailable. |
| Case/account/registry/archive/backup activity | New events retain human-readable summaries and add explicit targets/outcomes. Account status and archive changes include before/after values; existing case status/corrections/review retain their saved changes and reasons. Backup success means server preparation, not verified local file saving. |

Older events without a saved outcome show **Not recorded**, rather than an invented success. Their original details remain intact. The misleading historical-entry notice is not reintroduced.

## Limits and verification

This is an application audit trail, not an immutable database ledger. Direct database administrators can alter its rows. No delete/edit API was added. Logout, page navigation, every record read and every denied protected request are not newly logged. An unavailable database cannot guarantee recording failures; login success and transactional password/case changes fail safely when their required audit write fails.

The current endpoint loads all saved rows, then the browser filters and paginates. Server-side filtering, bounded pagination and reviewed retention are later improvements for larger deployments. Operational and Master views share relevant records intentionally, so a BHW case change can appear in both without duplicate audit writes.

The full suite passed 74 tests using disposable databases, with source fingerprint checks unchanged. Tests cover role/scope separation, failed-login attribution, rate limiting, password/audit rollback, redacted events, export scope/counts and Philippine-date/XSS/filter/dialog behavior. A synthetic browser preview checked filtering and readable event details in light/dark themes; this was not a new live email or production deployment test.

## Restart and rollback

Restart the API after this update: stop the existing process with Ctrl+C, then run `npm start` from `server/`. Refresh the portal tabs.

`pre-ledger-upgrade-20261001` preserves commit `b646a45`. The completed change is tagged `ledger-upgrade-20261001`. Preserve newer work before using `git revert --no-edit ledger-upgrade-20261001` from the repository root. Restart and refresh afterward. Reverting code does not erase saved audit events or require a database restore; the older renderer may show newer JSON details less clearly. Checkpoints remain local until explicitly pushed.
