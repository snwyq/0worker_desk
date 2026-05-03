---
name: Performance-Optimizer
description: 性能分析与调优专家。针对 React 渲染瓶颈与 Electron 资源占用进行深度优化。
---

# Performance-Optimizer Skill

这个技能旨在让您的桌面应用运行得“轻快且省电”。

## 性能优化路径

### 1. React 渲染优化
- 使用 `React.memo` 防止不必要的子组件重绘。
- 识别并修复由 Context 或 Redux 状态引起的级联更新。
- 在频繁操作（如搜索、滚动）中强制实施防抖 (Debounce) 和节流 (Throttle)。

### 2. 资源管理
- 审计 Electron 内存分配，及时销毁已卸载窗口或不再使用的资源。
- 优化主进程与渲染进程之间的 IPC 数据传输量。

### 3. 大数据量处理
- 对于账号列表或任务队列，优先实施虚拟列表（Virtualization）技术。

## 触发场景
- 应用启动优化。
- 复杂 Dashboard 或大型列表开发。
- 用户反馈应用卡顿或 CPU 占用过高。
