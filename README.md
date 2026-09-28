# HEALTH-INTEL

Municipal health recording, descriptive analytics, barangay maps and demonstration forecasts for seven configured barangays in Murcia.

## Start here

- [Setup and private configuration](docs/SETUP.md)
- [Current architecture](docs/ARCHITECTURE.md)
- [Active database schema](docs/DATABASE.md)
- [Verification](docs/TESTING_GUIDE.md)
- [Phase 2 changes and undo](analysis/phase_two/CHANGES.txt)

The active backend is `server/server.js`; automated checks live in `server/tests/`. From `server/`, run `npm ci`, then `npm start` for the API or `npm test` while MySQL is running. The connected portals are BHW, MHO, Admin and Superadmin. The standalone municipal/Mayor page is a disconnected prototype.

Forecasts currently use an AR(1) demonstration through statsmodels SARIMAX and municipal-share allocation. Seasonal model selection and real-data validation remain future work. There is no verified accuracy percentage. The data preparation tool does not import data into the live case table.
