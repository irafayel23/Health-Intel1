const { transaction } = require('./database-transaction');
const { createSystemAudit } = require('./system-audit');
function createAccountCredentials(db) {
    return {
        async find(system_id) {
            const [rows] = await db.execute('SELECT * FROM users WHERE system_id = ?', [system_id]);
            return rows;
        },

        async updatePassword(system_id, hashedNewPassword, user) {
            await transaction(db, async connection => {
                await connection.execute('UPDATE users SET password_hash = ? WHERE system_id = ?', [hashedNewPassword,system_id]);
                await createSystemAudit(connection).record(user, 'Password Changed', {summary:`Password changed for ${system_id}; previous sessions revoked.`,target_type:'Account',target_id:system_id,outcome:'Succeeded'});
            });
        }
    };
}

module.exports = { createAccountCredentials };
