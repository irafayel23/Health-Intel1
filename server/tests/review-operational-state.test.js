const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { possibleDuplicates, accountReview } = require('../scripts/review-operational-state');
test('possible identity review ignores moved address and casing without confirming or merging people', () => {
    const people = [{ id: 1, first_name: 'Ana Mae', last_name: 'Cruz', birthdate: '1990-01-01', purok: 'Old', barangay_id: 1 }, { id: 2, first_name: 'ANA', last_name: ' cruz ', birthdate: '1990-01-01', purok: 'New', barangay_id: 2 }, { id: 3, first_name: 'Ana', last_name: 'Cruz', birthdate: '1991-01-01' }, { id: 4, first_name: 'Ana', last_name: 'Cruz', birthdate: null }];
    const before = JSON.stringify(people), groups = possibleDuplicates(people, [{ id: 10, resident_id: 1 }, { id: 11, resident_id: 2 }, { id: 12, resident_id: 2 }], []);
    assert.equal(groups.length, 1); assert.equal(groups[0].candidate_survivor_only, 2);
    assert.equal(groups[0].identity_confirmed, false); assert.equal(groups[0].merge_approved, false);
    assert.deepEqual(groups[0].proposed_case_relationships.map(row => [row.case_id, row.before_resident_id, row.proposed_after_resident_id]), [[10, 1, 2], [11, 2, 2], [12, 2, 2]]);
    assert.equal(JSON.stringify(people), before);
});
test('beta name is review evidence only; passwords and session tokens never appear in the private account export', () => {
    const result = accountReview([{ system_id: 'BETA-BHW-01', role: 'bhw', password_hash: 'secret-hash', email: 'qa@example.invalid' }, { system_id: 'SUPER-001', role: 'superadmin' }], [{ id: 9, encoded_by: 'BETA-BHW-01' }], [], [], [{ system_id: 'BETA-BHW-01', token_hash: 'secret-token', expires_at: 123 }]);
    assert.equal(result[0].proposed_action, 'REVIEW'); assert.equal(result[0].deactivation_approved, false);
    assert.equal(result[0].authentication.google_linkage, 'NOT_ESTABLISHED_FROM_STORED_DATA');
    assert.deepEqual(result[0].related_cases, [9]); assert.equal(result[1].proposed_action, 'KEEP');
    assert.doesNotMatch(JSON.stringify(result), /secret-hash|secret-token/);
});
test('review command is read-only, outputs privately with no overwrite, and exposes no apply mode', () => {
    const source = fs.readFileSync(path.join(__dirname, '../scripts/review-operational-state.js'), 'utf8');
    assert.match(source, /CONSISTENT SNAPSHOT, READ ONLY/); assert.match(source, /await db.rollback/);
    assert.match(source, /flag: 'wx'/); assert.match(source, /outside the application checkout/);
    assert.doesNotMatch(source, /DELETE FROM|UPDATE users|INSERT INTO|FOREIGN_KEY_CHECKS/);
});
