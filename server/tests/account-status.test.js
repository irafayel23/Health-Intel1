const { test } = require('node:test');
const assert = require('node:assert/strict');
const { accountStatus } = require('../services/account-status');

// Exercise the real account service without starting MySQL or sending email.
function fixture(role, status, failAudit = false) {
    const state = { account: { system_id: 'QA-TARGET', role, status }, events: [], epoch: 0 };
    let snapshot;
    const connection = {
        async beginTransaction() { snapshot = structuredClone(state); },
        async commit() {},
        async rollback() { Object.assign(state, snapshot); },
        release() {},
        async execute(sql, values) {
            if (sql.startsWith('SELECT')) {
                assert.match(sql, /FOR UPDATE$/, 'Read the current account under a database lock');
                return [[{ ...state.account }]];
            }
            if (sql.startsWith('UPDATE users')) { state.account.status = values[0]; return [{}]; }
            if (sql.startsWith('INSERT INTO account_session_epochs')) {state.epoch++;return [{}];}
            if (sql.startsWith('INSERT INTO system_audit_logs')) {
                if (failAudit) throw Error('Synthetic audit failure');
                state.events.push(values);
                return [{}];
            }
            throw Error('Unexpected query');
        }
    };
    return { state, db: { async getConnection() { return connection; } } };
}

const actions = {
    'approve-user': ['pending', 'approved'],
    'deny-user': ['pending', 'denied'],
    'undo-deny': ['denied', 'pending'],
    'suspend-user': ['approved', 'suspended'],
    'restore-suspended': ['suspended', 'approved']
};
const request = (action, actor = 'admin', apiPrefix = false) => ({
    path: (apiPrefix ? '/api' : '') + '/admin/' + action,
    body: { temp_system_id: 'QA-TARGET' },
    user: { system_id: 'QA-ACTOR', role: actor }
});

test('stale BHW/MHO actions cannot approve suspended or denied accounts or duplicate an audit', async () => {
    for (const role of ['bhw', 'mho']) for (const [action, [from, to]] of Object.entries(actions)) {
        for (const status of ['pending', 'approved', 'denied', 'suspended']) {
            if (status === from) continue;
            const { db, state } = fixture(role, status);
            await assert.rejects(accountStatus(db, request(action), to, 'QA action'),
                e => e.status === 409, `${role}: ${action} from ${status}`);
            assert.equal(state.account.status, status);
            assert.deepEqual(state.events, []);
            assert.equal(state.epoch,0);
        }
    }
});

test('valid BHW/MHO transitions preserve actor attribution and before/after status', async () => {
    for (const role of ['bhw', 'mho']) for (const actor of ['admin', 'superadmin']) {
        for (const [action, [from, to]] of Object.entries(actions)) {
            const { db, state } = fixture(role, from);
            const original = await accountStatus(db, request(action, actor, true), to, 'QA action');
            assert.equal(original.status, from);
            assert.equal(state.account.status, to);
            assert.equal(state.events.length, 1);
            assert.equal(state.epoch,1);
            assert.equal(state.events[0][0], 'QA-ACTOR');
            assert.equal(state.events[0][1], actor === 'admin' ? 'Admin' : 'Superadmin');
            const detail = JSON.parse(state.events[0][3]);
            assert.deepEqual(detail.before, { status: from });
            assert.deepEqual(detail.after, { status: to });
        }
    }
});

test('account service independently rejects forbidden actor/target roles', async () => {
    for (const [actor, target] of [['bhw','mho'], ['mho','bhw'], ['admin','admin'], ['admin','superadmin'], ['superadmin','superadmin']]) {
        const { db, state } = fixture(target, 'approved');
        await assert.rejects(accountStatus(db, request('suspend-user', actor), 'suspended', 'QA action'), e => e.status === 403);
        assert.equal(state.account.status, 'approved');
        assert.deepEqual(state.events, []);
    }
});

test('failed audit keeps the original account status', async () => {
    const { db, state } = fixture('bhw', 'pending', true);
    await assert.rejects(accountStatus(db, request('approve-user'), 'approved', 'QA action'), /Synthetic audit failure/);
    assert.equal(state.account.status, 'pending');
    assert.equal(state.epoch,0);
    assert.deepEqual(state.events, []);
});
