import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asBoolean,
  asNumber,
  asString,
  buildPaperclipEnv,
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
  ensureAbsoluteDirectory,
  joinPromptSections,
  parseJson,
  parseObject,
  redactEnvForLogs,
  renderPaperclipWakePrompt,
  renderTemplate,
  runChildProcess,
  stringifyPaperclipWakePayload,
} from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_GRACE_SEC, DEFAULT_TIMEOUT_SEC } from "./config-schema.js";
import { bridgePath } from "./paths.js";
import { parseGenericAgentOutput } from "./parse.js";

const EXCLUDED_COPY_NAMES = new Set([
  ".git",
  ".venv",
  "__pycache__",
  "temp",
  "genericagent.egg-info",
]);

function managedRuntimeRoot(agent: AdapterExecutionContext["agent"]): string {
  const home =
    process.env.PAPERCLIP_HOME && process.env.PAPERCLIP_HOME.trim()
      ? process.env.PAPERCLIP_HOME.trim()
      : path.join(os.homedir(), ".paperclip");
  return path.join(home, "generic-agent", "companies", agent.companyId, "agents", agent.id);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyGenericAgentSource(sourceRoot: string, targetRoot: string, refresh: boolean): Promise<void> {
  const markerPath = path.join(targetRoot, ".paperclip-genericagent-runtime.json");
  const hasMarker = await pathExists(markerPath);
  if (refresh && hasMarker) {
    await fs.rm(targetRoot, { recursive: true, force: true });
  }
  if (hasMarker && !refresh) return;

  await fs.mkdir(targetRoot, { recursive: true });
  await fs.cp(sourceRoot, targetRoot, {
    recursive: true,
    force: true,
    filter: (source) => !EXCLUDED_COPY_NAMES.has(path.basename(source)),
  });
  await fs.mkdir(path.join(targetRoot, "temp"), { recursive: true });
  await fs.writeFile(
    markerPath,
    JSON.stringify({ sourceRoot, copiedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  const record = parseObject(value);
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (typeof raw === "string") out[key] = raw;
  }
  return out;
}

function parseEnvJson(value: unknown): Record<string, string> {
  const raw = asString(value, "").trim();
  if (!raw) return {};
  return normalizeStringRecord(parseJson(raw));
}

function contextEnv(ctx: AdapterExecutionContext): Record<string, string> {
  const issueIds = Array.isArray(ctx.context.issueIds)
    ? ctx.context.issueIds.filter((entry): entry is string => typeof entry === "string").join(",")
    : "";
  return {
    PAPERCLIP_RUN_ID: ctx.runId,
    PAPERCLIP_TASK_ID: asString(ctx.context.taskId, asString(ctx.context.issueId, "")),
    PAPERCLIP_WAKE_REASON: asString(ctx.context.wakeReason, ""),
    PAPERCLIP_WAKE_COMMENT_ID: asString(ctx.context.wakeCommentId, asString(ctx.context.commentId, "")),
    PAPERCLIP_APPROVAL_ID: asString(ctx.context.approvalId, ""),
    PAPERCLIP_APPROVAL_STATUS: asString(ctx.context.approvalStatus, ""),
    PAPERCLIP_LINKED_ISSUE_IDS: issueIds,
  };
}

function buildPrompt(
  ctx: AdapterExecutionContext,
  cwd: string,
  sessionId: string,
  instructionsPrefix: string,
): string {
  const promptTemplate = asString(
    ctx.config.promptTemplate,
    DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
  );
  const templateData = {
    agentId: ctx.agent.id,
    companyId: ctx.agent.companyId,
    runId: ctx.runId,
    company: { id: ctx.agent.companyId },
    agent: ctx.agent,
    run: ctx.runtime,
    context: ctx.context,
  };
  const basePrompt = renderTemplate(promptTemplate, templateData).trim();
  const wakePrompt = renderPaperclipWakePrompt(ctx.context.paperclipWake, {
    resumedSession: Boolean(sessionId),
  });
  const wakePayload = stringifyPaperclipWakePayload(ctx.context.paperclipWake);
  const genericAgentInstructions = [
    "GenericAgent Paperclip adapter instructions:",
    `- Target workspace cwd: ${cwd}`,
    "- GenericAgent tools may default to its own temp directory. Use absolute paths under the target workspace when reading, writing, patching, or running commands for Paperclip work.",
    "- Use the Paperclip API with Authorization: Bearer $PAPERCLIP_API_KEY when reporting durable progress.",
    "- Use X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID on mutating Paperclip API requests.",
    "- Do not use a board, browser, or local-board session for Paperclip writes.",
  ].join("\n");

  return joinPromptSections([
    genericAgentInstructions,
    instructionsPrefix,
    basePrompt,
    wakePrompt,
    wakePayload ? `Paperclip wake payload JSON:\n${wakePayload}` : "",
  ]);
}

async function writePromptFile(runtimeRoot: string, runId: string, prompt: string): Promise<string> {
  const dir = path.join(runtimeRoot, "temp", "paperclip-prompts");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${runId}.txt`);
  await fs.writeFile(filePath, prompt, "utf8");
  return filePath;
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = parseObject(ctx.config);
  const genericAgentPath = asString(config.genericAgentPath, "").trim();
  if (!genericAgentPath) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "genericAgentPath is required.",
      resultJson: { adapterType: "generic_agent_local" },
    };
  }

  const resolvedGenericAgentPath = path.resolve(genericAgentPath);
  const pythonCommand = asString(config.pythonCommand, "python").trim() || "python";
  const cwd = path.resolve(asString(config.cwd, process.cwd()).trim() || process.cwd());
  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
  const useManagedRuntimeRoot = asBoolean(config.managedRuntimeRoot, true);
  const runtimeRoot = useManagedRuntimeRoot
    ? path.resolve(asString(config.runtimeRoot, "") || managedRuntimeRoot(ctx.agent))
    : resolvedGenericAgentPath;
  const refreshRuntimeRoot = asBoolean(config.refreshRuntimeRoot, false);

  if (useManagedRuntimeRoot) {
    await copyGenericAgentSource(resolvedGenericAgentPath, runtimeRoot, refreshRuntimeRoot);
  }

  const runtimeSessionParams = parseObject(ctx.runtime.sessionParams);
  const previousSessionId = asString(runtimeSessionParams.sessionId, ctx.runtime.sessionId ?? "").trim();
  const previousSessionCwd = asString(runtimeSessionParams.cwd, "").trim();
  const sessionId =
    previousSessionId && (!previousSessionCwd || path.resolve(previousSessionCwd) === path.resolve(cwd))
      ? previousSessionId
      : `ga-${ctx.agent.id}-${Date.now().toString(36)}`;

  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
  let instructionsPrefix = "";
  if (instructionsFilePath) {
    try {
      const instructions = await fs.readFile(instructionsFilePath, "utf8");
      instructionsPrefix = [
        instructions,
        `The above agent instructions were loaded from ${instructionsFilePath}. Resolve any relative file references from ${path.dirname(instructionsFilePath)}.`,
      ].join("\n\n");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await ctx.onLog(
        "stdout",
        `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
      );
    }
  }

  const prompt = buildPrompt(ctx, cwd, sessionId, instructionsPrefix);
  const promptFile = await writePromptFile(runtimeRoot, ctx.runId, prompt);
  const timeoutSec = asNumber(config.timeoutSec, DEFAULT_TIMEOUT_SEC);
  const graceSec = asNumber(config.graceSec, DEFAULT_GRACE_SEC);
  const userEnv = {
    ...parseEnvJson(config.envJson),
    ...normalizeStringRecord(config.env),
  };
  const env: Record<string, string> = {
    ...buildPaperclipEnv(ctx.agent),
    ...contextEnv(ctx),
    ...userEnv,
    PAPERCLIP_GENERIC_AGENT_SOURCE_ROOT: resolvedGenericAgentPath,
    PAPERCLIP_GENERIC_AGENT_RUNTIME_ROOT: runtimeRoot,
  };
  if (ctx.authToken && !env.PAPERCLIP_API_KEY) {
    env.PAPERCLIP_API_KEY = ctx.authToken;
  }
  const language = asString(config.language, "auto").trim();
  if (language === "en" || language === "zh") {
    env.GA_LANG = language;
  }

  const args: string[] = [
    bridgePath(),
    "--generic-agent-root",
    runtimeRoot,
    "--cwd",
    cwd,
    "--input-file",
    promptFile,
    "--session-id",
    sessionId,
    "--llm-no",
    String(asNumber(config.llmNo, 0)),
  ];
  if (asBoolean(config.verbose, false)) args.push("--verbose");

  if (ctx.onMeta) {
    await ctx.onMeta({
      adapterType: "generic_agent_local",
      command: pythonCommand,
      commandArgs: args,
      cwd: runtimeRoot,
      env: redactEnvForLogs(env),
      prompt,
      promptMetrics: {
        promptChars: prompt.length,
        instructionsChars: instructionsPrefix.length,
      },
      context: ctx.context,
    });
  }

  const proc = await runChildProcess(ctx.runId, pythonCommand, args, {
    cwd: runtimeRoot,
    env,
    timeoutSec,
    graceSec,
    onLog: ctx.onLog,
    onSpawn: ctx.onSpawn,
  });
  const parsed = parseGenericAgentOutput(proc.stdout);
  const errorMessage =
    proc.timedOut
      ? "GenericAgent run timed out."
      : parsed.errorMessage || ((proc.exitCode ?? 0) === 0 ? null : (proc.stderr || "GenericAgent run failed."));
  const resolvedSessionId = parsed.sessionId || sessionId;

  return {
    exitCode: proc.exitCode,
    signal: proc.signal,
    timedOut: proc.timedOut,
    errorMessage,
    usage: parsed.usage,
    sessionId: resolvedSessionId,
    sessionParams: {
      sessionId: resolvedSessionId,
      cwd,
      runtimeRoot,
      genericAgentPath: resolvedGenericAgentPath,
    },
    sessionDisplayId: resolvedSessionId,
    provider: "genericagent",
    model: parsed.model,
    costUsd: null,
    summary: parsed.summary,
    resultJson: {
      adapterType: "generic_agent_local",
      stdout: proc.stdout,
      stderr: proc.stderr,
      runtimeRoot,
      genericAgentPath: resolvedGenericAgentPath,
    },
  };
}
