# HEALTH-INTEL

Municipal health recording, descriptive analytics, barangay maps and demonstration forecasts for seven configured barangays in Murcia.

## Start here

- [Setup and private configuration](docs/SETUP.md)
- [Current architecture](docs/ARCHITECTURE.md)
- [Active database schema](docs/DATABASE.md)
- [Verification](docs/TESTING_GUIDE.md)
- [Phase 2 changes and undo](analysis/phase_two/CHANGES.txt)

The active backend is `server/server.js`; automated checks live in `server/tests/`. From `server/`, run `npm ci`, then `npm start` for the API or `npm test` while MySQL is running. The connected portals are BHW, MHO, Admin and Superadmin. The standalone municipal/Mayor page is a disconnected prototype.

Backend endpoints live in `server/routes/`, operations and validation in `server/services/`, authorization in `server/middleware/`, configuration in `server/config/`, and maintenance commands in `server/scripts/`. Existing CSV files are grouped in `server/data/`. Private `.env`, the local JWT secret, Node dependencies and the Python environment stay under `server/`.

Admin behavior is split into `admin-shell.js`, `admin-users.js`, `admin-records.js`, `admin-registry.js` and `admin-audit.js` under `assets/js/`. `admin.html` loads them in that order. See [architecture and recovery instructions](docs/ARCHITECTURE.md) before changing paths or undoing the folder refactor.

Forecasts currently use an AR(1) demonstration through statsmodels SARIMAX and municipal-share allocation. Seasonal model selection and real-data validation remain future work. There is no verified accuracy percentage. The data preparation tool does not import data into the live case table.
