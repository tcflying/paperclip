# Paperclip — Project Overview (sonnet)

> Generated: 2026-04-28

## What It Is

Paperclip is an open-source AI-agent orchestration platform. It runs a single Node.js process (embedded PostgreSQL + React UI) that coordinates a team of AI agents like a company — with org charts, budgets, governance, goal alignment, and audit logging.

**Core idea:** If OpenClaw/Claude Code is an *employee*, Paperclip is the *company*.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript (ES2023, ESM) |
| Runtime | Node.js 20+, pnpm 9.15 monorepo |
| Backend | Express 5, Drizzle ORM, PostgreSQL (embedded) |
| Frontend | React 19, Vite 6, TanStack Query, Tailwind CSS v4, Radix UI |
| Auth | better-auth (email/password) or local-trusted (zero-config dev) |
| Real-time | WebSocket (ws) |
| Testing | Vitest (unit) + Playwright (E2E) |

## Monorepo Layout

```
server/              Express API (entry: server/src/index.ts)
ui/                  React frontend
cli/                 paperclipai CLI
packages/
  db/                Drizzle schema + migrations (~70 tables)
  shared/            Types, Zod validators, API path constants
  adapter-utils/     Core ServerAdapterModule interface
  mcp-server/        MCP server (30+ tools for agents)
  plugins/sdk/       Plugin system SDK (PluginContext)
  adapters/          claude-local, codex-local, cursor-local,
                     gemini-local, openclaw-gateway, opencode-local, pi-local
```

## Key Architecture Patterns

### Heartbeat Loop (30 s)
```
Scheduler → budget check → issueService.checkoutNextIssue() [atomic]
  → adapter.execute() → AI tool runs → onLog() → heartbeat_run_events
  → WebSocket → React Query invalidation → UI refresh
```

### Four-Layer Contract
Every feature change must propagate through:
```
packages/db schema → packages/shared types/validators → server routes/services → ui API client + hooks
```

### Deployment Modes
- `local_trusted` — no auth, auto `local-board` user, instant dev start
- `authenticated` — better-auth sessions, board invites, governance enforced

### Data Invariants
- All domain entities scoped to `company_id`
- Issue checkout is atomic (DB lock + status transition in one transaction)
- Budget enforcement is atomic with checkout — overspend pauses agent before work starts
- Issues carry full goal-ancestry chain so agents always know the "why"

## Key Commands

```bash
pnpm dev                         # Start (http://localhost:3100)
pnpm test                        # Vitest only (fast default)
pnpm vitest run path/to/file.test.ts    # Single test file
pnpm typecheck                   # Full TS check
pnpm db:generate && pnpm -r typecheck  # After schema change
```

## Adapters

Each adapter implements `ServerAdapterModule` (`packages/adapter-utils`). The server holds a `Map<adapterType, ServerAdapterModule>`. External adapters can override built-ins; originals are kept in `builtinFallbacks`. The UI has a parallel registry for parsing stdout into `TranscriptEntry` records.

## Real-Time

`LiveUpdatesProvider` (UI) → WebSocket `/api/companies/{id}/events/ws` → `liveEventsService` (server) publishes on state changes → React Query cache invalidation. Reconnect: exponential backoff 1 s → 16 s.

## Plugins

Out-of-process workers declared with a manifest. `PluginContext` gates access to DB namespace, HTTP, secrets, issues, agents, UI slots, tools, SSE streams by declared capabilities.

## Worktree Dev

```bash
pnpm paperclipai worktree:make <branch>   # isolated instance + DB
pnpm paperclipai worktree init            # init for current worktree
```

---

*For deeper reference see `CODEBASE-GUIDE.md` (Chinese) and `CLAUDE.md`.*
