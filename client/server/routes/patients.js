const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

// All patient routes require authenticated user (any role)
router.use(authenticate);

// Create patient
router.post("/", async (req, res) => {
  const {
    first_name,
    last_name,
    patient_name,
    age,
    purok,
    disease,
    remarks,
    sex,
  } = req.body;
  const finalName = patient_name || `${first_name} ${last_name}`;
  try {
    await pool.execute(
      `INSERT INTO health_cases (first_name, last_name, patient_name, age, purok, disease, remarks, sex, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        first_name,
        last_name,
        finalName,
        age,
        purok,
        disease,
        remarks,
        sex || "Unknown",
      ],
    );
    res.json({ success: true, message: "Patient recorded successfully!" });
  } catch (error) {
    console.error("Create Patient Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Get active patients
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM health_cases WHERE deleted_at IS NULL ORDER BY created_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Read Patients Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Get archived patients
router.get("/archived", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM health_cases WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Read Archived Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Update patient status
router.put("/:id/status", async (req, res) => {
  const { new_status } = req.body;
  try {
    await pool.execute(`UPDATE health_cases SET status = ? WHERE id = ?`, [
      new_status,
      req.params.id,
    ]);
    res.json({ success: true, message: "Patient status updated!" });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Archive patient
router.put("/:id/archive", async (req, res) => {
  try {
    await pool.execute(
      `UPDATE health_cases SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id],
    );
    res.json({ success: true, message: "Record moved to archive." });
  } catch (error) {
    console.error("Archive Patient Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Restore patient
router.put("/:id/restore", async (req, res) => {
  try {
    await pool.execute(
      `UPDATE health_cases SET deleted_at = NULL, status = 'Active' WHERE id = ?`,
      [req.params.id],
    );
    res.json({ success: true, message: "Record restored successfully." });
  } catch (error) {
    console.error("Restore Patient Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

module.exports = router;
