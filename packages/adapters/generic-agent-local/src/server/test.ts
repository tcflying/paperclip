import fs from "node:fs/promises";
import path from "node:path";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import {
  asString,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePathInEnv,
  parseObject,
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import { bridgePath } from "./paths.js";

function statusFromChecks(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const config = parseObject(ctx.config);
  const checks: AdapterEnvironmentCheck[] = [];
  const pythonCommand = asString(config.pythonCommand, "python").trim() || "python";
  const genericAgentPath = asString(config.genericAgentPath, "").trim();
  const cwd = asString(config.cwd, process.cwd()).trim() || process.cwd();
  const env = ensurePathInEnv(process.env);

  try {
    const resolvedCwd = await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
    checks.push({
      code: "genericagent_cwd_valid",
      level: "info",
      message: `Workspace directory is valid: ${resolvedCwd}`,
    });
  } catch (err) {
    checks.push({
      code: "genericagent_cwd_invalid",
      level: "error",
      message: err instanceof Error ? err.message : "Invalid workspace directory",
      detail: cwd,
    });
  }

  try {
    await ensureCommandResolvable(pythonCommand, cwd, env);
    checks.push({
      code: "genericagent_python_resolvable",
      level: "info",
      message: `Python command is executable: ${pythonCommand}`,
    });
  } catch (err) {
    checks.push({
      code: "genericagent_python_unresolvable",
      level: "error",
      message: "Python command is not executable.",
      detail: err instanceof Error ? err.message : pythonCommand,
    });
  }

  if (!genericAgentPath) {
    checks.push({
      code: "genericagent_path_missing",
      level: "error",
      message: "GenericAgent checkout path is required.",
      hint: "Clone https://github.com/lsdefine/GenericAgent and set genericAgentPath to that directory.",
    });
  } else {
    const requiredFiles = ["agentmain.py", "ga.py", "llmcore.py", "mykey.py"];
    const missing: string[] = [];
    for (const file of requiredFiles) {
      if (!(await pathExists(path.join(genericAgentPath, file)))) missing.push(file);
    }

    if (missing.length > 0) {
      checks.push({
        code: "genericagent_checkout_invalid",
        level: "error",
        message: "GenericAgent checkout is missing required files.",
        detail: missing.join(", "),
      });
    } else {
      checks.push({
        code: "genericagent_checkout_valid",
        level: "info",
        message: `GenericAgent checkout looks valid: ${genericAgentPath}`,
      });
    }
  }

  if (!checks.some((check) => check.level === "error")) {
    const probe = await runChildProcess("genericagent-env-probe", pythonCommand, [
      bridgePath(),
      "--generic-agent-root",
      genericAgentPath,
      "--probe",
    ], {
      cwd,
      env: {},
      timeoutSec: 15,
      graceSec: 5,
      onLog: async () => {},
    });

    if (probe.timedOut) {
      checks.push({
        code: "genericagent_probe_timeout",
        level: "warn",
        message: "GenericAgent bridge probe timed out.",
      });
    } else if ((probe.exitCode ?? 1) === 0) {
      checks.push({
        code: "genericagent_probe_passed",
        level: "info",
        message: "GenericAgent bridge probe passed.",
      });
    } else {
      checks.push({
        code: "genericagent_probe_failed",
        level: "error",
        message: "GenericAgent bridge probe failed.",
        detail: (probe.stderr || probe.stdout).trim().slice(0, 500),
      });
    }
  }

  return {
    adapterType: ctx.adapterType ?? "generic_agent_local",
    status: statusFromChecks(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
