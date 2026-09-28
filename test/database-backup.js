const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const archiver = require('archiver');

archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));

function optionValue(value) {
    const text = String(value ?? '');
    if (/[\r\n\0]/.test(text)) throw new Error('Invalid database connection configuration.');
    return '"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

async function createDatabaseDump(config, { timeoutMs = 120000, signal } = {}) {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'health-intel-backup-'));
    const cleanup = () => {
        if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('health-intel-backup-')) {
            throw new Error('Refusing to remove a directory outside the backup temporary folder.');
        }
        return fs.promises.rm(directory, { recursive: true, force: true });
    };
    const filename = path.join(directory, 'health_intel_backup.sql');
    try {
        await fs.promises.chmod(directory, 0o700);
        const options = path.join(directory, 'connection.cnf');
        const settings = ['[client]', `host=${optionValue(config.host)}`, `user=${optionValue(config.user)}`,
            `password=${optionValue(config.password)}`, `port=${Number(config.port || 3306)}`];
        if (config.ssl) settings.push('ssl=1');
        if (config.ssl?.ca) {
            const caFile = path.join(directory, 'ca.pem');
            await fs.promises.writeFile(caFile, config.ssl.ca, { mode: 0o600 });
            settings.push(`ssl-ca=${optionValue(caFile)}`, 'ssl-verify-server-cert=1');
        }
        await fs.promises.writeFile(options, settings.join('\n') + '\n', { mode: 0o600 });
        const localDump = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
        const executable = process.env.MYSQLDUMP_PATH ||
            (process.platform === 'win32' && fs.existsSync(localDump) ? localDump : 'mysqldump');
        await new Promise((resolve, reject) => {
            const child = spawn(executable, [`--defaults-extra-file=${options}`, '--single-transaction', '--quick',
                '--routines', '--triggers', '--events', '--hex-blob', '--no-tablespaces',
                '--default-character-set=utf8mb4', `--result-file=${filename}`, '--', config.database],
            { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
            let stderr = '';
            let stopped = false;
            const stop = () => { stopped = true; child.kill(); };
            const timer = setTimeout(stop, timeoutMs);
            signal?.addEventListener('abort', stop, { once: true });
            if (signal?.aborted) stop();
            child.stderr.on('data', chunk => { if (stderr.length < 4096) stderr += chunk.toString(); });
            const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', stop); };
            child.on('error', error => { finish(); reject(error); });
            child.on('close', code => {
                finish();
                if (stopped) return reject(new Error('Database backup timed out or was cancelled.'));
                if (code !== 0) {
                    const error = new Error('Database dump failed. Check the dump utility and database permissions.');
                    error.diagnostic = stderr;
                    return reject(error);
                }
                resolve();
            });
        });
        if (!(await fs.promises.stat(filename)).size) throw new Error('The database dump was empty.');
        await fs.promises.unlink(options);
        return { filename, cleanup };
    } catch (error) {
        await cleanup();
        throw error;
    }
}

async function sendEncryptedBackup(res, filename, password) {
    const archive = archiver('zip-encrypted', {
        zlib: { level: 9 }, encryptionMethod: 'aes256', password
    });
    archive.file(filename, { name: 'health_intel_backup.sql' });
    await Promise.all([pipeline(archive, res), archive.finalize()]);
}

module.exports = { createDatabaseDump, sendEncryptedBackup };
