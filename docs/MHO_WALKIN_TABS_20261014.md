# MHO Walk-in Patients tabs - October 14, 2026

Completed locally after the user approved resuming the tab change. Azure has not been deployed.

- Two tabs sit directly below the existing Walk-in Patients heading: Record Case / Visit and Recent Consultations.
- The form and recent list occupy separate panels inside the same sidebar page. Recent consultations no longer require scrolling past the form.
- Switching panels preserves unfinished form values. The form remains selected by default, and the selected view is retained when switching other sidebar pages.
- The tabs remain available while scrolling. Selecting a tab returns the page content to the top; opening Recent Consultations refreshes its existing account-scoped list.
- Tab/tabpanel relationships, selected state and keyboard navigation (Left/Right/Home/End) are supported.
- Recent-list loading and errors are explicit. An older response cannot replace newer data.
- BHW, database permissions and the sidebar structure are unchanged by this tab update. A municipality-wide Patient Directory remains a separate proposal.

Verification: 29 existing portal/workflow regression tests passed. Headless Chrome checked desktop/mobile in light/dark mode, mouse/keyboard panel switching, saved draft values, scroll position, and the existing new case/follow-up/admission save workflows. No real patient/account rows were written.

Evidence: analysis/mho-walkin-tabs-20261014/. Recovery copies made before the tab edit: analysis/mho-walkin-tabs-20261013/before/.

Refresh the local MHO page with Ctrl+F5 to load the updated layout.
