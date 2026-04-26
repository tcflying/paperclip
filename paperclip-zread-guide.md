# Paperclip 项目解读（来源：zread.ai/tcflying/paperclip）

> Paperclip 是面向自主 AI 公司的开源编排平台。它提供了一套完整的控制面——组织架构图、任务管理、预算、目标对齐、治理以及实时监控——让你能够像运营一家结构化的企业一样来管理 AI Agent 团队，而不是去维护一堆毫无关联的脚本。可以这样理解：如果 OpenClaw 是一名员工，那么 Paperclip 就是这家公司。

---

## 目录

1. [概述](#1-概述)
2. [快速开始](#2-快速开始)
3. [CLI 设置与初始化引导](#3-cli-设置与初始化引导)
4. [Docker 部署](#4-docker-部署)
5. [架构概述](#5-架构概述)
6. [Express 应用与路由](#6-express-应用与路由)
7. [心跳执行引擎](#7-心跳执行引擎)
8. [适配器架构与注册表](#8-适配器架构与注册表)

---

## 1. 概述

Paperclip 中的一切都源于一个核心设计理念：管理自主 Agent 应该像管理公司一样，而不是像看护终端一样。你只需设定一项使命，雇佣 Agent，分配预算，然后看着工作在层级化的组织架构中流转——所有操作都在同一个控制台完成。Paperclip 负责处理复杂的编排细节：原子级任务签出、心跳间 Agent 状态的持久化、成本强制执行，以及支持回滚的治理机制。它不是一个 Agent 框架、聊天机器人或工作流构建器——它是自主公司赖以运行的底层系统。

来源：README.md、GOAL.md

### 高层架构

Paperclip 是一个使用 TypeScript 编写的 pnpm monorepo，运行环境要求 Node.js ≥ 20。系统解耦为一个清晰的双层模型：中央控制面（Paperclip 服务器）和外部执行服务（Agent 适配器）。控制面负责编排；Agent 可以在任意环境中运行，并定期向控制面汇报。

服务器（server/src/index.ts）会引导启动一个嵌入式 PostgreSQL 数据库，运行迁移，创建一个 Express 应用，并启动一个用于实时事件的 WebSocket 服务器。UI 是一个 React + Vite 单页应用（ui/src/main.tsx），包含 50 多个页面和 100 多个组件。CLI（cli/src/index.ts）负责处理初始化引导、配置以及面向 Agent 的命令。每个适配器（packages/adapters/）负责将 Paperclip 的心跳协议转换为针对特定 Agent 环境的运行时指令。

来源：server/src/index.ts、server/src/app.ts、package.json

### Monorepo 结构

项目遵循 pnpm 工作区布局，每个主要关注点都被划分到独立的包中：

| 包路径 | 用途 |
|--------|------|
| @paperclipai/server (server/) | Express API 服务器、服务、路由、中间件、WebSocket 事件 |
| @paperclipai/db (packages/db/) | Drizzle ORM 模式定义、迁移文件（65 个以上）、嵌入式 PostgreSQL 运行时 |
| @paperclipai/shared (packages/shared/) | 供所有包使用的 Zod 验证器、TypeScript 类型、常量 |
| @paperclipai/cli (cli/) | 初始化引导向导，configure、doctor、run 命令 |
| ui (ui/) | React 控制台，包含用于管理 Agent、任务、目标、预算和组织架构图的页面 |
| @paperclipai/adapter-* (packages/adapters/) | 七个内置适配器，分别用于 Claude、Codex、Cursor、Gemini、OpenClaw、OpenCode、Pi |
| @paperclipai/adapter-utils (packages/adapter-utils/) | 适配器共享的辅助函数与契约类型 |
| @paperclipai/plugin-sdk (packages/plugins/sdk/) | 用于编写第三方插件的 SDK |
| @paperclipai/mcp-server (packages/mcp-server/) | Model Context Protocol 服务器，将 Paperclip 暴露为 MCP 工具 |

来源：pnpm-workspace.yaml、server/package.json、package.json

### 核心概念

#### 公司与目标

公司是顶层组织单元。一次 Paperclip 部署可以托管多个公司，且彼此之间完全数据隔离。每个公司都有一项使命——例如，"在 3 个月内将排名第一的 AI 笔记应用做到 100 万美元 MRR"——而每一项任务、每一个 Agent 以及每一项预算决策，都能通过层级链路追溯到这项使命。

#### Agent 与组织架构图

每一名员工都是一个 Agent，其底层由一个适配器支撑，该适配器定义了 Agent 的运行方式（Claude Code、Codex、OpenClaw 或任何能够接收心跳的运行时）。Agent 被组织在一个组织架构图中，包含职位、汇报线、角色和能力描述。CEO 审查战略；工程师认领任务；营销人员开展活动——每个角色都有各自的适配器配置和自主心跳循环。

#### 心跳与任务执行

心跳是最基础的执行原语。在可配置的调度下，Agent 会唤醒，检查其分配的工作，并采取行动。Paperclip 会追踪每次心跳的运行情况，记录工具调用，并持久化会话上下文，以确保 Agent 能够准确从上次中断的地方恢复——绝不会从头开始。任务签出是原子级的：杜绝重复劳动，避免失控循环。

#### 预算与治理

每个 Agent 都配有一个 token 预算。一旦预算耗尽，Agent 就会停止运行——你的账单上不会出现意外惊吓。董事会（最初为单个人类操作员）负责治理高影响力决策：审批雇佣、推翻战略、暂停 Agent，以及修改任意层级的预算。配置变更均带有版本号，可以安全回滚。

来源：PRODUCT.md、SPEC.md、README.md

### 核心能力一览

| 能力 | 功能说明 |
|------|----------|
| 自带 Agent | 任何 Agent、任何运行时，共用一个组织架构图。只要能接收心跳，即可录用。 |
| 目标对齐 | 每一项任务都通过父级链路追溯到公司使命。Agent 始终清楚为什么要做这件事。 |
| 心跳执行 | Agent 按计划唤醒、检查工作并执行。任务委派在组织架构图中上下流转。 |
| 成本控制 | 每个 Agent 设有月度 token 预算。达到限额时，执行即刻停止。 |
| 多公司支持 | 单次部署，多个公司。彼此之间完全数据隔离。 |
| 工单系统 | 每次对话均有迹可循，每个决策都有据可查，并提供完整的工具调用追踪。 |
| 治理机制 | 随时审批雇佣、推翻战略、暂停或终止任何 Agent。 |
| 移动端就绪 | 随时随地监控和管理你的自主业务。 |
| 插件系统 | 通过自定义工具、UI 插槽和事件驱动工作流来扩展 Paperclip。 |

来源：README.md

### 部署模式

Paperclip 支持两种运行模式：

| 模式 | 暴露范围 | 认证方式 | 典型用途 |
|------|----------|----------|----------|
| local_trusted | 仅限本地回环 | 无需登录 | 单操作员本地工作流——最快上手体验 |
| authenticated | private 或 public | 需要登录 | 通过局域网、Tailscale 或公共互联网进行的团队或云端部署 |

默认的快速启动命令（npx paperclipai onboard --yes）会在 localhost:3100 上以 local_trusted 模式启动，并配备一个嵌入式 PostgreSQL 数据库——无需任何外部依赖。切换到认证模式仅需一个标志位：--bind lan 或 --bind tailnet。

来源：DEPLOYMENT-MODES.md、README.md

### 技术栈概览

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js ≥ 20，ESM |
| 编程语言 | TypeScript 5.7+ |
| 服务器框架 | Express 5 |
| 数据库 | 嵌入式 PostgreSQL（通过 embedded-postgres） |
| ORM | Drizzle ORM |
| 数据校验 | Zod + Ajv |
| UI 框架 | React + Vite |
| 实时通信 | WebSocket (ws) |
| 身份认证 | Better Auth |
| 测试 | Vitest + Playwright (e2e) |
| 包管理器 | pnpm 9.x |
| 容器化 | Docker、Docker Compose |

来源：package.json、server/package.json

---

## 2. 快速开始

在五分钟内让 Paperclip 在你的机器上运行起来。本指南涵盖三种路径——单命令安装器、从源码进行本地开发以及容器化部署。

### 前置条件

| 要求 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥ 20 | 服务端与 CLI 的运行时引擎 |
| pnpm | 9.15+ | 包管理器（仅在源码安装时需要） |
| Docker（可选） | 最新版 | 用于容器化部署 |

来源：package.json

### 路径一 —— 单命令安装器（推荐）

让 Paperclip 运行起来的最快方式。无需克隆仓库，也无需手动安装依赖——npx 会直接下载并执行 CLI。

```bash
npx paperclipai onboard --yes
```

这单条命令会执行整个首次运行设置：生成默认配置、创建嵌入式 PostgreSQL 数据库、配置本地文件存储、设置用于加密密钥的加密密钥，并启动服务器。--yes 标志会接受所有快速启动的默认值，因此你不会被交互式地提示输入。默认情况下，服务器以受信任的本地回环模式启动——仅可通过 127.0.0.1:3100 访问，且无需身份验证。

如果你希望服务器可以在本地网络或通过 VPN 隧道被访问，请显式指定绑定预设：

```bash
npx paperclipai onboard --yes --bind lan
# Tailscale tailnet 访问
npx paperclipai onboard --yes --bind tailnet
```

#### 绑定模式

| 绑定模式 | 网络 | 认证模式 | 使用场景 |
|----------|------|----------|----------|
| loopback（默认） | 仅限 127.0.0.1 | 本地受信任（无认证） | 快速本地实验 |
| lan | 0.0.0.0（所有接口） | 已认证 + 私有 | 同一网络下的团队访问 |
| tailnet | Tailscale IP | 已认证 + 私有 | 通过 Tailscale 进行安全的远程访问 |

来源：cli/src/commands/onboard.ts, scripts/dev-runner.ts, README.md

#### onboard 在底层做了什么

| 设置 | 默认值 | 描述 |
|------|--------|------|
| 数据库 | 嵌入式 PostgreSQL | 自动管理，无需外部 DB |
| 存储 | 本地文件系统 | 文件存储在 ~/.paperclip 中 |
| 密钥 | 本地加密 | 自动生成 AES 密钥 |
| LLM 提供商 | 未配置 | 稍后添加 Anthropic/OpenAI 密钥 |
| 遥测 | 已启用（匿名） | 可在设置后禁用 |
| Agent JWT | 自动生成 | Agent 身份验证所必需 |

来源：cli/src/commands/onboard.ts

#### 验证安装

```bash
curl -sS http://127.0.0.1:3100/api/health
```

成功的响应表明 API 服务器、嵌入式数据库和迁移系统均已正常运行。在浏览器中打开 http://localhost:3100 即可访问 React 仪表盘。

#### 日常命令

| 命令 | 用途 |
|------|------|
| npx paperclipai run | 启动服务器（如有需要会自动执行 onboard，并运行 doctor 检查） |
| npx paperclipai configure | 编辑配置项（数据库、LLM、服务器等） |
| npx paperclipai doctor | 运行诊断检查并自动修复常见问题 |

### 路径二 —— 从源码进行本地开发

```bash
git clone https://github.com/tcflying/paperclip.git
cd paperclip
pnpm install
pnpm dev
```

其他开发命令：

| 命令 | 行为 |
|------|------|
| pnpm dev | 完整开发：API + UI，支持文件监听与自动重启 |
| pnpm dev:once | 启动一次服务器，不监听文件更改 |
| pnpm dev:server | 仅启动服务器（无开发运行器包装） |
| pnpm dev:ui | 仅启动 UI（Vite 开发服务器） |
| pnpm dev:stop | 停止正在运行的开发服务器实例 |
| pnpm dev:list | 列出所有正在运行的开发服务器实例 |

### 路径三 —— Docker 部署

快速启动 Compose（单容器）：

```bash
BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/docker-compose.quickstart.yml up --build
```

全栈 Compose（服务器 + PostgreSQL）：

```bash
BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/docker-compose.yml up --build
```

### 项目结构概览

```
paperclip/
├── cli/                    # CLI 工具（onboard、doctor、configure、run）
├── server/                 # Express API 服务器 + 心跳引擎
├── ui/                     # React 仪表盘（Vite + TypeScript）
├── packages/
│   ├── adapters/           # Agent 适配器实现
│   │   ├── claude-local/
│   │   ├── codex-local/
│   │   ├── openclaw-gateway/
│   │   └── ...
│   ├── db/                 # Drizzle ORM 模式 + 迁移
│   ├── shared/             # 类型、常量、验证
│   └── plugins/sdk/        # 插件 SDK
├── scripts/                # 开发运行器、发布、冒烟测试
├── docker/                 # Compose 文件、Dockerfile、Quadlet
└── skills/                 # 运行时可注入的 Agent 技能
```

### 常见问题排查

| 症状 | 可能原因 | 修复方法 |
|------|----------|----------|
| 端口 3100 出现 EADDRINUSE | 有另一个 Paperclip 实例正在运行 | 运行 pnpm dev:stop 或 lsof -i :3100 来终止进程 |
| 数据库迁移错误 | 嵌入式 DB 损坏 | 删除 ~/.paperclip/instances/default/embedded-postgres/ 并重启 |
| BETTER_AUTH_SECRET must be set | Docker compose 缺少环境变量 | 使用 openssl rand -hex 32 生成一个并传入 |
| Agent JWT 密钥缺失警告 | Onboard 未完成 | 运行 npx paperclipai onboard 或 npx paperclipai doctor --repair |
| 绑定了 Tailscale 但无 Tailscale IP | Tailscale 未运行 | 启动 Tailscale 或切换到 --bind lan |

---

## 3. CLI 设置与初始化引导

Paperclip CLI（paperclipai）是你安装、配置、诊断和运行 Paperclip 实例的唯一入口。

### CLI 架构概览

CLI 基于 Commander.js 构建以实现命令路由，并使用 @clack/prompts 提供交互式终端体验。每个命令共享一个通用的生命周期：全局 preAction 钩子解析数据目录，从配置位置加载 .env 文件，并在任何命令逻辑执行之前初始化遥测功能。

### 安装 CLI

```bash
npm install -g paperclipai
paperclipai --version
```

### onboard 命令

```bash
paperclipai onboard
```

选项：

| 标志 | 简写 | 描述 |
|------|------|------|
| --config <path> | -c | 配置文件路径（默认：~/.paperclip/instances/default/config.json） |
| --data-dir <path> | -d | 覆盖 Paperclip 主目录根路径 |
| --bind <mode> | — | 快速入门可达性预设：loopback、lan 或 tailnet |
| --yes | -y | 接受所有快速入门默认值并立即启动 |
| --run | — | 在保存配置后启动 Paperclip（即使没有 --yes） |

#### 快速入门默认值

| 组件 | 快速入门默认值 | 环境变量覆盖 |
|------|----------------|-------------|
| 数据库 | 嵌入式 PostgreSQL（端口 54329） | DATABASE_URL 切换到外部 Postgres |
| 日志 | 基于文件（~/.paperclip/instances/default/logs） | — |
| 服务器模式 | local_trusted / private | PAPERCLIP_DEPLOYMENT_MODE |
| 服务器绑定 | 环回（127.0.0.1:3100） | PAPERCLIP_BIND、HOST、PORT |
| Auth URL 模式 | 自动 | PAPERCLIP_AUTH_BASE_URL_MODE、PAPERCLIP_PUBLIC_URL |
| 存储 | 本地磁盘（~/.paperclip/instances/default/data/storage） | PAPERCLIP_STORAGE_PROVIDER、PAPERCLIP_STORAGE_LOCAL_DIR |
| 密钥 | 本地加密（~/.paperclip/instances/default/secrets/master.key） | PAPERCLIP_SECRETS_PROVIDER、PAPERCLIP_SECRETS_MASTER_KEY_FILE |
| LLM | 未配置（可选） | — |

### 引导完成后：run、doctor 和 configure

#### paperclipai run

启动 Paperclip 的主要命令，在启动服务器之前会执行完整的预检序列。

#### paperclipai doctor

针对你当前的配置运行九项诊断检查：

| # | 检查项 | 可修复 | 验证内容 |
|---|--------|--------|----------|
| 1 | 配置文件 | 否 | 配置存在且为有效的 JSON |
| 2 | 部署/认证模式 | 否 | 认证模式和暴露范围一致 |
| 3 | Agent JWT 密钥 | 是 | .env 中存在 PAPERCLIP_AGENT_JWT_SECRET |
| 4 | 密钥适配器 | 是 | 本地提供商的密钥文件存在 |
| 5 | 存储适配器 | 是 | 存储目录存在 |
| 6 | 数据库 | 是 | 嵌入式 Postgres 数据目录存在 / 外部连接正常 |
| 7 | LLM | 否 | 如果配置了提供商，则 API 密钥存在 |
| 8 | 日志目录 | 是 | 日志目录存在 |
| 9 | 端口 | 否 | 服务器端口可用 |

```bash
paperclipai doctor --repair --yes
```

#### paperclipai configure

更新现有配置的各个部分：

```bash
paperclipai configure --section llm
paperclipai configure --section server
```

### 数据目录结构

```
~/.paperclip/
├── context.json
├── auth.json                             # CLI 客户端认证状态
└── instances/
    └── default/                          # 实例 ID
        ├── config.json                   # 核心配置文件
        ├── db/                           # 嵌入式 PostgreSQL 数据目录
        ├── logs/                         # 基于文件的日志输出
        ├── data/
        │   ├── storage/                  # 本地磁盘存储提供商文件
        │   └── backups/                  # 自动数据库备份
        └── secrets/
            └── master.key                # 本地加密密钥的主密钥
```

### 常用环境变量

| 变量 | 作用域 | 示例 |
|------|--------|------|
| PAPERCLIP_HOME | 数据目录根路径 | /opt/paperclip |
| PAPERCLIP_INSTANCE_ID | 命名实例 | staging |
| DATABASE_URL | 将数据库切换到外部 Postgres | postgres://user:pass@db:5432/paperclip |
| PORT | 服务器端口 | 3100 |
| PAPERCLIP_BIND | 可达性预设 | lan、tailnet、loopback |
| PAPERCLIP_PUBLIC_URL | 用于认证的公共 URL | https://paperclip.example.com |
| PAPERCLIP_AGENT_JWT_SECRET | 预设 Agent 认证密钥（用于 CI） | — |

---

## 4. Docker 部署

Paperclip 提供了完全容器化的部署路径。Docker 镜像采用多阶段构建，会生成一个自包含的生产环境包。

### 部署选项快速对比

| 选项 | 数据库 | 适用场景 | 容器数量 |
|------|--------|----------|----------|
| Compose 快速启动 | 嵌入式 PostgreSQL | 评估、个人使用、单机部署 | 1 |
| Compose 完整堆栈 | 外部 PostgreSQL 17 | 团队协作、持久化的生产工作负载 | 2 |
| Podman Quadlet | 外部 PostgreSQL 17 | 使用 systemd 的 Linux 宿主机、持久化服务 | 2 (在 1 个 Pod 中) |
| 手动 docker run | 嵌入式 PostgreSQL | 自定义配置、脚本化部署 | 1 |

### 选项 1 — Compose 快速启动

```bash
BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/docker-compose.quickstart.yml up --build
```

环境变量：

| 变量 | 默认值 | 用途 |
|------|--------|------|
| PAPERCLIP_PORT | 3100 | 映射到容器 3100 端口的宿主机端口 |
| PAPERCLIP_DATA_DIR | ../data/docker-paperclip | 作为 /paperclip 挂载的宿主机目录 |
| PAPERCLIP_PUBLIC_URL | http://localhost:3100 | 用于认证回调和邀请链接的外部 URL |
| BETTER_AUTH_SECRET | (必填) | 用于会话令牌的加密密钥 |
| OPENAI_API_KEY | (空) | 启用 Codex 本地适配器 |
| ANTHROPIC_API_KEY | (空) | 启用 Claude 本地适配器 |

### 选项 2 — Compose 完整堆栈 (PostgreSQL 17)

```bash
BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  docker compose -f docker/docker-compose.yml up --build
```

PostgreSQL 17 运行在基于 Alpine 的独立容器中，配置了 pg_isready 健康检查。两个命名的 Docker 卷持久化数据：pgdata（PostgreSQL 数据文件）和 paperclip-data（Paperclip 主目录）。

### 选项 3 — 手动 Docker 构建与运行

```bash
docker build -t paperclip-local .
docker run --name paperclip \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e PAPERCLIP_HOME=/paperclip \
  -e BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  -v "$(pwd)/data/docker-paperclip:/paperclip" \
  paperclip-local
```

### 选项 4 — Podman Quadlet（Linux 上的 systemd）

docker/quadlet/ 目录下提供了预编写的 Unit 文件，可将 Paperclip 和 PostgreSQL 作为受管理的 Pod 运行。

### 预装的 Agent CLI

生产环境的 Docker 镜像全局安装了三个 Agent CLI：

| CLI | 包名 | 环境变量 |
|-----|------|----------|
| Claude Code | @anthropic-ai/claude-code | ANTHROPIC_API_KEY |
| Codex | @openai/codex | OPENAI_API_KEY |
| OpenCode | opencode-ai | OPENCODE_ALLOW_ALL_MODELS=true (已预设) |

### 故障排除

| 症状 | 可能的原因 | 解决方法 |
|------|------------|----------|
| /paperclip 权限被拒绝 | 宿主机 UID/GID 与容器用户不匹配 | 使用 --build-arg USER_UID=$(id -u) --build-arg USER_GID=$(id -g) 重新构建 |
| BETTER_AUTH_SECRET must be set | 缺少必填的环境变量 | 使用 openssl rand -hex 32 生成并传入 |
| 认证重定向到错误的 URL | PAPERCLIP_PUBLIC_URL 未设置或不正确 | 将其设置为浏览器实际使用的准确 URL |
| 适配器报告缺少前置条件 | 未提供 API 密钥 | 将 OPENAI_API_KEY 和/或 ANTHROPIC_API_KEY 作为环境变量传入 |

---

## 5. 架构概述

Paperclip 是一个面向自主 AI Agent 公司的全栈编排平台。系统采用基于 Monorepo 的分层架构，由 7 个独立的包组成，通过 pnpm workspaces 进行编排。

### 工作区拓扑

| 工作区 | 路径 | 用途 |
|--------|------|------|
| server | server/ | Express HTTP 服务器、心跳引擎、服务层、插件宿主 |
| ui | ui/ | React + Vite 单页仪表盘 |
| cli | cli/ | 基于 Commander 的 CLI |
| shared | packages/shared/ | 领域类型、Zod 校验 Schema、常量（890+ 导出项） |
| db | packages/db/ | Drizzle ORM Schema、迁移、嵌入式 PostgreSQL 生命周期 |
| adapter-utils | packages/adapter-utils/ | 适配器类型契约与会话压缩工具 |
| adapters/* | packages/adapters/*/ | 7 个 LLM Agent 适配器实现 |
| plugins/sdk | packages/plugins/sdk/ | 基于 JSON-RPC 协议的插件开发 SDK |
| mcp-server | packages/mcp-server/ | Model Context Protocol 服务器桥接 |

来源：pnpm-workspace.yaml, package.json, tsconfig.base.json

### 服务器核心

服务器是中央神经系统，基于 Express 构建。启动过程：

1. **配置加载** — 将 TOML 配置文件与环境变量合并
2. **遥测初始化** — 选择性加入
3. **数据库供给** — 支持嵌入式 PostgreSQL 或外部 postgres
4. **迁移对账** — 检查并应用待执行的迁移
5. **Express 应用创建** — 接入中间件，挂载 30 多个路由模块
6. **WebSocket 服务器** — 实时事件流传输
7. **服务初始化** — 心跳调度器、常规服务、存储服务上线
8. **插件系统引导** — 加载插件，启动 Worker 管理器

来源：server/src/index.ts, server/src/config.ts

### 路由组织

| 路由模块 | 路径前缀 | 领域 |
|----------|----------|------|
| healthRoutes | /health | 实例健康状态、部署状态 |
| companyRoutes | /companies | 公司 CRUD、导入/导出 |
| agentRoutes | /agents | Agent 管理、唤醒/重置 |
| issueRoutes | /issues | 议题生命周期、文档、反馈 |
| projectRoutes | /projects | 项目与工作区管理 |
| approvalRoutes | /approvals | 带有预算的审批流 |
| costRoutes | /costs | 成本跟踪与计费事件 |
| routineRoutes | /routines | 定时自动化任务 |
| pluginRoutes | /plugins | 插件安装/配置/状态 |
| adapterRoutes | /adapters | 适配器注册表与元数据 |

### 服务层

server/src/services/ 目录包含 90 多个服务模块：

- **heartbeat.ts** — 最大的模块（约 7,490 行），负责 Agent 调用、适配器进程管理、会话跟踪
- **plugin-worker-manager.ts / plugin-job-scheduler.ts / plugin-tool-dispatcher.ts** — 插件生命周期与执行隔离
- **budgets.ts / costs.ts / finance.ts** — 财务治理与成本强制执行
- **activity-log.ts / live-events.ts** — 实时事件发布与活动跟踪

### Agent 适配器系统

每个适配器都是 packages/adapters/ 下的一个独立工作区：

```
packages/adapters/<name>/
├── src/
│   ├── cli/
│   ├── server/     # 服务器适配器模块（由心跳引擎生成）
│   └── ui/         # 用于适配器特定配置的 React UI 组件
├── package.json
└── tsconfig.json
```

| 适配器 | 目标 Agent | 传输方式 |
|--------|------------|----------|
| claude-local | Anthropic Claude Code | 子进程 (stdout JSON) |
| codex-local | OpenAI Codex CLI | 子进程 (stdout JSON) |
| cursor-local | Cursor IDE | 子进程 (stdout JSON) |
| gemini-local | Google Gemini CLI | 子进程 (stdout JSON) |
| openclaw-gateway | OpenClaw 远程 Agent | 子进程 (stdout JSON) |
| opencode-local | OpenCode | 子进程 (stdout JSON) |
| pi-local | Pi CLI | 子进程 (stdout JSON) |

### 数据层

使用面向 PostgreSQL 的 Drizzle ORM，具备一流的嵌入式 PostgreSQL 运行时。

### 共享类型与校验

packages/shared/ 包是领域建模的唯一事实来源，导出：
- 类枚举常量数组（DEPLOYMENT_MODES、AGENT_STATUSES、ISSUE_STATUSES 等）
- TypeScript 接口（Company、Agent、Issue、Approval、BudgetPolicy 等）
- Zod 校验 Schema（createCompanySchema、createIssueSchema 等）
- 配置 Schema（paperclipConfigSchema）

### 插件系统

插件通过沙箱化 Worker 架构扩展 Paperclip 的能力，通过 stdio 上的结构化 JSON-RPC 协议通信。

- **definePlugin()** — 声明一个插件及其清单、初始化处理程序和能力处理程序
- **createTestHarness()** — 无需 Worker 隔离的进程内测试
- **宿主客户端接口** — 15 个以上接口（PluginConfigClient、PluginIssuesClient 等）

### 实时层

基于原生 WebSockets 构建，支持：
- 按公司订阅事件
- 参与者识别（board / agent）
- 实时事件流（心跳进度、议题更新、审批决策等）

### 数据流概览

```
Heartbeat Scheduler → Heartbeat Engine → Adapter Process → PostgreSQL
                                          ↓
                              Dashboard ← WebSocket
```

---

## 6. Express 应用与路由

### 应用启动

createApp 函数接受一个全面的选项对象：

| 选项 | 类型 | 用途 |
|------|------|------|
| uiMode | "none" \| "static" \| "vite-dev" | 控制前端仪表盘的提供方式 |
| deploymentMode | DeploymentMode | "local_trusted" 或 "authenticated" |
| deploymentExposure | DeploymentExposure | "private" 或 "public" |
| storageService | StorageService | 文件/Blob 存储的抽象层 |
| betterAuthHandler | RequestHandler? | BetterAuth 会话处理器 |
| databaseBackupService | InstanceDatabaseBackupService? | 数据库备份服务 |

### 请求处理管道

```
Incoming Request
  → express.json() (body parsing, limit: 10mb + rawBody capture)
  → httpLogger (structured HTTP logging)
  → privateHostnameGuard (reject if hostname not allowed)
  → actorMiddleware (resolve user/agent/board identity)
    → /api/auth/* → authRoutes / betterAuthHandler
    → LLM Routes (global, pre-api)
  → /api/* Router
    → boardMutationGuard (CSRF protection on write ops)
    → Domain route handlers
  → errorHandler (final error catch)
```

### 前置 API 路由

| 挂载路径 | 模块 | 用途 |
|----------|------|------|
| /api/auth | authRoutes | 会话管理、用户资料检索 |
| (透传) | betterAuthHandler | 委托给 BetterAuth 处理凭据流程 |
| (全局) | llmRoutes | LLM 模型发现与配置 |

### API 领域路由

| 路由模块 | 主要职责 |
|----------|----------|
| healthRoutes | 存活状态与部署状态 |
| companyRoutes | 公司的 CRUD、品牌塑造、可移植性导入/导出 |
| agentRoutes | Agent CRUD、API 密钥、指令、组织架构图、技能同步、唤醒/休眠（最大的路由模块，2720 行） |
| assetRoutes | 文件上传/下载 |
| projectRoutes | 项目管理 |
| issueRoutes | Issue 生命周期、评论、附件、工作产品、执行决策（第二大模块，3603 行） |
| routineRoutes | 周期性任务调度 |
| executionWorkspaceRoutes | 隔离的执行环境、运行时服务控制 |
| goalRoutes | 目标层级与跟踪 |
| approvalRoutes | 审批工作流 |
| secretRoutes | 加密密钥管理 |
| costRoutes | 预算与 Token 成本跟踪 |
| activityRoutes | 活动流与审计日志 |
| dashboardRoutes | 仪表盘聚合查询 |
| pluginRoutes | 插件生命周期、任务、Webhook、工具、作用域 API 代理 |
| adapterRoutes | 适配器注册表管理、模型列表、外部适配器安装 |
| accessRoutes | 邀请、加入请求、公司成员资格、权限（最大模块，4390 行） |

### 授权模型

| 断言函数 | 要求 | 错误码 |
|----------|------|--------|
| assertAuthenticated(req) | Actor 类型必须为 "user" 或 "agent" | 401 |
| assertBoard(req) | Actor 类型必须为 "board"、"user" 或 "agent" | 403 |
| assertInstanceAdmin(req) | Actor 必须是具有 instance_admin 角色的用户 | 403 |
| assertCompanyAccess(req, companyId) | Actor 必须具有指定公司的成员资格 | 403 |

### UI 服务模式

| 模式 | 行为 | 缓存策略 |
|------|------|----------|
| "none" | 纯 API 模式；不提供 UI 文件 | 不适用 |
| "static" | 从 server/ui-dist/ 或 ui/dist/ 提供预构建文件 | 哈希资源：1年 不可变；index.html：no-cache |
| "vite-dev" | 集成带有 HMR 的 Vite 开发中间件 | 缓存由 Vite 处理 |

---

## 7. 心跳执行引擎

心跳执行引擎是 Paperclip 的 agent 运行时的中枢神经系统。它将唤醒信号（定时器滴答、issue 分配、手动 ping 和自动化触发器）转化为有序的适配器调用。

### 运行状态机

| 分区 | 状态 | 描述 |
|------|------|------|
| 活跃 | queued, running, scheduled_retry | 运行处于执行流水线中 |
| 终态 – 成功 | succeeded | 适配器无错误返回 |
| 终态 – 失败 | failed, cancelled, timed_out | 运行异常结束或被外部取消 |
| 已调度 | scheduled_retry | 已为未来的执行调度了一次有界的瞬时重试 |

### 唤醒接入与并发控制

唤醒请求通过 enqueueWakeup() 进入系统。并发强制执行使用按 agent 划分的 promise 锁，有效并发上限被钳制在默认值和硬性最大值 10 之间。

### 会话管理与连续性

会话连续性允许 agent 在多次心跳运行中积累上下文。引擎维护两个互补的会话系统：传统的 agentRuntimeState.sessionId 和 agentTaskSessions 表。

evaluateSessionCompaction() 基于以下阈值实现主动会话轮换：
- 最大会话运行次数
- 最大原始输入 token 数
- 最大会话存活时长（小时）

### 工作区解析策略

resolveWorkspaceForRun() 实现了带优先级的回退链：
1. 项目主工作区
2. 托管工作区（git clone）
3. 任务会话 cwd
4. Agent 主目录回退

### 活跃度分类

classifyRunLiveness() 实现多信号分类方案：
- **有效输出** — 创建的 issue 评论、文档修订、工作产物等
- **仅规划检测** — "I'll inspect…"、"let me check…" 等模式
- **阻塞检测** — 识别明确的阻塞声明

### 运行续作与自动重试

- **活跃度续作** — 当分类结果为 plan_only 或 empty_response 时自动重试
- **瞬时重试** — 处理基础设施级别故障，延迟时间表：[2min, 10min, 30min, 2hr]，抖动比例 25%，最多 4 次

### 关键配置常量

| 常量 | 值 | 用途 |
|------|-----|------|
| MAX_LIVE_LOG_CHUNK_BYTES | 8 KB | 单次事件的 WebSocket payload 上限 |
| MAX_PERSISTED_LOG_CHUNK_CHARS | 64 KB | 运行日志的单块存储上限 |
| HEARTBEAT_MAX_CONCURRENT_RUNS_MAX | 10 | 单个 agent 并发运行的硬性上限 |
| BOUNCED_TRANSIENT_HEARTBEAT_RETRY_DELAYS_MS | [2m, 10m, 30m, 2h] | 带有抖动的指数退避重试延迟 |
| MANAGED_WORKSPACE_GIT_CLONE_TIMEOUT_MS | 10 min | 托管工作区 git clone 的超时时间 |

---

## 8. 适配器架构与注册表

适配器架构是 Paperclip 的核心抽象，它通过单一、统一的执行契约来编排多种 AI 编码 Agent。

### 适配器契约

每个适配器都必须满足 ServerAdapterModule 接口。两个必须实现的生命周期方法：

1. **execute** — 接收 AdapterExecutionContext，返回 AdapterExecutionResult（退出码、Token 用量、计费元数据、会话状态等）
2. **testEnvironment** — 接收 AdapterEnvironmentTestContext，返回结构化的警告和错误检查清单

### 可选能力钩子

| 成员 | 用途 |
|------|------|
| listSkills(ctx) | 枚举可用的运行时技能 |
| syncSkills(ctx, desiredSkills) | 将技能文件具象化到磁盘 |
| sessionCodec | 序列化/反序列化会话参数 |
| sessionManagement | 声明原生的上下文管理和压缩策略 |
| models | 支持的模型的静态列表 |
| listModels() | 动态发现可用模型 |
| getQuotaWindows() | 获取实时的速率限制/额度使用情况 |
| detectModel() | 从本地配置文件中读取当前配置的模型 |
| getConfigSchema() | 返回适配器设置 UI 的声明式表单字段 |
| onHireApproved() | Agent 被批准/雇佣时的生命周期钩子 |
| agentConfigurationDoc | 在 Agent 详情视图中展示的 Markdown 文档 |

---

*来源：https://zread.ai/tcflying/paperclip*
*下载时间：2026-04-26*
