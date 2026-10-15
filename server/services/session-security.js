const crypto = require('node:crypto');
const storage = new WeakMap();

async function migrateSessionSecurity(db) {
    await db.query(`CREATE TABLE IF NOT EXISTS account_session_epochs (
        system_id VARCHAR(50) NOT NULL PRIMARY KEY,
        epoch BIGINT UNSIGNED NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.query(`CREATE TABLE IF NOT EXISTS revoked_api_sessions (
        token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
        expires_at BIGINT UNSIGNED NOT NULL,
        INDEX idx_revoked_expiry(expires_at)
    ) ENGINE=InnoDB`);
}
const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
async function revokeAccountSessions(connection, systemId) {
    // Call while holding the user row lock in the account-status transaction.
    await connection.execute(`INSERT INTO account_session_epochs(system_id,epoch) VALUES(?,1)
        ON DUPLICATE KEY UPDATE epoch=epoch+1`, [systemId]);
}
function createSessionSecurity(db) {
    if (storage.has(db)) return storage.get(db);
    let ready;
    const service = {
        initialize() {
            return ready || (ready = Promise.all([
                db.query('SELECT system_id,epoch FROM account_session_epochs LIMIT 0'),
                db.query('SELECT token_hash,expires_at FROM revoked_api_sessions LIMIT 0')
            ]).catch(error => {
                if (error.code === 'ER_NO_SUCH_TABLE') return migrateSessionSecurity(db);
                throw error;
            }).catch(error => { ready = null; throw error; }));
        },
        async epoch(connection, systemId) {
            const [rows] = await connection.execute('SELECT epoch FROM account_session_epochs WHERE system_id=?', [systemId]);
            return Number(rows[0]?.epoch || 0);
        },
        async revoked(token) {
            const [rows] = await db.execute('SELECT token_hash FROM revoked_api_sessions WHERE token_hash=? AND expires_at>UNIX_TIMESTAMP()', [tokenHash(token)]);
            return rows.length > 0;
        },
        async logout(token, expiry) {
            await db.execute('INSERT INTO revoked_api_sessions(token_hash,expires_at) VALUES(?,?) ON DUPLICATE KEY UPDATE expires_at=GREATEST(expires_at,VALUES(expires_at))', [tokenHash(token), expiry]);
            await db.execute('DELETE FROM revoked_api_sessions WHERE expires_at<=UNIX_TIMESTAMP()');
        }
    };
    storage.set(db, service);
    return service;
}
module.exports = { migrateSessionSecurity, createSessionSecurity, revokeAccountSessions };
