---
name: findskills
description: 搜索、发现并管理 Antigravity Skills。用于查看本地已安装技能或寻找新的能力扩展。
---

# findskills Skill

这个技能旨在帮助用户管理和扩展 Antigravity 的能力。

## 核心指令

### 1. 查看本地已安装技能
- 检查当前项目的 `.agent/skills/` 目录。
- 检查全局目录 `~/.agents/skills/` (或 `C:\Users\22813\.gemini\antigravity\skills`)。
- 为每个发现的技能读取其 `SKILL.md` 的 `description` 并向用户展示列表。

### 2. 发现新技能
- 当用户询问某种特定功能的技能时，通过 `search_web` 寻找是否有相关的开源 `SKILL.md` 配置。
- 如果找到，向用户展示其内容并询问是否安装。

### 3. 安装新技能
- 接受用户的安装确认后，在对应的技能目录下自动创建 `SKILL.md`。

## 使用规则
- 仅在用户明确询问技能管理、安装或查询技能库时激活。
- 始终以清单形式展示技能名称和简短描述。
