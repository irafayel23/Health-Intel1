# Local browser workflow rehearsal — 17 October 2026

Completed through the actual BHW and MHO interfaces against a disposable local database. Azure was not accessed or changed. No application fix or schema change was needed for this rehearsal.

## Verified sequence

1. BHW created a new synthetic patient and disease case dated 16 October, with all four measurements, a recorded severity, a return date of 17 October and return instructions. Numeric birthdate entry formatted correctly. Missing measurements and a return date before the consultation were blocked before saving. Catalog search found a disease outside the initial top-ranked selection.
2. Both BHW Resident Profiles and MHO Patient Directory showed the same case as Due today, with the original consultation date and advice.
3. MHO used Record follow-up. The patient identity, barangay, existing case and Follow-up visit were selected correctly. Measurements, time, remarks and new-plan fields were blank. MHO saved fresh measurements and a new return date of 24 October under the same case ID.
4. Both roles showed zero Due today and one Upcoming plan, with the new advice. MHO history showed one disease case and two consultations; both visits retained their own measurements, severity, encoder and return instructions. The original case remained Active/Mild even though the returning visit was recorded as Monitored.
5. BHW cancelled the return shortcut once; the Upcoming plan remained unchanged. BHW reopened it, selected New admission, entered fresh measurements and saved without another return plan.
6. Both roles then showed zero pending plans across all three due-date buckets. Both histories contained one case and three consultations: new consultation, follow-up and admission. The earlier return dates and instructions remained in their original visits. The BHW profile and filtered MHO directory each showed one resident entry.

## Data preservation and evidence

An independent check of the disposable database confirmed exactly one new resident, one disease case and three linked visits. The disease-case row matched the snapshot taken immediately after initial creation, and both earlier sets of advice were preserved. The temporary database was removed and the original local database fingerprint remained unchanged. No browser warning/error logs were recorded during the final MHO check.

Screenshots and the verification/cleanup reports are retained privately under `analysis/workflow-browser-20261017/`. Screenshots use synthetic records only. The existing automated suite had passed 187 tests before this browser rehearsal; no runtime code changed during the rehearsal.
