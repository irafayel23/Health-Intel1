const { transaction } = require('./database-transaction');
const { createSystemAudit } = require('./system-audit');
function createAccountCredentials(db) {
    return {
        async find(system_id, { forUpdate = false } = {}) {
            const [rows] = await db.execute('SELECT * FROM users WHERE system_id = ?' + (forUpdate ? ' FOR UPDATE' : ''), [system_id]);
            return rows;
        },

        async updatePassword(system_id, hashedNewPassword, user, expected, renewSession) {
            return transaction(db, async connection => {
                const [[current]] = await connection.execute('SELECT password_hash,status,role FROM users WHERE system_id=? FOR UPDATE', [system_id]);
                if (!current || current.password_hash !== expected.password_hash || current.status !== expected.status || current.role !== expected.role) throw Error('Account changed; try again.');
                await connection.execute('UPDATE users SET password_hash = ? WHERE system_id = ?', [hashedNewPassword,system_id]);
                const result = await renewSession(connection);
                await createSystemAudit(connection).record(user, 'Password Changed', {summary:`Password changed for ${system_id}; previous sessions revoked and current browser renewed.`,target_type:'Account',target_id:system_id,outcome:'Succeeded'});
                return result;
            });
        }
    };
}

module.exports = { createAccountCredentials };
