# Project To-Do List

## 1. Database Improvements
- [ ] **Add Geolocation Data**: Add `latitude` and `longitude` (DECIMAL) columns to the `health_cases` table to enable exact point clustering for the Leaflet GIS Heatmap.
- [ ] **Separate Location Fields**: Split the mixed `purok` column data into distinct `barangay` and `purok` columns in the `health_cases` table to match the `users` table assignment logic.
- [ ] **Enforce Foreign Keys**: Change the `disease` column in `health_cases` to an integer (`disease_id`) that references the `disease_registry(id)` table to prevent typos and maintain data integrity.
- [ ] **Standardize Names**: Consolidate `patient_name`, `first_name`, and `last_name` into a consistent format (e.g., just `first_name` and `last_name`) for BHW data entry.

## 2. Predictive Analytics (SARIMA) Integration
- [ ] **Node.js Data Aggregation**: Write a query in `server.js` that groups `health_cases` by Date (month), Barangay, and Disease, outputting only the total `Cases`. This naturally anonymizes the data.
- [ ] **Python Data Bridge**: Update the Node.js route to pass this aggregated data directly to `analytics.py` (via `stdin` or temp CSV) without Python connecting to the DB.
- [ ] **SARIMA Script Update**: Refine `analytics.py` to accept the dynamic data, fit the model, and return predicted cases in JSON format.
