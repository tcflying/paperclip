# Paperclip OpenCode 适配器 Claude-Mem Hooks 集成方案

> 设计日期：2026-04-26
> 状态：设计方案

---

## 1. 问题分析

### 1.1 当前状态

| 适配器 | Claude-Mem 集成方式 | 状态 |
|--------|-------------------|------|
| `claude-local` | CLI hooks 系统 | ✅ 自动生效 |
| `opencode-local` | Plugin SDK | ⚠️ 不确定（取决于非交互模式是否加载插件） |

### 1.2 OpenCode 插件加载机制

根据 OpenCode 官方文档，插件加载规则：

```
插件加载顺序：
1. 全局配置 (~/.config/opencode/opencode.json)
2. 项目配置 (opencode.json)
3. 全局插件目录 (~/.config/opencode/plugins/)
4. 项目插件目录 (.opencode/plugins/)
```

**关键问题**：`opencode run --format json` 非交互模式是否加载插件？

**理论分析**：
- OpenCode 的 `run` 命令设计用于脚本和自动化
- 插件在 "startup" 时加载
- `opencode run` 仍然需要初始化 OpenCode 核心引擎
- **推测**：插件应该被加载，但需要实际验证

---

## 2. 解决方案设计

### 2.1 方案 A：OpenCode 原生插件模式（推荐）

**前提条件**：OpenCode 在非交互模式下仍加载插件

**实现方式**：安装 Claude-Mem 的 OpenCode 插件

```bash
# 1. 构建 OpenCode 插件
npx claude-mem install --ide opencode

# 2. 验证插件安装
ls ~/.config/opencode/plugins/
# 应该看到 claude-mem.js
```

**插件工作原理**：

```
OpenCode Session (run 命令)
    │
    ├─→ session.created 事件
    │       └─→ POST /api/sessions/init
    │
    ├─→ tool.execute.after 事件
    │       └─→ POST /api/sessions/observations
    │
    ├─→ session.compacted 事件
    │       └─→ POST /api/sessions/summarize
    │
    └─→ session.idle 事件
            └─→ POST /api/sessions/summarize
```

**优势**：
- ✅ 与 Claude Code hooks 机制对称
- ✅ 不需要修改 Paperclip 代码
- ✅ 利用现有的 Claude-Mem OpenCode 插件

### 2.2 方案 B：Paperclip 适配器内嵌 Hooks（备选）

**场景**：如果 OpenCode 非交互模式不加载插件

**实现方式**：在 Paperclip 的 `opencode-local` 适配器中内嵌 hooks 功能

**架构设计**：

```
┌─────────────────────────────────────────────────────────────────┐
│  Paperclip Server (心跳引擎)                                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  opencode-local 适配器                                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Hook Manager (新增组件)                                      │ │
│  │  ├─→ beforeExecute: 前置处理                                │ │
│  │  ├─→ afterExecute: 后置处理                                  │ │
│  │  └─→ onSessionEvent: 会话事件                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ OpenCode Event Parser                                       │ │
│  │  ├─→ 解析 JSONL 输出                                        │ │
│  │  ├─→ 提取 tool_use 事件                                    │ │
│  │  └─→ 提取 session 事件                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Claude-Mem Worker Service (端口 37777)                          │
│  ├─→ /api/sessions/init                                        │
│  ├─→ /api/sessions/observations                                │
│  └─→ /api/sessions/summarize                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 详细实现方案（方案 B）

### 3.1 新增文件结构

```
packages/adapters/opencode-local/src/
├── server/
│   ├── execute.ts              # 已有
│   ├── hooks.ts                # 新增：hooks 管理器
│   ├── worker-client.ts         # 新增：Claude-Mem Worker 客户端
│   └── parse.ts                # 已有
```

### 3.2 Worker 客户端实现

```typescript
// packages/adapters/opencode-local/src/server/worker-client.ts

interface WorkerClient {
  initSession(sessionId: string, cwd: string): Promise<void>;
  sendObservation(observation: ToolObservation): void;
  summarizeSession(sessionId: string, summary: string): void;
}

class ClaudeMemWorkerClient implements WorkerClient {
  private baseUrl: string;
  private pendingObservations: ToolObservation[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor(port?: number) {
    const workerPort = port || process.env.CLAUDE_MEM_WORKER_PORT || 37700;
    this.baseUrl = `http://127.0.0.1:${workerPort}`;
  }

  async initSession(contentSessionId: string, cwd: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/sessions/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentSessionId, project: 'paperclip', cwd }),
      });
    } catch (error) {
      // 优雅降级 - worker 不可用不影响主流程
      console.warn('[claude-mem] Failed to init session:', error);
    }
  }

  sendObservation(observation: ToolObservation): void {
    this.pendingObservations.push(observation);

    // 防抖：批量发送
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), 1000);
    }
  }

  private async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    const observations = this.pendingObservations;
    this.pendingObservations = [];

    for (const obs of observations) {
      try {
        await fetch(`${this.baseUrl}/api/sessions/observations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(obs),
        });
      } catch (error) {
        console.warn('[claude-mem] Failed to send observation:', error);
      }
    }
  }

  async summarizeSession(contentSessionId: string, summary: string): Promise<void> {
    await this.flush(); // 确保所有观察已发送

    try {
      await fetch(`${this.baseUrl}/api/sessions/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentSessionId, last_assistant_message: summary }),
      });
    } catch (error) {
      console.warn('[claude-mem] Failed to summarize session:', error);
    }
  }
}

interface ToolObservation {
  contentSessionId: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: string;
  cwd: string;
  timestamp?: string;
}
```

### 3.3 Hooks 管理器实现

```typescript
// packages/adapters/opencode-local/src/server/hooks.ts

import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import { ClaudeMemWorkerClient, type ToolObservation } from "./worker-client.js";

export interface OpenCodeHookHandlers {
  onToolExecute?: (tool: string, args: Record<string, unknown>, result: unknown) => void;
  onSessionCreated?: (sessionId: string, cwd: string) => void;
  onSessionCompacted?: (sessionId: string, summary: string) => void;
  onSessionIdle?: (sessionId: string) => void;
}

export class OpenCodeHooksManager {
  private workerClient: ClaudeMemWorkerClient;
  private contentSessionId: string;
  private handlers: OpenCodeHookHandlers;

  constructor(handlers: OpenCodeHookHandlers) {
    this.workerClient = new ClaudeMemWorkerClient();
    this.handlers = handlers;
    this.contentSessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `paperclip-opencode-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async onSessionStart(cwd: string): Promise<void> {
    await this.workerClient.initSession(this.contentSessionId, cwd);
    this.handlers.onSessionCreated?.(this.contentSessionId, cwd);
  }

  onToolExecute(tool: string, args: Record<string, unknown>, result: unknown): void {
    const observation: ToolObservation = {
      contentSessionId: this.contentSessionId,
      tool_name: tool,
      tool_input: args,
      tool_response: typeof result === 'string' ? result : JSON.stringify(result),
      cwd: process.cwd(),
      timestamp: new Date().toISOString(),
    };

    this.workerClient.sendObservation(observation);
    this.handlers.onToolExecute?.(tool, args, result);
  }

  async onSessionEnd(summary: string): Promise<void> {
    await this.workerClient.summarizeSession(this.contentSessionId, summary);
    this.handlers.onSessionIdle?.(this.contentSessionId);
  }
}
```

### 3.4 集成到 execute.ts

```typescript
// packages/adapters/opencode-local/src/server/execute.ts 修改

import { OpenCodeHooksManager } from "./hooks.js";

// 在 execute 函数中

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const hooksManager = new OpenCodeHooksManager({
    onToolExecute: (tool, args, result) => {
      ctx.onLog?.("stderr", `[claude-mem] Tool executed: ${tool}\n`);
    },
    onSessionCreated: (sessionId, cwd) => {
      ctx.onLog?.("stderr", `[claude-mem] Session started: ${sessionId}\n`);
    },
    onSessionIdle: (sessionId) => {
      ctx.onLog?.("stderr", `[claude-mem] Session ended: ${sessionId}\n`);
    },
  });

  // 在会话开始时
  await hooksManager.onSessionStart(cwd);

  // ... 现有逻辑 ...

  // 修改 runAttempt 函数以捕获工具事件
  const runAttempt = async (resumeSessionId: string | null) => {
    // ... 现有代码 ...

    const proc = await runAdapterExecutionTargetProcess(
      runId,
      executionTarget,
      command,
      args,
      {
        cwd,
        env: preparedRuntimeConfig.env,
        stdin: prompt,
        timeoutSec,
        graceSec,
        onSpawn,
        onLog: (stream, chunk) => {
          // 解析 OpenCode JSONL 事件
          parseOpenCodeEvents(chunk, hooksManager);
          onLog?.(stream, chunk);
        },
      }
    );

    return { proc, parsed };
  };

  // ... 其余代码 ...
}
```

### 3.5 OpenCode 事件解析器

```typescript
// packages/adapters/opencode-local/src/server/opencode-event-parser.ts

import type { OpenCodeHooksManager } from "./hooks.js";

interface OpenCodeEvent {
  type: string;
  sessionID?: string;
  part?: {
    tool?: string;
    args?: Record<string, unknown>;
    result?: unknown;
    summary?: string;
  };
}

export function parseOpenCodeEvents(
  chunk: string,
  hooksManager: OpenCodeHooksManager
): void {
  const lines = chunk.split(/\r?\n/).filter(line => line.trim());

  for (const line of lines) {
    try {
      const event: OpenCodeEvent = JSON.parse(line);
      handleEvent(event, hooksManager);
    } catch {
      // 非 JSON 行，忽略
    }
  }
}

function handleEvent(
  event: OpenCodeEvent,
  hooksManager: OpenCodeHooksManager
): void {
  switch (event.type) {
    case "tool_use":
      if (event.part?.tool) {
        hooksManager.onToolExecute(
          event.part.tool,
          event.part.args || {},
          event.part.result || {}
        );
      }
      break;

    case "tool_result":
      // 可选：处理工具结果
      break;

    case "session.compacted":
      if (event.part?.summary) {
        hooksManager.onSessionEnd(event.part.summary);
      }
      break;

    case "session.idle":
    case "session.finish":
      // 会话结束
      break;
  }
}
```

---

## 4. 配置选项

### 4.1 新增适配器配置

```typescript
// packages/adapters/opencode-local/src/server/index.ts

export interface OpenCodeAdapterConfig {
  // ... 现有配置 ...

  // Claude-Mem Hooks 配置
  claudeMem?: {
    enabled: boolean;           // 是否启用 hooks
    workerPort?: number;        // Worker 端口（默认 37700）
    flushIntervalMs?: number;   // 观察刷新间隔（默认 1000ms）
  };
}
```

### 4.2 配置示例

```json
{
  "adapters": {
    "opencode-local": {
      "command": "opencode",
      "model": "anthropic/claude-3-5-sonnet",
      "claudeMem": {
        "enabled": true,
        "workerPort": 37700,
        "flushIntervalMs": 1000
      }
    }
  }
}
```

---

## 5. 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `CLAUDE_MEM_WORKER_PORT` | 37700 | Claude-Mem Worker 端口 |
| `CLAUDE_MEM_ENABLED` | true | 是否启用 hooks |
| `CLAUDE_MEM_DATA_DIR` | ~/.claude-mem | 数据目录（用于多账户） |

---

## 6. 测试计划

### 6.1 单元测试

```typescript
// packages/adapters/opencode-local/src/server/hooks.test.ts

describe("OpenCodeHooksManager", () => {
  it("should generate unique session IDs", () => {
    const manager1 = new OpenCodeHooksManager({});
    const manager2 = new OpenCodeHooksManager({});
    expect(manager1.getSessionId()).not.toBe(manager2.getSessionId());
  });

  it("should buffer observations with debounce", async () => {
    const workerClient = new MockWorkerClient();
    const manager = new OpenCodeHooksManager({}, workerClient);

    manager.onToolExecute("bash", { command: "ls" }, "file1\nfile2");
    manager.onToolExecute("read", { path: "test.txt" }, "content");

    // 观察尚未发送（防抖）
    expect(workerClient.getSentObservations()).toHaveLength(0);

    // 等待防抖
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 观察应该已发送
    expect(workerClient.getSentObservations()).toHaveLength(2);
  });
});
```

### 6.2 集成测试

```bash
# 1. 启动 Claude-Mem worker
npx claude-mem start

# 2. 运行 Paperclip OpenCode 适配器
paperclip agent run --adapter opencode-local --task "Create a new React component"

# 3. 验证观察记录
curl http://localhost:37700/api/observations?limit=10
```

---

## 7. 部署建议

### 7.1 条件启用

```typescript
// 只在 CLAUDE_MEM_ENABLED !== 'false' 时启用
const shouldEnableHooks =
  process.env.CLAUDE_MEM_ENABLED !== 'false' &&
  !process.env.CLAUDE_MEM_DISABLED;
```

### 7.2 优雅降级

- Worker 不可用时，不影响主流程
- 观察发送失败时，记录警告但不抛出错误
- 支持批量重试

---

## 8. 总结

| 方案 | 复杂度 | 优点 | 缺点 |
|------|--------|------|------|
| **方案 A** | 低 | 不修改 Paperclip，利用现有插件 | 依赖 OpenCode 非交互模式加载插件 |
| **方案 B** | 中 | 确定生效，完全可控 | 需要修改适配器代码 |

**推荐实施顺序**：
1. 先尝试方案 A（安装 Claude-Mem OpenCode 插件）
2. 验证 OpenCode `run` 命令是否加载插件
3. 如方案 A 不可行，实施方案 B

---

*文档版本：1.0.0*
