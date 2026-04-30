import type { CreateConfigValues } from "@paperclipai/adapter-utils";

export function buildGenericAgentLocalConfig(values: CreateConfigValues): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (values.cwd) config.cwd = values.cwd;
  if (values.instructionsFilePath) config.instructionsFilePath = values.instructionsFilePath;
  if (values.promptTemplate) config.promptTemplate = values.promptTemplate;
  if (values.adapterSchemaValues) Object.assign(config, values.adapterSchemaValues);
  return config;
}
