# Satin Flow login background and recovery

Applied locally and deployed to Azure on 4 October 2026 at the user's request. Only `index.html`, `assets/css/index/access.css`, and the new `assets/img/login-satin-flow.webp` were published. The generated artwork was encoded as a 21,384-byte WebP; the original generation remains outside the project. Existing login, registration and recovery hooks are unchanged.

## Restore the previous local background

The exact pre-change HTML and stylesheet are saved in `analysis/satin-flow-20261004/old/`. This includes the previous geometric SVG background and the corrected Cancel button. Run from the project root:

```powershell
& ./analysis/satin-flow-20261004/restore-old-login.ps1
```

This restores the two local files. The unused new background image can remain; it is no longer referenced. These local recovery files are ignored by Git, so preserve this folder when moving the checkout. This command does not change Azure.

## Restore the previous Azure background

The deployment saved the exact prior public files outside the served application at `/home/azureuser/ui-fix-backup-1791119829`. Through the VM's Azure Run Command, run:

```sh
set -eu
cp /home/azureuser/ui-fix-backup-1791119829/index.html /opt/health-intel/index.html
cp /home/azureuser/ui-fix-backup-1791119829/assets/css/index/access.css /opt/health-intel/assets/css/index/access.css
cmp /home/azureuser/ui-fix-backup-1791119829/index.html /opt/health-intel/index.html
cmp /home/azureuser/ui-fix-backup-1791119829/assets/css/index/access.css /opt/health-intel/assets/css/index/access.css
curl --fail --silent http://127.0.0.1:3000/healthz
```

No application restart is needed for these static files. Refresh the browser after restoring. Restoring this snapshot will replace any newer edits to these two files, so review later changes first. Backend, database and prediction files are outside this recovery operation.

## Verification

The subsequent readability refinement uses navy feature descriptions and a soft white fade over the artwork behind the left column. Its two files were deployed and hash-verified on 4 October. Desktop and 390-pixel mobile views had no horizontal overflow; screenshots are `analysis/satin-flow-20261004/azure-satin-contrast-desktop.png` and `azure-satin-contrast-mobile.png`. The earlier Satin Flow version is saved locally in `analysis/satin-flow-20261004/before-contrast/` and on Azure at `/home/azureuser/ui-fix-backup-1791120709`. The original background recovery commands above still apply.

All three live SHA-256 hashes matched the local versions. HTTPS health, the clean login redirect, protected API rejection and private-file rejection passed. Local and live browser checks confirmed background loading, no horizontal overflow on desktop/390-pixel mobile views, and keyboard activation of registration Cancel returning to login. Screenshots are in ignored `analysis/satin-flow-20261004/azure-satin-desktop.png` and `azure-satin-mobile.png`. No case/account records, authentication settings, prediction code or GitHub state changed.
