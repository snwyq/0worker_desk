---
name: Browser-Automation-Master
description: 针对浏览器自动化（AdsPower/Puppeteer/Playwright）的最佳实践。优化脚本稳定性与拟人化程度。
---

# Browser-Automation-Master Skill

这个技能旨在提升 Agent 开发浏览器自动化脚本（如微博发布、账号登录）的健壮性。

## 自动化核心策略

### 1. 健壮的等待机制
- 严禁使用固定时间的 `sleep`。
- 必须实现基于状态的动态轮询（Polling），并设置合理的 Timeout。
- 能够识别并处理网络延迟导致的内容渲染滞后。

### 2. 异常与阻断处理
- 自动识别并跳过常见的业务弹窗（Toast）、引导弹窗或验证码提示。
- 实现错误重试机制，确保关键流程不会因为单次网络波动而中断。

### 3. 拟人化交互
- 模拟真实鼠标轨迹、滚动行为和随机输入延迟。
- 处理多 IFrame 嵌套情况下的焦点切换。

## 适用场景
- 修改 `WeiboPublisher.ts` 等分发引擎逻辑。
- 开发新的社交平台自动化发布模块。
- 调试 AdsPower API 集成。
