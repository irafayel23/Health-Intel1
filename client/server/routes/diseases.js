const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate, authorize("admin", "superadmin"));

// Create disease
router.post("/", async (req, res) => {
  const { name, category, classification } = req.body;
  if (!name)
    return res
      .status(400)
      .json({ success: false, error: "Disease name required." });
  try {
    await pool.execute(
      `INSERT INTO disease_registry (name, category, classification) VALUES (?, ?, ?)`,
      [name, category, classification],
    );
    res.json({ success: true, message: "Disease added to registry!" });
  } catch (error) {
    console.error("Add Disease Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Get active diseases
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM disease_registry WHERE deleted_at IS NULL ORDER BY name ASC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get Diseases Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Get archived diseases
router.get("/archived", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM disease_registry WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get Archived Diseases Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Archive disease
router.put("/:id/archive", async (req, res) => {
  try {
    await pool.execute(
      `UPDATE disease_registry SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id],
    );
    res.json({ success: true, message: "Disease archived." });
  } catch (error) {
    console.error("Archive Disease Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Restore disease
router.put("/:id/restore", async (req, res) => {
  try {
    await pool.execute(
      `UPDATE disease_registry SET deleted_at = NULL WHERE id = ?`,
      [req.params.id],
    );
    res.json({ success: true, message: "Disease restored." });
  } catch (error) {
    console.error("Restore Disease Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

module.exports = router;
