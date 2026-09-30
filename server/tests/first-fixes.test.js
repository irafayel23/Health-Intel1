// Integration tests restore a real dump into a disposable database. They never write to the source database.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const vm = require('node:vm');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createDatabaseDump } = require('../database-backup');
const { sessionVersion } = require('../security-config');

const sourceConfig = { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'health_intel' };
const temporaryName = `health_intel_verify_${process.pid}`;
const quote = value => '`' + value.replace(/`/g, '``') + '`';
const testSecret = crypto.randomBytes(48).toString('hex');
const testPassword = crypto.randomBytes(16).toString('hex');
let connection, server, applicationDb, originalDump, created = false, baseUrl, baseline, restored, tokens = {};
const fixtures = { bhw: 'TEST-BHW-001', bhwOther: 'TEST-BHW-002', mho: 'TEST-MHO-001',
    admin: 'TEST-ADM-001', superadmin: 'TEST-SUP-001', suspended: 'TEST-SUSPENDED', pending: 'TEST-PENDING', denied: 'TEST-DENIED' };
let ownBarangay, otherBarangay, ownCase, otherCase, otherResident;

async function fingerprints(database) {
    const [tables] = await connection.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME', [database, 'BASE TABLE']);
    const result = {};
    for (const { TABLE_NAME: table } of tables) {
        const [rows] = await connection.query(`SELECT * FROM ${quote(database)}.${quote(table)}`);
        const stableRows = rows.map(row => JSON.stringify(row)).sort();
        result[table] = { count: rows.length, hash: crypto.createHash('sha256').update(JSON.stringify(stableRows)).digest('hex') };
    }
    return result;
}

before(async () => {
    connection = await mysql.createConnection({ ...sourceConfig, multipleStatements: true });
    baseline = await fingerprints(sourceConfig.database);
    originalDump = await createDatabaseDump(sourceConfig);
    const sql = await fs.promises.readFile(originalDump.filename, 'utf8');
    assert.match(sql, /CREATE TABLE/);
    assert.match(sql, /INSERT INTO/);
    await connection.query(`CREATE DATABASE ${quote(temporaryName)} CHARACTER SET utf8mb4`);
    created = true;
    await connection.query(`USE ${quote(temporaryName)}`);
    await connection.query(sql);
    restored = await fingerprints(temporaryName);
    assert.deepEqual(restored, baseline, 'Restoring the dump must reproduce every source table and row.');
    await originalDump.cleanup();
    originalDump = null;
    const [barangays] = await connection.query('SELECT id FROM barangays ORDER BY id LIMIT 2');
    assert.equal(barangays.length, 2);
    ownBarangay = barangays[0].id;
    otherBarangay = barangays[1].id;
    const passwordHash = await bcrypt.hash(testPassword, 10);
    for (const [name, id] of Object.entries(fixtures)) {
        const role = name === 'bhwOther' ? 'bhw' : ['suspended', 'pending', 'denied'].includes(name) ? 'mho' : name;
        const status = ['suspended', 'pending', 'denied'].includes(name) ? name : 'approved';
        await connection.execute("INSERT INTO users (system_id, first_name, last_name, role, barangay_id, password_hash, status) VALUES (?, 'Test', 'Only', ?, ?, ?, ?)",
            [id, role, role === 'bhw' ? (name === 'bhwOther' ? otherBarangay : ownBarangay) : null, passwordHash, status]);
        tokens[name] = jwt.sign({ system_id: id, role, password_version: sessionVersion(passwordHash,testSecret) }, testSecret, { expiresIn: '1h', algorithm: 'HS256' });
    }
    const [caseRows] = await connection.query('SELECT id,barangay_id FROM health_cases WHERE barangay_id IN (?,?) AND is_archived=FALSE ORDER BY id', [ownBarangay, otherBarangay]);
    ownCase = caseRows.find(row => row.barangay_id === ownBarangay).id;
    otherCase = caseRows.find(row => row.barangay_id === otherBarangay).id;
    const [[resident]] = await connection.query('SELECT id FROM residents WHERE barangay_id = ? LIMIT 1', [otherBarangay]);
    otherResident = resident.id;
    process.env.DB_NAME = temporaryName;
    process.env.DB_HOST = sourceConfig.host;
    process.env.JWT_SECRET = testSecret;
    // Test account approval must never send mail to real addresses in the copied data.
    require('nodemailer').createTransport = () => ({ sendMail: async () => ({}) });
    const application = require('../server');
    applicationDb = application.db;
    server = application.app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (applicationDb) await applicationDb.end();
    if (originalDump) await originalDump.cleanup();
    if (connection) {
        try {
            if (created) {
                assert.match(temporaryName, /^health_intel_verify_\d+$/);
                assert.notEqual(temporaryName, sourceConfig.database);
                await connection.query(`DROP DATABASE ${quote(temporaryName)}`);
            }
            assert.deepEqual(await fingerprints(sourceConfig.database), baseline, 'Source records must remain unchanged.');
        } finally { await connection.end(); }
    }
});

async function request(route, role, options = {}) {
    const headers = { ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(options.headers || {}) };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(baseUrl + route, { ...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
}

test('real SQL backup restores all tables and rows without altering the source', () => assert.deepEqual(restored, baseline));

test('all protected routes reject anonymous requests', async () => {
    const routeFiles = fs.readdirSync(path.join(__dirname, '..'))
        .filter(file => file === 'server.js' || file === 'mho-reports.js' || file.endsWith('-routes.js'));
    const source = routeFiles
        .map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
    const { publicEndpoints } = require('../access-control');
    for (const match of source.matchAll(/app\.(get|post|put)\('([^']+)'/g)) {
        const method = match[1].toUpperCase();
        const route = match[2].replace(':id', String(ownCase));
        if (publicEndpoints.has(`${method} ${route.slice(4)}`)) continue;
        const response = await request(route, null, { method, ...(method === 'GET' ? {} : { body: {} }) });
        assert.equal(response.status, 401, `${method} ${route}`);
    }
});

test('login works, and expired, forged, pending, denied and suspended sessions fail', async () => {
    const loggedIn = await request('/api/login', null, { method: 'POST', body: { system_id: fixtures.mho, password: testPassword } });
    assert.equal(loggedIn.status, 200);
    assert.equal(jwt.verify((await loggedIn.json()).token, testSecret).system_id, fixtures.mho);
    for (const role of ['pending', 'denied', 'suspended']) {
        assert.equal((await request('/api/session', role)).status, 401);
        assert.equal((await request('/api/login', null, { method: 'POST', body: { system_id: fixtures[role], password: testPassword } })).status, 403);
    }
    for (const token of [jwt.sign({ system_id: fixtures.mho }, testSecret, { expiresIn: -1 }), jwt.sign({ system_id: fixtures.mho }, 'incorrect-secret')]) {
        assert.equal((await request('/api/session', null, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
    }
    const [[currentBhw]] = await connection.execute('SELECT password_hash FROM users WHERE system_id=?',[fixtures.bhw]);
    const spoofedRole = jwt.sign({ system_id: fixtures.bhw, role: 'superadmin', password_version:sessionVersion(currentBhw.password_hash,testSecret) }, testSecret);
    assert.equal((await request('/api/superadmin/health', null, { headers: { Authorization: `Bearer ${spoofedRole}` } })).status, 403);
});

test('role separation protects administrative actions, backup and MHO analytics', async () => {
    for (const [route, role, method] of [
        ['/api/admin/pending-users','bhw','GET'], ['/api/superadmin/health','admin','GET'],
        ['/api/superadmin/backup','mho','POST'], ['/api/mho/stats','bhw','GET'],
        ['/api/patients','mho','GET'], ['/api/patients','admin','POST'],
        ['/api/diseases','mho','POST']
    ]) assert.equal((await request(route, role, { method, ...(method === 'GET' ? {} : { body: {} }) })).status, 403, `${role}: ${route}`);
    assert.equal((await request('/api/register', null, { method: 'POST', body: { role: 'superadmin' } })).status, 400);
    assert.equal((await request('/api/admin/suspend-user', 'admin', { method: 'POST', body: { system_id: fixtures.superadmin } })).status, 403);
    assert.equal((await request('/api/admin/approve-user', 'admin', { method: 'POST', body: { temp_system_id: fixtures.admin } })).status, 403);
    for (const [route,role] of [['/api/admin/pending-users','admin'], ['/api/superadmin/users','superadmin'], ['/api/mho/kpi','mho'], ['/api/diseases','bhw']]) {
        assert.equal((await request(route, role)).status, 200, route);
    }
});

test('BHW data reads and writes cannot cross barangay boundaries or spoof an encoder', async () => {
    const result = await (await request('/api/patients', 'bhw')).json();
    assert.ok(result.data.length);
    assert.ok(result.data.every(row => row.barangay_id === ownBarangay));
    assert.equal((await request('/api/patients?barangay_id=' + otherBarangay, 'bhw')).status, 403);
    const heatmap = await (await request('/api/heatmap-data', 'bhw')).json();
    assert.equal(heatmap.data.length, 7);
    assert.ok(heatmap.data.some(row => row.id === ownBarangay));
    assert.ok(heatmap.data.some(row => row.id === otherBarangay));
    assert.ok(heatmap.data.every(row => !('patient_name' in row) && !('resident_id' in row)));
    const [[sampleDisease]] = await connection.query('SELECT disease FROM health_cases WHERE barangay_id=? AND status=? AND is_archived=FALSE AND disease IS NOT NULL LIMIT 1',[otherBarangay,'Active']);
    if (sampleDisease) {
        const filtered = await (await request('/api/heatmap-data?disease=' + encodeURIComponent(sampleDisease.disease),'bhw')).json();
        assert.equal(filtered.data.length,7);
        assert.equal(filtered.selected_disease,sampleDisease.disease);
        assert.ok(filtered.data.find(row=>row.id===otherBarangay).cases>0);
    }
    assert.equal((await request('/api/residents/' + otherResident + '/dossier', 'bhw')).status, 404);
    for (const action of ['status','archive','restore']) assert.equal((await request(`/api/patients/${otherCase}/${action}`, 'bhw', { method: 'PUT', body: { new_status: 'Cleared' } })).status, 404);
    assert.equal((await request('/api/bhw/context?system_id=' + fixtures.bhwOther, 'bhw')).status, 403);
    assert.equal((await request('/api/patients', 'bhw', { method: 'POST', body: { encoded_by: fixtures.bhwOther } })).status, 403);
    assert.equal((await request('/api/change-password', 'bhw', { method: 'POST', body: { system_id: fixtures.bhwOther } })).status, 403);
    const update = await request(`/api/patients/${ownCase}/status`, 'bhw', { method: 'PUT', body: { new_status: 'Cleared', user_id: 'SPOOFED' } });
    assert.equal(update.status, 200);
    const [[log]] = await connection.query("SELECT user_id FROM system_audit_logs WHERE action = 'Status Updated' ORDER BY id DESC LIMIT 1");
    assert.equal(log.user_id, fixtures.bhw);
});

test('BHW and MHO heatmaps show disease aggregates for each recorded severity', async () => {
    const firstDisease = 'Disposable heatmap category A';
    const secondDisease = 'Disposable heatmap category B';
    const inserted = [];
    try {
        for (const [barangayId, disease, status, archived] of [
            [ownBarangay, firstDisease, 'Active', 0],
            [ownBarangay, firstDisease, 'Active', 0],
            [ownBarangay, secondDisease, 'Active', 0],
            [ownBarangay, firstDisease, 'Cleared', 0],
            [ownBarangay, secondDisease, 'Active', 1],
            [otherBarangay, secondDisease, 'Active', 0]
        ]) {
            const [result] = await connection.execute(`
                INSERT INTO health_cases (barangay_id, purok, disease, date_recorded, severity, status, is_archived, patient_name)
                VALUES (?, 'Disposable zone', ?, '2025-01-01', 'High Risk', ?, ?, 'Disposable map patient')
            `, [barangayId, disease, status, archived]);
            inserted.push(result.insertId);
        }
        for (const severity of ['Mild', 'Monitored']) {
            for (const [status, archived] of [['Active', 0], ['Cleared', 0], ['Active', 1]]) {
                const [result] = await connection.execute("INSERT INTO health_cases (barangay_id,disease,severity,status,is_archived,patient_name) VALUES (?,?,?,?,?,'Disposable map patient')", [ownBarangay, firstDisease, severity, status, archived]);
                inserted.push(result.insertId);
            }
        }
        for (const role of ['bhw', 'mho']) {
            const response = await request('/api/heatmap-data', role);
            assert.equal(response.status, 200);
            const { data } = await response.json();
            assert.equal(data.length, 7);
            assert.ok(data.every(row => row.high_risk_diseases.reduce((sum, item) => sum + item.cases, 0) === row.severity_counts.high_risk));
            for (const key of ['mild', 'monitored', 'high_risk']) {
                assert.ok(data.every(row => row.diseases_by_severity[key].reduce((sum, item) => sum + item.cases, 0) === row.severity_counts[key]));
                assert.ok(data.every(row => row.diseases_by_severity[key].every(item => Object.keys(item).sort().join(',') === 'cases,disease')));
            }
            const own = data.find(row => row.id === ownBarangay);
            assert.equal(own.high_risk_diseases.find(item => item.disease === firstDisease).cases, 2);
            assert.equal(own.diseases_by_severity.mild.find(item => item.disease === firstDisease).cases, 1);
            assert.equal(own.diseases_by_severity.monitored.find(item => item.disease === firstDisease).cases, 1);
            assert.equal(own.high_risk_diseases.find(item => item.disease === secondDisease).cases, 1);
            assert.equal(data.find(row => row.id === otherBarangay).high_risk_diseases.find(item => item.disease === secondDisease).cases, 1);
            assert.ok(data.every(row => !('patient_name' in row) && !('resident_id' in row)));
            const filtered = await (await request('/api/heatmap-data?disease=' + encodeURIComponent(firstDisease), role)).json();
            assert.deepEqual(filtered.data.find(row => row.id === ownBarangay).high_risk_diseases, [{ disease: firstDisease, cases: 2 }]);
            assert.deepEqual(filtered.data.find(row => row.id === otherBarangay).high_risk_diseases, []);
        }
    } finally {
        for (const id of inserted) await connection.execute('DELETE FROM health_cases WHERE id = ?', [id]);
    }
});

test('BHW purok choices stay within assigned barangay and map rejects invalid disease filters', async () => {
    await connection.execute("INSERT INTO health_cases(barangay_id,purok,disease,date_recorded,severity,status,patient_name) VALUES(?,'Fixture Own Zone','Fixture illness','2025-01-01','Mild','Active','Disposable')",[ownBarangay]);
    await connection.execute("INSERT INTO health_cases(barangay_id,purok,disease,date_recorded,severity,status,patient_name) VALUES(?,'Fixture Other Zone','Fixture illness','2025-01-01','Mild','Active','Disposable')",[otherBarangay]);
    const response=await request('/api/bhw/puroks','bhw');assert.equal(response.status,200);
    const names=(await response.json()).data;assert.ok(names.includes('Fixture Own Zone'));assert.ok(!names.includes('Fixture Other Zone'));
    assert.equal((await request('/api/bhw/puroks','mho')).status,403);
    assert.equal((await request('/api/heatmap-data?disease=%3Cbad%3E','bhw')).status,400);
});

test('birthdate display accepts only real MM/DD/YYYY dates and stores ISO dates', () => {
    const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/js/date-format.js'),'utf8'),sandbox);
    const parse=sandbox.window.HealthIntelDate.parseBirthdate;
    assert.equal(parse('02/29/2024'),'2024-02-29');
    for(const bad of ['29/02/2024','02/29/2023','13/01/2000','2/01/2000','01/01/1899','2024-02-29'])assert.equal(parse(bad),null);
    assert.equal(sandbox.window.HealthIntelDate.formatCaseDate('2024-12-31T16:00:00.000Z'),'01/01/2025');
    assert.equal(sandbox.window.HealthIntelDate.formatCaseDate(null),'Not recorded');
});

test('suspending an account revokes its existing token immediately', async () => {
    assert.equal((await request('/api/session', 'bhwOther')).status, 200);
    assert.equal((await request('/api/admin/suspend-user', 'admin', { method: 'POST', body: { system_id: fixtures.bhwOther } })).status, 200);
    assert.equal((await request('/api/session', 'bhwOther')).status, 401);
});

test('protected MHO reports still return PDFs', async () => {
    for (const route of ['/api/mho/reports/fhsis?month=January&year=2025', '/api/mho/reports/pidsr?week=2025-W01']) {
        const response = await request(route, 'mho');
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Content-Type'), 'application/pdf');
        assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,4).toString(), '%PDF');
    }
});

test('forecast remains available, returns local history and contains no fabricated accuracy', async () => {
    const response = await request('/api/predict?disease=Influenza&barangay=Blumentritt', 'mho');
    const result = await response.json();
    assert.equal(response.status, 200, result.error);
    assert.equal(result.data.model_name, 'AR(1)');
    assert.equal(result.data.validation_status, 'pending');
    assert.equal(result.data.historical_scope, 'selected_barangay');
    assert.equal(Object.hasOwn(result.data, 'accuracy_percentage'), false);
    assert.equal(result.data.forecast.filter(value => value !== null).length, 3);
    const [[expected]] = await connection.execute("SELECT COUNT(*) AS total FROM health_cases h JOIN barangays b ON b.id=h.barangay_id WHERE h.disease='Influenza' AND b.name='Blumentritt' AND h.date_recorded >= '2023-01-01' AND h.date_recorded < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)");
    assert.equal(result.data.historical.reduce((sum,value) => sum+value,0), expected.total);
    assert.equal((await request('/api/predict?disease=NOT_A_REAL_DISEASE&barangay=Blumentritt','mho')).status, 400);
});

// Independently verify and decrypt the WinZip AES-256 entry generated by the backup endpoint.
function decryptZipEntry(zip, password) {
    const central = zip.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
    assert.ok(central >= 0);
    const size = zip.readUInt32LE(central+20);
    const offset = zip.readUInt32LE(central+42);
    const nameLength = zip.readUInt16LE(offset+26), extraLength = zip.readUInt16LE(offset+28);
    const name = zip.subarray(offset+30,offset+30+nameLength).toString();
    assert.equal(name, 'health_intel_backup.sql');
    assert.equal(zip.readUInt16LE(offset+8), 99, 'ZIP must use WinZip AES encryption.');
    const payload = zip.subarray(offset+30+nameLength+extraLength,offset+30+nameLength+extraLength+size);
    const salt = payload.subarray(0,16), verification = payload.subarray(16,18);
    const ciphertext = payload.subarray(18,-10), authentication = payload.subarray(-10);
    const keys = crypto.pbkdf2Sync(password,salt,1000,66,'sha1');
    assert.deepEqual(keys.subarray(64),verification);
    assert.deepEqual(crypto.createHmac('sha1',keys.subarray(32,64)).update(ciphertext).digest().subarray(0,10),authentication);
    const compressed = Buffer.alloc(ciphertext.length);
    for (let offset=0, counter=1; offset<ciphertext.length; offset+=16,counter++) {
        const nonce=Buffer.alloc(16); nonce.writeUInt32LE(counter);
        const cipher=crypto.createCipheriv('aes-256-ecb',keys.subarray(0,32),null); cipher.setAutoPadding(false);
        const block=Buffer.concat([cipher.update(nonce),cipher.final()]);
        for(let i=0;i<16 && offset+i<ciphertext.length;i++) compressed[offset+i]=ciphertext[offset+i]^block[i];
    }
    return zlib.inflateRawSync(compressed).toString('utf8');
}

test('Superadmin backup downloads an encrypted ZIP with restorable SQL and rejects weak passwords', async () => {
    assert.equal((await request('/api/superadmin/backup','superadmin',{method:'POST',body:{password:'short'}})).status,400);
    const password=crypto.randomBytes(20).toString('hex');
    const response=await request('/api/superadmin/backup','superadmin',{method:'POST',body:{password}});
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Content-Type'),'application/zip');
    const sql=decryptZipEntry(Buffer.from(await response.arrayBuffer()),password);
    assert.match(sql,/CREATE TABLE `health_cases`/);
    assert.match(sql,/INSERT INTO `health_cases`/);
    assert.match(sql,/CREATE TABLE `disease_registry`/);
    const [[log]]=await connection.query("SELECT user_id FROM system_audit_logs WHERE action='Database Backup Generated' ORDER BY id DESC LIMIT 1");
    assert.equal(log.user_id,fixtures.superadmin);
});

test('page scripts exist and parse', () => {
    for(const name of ['index.html','bhw.html','mho.html','admin.html','superadmin.html']) {
        const html=fs.readFileSync(path.join(__dirname,'..','..',name),'utf8');
        assert.match(html,/assets\/js\/api-session\.js/);
        for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            if(match[2].trim() && !/type=["']text\/tailwindcss["']/.test(match[1])) new vm.Script(match[2],{filename:name});
            const src=match[1].match(/\bsrc=["'](assets\/js\/[^"']+)["']/i)?.[1];
            if(src) {
                const file=path.join(__dirname,'..','..',src);
                assert.ok(fs.existsSync(file),`${name} references missing ${src}`);
                new vm.Script(fs.readFileSync(file,'utf8'),{filename:src});
            }
        }
    }
    const html=fs.readFileSync(path.join(__dirname,'..','..','mho.html'),'utf8');
    assert.doesNotMatch(html,/accuracy_percentage|predictive-accuracy-score|Outbreak Warning|SARIMA Forecast/);
    new vm.Script(fs.readFileSync(path.join(__dirname,'..','..','assets','js','api-session.js'),'utf8'));
});

test('browser session helper attaches tokens only to the API, clears logout and propagates errors', async () => {
    const storage=new Map([['health_intel_token','test-token'],['active_user_id','TEST-BHW']]);
    const calls=[]; let response=new Response('{}',{status:200}); let redirected=false, logoutHandler;
    const sandbox={URL,Headers,Request,Error,setTimeout,console,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
        document:{addEventListener:(event,callback)=>callback(),querySelectorAll:()=>[{addEventListener:(event,callback)=>{logoutHandler=callback;}}]}};
    sandbox.window={location:{href:'http://localhost:5500/index.html',pathname:'/index.html',replace:()=>{redirected=true;}},fetch:async(input,options)=>{calls.push({input,options});return response;}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','..','assets','js','api-session.js'),'utf8'),sandbox);
    await sandbox.window.fetch('http://localhost:3000/api/patients');
    assert.equal(calls.at(-1).options.headers.get('Authorization'),'Bearer test-token');
    await sandbox.window.fetch('https://example.test/api/anything');
    assert.equal(calls.at(-1).options.headers,undefined);
    await sandbox.window.fetch('http://localhost:3000/api/login',{method:'POST'});
    assert.equal(calls.at(-1).options.headers,undefined);
    response=new Response(JSON.stringify({error:'Not allowed',code:'ACCESS_DENIED'}),{status:403});
    await assert.rejects(sandbox.window.fetch('http://localhost:3000/api/patients'),/Not allowed/);
    assert.equal(redirected,false);
    response=new Response(JSON.stringify({error:'Expired',code:'SESSION_INVALID'}),{status:401});
    await assert.rejects(sandbox.window.fetch('http://localhost:3000/api/patients'),/Expired/);
    assert.equal(redirected,true);
    assert.equal(storage.has('health_intel_token'),false);
    storage.set('health_intel_token','again'); logoutHandler();
    assert.equal(storage.has('health_intel_token'),false);
});

test('MHO age, year, barangay, outcome and comparison filters count the correct records', async () => {
    const disease = 'Analytics Fixture Disease';
    const rows = [
        [ownBarangay, '2090-05-01', 4, 'Active', 'High Risk', false],
        [ownBarangay, '2091-05-01', 10, 'Deceased', 'High Risk', false],
        [ownBarangay, '2091-05-02', 68, 'Cleared', 'Mild', false],
        [ownBarangay, '2091-05-03', null, 'Cleared', 'Mild', false],
        [ownBarangay, '2091-05-04', 10, 'Active', 'Mild', false],
        [ownBarangay, '2091-05-05', 11, 'Active', 'High Risk', true],
        [otherBarangay, '2091-05-06', 10, 'Active', 'High Risk', false]
    ];
    const inserted = [];
    try {
        for (const row of rows) {
            const [result] = await connection.execute('INSERT INTO health_cases (barangay_id,date_recorded,age,status,severity,is_archived,disease,patient_name,encoded_by) VALUES (?,?,?,?,?,?,?,?,?)', [...row, disease, 'Disposable analytics fixture', fixtures.bhw]);
            inserted.push(result.insertId);
        }
        const [[barangay]] = await connection.execute('SELECT name FROM barangays WHERE id=?', [ownBarangay]);
        const params = new URLSearchParams({ year:'2091',barangay:barangay.name,age:'all',category:'morbidity' });
        const all = await (await request('/api/mho/stats?' + params, 'mho')).json();
        assert.equal(all.summary.total_cases, 5, 'Disease cases include cases with fatal outcomes and historical archived records.');
        assert.equal(Number(all.summary.unknown_age_cases), 1);
        assert.equal(all.data[0].cases, 5);
        params.set('age','6-12');
        const children = await (await request('/api/mho/stats?' + params,'mho')).json();
        assert.equal(children.summary.total_cases, 3);
        params.set('category','mortality');
        assert.equal((await (await request('/api/mho/stats?' + params,'mho')).json()).summary.total_cases,1);
        const counts = await (await request('/api/mho/kpi?' + params,'mho')).json();
        assert.equal(Number(counts.active),1);
        assert.equal(Number(counts.highRisk),0, 'Archived and deceased records must not count as active high risk.');
        const comparison = await (await request('/api/mho/yoy?' + params,'mho')).json();
        assert.equal(comparison.previous_year,2090);
        assert.equal(comparison.current_year,2091);
        assert.equal(Number(comparison.data[0].previous_cases),0);
        assert.equal(Number(comparison.data[0].current_cases),3);
        params.set('age','all');
        const comparisonAll = await (await request('/api/mho/yoy?' + params,'mho')).json();
        assert.equal(Number(comparisonAll.data[0].previous_cases),1);
        assert.equal(Number(comparisonAll.data[0].current_cases),5);
        assert.equal((await (await request('/api/mho/mortality?' + params,'mho')).json()).data[0].count,1);
        for (const route of ['stats','kpi','yoy','mortality']) {
            assert.equal((await request(`/api/mho/${route}?age=invalid`,'mho')).status,400);
        }
    } finally {
        for (const id of inserted) await connection.execute('DELETE FROM health_cases WHERE id=? AND disease=?',[id,disease]);
    }
});

test('MHO descriptions handle ties, all years, empty records, zero estimates and changing forecasts', () => {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','..','assets','js','mho-insights.js'),'utf8'),sandbox);
    const insights = sandbox.window.MHOInsights;
    const filters = {year:'all',barangay:'Blumentritt',age:'all',category:'morbidity'};
    const description = insights.describeProfile([{disease:'Dengue',cases:4},{disease:'Influenza',cases:4}],filters,{total_cases:10,unknown_age_cases:2,leading_categories:2});
    assert.match(description.text,/all recorded years/);
    assert.match(description.text,/share the highest/);
    assert.match(description.text,/40.0%/);
    assert.match(description.text,/2 records have no usable age/);
    assert.doesNotMatch(description.text,/CY all|leading cause/);
    assert.match(insights.describeProfile([],filters,{total_cases:0}).text,/no matching records/i);
    const zero = insights.forecastGuidance({dates:['2025-01','2025-02','2025-03','2025-04'],historical:[0],forecast:[null,0,0,0]},'Dengue','Blumentritt');
    assert.match(zero.recommendations[1],/does not prove/);
    const rising = insights.forecastGuidance({dates:['2025-01','2025-02','2025-03','2025-04'],historical:[1],forecast:[null,3,4,5]},'Influenza','Minoyan');
    assert.match(rising.summary,/Minoyan/);
    assert.match(rising.summary,/Influenza/);
    assert.match(rising.recommendations[1],/above the last three/);
    assert.throws(()=>insights.forecastGuidance({dates:['2025-01'],historical:[],forecast:[NaN]},'Dengue','Minoyan'),/invalid/);
});
