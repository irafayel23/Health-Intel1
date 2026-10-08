# HEALTH-INTEL readiness review — 7 October 2026

## Decision

The engineering baseline below passed locally, and the capacity fix and login loading changes were deployed and checked on Azure. This is not approval for daily use with real health records and is not an Azure capacity certification. No local real records were uploaded.

## Verification completed

- The existing 96 automated checks passed with access to local XAMPP. They cover anonymous/expired/forged/inactive sessions; role restrictions; BHW barangay boundaries and encoder spoofing; password recovery; case validation, duplicates, corrections and concurrent reviews; audit rollback; reports; public/private file isolation; and SQL dump restoration.
- Disposable databases are used by integration checks. Source database fingerprints remained unchanged.
- Three additional regression checks passed for forecast admission, simultaneous requests, worker failures and client disconnects. The final combined suite passed all 99 checks.
- A separate synthetic database, containing 202 cases, was used for concurrent dashboard requests and removed after testing. Its source database fingerprint remained unchanged.

The first sandboxed test attempt failed because local networking was denied (`EACCES`); the permitted rerun passed. Those infrastructure failures are not application test failures.

## Confirmed capacity defect and fix

Each valid prediction request previously spawned its own Python process without a concurrency limit. On a small VM, simultaneous predictions could exhaust memory.

The API now defaults to one active forecast worker. Additional forecast requests receive HTTP 503 with `FORECAST_BUSY`, a readable retry message and `Retry-After: 5`. The slot remains occupied until Python actually exits, including after a disconnect or timeout; repeated release cannot admit extra workers. `FORECAST_MAX_CONCURRENT` permits 1–4 workers, but raising it needs memory measurements. Ordinary dashboard requests do not use this gate.

This bound applies to one Node process. Multiple Node processes or replicas would require a shared admission mechanism. The deployed source hashes matched the local files. Recovery copy: `/home/azureuser/readiness-backup-1791346469`. All four roles logged in and their dashboard APIs returned 200. Three simultaneous hosted prediction calls produced one successful forecast (3,491 ms) and two `FORECAST_BUSY` responses (541/547 ms); a later forecast succeeded (1,813 ms). This is a controlled regression check, not a sustained load test.

## Hosted resource snapshot

The VM remained Standard B2ats_v2, two vCPUs and 1 GiB configured RAM. Linux reported 842 MiB visible memory, 430 MiB used and 411 MiB available; 372 MiB of the 2 GiB swap was in use. Load average was 0.08/0.02/0.01 and the root filesystem had 55 GiB available. All application, MySQL, Caddy and SSH services were active. This snapshot does not prove whether earlier lag was caused by memory pressure.

The SSH source rule was refreshed from the old owner IP to the current IP detected by Azure, still a single address. The host key was read via the authenticated portal and matched the subsequent SSH connection. No broad/public SSH rule was added.

## Encrypted PC backup and restore

The user selected PC storage. The first backup is saved under `C:\Users\User\Downloads\health-intel-backups`, encrypted as an AES-256 ZIP and verified by byte length and SHA-256 against the remote archive. The encryption password is DPAPI-protected for the current Windows user, and arrives at the remote process via stdin rather than command-line arguments. SSH uses strict host-key verification.

That saved PC copy was uploaded back for an isolated restore exercise: authentication/decryption succeeded, all eight restored tables matched the live source, source fingerprints remained unchanged, and the temporary database and verification files were removed.

The Codex automation `health-intel-database-backup` is active daily at 21:00 Asia/Manila. It runs `deploy/backup-to-pc.ps1`, verifies the result and reports actionable failures. Routine successes stay quiet. The PC and Codex must be available; an offline/deallocated VM, a changed client IP, moved key/project paths or local disk problems can prevent a run. Future scheduled runs have not yet occurred. Backups are retained without automatic deletion. Retention, independent key escrow and an additional copy on a separate device still need operational decisions. Losing this PC can lose both its backups and its DPAPI credential.

## Login loading improvements

The displayed logo now uses a 256-pixel WebP, 14,886 bytes instead of the original 489,716-byte PNG (about 97% less). The original remains. Login scripts use ordered `defer` loading so they do not block HTML parsing. The Satin Flow design and form hooks were preserved.

Synthetic browser checks verified all four login redirects, password visibility, registration gateway, desktop/mobile layout and no page errors. Hosted Brave verified the new image, registration gateway and Cancel returning to login. Google authorization and real reset-email delivery were not submitted. Original local HTML: `analysis/readiness-20261007/index-before-performance.html`; hosted recovery copy: `/home/azureuser/login-performance-backup-1791347027`.

One fresh mobile Lighthouse recheck of the hosted login scored performance 79, accessibility 94, best practices 100 and SEO 82, without a runtime error. Against the 4 October sample, performance rose from 66 to 79; FCP changed from 4.0 to 3.1 seconds, LCP from 7.1 to 4.4 seconds, and total bytes from 1,314 to 850 KiB. TBT changed from 30 to 70 ms. Different network/cache conditions and single-run variability limit causal attribution. These scores do not establish portal performance or security certification. Reports: `analysis/readiness-20261007/login-mobile-after.html` and `.json`.

## Local concurrency results

Each simulated client issued ten sequential reads, with clients running concurrently. The mixture covered patients, residents, BHW statistics/trend, MHO statistics/KPI and heatmap data. This short test excludes browser rendering, network distance, Python, writes and backups.

| Concurrent requests | Total requests | HTTP errors | Median latency | 95th percentile latency |
|---:|---:|---:|---:|---:|
| 1 | 10 | 0 | 12 ms | 69 ms |
| 5 | 50 | 0 | 27 ms | 70 ms |
| 10 | 100 | 0 | 37 ms | 109 ms |
| 25 | 250 | 0 | 81 ms | 215 ms |
| 50 | 500 | 0 | 136 ms | 350 ms |

These are request counts, not a supported-user promise. One browser can issue several requests simultaneously. The local machine is not constrained to the Azure VM's 1 GiB RAM or burstable CPU. A sustained workload with representative data and host memory/CPU/swap measurements is still required on Azure. Do not run an uncontrolled stress test on the public site.

Raw artifacts: `analysis/readiness-20261007/load-results.json` and `analysis/readiness-tests-20261007.txt` (local ignored analysis files).

## Outstanding engineering work

1. Observe the first scheduled PC backup, agree retention/key escrow, and keep an additional backup copy separately from this PC. The encrypted transfer and isolated restore exercise are complete.
2. Reconcile forecast data rules before validating accuracy. The Python script reads MySQL directly, uses inconsistent archival filters, and fills missing months with zero. Reporting completeness must distinguish an unreported month from a verified zero. Do not call the AR(1) demonstration a validated final model.
3. Agree on intended supported diseases and obtain an approved evaluation dataset. Measure held-out forecast error against simple baselines and have the MHO review the meaning/limits of outputs. Synthetic test accuracy is not clinical evidence.
4. Continue frontend performance work from the Lighthouse report: chart/map startup and runtime Tailwind compilation in authenticated portals remain. Login logo and parser-blocking script changes are complete.
5. Verify production monitoring for service failures, free disk space, memory/swap pressure, backup age and certificate health. Define who responds to alerts and a recovery procedure.
6. Rehearse simultaneous record encoding and predictions on the intended VM with a stated defense workload, while measuring latency, errors and resource use. Decide whether resizing is needed from those results.
7. Review deployment dependencies, SMTP delivery, secret rotation and final dataset/account migration. SMTP credentials and Firebase onboarding setup require the owner's participation. No real patient dataset has been transferred.

## Required organizational decisions

The LGU/MHO and responsible privacy officer must approve purposes, permitted users, retention, patient notice/lawful handling, a privacy impact assessment and incident response before real operational use. Use a limited pilot with documented acceptance and an owner for corrections and outages. Technical tests alone do not supply these approvals.

## Current Azure capacity assessment

The deployed Standard B2ats_v2 has two burstable vCPUs and 1 GiB RAM, shared by Node, MySQL, Python and the operating system. It is a plausible small-demo host, but capacity for many active users is unproven. CPU credits, database size, prediction overlap and swap pressure can materially affect response times. A 4 GiB resize may help memory pressure but does not by itself resolve inefficient queries, browser work or model correctness.
