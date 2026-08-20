const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate, authorize("superadmin"));

// Get pending admins
router.get("/pending-admins", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT system_id, email, first_name, last_name, employee_hr_id, role, created_at
       FROM users WHERE account_status = 'pending' AND role = 'admin'
       ORDER BY created_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch Pending Admins Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch pending admins." });
  }
});

// Approve admin
router.post("/approve-admin", async (req, res) => {
  const { system_id } = req.body;
  try {
    await pool.execute(
      `UPDATE users SET account_status = 'approved' WHERE system_id = ?`,
      [system_id],
    );
    res.json({
      success: true,
      message: `LGU Admin ${system_id} is now fully operational.`,
    });
  } catch (error) {
    console.error("Approve Admin Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Database error during approval." });
  }
});

// System health
router.get("/health", async (req, res) => {
  try {
    const [[dbSize]] = await pool.execute(
      `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
       FROM information_schema.TABLES WHERE table_schema = ?`,
      [process.env.DB_NAME],
    );
    const [[userCount]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM users`,
    );
    const [[patientCount]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM health_cases`,
    );

    res.json({
      success: true,
      data: {
        uptime: Math.floor(process.uptime()),
        db_size: dbSize?.size_mb || 0,
        total_users: userCount.count,
        total_records: patientCount.count,
        status: "OPTIMAL",
      },
    });
  } catch (error) {
    console.error("System Health Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Audit logs
router.get("/audit-logs", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM system_audit_logs ORDER BY created_at DESC LIMIT 50`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Audit Logs Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

module.exports = router;
