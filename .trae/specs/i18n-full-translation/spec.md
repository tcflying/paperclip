# 完成 Paperclip UI 全部中文化翻译

## Why
Paperclip UI 存在大量未翻译的英文字符串，需要完成全站点的中文本地化，提升中文用户的使用体验。

## What Changes
- 完成所有页面组件的中文翻译
- 确保翻译文件 (zh.json) 包含所有必要的翻译键
- 页面使用 `t()` 函数调用翻译

## Impact
- 受影响规格: UI 本地化
- 受影响代码:
  - `ui/src/pages/*.tsx` (所有页面组件)
  - `ui/src/locales/zh.json` (翻译文件)
  - `ui/src/locales/index.ts` (翻译导出)

## ADDED Requirements

### Requirement: 页面翻译完整性
所有页面组件必须使用 `t()` 函数翻译所有用户可见的英文字符串。

#### Scenario: Costs 页面翻译
- **GIVEN** 用户访问费用页面
- **WHEN** 页面加载
- **THEN** 所有文本显示中文

#### Scenario: CompanySettings 页面翻译
- **GIVEN** 用户访问公司设置页面
- **WHEN** 页面加载
- **THEN** 所有文本显示中文

#### Scenario: 其他页面翻译
- **GIVEN** 用户访问任何页面
- **WHEN** 页面加载
- **THEN** 所有文本显示中文，无遗漏

## 需翻译的页面列表
1. Costs.tsx - 费用页面 (已完成)
2. CompanySettings.tsx - 公司设置页面
3. CompanyInvites.tsx - 公司邀请页面
4. CompanyAccess.tsx - 公司访问权限页面
5. InstanceExperimentalSettings.tsx - 实验性设置页面
6. Activity.tsx - 活动页面
7. Approvals.tsx - 审批页面
8. ProjectDetail.tsx - 项目详情页面
9. Auth.tsx - 认证页面 (大部分已完成)
10. 其他组件 (Errors, Toast, Modal 等)
