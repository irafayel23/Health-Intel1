# Invited beta preparation — 18 October 2026

## Completed

- BHW and MHO maps now use proportional severity rings instead of filling an entire barangay marker with its highest recorded severity. The example with 18 Mild and 1 Monitored case displays approximately 94.7% green and 5.3% orange. The center shows 19 active cases; the Monitored count remains visible below the name and in the details. Gray means no active cases and purple represents unknown severity. These are recorded case summaries, not outbreak-risk ratings. No database migration was required.
- Created and verified 20 separate Azure BHW beta accounts, distributed across all seven configured barangays. No existing account was overwritten. The user explicitly selected the shared temporary password; the private account handout is excluded from Git. Accounts have normal BHW permissions within their assigned barangay. All 20 signed in successfully and were denied access to another barangay. Test sessions were logged out afterward. The user confirmed that all current Azure patient/resident data is dummy data.
- Repaired the existing SSH rule to allow this PC's current single public IP on TCP port 22. HTTP/HTTPS rules and key/host verification remained unchanged. The original encrypted PC-backup script then succeeded. The new archive's existence, byte length, SHA-256 match, ZIP encryption flag and AES compression-method identifier were independently checked. This verifies the scheduled job's script and connection path, not an actual later scheduler firing. A future public-IP change may require another single-IP update.
- Azure deployment updated five frontend files and verified all 138 runtime files. Existing database rows and private settings were preserved, the recovery package includes a verified encrypted backup, and the service passed its health check.
- A final live visual check found a nearby label covering part of a marker center. Label placement now avoids marker bounds as well as other labels. The two affected files were redeployed through the repaired SSH connection; 15 focused checks passed locally and three final public asset/health checks passed afterward. All 138 runtime hashes were verified again.
- Added [the beta checklist and bug-report template](BETA_TEST_CHECKLIST.md). Uncertain pre-existing duplicate identities remain separate. Predictive-model accuracy is outside the beta acceptance scope.

## Verification

| Check | Result | Scope and limits |
| --- | --- | --- |
| Full local regression | 189 passed, zero failed | Includes disposable-database integration tests; no new production-capacity claim. |
| Azure post-deployment checks | 22 passed, zero failed | Updated public assets, service, BHW/MHO follow-up scopes, validation and logout replay. No patient writes. |
| Public HTTPS read workload | 20 authenticated beta sessions; 200 requests; zero failures; median 187 ms, p95 699 ms | Session and aggregate map endpoints only. Includes network latency; excludes patient writes and browser rendering. |
| Isolated workload on Azure VM, 10 sessions | 90 requests; zero failures; median 85 ms, p95 308 ms | Uses the deployed backend with an empty-schema clone seeded with 1,500 synthetic cases. Requests run over VM loopback. |
| Isolated workload on Azure VM, 25 sessions | 225 requests; zero failures; median 140 ms, p95 251 ms | Includes BHW/MHO reads, new cases, linked follow-ups and Today PDFs. Excludes public TLS/mobile latency and 25 actual browsers. |
| Workload data checks | Exactly 35 new synthetic cases, 35 residents and 70 consultations | No duplicate residents; temporary database removed; no production rows copied or written, no permission/firewall changes by the load harness, private configuration preserved. |
| Browser layout checks | BHW/MHO proportional summaries, desktop/phone widths, themes and fullscreen/Escape checked | Phone viewport 390×844; map table width and scroll width both 320 px, document width 390 px. BHW summary scrolled to its footer. |
| MHO phone-width smoke checks | Consultation, directory and report controls checked; Today PDF downloaded | Typed letter did not erase an already-entered birthdate; suffix includes None. Disposable synthetic preview only. |

Logins were staggered to respect the existing 10-attempt-per-minute limit per connection. A group sharing one Wi-Fi/public IP should sign in in small groups; the limit was not weakened for the test.

## Still requires real-world beta participation

Actual Android/iPhone testing and representative slow/mobile-network checks remain. A browser viewport is not a physical-device test, and this bounded workload is not a sustained capacity certification. Start with an invited dummy-data group and use the checklist to gather those results before claiming readiness for real patient operation. Predictive analytics remains postponed pending the data decision and model validation.

Private execution results, screenshots, account handout and backup verification are retained under `analysis/beta-readiness-20261018/` and excluded from publication. Application changes were applied locally and to Azure; this task did not push the changes to GitHub.
