# HEALTH-INTEL

Municipal health recording, descriptive analytics, barangay maps and demonstration forecasts for seven configured barangays in Murcia.

## Start here

- [Setup and private configuration](docs/SETUP.md)
- [Current architecture](docs/ARCHITECTURE.md)
- [Active database schema](docs/DATABASE.md)
- [Disease encoding, MHO review and recovery](docs/DISEASE_REGISTRY.md)
- [Verification](docs/TESTING_GUIDE.md)
- [Phase 2 changes and undo](analysis/phase_two/CHANGES.txt)

The active backend is `server/server.js`; automated checks live in `server/tests/`. From `server/`, run `npm ci`, then `npm start` for the API or `npm test` while MySQL is running. The connected portals are BHW, MHO, Admin and Superadmin. Disconnected registration/municipal prototypes and unused frontend files are preserved in [the legacy archive](legacy/README.md).

Backend endpoints live in `server/routes/`, operations and validation in `server/services/`, authorization in `server/middleware/`, configuration in `server/config/`, and maintenance commands in `server/scripts/`. Existing CSV files are grouped in `server/data/`. Private `.env`, the local JWT secret, Node dependencies and the Python environment stay under `server/`.

Registration, account status, disease registry and case lifecycle now have separate service modules. Shared transaction and validation/error helpers replace the former mixed `qa-fixes.js`; API behavior and database schema are preserved. Service ownership and code-only rollback checkpoints are documented in `docs/ARCHITECTURE.md`.

All route files now delegate database queries/transactions to services for encoding, resident/case records, maps, accounts, analytics, review, reports and backup auditing. Routes retain HTTP handling, rate limits and delivery/process control. The full suite has 69 checks, including rollback of new resident/case rows when encoding audit persistence fails.

Connected page behavior is split into feature scripts in `assets/js/admin/`, `bhw/`, `mho/`, `index/` and `superadmin/`. Reused browser helpers live in `assets/js/shared/`. Styles follow role folders under `assets/css/`, with common styles in `shared/`. Unused older styles and local library copies live under the separate `legacy/` archive. Each HTML page defines its required script order. See [architecture and recovery instructions](docs/ARCHITECTURE.md) before changing paths or undoing a refactor. No frontend build command is required.

Forecasts currently use an AR(1) demonstration through statsmodels SARIMAX and municipal-share allocation. Seasonal model selection and real-data validation remain future work. There is no verified accuracy percentage. The data preparation tool does not import data into the live case table.
