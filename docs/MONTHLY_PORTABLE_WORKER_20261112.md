# Monthly SARIMA portable runtime — 12 November 2026

CODEX-1. Local implementation only. No Azure deployment, operational publication, patient change or production-schema migration.

## Implemented

- Removed backend's unconditional Linux rejection and the UI's Windows-only preparation gate. Status now probes the actual configured interpreter, exact scientific dependency versions, memory admission and the native resource controller. Failed probes return actionable setup errors before preparing a run.
- Added a separate `server/forecasting/policy-a-portable/` runtime. The original `policy-a/`, its manifest, research outputs and datasets remain unchanged. Statistical engine, differencing, selection and policy copies are byte-identical to frozen sources. The existing policy hash remains compatible with older published versions; portable runtime integrity is checked separately.
- Windows retains the original Job Object controller. Linux uses a dedicated cgroup-v2 child per worker, verifies memory.max and swap disabling, places the child in its cgroup before scientific imports, verifies the interpreter, samples RSS, detects OOM events and kills the full owned cgroup on normal cleanup, deadlines and controlled failures. It deliberately refuses sampled-only memory protection. A parent-death signal protects the direct interpreter; systemd KillMode=control-group is also required for service shutdown/crash cleanup. Linux kernel behavior still requires staging verification.
- Used platform-specific advisory locks (msvcrt / flock), shell-free Python argument arrays, single-thread numerical settings, private per-run writable cache directories, bounded readiness probes, stderr retention, 120-second memory-admission deadline and existing per-fit deadlines. Infrastructure/resource failures abort preparation rather than masquerade as valid scientific rejections. Partial/failed runs cannot be reconciled as ready.
- Added an operational requirements file with the existing exact pins: numpy2.3.5, pandas2.3.3, scipy1.18.1, statsmodels0.15.0, pmdarima2.1.1, psutil7.2.2. The generic legacy requirements file was not repurposed.
- Retained 45–120 consecutive confirmed months, all seven barangay completeness/digest checks, explicit confirmed zero reports and independent publication review. Missing reporting is not converted to zero.
- Added read-only BHW operational status/options/prediction routes. The assigned barangay is resolved server-side; cross-barangay query injection and other roles are denied. Both roles read the same publication pointer and immutable output. BHW selects a published operational version when available; a source-status error does not silently select demonstration data.
- Operational routes never call the frozen demonstration probability attachment. Existing COM-Poisson binding checks still reject operational versions/dates/datasets, even when a numerical mean happens to match.
- Fixed stale decimal-count assertions in the presentation test and the older combined/low-count suites. Counts are rounded as approved; uncertainty-bound decimals were not changed.
- Restarted only the checked localhost Node process using the existing qualified research interpreter. No packages installed or upgraded, and no database migration invoked.

## Checks and evidence

- Expanded targeted regression: **123/123 passed**, zero skips, covering monthly transactions, publication, frontend presentation, CMP binding, three saved SARIMA adapters, role access, portal structure, theme, history/navigation. The request's “84-test suite” was not a separately named script in this checkout; 123 is the actual executed count, not a renamed 84-test claim.
- A final additional transaction check explicitly attempts publication of a failed run with acknowledgement and verifies the existing pointer is unchanged. See `publication-final.txt` for its result.
- Qualified Python preflight succeeded on Windows. Portable Python source, including Linux modules, compiles.
- Real portable runner completed **70 explicitly fictional zero-count histories ×45 months**, producing 1,050 output rows with correct training-prefix and input hashes. Application output validation accepts all70 views. All-zero histories produced zero accepted current SARIMA estimates under the existing statistical rules; none were forced to zero or published. This tests orchestration/zero-case handling, not accuracy.
- Separate real-worker QA exercised a nonzero fictional history, deadline termination with descendants, crash handling and empty-job cleanup. All passed using the Windows bounded controller.
- Frozen source-manifest verification, identical mathematical-copy checks and portable-runtime manifest verification pass. The 6,200-case dataset and saved model outputs were not modified.
- Logs, source backups, hashes and fixture scripts are in the external `monthly-portable-20261112` evidence folder. Reusable Python QA scripts are under `server/tests/python/`.

## Linux/Azure readiness boundary

Linux execution has **not** been demonstrated here. This PC has no installed WSL/Linux environment. Azure was deliberately not accessed or changed for this task. Syntax checks or a Windows run do not certify Linux cgroup permissions, wheel availability or native numerical behavior.

Before a separately approved Linux staging/deployment test:

1. Provision a Python3.12 environment and install the portable runtime's exact requirements. Verify availability of compatible Linux packages; do not substitute scientific versions without a separate parity assessment.
2. Set `OPERATIONAL_SARIMA_PYTHON` to the absolute Linux interpreter path, not a Windows path. Preserve the private frozen `policy-a/` files alongside the portable directory.
3. Provide a delegated cgroup-v2 worker parent with the memory controller enabled, write permission for the existing service identity, and cgroup.kill support. Set `OPERATIONAL_SARIMA_CGROUP_ROOT` to that private delegated parent when it differs from the service's own cgroup. It must resolve beneath /sys/fs/cgroup. A populated service cgroup usually needs an administrator-arranged app leaf and separate worker subtree; this implementation does not move the web service or relax host permissions automatically.
4. Preserve at least **1,024 MiB available admission memory**, a **512 MiB hard worker memory limit**, swap disabled for the worker and existing timeout rules. Available memory is constrained by ancestor cgroup ceilings as well as host RAM. A smaller VM will still legitimately refuse training; this patch does not solve insufficient capacity by weakening checks.
5. Provision the existing private operational artifact directory as writable by the service, outside public assets, with backups covering prediction versions as well as the database. Code/scientific source can stay read-only; caches belong in each private run directory.
6. Run `preflight.py` as the actual service user. Run `server/tests/python/monthly-controller-qa.py RUNTIME_PATH OUTPUT_JSON`, then `monthly-worker-smoke.py REPO_PATH` in an isolated staging filesystem. These contain invented fixtures and no publication/database calls. Confirm timeout/OOM/crash descendants and lock exclusion on the actual Linux kernel. Repeat process/service interruption tests under the intended systemd unit.
7. Verify both authenticated portal readers and perform a staging prepare/review/publish/rollback exercise using disposable fixtures only. Production publication still waits for genuine reviewed reports.

No complete operational model was published using fixtures. A real operational update requires 45 consecutive months of MHO-confirmed monthly reports for all seven barangays, including explicit zero-case confirmations and resolved classification reviews.

## Files

New portable runtime directory: copied mathematical files, Windows controller, updated common/supervisor/worker/admission/runner files, new Linux controller/preflight, requirements and runtime manifest.

Modified: `server/services/monthly-predictions.js`, `server/routes/monthly-prediction-routes.js`, `server/middleware/access-control.js`, `assets/js/mho/operational-monthly.js`, `assets/js/mho/mho-forecast.js`, `mho.html`, `bhw.html`.

Tests: new `server/tests/monthly-portable.test.js`, two Python QA scripts; updated `monthly-predictions.test.js`, `seasonal6200-sarima.test.js`, `mho-forecast-presentation.test.js`, `combined-sarima.test.js`, `lowcount-sarima.test.js`. Coordination/report documents updated. Branch main/e5946d4; no commit or push.


### 2026-11-13, 09:21:15 PHT | CODEX-1 | MONTHLY-AZURE-20261113 preparation verified; approval pending

Private Azure stage /var/lib/health-intel-monthly-stage-20261113 now contains23 byte-preserved release files; compressed payload and every file SHA256 verified on VM. Separate root-private Python3.12 venv installed exact six scientific pins (including pandas2.3.3, pmdarima2.1.1 and psutil7.2.2), pip check and portable manifest/source compilation succeeded. Active /opt/health-intel code, original venv, systemd settings, schema, patients, publication pointer and public Predictions remain unchanged; no service restart, firewall or resize. Linux numerical/controller execution still pending capacity.

Azure confirms systemd255, ProtectControlGroups=no already, DelegateSubgroup unset. Proposed scoped memory delegation/drop-in and rollback/verification plan are retained externally; not installed. Current VM1GiB/837MiB usable cannot satisfy1024MiB available gate. Owner asked about2GiB: all six2GiB resize options disabled, B1ms estimated$21.32/month explicitly NotAvailableForSubscription in eastasia (verified info tooltip). Available B2als_v2 4GiB estimated$38.40/month versus currentB2ats_v2 $9.56/month, compute only. Do not assume owner approved extra cost or permission delegation. Await explicit choice; no silent4GiB upgrade. Staged Linux readiness/packages outputs, hashes, proposed config and next-step checklist in external monthly-portable-20261112 folder. Source preservation verification rerun successfully; Git diff --check exited0 with existing CRLF warnings. This scoped writer released while awaiting owner approval; work is unfinished, not deployed/complete. Recheck hashes/ownership before resuming.
