import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";

export const DEFAULT_TIMEOUT_SEC = 900;
export const DEFAULT_GRACE_SEC = 20;

export function getConfigSchema(): AdapterConfigSchema {
  return {
    fields: [
      {
        key: "genericAgentPath",
        label: "GenericAgent checkout",
        type: "text",
        required: true,
        hint: "Absolute path to the lsdefine/GenericAgent repository.",
      },
      {
        key: "pythonCommand",
        label: "Python command",
        type: "text",
        default: "python",
        hint: "Python executable used to run the bridge.",
      },
      {
        key: "cwd",
        label: "Workspace directory",
        type: "text",
        required: true,
        hint: "Absolute directory GenericAgent should treat as the work target.",
      },
      {
        key: "llmNo",
        label: "LLM index",
        type: "number",
        default: 0,
        hint: "Index passed to GenericAgent's LLM selector.",
      },
      {
        key: "language",
        label: "Language",
        type: "select",
        default: "auto",
        options: [
          { label: "Auto", value: "auto" },
          { label: "English", value: "en" },
          { label: "Chinese", value: "zh" },
        ],
      },
      {
        key: "managedRuntimeRoot",
        label: "Managed runtime copy",
        type: "toggle",
        default: true,
        hint: "Copy GenericAgent into a per-company/per-agent runtime root so memory and temp files stay isolated.",
      },
      {
        key: "runtimeRoot",
        label: "Runtime root override",
        type: "text",
        hint: "Optional absolute directory for the managed runtime copy.",
      },
      {
        key: "refreshRuntimeRoot",
        label: "Refresh managed copy",
        type: "toggle",
        default: false,
        hint: "Re-copy the GenericAgent source into the managed runtime root on the next run.",
      },
      {
        key: "verbose",
        label: "Verbose stream",
        type: "toggle",
        default: false,
      },
      {
        key: "promptTemplate",
        label: "Prompt template",
        type: "textarea",
        hint: "Optional Paperclip prompt template. Leave empty to use the standard Paperclip execution contract.",
      },
      {
        key: "timeoutSec",
        label: "Timeout seconds",
        type: "number",
        default: DEFAULT_TIMEOUT_SEC,
      },
      {
        key: "graceSec",
        label: "Grace seconds",
        type: "number",
        default: DEFAULT_GRACE_SEC,
      },
      {
        key: "envJson",
        label: "Environment JSON",
        type: "textarea",
        hint: "Optional JSON object of extra environment variables. Secrets are passed to the process and redacted from invocation metadata.",
      },
    ],
  };
}
