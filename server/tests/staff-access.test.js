const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { createStaffAccess } = require('../services/staff-access');
const { createStaffActivation } = require('../services/staff-activation');
const { migrateSessionSecurity } = require('../services/session-security');
const { loadEnvironment } = require('../config/security-config');

async function invoke(handler, user, body) {
    let status = 200;
    let payload;
    const response = {
        set() { return this; },
        status(value) { status = value; return this; },
        json(value) { payload = value; return this; }
    };
    await handler({user, body}, response);
    return {status, payload};
}

test('HRIS issues staff accounts, restricts the first Admin exception and revokes old access', async () => {
    loadEnvironment();
    const host = process.env.DB_HOST || '127.0.0.1';
    assert.ok(['127.0.0.1','localhost','::1'].includes(host), 'Use local MySQL for the disposable fixture.');
    const config = {
        host, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    };
    const database = 'health_intel_staff_fixture_' + randomBytes(6).toString('hex');
    const root = await mysql.createConnection(config);
    let db;
    let created = false;
    try {
        await root.query('CREATE DATABASE ?? CHARACTER SET utf8mb4', [database]);
        created = true;
        db = mysql.createPool({...config, database});
        await db.query(`CREATE TABLE users (system_id VARCHAR(50) PRIMARY KEY, first_name VARCHAR(100),
            last_name VARCHAR(100), employee_id VARCHAR(50), role VARCHAR(12), barangay_id INT,
            password_hash VARCHAR(255), status VARCHAR(20), email VARCHAR(255))`);
        await db.query('CREATE TABLE barangays (id INT PRIMARY KEY, name VARCHAR(100))');
        await db.query('CREATE TABLE system_audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, user_id VARCHAR(50), role VARCHAR(30), action VARCHAR(100), details TEXT)');
        await db.query("INSERT INTO barangays VALUES (1,'Fixture North'),(2,'Fixture South')");
        await db.query("INSERT INTO users (system_id,role,status) VALUES ('SUPER-001','superadmin','approved')");
        await migrateSessionSecurity(db);
        const access = createStaffAccess(db);
        const staff = createStaffActivation(db, {staffAccess:access, emailConfigured: () => false});
        const superadmin = {system_id:'SUPER-001',role:'superadmin'};
        const first = {employee_id:'EMP-01', first_name:'First', last_name:'Fixture', role:'admin',identity_checked:true};
        const second = {...first,employee_id:'EMP-02',first_name:'Second'};
        const worker = {...first, employee_id:'EMP-03', first_name:'Health', role:'bhw', barangay_id:1};
        const email = 'staff-fixture@example.invalid';
        const password = 'Synthetic-staff-only-2026';
        const replacement = 'Synthetic-staff-replacement-2026';
        const activate = (issued, operation = staff.activate, chosenPassword = password) => invoke(operation,null,{
            system_id:issued.system_id, code:issued.code, password:chosenPassword, confirm_password:chosenPassword
        });
        const expectStatus = (response, status) => assert.equal(response.status, status, response.payload?.error);
        const issue = (employee, fields) => invoke(staff.issue, superadmin, {...employee, ...fields});
        const request = employee => invoke(access.requestReview, superadmin, employee);
        const review = (employee, reviewer, bootstrap = false) => invoke(access.review, reviewer,{...employee,bootstrap});

        expectStatus(await issue(first),409);
        for (const row of [first, second, {...worker, email}]) expectStatus(await invoke(access.rosterAdd,superadmin,row),200);
        expectStatus(await request(first),200);
        expectStatus(await review(first,superadmin),403);
        expectStatus(await review(first,superadmin,true),200);
        expectStatus(await request(second),200);
        expectStatus(await review(second,superadmin,true),403);
        expectStatus(await issue(first,{delivery_method:'email',delivery_email:email}),400);
        const firstIssued = await issue(first);
        expectStatus(firstIssued,201);
        expectStatus(await activate(firstIssued.payload),200);
        expectStatus(await activate(firstIssued.payload),403);
        const reviewer = {system_id:firstIssued.payload.system_id,role:'admin'};
        expectStatus(await review(second,reviewer),200);
        await db.execute("INSERT INTO users(system_id,role,status,employee_id) VALUES('ADM-099','admin','pending',?)",[second.employee_id]);
        const existingAdmin = await issue(second);
        expectStatus(existingAdmin,201);
        assert.equal(existingAdmin.payload.system_id,'ADM-099');
        expectStatus(await activate(existingAdmin.payload),200);
        const [[converted]] = await db.execute("SELECT status FROM users WHERE system_id='ADM-099'");
        assert.equal(converted.status,'approved');

        expectStatus(await issue({...worker,barangay_id:2}),409);
        expectStatus(await issue(worker,{delivery_method:'email',delivery_email:'other@example.invalid'}),409);
        const workerIssued = await issue(worker,{delivery_method:'email',delivery_email:email});
        expectStatus(workerIssued,201);
        assert.equal(workerIssued.payload.email_delivery,'not_configured');
        assert.equal(workerIssued.payload.delivery_recipient,email);
        expectStatus(await activate(workerIssued.payload),200);
        const workerId = workerIssued.payload.system_id;
        const reset = () => invoke(access.issueReset,superadmin,{system_id:workerId,identity_checked:true});
        const firstReset = await reset();
        expectStatus(firstReset,200);
        const [[locked]] = await db.execute('SELECT password_hash FROM users WHERE system_id=?',[workerId]);
        assert.equal(await bcrypt.compare(password,locked.password_hash),false);
        expectStatus(await invoke(access.transfer,superadmin,{
            system_id:workerId, barangay_id:2, reason:'Fixture assignment', identity_checked:true
        }),200);
        expectStatus(await activate(firstReset.payload.data,access.redeemReset),403);
        const secondReset = await reset();
        expectStatus(secondReset,200);
        const reused = await activate(secondReset.payload.data,access.redeemReset);
        expectStatus(reused,400);
        assert.match(reused.payload.error,/different from your previous password/);
        expectStatus(await activate(secondReset.payload.data,access.redeemReset,replacement),200);
        expectStatus(await activate(secondReset.payload.data,access.redeemReset,replacement),403);
        const [[updated]] = await db.execute('SELECT barangay_id,password_hash FROM users WHERE system_id=?',[workerId]);
        assert.equal(updated.barangay_id,2);
        assert.equal(await bcrypt.compare(password,updated.password_hash),false);
        assert.equal(await bcrypt.compare(replacement,updated.password_hash),true);
        const [[session]] = await db.execute('SELECT epoch FROM account_session_epochs WHERE system_id=?',[workerId]);
        assert.equal(Number(session.epoch),4);
        const [entries] = await db.query('SELECT action,details FROM system_audit_logs');
        assert.equal(entries.filter(row => row.action === 'First Admin Exception Approved').length,1);
        assert.ok(entries.some(row => row.action === 'Staff Barangay Changed'));
        assert.ok(entries.every(row => !row.details.includes(secondReset.payload.data.code) && !row.details.includes(password)));
    } finally {
        if (db) await db.end();
        try {
            if (created) await root.query('DROP DATABASE ??',[database]);
        } finally {
            await root.end();
        }
    }
});
