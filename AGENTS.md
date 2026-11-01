# Shared Health-Intel development instructions

These instructions apply to both CODEX-1 and CODEX-2 working in this same checkout. This is file-based coordination, not shared ChatGPT account memory. Source code, Git state and dated verification evidence take precedence over conversational recollection or older planning notes. User instructions take precedence over this file.

## Start every session

1. Use `C:\Users\User\Downloads\Final proj\proposal`. Do not create a replacement application or work from an old sibling prototype. Confirm the actual working directory.
2. Identify as CODEX-1 or CODEX-2 using the user's supplied identifier. If none was supplied, ask once; continue safe read-only inspection and mark identity unconfirmed until answered. Never impersonate another account.
3. Read `docs/PROJECT_OVERVIEW.md`, `docs/CODEX_HANDOFF.md`, `docs/CODEX_TASKS.md`, recent `docs/CODEX_CHANGELOG.md` entries, and technical guidance relevant to the task. Check applicable nested AGENTS.md files. The existing `docs/AGENTS.md` remains valid; some historical descriptions there are superseded by inspected implementation documented in the overview.
4. Read Git branch, HEAD, status including untracked files, and relevant diffs. Preserve pre-existing changes. Do not read or print secrets to understand configuration; inspect variable names and validation code instead.
5. Read the active-writer entry and In Progress tasks. Only ONE account may modify this directory at a time. If another account is actively editing, resolve ownership with the user before writing overlapping files. A stale entry is not proof a process is running: inspect evidence and ask if ownership is uncertain. Never automatically kill processes, steal ownership or discard unfinished work.
6. Confirm scope from the current request, inspect the real implementation, then record task ID, owner, status In Progress, planned files and current Manila time before editing. This is not a new approval gate: proceed with already authorized work when ownership is clear.

## One-writer handoff

The Markdown owner record is an agreement, not an atomic filesystem lock or automatic account synchronizer. Do not claim it prevents concurrent writes. The user should run only one editing account at a time. The other account may read for context; it must not write until ownership is released or explicitly reassigned. Recheck relevant file hashes/diffs immediately before applying edits. If they changed unexpectedly, preserve both versions and resolve the conflict first.

## Preserve implementation and evidence

- Keep the existing vanilla HTML/JavaScript frontend and focused Express services. No unnecessary framework, package, cloud service or database additions.
- Preserve existing HTML IDs and onclick hooks unless a user-authorized change explicitly requires coordinating all consumers. Use existing Tailwind tooling and styles; do not introduce inline style blocks as a shortcut.
- Keep code and research separate. The current MHO SARIMA demonstration serves saved synthetic evidence; it does not fit a model or read operational cases when Run Forecast is clicked. The owner authorized retirement of the older AR(1) path on 1 November 2026: `/api/predict` returns 410 and the Python worker is removed. Preserve the current `/api/mho/sarima-demo` SARIMA path; do not restore AR(1) without authorization.
- Forecasting scope is the exact ten diseases and seven barangays in the overview. Operational recording can use the full active catalog. An unlisted condition enters MHO review, not automatic forecasting eligibility.
- Preserve the frozen Balanced CSV, seed, generation rules, model source, diagnostics, test targets, evaluation rules, result files and ZIP. Do not regenerate, retune, mix inspected tests with new confirmation, fill missing forecasts with zero, average component percentages into an aggregate score, or substitute the pooled 86.17% for a selected scope.
- Historical within-tolerance performance is not disease-occurrence probability or proof of future cases. No model output independently diagnoses, prescribes, or declares an outbreak. Suggested actions require MHO review. Synthetic-data approval is owner-reported; the proposed error tolerance still needs explicit panel acceptance. Genuine-data validation is pending even when that wording is absent from the UI.
- No patient data, names, passwords, reset codes, private keys, tokens, `.env` contents, SQL dumps or live credentials in shared notes, commits or screenshots. Use synthetic fixtures and schema-level descriptions.
- Preserve authorization, BHW barangay restrictions, account/session invalidation, database facade and clinical history. Do not run migrations, imports, seed scripts, restore operations or live writes merely to inspect or document the project.
- Do not reset, clean, stash, stage, commit or push without authorization. Preserve the security checkpoint and unrelated work. Do not change Azure, firewall, VM size, deployment configuration or production resources without explicit scope authorization. Documentation work does not authorize application changes.

## End every task

1. Check actual changed files and relevant diffs against the initial state; verify no unrelated work was overwritten.
2. Run checks appropriate to the change. For documentation-only work, validate links, consistency, preservation hashes, Git state and absence of secrets; do not unnecessarily run database-writing fixtures, npm installs or model fitting. Distinguish tests run now from historical logs read now.
3. Append a timestamped entry to `docs/CODEX_CHANGELOG.md`: account, task, added/modified/deleted files, behavior changes, actual checks/outcomes, limitations, branch/commit, and follow-up.
4. Update `docs/CODEX_TASKS.md` ownership/progress/blockers/evidence; mark Completed only with evidence. Explicitly release the active-writer entry when finished. Unexpected interruption is recorded as unfinished, not assumed complete.
5. Update `docs/CODEX_HANDOFF.md` with current state, remaining work and next action. Update `docs/PROJECT_OVERVIEW.md` for meaningful architectural or functional changes. Keep handoff concise, changelog append-only and overview current.
6. Report what changed, verification, unresolved limitations and local/deployment boundaries. Do not claim security or forecasting validity from a passing test suite or npm audit alone.

## Documentation priority and recovery

Use this root file for shared workflow, the current overview/handoff for the verified state, task records for ownership, and source/diffs as the final implementation check. Older `PROJECT_CONTEXT.md`, `docs/TODO.md`, `docs/CHANGELOG.md`, and early architecture/manuscript notes contain superseded prototype statements; they are retained as history. A proposed task is not permission to implement it.

If a session ends unexpectedly, read the active task, inspect source and preserved evidence, record what is actually complete, and coordinate reassignment before editing. Never restore an old checkpoint over newer work wholesale.
