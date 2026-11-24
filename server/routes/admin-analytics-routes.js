'use strict';
const { text } = require('express');
const { createAdminAnalytics } = require('../services/admin-analytics');
const { createLowCountSarimaDemo } = require('../services/seasonal6200-sarima-demo');

function registerAdminAnalyticsRoutes(app, db, operational) {
    const base = '/api/admin/analytics';
    const data = createAdminAnalytics(db, operational);
    const demo = createLowCountSarimaDemo();
    const handle = action => async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access is required.' });
        try {
            const value = await action(req, res);
            if (!res.headersSent) res.json({ success: true, data: value });
        } catch (error) {
            if (!res.headersSent) res.status(error.status || 503).json({
                success: false, error: error.status ? error.message : 'Analytics data is temporarily unavailable. Try again.'
            });
        }
    };
    const download = (name, csv) => handle(async (_req, res) => {
        const content = await csv();
        res.attachment(name).type('text/csv').send(content);
    });

    app.get(base + '/datasets', handle(() => data.datasets()));
    app.get(base + '/heatmap', handle(req => data.map(req.query)));
    app.get(base + '/historical.csv', download('health-intel-historical-cases.csv', data.exportCsv));
    app.get(base + '/template.csv', download('health-intel-dataset-template.csv', data.template));
    const csvBody = text({ type: 'text/csv', limit: '250kb' });
    app.post(base + '/datasets/preview', csvBody, handle(req => data.preview(req.body)));
    app.post(base + '/datasets/save', csvBody, handle(req => data.save(req.body, req.query.preview, req.user)));

    app.get(base + '/predictions', handle(() => operational.list()));
    app.get(base + '/predictions/runs/:id', handle(req => operational.review(req.params.id)));
    app.post(base + '/predictions/runs', handle(req => operational.start(req.body || {}, req.user)));
    app.get(base + '/predictions/demo', handle(req => demo.forecast(req.query)));
    app.get(base + '/predictions/published', handle(req => operational.forecast(req.query)));
}

module.exports = { registerAdminAnalyticsRoutes };
