const { createConditionReview } = require('../services/condition-review');
const { plain, invalid, respond } = require('../services/service-errors');
const { reviewVersion } = require('../services/disease-review');

function registerDiseaseReviewRoutes(app, db) {
    const reviews = createConditionReview(db);
    app.put('/api/patients/:id/condition-clarification', async (req, res) => {
        try {
            const reported = plain(req.body.reported_condition, 'reported condition', 255);
            const source = plain(req.body.condition_source, 'condition source', 500);
            await reviews.clarify(req.params.id, req.user, reported, source);
            res.json({ success: true });
        } catch (error) {
            respond(res, error, 'The clarification could not be saved.');
        }
    });
    app.get('/api/mho/disease-reviews', async (req, res) => {
        try {
            const data = await reviews.queue();
            res.json({
                success: true,
                data: data.map((row) => ({ ...row, version: reviewVersion(row) })),
                pending_count: data.length
            });
        } catch (error) {
            respond(res, error, 'Disease reviews could not be loaded.');
        }
    });
    app.put('/api/mho/disease-reviews/:id', async (req, res) => {
        try {
            const id = Number(req.params.id),
                input = req.body || {};
            if (!Number.isSafeInteger(id) || id < 1) throw invalid('Select a valid case ID.');
            if (!['existing', 'new', 'clarification'].includes(input.action))
                throw invalid('Select a review action.');
            const note = plain(input.note, 'review note', 1000);
            const result = await reviews.resolve(id, input, note, req.user);
            res.json({ success: true, id, ...result });
        } catch (error) {
            respond(res, error, 'The review could not be saved. No partial change was kept.');
        }
    });
}
module.exports = { registerDiseaseReviewRoutes };
