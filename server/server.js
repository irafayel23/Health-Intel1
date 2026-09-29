require('./security-config').loadEnvironment();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { createAccessControl, loadJwtSecret } = require('./access-control');
const { handlers } = require('./qa-fixes');
const { handlers: correctionHandlers } = require('./case-corrections');
const { registerAuthRoutes } = require('./auth-routes');
const { registerIdentityRoutes } = require('./identity-routes');
const { registerCaseRoutes } = require('./case-routes');
const { registerAnalyticsRoutes } = require('./analytics-routes');
const { registerMhoReportRoutes } = require('./mho-reports');
const { registerBackupRoutes } = require('./backup-routes');
const JWT_SECRET = loadJwtSecret();
const projectPython = path.join(__dirname, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const pythonExecutable = process.env.PYTHON_PATH || (fs.existsSync(projectPython) ? projectPython : 'python');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// 1. DATABASE CONNECTION (The Vault)
// ==========================================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'health_intel'
};
const db = mysql.createPool(dbConfig);
const qa = handlers(db);
const corrections = correctionHandlers(db);
app.use('/api', createAccessControl(db, JWT_SECRET));
app.get('/api/session', (req, res) => res.json({ success: true, user: req.user }));

registerAuthRoutes(app, db, qa, JWT_SECRET);
registerIdentityRoutes(app, db, dbConfig);
registerCaseRoutes(app, db, qa, corrections);
registerAnalyticsRoutes(app, db, qa, pythonExecutable);
registerMhoReportRoutes(app, db);
registerBackupRoutes(app, db, dbConfig);

if (require.main === module) {
    app.listen(Number(process.env.PORT || 3000), () => {
        console.log('HEALTH-INTEL server is ready.');
    });
}
module.exports = { app, db, dbConfig };
