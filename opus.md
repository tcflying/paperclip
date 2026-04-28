# Paperclip 项目解读

> 由 Claude Opus 4.7 生成 · 2026-04-28

## 一、定位

**Paperclip** 是开源的"零人公司"运营平台 / AI Agent 编排控制面板。

> 如果 OpenClaw / Claude Code 是"员工"，Paperclip 就是"公司"。

它把多个 AI Agent 组织成有目标、预算、治理、汇报关系的团队 —— 表面像任务管理器，底层是 org chart、budgets、governance、goal alignment 与 agent coordination。

**核心理念:** Manage business goals, not pull requests.

---

## 二、技术栈

| 维度 | 技术选型 |
|------|---------|
| 语言 | TypeScript (ES2023, ESM) |
| 运行时 | Node.js >= 20 |
| 包管理 | pnpm 9.15.4 (monorepo) |
| 后端 | Express 5.x |
| 数据库 | PostgreSQL (Drizzle ORM) + 可选内嵌 embedded-postgres |
| 前端 | React 19 + Vite 6 |
| 状态 | TanStack React Query + React Context |
| 样式 | Tailwind CSS v4 + CSS 变量主题 |
| UI 组件 | Radix UI + shadcn/ui 风格 |
| 认证 | better-auth (邮箱/密码) |
| 实时通信 | WebSocket (ws) |
| 校验 | Zod |
| 测试 | Vitest + Playwright (E2E) + promptfoo (evals) |

---

## 三、Monorepo 结构

```
paperclip/
├── server/                  # Express REST API + WebSocket 服务端
├── ui/                      # React + Vite 控制台
├── cli/                     # paperclipai 命令行工具
├── packages/
│   ├── db/                  # Drizzle schema, migrations, DB clients
│   ├── shared/              # 共享类型/常量/校验/API 路径
│   ├── adapter-utils/       # 适配器工具
│   ├── mcp-server/          # MCP (Model Context Protocol) 服务器
│   ├── adapters/*           # Agent 适配器 (Claude Code / Codex / CLI / HTTP)
│   └── plugins/
│       ├── sdk/             # 插件 SDK
│       └── examples/*       # 插件示例
├── doc/                     # 产品/设计文档
├── docs/                    # Mintlify 文档站
├── scripts/                 # 构建/发布/工具脚本
├── docker/                  # Docker 配置
├── tests/                   # E2E 测试 (Playwright)
├── evals/                   # promptfoo 评估
└── releases/                # 版本变更日志
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - packages/*
  - packages/adapters/*
  - packages/plugins/*
  - packages/plugins/examples/*
  - server
  - ui
  - cli
```

---

## 四、Server 端架构

### 4.1 启动流程 (`server/src/index.ts` → `startServer()`)

1. 加载配置 (loadConfig)
2. 初始化遥测 (initTelemetry)
3. 设置密钥环境变量
4. 数据库初始化
   - 外部 PostgreSQL: `DATABASE_URL` → ensureMigrations()
   - 内嵌 PostgreSQL: embedded-postgres → 动态导入 → 初始化集群
5. 部署模式验证 (`local_trusted` / `authenticated`)
6. 认证初始化
   - `local_trusted`: 创建 `local-board` 用户
   - `authenticated`: better-auth 初始化
7. 端口检测 (detectPort)
8. 创建 Express 应用 (createApp)
9. 创建 HTTP Server (keepAlive=185s)
10. WebSocket 服务挂载
11. 恢复持久化运行时服务
12. 心跳调度器启动
13. 数据库自动备份
14. 等待外部适配器加载
15. 开始监听 + 打印启动 banner
16. 注册优雅关闭 (SIGINT/SIGTERM)

### 4.2 中间件链

```
express.json({ limit: "10mb" })   → JSON body 解析
httpLogger (Pino)                 → HTTP 请求日志
privateHostnameGuard              → 私有主机名守卫 (private 暴露模式)
actorMiddleware                   → 解析当前 actor (用户/agent)
boardMutationGuard                → Board 角色写操作限制
[路由处理]
errorHandler                      → 全局错误处理
```

### 4.3 路由模块 (前缀 `/api`)

| 模块 | 路径 | 用途 |
|------|------|------|
| healthRoutes | `/api/health` | 健康检查 |
| companyRoutes | `/api/companies` | 公司/组织 CRUD |
| agentRoutes | `/api/agents` | Agent 管理 |
| projectRoutes | `/api/projects` | 项目管理 |
| issueRoutes | `/api/issues` | Issue/任务 |
| goalRoutes | `/api/goals` | 目标 |
| approvalRoutes | `/api/approvals` | 审批 |
| secretRoutes | `/api/secrets` | 密钥/凭证 |
| costRoutes | `/api/costs` | 成本追踪 |
| activityRoutes | `/api/activity` | 活动日志 |
| dashboardRoutes | `/api/dashboard` | 仪表盘 |
| routineRoutes | `/api/routines` | 例行/定时任务 |
| assetRoutes | `/api/assets` | 资产/文件 |
| accessRoutes | `/api/...` | 访问控制 |
| pluginRoutes | `/api/...` | 插件管理 |
| adapterRoutes | `/api/...` | 适配器查询 |
| authRoutes | `/api/auth` | 认证 |

### 4.4 服务层 (50+)

| 类别 | 服务 |
|------|------|
| 核心业务 | companyService / agentService / projectService / issueService / goalService |
| 调度 | heartbeatService / routineService / cronService |
| 财务 | budgetService / costService / financeService |
| 治理 | approvalService / accessService / boardAuthService |
| 资产 | assetService / documentService / storageService |
| 实时 | liveEventsService (publish/subscribe) |
| 运营 | dashboardService / activityLogService / sidebarBadgeService |

### 4.5 认证机制

- **`local_trusted`** (默认): 无需认证，自动创建 `local-board` 用户，公司自动加入 owner
- **`authenticated`**: better-auth 邮箱/密码 + cookie session
- **WebSocket**: 支持 Bearer Token (agent API key) 与 cookie session

### 4.6 密钥管理

- 多提供者架构 (`SecretProvider`)，默认 `local_encrypted`
- 每个版本存储 `material` + `valueSha256` + `externalRef`
- 支持主密钥文件、严格模式

---

## 五、核心子系统

| 子系统 | 职责 |
|--------|------|
| **Identity & Access** | 两种部署模式、board 用户、agent API key、短期 run JWT、公司成员、邀请、OpenClaw onboarding |
| **Org Chart & Agents** | 角色、职位、汇报关系、权限、预算；适配器: Claude Code / Codex / CLI / HTTP / 外部插件 |
| **Work & Tasks** | issue 携带 company/project/goal/parent，原子签出 + 执行锁、blocker 依赖、评论、文档、产物、标签、收件箱 |
| **Heartbeat Execution** | DB 唤醒队列 + 合并、预算检查、workspace 解析、密钥注入、技能加载、适配器调用、孤儿 run 恢复 |
| **Workspaces & Runtime** | 项目工作区、隔离执行工作区 (git worktree / operator 分支)、dev server / preview URL |
| **Governance & Approvals** | board 审批工作流、执行策略、预算硬停、agent pause/resume/terminate、审计日志 |
| **Budget & Cost Control** | 按公司/agent/project/goal/issue/provider/model 跟踪 token 与成本，超支自动暂停 |
| **Routines & Schedules** | cron / webhook / API 触发，并发与补偿策略，每次执行生成 issue |
| **Plugins** | 实例级插件、out-of-process worker、能力门控宿主服务、job 调度、UI contributions |
| **Secrets & Storage** | 实例与公司密钥、加密本地存储、对象存储、附件、产物 |
| **Activity & Events** | 写操作、心跳状态、cost、审批、评论、产物的持久 activity 流 |
| **Company Portability** | 整个组织 (agents/skills/projects/routines/issues) 导出/导入，含密钥脱敏与冲突处理 |

---

## 六、UI 前端架构

### 6.1 路由结构 (公司前缀)

```
/                              → 重定向到默认公司
/auth                          → 认证页
/board-claim/:token            → Board 认领
/invite/:token                 → 邀请着陆

/:companyPrefix/*              → 公司级路由
  dashboard
  agents/*
  projects/*
  issues/*
  goals/*
  approvals/*
  costs
  activity
  routines/*
  execution-workspaces/*
  org                          → 组织架构图
  company/settings/*
  skills/*
  inbox/*
  u/:userSlug                  → 用户档案
```

### 6.2 状态管理

**Context Providers (10 个):**

| Context | 职责 |
|---------|------|
| CompanyContext | 公司列表、当前公司 |
| ThemeContext | 亮/暗主题 |
| SidebarContext | 侧边栏展开/折叠 |
| PanelContext | 右侧属性面板 |
| DialogContext | 统一对话框管理 |
| LiveUpdatesProvider | WebSocket 实时更新 |
| ToastContext | Toast 通知 |
| BreadcrumbContext | 面包屑 |
| GeneralSettingsContext | 实例级设置 |
| EditorAutocompleteContext | 编辑器自动补全 |

服务端数据完全由 TanStack React Query 管理，`queryKeys.ts` 集中定义层级。

### 6.3 实时通信

`LiveUpdatesProvider` 通过 WebSocket 连接 `/api/companies/{id}/events/ws`:

- 心跳运行状态 → 刷新 Agent / 仪表盘缓存
- Agent 状态变化 → 刷新 Agent 列表
- 活动日志 → 精准刷新查询缓存
- Issue 创建/更新 → Toast 通知
- 重连: 指数退避 1s→16s, 最大 15s
- 智能 Toast 抑制: 当前页面事件不弹, 10 秒窗口同类最多 3 条

### 6.4 布局

```
Layout
├── CompanyRail                 # 左侧公司切换轨道
├── Sidebar
│   ├── SidebarCompanyMenu
│   ├── PluginSlotOutlet        # 插件侧边栏槽位
│   ├── Section "Work"          # Issues/Routines/Goals/Workspaces
│   ├── SidebarProjects
│   ├── SidebarAgents
│   └── Section "Company"       # Org/Skills/Costs/Activity/Settings
├── BreadcrumbBar
├── main#main-content
├── PropertiesPanel             # 右侧属性面板
├── MobileBottomNav
├── CommandPalette              # Cmd+K
└── [全局对话框]
```

### 6.5 API 客户端

基于原生 `fetch`，极简：`/api` 前缀、`credentials: "include"`、自动 JSON、按 20 个领域模块拆分。

---

## 七、CLI

### 7.1 命令 (Commander.js)

| 命令 | 用途 |
|------|------|
| `paperclipai onboard` | 交互式首次设置 |
| `paperclipai run` | onboard + doctor + 启动 server |
| `paperclipai doctor` | 诊断检查 |
| `paperclipai env` | 打印环境变量 |
| `paperclipai configure` | 更新配置段 |
| `paperclipai db:backup` | 数据库备份 |
| `paperclipai allowed-hostname` | 添加允许主机名 |
| `paperclipai heartbeat run` | 运行一次 agent 心跳 |
| `paperclipai auth bootstrap-ceo` | 创建管理员邀请 |
| 客户端子命令 | context/company/issue/agent/approval/activity/dashboard/routine/feedback/worktree/plugin/auth |

### 7.2 `run` 流程

1. 解析实例 ID 与配置路径
2. 无配置 → 触发 onboard 向导
3. 运行 doctor 检查
4. 导入 server 入口
5. 调用 `startServer()`
6. authenticated 模式自动生成 bootstrap CEO 邀请

### 7.3 `heartbeat run` 流程

1. 解析命令上下文 (API base/key)
2. 获取 Agent 信息
3. POST `/api/agents/{id}/wakeup`
4. 轮询心跳事件流，实时打印 stdout/stderr
5. 等待终端状态 (succeeded/failed/cancelled/timed_out)

---

## 八、开发命令

```bash
pnpm dev              # API + UI 看门
pnpm dev:once         # 不看门
pnpm dev:server       # 仅 server
pnpm build            # 全量构建
pnpm typecheck        # 类型检查
pnpm test             # Vitest (默认轻量)
pnpm test:watch       # Vitest watch
pnpm test:e2e         # Playwright
pnpm db:generate      # 生成 Drizzle migration
pnpm db:migrate       # 应用 migration
```

> Requirements: Node.js 20+, pnpm 9.15+

---

## 九、特别之处

| | |
|---|---|
| **原子执行** | 任务签出与预算执行原子化，无重复劳动、无失控开销 |
| **持久 agent 状态** | Agent 跨心跳恢复任务上下文，不从头开始 |
| **运行时技能注入** | Agent 在运行时学习 Paperclip 工作流与项目上下文，无需重训 |
| **可回滚治理** | 审批门强制执行，配置变更带版本，坏改动可安全回滚 |
| **目标感知执行** | 任务携带完整目标祖先链，agent 看到 "why"，不只是标题 |
| **可移植公司模板** | 导出/导入 org/agent/skill，密钥脱敏 + 冲突处理 |
| **多公司隔离** | 所有实体公司域，单部署多公司，数据/审计独立 |

---

## 十、Roadmap (节选)

- ✅ 插件系统 / OpenClaw 雇员 / companies.sh / AGENTS.md / Skills Manager / Routines / Budgeting / Reviews & Approvals / Multi-User
- ⚪ Cloud / Sandbox agents · Artifacts · Memory · Enforced Outcomes · MAXIMIZER MODE · Deep Planning · Work Queues · Self-Organization · Org Learning · CEO Chat · Cloud / Desktop App
