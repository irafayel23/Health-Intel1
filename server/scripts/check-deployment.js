// Read-only configuration/tool check. No database, mail, server or public connection.
require('../config/security-config').loadEnvironment();
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readDeploymentConfig } = require('../config/deployment-config');

let failed = false;
function check(name, operation) {
    try { operation(); console.log('PASS: ' + name); }
    catch { failed = true; console.error('FAIL: ' + name + ' (review the deployment guide; private values are not printed)'); }
}
check('production settings', () => readDeploymentConfig({ ...process.env, NODE_ENV: 'production' }));
check('supported Node runtime', () => { if (Number(process.versions.node.split('.')[0]) < 22) throw Error(); });
const root = path.join(__dirname, '..', '..');
check('public pages and assets', () => {
    for (const file of ['index.html', 'bhw.html', 'mho.html', 'admin.html', 'superadmin.html', 'assets/js/shared/api-session.js', 'assets/css/shared/portal-responsive.css']) {
        if (!fs.statSync(path.join(root, file)).isFile()) throw Error();
    }
});
const python = process.env.PYTHON_PATH || path.join(__dirname, '..', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
check('Python forecast dependencies', () => execFileSync(python, ['-c', 'import pandas, numpy, statsmodels, mysql.connector'], { stdio: 'ignore', timeout: 20000, windowsHide: true }));
const dump = process.env.MYSQLDUMP_PATH || (process.platform === 'win32' ? 'C:\\xampp\\mysql\\bin\\mysqldump.exe' : 'mysqldump');
check('database dump utility', () => execFileSync(dump, ['--version'], { stdio: 'ignore', timeout: 10000, windowsHide: true }));
if (!(process.env.SMTP_HOST || process.env.SMTP_SERVICE) || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('TODO: configure SMTP and verify approval/recovery email on the host.');
}
console.log('This check does not establish database connectivity, HTTPS, real email delivery, restore readiness or MHO approval.');
process.exitCode = failed ? 1 : 0;
