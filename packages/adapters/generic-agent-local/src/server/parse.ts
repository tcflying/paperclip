import type { UsageSummary } from "@paperclipai/adapter-utils";
import { asString, parseJson, parseObject } from "@paperclipai/adapter-utils/server-utils";

export interface GenericAgentParsedOutput {
  sessionId: string | null;
  runtimeRoot: string | null;
  model: string | null;
  summary: string | null;
  errorMessage: string | null;
  usage: UsageSummary;
}

export function parseGenericAgentOutput(stdout: string): GenericAgentParsedOutput {
  let sessionId: string | null = null;
  let runtimeRoot: string | null = null;
  let model: string | null = null;
  let summary: string | null = null;
  let errorMessage: string | null = null;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const event = parseJson(line);
    if (!event) continue;

    const eventType = asString(event.type, "");
    if (eventType === "generic_agent.init") {
      sessionId = asString(event.session_id, "") || sessionId;
      runtimeRoot = asString(event.runtime_root, "") || runtimeRoot;
      model = asString(event.model, "") || model;
      continue;
    }

    if (eventType === "generic_agent.result") {
      summary = asString(event.text, "").trim() || summary;
      sessionId = asString(event.session_id, "") || sessionId;
      continue;
    }

    if (eventType === "generic_agent.error") {
      errorMessage = asString(event.message, "").trim() || errorMessage;
      continue;
    }

    const usage = parseObject(event.usage);
    if (Object.keys(usage).length > 0) {
      // Reserved for future GenericAgent usage events. Keep the parser tolerant
      // so new bridge versions can add usage without breaking old hosts.
    }
  }

  return {
    sessionId,
    runtimeRoot,
    model,
    summary,
    errorMessage,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
    },
  };
}

export function isGenericAgentUnknownSessionError(_stdout: string, _stderr: string): boolean {
  return false;
}
