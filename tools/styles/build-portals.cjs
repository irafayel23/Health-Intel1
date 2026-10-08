const { spawnSync } = require('node:child_process');
const path = require('node:path');
const cli = require.resolve('tailwindcss/lib/cli.js');
for (const role of ['bhw', 'admin', 'superadmin']) {
  const result = spawnSync(process.execPath, [cli, '--config', `${role}.config.cjs`,
    '--input', role === 'admin' ? 'admin.css' : 'mho.css',
    '--output', `../../assets/css/${role}/${role}-utilities.css`, '--minify'],
  { cwd: __dirname, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
