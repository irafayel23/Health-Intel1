# Project Changelog & Handoff Status

## Completed Work
- Initial UI Mockups & HTML templates (`admin.html`, `bhw.html`, `mho.html`, `index.html`, etc.) are completed.
- Python SARIMA predictive engine prototyped (`test/analytics.py`).
- Initial Express Node.js servers created in `test/` and `client/server/` to prototype IAM, Auth, and DB logic.

## Pending Work
- **Consolidate Backend**: There are multiple backend servers (`test/server.js` and `client/server/server.js`). Pick the most complete one, review it, and standardize it in `client/server`.
- **API Wiring**: The frontend HTML files currently rely on mockup Vanilla JS. Wire them to the live Node.js REST API using `fetch()`.
- **Database Standardization**: Apply the official SQL schema to the MySQL instance. 

## Known Bugs / Discrepancies
> [!WARNING]
> **Database Schema Mismatch**: The official spec (`DATABASE.md`) differs from the actual implementation found in `test/server.js`.
> 
> *Examples:*
> - Official: `patient_records` | Prototype: `health_cases`
> - Official: `audit_logs` | Prototype: `system_audit_logs`
> - Official: `is_archived` (boolean) | Prototype: `deleted_at` (timestamp)
> - Official uses `status` ENUM for Users | Prototype uses `account_status`.
> 
> **Resolution needed**: The next AI Agent should refactor the Node.js backend to strictly match the official SQL schema defined in `DATABASE.md`.

## Important Context
- **Deployment**: Be cautious of file paths when serving the SPA frontend.
- **AI Analytics Engine**: Ensure the Node.js backend has permission and the correct environment to spawn the Python process (`python analytics.py`). You may need to ensure `pandas` and `statsmodels` are installed in the production environment.
