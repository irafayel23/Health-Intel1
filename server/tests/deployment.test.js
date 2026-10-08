const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { readDeploymentConfig, configureDeployment } = require('../config/deployment-config');

const fixture = {
    NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://health.example.test', SERVE_FRONTEND: 'true',
    TRUST_PROXY: 'loopback', JWT_SECRET: 'unit-test-only-abcdef0123456789-abcdef0123456789',
    DB_HOST: '127.0.0.1', DB_USER: 'health_intel_app', DB_PASSWORD: 'unit-test-only', DB_NAME: 'unit_test'
};

test('production configuration rejects incomplete secrets, public root DB access and unchecked proxy trust', () => {
    const config = readDeploymentConfig(fixture);
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.trustProxy, 'loopback');
    for (const patch of [
        { PUBLIC_ORIGIN: '' }, { PUBLIC_ORIGIN: 'http://health.example.test' },
        { PUBLIC_ORIGIN: 'https://health.example.test/path' }, { PUBLIC_ORIGIN: 'https://user:secret@health.example.test' },
        { JWT_SECRET: '' }, { JWT_SECRET: 'replace-this-with-a-random-secret-before-deploying' },
        { DB_USER: 'root' }, { DB_PASSWORD: '' }, { DB_HOST: 'public-db.example.test' },
        { TRUST_PROXY: 'true' }, { TRUST_PROXY: '1' }, { PORT: '70000' }, { SERVE_FRONTEND: 'maybe' }
    ]) assert.throws(() => readDeploymentConfig({ ...fixture, ...patch }));
    const local = readDeploymentConfig({});
    assert.equal(local.host, '0.0.0.0');
    assert.equal(local.serveFrontend, false);
    assert.equal(local.trustProxy, false);
});

test('single-origin host exposes only public pages/assets and never repository/private files', async () => {
    const app = express(); app.set('env', 'production');
    configureDeployment(app, readDeploymentConfig(fixture));
    app.get('/api/test', (_req, res) => res.json({ success: true }));
    // Mirror the production authorization boundary for API routes.
    app.use('/api', (_req, res) => res.status(401).json({ success: false }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    try {
        const login = await fetch(base + '/');
        assert.equal(login.status, 200);
        assert.equal(login.redirected, false);
        assert.match(await login.text(), /api-session\.js/);
        assert.equal(login.headers.get('cache-control'), 'no-store');
        const legacyLogin = await fetch(base + '/index.html?reset=example', { redirect: 'manual' });
        assert.equal(legacyLogin.status, 302);
        assert.equal(legacyLogin.headers.get('location'), '/?reset=example');
        assert.equal(legacyLogin.headers.get('cache-control'), 'no-store');
        for (const page of ['index', 'bhw', 'mho', 'admin', 'superadmin']) {
            const response = await fetch(base + '/' + page + '.html');
            assert.equal(response.status, 200); assert.match(await response.text(), /api-session\.js/);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            assert.equal(response.headers.get('x-powered-by'), null);
        }
        assert.equal((await fetch(base + '/assets/js/shared/api-session.js')).status, 200);
        assert.equal((await fetch(base + '/assets/css/shared/portal-responsive.css')).status, 200);
        for (const file of ['/server/.env', '/server/server.js', '/.git/config', '/analysis/SHARE_LINK.txt', '/docs/SETUP.md', '/output/pdf/schema-metadata.json', '/assets/js/.env', '/assets/js/../../server/.env']) {
            assert.equal((await fetch(base + file)).status, 404, file);
        }
        const live = await fetch(base + '/healthz');
        assert.deepEqual(await live.json(), { status: 'ok' });
        assert.equal(live.headers.get('cache-control'), 'no-store');
        const allowed = await fetch(base + '/api/test', { headers: { Origin: fixture.PUBLIC_ORIGIN } });
        assert.equal(allowed.status, 200);
        assert.equal(allowed.headers.get('access-control-allow-origin'), fixture.PUBLIC_ORIGIN);
        assert.equal(allowed.headers.get('cache-control'), 'no-store');
        const rejected = await fetch(base + '/api/test', { headers: { Origin: 'https://other.example.test' } });
        assert.equal(rejected.status, 403);
        assert.equal((await fetch(base + '/api/session')).status, 401);
        const preflight = await fetch(base + '/api/test', { method: 'OPTIONS', headers: { Origin: fixture.PUBLIC_ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
        assert.equal(preflight.status, 204);
        // The direct socket must be loopback, and the nearest untrusted address wins.
        app.get('/proxy-check', (req, res) => res.json({ ip: req.ip }));
        const ip = await (await fetch(base + '/proxy-check', { headers: { 'X-Forwarded-For': '192.0.2.123, 198.51.100.9' } })).json();
        assert.equal(ip.ip, '198.51.100.9');
    } finally { await new Promise(resolve => server.close(resolve)); }
});

test('local API-only mode keeps the existing separate frontend behavior', async () => {
    const app = express(); configureDeployment(app, readDeploymentConfig({}));
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    try {
        const base = 'http://127.0.0.1:' + server.address().port;
        assert.equal((await fetch(base + '/index.html')).status, 404);
        assert.equal((await fetch(base + '/healthz')).status, 200);
    } finally { await new Promise(resolve => server.close(resolve)); }
});
