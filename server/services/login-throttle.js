const crypto = require('node:crypto');
const { transaction } = require('./database-transaction');

const WAIT_SECONDS = [60, 300, 900];

async function migrateLoginThrottle(db) {
    await db.query(`CREATE TABLE IF NOT EXISTS login_attempt_limits (
        account_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
        failure_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
        lock_level TINYINT UNSIGNED NOT NULL DEFAULT 0,
        blocked_until BIGINT UNSIGNED NOT NULL DEFAULT 0
    ) ENGINE=InnoDB`);
}

function accountKey(systemId) {
    return crypto.createHash('sha256').update(systemId.toUpperCase()).digest('hex');
}

function waitResponse(seconds) {
    return {
        status: 429,
        retryAfter: seconds,
        body: { success: false, error: `Too many incorrect login attempts. Please wait ${seconds} seconds before trying again.`, retry_after_seconds: seconds }
    };
}

function createLoginThrottle(db, { now = Date.now } = {}) {
    let ready;
    // Existing production storage needs only normal SELECT/INSERT/UPDATE/DELETE rights.
    // Local installs can create missing storage with their existing migration privileges.
    const initialize = () => ready || (ready = db.query('SELECT account_key,failure_count,lock_level,blocked_until FROM login_attempt_limits LIMIT 0')
        .catch(error => { if (error.code === 'ER_NO_SUCH_TABLE') return migrateLoginThrottle(db); throw error; })
        .catch(error => { ready = null; throw error; }));
    return {
        // Serialize verification and counter updates across requests and server instances.
        // The database preserves waits through refreshes, IP changes and server restarts.
        async attempt(systemId, verify) {
            await initialize();
            const key = accountKey(systemId);
            return transaction(db, async connection => {
                const [rows] = await connection.execute('SELECT failure_count,lock_level,blocked_until FROM login_attempt_limits WHERE account_key = ? FOR UPDATE', [key]);
                const state = rows[0] || { failure_count: 0, lock_level: 0, blocked_until: 0 };
                if (Number(state.blocked_until) > now()) {
                    return { ...waitResponse(Math.max(1, Math.ceil((Number(state.blocked_until) - now()) / 1000))), alreadyBlocked: true };
                }
                const outcome = await verify(connection);
                if (outcome.body.success) {
                    await connection.execute('DELETE FROM login_attempt_limits WHERE account_key = ?', [key]);
                } else if (outcome.wrongCredentials) {
                    state.failure_count += 1;
                    state.blocked_until = 0;
                    let wait;
                    if (state.failure_count >= 5) {
                        state.failure_count = 0;
                        state.lock_level = Math.min(state.lock_level + 1, WAIT_SECONDS.length);
                        wait = WAIT_SECONDS[state.lock_level - 1];
                        state.blocked_until = now() + wait * 1000;
                    }
                    await connection.execute(`INSERT INTO login_attempt_limits (account_key,failure_count,lock_level,blocked_until)
                        VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE failure_count=VALUES(failure_count),lock_level=VALUES(lock_level),blocked_until=VALUES(blocked_until)`,
                    [key, state.failure_count, state.lock_level, state.blocked_until]);
                    if (wait) return waitResponse(wait);
                }
                return outcome;
            }, 'login:' + key);
        }
    };
}

module.exports = { createLoginThrottle, migrateLoginThrottle, accountKey };
