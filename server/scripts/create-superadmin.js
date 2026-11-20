'use strict';

const { createInterface } = require('node:readline/promises');
const { Writable } = require('node:stream');
const { userInfo } = require('node:os');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { loadEnvironment, normalizeEmail, validPassword } = require('../config/security-config');
const { createSystemAudit } = require('../services/system-audit');
const { transaction } = require('../services/database-transaction');

async function createSuperadmin(db, { first, last, email, password }, operator) {
    first = first.trim();
    last = last.trim();
    email = normalizeEmail(email);
    if (!first || !last || first.length > 100 || last.length > 100 || !email || !validPassword(password)) {
        throw new Error('Enter both names, a valid recovery email, and a password of 8 or more characters and at most 72 bytes.');
    }
    const hash = await bcrypt.hash(password, 10);
    return transaction(db, async connection => {
        const [existing] = await connection.execute('SELECT system_id FROM users WHERE LOWER(TRIM(email))=?', [email]);
        if (existing.length) throw new Error('That email already belongs to an account. Use a different recovery email or recover the existing account.');

        const [[{ last_number }]] = await connection.execute(
            "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(system_id,'-',-1) AS UNSIGNED)),0) AS last_number FROM users WHERE system_id REGEXP '^SUPER-[0-9]+$'",
        );
        const next = Number(last_number) + 1;
        if (!Number.isSafeInteger(next) || next > 999999999) throw new Error('No Superadmin IDs are available.');
        const id = 'SUPER-' + String(next).padStart(3, '0');
        await connection.execute(
            "INSERT INTO users(system_id,first_name,last_name,email,password_hash,role,status) VALUES(?,?,?,?,?,'superadmin','approved')",
            [id, first, last, email, hash],
        );
        await createSystemAudit(connection).record({ system_id: 'Local setup', role: 'Maintenance' }, 'Superadmin Created', {
            summary: 'Superadmin created through the local setup command.',
            target_type: 'Account', target_id: id, outcome: 'Succeeded', local_operator: operator,
        });
        return id;
    }, 'registration');
}

async function main() {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Open an interactive PowerShell window and run the command there.');
    loadEnvironment();
    const host = process.env.DB_HOST || 'localhost';
    const database = process.env.DB_NAME || 'health_intel';
    if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(host)) {
        throw new Error('This command requires a local development database.');
    }
    console.log('Create a Health-Intel Superadmin on this PC.');
    console.log('Target database: ' + JSON.stringify(database) + ' on ' + host);
    let muted = false;
    const output = new Writable({ write(chunk, _encoding, done) {
        if (!muted) process.stdout.write(chunk);
        done();
    } });
    const prompt = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 });
    const cancelled = new AbortController();
    prompt.on('SIGINT', () => cancelled.abort());
    prompt.on('close', () => cancelled.abort());
    const ask = (label) => prompt.question(label, { signal: cancelled.signal });
    const askPassword = async (label) => {
        process.stdout.write(label);
        muted = true;
        try { return await ask(''); }
        finally { muted = false; process.stdout.write('\n'); }
    };
    let account;
    try {
        const first = await ask('First name: ');
        const last = await ask('Last name: ');
        const email = await ask('Recovery email: ');
        const password = await askPassword('Password (hidden): ');
        if (password !== await askPassword('Confirm password (hidden): ')) throw new Error('The passwords do not match. Run the command again.');
        if ((await ask('Type CREATE to add the account: ')).trim() !== 'CREATE') {
            console.log('Account creation cancelled.');
            return;
        }
        account = { first, last, email, password };
    } finally { prompt.close(); }

    const db = mysql.createPool({
        host, port: Number(process.env.DB_PORT || 3306), database,
        user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
        connectionLimit: 1,
    });
    try {
        const id = await createSuperadmin(db, account, userInfo().username);
        console.log('Created ' + id + '. Sign in at http://localhost:3000/ with this ID and your password.');
    } finally { await db.end(); }
}

if (require.main === module) {
    main().catch(error => {
        const message = error.name === 'AbortError' || error.code === 'ERR_USE_AFTER_CLOSE' ? 'Account creation cancelled.'
            : error.code ? 'Could not create the account. Check that local MySQL is running and that server/.env points to the initialized Health-Intel database.'
            : error.message;
        console.error(message);
        process.exitCode = 1;
    });
}

module.exports = { createSuperadmin };
