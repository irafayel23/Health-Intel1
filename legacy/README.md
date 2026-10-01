# Archived frontend files

These files are retained for reference and recovery. Start the supported app from the root `index.html`; connected portals remain in the repository root.

| Location | Why it is archived |
|---|---|
| `prototypes/register.html` | Old standalone registration fragment. It lacks the Google verification proof required by the current API. Use registration in root `index.html`. |
| `prototypes/municipal.html` | Disconnected Mayor prototype with sample charts; there is no supported Mayor account role. Its local paths are adjusted to its archive location. |
| `prototypes/admin-approval-dialog.html` | Former hidden, unreachable dialog with an unimplemented `submitApproval()` handler. Current Admin approval uses `approveUserDirectly()` in `assets/js/admin/admin-users.js`. This is a markup fragment, not a working standalone page. |
| `assets/css/` | Unused older Admin/login/base styles, the municipal prototype stylesheet, and the archived approval dialog's five styles. |
| `assets/js/vendor/` | Unused local Chart.js/Lucide copies, preserved byte for byte. Connected pages continue to use their existing CDN libraries. |

The shared `assets/js/shared/app.js` remains in the active tree because `mho.html` still loads it; the municipal prototype references the same file. It was not removed based on age or its generic filename.

Moving files here does not make the prototypes supported flows or enable offline operation. The registration and approval fragments retain their original limitations. Do not wire them into production without implementing and reviewing their full workflow.

Before cleanup, checkpoint `pre-legacy-cleanup-20261001` preserved commit `49619bd`. The completed cleanup is tagged `legacy-cleanup-20261001`. To undo only this cleanup, preserve newer work and run from `proposal`:

```text
git revert --no-edit legacy-cleanup-20261001
```

Refresh browser tabs afterward. No database restore or backend restart is needed for this frontend-only change. Checkpoints remain local until pushed. See `docs/ARCHITECTURE.md` for earlier checkpoints.
