# MHO return-visit shortcut — 14 October 2026

Implemented locally; Azure and GitHub have not been updated in this task.

Patient Directory → View history → Disease cases now offers **Record follow-up / admission** beside eligible linked cases. It opens Walk-in Patients → Record Case / Visit with family/first name, suffix, DOB, resident barangay and purok filled. The operator explicitly chooses admission or follow-up. Today's Philippine date is the initial consultation date; measurements, time, referral information, severity and remarks start fresh.

The selected case is fetched again using the existing exact identity and barangay checks, archive status and resident death-date restrictions. An optional integer `case_id` filter lets the chosen original case be found even if it falls outside the usual latest 50 matches. Parameterized SQL and MHO authorization remain in place. Identity edits discard the shortcut target; date/nature changes recheck availability. An unavailable case cannot be saved through the form. Save still uses the existing transactional visit service and duplicate protection.

Archived and unlinked records have no shortcut. Confirmed deceased profiles use the existing consultation form for eligible historical visits. Incomplete patient identities must be completed first. The shortcut asks before replacing entered form details; cancellation retains the draft.

No schema changes are needed for this shortcut. The new visit is stored in existing `case_visits` and stays in the resident's history. It does not create another resident or disease case, or overwrite the original case date/status/severity.

## Verification

Deployment update: this shortcut is live on Azure as of **15 October 2026**. See [final release verification](AZURE_RELEASE_20261015.md).

- `node --test tests/directory-sessions.test.js tests/case-visits.test.js tests/portal-navigation.test.js`: **21 passed, 0 failed**, using disposable databases. The initial run could not connect because XAMPP MySQL was stopped; the existing MySQL instance was started. A test assertion was corrected to the endpoint's existing HTTP 201 response.
- Integration regression covers an original case older than 50 newer matches, mismatched identity, archived/unlinked cases, invalid target type, role denial, required new measurements, follow-up/admission saves, duplicate rejection, unchanged disease totals and original case details.
- Real browser checks on synthetic preview: identity/suffix/DOB/barangay/purok prefill, blank measurements/time/severity/referral/remarks, explicit nature selection, follow-up and admission saves, visible unchanged disease count, unfinished draft cancellation, link cleared after identity edit, keyboard access, desktop light/dark and phone dark layout.
- Browser follow-up increased structured consultations from 12 to 13 while the patient's disease cases remained 2; the subsequent admission also reported unchanged disease totals.
- Generated MHO CSS rebuilt; frontend JavaScript syntax checks passed.
- Screenshots and disposable-preview cleanup evidence: `analysis/mho-return-shortcut-20261014/` (ignored by Git).
