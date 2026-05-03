---
name: superpowers
description: 为 Agent 提供结构化的工程开发流程：思考、计划、执行与验证。将 YOLO 编码转变为严谨的工程实践。
---

# Superpowers Skill

这个技能为 Antigravity Agent 提供了一套工业级的开发规范。

## 核心法则

### 1. 计划先行 (Plan First)
- 在编写任何功能代码之前，必须先产出 `implementation_plan.md`。
- 计划必须包含：影响范围、关键函数修改、以及验证方案。

### 2. 原子提交 (Atomic Changes)
- 每次 `replace_file_content` 应当逻辑独立。
- 避免大规模、混杂多个目的的文件修改。

### 3. 实时追踪 (Live Tracking)
- 使用 `task.md` 实时打钩进度。
- 让用户始终感知当前正在处理哪一步。

### 4. 彻底验证 (Deep Verification)
- 优先寻找测试脚本。
- 如果没有测试脚本，通过 `view_file` 或 `grep_search` 交叉验证引用关系。
- 最后产出 `walkthrough.md`。

## 适用场景
- 当任务涉及超过 2 个文件的修改时。
- 当任务涉及核心业务逻辑（如发布引擎、权限控制）时。
- 当用户要求“更严谨”或“更专业”的开发时。
