const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const router = express.Router();

// Auto-generate ID based on role
router.post("/get-next-id", async (req, res) => {
  const { role } = req.body;
  const prefixes = { bhw: "BHW-", mho: "MHO-", admin: "ADM-" };
  const prefix = prefixes[role];
  if (!prefix)
    return res.status(400).json({ success: false, error: "Invalid role" });

  try {
    const [rows] = await pool.execute(
      `SELECT system_id FROM users WHERE system_id LIKE ? ORDER BY system_id DESC LIMIT 1`,
      [`${prefix}%`],
    );
    let nextNumber = 1;
    if (rows.length > 0) {
      const lastNumber = parseInt(rows[0].system_id.split("-")[1]);
      nextNumber = lastNumber + 1;
    }
    const finalId = prefix + nextNumber.toString().padStart(3, "0");
    res.json({ success: true, next_id: finalId });
  } catch (error) {
    console.error("ID Generation Error:", error);
    res.status(500).json({ success: false, error: "Database error" });
  }
});

// Register new user
router.post(
  "/register",
  [
    body("first_name").notEmpty().trim(),
    body("last_name").notEmpty().trim(),
    body("role").isIn(["bhw", "mho", "admin"]),
    body("system_id").notEmpty().trim(),
    body("employee_hr_id").notEmpty().trim(),
    body("password").isLength({ min: 6 }),
    body("email").isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      first_name,
      last_name,
      role,
      system_id,
      employee_hr_id,
      password,
      email,
      assigned_barangay,
    } = req.body;
    const finalBarangay = role === "bhw" ? assigned_barangay : "Municipality";

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute(
        `INSERT INTO users (first_name, last_name, email, role, system_id, employee_hr_id, password_hash, assigned_barangay, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          first_name,
          last_name,
          email,
          role,
          system_id,
          employee_hr_id,
          hashedPassword,
          finalBarangay,
        ],
      );
      res.json({
        success: true,
        message: "Registration submitted for HR Approval.",
      });
    } catch (error) {
      console.error("Registration Error:", error);
      res
        .status(500)
        .json({ success: false, error: "Database error during registration." });
    }
  },
);

// Login
router.post(
  "/login",
  [body("system_id").notEmpty().trim(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { system_id, password } = req.body;
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM users WHERE system_id = ?",
        [system_id],
      );
      if (rows.length === 0)
        return res
          .status(401)
          .json({ success: false, error: "Invalid System ID or Password." });

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid)
        return res
          .status(401)
          .json({ success: false, error: "Invalid System ID or Password." });

      if (user.account_status === "pending")
        return res
          .status(403)
          .json({
            success: false,
            error: "Account pending. Please wait for MHO Admin approval.",
          });
      if (user.account_status === "denied")
        return res
          .status(403)
          .json({ success: false, error: "Account access denied by HR." });

      const token = jwt.sign(
        { system_id: user.system_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "8h" },
      );

      res.json({
        success: true,
        token,
        role: user.role,
        redirect: `/${user.role}`,
      });
    } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ success: false, error: "Internal server error." });
    }
  },
);

module.exports = router;
