# 多语言支持规格说明

## 目标
- 支持中文（zh）和英文（en）界面
- UI 界面和 Agent 提示词全部支持多语言
- **不使用数据库存储**，使用文件系统

## 架构设计

### 1. UI 多语言

#### 目录结构
```
ui/src/locales/
  index.ts          # i18n 核心逻辑
  zh.json          # 中文翻译
  en.json          # 英文翻译
  fallback.json    # 默认英文
```

#### i18n 核心 (index.ts)
```typescript
export function t(key: string, params?: Record<string, string | number>): string
export function setLocale(locale: 'zh' | 'en'): void
export function getLocale(): string
```

#### 使用方式
```tsx
import { t } from './locales';

<Button>{t('common.submit')}</Button>
<Button>{t('common.submit', { name: '张三' })}</Button>
```

### 2. Agent 提示词多语言

#### 目录结构
```
skills/paperclip/
  AGENTS.md           # 默认英文
  AGENTS.zh.md        # 中文版
  HEARTBEAT.md        # 默认英文
  HEARTBEAT.zh.md     # 中文版
```

#### 加载逻辑
1. 检测用户语言偏好（localStorage）
2. 优先加载对应语言的 prompt 文件（`*.zh.md`）
3. 如果不存在，回退到默认（`*.md`）

### 3. 语言检测优先级
1. 用户手动设置（localStorage）
2. 浏览器语言（navigator.language）
3. 默认中文

### 4. 翻译文件格式

#### ui/src/locales/zh.json
```json
{
  "common": {
    "submit": "提交",
    "cancel": "取消",
    "save": "保存"
  },
  "nav": {
    "dashboard": "仪表盘",
    "issues": "任务"
  },
  "agent": {
    "running": "运行中",
    "idle": "空闲"
  }
}
```

#### Agent prompt 文件 (AGENTS.zh.md)
```markdown
# 角色
你是一个智能助手。

# 指令
请用中文回复用户的问题。
```

## 实现步骤

### Phase 1: UI i18n 基础
1. 创建 `ui/src/locales/` 目录
2. 实现 i18n 核心函数
3. 翻译 UI 常用字符串

### Phase 2: Agent prompt 多语言
1. 创建中文版 prompt 文件
2. 实现 prompt 加载逻辑

### Phase 3: 语言切换 UI
1. 在设置页面添加语言切换
2. 存储偏好到 localStorage

## 不使用数据库的原因
- 简化部署
- 翻译文件可版本控制
- 便于社区贡献翻译
