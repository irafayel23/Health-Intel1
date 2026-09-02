# Architecture Guidelines

## Frontend Architecture
- **Single-Page Application (SPA)**: The application should feel like an SPA but without using heavy frameworks. 
- **View Toggling**: Use hidden/active view toggles in Vanilla JS to switch between modules within a page (e.g., hiding the dashboard section and showing the records section).
- **Layout**: Responsive sidebar-to-main-content layout architecture.
- **Library Integration**:
  - Chart.js for data visualization (Descriptive Analytics).
  - Leaflet.js for GIS Heatmap.
  - jsPDF for Client-side report generation.

## Backend Architecture
- **Node.js (Express)**: Acts as the primary API gateway and business logic layer.
- **Database Connection**: Uses `mysql2` pool for database interactions.
- **Authentication**: JWT-based stateless authentication after initial login.

## AI Engine Integration
- **Isolation**: The Python predictive engine (`analytics.py`) must be kept mechanically isolated from the live MySQL database.
- **Execution Flow**:
  1. Node.js retrieves necessary data from MySQL.
  2. Node.js writes to a CSV (or passes via stdin/args) or simply calls the Python script using `child_process.spawn`.
  3. Python runs the SARIMA model using `pmdarima`/`statsmodels`.
  4. Python outputs JSON to stdout.
  5. Node.js parses the stdout and serves it to the frontend.
- **Reasoning**: Prevents locking or latency during heavy mathematical forecasting on the main event loop.

## Security
- **Zero-Trust Registration**: All new registrations start as 'Pending' and require explicit HR/Admin approval before granting access.
- **Audit Trails**: Critical actions (Approval, Archiving, Data Entry) must be logged immutably.
