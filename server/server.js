require('./config/security-config').loadEnvironment();
const express = require('express');
const {registerMonthlyPredictionRoutes}=require('./routes/monthly-prediction-routes');
const { readDeploymentConfig, configureDeployment } = require('./config/deployment-config');
const mysql = require('mysql2/promise');
const { createAccessControl, loadJwtSecret } = require('./middleware/access-control');
const { handlers: correctionHandlers } = require('./services/case-corrections');
const { registerAuthRoutes } = require('./routes/auth-routes');
const { registerIdentityRoutes } = require('./routes/identity-routes');
const { registerCaseRoutes } = require('./routes/case-routes');
const { registerAnalyticsRoutes } = require('./routes/analytics-routes');
const { registerBalancedSarimaRoutes, registerBhwSarimaRoutes } = require('./routes/balanced-sarima-routes');
const { registerMhoReportRoutes } = require('./routes/mho-reports');
const { registerDailyReportRoutes } = require('./routes/daily-reports');
const { registerResidentVitalRoutes } = require('./routes/resident-vital-routes');
const { registerMhoPatientRoutes } = require('./routes/mho-patients');
const { registerFollowupTracking } = require('./routes/followup-tracking');
const { registerBackupRoutes } = require('./routes/backup-routes');
const { registerDiseaseReviewRoutes } = require('./routes/disease-review-routes');
const JWT_SECRET = loadJwtSecret();
const app = express();
const deployment = readDeploymentConfig();
configureDeployment(app, deployment);
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
const { createDatabaseFacade } = require('./services/normalized-schema');
const db = createDatabaseFacade(mysql.createPool(dbConfig));
const corrections = correctionHandlers(db);
app.use('/api', createAccessControl(db, JWT_SECRET));
app.get('/api/session', (req, res) => res.json({ success: true, user: req.user }));

registerAuthRoutes(app, db, JWT_SECRET);
registerIdentityRoutes(app, db, dbConfig);
registerCaseRoutes(app, db, corrections);
registerDiseaseReviewRoutes(app, db);
registerAnalyticsRoutes(app, db);
registerBalancedSarimaRoutes(app);
registerBhwSarimaRoutes(app, db);
if (!deployment.production) registerMonthlyPredictionRoutes(app, db);
registerMhoReportRoutes(app, db);
registerDailyReportRoutes(app, db);
registerResidentVitalRoutes(app, db);
registerMhoPatientRoutes(app, db);
registerFollowupTracking(app, db);
registerBackupRoutes(app, db, dbConfig);

if (require.main === module) {
    const listener = app.listen(deployment.port, deployment.host, () => {
        console.log('HEALTH-INTEL server is ready.');
    });
    let stopping = false;
    const stop = () => {
        if (stopping) return;
        stopping = true;
        const deadline = setTimeout(() => process.exit(1), 30000);
        deadline.unref();
        listener.close(async () => {
            try { await db.end(); clearTimeout(deadline); process.exit(0); }
            catch { process.exit(1); }
        });
    };
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
}
module.exports = { app, db, dbConfig };
