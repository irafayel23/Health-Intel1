# Verification

From `proposal/test`, run:

```text
npm run test:phase-two
```

The suite creates uniquely named temporary databases, restores a real SQL dump, adds disposable fixtures, starts an ephemeral API and drops only the guarded temporary databases afterward. It fingerprints every production table before and after and asserts that source records did not change. MySQL must be running and test credentials must permit temporary database creation. Tests never send external emails.

The earlier 13 checks cover anonymous/role/barangay protection, session state, encrypted backup restore, PDF endpoints, forecast availability without fabricated accuracy, page script parsing, API session behavior and MHO analytics filters.

Phase 2 checks cover explicit case dates, computed ages, severity, resident links, repeated/concurrent duplicate submissions, archived/unknown categories, date validation, email injection, password byte limits, hashed reset codes, expiry, failed-attempt persistence, single use under concurrency, old-session revocation, public reset routes, rate limits, mocked mail failures and aggregate CSV provenance/missing-report/review behavior.

Date-only database assertions use SQL YYYY-MM-DD formatting, avoiding UTC shifts when the test machine is in Philippine time. The first Phase 2 run exposed that assertion issue; the corrected check verifies the actual SQL date.

Browser verification uses a disposable database and fake accounts. Do not use real patient identities or reset real credentials for demonstration tests. Real SMTP delivery must be checked separately with a deliberately chosen recipient; the automated tests do not establish inbox delivery.

Data review commands are read-only. Verify output labels and review held rows before any future import or model evaluation. Demonstration data results do not measure real Murcia forecasting accuracy.
