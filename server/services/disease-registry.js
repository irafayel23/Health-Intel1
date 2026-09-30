const { invalid, plain, respond } = require('./service-errors');
const { transaction } = require('./database-transaction');
const { archiveHandler } = require('./record-archive');

function createDiseaseRegistryHandlers(db) {
    return {
        archiveDisease: archiveHandler(db, 'disease_registry', true),
        restoreDisease: archiveHandler(db, 'disease_registry', false),
        async disease(req, res) {
            try {
                const name = plain(req.body.name, 'disease name', 255),
                    classification = plain(req.body.classification, 'classification', 50);
                const category = req.body.category;
                if (name.toLowerCase() === 'pending classification')
                    throw invalid(
                        'This name is reserved for unclassified cases. Enter an actual condition name.'
                    );
                if (!['morbidity', 'mortality'].includes(category))
                    throw invalid('Select morbidity or mortality.');
                await transaction(
                    db,
                    async (connection) => {
                        const [rows] = await connection.execute(
                            'SELECT id FROM disease_registry WHERE LOWER(TRIM(name))=LOWER(?)',
                            [name]
                        );
                        if (rows.length)
                            throw invalid(
                                'This disease name already exists. Review the active or archived registry.',
                                409
                            );
                        await connection.execute(
                            'INSERT INTO disease_registry(name,category,classification) VALUES(?,?,?)',
                            [name, category, classification]
                        );
                        await connection.execute(
                            "INSERT INTO system_audit_logs(user_id,role,action,details) VALUES(?,'Admin','Registry Updated',?)",
                            [req.user.system_id, `Added disease ${name} (${classification}).`]
                        );
                    },
                    'disease-registry'
                );
                res.json({ success: true, message: 'Disease added to registry.' });
            } catch (e) {
                respond(res, e, 'The disease could not be saved.');
            }
        }
    };
}

function createDiseaseRegistryData(db) {
    return {
        async activeDiseases() {
            const [rows] = await db.execute(
                `SELECT * FROM disease_registry WHERE is_archived = FALSE ORDER BY name ASC`
            );
            return rows;
        },

        async archivedDiseases() {
            const [rows] = await db.execute(
                `SELECT * FROM disease_registry WHERE is_archived = TRUE ORDER BY deleted_at DESC`
            );
            return rows;
        }
    };
}

module.exports = { createDiseaseRegistryHandlers, createDiseaseRegistryData };
