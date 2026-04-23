# Paperclip 代码解读

> 自动生成于 2026-04-23 | 基于 v0.3.1 版本

---

## 一、项目概述

**Paperclip** 是一个开源的 AI Agent 编排平台（控制面板），用于管理由多个 AI Agent 组成的"公司"。它提供组织架构、目标管理、任务调度、预算控制、审批治理等企业级能力，让 AI Agent 团队像真实公司一样运作。

**核心理念：** 如果 OpenClaw 是一个员工，那 Paperclip 就是一家公司。

### 技术栈总览

| 维度 | 技术选型 |
|------|---------|
| **语言** | TypeScript (ES2023, ESM) |
| **运行时** | Node.js >= 20 |
| **包管理** | pnpm 9.15.4 (monorepo) |
| **后端框架** | Express 5.x |
| **数据库** | PostgreSQL (Drizzle ORM) |
| **前端框架** | React 19 + Vite 6 |
| **状态管理** | TanStack React Query + React Context |
| **样式** | Tailwind CSS v4 + CSS 变量主题 |
| **UI 组件** | Radix UI + shadcn/ui 风格 |
| **认证** | better-auth (邮箱/密码) |
| **实时通信** | WebSocket (ws 库) |
| **校验** | Zod |
| **测试** | Vitest + Playwright (E2E) |

---

## 二、Monorepo 结构

```
paperclip/
├── server/                  # Express REST API 服务端
├── ui/                      # React + Vite 前端面板
├── cli/                     # 命令行工具 (paperclipai)
├── packages/
│   ├── db/                  # Drizzle schema, migrations, DB clients
│   ├── shared/              # 共享类型、常量、校验器、API 路径常量
│   ├── adapter-utils/       # 适配器工具类型和函数
│   ├── mcp-server/          # MCP (Model Context Protocol) 服务器
│   └── plugins/
│       └── sdk/             # 插件系统 SDK
├── packages/adapters/       # (外部适配器包，如 Claude/Codex 等)
├── packages/plugins/        # (外部插件包)
├── doc/                     # 产品/设计文档
├── docs/                    # Mintlify 文档站
├── scripts/                 # 构建/发布/工具脚本
├── docker/                  # Docker 配置
├── tests/                   # E2E 测试 (Playwright)
├── evals/                   # Promptfoo 评估
└── releases/                # 版本变更日志
```

### 工作区配置 (pnpm-workspace.yaml)

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

## 三、Server 端架构

### 3.1 启动流程

入口文件 `server/src/index.ts` 的 `startServer()` 函数按以下顺序执行：

```
1. 加载配置 (loadConfig)
2. 初始化遥测 (initTelemetry)
3. 设置密钥环境变量
4. 数据库初始化
   ├── 外部 PostgreSQL: DATABASE_URL → ensureMigrations()
   └── 内嵌 PostgreSQL: embedded-postgres → 动态导入 → 初始化集群
5. 部署模式验证 (local_trusted / authenticated)
6. 认证初始化
   ├── local_trusted: 创建 local-board 用户
   └── authenticated: better-auth 初始化
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
```

### 3.2 中间件链

```
express.json({ limit: "10mb" })   → JSON body 解析
httpLogger (Pino)                 → HTTP 请求日志
privateHostnameGuard              → 私有主机名守卫 (仅 private 暴露模式)
actorMiddleware                   → 解析当前 actor (用户/agent)
boardMutationGuard                → Board 角色写操作限制
[路由处理]
errorHandler                      → 全局错误处理 (最后挂载)
```

### 3.3 路由模块

所有业务路由挂载在 `/api` 前缀下：

| 路由模块 | 路径 | 用途 |
|----------|------|------|
| healthRoutes | `/api/health` | 健康检查 |
| companyRoutes | `/api/companies` | 公司/组织 CRUD |
| agentRoutes | `/api/agents` | AI Agent 管理 |
| projectRoutes | `/api/projects` | 项目管理 |
| issueRoutes | `/api/issues` | Issue/任务管理 |
| goalRoutes | `/api/goals` | 目标管理 |
| approvalRoutes | `/api/approvals` | 审批流程 |
| secretRoutes | `/api/secrets` | 密钥/凭证管理 |
| costRoutes | `/api/costs` | 成本追踪 |
| activityRoutes | `/api/activity` | 活动日志 |
| dashboardRoutes | `/api/dashboard` | 仪表盘数据 |
| routineRoutes | `/api/routines` | 例行任务/定时任务 |
| assetRoutes | `/api/assets` | 资产/文件管理 |
| accessRoutes | `/api/...` | 访问控制 |
| pluginRoutes | `/api/...` | 插件管理 |
| adapterRoutes | `/api/...` | 适配器查询 |
| authRoutes | `/api/auth` | 认证路由 |

### 3.4 服务层 (50+ 服务)

| 类别 | 服务 |
|------|------|
| **核心业务** | companyService, agentService, projectService, issueService, goalService |
| **调度** | heartbeatService, routineService, cronService |
| **财务** | budgetService, costService, financeService |
| **治理** | approvalService, accessService, boardAuthService |
| **资产** | assetService, documentService, storageService |
| **实时** | liveEventsService (publish/subscribe) |
| **运营** | dashboardService, activityLogService, sidebarBadgeService |

### 3.5 认证机制

**两种部署模式：**

- **`local_trusted`** (默认)：无需真实认证，自动创建 `local-board` 用户，所有公司自动加入 owner 会员
- **`authenticated`**：使用 better-auth 进行邮箱/密码认证，支持 cookie-based session

**WebSocket 认证：** 支持 Bearer Token (agent API key) 和 cookie session 两种方式

### 3.6 密钥管理

- 支持多提供者架构 (`SecretProvider` 类型)
- 默认使用 `local_encrypted` (本地加密)
- 每个密钥版本存储 `material` + `valueSha256` + `externalRef`
- 支持主密钥文件、严格模式等配置

---

## 四、UI 前端架构

### 4.1 技术栈

| 维度 | 技术 |
|------|------|
| 框架 | React 19.x |
| 构建 | Vite 6.x |
| 路由 | react-router-dom 7.1+ |
| 数据管理 | TanStack React Query 5.x |
| UI 组件 | Radix UI + shadcn/ui 风格 |
| 图标 | lucide-react |
| Markdown | @mdxeditor/editor + react-markdown |
| 图表 | mermaid |
| 拖拽 | @dnd-kit |
| AI 聊天 | @assistant-ui/react |
| 测试 | Vitest + Storybook |

### 4.2 路由结构

采用**公司前缀路由**模式：

```
/                              → 重定向到默认公司
/auth                          → 认证页
/board-claim/:token            → Board 认领页
/invite/:token                 → 邀请着陆页

/:companyPrefix/*              → 公司级路由
  dashboard                    → 仪表盘
  agents/*                     → Agent 管理
  projects/*                   → 项目管理
  issues/*                     → Issue 管理
  goals/*                      → 目标管理
  approvals/*                  → 审批
  costs                        → 成本
  activity                     → 活动日志
  routines/*                   → 常规任务
  execution-workspaces/*       → 执行工作空间
  org                          → 组织架构图
  company/settings/*           → 公司设置
  skills/*                     → 技能管理
  inbox/*                      → 收件箱
  u/:userSlug                  → 用户档案
```

### 4.3 状态管理

采用 **React Context + TanStack React Query** 混合方案：

**Context Providers (10 个)：**

| Context | 职责 |
|---------|------|
| CompanyContext | 公司列表、当前选中公司 |
| ThemeContext | 亮/暗主题切换 |
| SidebarContext | 侧边栏展开/折叠 |
| PanelContext | 右侧属性面板 |
| DialogContext | 统一管理各类对话框 |
| LiveUpdatesProvider | WebSocket 实时更新 |
| ToastContext | Toast 通知系统 |
| BreadcrumbContext | 面包屑导航 |
| GeneralSettingsContext | 实例级设置 |
| EditorAutocompleteContext | 编辑器自动补全 |

**服务端数据**：完全由 TanStack React Query 管理，通过 `queryKeys.ts` 集中定义 query key 层级。

### 4.4 实时通信

`LiveUpdatesProvider` 通过 WebSocket 连接 `/api/companies/{id}/events/ws`：

- 心跳运行状态 → 刷新 Agent/仪表盘缓存
- Agent 状态变化 → 刷新 Agent 列表
- 活动日志 → 精准刷新相关查询缓存
- Issue 创建/更新 → Toast 通知
- 重连策略：指数退避 (1s→16s, 最大 15s)
- 智能 Toast 抑制：当前页面事件不弹 Toast，10 秒窗口内同类最多 3 条

### 4.5 布局架构

```
Layout
├── CompanyRail                    # 左侧公司切换轨道
├── Sidebar                        # 主侧边栏
│   ├── SidebarCompanyMenu         # 公司选择下拉
│   ├── SidebarNavItem             # 导航项
│   ├── PluginSlotOutlet           # 插件侧边栏槽位
│   ├── SidebarSection "Work"      # Issues/Routines/Goals/Workspaces
│   ├── SidebarProjects            # 项目列表 (可折叠)
│   ├── SidebarAgents              # Agent 列表 (可折叠/排序)
│   └── SidebarSection "Company"   # Org/Skills/Costs/Activity/Settings
├── BreadcrumbBar                  # 面包屑导航
├── main#main-content              # 主内容区
├── PropertiesPanel                # 右侧属性面板
├── MobileBottomNav                # 移动端底部导航
├── CommandPalette                 # 命令面板 (Cmd+K)
└── [全局对话框]
```

### 4.6 API 客户端

基于原生 `fetch` 封装，极简设计：

- 所有请求以 `/api` 为前缀
- 使用 `credentials: "include"` 携带 Cookie
- 自动 JSON 序列化/错误处理
- 按 20 个领域模块拆分 API 函数

---

## 五、CLI 架构

### 5.1 入口

`cli/src/index.ts` 使用 Commander.js 注册所有命令：

| 命令 | 用途 |
|------|------|
| `paperclipai onboard` | 交互式首次设置向导 |
| `paperclipai run` | 一键启动 (onboard + doctor + 启动 server) |
| `paperclipai doctor` | 诊断检查 |
| `paperclipai env` | 打印环境变量 |
| `paperclipai configure` | 更新配置段 |
| `paperclipai db:backup` | 数据库备份 |
| `paperclipai allowed-hostname` | 添加允许的主机名 |
| `paperclipai heartbeat run` | 运行一次 agent 心跳 |
| `paperclipai auth bootstrap-ceo` | 创建管理员邀请链接 |
| 客户端子命令 | context/company/issue/agent/approval/activity/dashboard/routine/feedback/worktree/plugin/auth |

### 5.2 运行流程

`paperclipai run` 的执行路径：

1. 解析实例 ID 和配置路径
2. 若无配置 → 自动触发 onboard 向导
3. 运行 doctor 检查
4. 导入 server 入口 (`server/src/index.ts` 或 `@paperclipai/server`)
5. 调用 `startServer()` 启动服务
6. authenticated 模式下自动生成 bootstrap CEO 邀请

### 5.3 心跳运行

`paperclipai heartbeat run` 的执行路径：

1. 解析命令上下文 (API base/key)
2. 获取 Agent 信息
3. 调用 `/api/agents/{id}/wakeup` 触发心跳
4. 轮询心跳事件流，实时打印 stdout/stderr
5. 等待终端状态 (succeeded/failed/cancelled/timed_out)

---

## 六、Packages 共享包

### 6.1 packages/db — 数据库层

**ORM**: Drizzle ORM + PostgreSQL (postgres 驱动)

**70 张数据表**，覆盖以下领域：

| 领域 | 表 |
|------|-----|
| **认证** | auth_users, auth_sessions, auth_accounts, auth_verifications, board_api_keys, cli_auth_challenges |
| **公司** | companies, company_logos, company_memberships, instance_settings, instance_user_roles |
| **Agent** | agents, agent_api_keys, agent_config_revisions, agent_runtime_state, agent_task_sessions, agent_wakeup_requests |
| **项目** | projects, project_workspaces, execution_workspaces, environments, environment_leases |
| **Issue** | issues, issue_comments, issue_labels, issue_approvals, issue_documents, issue_attachments, issue_work_products, issue_thread_interactions, issue_reference_mentions, issue_relations |
| **目标** | goals, project_goals |
| **调度** | routines, routine_triggers, routine_runs, heartbeat_runs, heartbeat_run_events |
| **财务** | cost_events, finance_events, budget_policies, budget_incidents |
| **审批** | approvals, approval_comments |
| **密钥** | company_secrets, company_secret_versions |
| **活动** | activity_log, feedback_votes, feedback_exports |
| **插件** | plugins, plugin_config, plugin_state, plugin_entities, plugin_jobs, plugin_job_runs, plugin_webhook_deliveries, plugin_logs |
| **技能** | company_skills |
| **侧边栏** | user_sidebar_preferences, company_user_sidebar_preferences, inbox_dismissals |

**数据库模式**：
- 外部 PostgreSQL：通过 `DATABASE_URL` 连接
- 内嵌 PostgreSQL：使用 `embedded-postgres`，零配置开发

### 6.2 packages/shared — 共享类型与常量

这是跨前后端的共享包，包含：

- **~150 个类型定义**：Company, Agent, Issue, Goal, Project, Approval, CostEvent 等
- **~100 个常量枚举**：AGENT_STATUSES, ISSUE_STATUSES, GOAL_LEVELS, BUDGET_METRICS 等
- **~80 个 Zod 校验器**：createAgentSchema, createIssueSchema, upsertBudgetPolicySchema 等
- **API 路径常量**：`API_PREFIX = "/api"` + 30+ 个端点路径
- **工具函数**：issue 引用解析、Mention 解析、routine 变量插值、workspace 命令匹配

### 6.3 packages/adapter-utils — 适配器工具

定义适配器系统的核心类型接口：

| 类型 | 用途 |
|------|------|
| `ServerAdapterModule` | 适配器模块接口 (最核心) |
| `AdapterExecutionContext` | 执行上下文 (agent, runtime, config, onLog) |
| `AdapterExecutionResult` | 执行结果 (exitCode, usage, cost, runtimeServices) |
| `AdapterSessionCodec` | 会话序列化/反序列化 |
| `TranscriptEntry` | 运行日志条目 (thinking/tool_call/tool_result/diff 等) |
| `AdapterSkillSnapshot` | 技能管理快照 |
| `ConfigFieldSchema` | 声明式配置表单 schema |

### 6.4 packages/mcp-server — MCP 服务器

基于 Model Context Protocol 提供 30+ 个工具，让 AI Agent 可以通过标准化协议操作 Paperclip：

| 工具类别 | 工具 |
|----------|------|
| **身份** | paperclipMe, paperclipInboxLite |
| **Agent** | paperclipListAgents, paperclipGetAgent |
| **Issue** | paperclipListIssues, paperclipGetIssue, paperclipCreateIssue, paperclipUpdateIssue, paperclipCheckoutIssue, paperclipReleaseIssue |
| **评论** | paperclipListComments, paperclipGetComment, paperclipAddComment |
| **文档** | paperclipListDocuments, paperclipGetDocument, paperclipUpsertIssueDocument |
| **项目** | paperclipListProjects, paperclipGetProject |
| **目标** | paperclipListGoals, paperclipGetGoal |
| **审批** | paperclipListApprovals, paperclipCreateApproval, paperclipApprovalDecision |
| **交互** | paperclipSuggestTasks, paperclipAskUserQuestions, paperclipRequestConfirmation |
| **工作空间** | paperclipGetIssueWorkspaceRuntime, paperclipControlIssueWorkspaceServices, paperclipWaitForIssueWorkspaceService |
| **通用** | paperclipApiRequest (任意 API 调用) |

### 6.5 packages/plugins/sdk — 插件 SDK

定义了完整的插件系统类型接口，核心是 `PluginContext`：

```
PluginContext
├── manifest                    # 插件清单
├── config                      # 读取配置
├── events                      # 订阅/发布事件
├── jobs                        # 注册定时任务
├── launchers                   # 注册启动器
├── db                          # 插件数据库命名空间
├── http                        # 出站 HTTP 请求
├── secrets                     # 解析密钥引用
├── activity                    # 写活动日志
├── state                       # 读写插件状态 (分域键值存储)
├── entities                    # 插件实体记录 CRUD
├── projects                    # 项目和工作空间元数据
├── companies                   # 公司元数据
├── issues                      # Issue CRUD + 文档 + 关系 + 编排
├── agents                      # Agent 管理 (暂停/恢复/调用/会话)
├── goals                       # 目标 CRUD
├── data                        # 注册 UI 数据处理器
├── actions                     # 注册 UI 动作处理器
├── streams                     # 实时推送到 UI (SSE)
├── tools                       # 注册 Agent 工具
├── metrics                     # 写入指标
├── telemetry                   # 发送遥测
└── logger                      # 结构化日志
```

**插件能力门控**：每个 client 方法都需要对应的 capability 声明。

---

## 七、适配器系统

### 7.1 架构概述

适配器是 Paperclip 的核心扩展机制，用于连接不同的 AI 编码工具。

### 7.2 内置适配器 (10 个)

| 适配器 | type | 说明 |
|--------|------|------|
| claudeLocalAdapter | `claude_local` | Claude CLI 本地适配器 |
| codexLocalAdapter | `codex_local` | Codex CLI 本地适配器 |
| cursorLocalAdapter | `cursor` | Cursor 编辑器适配器 |
| geminiLocalAdapter | `gemini_local` | Gemini CLI 适配器 |
| openclawGatewayAdapter | `openclaw_gateway` | OpenClaw 网关适配器 |
| openCodeLocalAdapter | `opencode_local` | OpenCode 适配器 |
| piLocalAdapter | `pi_local` | Pi CLI 适配器 |
| hermesLocalAdapter | `hermes_local` | Hermes 适配器 |
| processAdapter | (通用) | 进程适配器 |
| httpAdapter | (通用) | HTTP 适配器 |

### 7.3 注册表机制

- `Map<string, ServerAdapterModule>` 存储所有适配器
- **外部适配器覆盖机制**：外部适配器可覆盖内置适配器，原始适配器保存到 `builtinFallbacks`
- **暂停/恢复机制**：`setOverridePaused(type, paused)` 允许回退到内置适配器
- **禁用列表**：`listEnabledServerAdapters()` 过滤被禁用的类型
- **异步加载**：外部适配器通过 `buildExternalAdapters()` 异步加载

### 7.4 UI 适配器

前端也有对应的适配器注册表，用于解析不同 Agent 的 stdout 输出为结构化的 TranscriptEntry：

- 每个适配器提供 `parseStdoutLine` 和 `ConfigFields` 组件
- 支持服务端动态加载 `ui-parser.js` 覆盖内置解析逻辑
- 支持懒加载非内置外部适配器

---

## 八、核心数据流

### 8.1 心跳调度流程

```
定时器触发 (30s 间隔)
  → heartbeatService.tick()
    → 遍历所有活跃 Agent
      → 检查预算、并发限制
        → issueService.checkoutNextIssue() (原子签出)
          → adapter.execute(context)
            → 运行 AI Agent (Claude/Codex/Cursor 等)
              → 通过 onLog 回调写入 heartbeat_run_events
                → WebSocket 推送到前端
                  → React Query 缓存刷新 → UI 更新
```

### 8.2 Issue 生命周期

```
创建 (backlog) → 分配 Agent → 签出 (in_progress) → 执行运行
  → 成功 → 完成 (done)
  → 失败 → 重试或标记 (blocked)
  → 需要审批 → 暂停等待 Board 决策
  → 需要人工输入 → 创建交互 (suggest_tasks/ask_user_questions/request_confirmation)
```

### 8.3 目标对齐链

```
Company Mission (公司使命)
  → Company Goals (公司级目标)
    → Project Goals (项目级目标)
      → Issue (具体任务)
        → 每个 Issue 携带完整的目标祖先链
          → Agent 执行时始终知道 "为什么做这件事"
```

---

## 九、关键设计决策

### 9.1 原子执行
- Issue 签出和预算检查是原子操作
- 防止重复工作和超支

### 9.2 持久化 Agent 状态
- Agent 跨心跳恢复同一任务上下文
- 不会从零开始重启

### 9.3 运行时技能注入
- Agent 可以在运行时学习 Paperclip 工作流和项目上下文
- 无需重新训练

### 9.4 治理与回滚
- 审批门强制执行
- 配置变更版本化
- 错误变更可安全回滚

### 9.5 多公司隔离
- 每个实体都有公司作用域
- 一个部署可以运行多个公司
- 完全数据隔离和独立审计

---

## 十、开发与构建

### 开发启动

```bash
pnpm install
pnpm dev
# API: http://localhost:3100
# UI: http://localhost:3100 (Vite 中间件模式)
```

### 常用命令

```bash
pnpm build              # 构建所有包
pnpm typecheck          # TypeScript 类型检查
pnpm test:run           # 运行 Vitest 测试
pnpm test:e2e           # Playwright E2E 测试
pnpm db:generate        # 生成数据库迁移
pnpm db:migrate         # 执行数据库迁移
pnpm check:tokens       # 检查是否有泄露的 token
```

### 数据库变更流程

1. 编辑 `packages/db/src/schema/*.ts`
2. 确保新表从 `packages/db/src/schema/index.ts` 导出
3. `pnpm db:generate` 生成迁移
4. `pnpm -r typecheck` 验证编译

---

## 十一、项目约定

1. **公司作用域**：所有领域实体必须限定在公司范围内
2. **契约同步**：修改 schema/API 时，必须同步更新 db → shared → server → ui 四层
3. **控制面板不变量**：单指派任务模型、原子签出、审批门、预算硬停、活动日志
4. **API 规范**：基路径 `/api`，统一 HTTP 错误码 (400/401/403/404/409/422/500)
5. **UI 规范**：路由和导航与 API 表面对齐，使用公司选择上下文，明确展示失败
