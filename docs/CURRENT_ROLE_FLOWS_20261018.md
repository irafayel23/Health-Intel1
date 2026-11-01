# HEALTH-INTEL current role flows

Reviewed against the current local portal screens, access-control rules and route handlers on October 18, 2026. This documents implemented behavior; it is not a new deployment or a new end-to-end test.

## Access and account approval

```mermaid
flowchart TD
    R[Registration] --> ROLE{Requested role}
    ROLE -->|BHW or MHO| A[Admin reviews pending request]
    ROLE -->|Admin| S[Superadmin reviews pending Admin]
    A --> OK[Approved account]
    S --> OK
    OK --> L[Sign in]
    L --> P[Open role-specific portal]
    P --> OUT[Log out: current session revoked]
```

- Pending, denied and suspended accounts cannot access protected workflows.
- Admin can approve or deny pending BHW/MHO requests, undo a denial, suspend approved BHW/MHO accounts and restore suspended access.
- Superadmin's Admin Access screen approves pending Admins, suspends active Admins with a reason, restores suspended Admins and shows account history.
- An old approval request cannot restore a suspended account. Restore Access is a separate action. Access changes invalidate existing sessions; restoration requires a fresh sign-in.

## BHW — barangay recording and follow-up

Menu: **Dashboard → Patient Records → Resident Profiles → Heatmap Cases → Brgy Reports**. These are navigation choices, not mandatory sequential steps.

```mermaid
flowchart TD
    B[Sign in as BHW] --> D[Dashboard for assigned barangay]
    D --> P[Patient Records: add case or visit]
    P --> F[Patient details: family name, first name, suffix, birthdate and location]
    F --> C[Consultation: transaction mode, visit nature, date and time]
    C --> N{Nature of visit}
    N -->|New consultation/case| NEW[Record a new disease case]
    N -->|New admission or follow-up| LINK[Select the matching original disease case]
    NEW --> M[Measurements, disease or condition, severity and notes]
    LINK --> M
    M --> PLAN[Record next follow-up date and instructions when advised]
    PLAN --> SAVE[Validate and save]
    SAVE --> H[Resident profile: cases and consultation history]
    H --> RETURN[Follow-up tracking: due today, upcoming or past due]
    RETURN --> LINK
    SAVE --> V[Updated dashboard, map summaries and reports]
```

- Walk-in, Visited and Referral describe how the encounter occurred. Referral details are captured where relevant.
- Admissions and follow-ups add consultations to the selected case; they do not create another disease case.
- Case selection uses patient identity and eligible case dates. The worker selects the correct episode using disease, case ID, status, original date and last consultation.
- Disease selection is searchable, with a top-10 suggestion list. An unlisted condition preserves its wording and enters MHO disease review rather than receiving a guessed classification.
- BHW can view case details and visits, update case status, correct records, and archive or restore cases within their barangay.
- Resident Profiles includes medical history and follow-up tracking. The latest consultation's return plan replaces the earlier plan. Past due means no later consultation is recorded, not proof that an appointment was missed.
- BHW reports a resident as deceased for MHO review. Reporting is distinct from confirming resident death; history remains available.
- Reports include Today. The fullscreen map shows proportions of recorded case severity, not a validated outbreak-risk rating.

## MHO — municipal oversight and consultation recording

Menu: **Mun. Analytics → Walk-in Patients → Patient Directory → Predictions → Review Center → Heatmap Cases → Export Reports**.

```mermaid
flowchart TD
    M[Sign in as MHO] --> A[Municipal analytics]
    A --> W[Walk-in Patients: record a case or visit with resident barangay]
    A --> P[Patient Directory: search across barangays]
    P --> H[Patient details, disease cases and consultation history]
    H --> F[Record follow-up or admission with patient and case preselected]
    W --> SAVE[Validate and save consultation]
    F --> SAVE
    SAVE --> HIST[Update history and follow-up tracking]
    A --> R[Review Center]
    R --> DR[Disease Review: classify condition or request clarification]
    R --> RS[Resident Status: review death reports and correct confirmed status]
    A --> MAP[Municipal heatmap and fullscreen summaries]
    A --> REP[Export reports, including Today]
```

- MHO chooses the patient's resident barangay when recording a municipal encounter.
- Patient Directory supports patient lookup, full recorded history and follow-up tracking across barangays.
- Disease Review can link a reported condition to an existing disease, register an appropriate new condition, or request clarification from BHW. This is not an approval gate for every ordinary consultation.
- Resident Status handles death-report review and status correction without deleting the resident's history.
- Exports include Today, FHSIS/PIDSR sample reports and confirmed deceased residents. Sample exports are not official submission certification.
- Predictions is an existing demonstration feature with validation pending. Do not present it as a clinically validated forecast or an automatic diagnosis/outbreak decision.

## Admin — personnel and record maintenance

Menu: **User Management → Patient Records → Disease Registry → Operational Audit Trail**.

```mermaid
flowchart TD
    A[Sign in as Admin] --> U[Review BHW and MHO accounts]
    U --> ACCESS[Approve or deny pending requests; suspend or restore access]
    A --> P[Search and inspect patient cases across barangays]
    P --> FIX[Correct, archive or restore cases]
    A --> D[Maintain Disease Registry]
    D --> CAT[Add, archive or restore disease entries]
    A --> AUD[Review Operational Audit Trail]
```

Admin maintains access and data quality. The Admin portal is not the consultation-entry workflow and does not approve Admin accounts. Archiving retains records rather than deleting their histories.

## Superadmin — Admin access, system monitoring and recovery

Menu: **Overview → Admin Access → Master Ledger → DB Backup**.

```mermaid
flowchart TD
    S[Sign in as Superadmin] --> H[Overview: uptime, database size and record counts]
    S --> A[Admin Access: search Admins and view account history]
    A --> ACCESS[Approve pending Admins; suspend with reason; restore access]
    S --> L[Master Ledger: review system activity metadata]
    S --> B[DB Backup: enter and confirm encryption password]
    B --> ZIP[Generate and download encrypted database ZIP]
```

Superadmin's current portal does not offer routine patient consultation entry, a database-restore button or a factory-reset button. Azure VM resizing and the scheduled encrypted backup to the PC are separate operational tasks outside these portal flows.

## How the roles connect

| Connection | Current flow |
| --- | --- |
| Account access | Superadmin manages Admin access; Admin manages BHW/MHO access. |
| Recording | BHW records barangay encounters; MHO records municipal encounters linked to the resident barangay. |
| Clinical history | One resident can have multiple disease cases; each case can have multiple consultations. A follow-up adds a visit to its original case. |
| Disease clarification | BHW reports an unlisted condition → MHO classifies it or requests clarification → BHW supplies clarification if needed. |
| Deceased status | BHW reports resident death → MHO reviews and confirms or rejects the report → history remains retained. |
| Maintenance | Admin maintains registry and case records; Superadmin monitors technical activity and creates encrypted backups. |

Identity differences, including different birthdays, are not permission to merge residents automatically. Existing uncertain duplicate identities must be confirmed before combining histories.

Source references: `bhw.html`, `mho.html`, `admin.html`, `superadmin.html`, `server/middleware/access-control.js`, `server/routes/`, `server/services/account-status.js`, `assets/js/shared/followup-tracking.js` and portal scripts.
