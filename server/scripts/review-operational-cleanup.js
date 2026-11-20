'use strict';

// Inventory only. Exact deletion plans require reviewed provenance and a verified backup.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { loadEnvironment } = require('../config/security-config');

async function inventory(db) {
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    try {
        const [[{ present }]] = await db.query("SELECT COUNT(*) AS present FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='case_records'");
        const source = present ? 'case_records' : 'health_cases';
        const [cases] = await db.query("SELECT c.id,c.resident_id FROM " + source + " c WHERE c.encoded_by='DEMO-MHO' AND c.remarks LIKE '%synthetic%' ORDER BY c.id");
        const [dependencies] = await db.query("SELECT TABLE_NAME AS child,COLUMN_NAME AS column_name,REFERENCED_TABLE_NAME AS parent FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IN ('health_cases','residents','case_visits') ORDER BY child,column_name");
        const [[totals]] = await db.query('SELECT (SELECT COUNT(*) FROM health_cases) AS cases,(SELECT COUNT(*) FROM residents) AS residents,(SELECT COUNT(*) FROM case_visits) AS visits');
        const [visits] = await db.query('SELECT v.id,v.case_id FROM case_visits v JOIN ' + source + " c ON c.id=v.case_id WHERE c.encoded_by='DEMO-MHO' AND c.remarks LIKE '%synthetic%' ORDER BY v.id");
        const [shared] = await db.query('SELECT DISTINCT c.resident_id FROM ' + source + ' c JOIN ' + source + " other ON other.resident_id=c.resident_id AND NOT (COALESCE(other.encoded_by,'')='DEMO-MHO' AND COALESCE(other.remarks,'') LIKE '%synthetic%') WHERE c.encoded_by='DEMO-MHO' AND c.remarks LIKE '%synthetic%' ORDER BY c.resident_id");
        return {
            created_at: new Date().toISOString(),
            mode: 'dry-run',
            provenance: 'DEMO-MHO synthetic-marked batch documented in BETA-DATA-001, 28 October 2026. Later edits still require review.',
            totals,
            candidate_cases: cases,
            candidate_case_ids_sha256: crypto.createHash('sha256').update(JSON.stringify(cases.map(row => row.id))).digest('hex'),
            linked_visits: visits,
            shared_residents_to_preserve: shared,
            dependencies,
            deletion_approved: false
        };
    } finally {
        await db.rollback();
    }
}

async function main() {
    const outputIndex = process.argv.indexOf('--output');
    const output = process.argv[outputIndex + 1];
    if (process.argv.includes('--apply') || outputIndex < 0 || !output) {
        throw new Error('Use --output <private directory> for a dry run. Deletion requires a separately approved plan.');
    }
    const directory = path.resolve(output);
    const relative = path.relative(path.resolve(__dirname, '../..'), directory);
    if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) {
        throw new Error('Choose a private directory outside the application checkout.');
    }
    loadEnvironment();
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'health_intel'
    });
    try {
        const result = await inventory(db);
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        const file = path.join(directory, 'cleanup-inventory-' + Date.now() + '.json');
        fs.writeFileSync(file, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ mode: 'dry-run', candidate_cases: result.candidate_cases.length, linked_visits: result.linked_visits.length, shared_residents: result.shared_residents_to_preserve.length, inventory_file: file }));
    } finally {
        await db.end();
    }
}

if (require.main === module) main().catch(error => {
    console.error(error.code ? 'Inventory failed. Check database access and schema.' : error.message);
    process.exitCode = 1;
});

module.exports = { inventory };

