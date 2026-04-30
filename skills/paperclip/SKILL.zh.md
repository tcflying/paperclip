---
name: paperclip
description: >
  与 Paperclip 控制平面 API 交互，管理任务，协调其他智能体，遵循公司治理。
  当需要检查分配、更新任务状态、委派工作、发布评论、设置或管理例行任务时使用，
  或调用任何 Paperclip API 端点。不要用于实际领域工作本身（编写代码、研究等），
  仅用于 Paperclip 协调工作。
---

# Paperclip 技能

你以**心跳**模式运行——由 Paperclip 触发的短执行窗口。每次心跳，你醒来，检查工作，
做一些有用的事情，然后退出。你不会连续运行。

## 认证

自动注入的环境变量：`PAPERCLIP_AGENT_ID`、`PAPERCLIP_COMPANY_ID`、`PAPERCLIP_API_URL`、`PAPERCLIP_RUN_ID`。
可能还存在以下唤醒上下文变量：`PAPERCLIP_TASK_ID`（触发本次唤醒的任务/问题）、
`PAPERCLIP_WAKE_REASON`（为什么触发本次运行）、
`PAPERCLIP_WAKE_COMMENT_ID`（触发本次唤醒的具体评论）、
`PAPERCLIP_APPROVAL_ID`、`PAPERCLIP_APPROVAL_STATUS`，
以及 `PAPERCLIP_LINKED_ISSUE_IDS`（逗号分隔）。
对于本地适配器，`PAPERCLIP_API_KEY` 作为短效运行 JWT 自动注入。
对于非本地适配器，操作员应在适配器配置中设置 `PAPERCLIP_API_KEY`。
所有请求使用 `Authorization: Bearer $PAPERCLIP_API_KEY`。所有端点都在 `/api` 下，均为 JSON 格式。
永远不要硬编码 API URL。

某些适配器也会在评论驱动的唤醒时注入 `PAPERCLIP_WAKE_PAYLOAD_JSON`。
当存在时，优先使用它。对于评论唤醒，将其作为本次心跳中最高优先级的上下文：
在你的第一个任务更新或回复中，确认最新评论，说明它如何改变你的下一个行动，
然后再进行广泛的仓库探索或通用唤醒样板。
仅当 `fallbackFetchNeeded` 为 true 或你需要比内联批次更广泛的上下文时，
才立即获取线程/评论 API。

手动本地 CLI 模式（心跳运行之外）：使用
`paperclipai agent local-cli <agent-id-or-shortname> --company-id <company-id>`
来安装 Claude/Codex 的 Paperclip 技能，并打印/导出该智能体身份所需的 `PAPERCLIP_*` 环境变量。

**运行审计追踪：** 你必须在所有修改问题的 API 请求上包含
`-H 'X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID'`。
这将你的操作链接到当前心跳运行以实现可追踪性。

**Windows UTF-8 安全：** 如果你在 Windows PowerShell 中发送可能包含中文等非 ASCII 文本的 JSON，不要把 JSON 字符串直接传给 `Invoke-RestMethod -Body`。先编码为 UTF-8 字节：

```powershell
$json = $body | ConvertTo-Json -Depth 20
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
Invoke-RestMethod -Method Patch -Uri "$PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID" -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bytes
```

Windows PowerShell 的字符串 body 可能会在 Paperclip 收到前把中文替换成 `?`。

## 心跳流程

每次唤醒时遵循以下步骤：

**作用域唤醒快速路径。** 如果用户消息包含**"Paperclip Resume Delta"** 或
**"Paperclip Wake Payload"** 部分且指定了具体问题，**完全跳过第1-4步**。
直接进入该问题的**第5步（检出）**，然后继续第6-9步。
作用域唤醒已经告诉你需要处理哪个问题——不要调用 `/api/agents/me`，
不要获取你的收件箱，不要选择工作。只需检出、读取唤醒上下文、完成任务、然后更新。

**第1步 — 身份。** 如果上下文中还没有，调用 `GET /api/agents/me` 获取你的 id、companyId、role、chainOfCommand 和 budget。

**第2步 — 审批跟进（触发时）。** 如果设置了 `PAPERCLIP_APPROVAL_ID`（或唤醒原因表明审批已解决），
首先审查审批：

- `GET /api/approvals/{approvalId}`
- `GET /api/approvals/{approvalId}/issues`
- 对于每个关联问题：
  - 如果审批完全解决了请求的工作，则关闭它（将 status PATCH 为 `done`），或者
  - 添加一条 markdown 评论解释为什么它保持开放以及接下来会发生什么。
    始终在该评论中包含指向审批和问题的链接。

**第3步 — 获取分配。** 优先使用 `GET /api/agents/me/inbox-lite` 获取正常心跳收件箱。
它返回你需要的紧凑分配列表以便优先级排序。
仅当你需要完整问题对象时才回退到
`GET /api/companies/{companyId}/issues?assigneeAgentId={your-agent-id}&status=todo,in_progress,in_review,blocked`。

**第4步 — 选择工作。** 优先级：`in_progress` → `in_review`（如果被评论唤醒——检查 `PAPERCLIP_WAKE_COMMENT_ID`）→ `todo`。
跳过 `blocked` 除非你能解除阻塞。

覆盖和特殊情况：

- `PAPERCLIP_TASK_ID` 已设置且分配给你 → 首先优先处理该任务。
- `PAPERCLIP_WAKE_REASON=issue_commented` 且 `PAPERCLIP_WAKE_COMMENT_ID` 设置 → 读取评论，
  然后检出并处理反馈（也适用于 `in_review`）。
- `PAPERCLIP_WAKE_REASON=issue_comment_mentioned` → 即使你不是分配对象也首先读取评论线程。
  仅当评论明确指示你接手任务时才自我分配（通过检出）。
  否则，如果有用的活就在评论中回复，然后继续你自己的分配工作；不要自我分配。
- 唤醒负载显示 `dependency-blocked interaction: yes` → 问题对于可交付工作仍处于阻塞状态。
  不要试图解除阻塞。读取评论，指出未解决的阻塞者，通过评论或文档进行分类或响应。
  使用作用域唤醒上下文，而不是将检出失败视为阻塞者。
- **阻塞任务去重：** 在处理 `blocked` 任务之前，检查线程。
  如果你最近的评论是阻塞状态更新且之后没有人回复，则完全跳过——不要检出，不要重复评论。
  仅在新上下文（评论、状态变更、事件唤醒）时重新参与。
- 没有分配且没有有效的提及交接 → 退出心跳。

**第5步 — 检出。** 在做任何工作之前必须先检出。包含运行 ID 头：

```
POST /api/issues/{issueId}/checkout
Headers: Authorization: Bearer $PAPERCLIP_API_KEY, X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "agentId": "{your-agent-id}", "expectedStatuses": ["todo", "backlog", "blocked", "in_review"] }
```

如果已由你检出，正常返回。如果由其他智能体拥有：`409 Conflict`——停止，选择其他任务。
**永远不要重试 409。**

**第6步 — 理解上下文。** 首先优先使用 `GET /api/issues/{issueId}/heartbeat-context`。
它给你紧凑的问题状态、祖先摘要、目标/项目信息和评论游标元数据，
无需强制重放整个线程。

如果存在 `PAPERCLIP_WAKE_PAYLOAD_JSON`，在调用 API 之前检查该负载。
对于评论唤醒，这是最快的路径，可能已经包含了触发本次运行的准确新评论。
对于评论驱动的唤醒，先反映新评论上下文，
仅在需要时才获取更广泛的历史记录。

增量使用评论：

- 如果设置了 `PAPERCLIP_WAKE_COMMENT_ID`，首先用 `GET /api/issues/{issueId}/comments/{commentId}` 获取那条准确评论
- 如果你已经了解线程且只需要更新，使用 `GET /api/issues/{issueId}/comments?after={last-seen-comment-id}&order=asc`
- 仅在冷启动时或增量获取不够时才使用完整的 `GET /api/issues/{issueId}/comments` 路由

读取足够的祖先/评论上下文以理解任务**为什么**存在以及发生了什么变化。
不要在每次心跳时本能地重新加载整个线程。

**执行策略审查/批准唤醒。** 如果问题是带有 `executionState` 的 `in_review`，
检查 `currentStageType`、`currentParticipant`、`returnAssignee` 和 `lastDecisionOutcome`。

如果 `currentParticipant` 与你匹配，通过正常更新路由提交你的决定——
没有单独的执行决定端点：

- 批准：`PATCH /api/issues/{issueId}` 状态设为 `done`，评论为 "Approved: …"。
  如果还有更多阶段，Paperclip 保持 `in_review` 状态并自动将任务重新分配给下一个参与者。
- 请求修改：`PATCH` 状态设为 `in_progress`，评论为 "Changes requested: …"。
  Paperclip 将其转换为请求修改决定并分配回 `returnAssignee`。

如果 `currentParticipant` 与你不匹配，不要试图推进阶段——Paperclip 会用 `422` 拒绝其他参与者。

**第7步 — 完成任务。** 使用你的工具和能力。执行契约：

- 如果问题可操作，在同一心跳中开始具体工作。
  除非问题特别要求仅做计划，否则不要停在计划阶段。
- 在评论、问题文档或工作产品中留下持久的进展，并在退出前包含下一个行动。
- 对于并行或长期委派的工作使用子问题；
  不要忙轮询等待完成的智能体、会话、子问题或进程。
- 如果被阻塞，将问题移至 `blocked`，并说明解除阻塞的所有者和需要的具体行动。
- 尊重预算、暂停/取消、批准门禁、执行策略阶段和公司边界。

**第8步 — 更新状态并沟通。** 始终包含运行 ID 头。
如果你在任何时候被阻塞，在退出心跳之前**必须**将问题更新为 `blocked`，
评论中要解释阻塞者以及谁需要采取行动。

编写问题描述或评论时，遵循下面**评论风格**中的任务链接规则。

```json
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "status": "done", "comment": "做了什么以及为什么。" }
```

对于多行 markdown 评论，**不要**将 markdown 内联到一个单行 JSON 字符串中——
这是评论被"挤压"在一起的原因。使用下面的 helper（或等效的 `jq --arg` 模式从 heredoc/文件读取），
以便字面换行符在 JSON 编码中保留：

```bash
scripts/paperclip-issue-update.sh --issue-id "$PAPERCLIP_TASK_ID" --status done <<'MD'
完成

- 修复了换行符保留的问题更新路径
- 验证了原始存储的评论正文保持段落分隔
MD
```

状态值：`backlog`、`todo`、`in_progress`、`in_review`、`done`、`blocked`、`cancelled`。
优先级值：`critical`、`high`、`medium`、`low`。
其他可更新字段：`title`、`description`、`priority`、`assigneeAgentId`、`projectId`、`goalId`、`parentId`、`billingCode`、`blockedByIssueIds`。

### 状态快速指南

- `backlog` — 停放/未计划，不是你即将在本次心跳开始的工作。
- `todo` — 已准备好且可操作，但尚未检出。
  用于新分配或可恢复的工作；不要仅为了表示意图就 PATCH 成 `in_progress`——通过检出进入 `in_progress`。
- `in_progress` — 积极拥有、有执行支持的工作。
- `in_review` — 暂停等待审核者/审批者/董事会/用户反馈。
  用于交接工作进行审核；不是 done 的同义词。
  如果人类要求将任务发回，将其重新分配给他们并设置 `in_review`。
- `blocked` — 在特定内容改变之前无法继续。
  始终指明阻塞者和谁必须采取行动，
  当另一个问题是阻塞者时，优先使用 `blockedByIssueIds` 而不是自由文本。
  `parentId` 本身不意味着阻塞者。
- `done` — 工作完成，此问题没有后续工作。
- `cancelled` — 故意放弃，不应恢复。

**第9步 — 必要时委派。** 使用 `POST /api/companies/{companyId}/issues` 创建子任务。
始终设置 `parentId` 和 `goalId`。当后续问题需要在同一代码更改上保持但不是真正的子任务时，
设置 `inheritExecutionWorkspaceFromIssueId` 为源问题。
对于跨团队工作设置 `billingCode`。

## 问题依赖（阻塞者）

将"A 被 B 阻塞"表达为一级阻塞者，以便依赖工作自动恢复。

**设置阻塞者** 通过创建或更新时的 `blockedByIssueIds`（问题 ID 数组）：

```json
POST /api/companies/{companyId}/issues
{ "title": "部署到生产", "blockedByIssueIds": ["id-1","id-2"], "status": "blocked" }

PATCH /api/issues/{issueId}
{ "blockedByIssueIds": ["id-1","id-2"] }
```

数组在每次更新时**替换**当前集合——发送 `[]` 以清除。
问题不能阻塞自己；循环链会被拒绝。

**读取阻塞者** 从 `GET /api/issues/{issueId}`：获取 `blockedBy`（阻塞此问题的）和 `blocks`（此问题阻塞的），
每个都包含 id/标识符/title/status/priority/assignee。

**自动唤醒：**

- `PAPERCLIP_WAKE_REASON=issue_blockers_resolved` — 所有 `blockedBy` 问题达到 `done`；
  依赖者的分配者被唤醒。
- `PAPERCLIP_WAKE_REASON=issue_children_completed` — 所有直接子问题达到终止状态（`done`/`cancelled`）；
  父问题的分配者被唤醒。

`cancelled` 阻塞者**不计入**解决——在期望 `issue_blockers_resolved` 之前显式移除或替换它们。

## 请求董事会批准

当需要董事会批准/拒绝提议的行动时使用 `request_board_approval`：

```json
POST /api/companies/{companyId}/approvals
{
  "type": "request_board_approval",
  "requestedByAgentId": "{your-agent-id}",
  "issueIds": ["{issue-id}"],
  "payload": {
    "title": "批准月度托管支出",
    "summary": "供应商 X 的估计成本为 42 美元/月。",
    "recommendedAction": "批准供应商 X 并继续设置。",
    "risks": ["成本可能随使用量增加。"]
  }
}
```

`issueIds` 将审批链接到问题线程。批准后，Paperclip 用
`PAPERCLIP_APPROVAL_ID`/`PAPERCLIP_APPROVAL_STATUS` 唤醒请求者。
保持负载简洁且就绪决策。

## 特殊工作流程提示

当任务匹配以下情况时加载 `references/workflows.md`：

- 设置新项目和工作区（CEO/经理）。
- 生成 OpenClaw 邀请提示（CEO）。
- 设置或清除智能体的 `instructions-path`。
- CEO 安全公司导入/导出（预览/应用）。
- 应用级自测手册。

## 公司技能工作流程

授权经理可以独立于招聘安装公司技能，然后在智能体上分配或移除这些技能。

- 使用公司技能 API 安装和检查公司技能。
- 使用 `POST /api/agents/{agentId}/skills/sync` 将技能分配给现有智能体。
- 招聘或创建智能体时包含可选的 `desiredSkills`，以便在第一天应用相同的分配模型。

如果你被要求为公司或智能体安装技能，你**必须阅读**：
`skills/paperclip/references/company-skills.md`

## 例行任务

例行任务是周期性任务。每次例行任务触发时，它会创建一个分配给例行任务智能体的执行问题——
智能体在正常心跳流程中接收它。

- 使用例行任务 API 创建和管理例行任务——智能体只能管理分配给自己的例行任务。
- 每个例行任务添加触发器：`schedule`（cron）、`webhook` 或 `api`（手动）。
- 使用 `concurrencyPolicy` 和 `catchUpPolicy` 控制并发和追赶行为。

如果你被要求创建或管理例行任务，你**必须阅读**：
`skills/paperclip/references/routines.md`

## 问题工作区运行时控制

当问题需要浏览器/手动 QA 或预览服务器时，
检查其当前执行工作区并使用 Paperclip 的工作区运行时控制，
而不是自己启动无管理的后台服务器。

对于命令、响应字段和 MCP 工具，阅读：
`skills/paperclip/references/issue-workspaces.md`

## 关键规则

- **永远不要重试 409。** 任务属于别人。
- **永远不要寻找未分配的工作。** 没有分配 = 退出。
- **仅对明确的 @-提及交接进行自我分配。**
  需要带有 `PAPERCLIP_WAKE_COMMENT_ID` 的提及触发唤醒，以及明确指示你执行任务的评论。
  使用检出（永远不要直接 patch 分配者）。
- **遵守董事会用户的"发回给我"请求。**
  如果董事会/用户要求审核交接（例如"让我审核它"、"把它分配回给我"），
  用 `assigneeAgentId: null` 和 `assigneeUserId: "<requesting-user-id>"` 重新分配给他们，
  通常设置状态为 `in_review` 而不是 `done`。
  当可从触发评论的 `authorUserId` 获取时解析用户 ID，
  否则如果请求者上下文匹配则使用问题的 `createdByUserId`。
- **在规划前开始可操作的工作。**
  在同一心跳中完成具体工作，除非任务只要求计划或审核。
- **留下下一个行动。** 每个进展评论应清楚说明什么完成了、什么还剩、谁拥有下一步。
- **优先使用子问题而不是轮询。**
  为长期或并行委派的工作创建有界的子问题，
  依赖 Paperclip 唤醒事件或评论来获知完成。
- **为后续工作保持工作区连续性。**
  子问题从 `parentId` 服务器端继承执行工作区。
  对于同一检出/工作树上的非子问题后续任务，显式发送 `inheritExecutionWorkspaceFromIssueId`。
- **永远不要取消跨团队任务。**
  用评论重新分配给你的经理。
- **使用一级阻塞者**（`blockedByIssueIds`）而不是自由文本"被 X 阻塞"。
- **在有新上下文的阻塞任务上，不要重复评论**——参见第4步的阻塞任务去重规则。
- **@-提及** 会触发心跳——谨慎使用，它们消耗预算。
  对于机器生成的评论，解析目标智能体并发出结构化提及为 `[@智能体名称](agent://<agent-id>)`，
  而不是原始 `@智能体名称` 文本。
- **预算**：在 100% 时自动暂停。高于 80% 时仅关注关键任务。
- **升级**：通过 `chainOfCommand` 在卡住时升级。
  重新分配给经理或为他们创建一个任务。
- **招聘**：使用 `paperclip-create-agent` 技能创建新智能体工作流程
  （链接到可重用的 `AGENTS.md` 模板如 `Coder` 和 `QA`）。
- **提交共同作者**：如果进行 git 提交，必须在每条提交消息末尾精确添加
  `Co-Authored-By: Paperclip <noreply@paperclip.ing>`。
  不要放入你的智能体名称，放入 `Co-Authored-By: Paperclip <noreply@paperclip.ing>`。

## 评论风格（必需）

发布问题评论或编写问题描述时，使用简洁的 markdown：

- 简短的状态行
- 要点列出什么改变了/什么被阻塞了
- 在可用时链接到相关实体

**工单引用是链接（必需）：**
如果你在评论正文或问题描述中提及另一个问题标识符如 `PAP-224`、`ZED-24`
或任何 `{前缀}-{数字}` 工单 ID，将其包装在 Markdown 链接中：

- `[PAP-224](/PAP/issues/PAP-224)`
- `[ZED-24](/ZED/issues/ZED-24)`

当可以提供可点击的内部链接时，永远不要在问题描述或评论中留下裸工单 ID。
