const path = require('node:path');
const root = path.resolve(__dirname, '../../..');

function scriptPath(name) {
    if (!name.includes('/')) {
        const role = /^(admin|bhw|mho|index|superadmin)-/.exec(name)?.[1];
        name = `${role || (['chart.js','lucide.min.js'].includes(name) ? 'vendor' : 'shared')}/${name}`;
    }
    return path.join(root, 'assets/js', name);
}

module.exports = {scriptPath};
