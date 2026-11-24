const mysql = require('../server/node_modules/mysql2/promise');
const { loadEnvironment } = require('../server/config/security-config');
const { createStaffAccess } = require('../server/services/staff-access');
const { createStaffActivation } = require('../server/services/staff-activation');

async function main() {
    loadEnvironment();
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'health_intel'
    });
    try {
        await createStaffActivation(db).initialize();
        await createStaffAccess(db).initialize();
        console.log('Staff activation and access tables are ready.');
    } finally {
        await db.end();
    }
}

main().catch(error => {
    console.error('Staff activation storage could not be prepared:', error.code || error.name);
    process.exitCode = 1;
});
