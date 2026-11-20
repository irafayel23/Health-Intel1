const { createHmac, randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { normalizeEmail, escapeHtml } = require('../config/security-config');
const { invalid, respond } = require('./service-errors');
const { createSystemAudit } = require('./system-audit');

function createAdminInvitations(secret) {
    const key = createHmac('sha256', secret).update('health-intel:admin-invitation:v1').digest();
    return {
        issue(email, issuer) {
            return jwt.sign({ email, sub: issuer }, key, {
                algorithm: 'HS256', audience: 'health-intel-admin-invite', expiresIn: '24h', jwtid: randomUUID()
            });
        },
        read(token, email) {
            try {
                if (typeof token !== 'string' || token.length > 2048) throw Error();
                const invite = jwt.verify(token, key, { algorithms: ['HS256'], audience: 'health-intel-admin-invite' });
                if (invite.email !== email || typeof invite.sub !== 'string' || typeof invite.jti !== 'string') throw Error();
                return invite;
            } catch {
                throw invalid('Use a valid Admin invitation and sign in with the invited Google email.', 403);
            }
        }
    };
}

function createAdminInvitationHandler(db, invitations, { publicOrigin, sendEmail, emailConfigured } = {}) {
    return async (req, res) => {
        res.set('Cache-Control', 'no-store');
        try {
            if (req.user?.role !== 'superadmin') throw invalid('Superadmin access is required.', 403);
            const email = normalizeEmail(req.body?.email);
            if (!email) throw invalid('Enter the Admin’s Google email address.');
            const [matches] = await db.execute('SELECT role,status FROM users WHERE LOWER(TRIM(email))=?', [email]);
            if (matches.length && (matches.length !== 1 || matches[0].role !== 'admin' ||
                    matches[0].status !== 'denied')) {
                throw invalid('This email already belongs to an account or staff application.', 409);
            }
            const token = invitations.issue(email, req.user.system_id);
            await createSystemAudit(db).record(req.user, 'Admin Invitation Created', {
                summary: 'Created a 24-hour invitation for an LGU Admin.',
                target_type: 'Admin invitation', outcome: 'Succeeded'
            });
            let emailDelivery = 'not_configured';
            if (publicOrigin && emailConfigured?.()) {
                const link = new URL('/', publicOrigin);
                link.hash = 'admin-invite=' + token;
                try {
                    const logo = new URL('/assets/img/Logo-Health-Intel.png', publicOrigin);
                    const html = `<div style="margin:0;background:#edf4f8;padding:24px 12px;font-family:Arial,sans-serif;color:#0f2940">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #cddde7;border-radius:16px">
<tr><td style="padding:20px 24px;background:#0e2c44;color:#ffffff;border-radius:15px 15px 0 0">
<img src="${escapeHtml(logo.href)}" width="44" height="44" alt="Health-Intel logo" style="vertical-align:middle;background:#ffffff;border-radius:8px;margin-right:10px">
<strong style="font-size:17px;vertical-align:middle">HEALTH-INTEL</strong>
</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:25px">Your LGU Admin invitation</h1>
<p style="margin:0 0 20px;line-height:1.55">You have been invited to register as an LGU Admin. Continue with the Google account that received this invitation, then submit your application for Superadmin approval.</p>
<a href="${escapeHtml(link.href)}" style="display:inline-block;background:#075e72;color:#ffffff;padding:13px 20px;border-radius:8px;font-weight:bold;text-decoration:none">Accept invitation</a>
<p style="margin:18px 0 0;font-size:14px;color:#475569">This invitation expires in 24 hours.</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#f4f8fb;color:#475569;font-size:13px;border-radius:0 0 15px 15px">If you were not expecting this invitation, you can ignore this email.</td></tr>
</table>
</div>`;
                    const delivery = await sendEmail({
                        to: email,
                        subject: 'Your Health-Intel Admin invitation',
                        html,
                        text: 'Open the link below within 24 hours and use the invited Google account. Submit your registration for Superadmin approval before signing in.\n\n' + link.href
                    });
                    emailDelivery = delivery?.accepted?.length ? 'sent' : 'failed';
                } catch {
                    emailDelivery = 'failed';
                }
            }
            if (res.locals) res.locals.adminInviteAccepted = emailDelivery === 'sent';
            res.json({ success: true, email_delivery: emailDelivery });
        } catch (error) {
            respond(res, error, 'The Admin invitation could not be created.');
        }
    };
}

async function ensureInviteCanBeRedeemed(connection, invite) {
    const [[issuer]] = await connection.execute(
        "SELECT status FROM users WHERE system_id=? AND role='superadmin' FOR UPDATE", [invite.sub]);
    if (issuer?.status !== 'approved') throw invalid('This Admin invitation is no longer available.', 403);
    const [[used]] = await connection.execute(
        `SELECT id FROM system_audit_logs WHERE action='Admin Invitation Accepted' AND
         JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(details), details, '{}'), '$.invitation_id'))=? LIMIT 1`,
        [invite.jti]);
    if (used) throw invalid('This Admin invitation has already been accepted.', 409);
}

async function recordAdminInvitationAccepted(connection, id, invite) {
    await createSystemAudit(connection).record({ system_id: id, role: 'admin' }, 'Admin Invitation Accepted', {
        summary: 'Submitted an invited LGU Admin registration with a verified Google email for Superadmin approval.',
        target_type: 'Account', target_id: id, invited_by: invite.sub, invitation_id: invite.jti, outcome: 'Succeeded'
    });
}

module.exports = { createAdminInvitations, createAdminInvitationHandler, ensureInviteCanBeRedeemed, recordAdminInvitationAccepted };
