# Dashboard readiness follow-up — 7 October 2026

## Completed and deployed

- BHW and MHO load Leaflet and the heatmap implementation only when the heatmap view opens. Failed library downloads can be retried by leaving and reopening the view. Repeated navigation does not create duplicate maps.
- BHW defers patient, purok and resident requests until their respective views open. Returning to an archived patient view keeps the archived endpoint.
- Fixed the audited light-mode text contrast, heading sequence and login main landmark. Login profile Cancel is a real button with its existing action preserved. Removed two decorative Superadmin chevrons that had neither names nor behavior.
- Superadmin health responses retain readable status colors in both themes rather than overwriting them with low-contrast classes.
- Configured the user-selected Gmail sender on Azure using existing private local credentials. SMTP authentication passed locally and from the VM. Credentials were not printed or committed. **No email was sent: actual inbox delivery and complete recovery/approval email workflows remain unverified.**

The hosted database remains synthetic. No source patient records were uploaded. The forecast model and Facebook preview were not changed.

## Verification

- 20 relevant structure/theme tests passed. The BHW startup regression now checks deferred requests, navigation-triggered loads, refresh events and archive preservation.
- Real-browser local checks covered all five supported pages, saved light/dark portal themes, map initialization/reopening and JavaScript page errors. The targeted axe checks (contrast, heading order, button names, main landmark) found no violations in the initial views. This is not an exhaustive audit of every hidden dialog.
- Both disposable local runs confirmed that the original database fingerprint was unchanged and removed their test databases.
- Hosted walkthrough: all four roles signed in, with 19 main views checked (BHW 5, MHO 6, Admin 4, Superadmin 4). No failed application API responses or JavaScript page errors were observed. External map resources occasionally kept the browser from becoming idle; map data refresh itself succeeded.
- BHW monthly report downloaded a valid PDF (4,998 bytes); MHO FHSIS returned HTTP 200 with application/pdf. One MHO prediction returned HTTP 200. Forecast accuracy was not established.
- Two new mobile Lighthouse laboratory runs: BHW performance **97**, accessibility **100**, TBT **80 ms**, LCP **2.1 s**; MHO performance **89**, accessibility **100**, TBT **300 ms**, LCP **2.4 s**. These use synthetic local data and single runs. Network/cache/fixture differences prevent treating the earlier scores as a controlled before/after comparison. They do not prove sustained Azure capacity or that all lag is fixed.

## Recovery and evidence

Nine deployed UI files were verified against their previous hashes before replacing them, then verified against their uploaded hashes. Recovery on Azure: `/home/azureuser/ui-readiness-backup-1791348524`.

Local previous UI files and hashes: `analysis/readiness-ui-20261007/before/` and `before-hashes.json`. Private prior mail configuration on Azure: `/home/azureuser/mail-config-backup-1791348747304` (restricted access). The older Satin Flow recovery copies remain intact.

Evidence, synthetic screenshots, HTML Lighthouse reports and verification scripts are in `analysis/readiness-ui-20261007/`. Preserve that ignored folder to retain evidence and local recovery files. No commit or push was made.

## Still pending

- Firebase's public client configuration confirms that the Azure hostname is absent from authorized domains. The signed-in owner console is accessible, and the exact domain is entered in the Add domain form. **Saving awaits action-time confirmation.** Google registration has not been completed or tested end to end.
- The user says adviser-approved prediction diseases and accuracy criteria are **not decided**. Accuracy validation cannot be signed off yet.
- Real records/final account transfer still requires explicit dataset approval; synthetic data remains the authorized deployment scope.
- Hosted save/edit/approval mutations were not performed in this follow-up. Earlier integration tests cover synthetic record mutations locally, but that is not equivalent to a final hosted end-to-end rehearsal.
- Sustained defense-day concurrency remains unmeasured; the expected number of simultaneous users is still needed. The VM remains 1 GiB RAM and retains the one-worker prediction limit.
- Further performance work may include compiling Tailwind ahead of time and loading PDF libraries on demand. This follow-up did not change those dependencies.
