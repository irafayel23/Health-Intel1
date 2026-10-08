# MHO report review packet

Prepared 3 October 2026. Status: **technical review completed; MHO validation pending**.

The monthly and weekly HEALTH-INTEL exports summarize recorded case entries. They are not approved FHSIS/PIDSR submission forms. A developer cannot approve disease definitions, establish completeness from a case count, or sign for the Municipal Health Office.

## What the system counts

| Item | Current behavior | MHO decision required |
| --- | --- | --- |
| Monthly scope | `date_recorded` in the selected month across configured barangays | Correct form, facility scope and reporting date field |
| Monthly grouping | Disease text, registry category and current case status; counts saved entries | Official disease/code mapping and inclusion/counting rules |
| Weekly scope | `date_recorded` in an ISO Monday-Sunday week, excluding next Monday | Actual surveillance calendar; ISO weeks are not presumed equivalent |
| Weekly fields | Recorded date, condition wording, entered severity and current status | Required fields and case definitions; severity is not suspect/probable/confirmed classification |
| Pending conditions | Remain in recorded-entry summaries | Local review and official-figure exclusion policy |
| Archived history | Historical exports include archived entries | Withdrawn/error corrections, retrospective changes and finalization policy |
| Empty result | No entries found for the filter | Complete zero reporting requires confirmation of expected unit submissions |
| Totals | Entries, not necessarily unique residents, incident diagnoses or deaths | Recurrence/follow-up/comorbidity rules and deduplication |
| Mortality | Registry label is not verified cause of death | Required mortality source and fields, if in scope |

Code references: `server/services/report-data.js`, `server/services/report-periods.js`, `server/routes/mho-reports.js`. No case dates, classifications, archive states or source rows were changed for this review.

## Findings and changes

The old monthly export used a five-column case summary under an official-looking Department of Health heading and included an unverified certification statement. The weekly export listed all recorded conditions under a PIDSR heading without establishing disease eligibility or required surveillance classification.

Both now carry **ACADEMIC SAMPLE - NOT FOR OFFICIAL SUBMISSION** on each page, use HEALTH-INTEL headings and identify themselves as recorded-case summaries. Monthly certification is replaced by an MHO review note. Unknown registry categories display Unclassified instead of defaulting to Morbidity. Long monthly tables wrap conditions, repeat headings and paginate; the existing queries and counts are preserved.

Existing `/api/mho/reports/fhsis` and `/api/mho/reports/pidsr` routes, selector IDs and download handlers remain compatible. Their names do not imply official approval. The MHO screen describes monthly/weekly review summaries. The system does not submit reports to DOH or issue immediate notifications.

## Public reference review

These sources support reviewing standardized formats, reporting definitions and provenance. They do **not** certify Murcia's form or local approval:

- [DOH SOCCSKSARGEN FHSIS policy audit notice](https://ro12.doh.gov.ph/%F0%9D%90%83%F0%9D%90%8E%F0%9D%90%87-%F0%9D%90%92%F0%9D%90%8E%F0%9D%90%97-%F0%9D%90%A9%F0%9D%90%9A%F0%9D%90%AB%F0%9D%90%AD%F0%9D%90%A2%F0%9D%90%9C%F0%9D%90%A2%F0%9D%90%A9%F0%9D%90%9A%F0%9D%90%AD/): identifies DM 2025-0104 for collection/reporting/management/dissemination. Indexed content was available; full fetch failed. Obtain the actual memo and supplements from the MHO.
- [Quezon City HIS terms of reference, November 2025](https://quezoncity.gov.ph/wp-content/uploads/2025/11/5.-HEALTH-25-IT-1393-TERMS-OF-REFERENCE-LINE-2.pdf), PDF pages 14-15: calls for standardized FHSIS formats under DM 2025-0104, source client lists and agreed requirements. Corroborating municipal evidence, not Murcia's specification or a national clinical form.
- [Coron CY 2024 accomplishment report](https://coron.gov.ph/wp-content/uploads/2025/10/Accomplishment-Report-CY-2024.pdf): indexed M2 morbidity table shows disease codes and age/sex breakdowns, illustrating missing dimensions in our summary. Full fetch failed; do not copy it as Murcia's current template.
- [DOH vaccine-preventable disease surveillance manual](https://doh.gov.ph/wp-content/uploads/2023/08/Booklet-2-Vaccine-Preventable-Diseases-and-Vaccine-Preventable-Disease-Surveillance.pdf): indexed guidance links reporting inclusion to standard surveillance case definitions. Full fetch failed; no disease-specific rule was implemented from it.

Older PIDSR references were also found. Their age and retrieval limits prevent establishing current disease lists, calendars or notification deadlines. No current official-compliance claim follows from this limited public review.

## Questions for the MHO

Show **synthetic** monthly/weekly samples to the Municipal Health Officer, FHSIS coordinator and surveillance officer alongside the exact forms they use.

1. Which current forms, versions and DOH memoranda apply? Is the requested output an internal summary, M2 report, surveillance line list or another form?
2. Which facilities/barangays must submit, and how is completeness established?
3. Which date defines the period: recording, consultation, onset, diagnosis or death? What is the approved weekly calendar?
4. Which disease definitions, codes and classification fields are required? Who approves mappings?
5. What counts as a new case versus follow-up, recurrence, multiple condition or corrected duplicate?
6. Which age/sex breakdowns, population denominators, facility IDs and other columns are required? What data is missing?
7. How should pending conditions, withdrawn entries, archives and late corrections be handled?
8. Which conditions require an immediate channel outside the weekly export? Who receives them and under what deadlines?
9. Who prepares, verifies and approves the report? What is signed and how is it submitted?
10. Which source records will be reconciled against the output, and how are differences resolved?

Never fill missing official fields with guesses. Deceased status does not supply a verified cause-of-death certificate; an approved registry name does not establish a confirmed diagnosis.

## Approval record

| Item | Authorized reviewer completes |
| --- | --- |
| Reviewer and role | |
| Review date | |
| Scope (internal summary / named official form) | |
| Form/memorandum versions and attachments | |
| Required fields/mappings/changes | |
| Calendar and counting rule reference | |
| Validation sample and reconciliation result | |
| Decision (changes required / internal use only / specified form approved) | |

This record is intentionally unsigned. No message was sent to the MHO and no approval was recorded. Revisit report labels/submission behavior only after documented requirements, implemented mappings and reconciled acceptance examples.
