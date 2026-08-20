const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const nodemailer = require("nodemailer");

// All routes require admin or superadmin
router.use(authenticate, authorize("admin", "superadmin"));

// Get pending users (BHW, MHO only)
router.get("/pending-users", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT system_id, email, first_name, last_name, employee_hr_id, role, created_at
       FROM users WHERE account_status = 'pending' AND role IN ('bhw', 'mho')
       ORDER BY created_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch Pending Users Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch pending requests." });
  }
});

// Approve user (generate final ID and send email)
router.post("/approve-user", async (req, res) => {
  const { temp_system_id, assigned_role } = req.body;
  const prefixes = { bhw: "BHW-", mho: "MHO-", admin: "ADM-" };
  const prefix = prefixes[assigned_role];
  if (!prefix)
    return res
      .status(400)
      .json({ success: false, error: "Invalid role assigned." });

  try {
    const [rows] = await pool.execute(
      `SELECT system_id FROM users WHERE system_id LIKE ? ORDER BY system_id DESC LIMIT 1`,
      [`${prefix}%`],
    );
    let finalId = prefix + "001";
    if (rows.length > 0) {
      const lastNumber = parseInt(rows[0].system_id.split("-")[1]);
      finalId = prefix + (lastNumber + 1).toString().padStart(3, "0");
    }

    await pool.execute(
      `UPDATE users SET system_id = ?, role = ?, account_status = 'approved' WHERE system_id = ?`,
      [finalId, assigned_role, temp_system_id],
    );

    const [userRows] = await pool.execute(
      "SELECT email, first_name FROM users WHERE system_id = ?",
      [finalId],
    );
    if (userRows.length === 0)
      return res.status(404).json({ success: false, error: "User not found." });

    const { email, first_name } = userRows[0];

    // Email sending (optional)
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const mailOptions = {
        from: `LGU Health Intelligence <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "LGU Access Approved: Your Official System ID",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #004b87;">Account Approved</h2>
            <p>Hello ${first_name},</p>
            <p>Your access request for the HEALTH-INTEL LGU Portal has been approved by Human Resources.</p>
            <p>Your official System Login ID is: <strong><span style="font-size: 1.2rem; color: #10b981;">${finalId}</span></strong></p>
            <p>Please use this ID and the password you created to log in.</p>
            <br>
            <p style="font-size: 0.8rem; color: #64748b;">This is an automated message from the Municipal Health Office.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Do not fail the whole request; just log
    }

    res.json({
      success: true,
      message: `Account Approved! Official ID generated: ${finalId}.`,
      final_id: finalId,
    });
  } catch (error) {
    console.error("Approval Error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "Database error during approval process.",
      });
  }
});

// Deny user
router.post("/deny-user", async (req, res) => {
  const { temp_system_id } = req.body;
  try {
    await pool.execute(
      `UPDATE users SET account_status = 'denied' WHERE system_id = ?`,
      [temp_system_id],
    );
    res.json({ success: true, message: "Account request denied." });
  } catch (error) {
    console.error("Deny Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Database error during denial." });
  }
});

// Undo deny
router.post("/undo-deny", async (req, res) => {
  const { temp_system_id } = req.body;
  try {
    await pool.execute(
      `UPDATE users SET account_status = 'pending' WHERE system_id = ?`,
      [temp_system_id],
    );
    res.json({ success: true, message: "Account returned to pending status." });
  } catch (error) {
    console.error("Undo Deny Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Database error during undo process." });
  }
});

// Get denied users
router.get("/denied-users", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT system_id, first_name, last_name, employee_hr_id
       FROM users WHERE account_status = 'denied' ORDER BY created_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch Denied Users Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch denied requests." });
  }
});

module.exports = router;
