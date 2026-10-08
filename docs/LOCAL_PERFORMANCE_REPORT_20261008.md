# Local performance report — October 8, 2026

Later the same day, the user authorized prebuilt styles for BHW/Admin/Superadmin and BHW loading/retry improvements. Those changes supersede the runtime-style description below for those portals. These measurements still describe the earlier run; the 25-user load test was not repeated for that follow-up. See `PORTAL_LOADING_UPDATE_20261008.md` for the subsequent changes and verification.

## 1. MHO startup improvement

MHO now loads a prebuilt Tailwind stylesheet instead of downloading and compiling its utilities in the browser. The build preserves the previous color configuration, dark-mode behavior, HTML IDs and JavaScript hooks. Only MHO's utility-style loading changed in this task; earlier local fixes were retained.

Three fresh desktop browser contexts were measured before and after, with the portal cache disabled and 5,000 synthetic cases in a disposable database.

| Measurement | Before | After |
| --- | ---: | ---: |
| Median time until chart data is populated | 2,029 ms | 940 ms |
| Median observed long-task blocking | 686 ms | 74 ms |
| Worst individual observed long task | 389 ms | 81 ms |
| Median time from opening map to first loaded tile | 644 ms | 721 ms |
| Median time from opening map to refreshed case data | 468 ms | 661 ms |

Populated-chart startup improved approximately **54%**. The map did **not** improve in these samples. Its external tiles and separate data refresh remain variable.

The initial CPU profile attributed substantial startup work to the Tailwind CDN compiler and Chart.js. The new generated stylesheet is 25,909 bytes. Chart.js and other existing external libraries remain in use.

Chart readiness means the KPI count and all three charts have data; it does not wait for the final animation frame. Observed blocking sums the portion of each task above 50 ms through initial loading and map opening, including the subsequent 1.2-second observation window. These numbers are **not Lighthouse scores or its standardized TBT metric**, and three samples do not describe every device or network.

## 2. Sustained, separate browser sessions

Unlike the earlier short API burst, this test used **25 distinct accounts and 25 isolated browser contexts**, with actual sign-ins and a session-identity check. The role mix was 15 BHW, five MHO, four Admin and one Superadmin. An initial mixed group of 10 users ran first; the remaining users then joined.

Every round repeated real UI navigation: MHO year filters/charts and map refreshes; BHW patient and resident views plus synthetic case saves; Admin patient/audit views; Superadmin dashboard/ledger navigation. A round was scheduled every eight seconds, without adding overlapping rounds if it ran slowly.

| Phase | Measured duration | API responses, including CORS preflights | HTTP failures | Browser action timeouts | Median API headers latency | 95th percentile |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 signed-in users | 2 min | 993 | 0 | 0 | 235 ms | 1,375 ms |
| 25 signed-in users | 5 min 17 sec | 3,839 | 0 | 4 | 973 ms | 9,035 ms |

The 25-user browser phase is **not a clean performance pass**. Four BHW patient-table waits exceeded 15 seconds. Screenshots captured a temporarily blank patient table; no unhandled JavaScript errors were captured. Other actions completed, and all **60 reported synthetic saves** were independently found in the test database, bringing its case count to 5,060.

Recorded browser cycles completed 150 actions at 10 users and 621 at 25 users. The mixed action timings include opening/filling/saving dialogs as well as reading views, so they are not a single-page load measurement.

All browsers, the application server and MySQL ran on this PC. Additional targeted theme/regression checks overlapped part of the 10-user phase. This stresses the testing computer as well as the application and cannot establish the number of users the Azure VM can support. Browser API timing records time to response headers; it excludes subsequent JSON parsing and rendering.

## 3. Isolated server check

The follow-up used 25 independently authenticated API sessions for **5 min 4 sec**, without the 25-browser rendering workload. Each account was authenticated through the actual login endpoint and its session identity was checked. Tokens remained in memory. Read workloads covered BHW records/residents/puroks, MHO analytics/maps, Admin records/audits and Superadmin health. Predictions were excluded.

| Requests | Failed | Median full response and JSON parsing | 95th percentile | Slowest |
| ---: | ---: | ---: | ---: | ---: |
| 2,877 | 0 | 350 ms | 787 ms | 1,141 ms |

This test measures full JSON responses, whereas the browser test records response-header timing and also measures UI actions. It has no browser CORS preflights, DOM rendering, chart animations or patient saves, and is therefore a separate diagnostic rather than an exact replacement workload.

The fixture/server Node process reached 239 MB RSS during this phase; this excludes MySQL, browsers and a running prediction process. The median of the one-second event-loop 95th-percentile samples was 34 ms and the largest was 173 ms in this phase. Across the entire testing session, an event-loop sample reached 12,986 ms. This supports local resource contention as a contributor, but does not identify a single cause or measure the Azure VM.

The remaining performance work is to reduce BHW/MHO browser work further and repeat a distributed browser test using separate devices. The other portals still compile Tailwind in the browser. The four browser timeouts remain an unresolved finding; the clean API test does **not** turn them into a UI pass.

## 4. Shared-network login limitation

The existing backend allows **10 login attempts per minute per IP address**, counting successful sign-ins too. In the burst check, three preceding logins had used part of that allowance; seven of 25 additional simultaneous attempts succeeded and 18 received HTTP 429. This was an expected security-limit response, separate from the authenticated workload phases.

For group beta testing on one Wi-Fi network, stagger sign-ins across several minutes. Security limits were not relaxed. The current shared-IP limit still needs a separately reviewed approach if immediate group login is required.

## 5. Verification and delivery scope

- All **103 regression tests passed**.
- All **24 targeted MHO checks** passed across desktop/phone and light/dark themes: analytics, walk-ins, classification review, heatmap, reports and account dialog. Selected axe rules checked contrast, heading order, button names and form labels; main views had no document-wide horizontal overflow. These are targeted checks, not complete accessibility certification.
- Dialog checks wait for the opening animation to finish. The initial test mistakenly measured fading text and was corrected; no application contrast change was needed for that transient finding.
- Pre-change MHO HTML is retained at `analysis/local-performance-20261008/before/mho.html` for local recovery. Raw measurements, scripts and screenshots are under `analysis/local-performance-20261008/` (ignored by Git).
- The reusable CSS build is pinned under `tools/styles/`; its generated CSS must accompany a future deployment. Rebuild instructions are in `docs/SETUP.md`.
- Changes remain local. No Azure deployment, resize, firewall change, original-data import or prediction work was performed.

After testing, the disposable database was removed and both fixture servers were stopped. A before/after fingerprint across the original database's tables confirmed **the original database was unchanged**. The normal local installation was not stopped. Cleanup evidence is `analysis/local-performance-20261008/cleanup.json`.
