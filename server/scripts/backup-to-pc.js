// Invoked over SSH. Password arrives on stdin, never in command arguments.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { createDatabaseDump, sendEncryptedBackup } = require('../services/database-backup');
require('../config/security-config').loadEnvironment();

async function main() {
    let input = '';
    for await (const chunk of process.stdin) {
        input += chunk;
        if (input.length > 4096) throw Error('Invalid backup input.');
    }
    const { password } = JSON.parse(input);
    if (typeof password !== 'string' || password.length < 32 || password.length > 128) {
        throw Error('Invalid backup encryption password.');
    }
    // The PC job and this process allow one scheduled dump at a time.
    const lock = path.join(os.tmpdir(), 'health-intel-pc-backup.lock');
    let handle, dump, zipDirectory;
    try {
        handle = await fs.promises.open(lock, 'wx', 0o600);
        await handle.writeFile(String(process.pid));
        dump = await createDatabaseDump({
            host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
        });
        zipDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'health-intel-pc-encrypted-'));
        await fs.promises.chmod(zipDirectory, 0o700);
        const filename = path.join(zipDirectory, 'database.zip');
        await sendEncryptedBackup(fs.createWriteStream(filename, { mode: 0o600 }), dump.filename, password);
        const hash = crypto.createHash('sha256');
        for await (const chunk of fs.createReadStream(filename)) hash.update(chunk);
        const bytes = (await fs.promises.stat(filename)).size;
        await pipeline(fs.createReadStream(filename), process.stdout);
        process.stderr.write(JSON.stringify({ sha256: hash.digest('hex'), bytes }) + '\n');
    } finally {
        if (dump) await dump.cleanup();
        if (zipDirectory && path.dirname(zipDirectory) === os.tmpdir() && path.basename(zipDirectory).startsWith('health-intel-pc-encrypted-')) {
            await fs.promises.rm(zipDirectory, { recursive: true, force: true });
        }
        if (handle) { await handle.close(); await fs.promises.unlink(lock); }
    }
}

main().catch(() => { console.error('Encrypted backup failed; check database access, dump utility or an existing backup lock.'); process.exitCode = 1; });
