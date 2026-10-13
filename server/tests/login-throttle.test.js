// Real MySQL checks use only a newly created, disposable database; no source records.
const { test, before, beforeEach, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const express = require('express');
const bcrypt = require('bcrypt');
const { registerAuthRoutes } = require('../routes/auth-routes');
const { createLoginThrottle, migrateLoginThrottle, accountKey } = require('../services/login-throttle');

const name = `health_intel_login_verify_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
const secret = crypto.randomBytes(32).toString('hex');
const password = 'Disposable-only-password-2026';
let root, db, server, base, clock, created = false;
before(async () => {
    root = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
    await root.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
    created = true;
    db = mysql.createPool({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: name, connectionLimit: 4 });
    await db.query('CREATE TABLE users (system_id VARCHAR(64) PRIMARY KEY,role VARCHAR(20),status VARCHAR(20),password_hash VARCHAR(100)) ENGINE=InnoDB');
    await db.query('CREATE TABLE system_audit_logs (id INT AUTO_INCREMENT PRIMARY KEY,user_id VARCHAR(64),role VARCHAR(30),action VARCHAR(50),details TEXT) ENGINE=InnoDB');
    const hash = await bcrypt.hash(password, 10);
    for (const [id,status] of [['QA-LOGIN-A','approved'],['QA-LOGIN-B','approved'],['QA-LOGIN-PENDING','pending']]) {
        await db.execute("INSERT INTO users VALUES (?,'bhw',?,?)", [id,status,hash]);
    }
    await migrateLoginThrottle(db);
});
beforeEach(async () => {
    await db.query('DELETE FROM login_attempt_limits');
    await db.query('DELETE FROM system_audit_logs');
    clock = 1791450000000;
    const app = express(); app.use(express.json());
    registerAuthRoutes(app, db, secret, { loginThrottleOptions: { now: () => clock } });
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => { if (server) await new Promise(resolve => server.close(resolve)); server = null; });
after(async () => {
    if (db) await db.end();
    if (root) {
        try {
            if (created) {
                assert.match(name, /^health_intel_login_verify_\d+_[a-f0-9]{8}$/);
                assert.notEqual(name, 'health_intel');
                await root.query(`DROP DATABASE \`${name}\``);
            }
        } finally { await root.end(); }
    }
});
async function login(id = 'QA-LOGIN-A', suppliedPassword = 'incorrect-disposable-password') {
    const response = await fetch(base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({system_id:id,password:suppliedPassword}) });
    return {status:response.status,body:await response.json(),retry:response.headers.get('Retry-After')};
}
const wrong = async () => ({status:401,wrongCredentials:true,body:{success:false,error:'Invalid System ID or Password.'}});
const success = async () => ({status:200,body:{success:true}});

test('API blocks the fifth wrong password, including a correct password during the wait; blocked retries do not extend it', async () => {
    for (let i=0;i<4;i++) assert.equal((await login()).status,401);
    const fifth = await login();
    assert.equal(fifth.status,429); assert.equal(fifth.body.retry_after_seconds,60); assert.equal(fifth.retry,'60');
    clock += 20000;
    const during = await login('qa-login-a',password);
    assert.equal(during.status,429); assert.equal(during.body.retry_after_seconds,40); assert.ok(!during.body.token);
    clock += 40000;
    assert.equal((await login('QA-LOGIN-A',password)).status,200);
    const [state] = await db.query('SELECT * FROM login_attempt_limits'); assert.equal(state.length,0);
});

test('waits escalate 60 to 300 to 900 seconds, stay capped at 900 and survive new service instances', async () => {
    for (const duration of [60,300,900,900]) {
        const guard = createLoginThrottle(db,{now:()=>clock});
        for(let i=0;i<4;i++) assert.equal((await guard.attempt('QA-LOGIN-A',wrong)).status,401);
        assert.equal((await guard.attempt('QA-LOGIN-A',wrong)).retryAfter,duration);
        clock += duration*1000-1;
        let checked = false;
        const blocked = await createLoginThrottle(db,{now:()=>clock}).attempt('qa-login-a',async()=>{checked=true;return success();});
        assert.equal(blocked.status,429); assert.equal(blocked.retryAfter,1); assert.equal(checked,false);
        clock += 1;
    }
    assert.equal((await createLoginThrottle(db,{now:()=>clock}).attempt('QA-LOGIN-A',success)).status,200);
    const guard = createLoginThrottle(db,{now:()=>clock});
    for(let i=0;i<4;i++) await guard.attempt('QA-LOGIN-A',wrong);
    assert.equal((await guard.attempt('QA-LOGIN-A',wrong)).retryAfter,60);
});

test('successful API login clears a partial failure streak; other accounts remain usable', async () => {
    for(let i=0;i<4;i++) await login();
    assert.equal((await login('QA-LOGIN-A',password)).status,200);
    const guard = createLoginThrottle(db,{now:()=>clock});
    for(let i=0;i<4;i++) assert.equal((await guard.attempt('QA-LOGIN-A',wrong)).status,401);
    assert.equal((await guard.attempt('QA-LOGIN-A',wrong)).retryAfter,60);
    assert.equal((await login('QA-LOGIN-B',password)).status,200);
});

test('parallel attempts through separate guards cannot skip the fifth-failure threshold', async () => {
    let verified = 0;
    const results = await Promise.all(Array.from({length:12},()=>createLoginThrottle(db,{now:()=>clock}).attempt('QA-LOGIN-A',async()=>{verified++;return wrong();})));
    assert.equal(verified,5); assert.equal(results.filter(result=>result.status===401).length,4);
    assert.equal(results.filter(result=>result.status===429).length,8);
    const [[state]] = await db.execute('SELECT failure_count,lock_level FROM login_attempt_limits WHERE account_key=?',[accountKey('QA-LOGIN-A')]);
    assert.equal(state.failure_count,0); assert.equal(state.lock_level,1);
});

test('existing storage works without granting the application CREATE TABLE privileges', async () => {
    const restricted = {
        query(sql) { assert.doesNotMatch(sql,/CREATE TABLE/i); return db.query(sql); },
        getConnection: () => db.getConnection()
    };
    assert.equal((await createLoginThrottle(restricted,{now:()=>clock}).attempt('QA-LOGIN-A',wrong)).status,401);
});

test('unknown valid IDs get the same threshold; correct pending credentials do not count as password failures', async () => {
    for(let i=0;i<4;i++) assert.equal((await login('QA-NONEXISTENT')).status,401);
    assert.equal((await login('QA-NONEXISTENT')).body.retry_after_seconds,60);
    assert.equal((await login('QA-LOGIN-PENDING',password)).status,403);
    const [state] = await db.execute('SELECT * FROM login_attempt_limits WHERE account_key=?',[accountKey('QA-LOGIN-PENDING')]);
    assert.equal(state.length,0);
});

test('invalid request shapes stay generic and do not write account counters', async () => {
    for(const id of [null,{},'invalid id']) assert.equal((await login(id)).status,401);
    const [state] = await db.query('SELECT * FROM login_attempt_limits'); assert.equal(state.length,0);
});

test('failed audit writes roll back counter updates and never issue a token', async () => {
    await db.query('RENAME TABLE system_audit_logs TO qa_login_audit_hold');
    try {
        const originalError=console.error; console.error=()=>{};
        try { const response=await login(); assert.equal(response.status,500); assert.ok(!response.body.token); }
        finally { console.error=originalError; }
        const [state] = await db.query('SELECT * FROM login_attempt_limits'); assert.equal(state.length,0);
    } finally { await db.query('RENAME TABLE qa_login_audit_hold TO system_audit_logs'); }
});

test('existing connection limit still stops attempts spread over different account IDs', async () => {
    for(let i=0;i<10;i++) assert.equal((await login('QA-UNKNOWN-'+i)).status,401);
    const blocked = await login('QA-UNKNOWN-11'); assert.equal(blocked.status,429); assert.match(blocked.body.error,/this connection/);
    assert.ok(Number(blocked.retry)>0);
});
