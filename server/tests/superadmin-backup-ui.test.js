const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = join(__dirname, '../..');
const script = readFileSync(join(root, 'assets/js/superadmin/superadmin-backup.js'), 'utf8');
function fixture() {
  const elements = { 'backup-download-button': { disabled: false }, 'backup-password': { value: '', focus() {} }, 'backup-password-confirm': { value: '' } };
  const dialogs = [], errors = [], downloads = [];
  const context = vm.createContext({ document: { getElementById: id => elements[id] }, Swal: { fire: async options => { dialogs.push(options); return {}; }, showValidationMessage: text => errors.push(text) }, HealthIntel: { download: async (...args) => downloads.push(args) } });
  vm.runInContext(script, context);
  return { context, elements, dialogs, errors, downloads };
}
test('offline guide downloads its visible instructions as a text file without a backup request', async () => {
  const { context, elements, downloads } = fixture();
  elements['recovery-guide-title'] = { textContent: 'Recover when Health-Intel is offline' };
  elements['recovery-guide-steps'] = {
    querySelectorAll: () => [{textContent: 'Before an outage'}, {textContent: 'Save an encrypted backup.'}]
  };
  let file, clicked = false, revoked = false;
  const link = { click() { clicked = true; }, remove() {} };
  Object.assign(context, {
    Blob,
    URL: {createObjectURL(value) {file = value; return 'blob:fixture';}, revokeObjectURL() {revoked = true;}},
    setTimeout(callback) {callback();}
  });
  Object.assign(context.document, {createElement: () => link, body: {append() {}}});
  context.downloadRecoveryGuide();
  assert.equal(link.download, 'Health-Intel Offline Recovery Guide.txt');
  assert.match(await file.text(), /Before an outage[\r\n]+Save an encrypted backup\./);
  assert.ok(clicked && revoked);
  assert.deepEqual(downloads, []);
});
test('backup dialog cancellation keeps the download idle and restores its button', async () => {
  const { context, dialogs, elements, downloads } = fixture();
  await context.backupDB();
  assert.equal(dialogs.length, 1);
  const dialog = dialogs[0];
  assert.equal(dialog.titleText, 'Database Backup');
  assert.equal(dialog.customClass.popup, 'hi-account-dialog hi-backup-dialog');
  assert.match(dialog.html, /label for="backup-password"/);
  assert.match(dialog.html, /label for="backup-password-confirm"/);
  assert.equal(dialog.showCloseButton, true);
  assert.equal(dialog.cancelButtonText, 'Cancel');
  assert.equal(dialog.focusConfirm, false);
  assert.equal(elements['backup-download-button'].disabled, false);
  assert.deepEqual(downloads, []);
});
test('backup dialog retains password length and confirmation checks', async () => {
  const { context, elements, dialogs, errors, downloads } = fixture();
  await context.backupDB();
  const check = dialogs[0].preConfirm;
  for (const length of [0, 11, 129]) {
    elements['backup-password'].value = 'Q'.repeat(length);
    elements['backup-password-confirm'].value = 'Q'.repeat(length);
    assert.equal(check(), false);
    assert.equal(errors.at(-1), 'Use between 12 and 128 characters.');
  }
  elements['backup-password'].value = 'QA-only-12xx';
  elements['backup-password-confirm'].value = 'Different-12';
  assert.equal(check(), false);
  for (const length of [12, 128]) {
    elements['backup-password'].value = 'Q'.repeat(length);
    elements['backup-password-confirm'].value = 'Q'.repeat(length);
    assert.equal(check(), 'Q'.repeat(length));
  }
  elements['backup-password-confirm'].value = 'Mismatch-value';
  assert.equal(check(), false);
  assert.equal(errors.at(-1), 'The passwords must match.');
  assert.deepEqual(downloads, []);
});
