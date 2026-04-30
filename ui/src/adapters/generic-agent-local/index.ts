import type { UIAdapterModule } from "../types";
import { parseGenericAgentStdoutLine, buildGenericAgentLocalConfig } from "@paperclipai/adapter-generic-agent-local/ui";
import { SchemaConfigFields } from "../schema-config-fields";

export const genericAgentLocalUIAdapter: UIAdapterModule = {
  type: "generic_agent_local",
  label: "GenericAgent (local)",
  parseStdoutLine: parseGenericAgentStdoutLine,
  ConfigFields: SchemaConfigFields,
  buildAdapterConfig: buildGenericAgentLocalConfig,
};
