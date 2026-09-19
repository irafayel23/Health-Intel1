# HEALTH-INTEL: CAPSTONE DEFENSE MASTER NOTES
*Generated for Defense Preparation*

This document contains all the recent system upgrades, technical mechanics, and answers to potential panel questions based on the latest codebase updates.

---

## PART 1: MISSING ITEMS IN THE MANUSCRIPT
*You must update your Chapter 3 manuscript to include these 5 recently added features:*

**1. Database Schema Diagram (Page 25)**
- **Add:** The new `password_resets` table. It should connect to the `USER` table.
- **Fields:** `id`, `email`, `token` (the 6-digit OTP), `expires_at`.

**2. Use Case Diagram (Page 24)**
- **Add:** A new use case bubble called **"Reset Forgotten Password (OTP)"**. Connect this to the BHW and MHO actors.

**3. Security Architecture / ISO 25010 (Page 31)**
- **Add:** Explicitly mention **"API Rate Limiting"**. The system uses `express-rate-limit` to protect login routes against brute-force bot attacks and DDoS spam.

**4. MHO Dashboard / Descriptive Analytics (Page 27/28)**
- **Add:** Mention the **"Automated Insights Engine"**. The system features a custom Javascript function (`generateInsights()`) that automatically reads chart data and generates human-readable text summaries (e.g., *"In CY 2026, the leading cause of morbidity is Dengue..."*).

**5. Input Screens Layout (Page 28)**
- **Add:** Mention the **OTP Password Recovery Screen**. Explain that it is built as a Single Page Application (SPA), allowing users to securely enter their 6-digit email code without leaving the gateway/index page.

---

## PART 2: TECHNICAL DEFENSE ANSWERS (Q&A)
*Use these answers if the panel grills you on the system's architecture.*

**Q: How does the "Forgot Password" system work technically?**
**A:** "We implemented a 6-digit OTP (One-Time Password) system. When a user requests a reset, the Node.js server generates a random 6-digit code, saves it to the `password_resets` database table with a 15-minute expiration, and uses `nodemailer` to dispatch it to their registered Gmail. The UI seamlessly transitions into a reset screen where they input the OTP and their new password."

**Q: Why does the system route you back to the Login Page after resetting your password?**
**A:** "This is a strict security measure. It forces the user to re-authenticate with their new credentials to prove they didn't make a typo. More importantly, it allows the backend to generate a fresh, secure JWT (JSON Web Token) for their dashboard session. Bypassing the login screen would create a session vulnerability."

**Q: Why do you have 'Forgot Password' on the login screen AND 'Change Password' inside the dashboard? Isn't that redundant?**
**A:** "No, they serve two different architectural purposes. 'Change Password' is for Authenticated Password Rotation (for users safely logged in). 'Forgot Password' is for Unauthenticated Password Recovery (for users completely locked out). Modern security standards require both."

**Q: Do you have a separate database for Gmail?**
**A:** "No, there is no separate 'Gmail Database'. The system efficiently utilizes the existing `email` column inside the `users` table. The `nodemailer` package simply acts as a digital courier to send the messages."

**Q: How do we track exactly WHO registered a patient? Can the admin see it?**
**A:** "Yes. Every patient record in the `health_cases` table has an `encoded_by` foreign key. We updated the Master Records table in the Admin dashboard to explicitly display the 'Encoded By' and 'Last Updated' columns so administrators have instant accountability without needing to dig through the security logs."

**Q: How do you prevent brute-force login attacks (Robot looping)?**
**A:** "We implemented an API Rate Limiter middleware in the Node.js server. If an IP address attempts to hit the login route too many times in a short window, the server automatically blocks them for 60 seconds."

---

## PART 3: HIDDEN CODE MECHANICS
*Critical system behaviors you must remember:*

1. **The Superadmin Payload Bug:** When suspending/restoring users in `superadmin.html`, the Javascript sends the payload as `temp_system_id` (not `system_id`).
2. **Audit Trail Tracking:** The system tracks both *When* a record was edited (via `updated_at` in `health_cases`) and *Who* edited it (via automatic INSERTs into the `system_audit_logs` table during the `/api/update-case` route).
3. **ID Generation:** IDs are automatically generated based on role prefixes (BHW-001, MHO-002, ADM-001) during the registration phase in `index.html`.
4. **Dummy Data:** The database currently contains 70 realistic injected cases (Dengue, Hypertension) for the years 2025 and 2026 to ensure the Heatmaps and YoY charts look perfectly populated during the presentation.

