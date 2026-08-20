const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Routes
app.use("/api", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/patients", require("./routes/patients"));
app.use("/api/diseases", require("./routes/diseases"));
app.use("/api", require("./routes/analytics"));

// Health check
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "API running" }),
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HEALTH-INTEL Server running on http://localhost:${PORT}`);
});
