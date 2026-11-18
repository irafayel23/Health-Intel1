'use strict';
// Review only. No cleanup/merge/account mutation is implemented here.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const { loadEnvironment } = require('../config/security-config');
const { auditMetadata } = require('../services/system-audit');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const norm = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
const quote = value => '`' + value.replace(/`/g, '``') + '`';

function possibleDuplicates(residents, cases, children) {
    const groups = new Map();
    for (const row of residents) {
        if (!row.birthdate || !norm(row.first_name) || !norm(row.last_name)) continue;
        const key = [row.birthdate, norm(row.last_name), norm(row.first_name).split(' ')[0], norm(row.suffix)].join('|');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }
    return [...groups.values()].filter(group => group.length > 1).map(group => {
        const ranked = [...group].sort((a, b) => cases.filter(row => Number(row.resident_id) === Number(b.id)).length - cases.filter(row => Number(row.resident_id) === Number(a.id)).length || Number(a.id) - Number(b.id));
        const survivor = ranked[0].id;
        return {
            classification: 'POSSIBLE_MATCH_REQUIRES_IDENTITY_REVIEW', identity_confirmed: false, merge_approved: false,
            candidate_survivor_only: survivor, survivor_reason: 'Most linked cases, then earliest ID. Staff must confirm identity and the correct profile before approval.',
            profiles: group.map(row => ({ id: row.id, first_name: row.first_name, last_name: row.last_name, suffix: row.suffix, birthdate: row.birthdate, barangay_id: row.barangay_id, purok: row.purok, row_sha256: hash(row) })),
            proposed_case_relationships: cases.filter(row => group.some(person => Number(person.id) === Number(row.resident_id))).map(row => ({ case_id: row.id, before_resident_id: row.resident_id, proposed_after_resident_id: survivor, row_sha256: hash(row) })),
            resident_dependencies: children.filter(item => item.parent === 'residents').map(item => ({ table: item.table, column: item.column, rows: item.rows.filter(row => group.some(person => Number(row.parent_id) === Number(person.id))) })),
            required_review: ['Confirm identity using authorized source documents', 'Resolve conflicting identity/address/vital-status values', 'Inspect every case and visit, including possible duplicate encounters', 'Retain clinical and audit history', 'Verify fresh restore-tested backup and approve exact IDs/hashes']
        };
    });
}

function accountReview(users, cases, visits, audit, sessions) {
    const logs = audit.map(auditMetadata);
    return users.map(user => {
        const actorLogs = logs.filter(log => norm(log.user_id) === norm(user.system_id));
        const linked = logs.filter(log => norm(log.target_type) === 'account' && norm(log.target_id) === norm(user.system_id));
        const flagged = /beta|demo|test|fixture|qa[-_]/i.test([user.system_id, user.first_name, user.last_name, user.email].join(' '));
        return {
            account_id: user.system_id, username: user.system_id, role: user.role, barangay_id: user.barangay_id,
            email: user.email, status: user.status, created_at: user.created_at,
            authentication: { password_login: Boolean(user.password_hash), google_linkage: 'NOT_ESTABLISHED_FROM_STORED_DATA', provider_uid_stored: false, note: 'Current public registration verifies a Google token, then stores an application password. No Google UID or registration proof is persisted, so an email address alone cannot prove Google linkage.' },
            last_successful_login: actorLogs.filter(log => log.action === 'Login Succeeded').map(log => log.timestamp).sort().at(-1) || null,
            active_session: sessions.filter(row => norm(row.system_id) === norm(user.system_id)).map(row => ({ expires_at: row.expires_at, session_epoch: row.session_epoch })),
            related_cases: cases.filter(row => norm(row.encoded_by) === norm(user.system_id)).map(row => row.id),
            related_visits: visits.filter(row => ['encoded_by', 'created_by', 'recorded_by'].some(key => norm(row[key]) === norm(user.system_id))).map(row => row.id),
            actor_audit_ids: actorLogs.map(row => row.id), account_audit_ids: linked.map(row => row.id),
            row_sha256: hash(user), test_candidate: flagged,
            classification_evidence: flagged ? 'Name/ID/email screening flag only. Not sufficient to establish obsolete or dummy origin. Confirm against setup evidence and owner authorization.' : 'No test-name marker. Staff authorization still requires owner confirmation.',
            proposed_action: flagged ? 'REVIEW' : 'KEEP', deactivation_approved: false,
            recovery: user.email ? 'Email recorded; delivery and account ownership not tested.' : 'No recovery email recorded. Establish a verified recovery method before removing privileged accounts.'
        };
    });
}

async function inventory(db, environment) {
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    try {
        const [tables] = await db.query("SELECT TABLE_NAME AS name,TABLE_TYPE AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME");
        const names = new Set(tables.map(row => row.name));
        const read = async name => names.has(name) ? (await db.query('SELECT * FROM ' + quote(name)))[0] : [];
        const residents = await read(names.has('resident_records') ? 'resident_records' : 'residents');
        const cases = await read(names.has('case_records') ? 'case_records' : 'health_cases');
        const visits = await read('case_visits'), users = await read('users'), audit = await read('system_audit_logs');
        const [foreignKeys] = await db.query("SELECT TABLE_NAME AS child,COLUMN_NAME AS column_name,REFERENCED_TABLE_NAME AS parent FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,COLUMN_NAME");
        const children = [];
        for (const fk of foreignKeys.filter(row => ['health_cases', 'residents', 'case_visits', 'users'].includes(row.parent))) {
            const records = await read(fk.child);
            children.push({ table: fk.child, column: fk.column_name, parent: fk.parent, rows: records.map(row => ({ id: row.id ?? row.system_id ?? null, parent_id: row[fk.column_name], row_sha256: hash(row) })) });
        }
        const mappedLogs = audit.map(auditMetadata);
        const candidates = cases.filter(row => row.encoded_by === 'DEMO-MHO' && /synthetic/i.test(row.remarks || ''));
        const proposed = candidates.map(row => ({
            case_id: row.id, resident_id: row.resident_id, row_sha256: hash(row), created_at: row.created_at, updated_at: row.updated_at,
            resident_sha256: hash(residents.find(person => Number(person.id) === Number(row.resident_id)) || null),
            linked_visits: visits.filter(visit => Number(visit.case_id) === Number(row.id)).map(visit => ({ id: visit.id, row_sha256: hash(visit) })),
            shared_resident_case_ids: cases.filter(other => Number(other.resident_id) === Number(row.resident_id) && other.id !== row.id).map(other => other.id),
            audit_ids: mappedLogs.filter(log => Number(log.case_id) === Number(row.id)).map(log => log.id),
            noncreation_audit_ids: mappedLogs.filter(log => Number(log.case_id) === Number(row.id) && !['Patient Encoded', 'Walk-in Case Encoded'].includes(log.action)).map(log => log.id),
            eligibility: 'HOLD_FOR_ORIGINAL_BATCH_HASH_AND_LATER_ACTIVITY_REVIEW', deletion_approved: false
        }));
        const [[{ now }]] = await db.query('SELECT UNIX_TIMESTAMP() AS now');
        const sessions = (await read('account_active_sessions')).filter(row => Number(row.expires_at) > Number(now));
        // Session tokens/password hashes are used only in memory and never included in review output.
        const revoked = new Set((await read('revoked_api_sessions')).filter(row => Number(row.expires_at) > Number(now)).map(row => row.token_hash));
        const accounts = accountReview(users, cases, visits, audit, sessions.filter(row => !revoked.has(row.token_hash)));
        const fingerprints = [];
        for (const table of tables.filter(row => row.type === 'BASE TABLE')) fingerprints.push({ table: table.name, rows_sha256: hash((await read(table.name)).map(row => JSON.stringify(row)).sort()) });
        return {
            created_at: new Date().toISOString(), environment, mode: 'READ_ONLY_REVIEW', totals: { cases: cases.length, residents: residents.length, visits: visits.length, accounts: accounts.length },
            provenance: 'Only DEMO-MHO plus synthetic-marked remarks identifies the documented Oct28 batch. Other names, actors and dates do not establish dummy origin. Later edits require original snapshot comparison.',
            dummy_candidates: proposed, candidate_ids_sha256: hash(proposed.map(row => row.case_id).sort((a, b) => a - b)),
            retained_if_all_candidate_cases_approved: cases.length - proposed.length, dependent_rows: children,
            duplicate_review: possibleDuplicates(residents, cases, children), accounts,
            privileged_accounts_to_preserve: accounts.filter(user => ['admin', 'superadmin'].includes(user.role)).map(user => ({ id: user.account_id, status: user.status, action: 'KEEP until authorized access and recovery are independently verified' })),
            fingerprints, overall_sha256: hash(fingerprints),
            blockers: ['No destructive action approved', 'Verify a fresh encrypted full restore before cleanup', 'Compare candidates with original batch snapshots', 'Confirm duplicate identities and survivor IDs', 'Owner must identify obsolete accounts and verify privileged recovery']
        };
    } finally { await db.rollback(); }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--environment' || !['local', 'azure'].includes(args[1]) || args[2] !== '--output' || !args[3]) throw Error('Use --environment local|azure --output <private directory>. This tool cannot apply cleanup.');
    const directory = path.resolve(args[3]), checkout = path.resolve(__dirname, '../..'), relative = path.relative(checkout, directory);
    if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) throw Error('Private output must be outside the application checkout.');
    loadEnvironment();
    const db = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'health_intel', dateStrings: true });
    try {
        const result = await inventory(db, args[1]);
        fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
        const file = path.join(directory, 'operational-review-' + Date.now() + '.json');
        fs.writeFileSync(file, JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
        console.log(JSON.stringify({ environment: result.environment, mode: result.mode, totals: result.totals, documented_batch_candidates: result.dummy_candidates.length, possible_identity_groups: result.duplicate_review.length, accounts_for_review: result.accounts.filter(row => row.proposed_action === 'REVIEW').length, private_file: file }));
    } finally { await db.end(); }
}
if (require.main === module) main().catch(error => { console.error(error.code ? 'Review failed. Check database access/schema. No cleanup was applied.' : error.message); process.exitCode = 1; });
module.exports = { inventory, possibleDuplicates, accountReview };
