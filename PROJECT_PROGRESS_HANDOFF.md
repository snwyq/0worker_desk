# 0Worker 微博 AI 内容平台进度交接文档

更新时间：2026-05-04

## 当前完成度估算

完整 PRD 范围完成度：约 68%

可演示 MVP 流程完成度：约 92%

这里的 MVP 指运营人员可以在现有左侧菜单和右侧功能区内完成：

1. 配置/选择微博账号。
2. 配置账号默认插件、人设、禁用表达、审核方式和调度策略。
3. 从实时热点素材池选择素材，并带入 Agent 引擎。
4. 在 Agent 引擎选择客户插件、微博账号、内容风格、审核策略和工作流。
5. 运行 AI 工作流生成微博内容。
6. 内容按策略进入审核池，或免审保存并进入调度链路。
7. 审核池可编辑正文、通过、驳回、请求 AI 重写。
8. AI 重写成功后写入新版本，内容回到待审核状态。
9. 审核通过后进入调度池。
10. 调度池可编辑时间/内容、立即发布、取消、重试、退回审核。
11. 发布失败会保留内容、失败原因和 publish_runs 记录。

## 本轮新增完成

- 2026-05-04 续接补充：
  - `AgentEnginePage` 已重写为干净中文的运营工作台文案，保留现有页面框架和主链路能力：
    - 账号/插件选择。
    - 内容风格选择、新建、编辑、复制、批量复制到同插件矩阵账号、暂停。
    - 审核策略切换。
    - 工作流运行、日志展示、结果编辑。
    - 保存到审核/调度流程。
  - `queueErrors` 的调度冲突提示已恢复为干净中文。
  - 新增 `tests/renderer/chinese-copy.test.ts`，用于防止 Agent 引擎和队列错误提示再次出现常见中文乱码。
  - `tests/renderer/queue-errors.test.ts` 的中文期望值已同步修复。
  - 本轮没有触发真实微博登录、发布或外部账号提交。
- 2026-05-04 继续补充：
  - `AgentEnginePage` 已接入工作流动态参数表单。
  - 新增 `src/renderer/agentWorkflowForm.ts`，支持从 `definitionJson.settingsSchema` 或 `definitionJson.inputSchema.properties` 生成表单字段。
  - 支持字段类型：文本、多行文本、数字、复选框。
  - `accountId`、`styleId`、`reviewMode` 等系统字段不展示为普通运营参数，但运行时仍自动合并。
  - schema 默认值会合并进运行参数，不覆盖运营人员已有编辑。
  - `topic`、`targetPersona`、`requirement` 默认使用多行输入，便于承接热点摘要和复杂要求。
  - 新增 `tests/renderer/agentWorkflowForm.test.ts` 覆盖字段生成和默认值合并。

- 热点素材页 `HotTopicsPage` 已重构为干净中文界面：
  - 保留现有左侧菜单/右侧功能区框架。
  - 支持平台筛选、搜索、6 小时缓存提示、强制同步。
  - 表格展示 TopHub 镜像字段，包括平台、标题、排名、热度、作者、描述、PC/移动链接、封面、扩展信息。
  - 增加“用于生成”操作，将热点标题、平台、链接、热度等整理为 Agent 草稿并跳转到 `AgentEnginePage`。

- 账号页 `AccountsPage` 和账号卡片 `AccountCard` 已重构为干净中文界面：
  - 支持新增/编辑账号。
  - 支持账号状态、浏览器模式、Profile、WebSocket、调试端口。
  - 支持账号级默认插件、人设、禁用表达、默认审核、每日发布上限、最小间隔、是否允许自动发布。
  - 卡片展示插件、人设摘要、调度策略和连接健康信息。

- 设置页 `SettingsPage` 已重构为干净中文配置中心：
  - 支持语言、浏览器模式、AI Key、TopHub Key/BaseURL、更新检查、高级 App Settings。
  - 明确展示 DashScope、APIYi、TopHub 是否已配置。
  - 保留开发者重启入口。

- 队列页 `QueuePage` 可见主链路文案已继续补漏：
  - 审核池、调度池、任务弹窗、任务表格、日志区主流程文案已恢复为中文。
  - 调度器启动/停止失败提示、弹窗取消/提交按钮已修复。
  - 全 `src/renderer` 典型乱码扫描当前无命中。

- 热点素材到 Agent 引擎的输入衔接已完成：
  - 新增共享模型 `src/shared/agentDraft.ts`。
  - `HotTopicsPage` 将热点整理成 Agent 草稿。
  - `App` 继续使用既有菜单框架，只在点击后切换到现有 `AgentEnginePage`。
  - `AgentEnginePage` 进入时读取待处理草稿，自动填入选题和生成要求。

- HTTP AI 服务隔离已加强：
  - `startHttpApi` 为每个 HTTP server 创建独立 `AiService` 实例。
  - 避免测试/本地服务之间串用全局 AI service、Key 或热点缓存。
  - `/ai/hot-topics?force=true` 支持 query 参数。
  - TopHub 强刷失败或无结果时回退本地热点镜像，不让 UI 空掉。
  - `electron/preload.ts` 已把 `listHotTopics(force)` 参数传给 IPC。

- 审核池“请求 AI 重写”从状态流升级为真实内容闭环：
  - 数据库方法 `reviewItems.applyRewrite`。
  - 支持把重写后的正文写回 `content_items.body`。
  - 自动写入 `content_versions`，保留原始版本和 AI 重写版本。
  - 重写成功后审核项回到 `pending`，内容状态回到 `reviewing`。
  - HTTP/IPC/Preload/Renderer API 均支持可选 `rewrittenBody`。
  - 模型不可用时保留 `rewriting` 状态，供后续重试或人工处理。

- 调度任务“退回审核”闭环已完成：
  - 数据库方法 `distributionTasks.returnToReview`。
  - IPC `distributionTasks:returnToReview`。
  - HTTP `POST /distribution-tasks/:id/return-review`。
  - `QueuePage` 调度列表增加退回审核入口。
  - 退回后任务标记 failed，内容回到 reviewing，并创建/复用待审核项。

- 内容风格可视化管理已完成一条可用闭环：
  - `AgentEnginePage` 已重构为干净中文主流程页。
  - 在现有 Agent 引擎页内支持新建、编辑、复制、暂停账号级内容风格。
  - 新建风格绑定当前账号和插件，支持默认审核策略。
  - 后端补充 `contentStyles.create/update` 仓库方法。
  - IPC、Preload、Renderer API、HTTP `/ai/styles` POST/PUT 已接通。
  - 新增数据库和 HTTP API 测试覆盖风格创建/更新。
  - 支持将当前风格批量复制到同插件的矩阵账号。
  - 批量复制会跳过源账号，保留工作流、模型策略、审核策略、调度策略和去重策略。
  - HTTP `/ai/styles/:id/copy-to-accounts`、IPC/Preload/Renderer API 已接通。

- 风格级调度节奏限制已加入：
  - 支持在 `content_styles.dispatchPolicyJson.maxConsecutivePerAccount` 配置同账号同风格连续发布上限。
  - 创建/更新调度任务时会把候选任务放入账号发布时间线，检查同风格连续段是否超限。
  - 命中时抛出 `SCHEDULE_STYLE_CONSECUTIVE_LIMIT`，避免矩阵账号内容长期单调。
  - 已用数据库测试覆盖“连续同风格被拒绝、穿插其他风格后允许”。

## 已验证命令

```bash
npm test -- tests/renderer/agentWorkflowForm.test.ts tests/renderer/chinese-copy.test.ts tests/renderer/queue-errors.test.ts
```

结果：通过，3 files / 7 tests passed（2026-05-04 继续补充）。

```bash
npm run build
```

结果：通过（2026-05-04 继续补充，动态表单接入后重新验证）。

```bash
rg -n "鐢|寰|鍐|瀹|璋|椋|彿|俙|浠|噟|鏍|搸|閺|闂|娴|婵|濠|楠|缂|濮|妞|鐎|鐠|閵|閿" src\renderer\pages\AgentEnginePage.tsx src\renderer\queueErrors.ts tests\renderer\queue-errors.test.ts tests\renderer\agentWorkflowForm.test.ts
```

结果：无命中。

```bash
npm run build
```

结果：通过（2026-05-04 续接后重新验证）。

```bash
rg -n "鐢|寰|鍐|瀹|璋|椋|彿|俙|浠|噟|鏍|搸" src\renderer\pages\AgentEnginePage.tsx src\renderer\queueErrors.ts tests\renderer\queue-errors.test.ts
```

结果：无命中。

```bash
npm test -- tests/renderer/queue-errors.test.ts tests/renderer/chinese-copy.test.ts
```

结果：当前机器在 `pretest -> npm rebuild better-sqlite3` 阶段遇到 `spawn EPERM`，未跑到测试断言。已按权限规则申请沙箱外运行，但系统自动审批服务返回 503 并拒绝，未绕过执行。

```bash
npx vitest run tests/renderer/chinese-copy.test.ts
```

结果：当前机器在 Vite/Vitest 配置加载阶段遇到 esbuild `spawn EPERM`，与既有环境风险一致。已按权限规则申请沙箱外运行，但系统自动审批服务返回 503 并拒绝，未绕过执行。

```bash
npm run build
```

结果：通过。

```bash
npx vitest run tests/main/http-api.test.ts
```

结果：32 passed。

```bash
npx vitest run tests/main/database.test.ts
```

结果：30 passed。

```bash
npx vitest run tests/main/database.test.ts tests/main/http-api.test.ts
```

结果：62 passed。

```bash
rg -n "鍙|寰|鏍|鐑|鏁|绱|鎼|鏈|闀|鏄|涓|鈥|浣|闇|鏌|鏂|妯|璇|濯|鏃|椤|骞|缂|閫|澶|婕|宸|杈|姝|鐢|瀹|璐|鐘|閰|鏉|鐞|銆|锟|\?/" src\renderer
```

结果：无命中。

补充：`npx vitest run tests/main/ai-output.test.ts tests/main/llm-tool.test.ts tests/main/tophub-tool.test.ts` 在当前机器卡在 Vite/Vitest 配置加载阶段的 esbuild `spawn EPERM`，不是断言失败。类似问题也曾影响独立运行 `tests/main/agent-draft.test.ts` 和部分 renderer 测试。

## 当前主要已完成能力

- 多客户、多账号、多插件、多内容风格的数据模型基础。
- Maoxiaoxian 作为样例插件，而不是整个平台。
- 默认内容风格种子数据：
  - `mx_hot_bazi`
  - `mx_healing_emotion`
  - `mx_sharp_commentary`
  - `mx_guoxue_daily`
- AI 工作流运行记录、日志、生成内容追踪。
- LLM 输出解析与结构化兼容。
- TopHub 工具使用项目内 key/url 配置，并支持本地镜像回退。
- 热点素材可进入 Agent 引擎生成流程。
- 内容资产 `content_items`、版本历史、审核池、调度池、发布记录主链路。
- 高风险内容不会自动发布，会进入人工审核。
- 审核通过可创建调度任务。
- 免审内容可自动进入调度池。
- 同账号同时间、最小间隔、每日上限的调度冲突校验。
- 任务发布前适配旧 `posts` 记录，复用现有微博发布器。
- 发布失败保留内容和失败记录。
- 账号 AI 配置 UI 已接入 `AccountsPage`。
- `QueuePage` 已能承载审核池、调度池、发布记录主流程。

## P0 剩余事项

1. 真实 UI 冒烟验证。
   - 当前 `npm run build` 已通过。
   - Vite/H5 和部分 Vitest 在当前环境偶发或稳定遇到 esbuild `spawn EPERM`。
   - 2026-05-04 续接时尝试用 `npm run dev` 启动本地 GUI/dev server，沙箱内 `Start-Process` 被 Windows 拒绝；按规则申请沙箱外运行，但系统自动审批服务 503 拒绝，未绕过执行。
   - Electron 前台曾运行到超时未报错，但还没有完成可视化点击检查。
   - 能启动 GUI 时，需要按流程点击：
     - 热点素材“用于生成”
     - Agent 引擎生成
     - 保存进入审核池
     - 审核通过
     - 调度池出现任务
     - 修改时间
     - 立即发布或退回审核

2. 真实微博发布冒烟仍未做。
   - 涉及真实微博提交、登录、权限或敏感账号状态时必须停下来确认。
   - 当前可以继续测试到“准备发布/手动接管”前，不应无确认提交真实微博内容。

3. 审核池 AI 重写体验还可以增强。
   - 当前失败时会保留 `rewriting` 状态，UI 有重试入口。
   - 后续可增加模型调用失败原因详情、重写前后 diff、模型调用日志。

## P1 后续能力

- 内容风格删除/归档审计。
- 工作流 input schema 动态表单。
- 发布记录与失败诊断增强：
  - 截图路径
  - 浏览器/账号状态
  - 人工接管入口
- 更完整的调度策略：
  - 时间窗口
  - 同风格连续发布限制
  - 同客户账号矩阵短期重复度限制
- 插件配置导入/导出，方便复用不同客户方案。
- 多租户权限、审计、用量计费和成本看板。

## 已知风险

- Renderer 单测和部分独立 Vitest 在当前环境会遇到 esbuild `spawn EPERM`；主链路 `http-api`、`database` 和 `npm run build` 可正常运行。
- 项目配置中有真实模型 Key 和 TopHub 配置。测试已尽量隔离外部服务，但开发真实流程时要避免误触真实发布动作。
- 真实微博发布涉及外部账号/浏览器状态，不能无确认提交真实内容。
- Git 工作区已有大量修改和新增文件，接手时不要执行 `git reset --hard` 或覆盖式还原。

## 接手建议

下一步优先做两件事：

1. 能启动 GUI 时做真实 UI 冒烟，把“热点用于生成 -> Agent 生成 -> 审核 -> 调度”的流程跑一遍。
2. 继续补 P1 的风格管理 UI 或工作流动态表单，优先让“不同客户、不同账号、不同风格”的配置能力更完整。

继续遵守现有页面边界，不新增 App shell、独立插件中心或独立审核池页面：

- `AgentEnginePage`：插件、账号、风格、工作流运行、结果预览。
- `QueuePage`：审核池、调度池、发布记录。
- `AccountsPage`：账号人设、发布策略、默认插件/风格绑定。
- `HotTopicsPage`：热点素材与 Agent 引擎输入。
- `SettingsPage`：模型、热榜、浏览器、默认策略和高级配置。
