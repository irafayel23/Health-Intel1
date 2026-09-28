const path = require('node:path');
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const fs = require('node:fs');

function loadEnvironment() {
    const current = path.join(__dirname, '.env');
    const legacy = path.join(__dirname, '..', 'test', '.env');
    require('dotenv').config({ path: fs.existsSync(current) ? current : legacy, quiet: true });
}
function normalizeEmail(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    const parts=email.split('@');
    if (email.length>255 || parts.length!==2 || parts[0].length>64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0]) || /^\.|\.$|\.\./.test(parts[0])) return null;
    const labels=parts[1].split('.');
    return labels.length>=2 && labels.every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ? email : null;
}
function validPassword(value) {
    return typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value, 'utf8') <= 72;
}
function sessionVersion(passwordHash, secret) {
    return crypto.createHmac('sha256', secret).update(passwordHash).digest('hex');
}
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
}
function emailConfigured() {
    return Boolean(normalizeEmail(process.env.SMTP_USER) && process.env.SMTP_PASSWORD &&
        (process.env.SMTP_HOST || process.env.SMTP_SERVICE));
}
let transport;
async function sendEmail(options) {
    if (!emailConfigured()) throw new Error('EMAIL_NOT_CONFIGURED');
    if (!transport) {
        const port = Number(process.env.SMTP_PORT || 587);
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('EMAIL_CONFIGURATION_INVALID');
        const connection = process.env.SMTP_HOST
            ? { host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === 'true' || port === 465, requireTLS: port !== 465 }
            : { service: process.env.SMTP_SERVICE };
        transport = nodemailer.createTransport({ ...connection,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
            connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
            disableFileAccess:true, disableUrlAccess:true });
    }
    const from = process.env.MAIL_FROM || `HEALTH-INTEL <${process.env.SMTP_USER}>`;
    if (/[\r\n]/.test(from)) throw new Error('EMAIL_CONFIGURATION_INVALID');
    return transport.sendMail({ ...options, from });
}

module.exports = { loadEnvironment, normalizeEmail, validPassword, sessionVersion, escapeHtml, emailConfigured, sendEmail };
