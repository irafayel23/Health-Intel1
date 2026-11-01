# Municipal analytics: saved-record view

On 19 October 2026, the owner requested removal of the Recorded data / Show sample data bar. The bar and its frontend mode-switch handler were removed locally and on Azure. Municipal analytics now requests the saved-record endpoints without the sample flag. Remaining references to the removed checkbox were cleaned up in the breakdown accessibility label and scope label. The analytics script URL was versioned so browsers load the matching JavaScript.

The API's separate illustrative sample capability was not removed. Saved test records remain saved records; removing this control does not certify the dataset as actual officially reported disease data. No case, resident, consultation or disease-catalog rows were changed for this UI update.

Validation: JavaScript syntax check; no remaining frontend references to the removed control; public HTML and script both returned 200 with the expected removal. Browser verification used the newly created BETA-MHO-001 account: the bar was absent, the all-years total loaded as 1,154, selecting CY 2025 updated it to 306, and the age-group breakdown displayed its corresponding counts. The page was returned to All Years.

Azure retained the two prior static files in `/home/azureuser/analytics-preview-removal-1792401596/`. The database service and application did not need a restart.

The owner separately confirmed creation of BETA-MHO-001, BETA-MHO-002 and BETA-MHO-003 on Azure. All three are approved MHO accounts. Their requested password is bcrypt-hashed; it is not documented here. Each account passed a real public login, session check, MHO analytics access, logout and ended-session rejection check. Existing account IDs were protected against accidental overwrite. Account creation and sign-ins produced audit records. These accounts were created on Azure only.
