# PRD: 0Worker AI 内容编排引擎 (AI Content Orchestrator)

## 1. 背景与愿景 (Background & Vision)
0Worker 旨在成为一个面向多行业、多场景的内容生产工作站。随着业务扩展，不同客户（如 Maoxiaoxian）对内容生成的逻辑、数据源和交互流程提出了高度差异化的需求。

**核心愿景**：构建一个“能力驱动、流程可定义”的 AI 生产平台，通过标准化的插件架构，支持快速接入任意垂直领域的生成需求，实现从“内容工具”向“内容操作系统”的跨越。

## 2. 核心设计原则 (Design Principles)
- **能力解耦 (Decoupling)**：将基础能力（AI、搜索、排盘、爬虫）原子化，作为可调用的底层工具。
- **流程编排 (Orchestration)**：通过 DSL (Domain Specific Language) 定义任务流，而非硬编码业务逻辑。
- **千人千面 (Dynamic UI)**：UI 界面基于配置协议动态渲染，实现账号级别的菜单与页面定制化。
- **高扩展性 (Scalability)**：支持第三方开发者/高级用户通过定义新的 Workflow 接入新业务。

## 3. 业务架构 (Business Architecture)

### 3.1 Agent 生命周期 (Agent Lifecycle)
本平台将每一套业务逻辑封装为一个 Agent（即绑定了特定工作流的执行实体），其标准生命周期如下：
1. **配置态 (Configure)**：选择基础 Workflow，填写提示词、参数、目标受众等。
2. **测试预览态 (Preview Run)**：单次手动运行，即时查看生成结果并调优提示词。
3. **定时生产态 (Scheduled Automation)**：预览满意后，配置定时器（如每天早上 8 点触发），Agent 自动进行大批量抓取与生成。
4. **调度池分发 (Distribution Pool)**：Agent 生产出的成品自动流入“调度池”，按策略（人工审核/自动直发）推向微博。

### 3.2 核心组件层
- **Workflow Engine**：负责解析任务流定义，管理执行上下文，处理节点间的输入输出传递。
- **Capability Registry (Toolbox)**：注册并标准化所有原子能力（如：DashScope, BaziCalc, WebSearch）。
- **Client Manager**：管理不同客户（Tenant）的配置、私有提示词及特定的业务逻辑。

### 3.2 表现层 (Renderer)
- **Dynamic Workbench**：根据当前账号绑定的 Workflow，动态加载侧边栏菜单及对应的操作面板。
- **Component Library**：提供标准化的 UI 原子组件（日期选、模型选、文案预览、排盘图表）。

## 4. 关键特性 (Key Features)

### 4.1 多维工作流支持
- **同步流**：单次点击，立即通过多步处理获取结果。
- **异步批处理流**：支持长耗时、高并发的任务（如：灵感库批量预生成），具备进度追踪和状态持久化。

### 4.2 核心编排与能力集 (Orchestration & Capabilities)
- **多步复杂工作流**：支持搜索热点 -> LLM 提取 -> 外部 API (如排盘) -> LLM 生成 -> 自动配图的端到端串联。
- **动态资源工具箱**：内置 SearchTool、ScraperTool、ImageGenTool（如 Flux/SD 接入），支持实时补全信息。
- **并发与频控 (Rate Limiting)**：内置全局并发控制器与 Token Bucket 算法，防止大规模生成时触发第三方供应商限流（HTTP 429）。

### 4.3 审核与动态迭代链路 (Review & Revision)
- **人机协同审核 (HITL)**：批量生成的文案进入“待审核”池。
- **交互式调优 (Interactive Revision)**：在审核态，用户可高亮指定段落，下发“改写指令”（如：让这段更幽默），AI 仅重写该局部并无缝融合。
- **去重校验 (Deduplication)**：在提交分发前进行向量化语义相似度检测，防止账号短时间内发布高度重复的同质化内容。
- **智能调度分发 (Smart Distribution)**：审核通过（或配置为自动直发）的内容，系统将根据账号历史活跃波峰，采取随机离散的时间策略自动推入发布队列。

### 4.4 可观测性与高可用 (Observability & Resilience)
- **全局缓存池与防重发 (Global Shared Cache)**：针对“热点抓取”、“公众人物解析”等公共数据，支持按天/按事件级缓存。同一天内多次运行工作流，直接复用已存入数据库的中间态数据，做到“处理完就收工”，杜绝冗余重复请求浪费 Token。
- **任务频率管控 (Frequency Control)**：支持为工作流配置触发频率（如：每天限跑 1 次）。对于已处理完成的批次自动标记跳过。
- **全链路追踪 (Execution Trace)**：为每一个工作流实例生成唯一的 RunId，记录每个节点的耗时、输入输出及 Token 消耗。
- **断点续传 (Crash Recovery)**：引擎定时持久化 Context，遭遇系统崩溃或网络异常时，重启后可从失败节点无缝恢复执行，防止批量任务前功尽弃。
- **引擎自我纠偏 (Self-Correction)**：遇到模型输出格式化异常（如 JSON 损坏），系统自动截获错误并发起修正请求。
- **智能降级与容灾 (Fallback Routing)**：当首选大模型（如 Qwen-Max）或第三方 API（如 TopHub）宕机时，自动切换至备选模型或数据源，确保生产流水线永不中断。

### 4.5 成本与资产安全 (Cost & Asset Safety)
- **成本控制中心 (Cost Optimizer)**：支持节点级模型路由（苦力活走小模型，创意活走大模型），并引入语义缓存机制拦截高度重复的生成请求。
- **本地媒体管线 (Asset Pipeline)**：自动接管 AI 生成或检索到的网络图片/视频，进行本地下载、压缩、格式转换（转 WebP/MP4）和自动垃圾回收，防止磁盘撑爆并提升本地预览速度。
- **合规审计节点 (Safety Check)**：集成前置/后置敏感词库与模型安全检测，防止触发社交平台风控。

## 5. 验收标准 (Acceptance Criteria)
- [ ] 架构支持在不修改核心代码的情况下，通过新增 JSON 配置文件增加一套全新的生成逻辑。
- [ ] 侧边栏菜单需与账号绑定的 Client/Workflow 严格对应。
- [ ] 支持多步串行任务，前序节点的输出能准确传递给后续节点。
- [ ] 具备健壮的异常处理机制（如：节点超时、LLM 幻觉纠偏、计费拦截）。
