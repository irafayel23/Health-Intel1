'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rules } = require('../middleware/access-control');

test('Superadmin owns legacy staff account access and Admin can independently review Admin requests', () => {
    const allowed = (verb, path) => rules.find(([method, pattern]) => method === verb && pattern.test(path))?.[2];
    for (const endpoint of ['pending-users', 'active-users', 'denied-users', 'registration-evidence/MHO-QA']) {
        assert.deepEqual(allowed('GET', '/admin/' + endpoint), ['superadmin']);
    }
    for (const endpoint of ['approve-user', 'deny-user', 'undo-deny', 'suspend-user', 'restore-suspended']) {
        assert.deepEqual(allowed('POST', '/admin/' + endpoint), ['superadmin']);
    }
    for (const verb of ['GET', 'POST']) {
        assert.deepEqual(allowed(verb, '/staff-admin-reviews'), ['admin', 'superadmin']);
    }
    assert.deepEqual(allowed('GET', '/admin/audit-logs'), ['admin', 'superadmin']);
});
