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
- **Backend**: There are backend prototype files in `test/server.js` and `client/server/server.js`.
- **AI Engine**: Python SARIMA model is prototyped in `test/analytics.py` and expects to be called via Node.js `child_process`.

## Immediate Tasks
1. Consolidate the Node.js backend. 
2. Reconcile the Database Schema discrepancies (see `DATABASE.md` and `CHANGELOG.md`).
3. Wire up the Vanilla JS frontend to the Node.js REST API endpoints.

Please refer to the accompanying markdown files for detailed specifications, architecture, and database design.
