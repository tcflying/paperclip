import type { AdapterSessionCodec } from "@paperclipai/adapter-utils";

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const sessionId = nonEmpty(record.sessionId);
    if (!sessionId) return null;
    return {
      sessionId,
      cwd: nonEmpty(record.cwd),
      runtimeRoot: nonEmpty(record.runtimeRoot),
      genericAgentPath: nonEmpty(record.genericAgentPath),
    };
  },

  serialize(params: Record<string, unknown> | null) {
    if (!params || typeof params !== "object" || Array.isArray(params)) return null;
    const sessionId = nonEmpty(params.sessionId);
    if (!sessionId) return null;
    return {
      sessionId,
      cwd: nonEmpty(params.cwd),
      runtimeRoot: nonEmpty(params.runtimeRoot),
      genericAgentPath: nonEmpty(params.genericAgentPath),
    };
  },

  getDisplayId(params: Record<string, unknown> | null) {
    if (!params || typeof params !== "object" || Array.isArray(params)) return null;
    return nonEmpty(params.sessionId);
  },
};
