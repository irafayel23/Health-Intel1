const express = require("express");
const router = express.Router();
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// BHW stats
router.get("/bhw-stats", async (req, res) => {
  try {
    const [[total]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM health_cases WHERE deleted_at IS NULL`,
    );
    const [[active]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL`,
    );
    const [[cleared]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM health_cases WHERE status = 'Cleared' AND deleted_at IS NULL`,
    );
    res.json({
      success: true,
      total: total.count,
      active: active.count,
      cleared: cleared.count,
    });
  } catch (error) {
    console.error("BHW Stats Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// MHO stats
router.get("/mho-stats", async (req, res) => {
  try {
    const [[active]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL`,
    );
    const [[recovered]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM health_cases WHERE status IN ('Recovered', 'Cleared') AND deleted_at IS NULL`,
    );
    const [[highRisk]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM health_cases WHERE status = 'Active' AND disease IN ('Dengue', 'Pneumonia', 'Tuberculosis', 'Animal Bite', 'Animal Bite / Wound') AND deleted_at IS NULL`,
    );
    res.json({
      success: true,
      data: {
        active: active.count,
        recovered: recovered.count,
        high_risk: highRisk.count,
      },
    });
  } catch (error) {
    console.error("MHO Stats Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Predictive analytics stub (replace with Python integration later)
router.get("/get-predictions", async (req, res) => {
  const timeframe = req.query.timeframe || "monthly";
  // This is placeholder data; integrate Python script later
  const mockPredictions = [
    {
      barangay: "Poblacion",
      predicted_cases: timeframe === "weekly" ? 12 : 25,
      risk_level: "High/Outbreak",
      disease: "Dengue",
    },
    {
      barangay: "Blumentritt",
      predicted_cases: timeframe === "weekly" ? 8 : 15,
      risk_level: "Medium",
      disease: "Dengue",
    },
    {
      barangay: "Minoyan",
      predicted_cases: timeframe === "weekly" ? 20 : 40,
      risk_level: "High/Outbreak",
      disease: "Dengue",
    },
    {
      barangay: "Alegria",
      predicted_cases: timeframe === "weekly" ? 3 : 8,
      risk_level: "Low",
      disease: "Dengue",
    },
  ];
  res.json({ success: true, data: mockPredictions });
});

// Demographic analytics
router.get("/analytics/demographics", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT disease, COUNT(*) AS cases FROM health_cases WHERE status = 'Active' AND deleted_at IS NULL GROUP BY disease ORDER BY cases DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Demographics Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Database aggregation failed." });
  }
});

module.exports = router;
