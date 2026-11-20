# Azure UI and navigation release — 8 November 2026

Released by CODEX-1 at 2026-11-08T17:56:06+08:00. User authorized uploading the new local changes to Azure.

## Result

Azure now matches the current local public portal files. Applied eleven frontend files: the five portal/login HTML files, Admin personnel list renderer, Superadmin backup dialog JS/CSS, shared session and history modules, and login JS. The new history module is the only new runtime path.

- Admin personnel lists paginate independently at ten accounts per page.
- Superadmin backup uses the compact labeled dialog and blue primary action. Its original validation and download behavior are preserved.
- All four portals track visited sections for Back/Forward and refresh. Successful login replaces its sign-in history entry; cached pages revalidate sessions.
- BHW Resident Profiles no longer shows the owner-requested deceased/pending-death explanatory paragraph.

## Verification

Azure Run Command reported successful packet SHA-256 verification, all eleven pre/post file hashes, JavaScript syntax checks, and rollback copies. Public HTTPS independently returned 89/89 matching local HTML/assets with HTTP 200. Health returned status ok; anonymous api/session returned 401; environment and private snapshot URLs returned 404.

Live signed-in Superadmin in Brave verified the backup dialog, top-right Close and Cancel without submitting a backup; Back restored Overview, Forward restored Backup, and reload retained Backup. No captured browser warnings/errors. Screenshot: external azure-ui-history-20261108/azure-backup-dialog.png. Other roles were byte-verified; authenticated visual checks of each other role were not repeated. Earlier local QA recorded 88 related tests and six contrast/CSS checks passing; these were not rerun for a byte-identical deployment.

All ten pre-existing server/data files remain hash-identical, including the saved 6,200-case SARIMA bundle. No backend/service restart, dependencies, MySQL writes/migration, account changes, model fitting, data transfer, firewall or deployment configuration changes. Existing local main/e5946d4, working tree and index preserved; no new GitHub commit/push for this Azure-only request.

## Rollback

Private VM recovery directory: /var/backups/health-intel/ui-history-20261108.s37nlv46. manifest.json records original hashes, ownership/modes and whether each path existed. Restore the ten original files from before/ and remove only the newly created assets/js/shared/portal-history.js when rolling back this specific release. Preserve all retained recovery directories. No database restore or restart is required for this frontend rollback.

External evidence: C:/Users/User/.codex/visualizations/2026/09/26/01a0dc67-9eb2-7d12-988d-be95e09269e0/azure-ui-history-20261108. Includes immutable packet, manifest, exact deployment script, Azure command output, public hash verification and screenshot.

## Practical limits

Users with an already open tab should refresh to load the new scripts. Browser history restores the selected main section, not unsaved form entries or per-list filters/pages. Existing old sign-in entries in browser history are not retroactively removed.
