import pc from "picocolors";

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

export function printGenericAgentStreamEvent(raw: string, debug: boolean): void {
  const line = raw.trim();
  if (!line) return;
  const event = safeJson(line);
  if (!event) {
    if (debug) console.log(pc.gray(raw));
    return;
  }

  const eventType = asString(event.type);
  if (eventType === "generic_agent.init") {
    const model = asString(event.model) || "genericagent";
    const sessionId = asString(event.session_id);
    console.log(pc.cyan(`GenericAgent started${sessionId ? ` (${sessionId})` : ""} [${model}]`));
    return;
  }

  if (eventType === "generic_agent.delta") {
    const text = asString(event.text);
    if (text) process.stdout.write(text);
    return;
  }

  if (eventType === "generic_agent.result") {
    const text = asString(event.text);
    if (text) console.log(`\n${pc.green(text)}`);
    return;
  }

  if (eventType === "generic_agent.error") {
    console.error(pc.red(asString(event.message) || "GenericAgent error"));
    return;
  }

  if (eventType === "generic_agent.system") {
    const text = asString(event.text);
    if (text && debug) console.log(pc.gray(text));
    return;
  }

  if (debug) console.log(pc.gray(raw));
}
