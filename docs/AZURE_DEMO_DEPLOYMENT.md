# Azure capstone demo deployment

Verified on 3 October 2026. This is a synthetic demonstration deployment, intended for the November defense and possible December re-defense.

## Live site

https://health-intel.eastasia.cloudapp.azure.com

The Azure DNS label, Caddy HTTPS hostname and application public origin were changed together on 3 October 2026. Trusted HTTPS, redirects and role logins were checked at the new address.

The login page is served directly at `/`. Existing `/index.html` links redirect to `/`, preserving query parameters. Role HTML pages remain public page shells; session checks and server API authorization enforce access to records and actions.

All five public HTML pages use the existing HEALTH-INTEL symbol as their browser tab icon. Direct signed-out access to `bhw.html` was checked in Brave and returned to the login page at `/`; live API checks rejected unauthenticated patient requests and BHW access to Superadmin endpoints.

- Resource group: `health-intel-rg`; VM: `health-intel-vm`; region: East Asia.
- Ubuntu 24.04 LTS, Standard B2ats v2, 2 vCPUs and 1 GiB RAM; 2 GiB swap configured.
- Node 24.21.0, MySQL 8.0.46, Python 3.12.3, Caddy 2.11.7.
- Caddy provides trusted HTTPS and redirects HTTP. The Node API listens on `127.0.0.1:3000`; MySQL listens on `127.0.0.1:3306`.
- Website ports 80/443 are public. SSH uses the owner's current public IP only; update the existing single-address rule when their internet address changes.
- `health-intel`, `mysql`, and `caddy` services start automatically. An application restart was verified.

## Data and accounts

The working application was packaged using an explicit public-file allowlist. Local `.env`, JWT secrets, accounts, patient records, source datasets, exports, and backups were excluded. Only the current table structure and public barangay names/coordinates were read from the local database.

The hosted database contains seven pilot barangays, four private demo accounts (BHW, MHO, Admin, Superadmin), and 1,149 newly generated synthetic cases from January 2023 through September 2026. The BHW demo is assigned to Blumentritt. Resident names begin with Demo; remarks and condition sources identify the records as synthetic. These counts do not represent actual community disease incidence.

Private demo passwords and the verification backup are saved outside this repository in the local `azure-review` folder. They must not be committed or published. The host's private runtime environment is `/opt/health-intel/server/.env`; it uses independently generated database and JWT secrets and a dedicated database account.

## Spending controls

The account's free-services page lists 750 hours per month for the exact Linux B2ats v2 VM meter. Current usage had not yet posted, so that allowance has not yet been reconciled against actual consumption. Managed disk and Standard public IP charges must be checked separately; zero total cost is not established.

The subscription budget `health-intel-defense-2026` is $100, quarterly, from 1 October to 31 December 2026. Actual-cost alerts at $50, $80, and $90 go to the owner's approved school email. Budgets send notifications; they do not stop resources. Budget expiration does not stop this VM. No automatic deletion or shutdown was scheduled.

The $100 student credit is a total credit grant, not a monthly payment. Keep the student spending limit in place and check Cost Management when meters post. Back up before stopping or removing the deployment after the final defense. Deallocation stops compute billing, while retained disks and public IP addresses may still incur charges.

## Verification

- Trusted HTTPS, HTTP redirect, all five HTML pages and live MHO dashboard.
- All four role logins, sessions and dashboard endpoints.
- Unauthenticated access, wrong-role access, BHW cross-barangay access and unapproved origins rejected.
- Backend configuration, Git files, documents and exports inaccessible through the public website.
- FHSIS and PIDSR PDF exports produced PDFs.
- Python forecast worked with synthetic history and retained its AR(1), validation-pending description.
- Superadmin encrypted backup downloaded; AES-256 authentication and decryption verified.
- The encrypted SQL backup restored into an isolated disposable database. All eight tables were verified against the hosted source, accounting for the backup audit added after the dump. Only the isolated test database was removed.
- Application restart, automatic service startup and private API/database listeners verified.

## Remaining configuration and review

The Satin Flow readability refinement was also deployed on 4 October: navy feature descriptions and a white fade behind the left column. Both public file hashes and HTTPS health checks passed; desktop and 390-pixel mobile rendering passed. The pre-refinement backup is `/home/azureuser/ui-fix-backup-1791120709`; original background recovery remains documented in `LOGIN_BACKGROUND_RECOVERY.md`.

The selected Satin Flow background was subsequently applied and deployed on 4 October. Its three public files were hash-verified; desktop/mobile rendering and registration Cancel were checked. The exact prior local and hosted login files were preserved. See `LOGIN_BACKGROUND_RECOVERY.md` for restore commands and backup locations. The hosted pre-change copy is `/home/azureuser/ui-fix-backup-1791119829`.

Later on 4 October, the registration gateway Cancel button's default browser border/background was removed, with centered full-width alignment, a 44-pixel minimum target and footer spacing. The updated `index.html` and `assets/css/index/access.css` were deployed separately and both live hashes verified. Rollback copy: `/home/azureuser/ui-fix-backup-1791118324`. Brave checked the live 390-pixel layout and Enter activation returning to login. Screenshot: ignored `analysis/deep-review-20261004/azure-cancel-mobile-deployed.png`. No service restart or database change was required.

On 4 October, the user authorized the tested age, theme, chart contrast and dialog/accessibility fixes. All 21 public UI files were deployed and their served SHA-256 hashes verified. Rollback files are outside the public application at `/home/azureuser/ui-fix-backup-1791116979`. Backend, runtime settings and prediction code were excluded. MHO, Admin and Superadmin browser checks passed for the changed controls. BHW reached the dashboard but live inspection timed out with loading statistics visible; its hosted functional check remains unresolved. Details and evidence are in `QA_REPORT_20261004.md`.

Email delivery is not configured on the host. Configure SMTP privately and verify approval and recovery delivery before relying on those workflows. Google onboarding also needs the new hostname in the Firebase project's authorized domains and a real onboarding test. Existing demo System ID/password logins work.

Reports require MHO review before official submission. The forecast remains a demonstration model pending validation. The 1 GiB VM has passed these functional tests; capacity under simultaneous forecasting or defense-day traffic has not been load tested.

## Moving to a teammate's subscription

An independently eligible teammate should own their Azure for Students subscription and grant appropriate Azure access rather than share their sign-in. Student offers and credits are non-transferable. A direct resource move depends on Azure's subscription, tenant and resource requirements; otherwise redeploy this application and restore its encrypted database backup into their VM.

Rebuilding the application is unnecessary. Preserve the private runtime secrets and backup, then update the hostname, public origin, Firebase authorized domains, SSH source rule and budget alerts as needed. Do not assume a hostname, public IP or credit balance transfers automatically.

References: [Student offer terms](https://azure.microsoft.com/en-us/pricing/offers/ms-azr-0170p/), [Azure budgets](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets), [Resource move requirements](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-resource-group-and-subscription).
