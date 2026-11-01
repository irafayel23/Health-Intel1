# AI Agent Handoff Document

## Welcome, Agent
You are continuing work on **HEALTH-INTEL: LGU Disease Surveillance & Mapping System**.

## Project Context
The user has provided a clear specification for a lightweight, highly-styled web application intended for Local Government Units (LGU) in the Philippines (Barangay Health Workers, Municipal Health Officers).

### Core Directives for AI Agents
1. **No Heavy Frameworks**: The frontend must remain Vanilla JavaScript and HTML5. Do not introduce React, Vue, Angular, or similar frameworks.
2. **Preserve HTML Hooks**: Do NOT remove or alter existing `id` attributes or `onclick` triggers in the HTML files. Core frontend logic relies on these exact hooks.
3. **Styling Rules**: Use Tailwind CSS utility classes exclusively. Avoid inline `<style>` tags.
4. **Architectural Separation**: Keep the Python predictive engine (`analytics.py`) mechanically isolated from the live MySQL database to prevent locking/latency. The Node.js server acts as the intermediary.

## Repository State
- **Frontend**: Exists in `.html` files (`admin.html`, `bhw.html`, `mho.html`, `index.html`, etc.) inside the `proposal` directory.
- **Backend**: The active Express API is `server/server.js`; integration checks are in `server/tests/`.
- **AI Engine**: The demonstration forecast is in `server/analytics.py` and expects to be called via Node.js `child_process`.

## Immediate Tasks
1. Keep the active Node.js backend in `server/` and tests in `server/tests/`.
2. Reconcile the Database Schema discrepancies (see `DATABASE.md` and `CHANGELOG.md`).
3. Wire up the Vanilla JS frontend to the Node.js REST API endpoints.

Please refer to the accompanying markdown files for detailed specifications, architecture, and database design.


## Shared CODEX-1 / CODEX-2 coordination (25 October 2026)

The original guidance above is preserved. Before work, read the repository-root AGENTS.md and docs/PROJECT_OVERVIEW.md, docs/CODEX_HANDOFF.md, docs/CODEX_TASKS.md and recent docs/CODEX_CHANGELOG.md entries, then inspect current Git state and source. Follow the root one-writer and end-of-task documentation workflow. Older architecture/immediate-task descriptions above are historical where the current source/overview supersedes them: the local MHO SARIMA page now serves saved synthetic evidence; analytics.py remains a separate legacy AR(1) compatibility path. Do not change application behavior, database records or deployment while maintaining documentation.
