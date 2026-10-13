# BHW performance follow-up — 13 October 2026

The previous four BHW action timeouts did not reproduce in today's baseline. The existing loading fixes are now checked under the earlier workload. Additional avoidable work was found and removed; this does not establish that the resident renderer caused the earlier four failures.

## Changes

- Resident cards are constructed in one HTML assignment instead of reparsing all preceding cards for every resident. Existing design, escaping, search, age display and dossier buttons remain intact.
- Patient Records navigation fetches its patient list without also loading the hidden report's purok options. Report options load when Reports opens and retain the selected option when still available.
- Saved cases refresh the resident directory and report options only when their screen is visible. Reopening either screen always fetches current data; no stale cache was introduced.
- A correction's paired events no longer refresh supporting screens twice. Patient rows, dashboard totals and trend charts still refresh.

The existing 10-row patient pagination, full-list search, archive endpoints, request coalescing, stale-response protection and Retry behavior remain unchanged. No database schema, original records, account permissions or prediction code was changed.

## Verification

`npm test`: 119 tests passed. The final correction-event adjustment also passed all 32 focused patient-loading, portal-structure and UI-workflow tests.

An isolated headless-Chrome resident-render benchmark, three samples per size, retained every card and dossier button:

| Synthetic residents | Before median | After median |
| --- | ---: | ---: |
| 100 | 121 ms | 3 ms |
| 500 | 2,801 ms | 15 ms |
| 750 | 10,225 ms | 21 ms |

These timings measure JavaScript/DOM construction in an isolated page, excluding API/network time and the full portal's styled layout. They are not end-to-end website timings.

Baseline: a disposable database with 5,000 synthetic cases and 25 separate accounts (15 BHW, 5 MHO, 4 Admin, 1 Superadmin). The 10-user phase ran for two minutes with 980 API responses, 150 successful browser cycles, zero HTTP errors and zero action failures. The 25-user phase ran for 306.7 seconds with 4,728 API responses, 800 successful browser cycles, zero HTTP errors and zero action failures. All browser error buffers were empty. The regression suite also ran during part of this baseline, so its latency figures are not a controlled before/after speed comparison.

Updated run: 25 separate signed-in accounts for 304.3 seconds, 4,208 API responses and 950 successful browser cycles; zero HTTP errors, browser action failures or captured browser errors. API response-header latency was 102 ms at the median and 514 ms at the 95th percentile. This is a local observation, not an Azure capacity guarantee or a controlled percentage improvement over the baseline.

All 143 synthetic case saves across both runs were verified in the disposable database (5,143 total cases). The updated run accounted for 75 saves and explicitly waited for each case to appear in the patient list.

A final browser walkthrough passed full-list search for a record outside the first page, 10-row pagination and Next, archive/active switching, report purok loading and selection retention, reopening the resident directory with newly saved profiles, and a single directory read for paired correction events.

Test cleanup removed the disposable database and closed the test servers/browser contexts. The original database's before/after row fingerprints matched. Test emails were stubbed; no original patient records were used as workload data.

One updated-run setup attempt timed out while waiting for external login dependencies; the harness was retried with bounded setup retries. A separate walkthrough attempt clicked before the destination page's DOM existed; waiting for the portal's navigation/context corrected that harness race. Neither was hidden as a passing patient-list action.

Raw synthetic-only results and test harnesses: `analysis/patient-performance-20261013/` (ignored by Git). The test now waits for the list's completed loading state rather than treating a placeholder row as success; the updated run also waits for each newly saved case to appear in the table.

## Scope

This is a local performance follow-up. It does not establish Azure VM capacity, sustained production concurrency or prediction accuracy. Azure deployment and GitHub publication were not part of this change.
