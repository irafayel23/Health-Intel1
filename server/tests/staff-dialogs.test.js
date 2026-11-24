const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../assets/js/shared/staff-access.js'), 'utf8');

function dialog({load}) {
    const confirm = {disabled:false};
    const status = {textContent:'Loading…', hidden:false};
    const form = {isConnected:true, hidden:true, innerHTML:'', addEventListener() {}, elements:{role:{addEventListener() {}}}};
    const popup = {querySelector: selector => selector === 'form' ? form : status};
    const requests = [];
    const window = {};
    const Swal = {
        getConfirmButton: () => confirm,
        async fire(options) {
            options.willOpen();
            assert.equal(confirm.disabled, true);
            await options.didOpen(popup);
            return {isConfirmed:false};
        }
    };
    vm.runInNewContext(source, {
        AbortSignal, Swal, window, HealthIntelText:{escape:String},
        fetch: async url => {
            requests.push(new URL(url).pathname);
            const data = await load(url);
            return {ok:true,json:async () => ({success:true,data})};
        }
    });
    return {staff:window.HealthIntelStaffAccess, confirm, status, form, requests};
}

test('roster entry and Admin review dialogs finish setup with the published SweetAlert API', async () => {
    const roster = dialog({load:async () => [{id:1,name:'Fixture barangay'}]});
    await roster.staff.addRosterEntry();
    assert.deepEqual(roster.requests, ['/api/superadmin/staff-barangays']);
    assert.match(roster.form.innerHTML, /First name/);
    assert.match(roster.form.innerHTML, /Fixture barangay/);
    assert.equal(roster.form.hidden, false);
    assert.equal(roster.status.hidden, true);
    assert.equal(roster.confirm.disabled, false);

    const reviews = dialog({load:async () => []});
    await reviews.staff.reviewAdminAccess(true);
    assert.deepEqual(reviews.requests, ['/api/staff-admin-reviews']);
    assert.match(reviews.form.innerHTML, /Request Admin review/);
    assert.equal(reviews.confirm.disabled, false);
});

test('a timeout replaces the loading message and keeps submission disabled', async () => {
    const reviews = dialog({load:async () => {throw new DOMException('Timed out', 'TimeoutError');}});
    await reviews.staff.reviewAdminAccess(true);
    assert.match(reviews.status.textContent, /timed out.*try again/i);
    assert.equal(reviews.form.hidden, true);
    assert.equal(reviews.confirm.disabled, true);
});
