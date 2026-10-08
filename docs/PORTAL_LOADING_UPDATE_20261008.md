# Portal style and BHW loading update — October 8, 2026

## Changes

- BHW, Admin and Superadmin now load prebuilt Tailwind CSS. Tailwind classes, color settings, dark-mode behavior and existing page hooks are retained. Their generated assets are `assets/css/<role>/<role>-utilities.css`.
- Admin's former inline Tailwind utility rules moved into `tools/styles/admin.css`. The three role configurations and build runner live under `tools/styles/`. Run `npm --prefix tools/styles run build:portals` after changing utility classes; deploy the generated CSS together with its HTML.
- BHW shows a loading message and spinner while fetching patient records. The table exposes `aria-busy`, and a status region announces loading/errors without reading out the patient table.
- Same-view refreshes retain the last loaded rows. Failed reads show a clear message and a keyboard-accessible Retry button; a failed request is distinct from an empty list. Requests time out after 20 seconds and can be retried.
- Active/archive switches clear the previous view; superseded responses cannot overwrite the current list. Repeated view entry can share an in-flight read. Refreshes after saving force a fresh request. Patient rows are rendered in one update instead of repeated HTML replacement.

These changes preserve the backend routes, barangay restrictions, patient data and prediction code. The login page's style loading is unchanged. No Azure deployment, resize, firewall change, email or account configuration change was performed.

## Verification

- All **107 regression tests passed**, including four new cases for failed-load recovery, stale-row retention, navigation coalescing/save freshness, and late active/archive responses.
- Browser checks used an isolated local server and 5,000 synthetic cases. They exercised visible loading, HTTP-failure recovery, timeout/abort recovery, Retry and active/archive switching. The timeout check accelerated only the test browser's 20-second timer.
- Desktop 1440×960 and phone 390×844 views/dialogs were checked in light/dark mode. The initial check found a BHW stylesheet-order conflict; its generated stylesheet was moved after custom styles to restore the previous cascade. All 28 affected BHW combinations passed on recheck. Combined with the 44 unchanged Admin/Superadmin combinations, the final 72 checks had no flagged contrast, heading, control-label or document-overflow findings in the selected checks. This does not constitute a complete accessibility audit.
- Fixture servers stopped and the disposable database was removed. Full source-database fingerprints matched before and after testing; the original database is unchanged.
- These are focused checks for this update. No new speed percentage is claimed for these three portals, and the earlier 25-user workload was not rerun. Its four browser timeouts therefore remain a finding from that earlier run.

## Recovery

Pre-change HTML and BHW scripts are retained in `analysis/portal-loading-20261008/before/`. Raw evidence and screenshots are in `analysis/portal-loading-20261008/`, ignored by Git. Restore only the reviewed files if needed; do not overwrite later edits or restore a database for this UI change.
