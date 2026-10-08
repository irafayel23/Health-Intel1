const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { isIP } = require('node:net');

function readDeploymentConfig(env = process.env) {
    const production = env.NODE_ENV === 'production';
    const port = Number(env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT must be a valid TCP port.');
    const host = env.HOST || (production ? '127.0.0.1' : '0.0.0.0');
    if (!isIP(host) && host !== 'localhost') throw Error('HOST must be an IP address or localhost.');
    let publicOrigin;
    if (env.PUBLIC_ORIGIN) {
        let url;
        try { url = new URL(env.PUBLIC_ORIGIN); } catch { throw Error('PUBLIC_ORIGIN must be a complete web origin.'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
            throw Error('PUBLIC_ORIGIN must contain only a web origin, without credentials, paths or query strings.');
        }
        if (production && url.protocol !== 'https:') throw Error('Production PUBLIC_ORIGIN must use HTTPS.');
        publicOrigin = url.origin;
    }
    if (env.SERVE_FRONTEND && !['true', 'false'].includes(env.SERVE_FRONTEND)) throw Error('SERVE_FRONTEND must be true or false.');
    const trustProxy = env.TRUST_PROXY || 'false';
    if (!['false', 'loopback'].includes(trustProxy)) throw Error('TRUST_PROXY must be false or loopback; other proxy topologies need explicit review.');
    if (production) {
        if (!publicOrigin) throw Error('Set PUBLIC_ORIGIN for production.');
        if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32 || /change.?me|replace|example/i.test(env.JWT_SECRET)) {
            throw Error('Set a private random JWT_SECRET of at least 32 characters for production.');
        }
        if (!env.DB_USER || env.DB_USER.toLowerCase() === 'root') throw Error('Use a dedicated database account for production, not root.');
        if (!env.DB_PASSWORD || !env.DB_NAME) throw Error('Set DB_PASSWORD and DB_NAME for production.');
        // Both the Node API and existing Python bridge currently share plain local DB settings.
        // Do not claim remote TLS support until both clients and the dump tool are configured/tested.
        if (!['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST)) {
            throw Error('This deployment profile requires a local/private loopback database. Remote database TLS needs separate preparation.');
        }
    }
    return { production, port, host, publicOrigin, serveFrontend: env.SERVE_FRONTEND === 'true', trustProxy: trustProxy === 'loopback' ? 'loopback' : false };
}

function configureDeployment(app, config, projectRoot = path.join(__dirname, '..', '..')) {
    app.disable('x-powered-by');
    app.set('trust proxy', config.trustProxy);
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
        const origin = req.get('Origin');
        if (config.publicOrigin && origin && origin !== config.publicOrigin) {
            return res.status(403).json({ success: false, error: 'This web origin is not allowed.' });
        }
        next();
    });
    app.use(cors(config.publicOrigin ? { origin: config.publicOrigin, exposedHeaders: ['Content-Disposition'] } : undefined));
    // Liveness only: no database, account, configuration or patient information.
    app.get('/healthz', (_req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok' }));
    if (!config.serveFrontend) return;
    app.get('/', (_req, res) => {
        res.set('Cache-Control', 'no-store');
        res.sendFile(path.join(projectRoot, 'index.html'), { dotfiles: 'deny' });
    });
    app.get('/index.html', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.redirect(302, '/' + req.url.slice(req.path.length));
    });
    for (const page of ['bhw.html', 'mho.html', 'admin.html', 'superadmin.html']) {
        app.get('/' + page, (_req, res) => {
            res.set('Cache-Control', 'no-store');
            res.sendFile(path.join(projectRoot, page), { dotfiles: 'deny' });
        });
    }
    // Never expose the repository root, backend, documents, exports or backups.
    for (const directory of ['css', 'js', 'img']) {
        app.use('/assets/' + directory, express.static(path.join(projectRoot, 'assets', directory), {
            dotfiles: 'deny', index: false, redirect: false, fallthrough: false, maxAge: 0
        }));
    }
    app.use('/assets', (error, _req, res, _next) => {
        res.status([403, 404].includes(error.status) ? 404 : 500)
            .json({ success: false, error: 'Public asset unavailable.' });
    });
}

module.exports = { readDeploymentConfig, configureDeployment };
