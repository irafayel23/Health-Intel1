const path = require('node:path');
const root = path.resolve(__dirname, '../../..');

function scriptPath(name) {
    if (!name.includes('/')) {
        const role = /^(admin|bhw|mho|index|superadmin)-/.exec(name)?.[1];
        name = `${role || 'shared'}/${name}`;
    }
    return path.join(root, 'assets/js', name);
}

module.exports = {scriptPath};
