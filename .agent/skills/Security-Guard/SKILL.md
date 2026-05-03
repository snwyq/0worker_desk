---
name: Security-Guard
description: 专门针对 Electron 和桌面应用的安全审计技能。防止 RCE、XSS 以及不当的系统调用。确保应用安全性达到金融级标准。
---

# Security-Guard Skill

这个技能将 Agent 转化为一名安全审计专家，专门针对桌面应用（Electron）的常见攻击向量。

## 审计准则

### 1. 核心安全配置 (WebPreferences)
- **强制开启 Context Isolation**: 确保渲染进程无法直接访问主进程敏感 API。
- **强制禁用 Node Integration**: 绝对禁止在渲染进程中直接暴露 Node 环境。
- **沙箱化 (Sandbox)**: 确保渲染进程在沙箱环境中运行。

### 2. IPC 安全通信
- **最小权限原则**: IPC 接口必须经过严格定义，严禁将原始 Node API (如 `fs`, `child_process`) 直接透传到前端。
- **输入校验**: 必须对从渲染进程传回的所有参数进行深度校验。

### 3. 内容安全策略 (CSP)
- 自动检测并协助配置 `Content-Security-Policy`，防止跨站脚本攻击 (XSS)。

## 触发场景
- 修改 `main.js` 或 `preload.js` 中的 IPC 逻辑。
- 创建新的窗口或集成第三方网页内容。
- 处理敏感的用户凭证或账号 Token。
