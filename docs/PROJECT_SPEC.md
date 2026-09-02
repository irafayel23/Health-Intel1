# Project Specification: HEALTH-INTEL

## System Overview
**HEALTH-INTEL** is an LGU (Local Government Unit) Disease Surveillance & Mapping System. It tracks health records at the barangay level, maps outbreaks geographically, and uses AI to predict disease trends.

## Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS
- **UI Libraries**: Chart.js, Leaflet.js, jsPDF, SweetAlert2, Lucide Icons
- **Backend**: Node.js (Express.js)
- **AI Engine**: Python (pmdarima / pandas)
- **Database**: MySQL

## User Roles
1. **Barangay Health Worker (BHW)**
   - Encodes daily patient records.
   - Monitors local barangay health status.
   - Tracks household surveillance.
2. **Municipal Health Officer (MHO)**
   - Views municipality-wide analytics.
   - Reviews AI predictions.
   - Exports official DOH reports.
3. **LGU Admin**
   - Approves/denies user accounts (IAM).
   - Manages the master disease registry.
   - Oversees the security audit trail.
4. **Super Admin**
   - Monitors server telemetry, API traffic, and raw database health.

## Core Modules
- **Descriptive Analytics**: Dynamic filtering of demographic and morbidity/mortality health data.
- **GIS Heatmap**: Geographic clustering of active cases using Leaflet and OpenStreetMap.
- **Predictive Analytics**: Auto-ARIMA (SARIMA) model forecasting with automated Decision Support System (DSS) alerts.
- **Report Generation**: Automated compilation of print-ready FHSIS (Monthly) and PIDSR (Weekly) certified PDFs.
- **Master Records**: Patient profiling, medical dossiers, and data archiving/restoration.
- **Identity & Access Management (IAM)**: Role assignment and personnel directories.
