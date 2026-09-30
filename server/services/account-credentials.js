function createAccountCredentials(db) {
    return {
        async find(system_id) {
            const [rows] = await db.execute('SELECT * FROM users WHERE system_id = ?', [system_id]);
            return rows;
        },

        async updatePassword(system_id, hashedNewPassword) {
            await db.execute('UPDATE users SET password_hash = ? WHERE system_id = ?', [
                hashedNewPassword,
                system_id
            ]);
        }
    };
}

module.exports = { createAccountCredentials };
