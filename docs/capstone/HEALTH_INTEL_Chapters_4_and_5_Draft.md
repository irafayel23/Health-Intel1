# CHAPTER IV
# RESULTS AND DISCUSSIONS

This chapter presents the implementation findings and available technical evaluation results of HEALTH-INTEL, a web-based community health surveillance system for the Municipality of Murcia, Negros Occidental. The study covers seven selected barangays: Salvacion, Alegria, Blumentritt, Caliban, Cansilayan, Sta. Rosa, and Minoyan. The discussion addresses centralized disease recording, descriptive analytics, forecasting, geographic visualization, role-based access, and system evaluation.

The findings reflect development and verification records available as of October 19, 2026. Technical checks demonstrate specific application behaviors under the conditions tested. Formal respondent ratings, final user-acceptance findings, and validated forecast-error measurements remain pending. Demonstration records and synthetic test results are discussed as evidence of software behavior and are not presented as observations of disease occurrence in the municipality.

## 4.1 System Implementation Results

### 4.1.1 Centralized Resident and Disease Records

The developed system organizes information into distinct resident, disease-case, and consultation records. A resident profile stores identity and residence information. A disease case represents a particular recorded disease episode, while consultation records describe the initial encounter and subsequent visits associated with that case. Patient Directory and resident dossiers allow authorized personnel to retrieve linked case and visit histories.

This structure supports recording a follow-up or admission entry without creating another disease case for the same episode. When a returning patient has multiple eligible cases, the worker selects the original episode using the patient's identity, case date, condition, and available case history. Admission entries document disease-related encounters; the application does not manage hospital beds, deliver clinical care, or make medical diagnoses.

The clinical database was normalized to reduce independently editable copies of resident identity and disease names. Case-time location, review information, consultation details, and historical source facts are maintained in related records. Known-birthdate ages are calculated at the case or consultation date. The implementation retains necessary historical information without inventing missing birthdates or automatically merging people with similar names.

### 4.1.2 User Roles and Access

The system provides a shared login page for four authorized roles. After authentication, the application directs each user to the functions permitted for the assigned role. Barangay Health Workers have barangay-specific access, while MHO personnel use municipal recording and review functions. Administrative responsibilities are divided between Admin and Superadmin accounts. LGU or Mayor's Office participation in the research does not create an additional system role.

Table 4.1 Implemented user roles and principal functions

| Role | Principal functions | Access boundary |
| --- | --- | --- |
| BHW | Record cases and visits; manage resident profiles; track follow-ups; view barangay maps and reports. | Assigned barangay. |
| MHO | Record walk-ins; access Patient Directory; review conditions and resident status; view municipal analytics, maps, forecasts and reports. | Authorized municipal functions. |
| Admin | Manage BHW and MHO access; maintain case records and the disease catalog; review operational audit records. | Administrative permissions. |
| Superadmin | Manage administrator access; inspect system status and the master ledger; generate protected encrypted backups. | Technical administration permissions. |

### 4.1.3 Disease Catalog and MHO Review

Both BHW and MHO entry forms provide searchable disease choices. Frequently recorded diseases appear first, with up to ten initial catalog choices. Search all diseases allows users to select conditions outside that initial list. A disease can therefore be recorded even when it is not among the most frequently recorded conditions.

Condition not listed is used when the reported wording has no suitable match in the full active catalog. The worker records the condition and its source, then saves the case for MHO review. MHO personnel may match an existing disease name, add a reviewed catalog entry, or request clarification. The original case and its consultation history are preserved during classification. This process standardizes recorded wording and does not establish a medical diagnosis.

A local browser rehearsal demonstrated that a catalog disease outside the initial ten choices could be saved directly. A separate BHW rehearsal saved an unlisted condition, which appeared in the MHO Disease Review queue and was linked to an existing catalog name. These rehearsals used disposable synthetic records. On Azure, eight missing names from the project's existing category list were added to the catalog, producing eleven available choices without generating patient cases.

### 4.1.4 Follow-ups and Resident Status

Consultation records include date and available time, referral details, blood pressure, temperature, height, weight, recorded severity, remarks, and advised follow-up information. Follow-up tracking organizes advised return dates as Due today, Upcoming, or Past due. These categories help workers locate records requiring attention but do not provide appointment booking or automatic SMS reminders.

The Review Center contains separate Disease Review and Resident Status tabs. Resident Status supports review of reported deaths and confirmation of the resident's status. A case marked Deceased is maintained separately from confirmation that a resident has died. Neither classification by itself establishes the verified cause of death. This separation helps prevent individual disease-case outcomes from being treated automatically as a count of unique deceased residents.

### 4.1.5 Descriptive Analytics and Geographic Visualization

The municipal dashboard presents recorded case totals, case outcomes, recorded severity, disease rankings, trends, and year comparisons. Barangay and age-group breakdowns provide additional views of the selected records. Descriptive findings identify the leading recorded disease, highest recorded barangay count, largest known age group, and peak recorded month, including ties, counts, and shares where applicable.

Age groups are derived from age at the relevant case or consultation date: 0-5, 6-12, 13-17, 18-59, 60 and above, and Not recorded. Age zero is valid for infants. Current partial years are identified as year to date. Calendar-total and equivalent-date comparisons provide different views of historical records; unequal reporting completeness remains relevant when interpreting either view.

The geographic display uses barangay-level proportional rings and condition/severity details. These visualizations describe where cases were recorded. They do not identify individual patient addresses, establish statistically significant hotspots, or calculate outbreak probability. A top-ten chart may show fewer than ten conditions when fewer conditions match the selected records. The displayed counts represent available records rather than verified population disease rates.

### 4.1.6 Reports and Deployment

Authorized users can generate daily reports for today or an eligible past date, together with weekly and monthly outputs. Reports use the selected reporting period and original case dates; returning consultations do not independently increase disease-case totals. Regenerating a historical report can reflect corrected records or late entries. The existing FHSIS/PIDSR sample exports require appropriate review and are not certified official submissions or automatic transmissions to the DOH.

The application is deployed on an Azure Ubuntu virtual machine. Caddy receives HTTPS requests and forwards them to the Node.js/Express application. MySQL and the Python component operate within the same server environment. Deployment provides an internet-accessible browser application; it does not establish continuous uptime, unlimited concurrent capacity, or validated forecasting performance.

## 4.2 Model Performance Results

The intended forecasting objective is to use SARIMA to estimate the following month's disease cases from historical monthly counts. The clarified predictive scope covers ten leading diseases selected from an approved historical study dataset, subject to sufficient usable records. Conditions outside that selection remain eligible for recording and descriptive reporting. Catalog membership and prediction eligibility are separate requirements.

The current forecasting component differs from this intended scope. It contains a non-seasonal AR(1) demonstration that produces three monthly estimates and allocates municipal forecasts using historical barangay shares. Validation is identified as pending. The one-month SARIMA specification and enforcement of the selected ten-disease restriction are not established by the available verification evidence. Compatibility of the forecasting data queries with the normalized schema also requires verification. The demonstration cannot be reported as a completed or validated SARIMA result.

Table 4.2 Forecasting requirements and current evidence

| Aspect | Intended study requirement | Current evidence |
| --- | --- | --- |
| Forecasting model | Seasonal ARIMA fitted to suitable monthly case histories. | AR(1) demonstration component; SARIMA objective incomplete. |
| Forecast horizon | Following month. | Three monthly demonstration estimates. |
| Eligible diseases | Defined ten leading diseases from approved historical records. | Restriction requires implementation and verification. |
| Forecast data | Authorized historical records with documented coverage and quality. | Final study dataset and provenance not yet established. |
| Accuracy | Chronological evaluation with reported errors and a baseline. | Validated accuracy results pending. |

Final model assessment should reserve later observations for evaluation and use only earlier observations for fitting and model selection. The period used to identify the ten eligible diseases should be fixed before the evaluation period is examined. Missing reports should be distinguished from confirmed zero-case periods. Actual and synthetic records should be separated so that demonstration data do not become evidence of forecast accuracy for real disease occurrence.

Evaluation should compare the intended SARIMA model with a documented simple baseline, such as a seasonal-naive forecast where the history supports that comparison. MAE and RMSE should be reported in numbers of cases. If a percentage error is included, its treatment of zero or near-zero actual counts must be stated. A confusion matrix is not required for forecasting numeric case counts unless a separate categorical prediction task is explicitly defined.

Table 4.3 Forecast performance results awaiting evaluation

| Method | Evaluation series | Horizon | MAE | RMSE |
| --- | --- | --- | --- | --- |
| AR(1) demonstration | Not formally validated. | Three months. | Pending | Pending |
| Intended SARIMA | Each eligible disease and documented reporting level. | One month. | Pending | Pending |
| Comparison baseline | Same evaluation observations as SARIMA. | One month. | Pending | Pending |

The final performance results must identify the selected diseases, data source, aggregation level, training and test dates, number of observations, model settings, and actual-versus-predicted values. No numerical accuracy, superiority over a baseline, or successful outbreak prediction is concluded from the current demonstration.

## 4.3 System Evaluation

### 4.3.1 Functional and Integration Verification

Development verification covered database normalization, case and consultation workflows, catalog review, authorization, report generation, and mobile entry. The recorded checks support specific implementation findings. They are not equivalent to evaluation by health personnel or evidence that the system has been accepted for municipal operations.

Table 4.4 Available technical verification results

| Verification activity | Recorded outcome | Interpretation |
| --- | --- | --- |
| Local normalization regression run | 219 checks passed. | Tested the normalized application and preservation of expected workflows. |
| Mobile-entry follow-up checks | 34 frontend/measurement and 25 integration checks passed. | Covered form behavior, case/visit handling, catalog selection and review. |
| Azure normalization smoke checks | 40 checks passed. | Verified selected hosted workflows and access restrictions without creating clinical records. |
| Mobile-release public assets | 10 of 10 file hashes matched; health endpoint returned HTTP 200. | Confirmed the tested release files and a successful health response at verification time. |

These activities were conducted at different development stages and contain overlapping scenarios. Their counts should not be combined into a unique total of tested features, respondents, or users. A local check involving twenty simultaneous saves demonstrated twenty cases and twenty initial visits in an isolated environment; it does not establish the Azure deployment's concurrent-user capacity.

### 4.3.2 Mobile Interface Findings

The mobile review identified difficulty entering blood pressure because the numeric keyboard did not provide a convenient slash separator. Both forms were updated to use separate systolic and diastolic fields while preserving the existing combined stored value. A local MHO browser check rejected incomplete pressure values, focused the missing field, and successfully saved after correction. Resetting the form cleared both fields.

The disease picker was adjusted to fit the visible viewport, retain readable search text, and scroll within its own list. A 390 by 844 browser viewport was used for phone-sized checks; a reduced 390 by 440 viewport tested limited vertical space. Both role forms were examined locally. A hosted BHW walkthrough confirmed the revised controls and full-catalog search using an unsaved fictional draft, which was canceled. These checks do not replace testing on physical phones and the browsers used by participating health personnel.

### 4.3.3 Performance and Lighthouse Assessment

Current hosted Lighthouse results under documented, repeatable conditions have not yet been consolidated for this chapter. Historical local screenshots should be identified by their actual environment and date. Scores from another system cannot be treated as HEALTH-INTEL results.

Table 4.5 Current hosted Lighthouse evaluation record

| Category | Result | Required testing context |
| --- | --- | --- |
| Performance | Pending | Hosted page, date, device profile, throttling and repeated runs. |
| Accessibility | Pending | Automated findings supplemented by manual accessibility checks. |
| Best Practices | Pending | Results for the audited checks; not a security certification. |
| SEO | Pending | Interpret only where relevant to publicly accessible pages. |

Performance evaluation should also examine case saving, filtering, directory retrieval, report generation, and forecast requests under a stated workload. Response times, failures, and resource use are needed to assess hosted capacity. An HTTP 200 response or a Lighthouse score alone does not measure reliability over time or the number of simultaneous users the server can support.

### 4.3.4 System Quality Evaluation

The manuscript identifies functional suitability, performance efficiency, usability, reliability, security, maintainability, and portability as evaluation areas. Formal scores remain pending the approved instrument, completed responses, and supporting technical evidence. The selected evaluation framework and its edition should be identified consistently in the methodology and questionnaire.

Table 4.6 System quality evaluation status

| Characteristic | Evidence to assess | Formal result |
| --- | --- | --- |
| Functional suitability | Correct case entry, linked visits, reviews, analytics, maps and reports. | Pending |
| Performance efficiency | Response times, errors and resource use under defined workloads. | Pending |
| Usability | Task completion, form clarity, navigation and feedback from intended users. | Pending |
| Reliability | Consistent storage and retrieval, recovery and operation during stated test periods. | Pending |
| Security | Role restrictions, session invalidation, protected downloads and access-denial checks. | Pending |
| Maintainability | Change handling, module organization and regression verification by qualified evaluators. | Pending |
| Portability | Operation on the stated supported devices and browsers. | Pending |

Ratings should be analyzed using the approved five-point response scale and interpretation guide. Results should state the number of valid responses for each item and explain treatment of unanswered questions. Security, maintainability, and performance conclusions require relevant technical assessment in addition to users' perceptions. No overall verbal rating is assigned before the actual evaluation data are available.

### 4.3.5 User Acceptance Evaluation

User acceptance will be assessed through tasks corresponding to each participant's assigned responsibilities. Participants should use authorized test records, and the evaluation should document successful completion, difficulties, assistance required, comments, and changes made after feedback. The number of beta accounts is not evidence of the number of people who participated.

Table 4.7 User acceptance activities and evidence status

| Participant role | Representative tasks | Participation and findings |
| --- | --- | --- |
| BHW | Record a case and follow-up; inspect resident history; submit an unlisted condition; generate a barangay report. | Pending actual participation and responses. |
| MHO | Record a walk-in; use Patient Directory; review conditions and resident status; inspect municipal analytics and reports. | Pending actual participation and responses. |
| Admin | Approve or restore eligible account access; maintain catalog names and case records; inspect audit entries. | Pending actual participation and responses. |
| Superadmin | Manage administrator access; inspect system information and the master ledger; generate a protected backup. | Pending actual participation and responses. |

The evaluation should report the actual distribution across roles and participating barangays. It should distinguish observed task outcomes from questionnaire ratings. Interview or comment excerpts require consent and appropriate anonymization. Changes prompted by user feedback should be supported by issue records and subsequent verification.

## 4.4 Comparison with the Specific Objectives

The following comparison follows the six specific objectives stated in Chapter I. Implementation and evaluation are considered separately so that the presence of an interface is not treated as proof that its research objective has been fully achieved.

Table 4.8 Alignment of findings with the specific objectives

| Specific objective | Available finding | Remaining evidence |
| --- | --- | --- |
| 1 Centralized recording and monitoring | Linked resident, disease-case and consultation workflows are implemented and technically tested. | Approved historical dataset, provenance and pilot field use. |
| 2 Descriptive analytics | Counts, rankings, trends, findings and barangay/age breakdowns are implemented. | Reconciliation using the final study dataset and user evaluation. |
| 3 One-month SARIMA prediction | A three-month AR(1) demonstration component exists. | Complete SARIMA, ten-disease eligibility, normalized-data compatibility and chronological validation. |
| 4 Geographic visualization | Barangay-level proportional rings and condition/severity details are available. | Verify final study-record locations and evaluate map interpretation with users. |
| 5 Role-appropriate information access | Four roles, shared login, assigned access and reporting workflows are implemented. | Complete participant task evidence and the final access-test record. |
| 6 Functionality and usability evaluation | Technical verification and interface corrections are documented. | Completed formal instruments, actual respondents and analyzed acceptance results. |

## 4.5 Limitations of the Available Results

The available verification relies substantially on synthetic development fixtures and demonstration records. The proposed 50% historical and 50% synthetic dataset composition has not been established as a completed research dataset in the evidence presented here. Historical coverage, permission to use identifiable records, data completeness, and separation of actual and synthetic observations must be documented before substantive disease or forecast findings are reported.

The study is limited to the seven selected barangays. Differences in reporting completeness, unavailable ages, late entries, corrected records, and historical cases without verified resident links can affect the displayed summaries. Counts should not be generalized to all twenty-three barangays or interpreted as population-adjusted disease rates without appropriate supporting data.

Formal acceptance and validated predictive performance remain incomplete. The system does not provide clinical care, confirm disease diagnoses, establish causes of death, automatically submit official reports, or provide real-time outbreak warnings. The current findings support a tested implementation foundation for further evaluation; they do not establish improved health outcomes or complete operational readiness.

# CHAPTER V
# SUMMARY OF FINDINGS CONCLUSIONS AND RECOMMENDATIONS

This chapter summarizes the implementation and evaluation findings of HEALTH-INTEL according to the six specific objectives. The conclusions reflect the available technical evidence as of October 19, 2026. Recommendations address the outstanding forecasting, research-data, user-evaluation, and operational requirements.

## 5.1 Summary of Findings

**Centralized recording and monitoring.** The system provides a centralized structure connecting residents, disease cases, and consultation visits. Returning consultations remain linked to the original episode, preventing a follow-up or admission entry from independently increasing the original disease-case count. Normalization reduced separately maintained copies of identity and disease labels while preserving necessary historical source information. The final authorized historical study dataset remains to be documented.

**Descriptive analytics.** The application provides disease rankings, case outcomes, annual and monthly trends, multi-year comparisons, barangay and age-group breakdowns, and automatically generated descriptive findings. These features summarize selected recorded cases. Their outputs require interpretation in relation to reporting completeness, record corrections, and partial current years. They do not establish disease prevalence or outbreak probability.

**Predictive analytics.** The implemented forecasting component contains a three-month AR(1) demonstration with validation pending. The intended one-month SARIMA model, selected ten-disease coverage, and final forecast-error measurements remain incomplete. The present evidence therefore does not establish achievement of the SARIMA objective or validated prediction accuracy for actual disease occurrence.

**Geographic visualization.** The map presents barangay-level disease distributions through proportional rings and condition/severity details. Its function is to help users inspect recorded geographic patterns. It does not provide statistical hotspot significance, individual patient-location mapping, or verified outbreak detection.

**Role-based information access.** BHW, MHO, Admin, and Superadmin users share a login page and receive functions according to their permissions. The application includes catalog review, resident-status review, report generation, account administration, audit records, and protected backup generation. Catalog conditions outside the initial ten choices can still be saved; a condition absent from the catalog can be recorded for MHO review.

**Functionality and usability evaluation.** Development records document successful local and hosted technical checks, including normalization workflows, case and visit handling, reviews, selected access restrictions, report generation, and mobile-entry corrections. Formal system-quality ratings, completed respondent participation, and consolidated user-acceptance findings remain pending. Technical test counts are not respondent totals or evidence of universal acceptance.

## 5.2 Conclusions

HEALTH-INTEL provides an implemented foundation for organizing community disease information and presenting role-appropriate summaries for the Municipality of Murcia. Its separation of residents, disease episodes, and consultation encounters supports consistent record histories and more appropriate case counting. Searchable catalog choices and MHO review provide a controlled way to handle reported conditions without creating duplicate disease cases during classification.

The descriptive dashboards, geographic displays, and reporting functions address important parts of the recording, monitoring, and visualization objectives at the implementation level. The available technical verification supports the behaviors tested under the documented conditions. However, the proposed study dataset and completed evaluation by intended users are still needed to determine suitability for routine work in the participating barangays and municipal office.

The predictive objective has not yet been fully achieved. A demonstration forecast does not establish implementation of a validated one-month SARIMA model or reliable estimation for the selected ten diseases. Completion of the forecasting work and formal evaluation is necessary before the study can conclude that all six objectives have been met or recommend the system as fully ready for municipal operational use.

## 5.3 Recommendations

**Complete and validate the forecasting component.** Implement the approved SARIMA specification, following-month horizon, and explicit eligibility rules for the selected ten diseases. Verify forecasting queries against the normalized database and ensure that only authorized, appropriate records enter the model. Display clear reasons when a disease is outside predictive coverage or lacks sufficient usable history. Preserve case recording and descriptive monitoring for other catalog diseases.

**Establish the final study dataset.** Obtain and document the necessary permissions, sources, reporting periods, usable record counts, and data-quality limitations. Confirm the actual historical/synthetic composition instead of assuming that the planned 50/50 split has been achieved. Keep synthetic demonstrations separate from the evidence used to evaluate real disease forecasting. Define how late entries, missing reports, unknown values, and confirmed zero-case periods will be handled.

**Evaluate prediction using chronological evidence.** Fix the eligible disease list using the model-development period, reserve later observations for evaluation, and compare SARIMA with an appropriate baseline on the same observations. Report MAE and RMSE, the evaluation dates, number of observations, and model settings for each relevant series. Explain any additional error measure and its behavior when actual counts are zero. Present uncertainty and unsuitable series openly rather than forcing forecasts for every selection.

**Conduct formal acceptance and quality evaluation.** Recruit qualified participants from the selected barangays and municipal office, document their actual roles and participation, and administer the approved instrument. Include new-case entry, linked follow-ups, unlisted-condition review, resident-status review, reports, access restrictions, and administrative tasks. Record both task outcomes and participant feedback, correct identified issues, and verify the revised workflows before calculating final acceptance conclusions.

**Extend device and workload testing.** Repeat mobile checks on the physical phones and browsers used by participants, including numeric entry, small-screen navigation, long dropdown lists, and unstable connectivity. Conduct hosted performance tests under a defined workload and record response times, failures, and server resource use. Repeat Lighthouse assessments under stated conditions and address accessibility findings through manual checks as well as automated tools.

**Strengthen operational safeguards and reporting review.** Continue testing account suspension and restored access, invalidation of old sessions, confirmed logout, protected downloads, and audit traceability. Verify that encrypted backups can be recovered through an approved restore rehearsal. Establish responsibilities for reviewing catalog names, confirmed resident status, corrected records, and report outputs. Sample FHSIS/PIDSR exports should undergo the appropriate content and institutional review before any official reporting use.

**Align the final manuscript and consider controlled expansion.** Update the objectives, delimitations, diagrams, data dictionary, use cases, screenshots, and test records to match the verified final implementation. Report unresolved limitations rather than treating them as completed findings. Expansion beyond the seven selected barangays or additional predictive methods should follow evaluation of data readiness, permissions, workload, and intended-user needs.
