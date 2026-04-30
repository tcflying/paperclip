import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function bridgePath(): string {
  return path.resolve(moduleDir, "../../bridge/paperclip_ga_bridge.py");
}
