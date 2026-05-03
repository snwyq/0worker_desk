---
name: Autopilot-Core
description: 实现从“模糊需求”到“上线标准”的全自动闭环开发流。包含 PRD 产出、技术方案、开发、自我挑刺与迭代。
---

# Autopilot-Core Skill (自动驾驶总控)

本技能旨在实现全自动、高标准、少干预的闭环开发。

## 闭环协议 (Loop Protocol)

### 第一步：PRD 具象化 (Requirement -> Artifact)
- 严禁直接写代码。必须先产出 `PRD_DRAFT.md`。
- 标准：包含用户故事、功能边界、验收标准（Acceptance Criteria）。

### 第二步：技术建模 (Architecture -> Artifact)
- 产出 `TECH_SPEC.md`。
- 定义：组件层级、状态管理（State）、IPC 通信协议。

### 第三步：迭代式开发 (Dev Cycle)
- 调用 `superpowers` 技能进行编码。
- 每完成一个子模块，必须更新 `task.md`。

### 第四步：自我挑刺与回归 (Self-Review & Roast)
- **核心逻辑**：Agent 必须扮演“外部审查员”，针对已写的代码和 UI 产出 `ISSUE_LIST.md`。
- 挑刺维度：
  1. **UI 细节**（调用 `UI-UX-Pro-Max` 标准）。
  2. **代码质量**（调用 `Clean-Code-Linter` 标准）。
  3. **安全隐患**（调用 `Security-Guard` 标准）。

### 第五步：自动化优化 (Auto-Refine)
- 基于 `ISSUE_LIST.md` 自动执行修复任务，并进入下一轮迭代。

## 退出机制
- 只有当 `ISSUE_LIST.md` 中的所有高/中风险条目均为 [x] 时，才向用户报告“开发完成”。

## 使用指南
- 当用户提出“开发大模块”或“从零开始做一个功能”时激活。
- 整个过程应尽量保持自主，仅在方案确认点询问用户。
