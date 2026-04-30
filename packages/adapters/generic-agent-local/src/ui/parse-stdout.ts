import type { TranscriptEntry } from "@paperclipai/adapter-utils";

function safeJson(line: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseGenericAgentStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const event = safeJson(trimmed);
  if (!event) {
    return [{ kind: "stdout", ts, text: line }];
  }

  const eventType = asString(event.type);
  if (eventType === "generic_agent.init") {
    const model = asString(event.model) || "genericagent";
    const sessionId = asString(event.session_id);
    return [{ kind: "init", ts, model, sessionId }];
  }

  if (eventType === "generic_agent.delta") {
    const text = asString(event.text);
    return text ? [{ kind: "assistant", ts, text, delta: true }] : [];
  }

  if (eventType === "generic_agent.result") {
    const text = asString(event.text);
    return [{
      kind: "result",
      ts,
      text,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      costUsd: 0,
      subtype: "success",
      isError: false,
      errors: [],
    }];
  }

  if (eventType === "generic_agent.error") {
    const message = asString(event.message) || "GenericAgent error";
    return [{
      kind: "result",
      ts,
      text: message,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      costUsd: 0,
      subtype: "error",
      isError: true,
      errors: [message],
    }];
  }

  if (eventType === "generic_agent.system") {
    const text = asString(event.text);
    return text ? [{ kind: "system", ts, text }] : [];
  }

  return [{ kind: "stdout", ts, text: line }];
}
