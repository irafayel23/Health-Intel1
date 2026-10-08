# Deployment preparation

Prepared 3 October 2026. Hosting provider and domain are not chosen. These are tested application settings and reference templates, not a completed public deployment. The current local configuration, database and friend-demo processes are unchanged.

## Intended arrangement

One persistent server runs Node, Python and MySQL, with one HTTPS domain:

```text
Browser -> HTTPS domain -> reverse proxy -> Node on 127.0.0.1:3000
                                             |-- five public pages / public assets
                                             |-- authenticated /api routes
                                             |-- local MySQL and Python bridge
```

A suitable VPS/full-runtime host can support this arrangement. A static-only host cannot run the API, Python forecasts, MySQL or backup utility. No paid provider is selected. The older Render/Aiven draft was replaced because it copied the whole checkout and did not establish the complete runtime or remote database TLS compatibility.

The prepared profile uses loopback MySQL. A managed remote DB requires tested TLS for Node, Python and the dump utility; production refuses a remote DB hostname until that work is prepared. A local authenticated tunnel is a possible future arrangement, not configured here.

## Supplied files

| File | Purpose |
| --- | --- |
| `deploy/runtime.env.example` | Placeholder settings without credentials |
| `deploy/Caddyfile.example` | Same-server HTTPS reverse proxy |
| `deploy/health-intel.service.example` | Linux service supervision and restricted identity |
| `server/scripts/check-deployment.js` | Read-only settings/runtime/tool check |
| `server/config/deployment-config.js` | Validates settings, limits origins and serves public paths |

Use `server/package-lock.json` and the pinned `server/requirements.txt`. No new unpinned requirement list or Docker deployment is introduced before a target is selected.

## Configuration

- Development retains the existing API port and separate frontend. The real local `.env` is unchanged.
- `SERVE_FRONTEND=true` serves the five connected HTML pages and `assets/css`, `assets/js`, `assets/img`. `/` redirects to `/index.html`. Backend, `.env`, `.git`, documents, dumps, exports and demo files are not served.
- HTTPS pages automatically use their own API origin. Explicit `window.HEALTH_INTEL_API_ORIGIN` still overrides it; HTTP local pages retain the existing localhost default.
- Production requires HTTPS `PUBLIC_ORIGIN`, a dedicated non-root DB user/password, DB name/loopback host, and a private random JWT key of at least 32 characters. Never use placeholders as secrets.
- Production `HOST` defaults to loopback. With same-server Caddy, do not expose port 3000 publicly. Managed-host `HOST=0.0.0.0` needs its ingress/firewall reviewed first.
- Origin-bearing requests must match `PUBLIC_ORIGIN`; API authorization still applies without an Origin header. CORS is not authentication.
- `TRUST_PROXY=loopback` is only for the same-machine proxy; `false` is default. Unrestricted true and guessed hop counts are refused. Review the actual proxy topology for another host to keep login/reset IP rate limits meaningful.
- HTML/API responses are non-cacheable and omit the Express signature, with content-type/referrer/frame protections. A full CSP is not enabled: current pages depend on external libraries and inline handlers.
- `/healthz` checks liveness only; protected Superadmin health remains separate. It does not confirm DB/email/forecast health.
- SIGTERM/SIGINT finish current HTTP requests, close the DB pool and enforce a 30-second shutdown deadline. Superadmin still provides manual restart instructions.

## Prepare the selected host

1. Choose a persistent host supporting Node, Python/venv, MySQL-compatible storage, a dump utility and sufficient forecast memory. Capacity/load certification is pending.
2. Install supported Node 22 or newer and Python compatible with pinned dependencies. Under `server`, run `npm ci --omit=dev`, create `.venv`, and install `requirements.txt` there. Do not copy Windows node_modules/venv to Linux.
3. Restore a trusted backup into a separate staging DB and verify the documented schema/migrations. An empty schema is insufficient. Full fresh-installation recovery testing is separate work. Use synthetic records for hosting trials rather than uploading real patient data as a test.
4. Have the DB administrator create a dedicated runtime user with the permissions needed for existing case/account/audit operations and the configured dump options. Use a separate maintenance account for migrations. Do not grant create/drop-database test privileges to the public app. Confirm backup privileges explicitly.
5. Copy reviewed placeholders into private host `server/.env` without overwriting local configuration. Make it readable only by the service user (Linux mode 600). Generate a stable random JWT key on the host and preserve it privately; changes invalidate sessions/reset codes. Set real Python/dump paths.
6. Set the real HTTPS origin/time zone and private SMTP settings. Add the chosen domain to Firebase Authentication's authorized domains and verify the Google popup flow. No Firebase service-account key is needed by this app. Verify actual approval/recovery inbox delivery on the selected host.
7. Run `npm run deploy:check` from `server`. This checks production settings/tools without database connections, email, public servers or secret output. A pass is not a full deployment acceptance test.
8. Review/install the templates for the chosen target. The Linux service assumes `/opt/health-intel`, a dedicated healthintel user, `/usr/bin/node`, private readable `.env` and an installed venv. Provision these first. Caddy requires `HEALTH_INTEL_DOMAIN` set to the real DNS hostname in its service environment. Validate using `caddy validate --config PATH --adapter caddyfile`. DNS and certificate network requirements must be met. The template was not run on a real Linux host here.
9. Expose HTTPS through the proxy. Restrict administrator access and close public MySQL/API ports. Keep backups out of web roots and protect host logs, certificate storage and recovery material.

On Windows, use the same application settings/preflight but replace Python/dump paths. Select and test a persistent Windows service manager and reverse proxy after that target is chosen; the supplied systemd unit is Linux-only.

## Acceptance before real use

In staging with synthetic data, verify four-role login, approval/suspension, barangay scope, encoding/review, maps, reports, actual SMTP, expired sessions and encrypted backup. Forbidden paths such as `/server/.env` must return 404. Check HTTPS and ensure the browser never calls the tester's localhost:3000. Reboot the staging host and verify service recovery.

Rehearse restoring backup into another isolated DB. Complete `MHO_REPORT_REVIEW.md`, establish data provenance and replace testing/default account passwords before accepting real deployment data. Predictions remain unvalidated; model/data changes are deferred.

Keep the last working application revision and a private schema/data recovery plan. Application rollback stops the service, restores reviewed prior code/runtime settings and restarts. Do not overwrite newer data with an old dump without a separate recovery decision. Existing demos remain independent until explicitly switched.

## Sources and limits

- [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/) explains aligning trusted addresses with the real proxy path.
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https) covers certificates, renewal and required hostname/network setup.
- [Firebase Google web authentication](https://firebase.google.com/docs/auth/web/google-signin) covers authorized domains and popup onboarding.

Tests cover origin restrictions, public/private paths, production validation, HTTPS API selection, API-only development and export regressions. Actual Linux service startup, DNS/TLS, provider networking, remote DB TLS, capacity and real inbox delivery remain target-specific. No public deployment, credential change or database migration was performed.
