# MHO Review Center — 14 October 2026

Replaced the separate Disease Review and Resident Status sidebar entries with one **Review Center**. Both workflows remain available as named tabs with their existing field IDs, queues, dialogs, controls and API permissions.

The sidebar now has seven items: Municipal Analytics, Walk-in Patients, Patient Directory, Predictions, Review Center, Heatmap Cases and Reports. Predictions is the fourth (middle) item; Reports is last, as requested.

Disease Review is the initial tab and retains its pending-count badge. Tabs support arrow keys, Home/End and normal keyboard focus. Selecting a tab refreshes that queue. Leaving and returning to Review Center retains the selected tab and resident-status filters. Shared page navigation hides the whole Review Center without incorrectly hiding its selected inner panel.

Validation: 22 existing navigation/structure checks passed. After the requested sidebar-order correction, the navigation-order check passed again. Browser verification used only synthetic records in a disposable database: both tabs loaded their queues, both existing review dialogs opened and were cancelled, filters and selected-tab retention worked, keyboard selection/focus worked, and the sidebar placed Predictions in the middle and Reports last. Desktop and 390-pixel phone checks passed in light/dark themes. Tables scroll within their own region on phones.

This was initially a local UI/navigation change and needs no database migration. It was deployed to Azure on **15 October 2026**; see [final release verification](AZURE_RELEASE_20261015.md). Source recovery copies, screenshots and verification/cleanup metadata are in `analysis/mho-review-center-20261014/`.
