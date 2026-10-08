# Free hosting options for HEALTH-INTEL

Checked against provider documentation on 3 October 2026. No account, subscription, resource or public deployment was created. Confirm current eligibility/allowances in the account before provisioning.

The system needs Node, Python, MySQL and a dump utility. A persistent VM fits the prepared single-server profile without changing the database engine.

| Option | Current offer | Fit and remaining work |
| --- | --- | --- |
| Azure for Students | Eligible students receive $100 credit for 12 months without a credit card; additional service allowances may apply | First option to check for this capstone. Verify school eligibility, selected VM/storage/network charges and remaining credit. This is a limited allowance, not unlimited permanent hosting. |
| Oracle Always Free | Current A1 allowance equivalent to 2 OCPUs/12 GB RAM, plus eligible storage within limits | A VM can host the complete stack. Capacity may be unavailable and idle instances can be reclaimed. Test pinned dependencies on ARM, keep independent backups and select eligible resources only. |
| Render Free | Web service sleeps after 15 minutes idle; no persistent disk on this tier | Requires a separate compatible DB and reviewed hybrid-runtime build. Remote DB TLS for Node/Python/dump tools and schema/restore compatibility need work; the current profile is not ready for this arrangement. |

The existing friend demo can continue independently. A VM removes the need to keep the user's PC running, but still needs administration. A custom domain is a separate choice/cost; free server allowances do not include it automatically.

Recommendation: check Azure student eligibility first; consider Oracle capacity if unavailable. Render is a later alternative after remote DB preparation. Hosting feasibility does not establish suitability for live municipal data; staging and deployment/report acceptance checks still apply.

Sources:

- [Azure for Students](https://azure.microsoft.com/en-us/free/students)
- [Oracle Always Free limits and reclamation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Render free-service limitations](https://render.com/docs/free)

Continue with `deployment_guide.md`; no provider was selected automatically.
