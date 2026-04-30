# GenericAgent Core Adapter Plan

Date: 2026-04-30

## Goal

Add GenericAgent as a built-in Paperclip adapter, with the same core registration path as Codex, Claude, OpenCode, and other local adapters.

## Scope

- Create a workspace package under `packages/adapters/generic-agent-local`.
- Register `generic_agent_local` in the server, UI, CLI, shared constants, and built-in adapter type set.
- Expose a declarative config schema so the existing schema-driven adapter form can render GenericAgent settings.
- Run GenericAgent through a Python bridge that emits stable JSONL events for transcripts and CLI watch output.
- Keep GenericAgent runtime data isolated per Paperclip company/agent by copying the configured GenericAgent source into a managed runtime root by default.
- Preserve external plugin loading fixes for other optional adapters, but do not keep GenericAgent itself as an external adapter copy.

## Files

- `packages/adapters/generic-agent-local/package.json`: core adapter package metadata and exports.
- `packages/adapters/generic-agent-local/src/server/*`: execution, config schema, environment test, parser, and session codec.
- `packages/adapters/generic-agent-local/src/ui/*`: transcript parser and config builder.
- `packages/adapters/generic-agent-local/src/cli/*`: CLI stream formatter.
- `packages/adapters/generic-agent-local/bridge/paperclip_ga_bridge.py`: Python bridge for one heartbeat execution.
- `server/src/adapters/registry.ts`: built-in server registration.
- `ui/src/adapters/registry.ts`: built-in UI registration.
- `cli/src/adapters/registry.ts`: built-in CLI registration.
- `packages/shared/src/constants.ts`: built-in adapter type availability.

## Verification

- Run the GenericAgent bridge probe against a local GenericAgent checkout.
- Run adapter registry tests for server and UI.
- Run the Windows local-path external plugin loader test to preserve optional plugin behavior.
- Run TypeScript checks for the new adapter package, server, UI, and CLI.
