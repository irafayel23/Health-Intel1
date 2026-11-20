const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = join(__dirname, '../..');
const usersScript = readFileSync(join(root, 'assets/js/admin/admin-users.js'), 'utf8');
const escapeText = value => String(value ?? '').replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function fixture() {
    const accounts = [
        { system_id: 'QA-P', first_name: '<img src=x>', employee_id: 'QA-101', role: 'bhw' },
        { system_id: 'QA-A', role: 'bhw', assigned_barangay: 'Salvacion' },
        { system_id: 'QA-S', status: 'suspended', suspended_at: '2026-11-07T08:00:00.000Z' },
        { system_id: 'QA-D', status: 'denied' }
    ];
    const dialogs = [], actions = [], answers = [], focused = [], requests = [];
    const failEndpoints = new Set();
    const lists = {
        'pending-users': [accounts[0]],
        'active-users': [accounts[1]],
        'denied-users': accounts.slice(2)
    };
    const tables = Object.fromEntries(['pending-table-body', 'active-users-table-body', 'denied-table-body']
        .map(id => [id, {
            innerHTML: '',
            querySelectorAll() {
                this.rows = Array.from(this.innerHTML.matchAll(/class="admin-personnel-row"/g), () => ({
                    addEventListener(event, callback) { this[event] = callback; },
                    querySelector() { return { focus: options => focused.push(options.preventScroll) }; }
                }));
                return this.rows;
            }
        }]));
    const pagers = Object.fromEntries(Object.keys(tables).map(id => [id + '-pagination', { innerHTML: '', querySelector: () => ({ focus: options => focused.push(options.preventScroll) }) }]));
    const context = vm.createContext({
        document: { getElementById: id => tables[id] || pagers[id] || ({'registration-denial-reason':{value:'0'},'registration-denial-note':{value:''},'registration-decision-notice':{dataset:{}}})[id] },
        escapeText,
        fetch: async (url, options) => {
            const endpoint = url.split('/').at(-1);
            requests.push(endpoint);
            if (failEndpoints.has(endpoint)) throw Error('QA network failure');
            if (options?.method === 'POST') actions.push([endpoint, JSON.parse(options.body)]);
            return { ok: true, json: async () => ({ success: true, data: lists[endpoint] }) };
        },
        Swal: { fire: async (...args) => { dialogs.push(args[0]);const answer=answers.shift() ?? {};if(answer.isConfirmed && args[0].customClass?.popup==='registration-denial-dialog')answer.value=await args[0].preConfirm();return answer; },isLoading:()=>false,showValidationMessage:()=>{} }
    });
    vm.runInContext(readFileSync(join(root, 'assets/js/shared/registration-review.js'), 'utf8'), context);
    vm.runInContext(usersScript, context);
    return { context, tables, dialogs, actions, answers, focused, lists, pagers, requests, failEndpoints };
}

test('all three Admin lists open escaped details with the proper action and no automatic writes', async () => {
    const { context, tables, dialogs, actions, focused } = fixture();
    await context.loadUsers();
    for (const [id, labels] of [
        ['pending-table-body', ['Approve']],
        ['active-users-table-body', ['Suspend Access']],
        ['denied-table-body', ['Restore Access', 'Re-evaluate']]
    ]) {
        assert.match(tables[id].innerHTML, /<button type="button" class="admin-personnel-open"/);
        assert.doesNotMatch(tables[id].innerHTML, /Suspend Access|Restore Access|Deny registration|<img/);
        assert.match(tables[id].innerHTML, /class="admin-personnel-name"[\s\S]*class="admin-personnel-id"/);
        for (const [index, row] of tables[id].rows.entries()) {
            await row.click();
            assert.equal(dialogs.at(-1).confirmButtonText, labels[index]);
            assert.equal(dialogs.at(-1).focusCancel, true);
            const dialog = dialogs.at(-1);
            assert.equal(dialog.showCloseButton,true);assert.equal(dialog.closeButtonAriaLabel,'Close account details');
            assert.equal(dialog.reverseButtons, undefined);
            assert.equal(dialog.didRender, undefined);
        }
    }
    assert.match(dialogs[0].html, /&lt;img src=x&gt;/);
    assert.equal(dialogs[0].showDenyButton, true);
    assert.match(dialogs[1].html, /Salvacion/);
    assert.equal(dialogs[2].showDenyButton, false);
    assert.match(dialogs[2].html, /Suspended on[\s\S]*Nov 7, 2026, 4:00 PM PHT/i);
    assert.doesNotMatch(dialogs[3].html, /Suspended on/);
    await context.openPersonnelDetails({ system_id: 'QA-LEGACY' }, 'suspended');
    assert.match(dialogs.at(-1).html, /Suspended on[\s\S]*Date not recorded/);
    assert.deepEqual(focused, [true, true, true, true]);
    assert.deepEqual(actions, []);
});

test('personnel dialogs retain explicit confirmation and existing access routes', async () => {
    const { context, tables, actions, answers } = fixture();
    await context.loadUsers();
    const click = (id, row = 0) => tables[id].rows[row].click();
    answers.push({ isConfirmed: true }, { isDismissed: true });
    await click('active-users-table-body');
    assert.deepEqual(actions, []);

    for (const [id, row, decision, route, payload, needsConfirmation] of [
        ['pending-table-body', 0, 'isConfirmed', 'approve-user', { temp_system_id: 'QA-P', review_confirmed:false }, true],
        ['pending-table-body', 0, 'isDenied', 'deny-user', { system_id: 'QA-P',reason:'Employee ID photo is blurry or unreadable' }, true],
        ['active-users-table-body', 0, 'isConfirmed', 'suspend-user', { system_id: 'QA-A' }, true],
        ['denied-table-body', 0, 'isConfirmed', 'restore-suspended', { system_id: 'QA-S' }, true],
        ['denied-table-body', 1, 'isConfirmed', 'undo-deny', { temp_system_id: 'QA-D' }, false]
    ]) {
        answers.push({ [decision]: true });
        if (needsConfirmation) answers.push({ isConfirmed: true, ...(route==='deny-user'?{value:{reason:'Employee ID photo is blurry or unreadable'}}:{}) });
        await click(id, row);
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(actions.shift(), [route, payload]);
        assert.deepEqual(actions, []);
    }
});

test('Admin header and personnel markup use the requested icons, labels and delayed hint', () => {
    const html = readFileSync(join(root, 'admin.html'), 'utf8');
    const css = readFileSync(join(root, 'assets/css/admin/admin-page.css'), 'utf8');
    const iam = html.slice(html.indexOf('id="view-iam"'), html.indexOf('id="view-data"'));
    assert(html.indexOf('id="theme-toggle-btn"') < html.indexOf('id="overview-account-id"'));
    assert(html.indexOf('id="overview-account-id"') < html.indexOf('id="account-profile"'));
    assert.match(html, /id="overview-refresh" aria-label="Refresh overview"[^>]*><i[^>]*><\/i><\/button>/);
    assert.doesNotMatch(html, />Administration<\/p>|id="admin-view-title"/);
    assert.match(css, /\.admin-disease-header \.admin-add-disease \{[^}]*background: #047857/);
    assert.match(iam, /<h1 id="admin-personnel-title">User Management<\/h1>/);
    assert.equal([...iam.matchAll(/<th scope="col">Account<\/th>/g)].length, 3);
    assert.doesNotMatch(iam, /admin-personnel-icon/);
    assert.doesNotMatch(iam, />Actions<\/th>/);
    assert.match(html, /id="admin-row-tooltip" aria-hidden="true">Click to see details/);
    assert.match(css, /#admin-row-tooltip\.is-visible \{[^}]*transition: visibility 0s 250ms/);
    assert.match(usersScript, />View profile<\/span>/);
});


test('Admin pagination preserves per-tab pages and account identity without refetching', async () => {
    const { context, lists, tables, pagers, dialogs, requests, actions } = fixture();
    for (const [key, status] of [['pending-users', 'pending'], ['active-users', 'approved'], ['denied-users', 'suspended']]) {
        lists[key] = Array.from({ length: 53 }, (_, n) => ({ system_id: key + '-' + (n + 1), first_name: 'QA ' + (n + 1), status }));
    }
    await context.loadUsers();
    assert.equal(tables['active-users-table-body'].rows.length, 10);
    assert.match(pagers['active-users-table-body-pagination'].innerHTML, /Page 1 of 6/);
    assert.match(pagers['active-users-table-body-pagination'].innerHTML, /Previous.*disabled|disabled.*Previous/);
    context.goToAdminPersonnelPage('active-users-table-body', 2);
    assert.equal(requests.length, 3);
    assert.match(tables['active-users-table-body'].innerHTML, /active-users-11/);
    assert.doesNotMatch(tables['active-users-table-body'].innerHTML, /active-users-1"/);
    await tables['active-users-table-body'].rows[0].click();
    assert.equal(dialogs.at(-1).titleText, 'Account active-users-11');
    context.goToAdminPersonnelPage('pending-table-body', 6);
    assert.equal(tables['pending-table-body'].rows.length, 3);
    assert.match(pagers['pending-table-body-pagination'].innerHTML, /51–53 of 53 accounts/);
    assert.match(pagers['active-users-table-body-pagination'].innerHTML, /Page 2 of 6/);
    await context.loadUsers();
    assert.match(pagers['active-users-table-body-pagination'].innerHTML, /Page 2 of 6/);
    lists['active-users'] = lists['active-users'].slice(0, 2);
    await context.loadUsers();
    assert.match(pagers['active-users-table-body-pagination'].innerHTML, /Page 1 of 1/);
    context.goToAdminPersonnelPage('denied-table-body', 999);
    assert.equal(tables['denied-table-body'].rows.length, 3);
    assert.deepEqual(actions, []);
});

test('empty and failed Admin lists discard stale rows and controls', async () => {
    const { context, lists, tables, pagers, failEndpoints } = fixture();
    await context.loadUsers();
    lists['pending-users'] = [];
    failEndpoints.add('active-users');
    await context.loadUsers();
    assert.match(tables['pending-table-body'].innerHTML, /No accounts in this list/);
    assert.doesNotMatch(pagers['pending-table-body-pagination'].innerHTML, /<button/);
    assert.match(tables['active-users-table-body'].innerHTML, /Accounts could not be loaded/);
    assert.equal(pagers['active-users-table-body-pagination'].innerHTML, '');
    assert.equal(tables['active-users-table-body'].rows.length, 0);
});
