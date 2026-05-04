# TECH_SPEC: 0Worker AI 内容编排引擎架构设计

## 1. 架构原则 (Architectural Principles)
为了实现“多客户、多场景、高扩展”的目标，技术架构必须遵循 **“核心原子化、逻辑编排化”**。

## 2. 数据模型 (Data Model)
为了减少硬编码，所有的插件定义和工作流逻辑都应通过数据库管理。

### 2.1 核心数据表

#### `ai_plugins` (插件元数据)
存储各业务模块（如：猫小仙）的全局定义。
- `code`: 插件标识（如 `maoxiaoxian`）。
- `name`: 显示名称。
- `description`: 描述信息。
- `configJson`: 存放该插件的菜单配置、UI 布局逻辑等。

#### `ai_workflows` (工作流 DSL)
存储具体的执行序列。
- `pluginCode`: 所属插件。
- `code`: 工作流标识。
- `name`: 工作流名称。
- `definitionJson`: **核心 DSL 逻辑**，定义了节点序列、输入输出映射。

#### `ai_workflow_runs` (执行链路 Trace)
用于实现“全链路可观测”与“断点续传”。
- `runId`: 实例唯一标识。
- `workflowCode`: 对应的工作流。
- `status`: `running`, `paused`, `failed`, `completed`。
- `contextSnapshot`: 序列化后的当前执行上下文（Context），用于崩溃恢复。
- `logs`: 记录每一步的 Token、耗时与错误信息。

#### `accounts` 表增强 (Agent 实例配置)
- `activePluginCode`: 该账号当前激活的插件。
- `aiConfigJson`: 账号级覆盖参数。
    - `scheduleCron`: 定时生成配置（如 `0 8 * * *` 表示每天早上 8 点自动跑）。
    - `autoApprove`: 布尔值，是否跳过人工审核直接进入发布调度池。
    - `defaultScheduleInterval`: 自动分发时的排队间隔。

## 3. 核心组件 (Core Components)

### 2.1 Workflow Engine (工作流引擎)
负责管理执行流水线的生命周期。
- **Context Manager**：维护执行过程中的状态快照。
- **自我纠偏 (Self-Correction)**：当 AI 输出格式错误或不符合预期时，引擎自动发起修正请求。
- **智能降级与容灾 (Fallback Routing)**：允许为 Node 配置备选策略（如 `qwen-max` 失败切换至 `deepseek`）。
- **拟人化调度 (Human-like Scheduling)**：`smart` 模式下自动分散发布时间，避免账号被风控。
- **语义缓存 (Semantic Cache)**：对相似主题的请求进行结果复用，降低重复成本。
- **模型分级调度 (Model Tiering)**：按节点复杂度自动匹配模型（如：数据处理用 Plus，内容生成用 Max）。
- **Token 严格管控**：全局 `max_tokens` 拦截器。
- **可视化配置与校验**：通过 `settingsSchema` 驱动前端配置界面，并在引擎入口执行强校验 (AJV/Zod)，防止脏数据污染管线。

### 2.2 Capability Registry (能力注册表)
所有的外部能力（Tools）必须符合统一的接口契约。
```typescript
interface ITool<I, O> {
  metadata: {
    id: string;
    version: string;
    description: string;
  };
  execute(params: I, context: WorkflowContext): Promise<O>;
}

type WorkflowNode = 
  | { type: 'llm'; prompt: string; inputKey: string; outputKey: string; retryOnFailure?: boolean; fallbackModel?: string }
  | { type: 'search'; query: string; outputKey: string }
  | { type: 'image_search'; count: number; outputKey: string }
  | { type: 'image_gen'; prompt: string; model: string; outputKey: string } // AI 生图
  | { type: 'asset_manager'; sourceKeys: string[]; action: 'download' | 'compress' } // 媒体资源管线
  | { type: 'safety_check'; contentKey: string; action: 'block' | 'flag' } // 安全审计
  | { type: 'persist'; dataKey: string; table: string; checkExists?: boolean } // 持久化/全局缓存节点
  | { type: 'batch_loop'; sourceKey: string; subPipeline: WorkflowNode[] }
  | { type: 'distribute'; contentKey: string; mediaKey?: string; strategy: 'manual' | 'auto' | 'smart' };
```

### 2.3 Workflow DSL (定义规范)
工作流由 JSON 描述，支持复杂的串并联逻辑。
```json
{
  "workflowId": "maoxiaoxian-daily-topics",
  "trigger": "manual",
  "frequency": "1/day",
  "steps": [
    {
      "id": "step1_fetch_hot",
      "tool": "tophub-fetcher",
      "params": { "refresh": "{{input.refresh}}" }
    },
    {
      "id": "step2_extract_persona",
      "tool": "llm-processor",
      "dependsOn": ["step1_fetch_hot"],
      "params": { "prompt": "Extract names from {{step1_fetch_hot.data}}" }
    }
  ]
}
```

## 3. 插件系统架构 (Plugin System)

### 3.1 目录结构 (Directory Hierarchy)
为了确保“一客户一目录”的隔离性，代码组织如下：

```text
src/
├── main/
│   ├── core/                  # 平台核心逻辑
│   │   ├── workflow/          # 编排引擎 (Runner, Context)
│   │   └── registry/          # 插件加载器与能力注册中心
│   └── plugins/               # 客户插件根目录
│       ├── maoxiaoxian/       # 猫小仙专属包
│       │   ├── workflows/     # 工作流定义 (Daily Inspiration, etc.)
│       │   ├── prompts/       # 业务提示词库
│       │   ├── lib/           # 业务私有逻辑 (如：命理排盘算法)
│       │   └── config.json    # 插件元数据与菜单配置
│       └── client-b/          # 其他客户包
│           └── ...
└── renderer/
    ├── components/workflow/   # 通用动态渲染组件
    └── plugins/               # (可选) 客户端私有 UI 组件/配置
```

### 3.2 插件加载与同步逻辑
- **文件 -> 数据库同步**：核心引擎在启动时扫描 `src/main/plugins` 目录下的 `config.json` 和 `workflows/*.json`，并将其自动同步（Upsert）到 `ai_plugins` 和 `ai_workflows` 表中。
- **运行时加载**：引擎在执行任务时，直接从数据库读取最新的 `definitionJson`。
- **独立维护**：对 Maoxiaoxian 的任何逻辑修改都通过修改其目录下的 JSON 文件实现，系统自动完成持久化，无需手动写 SQL。

## 4. UI 协议与渲染 (UI Protocol)

### 4.1 动态菜单渲染
Renderer 进程启动时拉取当前账号绑定的 `clientId` 及其对应的菜单配置。

### 4.2 模块化工作台 (Atomic UI)
Renderer 提供一组原子化组件，通过配置协议驱动布局：
- `WidgetRenderer`：负责根据配置渲染卡片、表单或结果编辑器。
- `EventBridge`：负责 UI 事件与 IPC 指令的映射。

## 4. 关键 IPC 接口 (IPC API)

### 4.1 `ai:listPlugins` & `ai:listWorkflows`
返回注册的插件与工作流。

### 4.2 `ai:previewWorkflow` (测试预览态)
单次手动执行工作流，强制输出结果到前端而不写入调度池。用于前期配置调优。

### 4.3 `ai:startAgentSchedule` (定时生产态)
激活账号的定时任务（Cron），使其在后台按计划自动抓取和生成。

### 4.3 `ai:interactiveRewrite` (交互式调优)
在前端审核器高亮一段文本后调用。
**参数**：`contentId`, `selectedText`, `instruction`
**逻辑**：LLM 仅针对 `selectedText` 按 `instruction` 改写，并拼接回原文返回。

### 4.4 `ai:retryNode`
针对执行失败的步骤进行重试。
**参数**：`runId`, `nodeId`

### 4.5 `ai:localOverride`
手动修改已完成节点产生的上下文数据。
**参数**：`runId`, `nodeId`, `newData`

### 4.6 `ai:getRunTrace` (可观测性查询)
查询某个 `runId` 的执行链路与耗时日志。

## 5. 开发路线图 (Phase-based Roadmap)

### Phase 1: 引擎地基 (Foundation)
- 建立 `WorkflowRunner` 基础框架。
- 实现 `LLMTool` 和 `HttpTool`。
- 修改数据库以支持 `clientId` 和 `aiConfigJson`。

### Phase 2: Maoxiaoxian 标杆实现 (Reference Implementation)
- 实现命理排盘节点 (`BaziTool`)。
- 实现热点同步节点 (`TophubTool`)。
- 完成 Maoxiaoxian 首页工作台的配置驱动渲染。

### Phase 3: 批量与异步 (Advanced)
- 实现 `BatchNode` 循环逻辑。
- 实现后端长任务的进度通知机制 (IPC Notification)。

## 6. 异常与监控 (Observability)
- **Execution Log**：记录每一步任务流的输入输出，便于调试。
- **Usage Quota**：在引擎层统一拦截余额不足、Token 超限等异常。
