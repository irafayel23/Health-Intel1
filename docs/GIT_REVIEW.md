# Git review — 1 October 2026

Reviewed the proposed ledger changes and current tracked files locally. No push or history rewrite was performed.

## Current files and exclusions

The reviewed index contains no private `.env`, local JWT secret, dependency installation, Python environment, credential JSON/private key or private backup/dump/archive files. `.gitignore` covers these at nested paths, including `node_modules/`, `.venv/`, `venv/`, `__pycache__/`, `backups/`, `private-backups/`, SQL/dump/ZIP files and private-key/service-account files. Thirteen representative paths were checked with `git check-ignore`, including the active backend's `.env`, JWT secret and dependency paths.

Private current environment/JWT values were compared in memory against tracked text files without printing them; no matches or private-key markers were found. This is a bounded local review, not a guarantee that arbitrary secrets can never appear in any file. `.env.example` contains placeholders and remains intentionally tracked. Package manifests, lockfiles and Python requirements remain tracked so dependencies can be installed reproducibly.

Local QA logs, scripts and synthetic screenshots are under ignored `analysis/`. Generated schema/ERD files in untracked `output/` are outside this commit. No database, private configuration or dependency installation changed for the ledger feature.

## Historical credential finding

Current-file exclusions do **not** remove data already committed. A redacted local history check found an older hardcoded SMTP credential in `test/server.js`, including commit `93b9a20` and preceding versions. Those commits are ancestors of the locally cached upstream branch; the review did not fetch GitHub or test whether the credential remains usable.

The user previously reported changing the local SMTP password. Revocation of the old Google app password is not verified. Ensure that old password is revoked in the sender account; replacing a value in `.env` alone does not revoke it. Never paste the old or new value into a chat, issue or commit. Coordinated history removal is separate work and would require checking branches/tags and collaborators before any rewrite or force push.

Historical `.env` files were also found: the old server version uses placeholder secret fields/empty database password, and the frontend version contains public Firebase web configuration. These findings are distinguished from the hardcoded SMTP credential. The repository's full history cannot be described as credential-free.

## Follow-up publication review — 3 October 2026

The user authorized publishing the accumulated QA, Admin Access, login/branding, public API-origin and responsive-layout changes after reporting manual mobile checks on each HTML page. The final automated suite passed 86 tests with no failures. Git whitespace checks passed, and representative active environment, dependency, private backup and QA paths remain ignored. Known current private secret values were absent from the reviewed outgoing changes; this remains a bounded review and does not certify historical commits.

Private demo files, test logs, recovery backups and screenshots under `analysis/` are excluded. Generated schema/ERD files under local `output/` are excluded from this publication. No database migration or dependency installation is included. Earlier no-push statements record the review at that earlier date; actual publication is confirmed separately by the push result and remote commit check. No history rewrite or recovery-tag publication is authorized or performed.
