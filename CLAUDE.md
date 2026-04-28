# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Commands

```bash
# Development
pnpm install
pnpm dev              # API server + UI in watch mode (http://localhost:3100)
pnpm dev:once         # Same but no file watching (auto-applies pending migrations)
pnpm dev:server       # Server only
pnpm dev:ui           # UI only (Vite on separate port)
pnpm dev:list         # Show running dev runners
pnpm dev:stop         # Stop dev runner

# Build & type checking
pnpm build            # Build all packages
pnpm typecheck        # TypeScript check across all packages

# Tests
pnpm test             # Vitest suite (cheap default — use this first)
pnpm test:watch       # Vitest interactive watch mode
pnpm test:e2e         # Playwright browser suite (separate from default test run)

# Run a single test file
pnpm vitest run path/to/file.test.ts
# Run a single test by name
pnpm vitest run --reporter=verbose -t "test name substring"

# Database
pnpm db:generate      # Generate Drizzle migration from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:backup        # One-off backup

# Other
pnpm storybook        # UI component Storybook on port 6006
pnpm check:tokens     # Check for leaked tokens in source
```

> **Note:** Do not commit `pnpm-lock.yaml` in pull requests — CI owns the lockfile.

---

## Architecture

Paperclip is an AI-agent orchestration platform. It runs as a single Node.js process with an embedded PostgreSQL database and a React UI, coordinating a team of AI agents like a company.

### Monorepo layout

```
server/       Express 5 API server (entry: server/src/index.ts)
ui/           React 19 + Vite 6 frontend (served by the API in dev)
cli/          paperclipai CLI (Commander.js, entry: cli/src/index.ts)
packages/
  db/         Drizzle ORM schema, migrations, DB clients (~70 tables)
  shared/     Types, Zod validators, constants, API path constants — shared by all packages
  adapter-utils/  Core adapter interface types
  mcp-server/ MCP server exposing 30+ tools for agents to call Paperclip APIs
  plugins/sdk/ Plugin system SDK (PluginContext interface)
  adapters/   One package per agent runtime (claude-local, codex-local, cursor-local, gemini-local, openclaw-gateway, opencode-local, pi-local)
```

### Request flow

All API routes are under `/api`. The middleware chain is:

```
JSON body → HTTP logger (Pino) → privateHostnameGuard → actorMiddleware → boardMutationGuard → route handler → errorHandler
```

The `actorMiddleware` resolves the caller as a board user (cookie session via better-auth) or an agent (API key / short-lived JWT). Every mutating action is traced to an actor.

### Two deployment modes

- **`local_trusted`** (default for dev): no real auth, auto-creates a `local-board` user, all companies are auto-joined. Zero friction.
- **`authenticated`**: better-auth email/password sessions, board invite flows, governance enforcement.

### Heartbeat execution loop

The central runtime loop:

```
Scheduler tick (30 s)
  → For each active agent: check budget + concurrency
    → issueService.checkoutNextIssue()  ← atomic DB lock, prevents double-work
      → adapter.execute(context)        ← spawns the real AI tool (Claude, Codex, etc.)
        → onLog() callback → heartbeat_run_events table → WebSocket → UI
```

Agent state persists across heartbeats in `agent_runtime_state` / `agent_task_sessions` so agents resume where they left off.

### Data model invariants

- Every domain entity (`issues`, `agents`, `projects`, `goals`, …) is scoped to a `company_id`.
- Issues carry a full goal-ancestry chain so agents always know the "why" behind a task.
- Issue checkout is atomic (DB lock + status transition in one transaction). No double-work.
- Budget enforcement is also atomic with checkout: overspend pauses the agent before work starts.

### Schema change workflow

1. Edit `packages/db/src/schema/*.ts`
2. Export new tables from `packages/db/src/schema/index.ts`
3. `pnpm db:generate` (runs migration numbering check first)
4. `pnpm -r typecheck` to verify the four-layer contract: `db → shared → server → ui`

When adding a new API capability, update all four layers: DB schema → `packages/shared` types/validators → server route/service → UI API client + React Query hooks.

### Adapter system

Each adapter implements `ServerAdapterModule` from `packages/adapter-utils`. The server holds a `Map<adapterType, ServerAdapterModule>`. External adapters can override built-ins; the original is preserved in `builtinFallbacks` for pause/resume. The UI has a parallel adapter registry for parsing stdout into `TranscriptEntry` records for the transcript viewer.

### Real-time updates

`LiveUpdatesProvider` (UI) holds a single WebSocket to `/api/companies/{id}/events/ws`. The server publishes to this via `liveEventsService`. On each event the UI invalidates the relevant React Query cache keys. Reconnect uses exponential backoff (1 s → 16 s).

### Plugin system

Plugins run as out-of-process workers. Each plugin declares capabilities; `PluginContext` gates access to host services (DB namespace, HTTP, secrets, issues, agents, UI slots, tools, SSE streams, etc.) based on what was declared in the manifest.

### Worktree development

For developing on multiple git worktrees simultaneously without sharing the embedded PostgreSQL data dir:

```bash
pnpm paperclipai worktree:make <branch-name>   # creates worktree + isolated Paperclip instance
pnpm paperclipai worktree init                  # init for current worktree
```

Each worktree instance gets its own port and DB, seeded from the main instance (minimal mode by default).

---

For a detailed architecture reference (in Chinese), see `CODEBASE-GUIDE.md`.
