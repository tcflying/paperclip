import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getUiParserSource,
  loadExternalAdapterPackage,
} from "../adapters/plugin-loader.js";

const tempDirs: string[] = [];

async function makeExternalAdapterPackage(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-adapter-loader-"));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, "src"), { recursive: true });
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "paperclip-loader-test-adapter",
      version: "0.0.0",
      type: "module",
      exports: {
        ".": "./src/index.js",
        "./ui-parser": "./src/ui-parser.js",
      },
      paperclip: {
        adapterUiParser: "1.0.0",
      },
    }, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dir, "src", "index.js"),
    [
      "export function createServerAdapter() {",
      "  return {",
      "    type: 'loader_test_local',",
      "    execute: async () => ({ exitCode: 0, signal: null, timedOut: false }),",
      "    testEnvironment: async () => ({ adapterType: 'loader_test_local', status: 'pass', checks: [], testedAt: new Date(0).toISOString() }),",
      "  };",
      "}",
    ].join("\n"),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dir, "src", "ui-parser.js"),
    "export function parseStdoutLine() { return []; }\n",
    "utf-8",
  );
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("external adapter plugin loader", () => {
  it("loads a local-path ESM adapter package from an absolute filesystem path", async () => {
    const dir = await makeExternalAdapterPackage();

    const adapter = await loadExternalAdapterPackage("paperclip-loader-test-adapter", dir);

    expect(adapter.type).toBe("loader_test_local");
    expect(getUiParserSource("loader_test_local")).toContain("parseStdoutLine");
  });
});

