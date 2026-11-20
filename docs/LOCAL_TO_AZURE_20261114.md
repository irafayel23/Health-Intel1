> 17 November 2026: the pending application runtime changes below were reconciled and deployed in AZURE_LOCAL_SYNC_20261117.md. Older per-task hashes below are historical. Use the current181-file deployed manifest for comparison; preserve both Azure-only account guards. Local clinical/data maintenance was not imported.

# Local changes awaiting Azure deployment

## REGISTRATION-REVIEW-20261114 — local implementation, not deployed

Requested changes implemented:
- Keep HR employee ID (required, maximum50 characters); first/last names limited100.
- ID/selfie JPG/PNG upload and camera capture, previews, review consent. Manual review only.
- Create/confirm password, separate Show/Hide controls, server validation8characters/72UTF8bytes.
- Rejected-only resubmission after Google verification; same account ID, pending review, audit event. Pending/approved/suspended cannot register again. Verified Firebase Google subject prevents using a changed email to duplicate an existing protected account. No Google sign-in access is granted before approval.
- Encrypted private review evidence, size/dimension checks, Sharp re-encoding/metadata stripping; no public photo URLs. Admin can review BHW/MHO; only Superadmin can review Admin.
- Reviewer acknowledgement enforced server-side for new photo-backed requests. Older pending accounts retain legacy workflow.
- Rejection emails use existing SMTP; sent/failed/not_configured reported honestly.

### Exact runtime files to review/copy
- `.gitignore` SHA256 `6db2add11d56bee7356d043bd3107fea2ed6d0f56ff1bdab95e9bb09be7e497e`
- `index.html` SHA256 `1fc9f62938d4729cf40c33f6a42fbe3638f0eb049f3030e39e3a4fcca5e0a375`
- `admin.html` SHA256 `fd2ceac24f20977b4a457d2da5fe3c9f57dbf49e65d8bf4584a133739b668773`
- `superadmin.html` SHA256 `4ab8b54dfc95b300f02771f18e330d65c156362cff261da736d36be4317150ae`
- `assets/css/index/access.css` SHA256 `01bb26e9d71bcffec577356e3a13529a1087c5dfc0aad4837ea37f29714d9ab0`
- `assets/css/shared/portal-responsive.css` SHA256 `a37066f091a0be0e3eab584ac7aa24f8dd94ebad9c0199d908fbeb534b741f1e`
- `assets/js/index/index-registration.js` SHA256 `5ae75ec604f6778d82d1434ffaacc3f9475ffd57bf44b9d3345c2c898f996315`
- `assets/js/shared/registration-review.js` SHA256 `b6d7ba4c25c2e3bf6c4f72fa4c9d4ae68ecce37cd26608475c405dd7277c29ae`
- `assets/js/admin/admin-users.js` SHA256 `59162ff278f006d509f01e17b89fad8d9e051c0d264af26505609fed0bd5efc3`
- `assets/js/superadmin/superadmin-users.js` SHA256 `e3c662ff4d7089209bc87fd53e128fe1034707490a28a34b6849b9fcd743f8ce`
- `server/server.js` SHA256 `05b8b3ebe9928532cffc17ad8b4e53afd36377c7f04835d4432731e762677552`
- `server/services/registration.js` SHA256 `156acd506a9b745d3149bf67d6da24c7ed1a87606061f5f94b70db33fe995d91`
- `server/services/registration-evidence.js` SHA256 `b5b8bb97809920141ef1cc60241223a895d0b897c068ca687562319b48cf4c95`
- `server/services/account-status.js` SHA256 `0b925caaff72c58c981d32bc8a29aff3bfd3f8e9865bd8eb6a647d20eb7ee3eb`
- `server/routes/identity-routes.js` SHA256 `80acd8a0e9632127b1cbdf5266111aa58574e822bbc745ef7038c9e7786c83f6`
- `server/middleware/access-control.js` SHA256 `18a6080a7437b5a70a8d4d1811224f1c1f12985be3ec16aae4b5d3856ebc9b1b`
- `server/package.json` SHA256 `7ef7d272000f2ecc74f85b9338af861065eef051aa094013fa8234d0a65f1e41`
- `server/package-lock.json` SHA256 `27acbd6a9edcaae95aa00e620527574b11bbf090a513c34fd62b09b55a322c8d`

### QA files changed
- server/tests/registration-review.test.js (8 isolated tests)
- server/tests/registration-photo-fixture.js
- server/tests/portal-structure.test.js (new shared helper/password fixture support)
- server/tests/workflow-fixes.test.js and qa-fixes.test.js (new required fields plus isolated evidence storage; DB suites not run this turn)

### Evidence and limits
- 13/13 focused registration and municipal dataset tests passed.
- Portal structural suite29 tests:28pass; one pre-existing MHO old live chart endpoint assertion still fails (dataset routes replaced it before this task). Combined earlier registration/portal run35/36; registration now has one extra rollback test.
- Changed JS modules syntax checked and Sharp loads on Windows.
- No actual ID photos, accounts or patient rows used for QA. No real rejection mail sent. Full Google popup/resubmit, real camera, signed-in reviewer and real SMTP delivery remain manual end-to-end checks.
- npm install sharp reported8 advisories (7moderate,1high) in whole existing dependency tree; no unrelated audit fix applied.

### Before Azure approval/release
1. Review source diff against current live hashes and retain rollback copies. No deployment authorized by this local task.
2. Install platform-compatible dependencies from server/package-lock.json on Linux; verify Sharp decoding there. Do not copy Windows node_modules.
3. Configure REGISTRATION_REVIEW_DIRECTORY outside public assets, writable only by service; default server/private/registration-review. New private directory may need scoped permission approval.
4. Storage.key is generated on first use and encrypts identity evidence. Back up private evidence AND its key using a separately protected encrypted procedure; current SQL-only backup does not contain either. Never put files/key into Git or chat. Agree photo retention/access policy before live rollout.
5. Verify read-only existing authentication and account role scopes. No schema migration is required. Existing pending registrations without photo evidence retain their original approval path.
6. Restart app after deploying coherent frontend/backend/dependency changes; test new submission, rejection, email failure/success, same-Google retry, approval, blocked duplicate and suspended state with explicitly authorized disposable accounts.
7. Verify no photo retrieval by unauthenticated users/BHW/MHO or Admin reviewing Admin. Verify evidence unavailable prevents new photo-backed approval.
8. Copy no local account, clinical or model/dataset files to Azure.

### Notes for operator
The same verified Google account can retry after rejection. Google/Firebase authentication itself may retain its provider identity; Health-Intel does not delete that identity. Pending requests reserve one application to avoid duplicates; approval grants account access, not a second registration. A selfie and ID alone do not provide liveness detection or prove authenticity.


## REGISTRATION-UI-20261114 — local only

2026-11-14T21:56:13+08:00 | CODEX-1 | REGISTRATION-UI-20261114 completed locally. Registration-only centered wider card; persistent labels, exact HR ID -> employee ID photo -> manual selfie -> create/confirm password order; paired upload cards and passwords stack below740 CSSpx. Eye SVG controls retain independent show/hide, accessible names, pressed state and keyboard3px focus; no new dependencies or backend changes.10/10 focused registration/layout tests pass and JS syntax check passes. Brave isolated visual fixture uses actual HTML/CSS/shell/registration scripts, dummy email and stubbed requests; submissions disabled. Desktop1920, narrow585 and390 CSSpx inspected; no horizontal overflow, BHW barangay field remains, mobile submit visible by normal page scrolling; Cancel restores normal login layout. Actual localhost3000 login reloaded. Camera, Google flow, actual upload/reviewer/SMTP end-to-end remain unchecked. Azure unchanged. Runtime three files plus server/tests/registration-layout.test.js; docs/checklist updated, earlier work preserved. Git main/e5946d4; no Git mutations. Writer released.

References: [GOV.UK file upload](https://design-system.service.gov.uk/components/file-upload/) and [password input](https://design-system.service.gov.uk/components/password-input/). Adapted existing blue/teal Health-Intel styling; no framework added.

Latest frontend SHA256 (supersedes older registration manifest values):
- `index.html`: `1fc9f62938d4729cf40c33f6a42fbe3638f0eb049f3030e39e3a4fcca5e0a375`
- `assets/css/index/access.css`: `01bb26e9d71bcffec577356e3a13529a1087c5dfc0aad4837ea37f29714d9ab0`
- `assets/js/index/index-registration.js`: `5ae75ec604f6778d82d1434ffaacc3f9475ffd57bf44b9d3345c2c898f996315`

Deploy only with the complete earlier registration review release and its private evidence/dependency prerequisites. These UI edits alone do not provide review/storage APIs. No Azure changes were made.


## REGISTRATION-PAYLOAD-20261114 — local correction, not deployed

2026-11-14T22:01:32+08:00 | CODEX-1 | REGISTRATION-PAYLOAD-20261114 Completed locally. Fixed confirmed frontend defect: confirm_password/review_consent were mistakenly sent to check-email and omitted from register, causing matching visible passwords to fail server validation. Moved both to registration payload; email check no longer transmits them. Cache version updated in index.html. Actual submit-handler VM regression confirms correct matching payload, mismatches blocked before network, token/photos preserved; no real submissions.11/11 focused layout/review tests pass; JS syntax passes. Backend acceptance checks unchanged. Runtime index.html and assets/js/index/index-registration.js; server/tests/registration-layout.test.js plus coordination/checklist docs. No records, credentials, database, datasets, models, dependencies, Git or Azure changed. Real Google/camera/SMTP end-to-end still pending. Writer released.


## REGISTRATION-STATUS-20261114 — local, not deployed

2026-11-14T22:08:32+08:00 | CODEX-1 | REGISTRATION-STATUS-20261114 completed locally. Verified Google check-email now returns limited registration_status with existing exists flag. Frontend distinguishes Application awaiting approval from Account already approved and suspended access. Pending remains blocked from duplicate submissions/sign-in; denied reapplication unchanged. No account IDs/photos disclosed by status endpoint; Google proof remains required.12/12 focused registration/review/layout tests passed, both JS syntax checks pass. Runtime index.html, assets/js/index/index-registration.js, server/services/registration.js; test server/tests/registration-review.test.js. Local server restarted to load backend. No real account submission/approval/denial, email, DB writes, data/models or Azure changes. Real Google-popup visual check still unverified. Writer released.


## REGISTRATION-REAPPLY-20261114 — supersedes earlier pending/denied policy, local only

2026-11-14T22:20:18+08:00 | CODEX-1 | REGISTRATION-REAPPLY-20261114 completed locally. Owner overrides earlier pending lockout: pending/denied Google-verified applicants can resubmit same role into same row/System ID; latest identity/password/photos replace prior application, stay pending, resubmission audited. Approved/suspended and identity/role conflicts still blocked. Review submission ID passed privately to Admin/Superadmin decisions; backend refuses stale approval/denial after replacement. Denial dialog10 reasons, optional300char note, mandatory note for Other,500char server reason boundary; reason audited and escaped into existing notification email. Explicit sent/failed/not_configured UI feedback. No new schema or dependency.25/25 isolated account/review/layout/personnel tests pass; JS syntax checks pass. Browser isolated dialog preview verified options, labels, missing-reason/Other-note validation and no horizontal overflow; no real account action/email. DB-copy qa-fixes fixture reason updated but suite not run. Runtime10files listed in LOCAL_TO_AZURE_20261114.md; tests registration-review/layout, account-status, admin-personnel-ui and qa-fixes. Local server restarted session50403; health check pending below. Actual SMTP delivery, Google reapplication end-to-end and full signed-in reviewer flow remain manual checks. Azure unchanged; no real registration rows/credentials/patient data/models/datasets/Git mutations. Writer released.

Ship these coordinated files with the full earlier registration review release; an older reviewer tab must reopen the latest application before deciding. New frontend submission tokens and backend validation must travel together. No deployment this task.
- `index.html` SHA256 `1fc9f62938d4729cf40c33f6a42fbe3638f0eb049f3030e39e3a4fcca5e0a375`
- `admin.html` SHA256 `fd2ceac24f20977b4a457d2da5fe3c9f57dbf49e65d8bf4584a133739b668773`
- `superadmin.html` SHA256 `4ab8b54dfc95b300f02771f18e330d65c156362cff261da736d36be4317150ae`
- `assets/js/admin/admin-users.js` SHA256 `59162ff278f006d509f01e17b89fad8d9e051c0d264af26505609fed0bd5efc3`
- `assets/js/superadmin/superadmin-users.js` SHA256 `e3c662ff4d7089209bc87fd53e128fe1034707490a28a34b6849b9fcd743f8ce`
- `assets/js/shared/registration-review.js` SHA256 `b6d7ba4c25c2e3bf6c4f72fa4c9d4ae68ecce37cd26608475c405dd7277c29ae`
- `assets/css/shared/portal-responsive.css` SHA256 `a37066f091a0be0e3eab584ac7aa24f8dd94ebad9c0199d908fbeb534b741f1e`
- `server/services/registration.js` SHA256 `156acd506a9b745d3149bf67d6da24c7ed1a87606061f5f94b70db33fe995d91`
- `server/services/account-status.js` SHA256 `0b925caaff72c58c981d32bc8a29aff3bfd3f8e9865bd8eb6a647d20eb7ee3eb`
- `server/routes/identity-routes.js` SHA256 `80acd8a0e9632127b1cbdf5266111aa58574e822bbc745ef7038c9e7786c83f6`


## REGISTRATION-COUNT-20261114 — local only

2026-11-14T22:31:33+08:00 | CODEX-1 | REGISTRATION-COUNT-20261114 completed locally. Successful applications increment persisted encrypted evidence submission_count1,2,3,4; failed validation does not increment; pending/denied same-ID policy preserved. Pending list badges for Admin/Superadmin; reviewer latest timestamp, previous rejection reason and collapsible submission/review timeline. Batched registration-history helper reads explicit successful Account audit references, reconstructs photo-backed requests predating counters from audited resubmissions, leaves legacy no-evidence accounts unnumbered. Initial account creation date displayed as metadata, not fabricated audit. Number included in denial audit and escaped email message; legacy unknown count omitted.28/28 isolated account/personnel/review/layout tests pass, including1through4/failed attempts, reconstruction, escaping and Submission3 email assertion; syntax and whitespace checks pass.11runtime files listed in LOCAL_TO_AZURE_20261114.md; tests registration-review/layout updated. Local server restarted. No actual accounts, patient records, datasets/models, schemas, Azure or Git changed; no actual email sent. Authenticated live review/Gmail delivery visual checks pending. Writer released.

Coordinated runtime files; copy only alongside the complete earlier registration release after deployment authorization:
- `admin.html` SHA256 `fd2ceac24f20977b4a457d2da5fe3c9f57dbf49e65d8bf4584a133739b668773`
- `superadmin.html` SHA256 `4ab8b54dfc95b300f02771f18e330d65c156362cff261da736d36be4317150ae`
- `assets/js/admin/admin-users.js` SHA256 `59162ff278f006d509f01e17b89fad8d9e051c0d264af26505609fed0bd5efc3`
- `assets/js/superadmin/superadmin-users.js` SHA256 `e3c662ff4d7089209bc87fd53e128fe1034707490a28a34b6849b9fcd743f8ce`
- `assets/js/shared/registration-review.js` SHA256 `b6d7ba4c25c2e3bf6c4f72fa4c9d4ae68ecce37cd26608475c405dd7277c29ae`
- `assets/css/shared/portal-responsive.css` SHA256 `a37066f091a0be0e3eab584ac7aa24f8dd94ebad9c0199d908fbeb534b741f1e`
- `server/services/registration.js` SHA256 `156acd506a9b745d3149bf67d6da24c7ed1a87606061f5f94b70db33fe995d91`
- `server/services/registration-history.js` SHA256 `66b15a08061463ed6d9ecc3f15c6204534d53688bbaa01c79fa3ba06acabd4de`
- `server/services/account-directory.js` SHA256 `3520303cb5e8bd4c757d1f9ba49dc8f359737567e01aa441325aa21c44d4d2f3`
- `server/services/account-status.js` SHA256 `0b925caaff72c58c981d32bc8a29aff3bfd3f8e9865bd8eb6a647d20eb7ee3eb`
- `server/routes/identity-routes.js` SHA256 `80acd8a0e9632127b1cbdf5266111aa58574e822bbc745ef7038c9e7786c83f6`


## REGISTRATION-EMAIL-20261114 — local only

2026-11-14T22:39:22+08:00 | CODEX-1 | REGISTRATION-EMAIL-20261114 completed locally. Shared approval/rejection HTML table template, supplied beneficiary logo embedded via CID Buffer attachment (works with existing Nodemailer disableFileAccess/disableUrlAccess), plain-text alternative, no remote tracking/fonts or external images. Blue letterhead/green approved/amber correction; text always conveys status. Summary System ID/role/submission when known, escaped correction reason and next steps. No passwords, HR identifiers or identity photos in mail. Admin BHW/MHO approval, Superadmin Admin approval and denial routes use same builder; delivery not_configured/failed/sent preserved. New Superadmin approval notification added; no actual sends.30/30 focused account/review/layout/personnel/email tests pass; template privacy/escaping/logo/plain text plus both approval delivery paths verified with stubs. Desktop and390CSSpx browser previews: logo loads, both templates no horizontal overflow, rejection readable. Browser render is not Gmail/Outlook inbox validation. Local server restarted. Files4runtime listed in LOCAL_TO_AZURE_20261114.md plus server/tests/registration-email.test.js; dummy standalone approved.html and denied.html under writable artifacts registration-email-preview. References NSW Email Toolkit transactional/service, Stack Overflow transactional templates, Mailchimp image alt text. No actual account decisions, email sends, patient/data/model/schema/dependency/Azure/Git changes. Actual SMTP delivery, Gmail/Outlook CID/blocked-images/dark-mode rendering still manual checks. Writer released.

Copy the image and builder together with the route/service updates after Azure deployment authorization. Logo is a local server-read asset attached as Buffer, not a public upload/URL. No configuration changes needed; existing SMTP settings apply.
- `assets/img/murcia-main-primary-care.png` SHA256 `5dff886b6920c7e59a8584283bb2d6d03e595c411617dc3161569e0b42647f45`
- `server/services/registration-email.js` SHA256 `af9411ac6e0c31f188a9a001bb8b00b24f666f105b07bccd9ee0708d3f846936`
- `server/services/account-status.js` SHA256 `0b925caaff72c58c981d32bc8a29aff3bfd3f8e9865bd8eb6a647d20eb7ee3eb`
- `server/routes/identity-routes.js` SHA256 `80acd8a0e9632127b1cbdf5266111aa58574e822bbc745ef7038c9e7786c83f6`


## COMPACT-DENIAL-EMAIL-20261115 � local only, supersedes CID-logo layout

2026-11-15T07:11:56+08:00 | CODEX-1 | COMPACT-DENIAL-EMAIL-20261115 Completed locally. Rejection form fills viewport, fixed title/actions with content scrolling only when necessary at small sizes/high zoom. No large warning icon. Shared async preConfirm performs one deny-user request, preserves latest-review token and validated reason; server/network errors stay inside same form. Admin and Superadmin refresh lists and show inline saved/email-delivery status without second popup. Success versus mail failed/not_configured remains explicit. Approval/rejection emails now compact640px table with text beneficiary letterhead, no images/CID/attachments; existing supplied logo asset preserved unused. Submission ID/role/number, escaped reason, same-Google retry instructions and plain text alternative remain. Does not change already delivered mail.40/40 focused isolated registration/review/account/personnel/email/Superadmin tests passed; four JS syntax checks passed. Dummy browser previews desktop1920x750 and390x750: no horizontal overflow or page scrolling, approval/rejection text readable; fixture decline returns inline status with no extra popup. Inputs retained on error verified by VM tests. No real account decisions or mail sent. Local server restarted session88779. No Azure/data/model/schema/dependency changes. Git diff whitespace check passed using explicit work-tree; default Git commands blocked by environment work-tree/permission issue. Full DB suites and new actual Gmail/Outlook rendering not tested. Runtime7files below; tests registration-layout, registration-email, admin-personnel-ui updated; superadmin-usability regression ran unchanged. Writer released.

Copy these current runtime files together after deployment authorization. Existing registration service/route requirements from earlier manifest sections still apply. No new dependency/config/schema. Logo no longer required for these emails; preserve asset. Restart Node after copying email builder.
- `admin.html` SHA256 `ecff57969302c1c272e8129770fe279243c165c83f114117ff47b6d7bfd012bc`
- `superadmin.html` SHA256 `b2fb26cfe61a5e118881edb3e7fa6b122b47e182fced5ca9b5cfe27e6e520130`
- `assets/css/shared/portal-responsive.css` SHA256 `cfcc42ee979289fc468b217ca80032d5e9d8bbaa4a38265350a5f401171e06cb`
- `assets/js/shared/registration-review.js` SHA256 `156410c4b6f6af936307a385b7329de84dc12551e5f9d72752ef94698ec06985`
- `assets/js/admin/admin-users.js` SHA256 `a20b97cf5a45b3b0c657eb55221108102ff3fc7868f9448706192e60ee6c4aa2`
- `assets/js/superadmin/superadmin-users.js` SHA256 `7c893531b25ab303b623a562969355cc0a19a7c066fc76ab77c173df8c13a4b8`
- `server/services/registration-email.js` SHA256 `ec68adbda1b4f810b252301cec08d954ed1bd7639af82e4b7600039d602226b8`


## CENTER-DENIAL-20261115 � local only; supersedes full-screen/inline banner

2026-11-15T07:21:39+08:00 | CODEX-1 | CENTER-DENIAL-20261115 Completed locally. Corrected owner intent: centered720px rounded rejection popup, automatic content height, compact spacing/96px note, viewport max-height. Desktop1920x750 popup720x416 and mobile390x750 fit without page/content scroll in dummy browser fixture; extreme zoom/tiny-height overflow remains accessible. Owner subsequent steering supersedes prior inline-banner request: remove persistent banner markup/styles from both reviewer portals; shared dismissible480px Registration declined result popup after successful save, success if email sent and warning otherwise. No second confirmation; server/network errors remain inside reason form. Updated portal cache refs.20/20 focused registration-layout/Admin-personnel/Superadmin-usability tests passed; shared JS syntax passed. Browser fixture confirms result popup and OK dismissal leaves no banner. No real account action/email, DB/model/data/schema/backend/Azure change. No restart needed for static files. Full suite and authenticated real-mail check not repeated. Writer released.

- `admin.html` SHA256 `a8cbd1ce68a16b576a0ae9729ea845b3e3bfe498de8873492926355a73f1bd32`
- `superadmin.html` SHA256 `41bc69d50ed3046cb2be3e3059912e525da092eceab10cc67f990beb179c8291`
- `assets/css/shared/portal-responsive.css` SHA256 `e7c783c473a5bc1f8b985587cbeb3fb1a27b58f4b814a8ad186a250f2c45039f`
- `assets/js/shared/registration-review.js` SHA256 `a2718eed1841dac1b03d3eb36194f6e5868393c2a3ec835d84f99a0ebad63fee`

Regression fixture updated: server/tests/registration-layout.test.js. Existing Admin/Superadmin callers unchanged; use latest manifest versions together.


## ACCOUNT-DIALOG-SIZE-20261115 � local only

2026-11-15T07:26:54+08:00 | CODEX-1 | ACCOUNT-DIALOG-SIZE-20261115 Completed locally. Admin personnel/account details popup widened620to760px, still bounded to viewport minus32px. Scoped thin native scrollbar with6px WebKit fallback, rounded thumb, dark colors; no global scrollbar or other popup changes. Runtime admin.html cache version and assets/css/admin/admin-page.css only.5/5 existing Admin personnel UI tests passed. Isolated browser actualCSS:760px dialog and computed scrollbar-width thin with content812/client688 at1920x750;390px mobile no page horizontal overflow. No actual account data accessed/changed or email sent. Azure unchanged; no full suite rerun for CSS-only change. Writer released.

- `admin.html` SHA256 `ab1e5eeec8423782b22957cda1fb66241d1791ad8e5b14bd2e2b03e7cec09eff`
- `assets/css/admin/admin-page.css` SHA256 `67960703aa8bde3d49920e1df25bf775a500cb96148a3777b553334f0ac1bf08`


## ACCOUNT-DIALOG-CLOSE-20261115 � local only

2026-11-15T07:30:28+08:00 | CODEX-1 | ACCOUNT-DIALOG-CLOSE-20261115 Completed locally. Existing Admin account close X pinned8px top/right with accessible Close account details label. Popup uses flex with details-only scrolling, thin scrollbar retained; heading/close/actions stay visible. Width760px and responsive limits retained. Runtime admin.html cache refs, assets/css/admin/admin-page.css, assets/js/admin/admin-users.js; test admin-personnel-ui updated close assertions.5/5 tests passed and JS syntax passed. Dummy browser actualCSS confirmed close9px from bordered popup top/right, details scrolling with thin scrollbar, X dismisses correctly. No real applicant/account changes or emails. Initial edit stopped on indentation assertion after CSS; follow-up completed remaining edits before final passing checks. Azure unchanged; authenticated full workflow not repeated. Writer released.

- `admin.html` SHA256 `3cd41205f54f29ec745c65e6f95a213f1dcfa8b68150b147e0538874f77eb812`
- `assets/css/admin/admin-page.css` SHA256 `7cd4dff0d2e21867a1a94badf79f3bab141fa5a6ad46a8dbc0ed87c37fdd90b7`
- `assets/js/admin/admin-users.js` SHA256 `f3a31874e3761b8cd631c8b5eb03982bdafcd7c20d0db6d2089645f43c2e2787`

## BHW-FILTER-20261115 � local only
2026-11-15T09:07:14+08:00 | CODEX-1 | BHW-FILTER-20261115 completed locally. Patient list has status, severity, condition and purok filters, combined with search and pagination, populated from loaded assigned-barangay cases. Active, cleared and active high-risk dashboard cards open a case-list popup using the existing patient endpoint. Historical dataset total remains separate. Popup escapes names and labels, handles unavailable data. JS syntax and isolated popup scope/filter/escaping check passed. A guessed bhw-dashboard.test.js was unavailable. No authenticated browser check or Azure deployment. Writer released.
- `bhw.html` SHA256 `ba9a0161a3a78ecfd7fa60615e674172a4181e51783b59000a74b6483e6a14cc`
- `assets/js/bhw/bhw-records.js` SHA256 `d7355f0b0e809147be694af8710af5f4a65c6ed1fddf7d4b7cd5eaf58f1b74a8`
- `assets/css/bhw/bhw.css` SHA256 `8e5adc374f02729f5834646d7dc6aad8f8baab14cba4ccd624cf36e51712bc18`

## BHW-CASE-POPUP-20261115 � local only
2026-11-15T09:13:52+08:00 | CODEX-1 | BHW-CASE-POPUP-20261115 completed locally. Added separate severity column while preserving status. Active, Cleared and High Risk cards share a styled popup with ten cases per page, prior/next navigation, patient detail hover hint, and clickable names opening existing linked patient profile or unlinked case details. Unlinked detail accepts optional already-loaded case. Patient loading fixture updated for existing filter selects. JS syntax and 4/4 patient loading tests passed. Browser visual and actual signed-in patient interaction not verified. Azure unchanged. Writer released.
- `bhw.html` SHA256 `14a344571a0b837fa84b43a1cfa681c0b0012e8d18bbef1881101f4a74b5fa00`
- `assets/js/bhw/bhw-records.js` SHA256 `997ac29dc87832c4fcac74a0b73abb08bd4469b5a54d6efd230ed729263af068`
- `assets/css/bhw/bhw.css` SHA256 `23a401374a64f8bbead80be8297d1ca4c97ebab4f11a03017a81bdb9a2ca6b33`

## BHW-POPUP-LAYOUT-20261115 � local only
2026-11-15T09:20:24+08:00 | CODEX-1 | BHW-POPUP-LAYOUT-20261115 completed locally. Dashboard live case lists match records table with status, hover indication, numbered navigation and lower-right Close. Patient click opens existing profile/unlinked details and returns to same case list and page when closed. Resident modal observer scoped to dashboard callback. Syntax checks and 4/4 patient loading tests passed. Isolated fixture checked numbered paging and both return paths. Actual signed-in visual/profile interaction not verified. Azure unchanged. Writer released.
- `bhw.html` SHA256 `7f84cfb3e0f2dc86a34166204919585610ed282dbc5370ddc0ca041e2effa9db`
- `assets/js/bhw/bhw-records.js` SHA256 `6907be9d287cfbe51a393c8ca784b32cd54c0a71d98af37b2a1e25760f70b334`
- `assets/js/bhw/bhw-residents.js` SHA256 `b0fb9e6b5538ae4b4f72c03d445de56dfd261550caba4a2184356d9ee569c0b9`
- `assets/css/bhw/bhw.css` SHA256 `107ee48fe597293f88ee10b03b2d02a973dd61753a4e8e35e386422367122ec0`

## BHW-POPUP-STYLE-20261115 � local only
2026-11-15T09:23:53+08:00 | CODEX-1 | BHW-POPUP-STYLE-20261115 completed locally. Shared Active, Cleared and High Risk case popups now have rounded bordered frame, pale profile-style header, white outlined lower-right Close, dark styling, and scrollable content with fixed footer. CSS and bhw.html cache version updated. Isolated paging/return test and 4/4 patient-loading tests passed. Signed-in visual check remains pending. Azure unchanged. Writer released.
- `bhw.html` SHA256 `42074a82a9bc2537cb4f707a8e5f4d9231ceb016fa7634291561ab78fbf5d59b`
- `assets/css/bhw/bhw.css` SHA256 `24b2e71fa0fbd1ddab405698dfdbd1bf4c28c9cc002f37c2852832f5e6d43749`

## BHW-PAGING-ELLIPSIS-20261115 — local only
2026-11-15T09:26:51+08:00 Shared Active, Cleared and High Risk pagination ellipsis fixed; 330-case fixture for each and patient loading checks passed. Azure unchanged.
- `bhw.html` SHA256 `d888ecfe182cb420bb88739277561bd98eef469567fdb04d9ee1193c93f898de`
- `assets/js/bhw/bhw-records.js` SHA256 `98a7f82e05e88b599a9bee337b682254718b86c7995b4696986d3d96a6f935bc`

## BHW-POPUP-FONTS-20261115 — local only
2026-11-15T09:28:21+08:00 | CODEX-1 | BHW-POPUP-FONTS-20261115 completed locally. Shared Active, Cleared and High Risk popup title reduced to 1.25rem, table content and Close to .875rem. Scoped CSS and bhw.html cache updated. Isolated paging/return test passed. Signed-in visual check pending. Azure unchanged. Writer released.
- `bhw.html` SHA256 `3dcfa9573a869b09ffae92db120fa633620823004af71832fdba4c0a8df6c4b3`
- `assets/css/bhw/bhw.css` SHA256 `92ecfad298b70bb7196a2e8a5136384abcd3126c8787a93604e3a3c2155be585`

## BHW-PATIENT-DATE-FILTER-20261115 — local only
2026-11-15T09:32:37+08:00 | CODEX-1 | BHW-PATIENT-DATE-FILTER-20261115 completed locally. BHW Patient Records filters use original case date year and month, work independently or together with status, severity and purok, reset paging, and clear with existing Clear filters. Year options derive from displayed records; missing dates do not match selected dates. Removed redundant condition selector because search already supports conditions; placeholder updated. JS syntax, isolated date/filter/clear fixture and 4/4 patient-loading tests passed. Signed-in visual check pending. Azure unchanged. Writer released.
- `bhw.html` SHA256 `a27674a062048e90c4bdde87d50c17206b32160fbf6db1c3cc3c2563b1b080c4`
- `assets/js/bhw/bhw-records.js` SHA256 `69540e3f46ce26b7ca1243bdf28e227b8fcd78bfea0374c1d7c0dfae1bcec877`

## BHW-POPUP-SCROLLBAR-20261115 — local only
2026-11-15T09:36:48+08:00 | CODEX-1 | BHW-POPUP-SCROLLBAR-20261115 completed locally. Scoped thin scrollbar styling to BHW case popup, its content and inner case table, with 6px WebKit fallback and retained scrolling. CSS/cache updated. Isolated pagination and return fixture passed. Actual signed-in visual check pending. Azure unchanged. Writer released.
- `bhw.html` SHA256 `3739b01b4d6c22570df2876ca13339af78c777fb8e2c7a78b788ea608ad36d49`
- `assets/css/bhw/bhw.css` SHA256 `a7416cea2f202ea3440cb5c6acc106e52ba9100255c43681eb29574019d4da03`


2026-11-15T09:59:15+08:00 | CODEX-1 | Patient case PDF completed locally. Shared case picker and PDF download in BHW and MHO linked resident profiles. Server checks BHW case and resident barangay, excludes unlinked cases, scopes visits by case, and records existing Report Export Prepared audit before delivery. No schema or dependency change. Nine runtime files listed in Azure manifest. Six regressions, isolated permission/audit/PDF check, rendered synthetic sample, local read-only schema check and localhost HTTP checks passed. Signed-in browser workflow and Azure pending. Writer released.
- bhw.html SHA256 0ebe7727aa8d2c9821aa4c8f559891c121b40840581e9a10e1fc88474ba685af
- mho.html SHA256 5f720d632548bb639214bcff8d34ba3b6a1a1ee82e57bc2374f074e205fb51d4
- assets/css/shared/portal-responsive.css SHA256 6beb56f887882ddbb5ceba0fa5f3ad1401fbb903e1d3220ac01adce95c5bbf71
- assets/js/shared/patient-case-download.js SHA256 b519025ead1bc748ab5980fc29856bf569184cd649cf05dbe1435c5fdfc350b9
- assets/js/bhw/bhw-residents.js SHA256 100d6bf8057d0f8607558b9a213bbd6a1ed64b4aa2fa837e17e7647af366cd6c
- assets/js/mho/mho-patients.js SHA256 d57db2b1b30efc7d8ab1d9aae4907c3c47038e0dd3dd42f522cf5e00589def5d
- server/server.js SHA256 55ee4f63fa36971020d5391d9d10c4d9d0779331d0e2856c7a15fe9a3a809c9a
- server/middleware/access-control.js SHA256 00c03724f4aa78caf257e898d0d35c9ccde22fb963789b1850c38be689c63c49
- server/routes/patient-case-summary.js SHA256 605b2d3a7823fb8de6d91fbd39e88b0ade459a456ec508ea15b8d264b65c8000


2026-11-15T13:15:50+08:00 | CODEX-1 | BHW case transitions completed locally. Active, Cleared and High Risk keep the list visible while a profile loads, wait for the list to close before opening details, animate entry and respect reduced motion. Closing details returns to the original page. Four loading tests and isolated transition checks passed. Signed-in visual verification and Azure deployment pending. Writer released.
- bhw.html SHA256 25df1c4859d8660984be8b822d81e9ae18eeda458e2b94f932ec30248c39e59f
- assets/css/bhw/bhw.css SHA256 af8ac89731edf42d2545c15cae600d24843dddd376cc1384d078fd51e240f9bd
- assets/js/bhw/bhw-records.js SHA256 3c4bbd6e7b708d94973c4943d199fb9a333b219424db3fef3a1233ba94d90be4
- assets/js/bhw/bhw-residents.js SHA256 fac0930fb02c250579f8aae5d7384185aebea8cdc973e525baadaef67a25ff68


2026-11-15T13:17:58+08:00 | CODEX-1 | BHW case transition visibility completed locally. Increased detail entrance to 360ms, 32px rise, and slight scale for all three cards. Reduced-motion rule retained. CSS and cache reference checked; signed-in browser not checked.
- bhw.html SHA256 51c9b27e18640329caf5f2b2956fdee481309b1ac7c424a30f5f6d2ab6916215
- assets/css/bhw/bhw.css SHA256 c908e77bace1b1d9d1811aa31b977b8d71f25b14268117576931d235989c7749


2026-11-15T13:27:00+08:00 | CODEX-1 | Retired deceased workflow locally for BHW and MHO. Entry and status updates accept Active and Cleared. No live death reporting, review or dedicated export routes. Patient histories retain previous case outcomes under a historical label. Existing confirmations block new consultations. Disease Review and disease distribution remain in place. No database records or schema changed. Eleven focused tests and an isolated retirement check passed. Older integration tests for the removed workflow were outside the focused run. Local server restarted. Azure pending. Writer released.
- bhw.html SHA256 503b133ec748d4b2218797163f6545828452c9fc7c988617673582d282cb454d
- mho.html SHA256 391570fab1892e8d12cf962aa828b91cfe5477b139a3028dd8821a047d82fb43
- assets/js/bhw/bhw-records.js SHA256 6bcea924a48aef8f51ed6cbe00b2762df6c0036224fe1757ed280e948bf79735
- assets/js/bhw/bhw-residents.js SHA256 6fe31d3f9db16c49d911e80cc29a1f874ac210fb10245d708d4cca3e121ba884
- assets/js/mho/mho-disease-review.js SHA256 beb72f977e83fd7ab151bd983fe29ff8c44f413f2460eb4671751ac77cbf7639
- assets/js/mho/mho-patients.js SHA256 1f978aa1ab07d379e311e97529bc7597d7635c0870811f62f13a6759aa1d2467
- assets/js/mho/mho-analytics.js SHA256 98b1d64005024257896d58e8fb9fc61d0241cbdf7f53e7f4170f99c58dc6a0f5
- assets/js/mho/municipal-dataset.js SHA256 bde149945fc7864027430ab14b505b7db2826e599f5a7775c2a157c1a207e770
- assets/js/mho/mho-insights.js SHA256 32a31a42a2e4b312416dd83c2dde376d6f486a49135647dc090b11fa87d1e901
- assets/js/shared/patient-visits.js SHA256 c1a1f92ba47b50137bd492f5c20cd9b62e9d6a765190b46dd6f9c16efe9a94ae
- assets/js/shared/followup-tracking.js SHA256 c9bbbf3f8b0aca0b616b3cbc117260e015b12fb7114b8c6814f04c7ad44f1d58
- server/server.js SHA256 2c854ec2811a6677fa675414097ab42aac2b25b6493d4b892ed27362e53b1ee8
- server/middleware/access-control.js SHA256 d7a13852ed08f544bb05452c49da5e8d5661a27f6e2bfecb336fb5e5996de344
- server/routes/analytics-routes.js SHA256 d3c0242a0569a93094f9c7c203d7be2bae8ee5bb74d25674f7f37e1d96240ea4
- server/routes/patient-case-summary.js SHA256 ea5f150c47489dc02a64366870933100e5af4ef93309f5dc36cace9172e09a71
- server/services/patient-validation.js SHA256 fcc1204f2724e0897ceebf624345c0202184498aac4a1bbca7e6625890b9161b
- server/services/case-lifecycle.js SHA256 76d6bee7d69063b5a0c860db095f5f7c6ec804651f9861a382a0910792c4d433
- server/services/case-records.js SHA256 4056cd475547147bc834c5f43ef7d45eb883a620afa08601775df8a3a7d1d24a
- server/services/case-visits.js SHA256 207c088feba621a2ca0e0d3bbf4ebe501ff6bd1ef4cdc095bfb76a347442442a
- server/services/case-corrections.js SHA256 748d99118bbf2dfbbbaf6641c26c25fc2f68f1c29c9832632561e60b8fbcc413
- server/services/resident-vital.js SHA256 cda056f623bb4e0cbc53f9503b5e51dd3c2d1459143a33cabaf4879bd13becc3
- server/services/mho-patients.js SHA256 76a9c58c4c53687e62311d197fb995fff2bebe9fc2ba819aa7c4d0a71b424527
- server/services/mho-analytics.js SHA256 5a532a7dc3d202a2d477ede012c752fd65cc1e816cdef4eb39b8a427dcc86782
- server/services/dashboard-data.js SHA256 7dfb8ff8789462ddc15faab21a6c4d0800d1dca90ecd221bf344b215fc33357d


2026-11-15T13:36:06+08:00 | CODEX-1 | MHO Patient History layout completed locally. Shared dialog used from Walk-in Patients and Patient Directory. Compact identity and counts, collapsible case PDF, thin content scrollbar, fixed outlined Close footer and paging only when needed. Synthetic dialog fixture verified empty and paginated history, export availability and tab switching. Signed-in visual check and Azure deployment pending. Writer released.
- mho.html SHA256 3a5af0b9e6654f392c70a2e796cdd49c0496c37838a14ed66985295717661318
- assets/css/shared/mho.css SHA256 ddaa7bd03013fb8863f4f3344ca4719d23bfd94cd7734c898c901cede6893ed3
- assets/js/mho/mho-patients.js SHA256 9c570ffe80165ad613a79c7cb9462e9afb4a7ba9ab267a2cc33049303a0cd0af


2026-11-15T13:42:12+08:00 | CODEX-1 | Correction justification label. Updated shared BHW and Admin correction form to say Justification for correction. Existing validation, permissions and audit history retained. Local only. Writer released.
- assets/js/shared/case-corrections.js SHA256 7ce0b7c8126ed2f9684791cb25563c457d088f84ed04bacc471d838a4b804756
- bhw.html SHA256 fe2af0736402c859651ed1fd094ba1ae88e2d085dc12375579d7c28e671da7cf
- admin.html SHA256 c0ca445e2d71f76bf3873a067501c12542236fafa2d115b33c455ffd356edf12


2026-11-15T13:49:33+08:00 | CODEX-1 | Case correction comparison complete locally. BHW and Admin show saved case date, condition and severity as read-only text beside the editable proposed fields. Narrow screens stack the two sections. Justification, locks and audit behavior retained. Syntax and isolated form payload checks passed. Visual sign-in check and Azure deployment pending. Writer released.
- assets/js/shared/case-corrections.js SHA256 7ea15817f90176d01abda11bcd937099c2fd3a00a36ab79c688ed2e01d81763b
- assets/css/shared/health-dialogs.css SHA256 a5a217f8ad852378f428f1adf33824cf8098a3000e848b9e5f97b50ff3962cb6
- bhw.html SHA256 807c5a0345e0e0d5ef85a66640afc5ea64eb3f1b12a4ce075ab59fbb94687b62
- admin.html SHA256 3e0544099e5142b8a92f0b05e9e409e31ba4eeab685b23aca094a25fcb20908a


2026-11-15T13:59:48+08:00 | CODEX-1 | Reporting eligibility and BHW resident filters completed locally. MHO records auditable exclude/restore decisions with required justification in patient history. Latest audit decision is the shared monthly eligibility rule for BHW/MHO reports and forecasting inputs. Archive timestamps do not change counts or fingerprints. Prior archived cases count unless explicitly excluded. Existing confirmations can become stale if eligibility differs. No schema change, live data edits, forecast training or deployment. Resident filters combine purok and presence of case records with name search. Six regressions and synthetic MySQL checks passed, including restoration, stale decisions, role restriction and audit. Resident filter fixture and localhost startup/portal checks passed. Authenticated browser flow pending. Writer released.
- bhw.html SHA256 14faafffd75b414f39f7b8601a10dd5b96dc44550509d524cd2d0318a6388141
- mho.html SHA256 ca4a0ccd3772aa0f1ac1280023ff826dd53afc6b27cba92b3f80be4e56914761
- assets/js/bhw/bhw-residents.js SHA256 04a37f9025bc42c285d0aa01cb7cca56ce631e576ef5e0261fd027e606605bfa
- assets/js/mho/mho-patients.js SHA256 9494c268201d7a77173f5b6812df63a563e027b38fcdd543298282684e21d76f
- server/server.js SHA256 598c83c5e5471897a9419cba4490810211c602a4ba3db692079ee013ed4cb455
- server/middleware/access-control.js SHA256 c76b26b5ed177a73d4b67d0799e64e9d04bf39d98589dad56a8790e44c7fbdd5
- server/services/case-reporting.js SHA256 e6abfacf86f048989a2d2075afbba2abb648ae4b2b11c260084daae05b6fa135
- server/services/case-records.js SHA256 797a18a186928985cbd2e81ed685038e79cf22bf4df8b5421e8195f7f8f1769b
- server/services/mho-patients.js SHA256 cc503a416a3aa9e63093e20cf46b55f0ef6145c7ab5b62b021f8b5554f202698
- server/services/report-export.js SHA256 84fad7145886f555d96fa21e2accb56a2270b9fa56259ac80d1362111b477ac9
- server/services/report-data.js SHA256 dd6fbe25fe92b458fe1ddfd84c559ceeb9ff0408b12232c41e39c98dbab27648
- server/services/monthly-data.js SHA256 6760e55e2e69dcfa6dfdce13616da4d267957d9b219c7899d258332e887e0d80
- server/services/monthly-predictions.js SHA256 d129a4e4c44226ac143e7415ca39bd1e7cb1e2fcd628f792c7a3af6553bb6449


2026-11-15T14:13:57+08:00 | CODEX-1 | BHW Resident Profiles now combines name search, assigned barangay puroks (including unused suggested puroks and saved custom zones), and age group in place of Case records. Reuses patient-entry purok choices. Local only. Two focused UI checks and an isolated filter fixture passed. Broader portal/workflow run: 40 passed, four failures in municipal analytics, access control, admin account actions, and Google registration. Authenticated visual check pending. No database migration. Writer released.
- bhw.html SHA256 3b5fb3b92b03cea9f83a27cc2cfa6215c39745f9706b1df0046d2ceef551c807
- mho.html SHA256 f77874c8d1c6c086991c336033670bef3c3f7f1f525dd51e56389201ec1e8cc8
- assets/js/shared/encoding-controls.js SHA256 e3e29bda60af92ee1b8f4d3892f58d8a36c5ecac5ca28dec74d7e2089ec66314
- assets/js/bhw/bhw-residents.js SHA256 6c64b034cbcbe8bde472954421046932ed52389bcb31c4c173fb8a8a56121481
- assets/js/bhw/bhw-startup.js SHA256 911220ac302087a8515205dcab604054fd10d6f38d994427f90b765f838821df


2026-11-15T14:24:18+08:00 | CODEX-1 | MAP-BOUNDARIES-20261115 | Completed locally on main/e5946d4. Removed the BHW map view, sidebar/quick link and Leaflet loading for all BHWs. Added seven indicative NAMRIA/PSA-derived Murcia boundary outlines in MHO Summary and Heat View. Polygon names available on hover, source attribution and load-failure message included. Existing authenticated aggregate API and role/assignment scope preserved. 23 map tests, syntax checks, isolated geometry/overlay fixture and static HTTP checks passed. Signed-in visual verification pending. No Azure or database changes.
- bhw.html SHA256 5d095646aca3fee3632f4552d1b3c0a7b8614874f36a93d5aecdee459b75d423
- mho.html SHA256 5a692bca6cbf50f725ddb88d25295c551b84d0176410afb7f2e7ddc86db35474
- assets/js/bhw/bhw-dashboard.js SHA256 7db62cfb995cb2e600c6a57062d2b26e5e79992bcd5e71976abe028816167c45
- assets/js/shared/health-map.js SHA256 311af90b318680711a965c02640066cecfaffc5b2a807b8d88eabe8cfd3e3321
- assets/js/shared/lazy-heatmap.js SHA256 bf04155a3269fe5b3a0997e0a40e4969c1924fff64fd71116e18f8de53c4d8e2
- assets/img/maps/murcia-pilot-barangays.geojson SHA256 a730636abd1634e4f23693a1360dd6ed4ab24aa80c89722743ab6ebe9c358bbf
- assets/img/maps/murcia-pilot-barangays-LICENSE.txt SHA256 961d3499dc0dd95e635ceff9d5f652d6ff535fc52e882e9b52a96b5b6bb42900


2026-11-15T14:34:35+08:00 | CODEX-1 | MHO-RECORDED-LIVE-20261115 | Completed locally on main/e5946d4. Recorded cases defaults to All years and combines filtered historical data through September 2026 with operational cases dated from October 1, 2026 (all conditions). The non-overlapping case-date cutoff also applies to backdated entries. KPI refreshes on case-save, analytics entry, tab return and every 30 seconds while visible. Historical charts and live status-card counts preserve their existing sources. Directory Search button removed; typing triggers a debounced search on page one. Five Municipal Analytics tests, isolated SQL/filter and directory-search fixtures and syntax checks passed. No database migration or Azure deployment. Signed-in browser verification pending.
- mho.html SHA256 360220113ffe6136acdb0420b66e72cac05b993446b7227199ca495d18c1737a
- assets/js/mho/mho-analytics.js SHA256 fdb1d4aba3b69a609f8447ae995af6b9f9b18cbb43c5d8df2b7c936f2a46b06b
- assets/js/mho/mho-patients.js SHA256 472e22792c5fd14f9bb28cb61febbe013708160b354ac67c6cb31f2340401797
- server/routes/analytics-routes.js SHA256 c72d55bd46d96271f2a81e9d144994dc7261243cd2adc850aa633dd463aeeb03
- server/services/dashboard-data.js SHA256 0a2ea10943a03d7962fba65bb3d60f03841c0e937c49eca837356b9a860d89c7
- server/services/dataset-analytics.js SHA256 0abdbf853b28ce77eb8154280924a05b9b2469179eb2fb7be34220729ba695f3
- server/services/mho-analytics.js SHA256 0382f7bb1bec822579264b20c0fdb702d7cf2bf2d7fe04b8473f572ce3d8c978


2026-11-15T15:01:33+08:00 | CODEX-1 | BHW-FOLLOWUP-NAV-20261115 | Completed locally on main/e5946d4. BHW Follow-up Tracking moved from Resident Profiles to its own sidebar view. Dashboard shows assigned-barangay Due today and Past due counts with direct shortcuts. Counts refresh at dashboard entry, on case changes while visible and when the browser regains focus. MHO retains its directory tab. Uses existing Manila-date follow-up API and role scope. Ten tracking/rehearsal tests and a dashboard interaction fixture passed. No automatic patient messages, database changes or Azure deployment. Signed-in visual check pending.
- bhw.html SHA256 f24de0736152092674057f5c23e509ae36c8ea113a84295a399876ed69c2ca3d
- mho.html SHA256 ccc5fb88fa7fdd2ba6ea0c2e54b993048986b83642a44af34cacb2ea10158ccc
- assets/js/shared/followup-tracking.js SHA256 5b6b40ecdaa507bf0e6412a5ee3a0939747207b700ca4512e5278b13340aa260


2026-11-15T15:13:47+08:00 | CODEX-1 | MHO-PUROK-MAP-20261115 | Completed locally on main/e5946d4. Click an MHO barangay outline to open Case Breakdown with it selected. Purok table supports All diseases or an active disease and retains Purok not recorded. MHO-only aggregate data; existing map markers, heat intensity and BHW/Admin scope retained. Removed rectangular focus outline on the polygon and used its stroke for focus-visible styling. Nineteen focused tests, isolated dialog preselection/disease interaction, real local MySQL read-only totals reconciliation and restart HTTP check passed. No data writes, schema changes or Azure deployment. Signed-in visual verification pending.
- mho.html SHA256 69a6fefe371cc8d3774a13cf0ca3831b5cd03572044f1a7e8946f49ebe21e3ed
- assets/css/shared/health-map.css SHA256 f4b9cbd42b97c0f9f0a7ef521f32f28c38bb531b8351f53b1b4d23b8b0076a88
- assets/js/shared/health-map.js SHA256 0925eac2b66ae3c3b63de533a261d13543577f47d95de7b216a8e0aeaedab130
- assets/js/shared/lazy-heatmap.js SHA256 acd9ac30b753a4947373541d4a492ba138531c9241224ade670ea56823634527
- assets/js/shared/map-case-breakdown.js SHA256 1460f04daba2156df66f6bf2669d2cfcb2e12fa65ad95b3eab5454f26ac05d76
- server/routes/case-routes.js SHA256 ba243ee3c3403b81023a90ca1ef144f9e3a49e207915dec4138ccbe3de834d44
- server/services/case-map-data.js SHA256 5c89b2dff7a887de25cfbf75237342f9dc4ce248fb40493441c7d540062a3e56


2026-11-15T15:17:58+08:00 | CODEX-1 | MHO-MAP-SUMMARY-20261115 | Completed locally on main/e5946d4. Removed Purok breakdown and its aggregate query from the MHO map. Clicking an outline no longer opens the dialog. Barangay outlines, name tooltips, polygon focus styling and the separate Case Breakdown button remain. Eighteen focused tests and restarted localhost asset checks passed. Signed-in visual verification pending. No Azure deployment.
- mho.html SHA256 765dee14c2cc0ac083c181e642030dbacb3043bed3cdc3617f415ec6d8240d0c
- assets/css/shared/health-map.css SHA256 a5d6dd7cb97de4ce0852a6bdc0db118db48d9638ae99cf31a33485478a846be1
- assets/js/shared/health-map.js SHA256 0203fa0e930467e0fdffb8ce4da3e3130f3d85c8f510efd14969a02f13195701
- assets/js/shared/lazy-heatmap.js SHA256 a4a07775926d6b6fa4e7b42932b08737a72d980f09d56386879d3fadddc6eacb
- assets/js/shared/map-case-breakdown.js SHA256 a93e9b3354941772610a66fbc5ede2b4cc94f797f0dc10f484100a896e00af8a
- server/routes/case-routes.js SHA256 2889295ffe27a7d6066ee40391f9337213ce784a1a4234b816a00b9b15fa14f3
- server/services/case-map-data.js SHA256 fac5df2ee81fad8b29c4342366eee22133f0eaee324244b45350adfed82c6e57


2026-11-15T15:22:44+08:00 | CODEX-1 | MHO-BOUNDARY-CANVAS-20261115 | Completed locally on main/e5946d4. Draw all seven MHO barangay shapes using the Leaflet canvas renderer to remove SVG shape click rectangles. Existing dashed boundaries and name tooltips retained. Eighteen focused tests and an isolated headless Chrome fixture exercising all seven clicks passed. No Azure deployment.
- mho.html SHA256 afc50b083c1f26f0e1272a1081a98b26a656a2db563db2042ca285081ad79b83
- assets/css/shared/health-map.css SHA256 da54d2e60019248b79449894b3d71d23371bc67b0a230dd2443ecb8acfcaa065
- assets/js/shared/health-map.js SHA256 baabeff18c6fa1ec299e95e519296d4147be39d964ff5751891f45694393458a
- assets/js/shared/lazy-heatmap.js SHA256 d49873f13b2d14e2b0153f77fac7cc91bf44183e04e9cc94871f71688cc742f3


2026-11-15T20:38:00+08:00 | CODEX-1 | MHO-FORECAST-LABELS-20261115 | Completed locally. The MHO result labels the estimate with its actual forecast method and groups the percentages, intervals and distribution under COM-Poisson. Display-only change. Twenty-two focused tests passed, including a fallback and mismatched probability assertion. Opened localhost MHO in the default browser. Signed-in visual verification and Azure deployment pending.
- mho.html SHA256 f53fbd9186688e21819295429ebceacfc0824790e26f2be4479fbce171b2048e
- assets/js/mho/cmp-presentation.js SHA256 1fcaee4f18ebb5759a47a9c1bcca02f2ad919697f4cb60b76f70e3c451c4928c
- assets/js/mho/mho-forecast.js SHA256 0445963adeb305227c053a2af1bfbd3a955315cb17b9e6e04822274c4e772a41


2026-11-15T21:01:31+08:00 | CODEX-1 | MONTHLY-TESTING-UI-20261115 | Completed locally. Monthly Updates explains the 45-month minimum (3 years and 9 months), constrains date selection to the allowed history length, and shows the selected count and forecast month. Disease Review ignores stale queue responses and refreshes loaded monthly reports after a classification changes. Operational run progress uses actual worker-reported counts. Demonstration testing displays the saved Cough/Salvacion SARIMA training and historical evaluation via the existing read-only route. Seventeen tests and localhost asset checks passed. No Python environment, forecast data, training, database or Azure changes. Signed-in browser verification pending.
- mho.html SHA256 0e87e0969512b2f0e9f3689de5a8a9b6b399b74899868b35aa77f50d19688e10
- assets/js/mho/operational-monthly.js SHA256 fa1be63b42a36f1bb463518d2dc1b3df8cfc335945d4566b3da8bc0e8a207516
- assets/js/mho/mho-disease-review.js SHA256 a101a8a49a68b857a7f27ea75033cb9fc9752845c153c66241bfc50512184c74


2026-11-15T21:08:16+08:00 | CODEX-1 | MONTHLY-OPERATIONAL-ONLY-20261115 | Completed locally. Removed saved demonstration test panel from Monthly Updates. Refined reporting, preparation, and publication layout with a prominent forecast month, state-specific worker status, refresh control and genuine run progress. Seventeen focused tests and isolated Chrome checks at 512 and 1418 CSS pixels passed. Read-only worker check found pandas 3.0.1 versus required 2.3.3. No training run, scientific dependency edits, database changes or Azure deployment. Signed-in visual verification pending.
- mho.html SHA256 18dfe93024d2b8c79b7d4273276180d14d4c9fc9454bea57d3b887b996decc1d
- assets/css/mho/mho-page.css SHA256 899baad8416e764f1a1295a362f912d6fa6482bb823bf1375281428cdf90b7a8
- assets/js/mho/operational-monthly.js SHA256 12303f269dbbde073fef1e7148c0571ca08ec204d1e56980d56320c8a27d12af


2026-11-15T21:13:06+08:00 | CODEX-1 | MONTHLY-WORKER-STATUS-20261115 | Completed locally. MHO Monthly Updates puts a readable worker status and expandable diagnostics next to Prepare update, with a Check again action. Operational runs display worker-reported history progress, an indeterminate indicator before the count arrives and a one-second elapsed timer based on the queued timestamp. Eighteen focused tests and isolated Chrome layout checks at 512 and 1418 CSS pixels passed. No training job started, no Python or database changes, and no Azure deployment.
- mho.html SHA256 d82cd3d464dc1cf6575f3534eeaefdf5ded574056bcd4ce5ecdb380aea6af5a2
- assets/css/mho/mho-page.css SHA256 77c27497152abdbb41b8e111cd0fa66e202115d0c2b78073811b0d0fb6ddc31e
- assets/js/mho/operational-monthly.js SHA256 ac27f60dc1ef8a61af1732f9b1b3744a5ee6d31ddcf610fd587927ce2ca9255f


2026-11-15T21:32:51+08:00 | CODEX-1 | DATASET-MONTHLY-UPDATE | Completed locally. Default MHO dataset-backed history uses the verified, unchanged January 2023 through September 2026 dataset and complete reports from October 2026 onward. A real worker run goes through the existing SARIMA fit, status and review. Preview publication and operational COM-Poisson preparation are blocked in UI and service. Confirmed reports only mode remains available. Mixed integration fixture and 13 UI tests passed. Local October confirmation inspection found 7 of 7 current and complete. After idle restart, MHO returned HTTP 200. No operational model fitted or published, no data/schema/Azure changes.
- mho.html SHA256 df05c623c582f53ad7e99e2074d9a96eeff8aa3838b5b07386ebee4d77473785
- assets/css/mho/mho-page.css SHA256 51e593ebf1fc9f49dacac23a2f3a1c33e45546c7b930dbebb17f57dc1cfcf701
- assets/js/mho/operational-monthly.js SHA256 219f033c1d4b9a8b0ae88486872b9a92069c0b016ee7cfc15b97be8e0fc155d1
- server/services/monthly-data.js SHA256 f1d878c7db511854f466c52821e1415c65bd11cfe070697790fa3dadbdc44b43
- server/services/monthly-predictions.js SHA256 657c9b62e6854a4411ac763fd68850d7842edb5766de2402ab3070ddc662117a
- server/forecasting/policy-a-portable/monthly-runner.py SHA256 79e4be16fd035562b2a57551af991aa7b81943c84bb2dc62eba02a91a7a54bd1
- server/forecasting/policy-a-portable/runtime-manifest.json SHA256 899bef04eb33b662bdfe6d29caf2d793c98898c1d8f134c6b133e5a203d12d0a


2026-11-15T21:44:38+08:00 | CODEX-1 | MONTHLY-SINGLE-HISTORY | Local mho.html now offers one Monthly Updates history choice: Saved dataset + new reports. Served HTML verified and all 13 Monthly Updates UI tests passed. No backend or Azure edits.
- mho.html SHA256 a22bd468f91446f887557380404ff6f12ea717f9bf778a093ad9ae23ff96c130


## MONTHLY-PROGRESS-DESIGN — 2026-11-15T22:05:23.4830058+08:00

MHO Monthly Updates shows the forecast month, step status, the active SARIMA run and training data near the top. Progress uses actual worker counts and elapsed time. Failed runs stay available in a collapsed Past attempts section. The saved dataset and new-confirmed-report workflow is preserved. All 27 focused forecast/UI tests passed. Isolated Chrome verified desktop light and narrow dark layouts, live progress rendering with fixtures, and the Past attempts disclosure surviving refresh. Localhost served the revised page with HTTP 200; authenticated browser QA was not run. No changes to backend, training configuration, models, datasets, database, or Azure. The local server was not restarted.

Copy the three frontend files together when this change is approved for deployment. The test file is local verification only.
- mho.html SHA256 45675b0b5ca9d8299658fd47ae12779c80594abb012fba4dba4c24bee9a1c7d3
- assets/css/mho/mho-page.css SHA256 e23f0066c7b181130521588bba77aa31edbeae448fd77d7aa2a7789a1c4643d6
- assets/js/mho/operational-monthly.js SHA256 57f26fd25a97f8436f271cedc3eebc2afbd89c695dbdb875ac8eb63953be4fbc


## MONTHLY-REPORT-FIRST

2026-11-15T22:09:14.5874130+08:00 — CODEX-1 completed MONTHLY-REPORT-FIRST on main/e5946d4. Local MHO Monthly Updates orders report confirmation, SARIMA preparation, then full-width progress and results. Completed dataset-backed review explains reviewing the scope table and confirming the forecast month’s reports after it closes. All 27 focused tests passed. Desktop light and narrow dark Chrome fixture checks and localhost served order passed. Signed-in browser review was not rerun. Backend, data, publication and Azure unchanged.
These frontend hashes supersede the previous Monthly Updates redesign entry.
- mho.html SHA256 63feebe74c35a1e2c1fdfda6a02fb5ffbeabdfc3d61ddb5bddb3fddae0f666f3
- assets/css/mho/mho-page.css SHA256 dc75ea87cb8addd7d15a56b222e0d8bfa03bd860e10a2c70b9a7af90fb17e868
- assets/js/mho/operational-monthly.js SHA256 5b97b4665306d797255ef05a447745d5b25cc8d00df9ee6918a70f42c273c866


## BHW-PUROK-CONSISTENCY

2026-11-16T21:04:14.6882227+08:00 — CODEX-1 completed BHW-PUROK-CONSISTENCY. Patient Records and Resident Profiles use one option builder combining assigned-barangay configured puroks with loaded case and resident locations. Both lists share numeric-aware sorting and case/whitespace-insensitive keys. Existing values and selections are retained where available. Seven relevant tests passed; localhost served the revised script. Wider ui-workflow suite had two registration fixture failures (registrationDenial missing and document.querySelectorAll absent) outside edited BHW files. Signed-in browser visual QA was not run. Severity reference research recommends Mild green, Monitored amber, High Risk red, based on WHO triage color conventions; no severity styling applied in this task.
The three runtime files must be copied together for a future Azure release.
- bhw.html SHA256 f4b560e857d3777039c6257f26bb3b1c492f86969614cdc138c97bc424a0f33c
- assets/js/bhw/bhw-records.js SHA256 498877244cb8049551be9c67a055d137efe4752e8ddfdaebece42597b41cb16f
- assets/js/bhw/bhw-residents.js SHA256 2021dd4f1f50edcf5f091904ad1aecc55b17ce8bc1a65ca8a3218523ac5e4b37


## BHW-SEVERITY-COLORS

2026-11-16T21:08:55.0095937+08:00 — CODEX-1 completed BHW-SEVERITY-COLORS locally. Applied green Mild, amber Monitored and red High Risk labeled badges to BHW patient tables, all three dashboard case popups, and legacy case details using one escaped renderer. Missing/unrecognized severity stays labeled and neutral. Light/dark styles included. Six patient/filter/severity tests and JavaScript syntax passed. Signed-in visual checking pending. Database and Azure unchanged.
Copy the three runtime files together when approved for Azure.
- bhw.html SHA256 ff5d22ee1742f57121d9faecc68f961787ef2dc2b60b62d36deadeb472af08ce
- assets/js/bhw/bhw-records.js SHA256 cb0c1310f62ec2ac62ca1fdd906a902bbaf975489200892c0750cf3f075e388d
- assets/css/bhw/bhw.css SHA256 5d20c5f7466401d21f5aa581a9382f71881855cb5dd9ee34e29ff5fcd611643b


## SEVERITY-PLACEHOLDER and REPORT-PUROKS

2026-11-16T21:17:11.7741399+08:00 — CODEX-1 completed SEVERITY-PLACEHOLDER and the subsequent REPORT-PUROKS request locally. The correction severity prompt is disabled and hidden inside its native select, displayed for missing/unrecognized severity, and existing valid selections remain selected. BHW surveillance dropdown retains All puroks in your barangay, adding configured and recorded locations from the existing assigned-only API. Selected locations persist on refresh, overlapping loads ignore stale replies, and failed reads retain configured/loaded choices. Five placeholder assertions, three targeted navigation/report tests and six patient/filter/severity tests passed. JavaScript syntax, diff checks and served report script passed. Signed-in visual QA pending. No DB, reporting rules or Azure change.
Runtime files for a future approved release follow.
- assets/js/shared/case-corrections.js SHA256 00de359a2a858825dc29e91f590887be873ef2684cf607c7cbb03f9494f43f5b
- assets/js/bhw/bhw-startup.js SHA256 9f5ccb0b4c2471da632879695145ebcc9e14dab55423c2ed1573a869b8cc7e51
- bhw.html SHA256 7a3a350389380d008393e60de761851839fd9a27d6ff03c1e7d4e642425b3179
- admin.html SHA256 55e25d9e2c5ecc15e3688839f6aa3ea2dfb8de441a2d794366200bd549793ccf


## BHW-MAP-VIEW

2026-11-16T21:32:05.3664684+08:00 — CODEX-1 completed BHW-MAP-VIEW locally. Restored BHW Map view navigation and lazy-loaded assigned-barangay case summaries. BHW summary mode omits Heat View and the optional Case Breakdown control, and loads no heat-view/heat-layer library. Existing marker details, severity legend, refresh and fullscreen controls are reused. Boundaries are restricted to names returned by the authorized case API. MHO default map modes are retained. Eighteen map/detail/access tests and three targeted portal/navigation tests passed; localhost served the new page. Signed-in visual QA pending. No database or Azure change.
Copy all four runtime files together for a future approved release.
- bhw.html SHA256 121e6c73b3d799477799a8db4052fb5882890b0a9444b8b06061ab6b5fe3bfcc
- assets/css/bhw/bhw.css SHA256 53b40b3091ee695dc3c4e46a91c2d2ba59b3b15749b140161311692d9863fd56
- assets/js/shared/lazy-heatmap.js SHA256 68c168f88439b01f3fcbbd030c6e7638c7a9929f4b7b91cc53ea642739d47b20
- assets/js/shared/health-map.js SHA256 7b7d46a23723e0c88a453f83fd3b84c0c415535062ec4f1e3a51a5b21179d8e4


## MAP-CLASSIFICATION-20261116

2026-11-16T22:32:28.664518+08:00 CODEX-1: Local UI separation complete; all summary markers are neutral Not assessed. Patient severity remains separate in popup. Automatic threshold classification is NOT activated: applicable validated rules, reporting periods and incident counts are required. 34 focused tests passed. Localhost script served; signed-in visual QA pending. No DB, backend, model, data or Azure changes. Copy these files together in a future authorized release; no migration required.
- assets/js/shared/map-details.js SHA256 24f7b049f060822c90d3d885943dfd12b1d7d3bde79f7cb4e3a9eee9fd3e8488
- assets/js/shared/health-map.js SHA256 8805d438fe4afad30f67014d6aa707540b742b376d1ebb287acbaf3bd908c245
- assets/js/shared/lazy-heatmap.js SHA256 fe87601bb15106c8e56061918f9e53b3b177dc524126dec1aeae02d45fe9b80e
- assets/css/shared/health-map.css SHA256 b2c204a1bffd27f889ef2aa4e2f8b57cea1e0720b4e5085a01e3c33fff1176cd
- bhw.html SHA256 b04027aef2d9dc863ddd3eab326a4fdfc2c1b04c9ef9a56067bf1c152e64902d
- mho.html SHA256 5c06a2ec4f3b749b1153a8671f8d7c742bad6cf2291c54f12341e306c34c3738


## LIVE-MAP-ACTIVITY-20261116

2026-11-16T22:49:17.144728+08:00 - CODEX-1 completed LIVE-MAP-ACTIVITY-20261116 locally on main/e5946d4. User explicitly chose statistical case-activity bands for all ten study categories, labeled analytical rather than official outbreak risk. Live read-only map query counts new case records over the last seven Philippine calendar days against three preceding seven-day periods, including today; sample SD uses n-1. Mild is <= mean+1SD; Monitored > mean+1SD; High Risk > mean+2SD. Each category is calculated independently; strongest disease band sets the circle, with new/7d total at center. Zero baseline with new activity is Monitored with no estimated red cutoff; no current records is Mild recorded activity only. Pending/unlisted current cases withhold a misleading green overall assessment. Query preserves BHW canonical assignment, includes valid archived/cleared cases, uses reporting-exclusion decisions and excludes follow-up visit rows and generated forecast history. Pending disease classifications are not assigned to a category. Popup shows period, driver disease, current and previous counts, mean/SD, exact integer starts, reason and all ten bands; individual severity remains separate. These are exploratory bands from three periods, unadjusted for seasonality/population, and no-record days mean zero recorded cases rather than verified complete reporting. No official outbreak threshold or clinical interpretation claimed. 41 focused map/calculation/access/fullscreen/heat tests passed; after a disease-filter isolation fix, all 22 affected tests passed again. Syntax and scoped Git checks passed. Read-only actual local database query returned all seven barangays with ten assessments each. Isolated Chrome at 366px panel width showed a synthetic red activity signal with a separate Mild patient; DOM assessment/explanation checks true and no header clipping, screenshot inspected. Actual signed-in end-to-end map interaction not run. Local server restarted hidden on loopback PID 2112 with frontend and previously authorized CMP preview enabled; health/page 200, anonymous map API 401. Forecast CSV hash unchanged. No DB writes/migration, Azure deployment, model fitting or public tunnel. External evidence: live-map-activity-20261116. Supersedes the preceding Not assessed-only UI task.

Future authorized Azure release: copy runtime files together and restart the application. No database migration. Test files are verification evidence, not runtime requirements.
- server/services/map-activity.js SHA256 62083353e1efc19ac7bd9ddb8085a4bc12d8587013936e5576e19885830f7381
- server/services/case-map-data.js SHA256 c036787d0acd32fcd0c3a0707c631dfbe8ff30877d75677a458f7644b0fe1f80
- assets/js/shared/map-details.js SHA256 1abc35234c9db72b3725b930bf1d7917ca37a13eea74ed422c720f7febacfa29
- assets/js/shared/health-map.js SHA256 05772bc5d101121b0be8740e75154ccb56ff5ef09f6c72bc5e04c006ea80a49a
- assets/js/shared/lazy-heatmap.js SHA256 6acf2b025c40750e96bec33e88bd7ecf8c4007cfb5f2d615e27512482224eae9
- assets/css/shared/health-map.css SHA256 d9cc7e6d4762695e2e3deab88a715995fd7b3c7bf5cab7de9d23df81a774b7cc
- mho.html SHA256 88732f42b6452cdabb589cd6f08f47f148321aba09a8957aa105d14ca7c74549
- bhw.html SHA256 e56a55f3defa12e68699d0f4d66f004716be6fd2e7a4987b4d9cdbd181f2925d


## FIXED-MAP-BANDS-20261116

2026-11-16T23:05:44.616465+08:00 - CODEX-1 completed FIXED-MAP-BANDS-20261116 locally on main/e5946d4. Explicit owner ranges installed: 1-10 Mild green, 11-20 Monitored orange, 21+ High Risk red, zero neutral No recorded cases. Replaces prior mean/SD policy. Combined last-seven-day total shown at circle center now determines its color; each disease row uses the same ranges. History and individual severity do not change the bands. Existing Philippine dates, recording eligibility, BHW scope and separate active severity retained. Query window simplified to seven days. Popup and legends explain fixed ranges as local case-volume bands, not official outbreak thresholds. 41 focused map/calculation/access/fullscreen/heat tests passed, including 0/1/10/11/20/21/1000 and 8+8=16. Actual read-only local DB check returned all seven barangays; one case is Mild, zero cases neutral. Syntax/diff checks passed, localhost health/script 200. Hidden loopback server PID 18276 retains frontend and authorized CMP preview settings. No DB writes/migration, Azure/model/dataset/tunnel changes. Signed-in visual QA not rerun. Deployment requires these runtime files together and application restart.
- server/services/map-activity.js SHA256 99683eb758e456d4398f18a0575c63640fee8b639893ab20b87938b3bb528ef1
- assets/js/shared/map-details.js SHA256 c8816322c39603b1a204dd93e3085111833e6b466ca60cb80330869ca6dd9ffb
- assets/js/shared/health-map.js SHA256 1f75eab8b19a3ec2dd1f16d00950d53da5cab4427103441e58b05a979af9d69d
- assets/js/shared/lazy-heatmap.js SHA256 c7a4809c8e4aceb9b1e3d77a0095f8db551cdcbf2d50cb1c76bde64e29e8645f
- bhw.html SHA256 58456dfcb01fb6ddb47b36ad781e854d18fb2ee0147430134dd0cb7371af3e6c
- mho.html SHA256 4440423c937993a41a99e37e526d064735f2e0258290025bda5d761340ee51a5


## MONTHLY-MAP-BANDS-20261116

2026-11-16T23:19:53.446693+08:00 - CODEX-1 completed MONTHLY-MAP-BANDS-20261116 locally on main/e5946d4. Owner corrected case-volume counting basis to monthly. Map now counts current Philippine calendar month from day 1 through today, excludes future records, resets on local month rollover. Fixed combined-total ranges unchanged: zero neutral, 1-10 green Mild, 11-20 orange Monitored, 21+ red High Risk; these remain locally chosen case-volume bands, not official outbreak thresholds. Shared summary circle caption, popup, accessibility labels and both portals now say this month/month to date; no stale weekly wording in affected runtime files. 23 affected date/range/renderer/access tests passed including first-day inclusion, prior/future exclusion, year rollover and leap day. Four JS syntax and scoped diff checks passed. Actual read-only DB check returned seven barangays with November 1-16 window. Local loopback server restarted hidden PID 5244 retaining frontend/CMP preview settings. No DB writes/migration, dataset/model/Azure/tunnel changes. Signed-in visual QA not rerun for date/label correction. Future authorized deployment copies runtime files together and restarts application.
- server/services/map-activity.js SHA256 79e539c15cc5d6561a32a490fb61b4b6035f354bf3dd42952798212c7f3fe0a3
- assets/js/shared/map-details.js SHA256 18008afd324d9a278ac622daed99a55097990675bb1b9457ce884395f67ff9cd
- assets/js/shared/health-map.js SHA256 d94385d5d07bfdbd1c55ce4916d4aa1695a87616f4f19f363013fdae800b5775
- assets/js/shared/lazy-heatmap.js SHA256 b6a23b0e5f341cec12614eb2e92eaa32063f0b153a487b953ca78b5ca39bca8a
- bhw.html SHA256 22e850d220644227d2965fb722e7f4e267c2d2af6de4ec769839e2b2ac9453c6
- mho.html SHA256 9b2be8212cb3a6e9c05b3f95a94ec20ff2129ecde60ce8136658c808e1117986


## SUMMARY-ORDER-20261116

2026-11-16T23:24:30.777957+08:00 - CODEX-1 completed SUMMARY-ORDER-20261116 locally on main/e5946d4. User-requested order: Individual patient severity, disease breakdown, then Barangay case-activity classification. Shared BHW/MHO popup reordered, spacing adjusted, cache versions updated. Monthly counting, fixed ranges and patient data unchanged. Ten existing map-detail tests, rendered-order assertions, syntax and scoped diff checks passed. No server restart, DB/Azure/model changes. Signed-in visual check not rerun.
Future authorized Azure release copies these frontend files together. No migration/restart required.
- assets/js/shared/map-details.js SHA256 086bf4040c9e0257999644e404695b8510a714e2384f840976e44e73ff9df344
- assets/css/shared/health-map.css SHA256 80b0f26fe8f0b777e09c0283e5c0d595a75677a02a588d6d8872866945dbb7a8
- assets/js/shared/lazy-heatmap.js SHA256 d5ced07ca8667355b5972a65146dbfbe3490990551c8bd2137ab69599a4029a7
- bhw.html SHA256 263a63875e5fe66d3ce2c51bae4939c3cffaf012f6256acb03b4f546f1679929
- mho.html SHA256 682437baaa2871e465de42c1505b29c0f78ac919011bac1346f82c1022fe3492


## ACTIVE-COUNT-LABEL-20261116

2026-11-16T23:28:01.712970+08:00 - CODEX-1 completed ACTIVE-COUNT-LABEL-20261116 locally. Shared BHW/MHO map total now says Currently active case(s), with All recording dates on a second line, distinguishing it from the monthly marker count. Counting rules/data unchanged. Cache versions refreshed. Syntax and synthetic singular/plural/unchanged-total assertions passed. No DB, backend, model or Azure changes; no server restart required. Signed-in visual QA not rerun.
- assets/js/shared/map-details.js SHA256 d4693a0ab0781030059a6ca19b24307477ecfbec46fb752f7e5ea8d0e60dcee4
- assets/js/shared/lazy-heatmap.js SHA256 c9329c773179628a782ea5d29ec8e03e60ab622fd6487f78581a96cedb27ce90
- bhw.html SHA256 489b89147bd6b845f10b089d0bc4fa75124afcbdc35bcec78f3796dc5960b9f2
- mho.html SHA256 2303199f17713ad1211b380bebe05b79225ecdb63b3dfe67132f7f8bfcec84fb


## HEAT-COLORS-20261116

2026-11-16T23:41:44.453076+08:00 - CODEX-1 completed HEAT-COLORS-20261116 locally on main/e5946d4. MHO Heat View now uses the same assessed monthly activity totals/tone as Barangay Summary: 1-10 green #16a34a, 11-20 orange #d97706, 21+ red #dc2626. Replaced max-normalized active-case weights/additive Leaflet.heat interpolation with native Leaflet layerGroup/circleMarker soft fixed-category halos at supplied barangay centers; neighboring counts cannot add into a false higher band. No extra dependencies, case points or locations fabricated. Zero totals draw no halo; unavailable/invalid assessments are omitted explicitly. Legend shows fixed monthly ranges and location/risk limitations; class labels remain visible in Heat View. Existing dark basemap retained; native vectors redraw on update/resize and remove on returning to summary. BHW retains Summary-only mode. Twenty-seven focused heat/details/access/fullscreen checks passed, covering exact boundaries, relative-max independence, adjacent Mild halos, zero/missing state and switching/resize. Syntax/scoped diff checks passed; localhost served new script HTTP 200. Fresh signed-in visual QA not performed. No DB/backend/model/Azure changes or restart. Cache versions/deployment manifest updated.
Copy runtime frontend files together during a future authorized release; no migration or restart needed.
- assets/js/shared/map-heat-view.js SHA256 1088b76e18b29377f7b037812395019104f7914428d420c7b6e14813fb51aab0
- assets/js/shared/health-map.js SHA256 492b2449c493b83f82ceff5f4cadb7e89ea6b07b264612adf1f730052c70356b
- assets/js/shared/lazy-heatmap.js SHA256 039c04b36ba5f3b6b932532f4ee88245da0a3b948419596606f7f89c6687b937
- assets/css/shared/health-map.css SHA256 5aa7b17a515e87809b624ad14c49d6d86ec013305250935738c95423c388fa37
- mho.html SHA256 ab16105b9a5b6dae5525504c768935dae9a4f2ba0bf47e3cad7994e389910cfd
- bhw.html SHA256 0c53c537e4e90aa47c6741104a41a06d26a1ca4d289315c553c87f8046dd5e75


## CLEAR-OLDER-CASES-20261116 - local data maintenance only

2026-11-16T23:50:37.783435+08:00 - CODEX-1 completed CLEAR-OLDER-CASES-20261116 local data maintenance after explicit owner clarification Mark older cases Cleared; keep staff accounts. Six non-archived Active cases recorded before 2026-11-01 changed to Cleared: Caliban 1, Cansilayan 1, Minoyan 1, Salvacion 1, Sta. Rosa 2; Alegria/Blumentritt 0. All three current-month active cases preserved (Blumentritt 2, Cansilayan 1). One transaction with per-case Status Updated audit metadata recording owner-requested cleanup rather than a clinical assessment. In-transaction fingerprints verified staff accounts, resident profiles, consultation rows, case row count and all other case fields unchanged except target status/update timestamp. Independent post-commit check confirmed zero older active cases and six corresponding audit entries. No deletions, archive changes, recurring month-end automation, source/runtime/model changes or Azure updates. External aggregate-only evidence and maintenance script in clear-older-cases-20261116. Local data operation is not part of the Azure runtime copy list.
