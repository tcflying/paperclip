export const type = "generic_agent_local";
export const label = "GenericAgent (local)";

export const models: Array<{ id: string; label: string }> = [];

export const agentConfigurationDoc = `# generic_agent_local agent configuration

Adapter: generic_agent_local

Use when:
- You want Paperclip to run lsdefine/GenericAgent locally as the agent runtime.
- The agent should use GenericAgent's local system-control tools, browser control, and self-evolving memory.
- You are running Paperclip in a trusted local environment where local automation is acceptable.

Don't use when:
- You need a low-risk sandboxed coding agent. GenericAgent can control the local system depending on its setup.
- You need exact token or cost accounting today. GenericAgent does not yet expose stable usage events.
- GenericAgent is not installed or its local mykey.py configuration is not ready.

Core fields:
- genericAgentPath (string, required): absolute path to the GenericAgent checkout.
- pythonCommand (string, optional): Python executable used to run the bridge; defaults to python.
- cwd (string, required): target Paperclip workspace directory.
- llmNo (number, optional): GenericAgent LLM index.
- language (auto|en|zh, optional): language hint passed as GA_LANG when en or zh.
- managedRuntimeRoot (boolean, optional): copy GenericAgent into an isolated per-company/per-agent runtime root; defaults to true.
- runtimeRoot (string, optional): custom managed runtime root.
- refreshRuntimeRoot (boolean, optional): re-copy the GenericAgent source into the managed runtime root on the next run.
- verbose (boolean, optional): enable GenericAgent verbose streaming.
- promptTemplate (string, optional): Paperclip heartbeat prompt template.
- envJson (string, optional): JSON object of extra environment variables from the schema form.
- env (object, optional): extra environment variables for programmatic config.
- timeoutSec/graceSec (number, optional): process timeout and termination grace.

Security:
- This is a trusted local adapter. GenericAgent can run shell commands, read and write files, control a browser, and use local device automation depending on the checkout.
- Keep managedRuntimeRoot enabled unless you intentionally want multiple Paperclip agents to share a GenericAgent runtime and memory.
`;
