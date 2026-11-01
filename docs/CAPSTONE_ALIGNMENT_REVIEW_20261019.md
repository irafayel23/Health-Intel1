# HEALTH-INTEL capstone alignment review

Reviewed 19 October 2026. Manuscript: `C:/Users/User/Downloads/WALA-PA-TAPOS-CHAPTER-3.docx`. The original was opened read-only, rendered through Microsoft Word and left unchanged. Page references below refer to its verified 57-page rendering. The six supplied images were treated as writing/formatting guides, not instructions to turn HEALTH-INTEL into a crime system. Application code and Azure configuration were not changed or redeployed.

## Overall finding

The manuscript broadly matches the project's health-surveillance purpose, seven participating barangays, four user roles, patient/resident records, descriptive charts, mapping, reports, account management, audit and backups. It is not yet a reliable description of the current implementation. The most consequential discrepancies concern forecasting, data provenance, deployment, database diagrams and the omission of recent case/visit workflows.

Do not assign an alignment percentage: there is no defined scoring rubric or equal weighting for these requirements. A correct margin does not offset a wrong forecasting method.

Separate three kinds of statement throughout the paper: implemented and verified behavior; proposed work that remains incomplete; research facts that require evidence from your own data-gathering activity. Future-tense proposal wording can remain where the work is genuinely proposed, but it must not be used as evidence of current completion.

## Priority corrections

### 1. Forecasting method and horizon

**Where:** objective 3 on page 6; delimitations on page 9; definitions on pages 14–15; repeated discussions across Chapters I–III; conceptual framework page 30; use-case diagram page 48.

**Paper:** SARIMA predicts the following month and excludes quarterly/annual forecasting.

**Current implementation:** `server/analytics.py` fits `SARIMAX(..., order=(1,0,0))` without a seasonal order, explicitly identifies the result as AR(1), and produces three monthly forecast values. It allocates a municipal forecast using a barangay's historical share, rather than fitting an independently validated model to each barangay. It returns `validation_status: pending`. The MHO screen explicitly says Three-month demonstration forecast and identifies AR(1).

**Required decision:** either document the present AR(1) demonstration and its limitations, or retain SARIMA/one-month forecasting as an unfinished target and complete/validate that target before presenting it as implemented. Changing the paper's wording does not implement SARIMA. Renaming the model or using the SARIMAX library name is insufficient.

**Additional methods gap:** specify the real-data cutoff, monthly aggregation, handling of missing reports versus confirmed zero, chronological validation, baseline, forecast horizon, error metrics and leakage prevention. Current code fills a date range beginning in 2023 and computes an 80/20 chronological split but does not output validated accuracy measures. Synthetic demonstrations cannot validate forecasting of actual community disease occurrence. Do not invent an accuracy percentage.

### 2. The 50% actual / 50% synthetic dataset is an unverified plan

**Where:** pages 3, 5–9, 12–16, 19, 27–29, 31–39 and elsewhere.

The user previously confirmed that current Azure patient/resident records are dummy data. This does not establish whether the researchers separately possess authorized real historical records. Neither saved dates ranging from 2023 to 2026 nor a half-and-half assertion proves provenance, reporting completeness or collection permission.

If 50/50 is an approved future design, identify it as planned and specify the unit: cases, residents, source rows or monthly observations. Record exact counts and the generation procedure when available. Do not fabricate a real-data proportion. Describe which dataset is used for development, interface demonstrations and model validation separately.

The latest Show sample data switch supplies fictional analytics responses without inserting patient records. It does not implement a database-level real/synthetic provenance flag or a 50/50 training dataset. The current encoding path does not provide a verified end-to-end provenance separation workflow. Claims that actual and synthetic database rows are already distinguished need a documented, tested mechanism before real records are mixed into the system.

### 3. Deployment describes the wrong services

**Where:** pages 46–48.

The text names Render.com for the application and Aiven.io for MySQL. The current deployment uses an Azure Ubuntu VM running Node/Express, Python, local MySQL and Caddy. Node listens on loopback port 3000 and MySQL on loopback port 3306; Caddy serves the public HTTPS endpoint. GitHub is source control and should not be described as the application runtime.

The existing production deployment configuration expressly restricts the database to loopback; moving it to a remote managed database would be separate work. Update the paper to the actual Azure arrangement. Document the VM size as a dated operational setting rather than a permanent architecture assumption; it was returned to 2 vCPUs / 1 GiB on 19 October after temporary beta preparation.

### 4. The database figures are outdated

**Where:** database architecture pages 41–42 and database schema page 49.

The five-entity illustration is an understandable early conceptual view, but it is insufficient as the current physical schema. Include the resident → disease case → consultation/visit relationships and the disease catalog/review and resident vital-status records. Relevant implemented structures include `case_visits`, `disease_registry`, `resident_death_reports` and `resident_vital_status`, plus supporting authentication/session tables where appropriate for the diagram's level of detail.

The page 49 image contains `gender`, although the agreed current form does not collect sex/gender. Do not add a sex field just to match this old image; correct the documentation unless the project scope is intentionally changed later.

Other examples to reconcile with the schema/migrations: current record references use underlying `id` fields and `birthdate`; recorded case statuses are Active/Cleared/Deceased and severity is Mild/Monitored/High Risk. The diagrams instead show names such as `case_id`, `dob`, Recovered/Fatal and Low/Medium/High. The figures also disagree with each other about user password field naming. Check actual field names/types and foreign keys before drawing the final physical schema. Describe bcrypt as password hashing, not reversible encryption.

### 5. Update the clinical-service exclusion

**Where:** page 9 excludes clinical consultation; pages 50–52 describe a much older, simpler encoding workflow.

The system records consultation encounters, their date/time, referral information, blood pressure, temperature, height, weight, visit severity, notes and advised follow-up plans. It records New consultation/case, New admission and Follow-up visit against the relevant case. It does not itself deliver a medical consultation, diagnose the patient, prescribe treatment or manage hospital beds.

Clarify that delivering clinical care is excluded while documenting encounters for surveillance is included. An admission entry is not a full hospital admission-management module. A stored next-follow-up date is advice tracking, not an automatic appointment/SMS system.

### 6. Available comorbidity information is not a complete implemented module

**Where:** scope/data gathering on pages 7, 9 and 34–35, and definition page 13.

A resident can have several disease cases, but that alone does not establish concurrent clinician-confirmed comorbidity. No dedicated comorbidity capture/analysis workflow was identified in the current encoding and validation code. Either define the precise supported representation and limitations, or narrow the claim. Do not count separate historical episodes as confirmed comorbidity automatically.

## Features that match and recent features to document

The four roles broadly match. BHW is scoped to its assigned barangay; MHO records cases/visits, reviews records and sees municipal information; Admin manages BHW/MHO access and catalog/records; Superadmin manages Admin access, audit oversight and backups. The seven named barangays match the configured pilot scope.

Add or update the following in scope, module descriptions, use cases, input designs and test cases:

1. Resident, disease case and consultation/visit as distinct records. A follow-up/admission adds a visit and does not inflate the original disease-case count.
2. Original-case selection by matching identity and eligible case date, with a worker choosing the correct episode when multiple cases exist.
3. Return-date/instruction recording and Due today / Upcoming / Past due follow-up tracking.
4. Searchable disease catalog, unlisted reported-condition wording/source, MHO review and clarification.
5. Review Center tabs for Disease Review and Resident Status. Case Deceased outcome is separate from confirmed resident death and verified cause of death.
6. Patient Directory and resident dossiers with linked case and visit histories.
7. Daily report date selection for today or a past day, plus monthly/weekly outputs. Downloads are not official submissions; regenerated historical reports can reflect corrections/late entries.
8. Age calculated at case/consultation date and derived groups 0–5, 6–12, 13–17, 18–59, 60+ and Not recorded. Age zero is valid for infants.
9. Descriptive findings for leading disease, highest recorded barangay count, largest known age group and peak recorded month, including ties/counts/shares.
10. Barangay/Age group breakdown tabs, annual/monthly trend, selectable multi-year comparison and same-date versus calendar-total comparison. Partial current years are labeled YTD.
11. Top-ten charts show up to ten matching conditions. Fewer than ten is legitimate when the selected records contain fewer conditions.
12. Proportional map rings, fullscreen, condition/severity details and recorded-data/sample-mode distinction.
13. Restore Access for suspended accounts, old-session invalidation, server-confirmed logout, protected backup downloads and audit records.

Mayor's Office/LGU representatives may be research respondents without being a separate login role. Pages 44, 49 and 52–53 loosely imply municipal/LGU system users; explain that direct use requires one of the four supported roles. Do not invent a fifth portal or give study observers another person's login.

The use-case diagram on page 48 omits several current BHW/MHO functions and Admin-versus-Superadmin approval differences. Replace the old diagram with role-specific use cases reflecting actual permissions. Its Quarantined users wording should match the real pending/approved/denied/suspended access states. An audit log is not proven immutable against database administrators merely because the ordinary UI offers no deletion action.

## Comparison with the six guide images

| Guide | Finding | Recommended revision |
| --- | --- | --- |
| 1. Formatting | The single document section has the required left 1.5-inch margin and 1-inch right/top/bottom margins. Main body text is Times New Roman, 12 pt; long prose paragraphs are justified; headings are bold. | Standardize first-line indentation, especially Definition of Terms and some architecture/evaluation prose. Headings, tables and list items can have appropriate exceptions rather than forcing a prose indent onto every object. |
| 2. Background | The background covers the domain, existing digital systems, Murcia's reported communication/referral practices and proposed solution. It broadly answers the four questions. | Reduce repetition with the introduction. Strengthen the operational gap using dated interview/document evidence: who experiences which recording, follow-up, consolidation or reporting problem. Being localized is not by itself proof that other systems lack the needed functions. |
| 3. Terms | Some entries include both general and HEALTH-INTEL-specific meanings; others, including Comorbidity, Dashboard and Descriptive Analytics, are largely generic. | Use a conceptual definition and an operational definition consistently. Add resident/case/visit, recorded severity, follow-up plan, disease catalog, sample mode, YTD and resident death confirmation. Correct the forecasting definitions. |
| 4. Related literature | The references are healthcare-focused, as they should be. Most entries use a clear individual-study summary followed by relevance. | Add thematic synthesis comparing studies rather than repeatedly restating the same project pitch. Suitable themes: disease surveillance, data quality, descriptive dashboards, geographic visualization and forecasting. The crime example guides structure, not subject matter. |
| 5. Related-systems matrix | The document includes the required concepts: system, developer, functions, advantages, limitations and relevance, with HEALTH-INTEL as the proposed-system row. Separating advantages and limitations into two columns is acceptable unless the adviser requires an exact layout. | Rebuild the table as a simpler matrix. It currently spans pages 24–28, breaks names/words and splits records across pages without useful repeated headings. Use concise text, deliberate widths and the guide's permitted 10 pt table font. Consider landscape only if the institution permits it. Add source citations and avoid treating a broader scope as evidence of a product defect. |
| 6. Development methodology | Agile is selected and an Agile diagram is present on page 32. The guide shows alternatives, not a requirement to use all models. | Keep one justified development methodology. Map actual iterations to requirements, design, implementation, tests, feedback and revisions. Research design (descriptive/developmental) and software development method (Agile) answer different questions. Do not invent completed stakeholder sprint reviews. |

### Formatting details

There are 179 long paragraphs in the main document body. All are justified, with 1.5 line spacing. Thirty-seven have no effective first-line-indent property, although some are numbered objectives/bullets or a paragraph beginning with a typed tab. This is not a claim that all 37 are formatting violations. Clear prose examples needing consistency include parts of the module discussion, evaluation methodology and the paragraph following the Likert scale. Many terms are intentionally flush left but conflict with a literal reading of the supplied paragraph-indent rule; follow the adviser’s convention consistently.

The text-based run formatting is overwhelmingly Times New Roman 12 pt, including the dense comparison table. Image text cannot be validated from Word font properties. Several architecture diagrams have compressed or small text; redraw/export them at a readable size rather than stretching raster screenshots. Use numbered figure/table captions and refer to them in the prose. The background heading begins near a page bottom; improve pagination to keep headings with a meaningful amount of following text.

## Mapping and architecture wording

The general geographic-visualization claim is appropriate. The current display uses barangay aggregate ring markers, not patient address coordinates, kernel-density heat surfaces or statistical hotspot detection. The ring segments represent active cases recorded as Mild (green), Monitored (orange), High Risk (red), with an unknown-severity category when present; the center gives the active count. A barangay with 18 Mild and 1 Monitored case is mostly green with a small orange segment. This is not an outbreak probability or a population-adjusted risk estimate.

If the interface keeps Heatmap Cases as its page name, define the study's operational meaning precisely. Do not borrow claims about Moran's I, spatial scans, hotspot significance or crime-density methods from the example unless such analysis is actually implemented and evaluated.

The conceptual framework on page 30 and system architecture page 40 need the same model/horizon correction. Their official-report language should be qualified: the project has report exports, not established DOH certification or automatic submission. Add the case/visit distinction and the appropriate sample/recorded source separation to the narrative.

The page 41 network illustration places servers inside a municipal data center and shows an intranet path. That is not the current Azure hosting arrangement. All roles use internet browsers to reach public HTTPS at the Azure VM. Show Caddy terminating HTTPS, then loopback communication to Express and MySQL. Do not claim WSS/WebSockets without an implemented use. SMTP and the Python child-process bridge can remain, but explain that the current Python engine also reads the local MySQL database; it is not physically isolated from the database just because Node starts the process. CORS is a browser-origin control, not a general network firewall.

## Chapter III methods and evaluation gaps

1. **Respondents:** purposive selection is stated, but final counts, inclusion criteria, distribution across roles/barangays and recruitment rationale are missing. Twenty beta accounts do not establish twenty recruited participants or completed responses. Keep participant totals as pending until known.
2. **Research evidence:** claims about existing Messenger/referral practices, completed interviews and authorization letters require the researchers' dated supporting materials. The system code cannot verify these research events. Distinguish permission to conduct interviews from authorization to receive/use identifiable historical health records.
3. **Questionnaire:** a five-point scale and general criteria are present, but the actual item bank, source/adaptation, reviewer validation, administration procedure and interpretation rules need to be specified. For a frequency-weighted Likert mean, define `sum(frequency × response score) / number of valid responses`; handle unanswered items and report actual respondent counts.
4. **Quality model:** specify the exact ISO/IEC 25010 edition and selected characteristics. The terminology shown resembles the older model. ISO lists the 2011 edition as withdrawn and a 2023 product-quality edition as published. If the school requires a questionnaire based on 2011, cite and justify that edition explicitly instead of silently combining editions. Applying selected criteria is not ISO certification.
5. **User versus technical evaluation:** user perceptions cannot alone establish security, maintainability, reliability or resource efficiency. Pair the relevant criteria with technical checks and identify who evaluates them.
6. **Lighthouse:** page 54 shows a local `127.0.0.1:5500/mho.html` report and a warning about stored data affecting results. It is not a documented current Azure result or proof that twenty active users can save simultaneously. Specify URL, build/date, mobile/desktop setting, throttling, repeats and the metrics recorded. Lighthouse evaluates browser performance under stated conditions; add a separate bounded workload/error-rate test for concurrency.
7. **Forecast evaluation:** state a chronological holdout or rolling-origin design and compare against an appropriate simple baseline; report MAE/RMSE and a clearly justified additional metric where useful. Do not blindly use MAPE when actual counts can be zero. Keep test periods out of model selection and distinguish an unavailable report from a verified zero count.
8. **Acceptance workflow:** include new case → return plan → follow-up/admission → history → report, unlisted condition → MHO classification/clarification, access isolation, suspended-session invalidation and mobile usability. Record actual outcomes when beta testing occurs; it has been postponed.
9. **Chapter completion:** Chapters IV and V currently contain placeholder chapter headings. That is understandable for this unfinished draft; do not insert fabricated results. The provided file has no complete reference list at the end, despite extensive in-text citations. Add references and the required appendices/instruments before submission.

## Reference spot checks

The following sources were verified online as bibliographic references; this is not a full audit of every claim or every institutional source in the manuscript.

- [Gupta et al. 2023, original article](https://pmc.ncbi.nlm.nih.gov/articles/PMC10074606/): the dashboard/paradata article exists and is relevant to surveillance data quality.
- [Snyder and Maglasang, journal record](https://pubmed.ncbi.nlm.nih.gov/38081048/): the 2024 journal issue includes the Cebu study of 80 barangays and one-month-ahead prediction. Its publication history also includes a December 2023 online date; use the chosen citation style consistently.
- [Bardiago et al. 2024, original university journal article](https://www.isujournals.ph/index.php/jessah/article/view/46): HealthSentry exists, discusses spatiotemporal/geo-mapping and GNN methods, and reports RAD as its own development approach. That does not require HEALTH-INTEL to use RAD.
- [Liang et al., University of Edinburgh publication records](https://www.research.ed.ac.uk/en/organisations/usher-institute/publications/?type=%2Fdk%2Fatira%2Fpure%2Fresearchoutput%2Fresearchoutputtypes%2Fcontributiontobookanthology%2Fconference): the RSV dashboard contribution is listed with a July 2024 publication date in proceedings associated with INTERACT 2023. Verify the final bibliographic entry against the publication itself.
- [Buebos-Esteve and Dagamac 2024, journal record](https://pubmed.ncbi.nlm.nih.gov/38701871/): the remote-sensing/interpretable-ML dengue paper exists. It supports related work, not a claim that HEALTH-INTEL incorporates its environmental predictors.
- [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html) and [2011 edition status](https://www.iso.org/standard/35733.html): specify the edition actually used.
- [Chrome documentation on Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring): scores derive from browser metrics and can vary with conditions. Keep that evaluation separate from forecast accuracy and multi-user load testing.

Other citations such as generic WHO/DOH/ASEAN references and the FASSSTER attribution still need exact source titles, authors/organizations, dates, URLs/DOIs and claim-by-claim checking. Do not use a general organization name plus a year as a substitute for an identifiable source.

## Suggested wording for the next revision

**Current implementation:** “HEALTH-INTEL records residents, disease cases and consultation visits through role-based web portals. Admissions and follow-up visits are linked to an existing disease case. Descriptive analytics summarize the selected case records by condition, barangay, recorded age group and period. Geographic summaries show active case counts and the proportions of recorded severity categories.”

**Clinical delimitation:** “The system documents consultation encounters and advised follow-up plans for surveillance purposes. It does not provide medical diagnosis, prescribe treatment, deliver clinical consultations or perform hospital management.”

**Hosting:** “The current application is hosted on an Azure Ubuntu virtual machine. Caddy serves HTTPS requests to the Node.js/Express application, while MySQL and the Python forecasting component operate on the same VM with restricted local database access.”

**Forecasting, if describing the present build:** “The current predictive screen provides an unvalidated three-month AR(1) demonstration, with municipal forecasts allocated by historical barangay shares. A validated SARIMA implementation and its final evaluation remain future work.” Use a different sentence only once the different implementation exists and is verified.

**Data provenance:** “Current hosted beta testing uses dummy records. Any later authorized historical dataset will be documented separately with its source, coverage, completeness and permitted use. Synthetic demonstration results will not be represented as actual disease observations or validation of forecasting accuracy.” Adapt this only to research facts the team can substantiate.

**Operational map definition:** “In HEALTH-INTEL, the map displays barangay-level markers whose centers show active case counts and whose colored ring segments show the proportions recorded as Mild, Monitored and High Risk. The map does not establish outbreak risk or statistical hotspot significance.”

## Recommended revision order

First resolve the intended forecasting method/horizon and actual dataset plan with the adviser. Next correct deployment and the database/use-case/network figures. Then document the latest record/visit, follow-up, review, reporting and analytics workflows. Complete the evaluation protocol and references. Finish by standardizing terms, indentation, table layout and current screenshots. Preserve unsupported research outcomes as pending rather than manufacturing completed evidence.

## Local evidence checked

- `server/analytics.py`, `mho.html`: actual AR(1) implementation, horizon and validation labels.
- `server/routes/analytics-routes.js`, `server/services/analytics-sample.js`: analytics/sample endpoints and display-only separation.
- `server/services/case-encoding.js`, `case-visits.js`, `patient-validation.js`: resident/case/visit relationships, captured fields, statuses and matching rules.
- `server/services/resident-vital.js`, `disease-review.js`, `session-security.js`: extra schema structures and current review/session behavior.
- `server/services/age-groups.js`, `assets/js/shared/age-groups.js`: recorded-age grouping.
- `server/config/deployment-config.js`, `deploy/Caddyfile.example`, `docs/AZURE_DEMO_DEPLOYMENT.md`, `docs/VM_SIZE_RESTORED_20261019.md`: Azure/loopback arrangement and dated size change.
- `docs/CURRENT_ROLE_FLOWS_20261018.md`, `docs/ANALYTICS_BREAKDOWN_20261018.md`, `docs/BETA_READINESS_20261018.md`: feature/release/test context, checked against current code where material.

No database rows were read or modified for this manuscript review. No new tests, deployment or model training were performed. Formatting measurements come from Word/OOXML inspection; screenshots and figures were inspected in the rendered manuscript.
