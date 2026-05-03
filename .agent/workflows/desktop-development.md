# 0Worker Desk 桌面端开发规范 (Desktop Development Standards)

**版本**: 1.0
**适用范围**: 0Worker Desk (Electron + Vite + React) 桌面应用开发

---

## 1. 核心开发准则：API 逻辑闭环

项目为了兼容“浏览器预览”和“Electron 运行”两种模式，采用了**双模 API 封装**。严禁绕过封装直接调用底层 IPC。

### 1.1 前后端通信链路 (The API Chain)
一个完整的新接口开发必须包含以下四个环节：

1. **Main Process (`src/main/ipc/handlers.ts`)**:
   - 实现业务逻辑函数。
   - 使用 `ipcMain.handle('domain:action', ...)` 注册。
   - 在 `startHttpApi` 中添加对应的 HTTP 路由（用于浏览器模式降级）。

2. **Preload (`electron/preload.ts`)**:
   - 在 `contextBridge.exposeInMainWorld('weiboPublisher', ...)` 中暴露该方法。
   - 确保方法名与后端 `domain:action` 逻辑一致。

3. **Frontend API (`src/renderer/api.ts`)**:
   - 在 `appApi` 对象中封装该方法。
   - **必须** 实现双模检测：
     ```typescript
     methodName: (params) => {
       if (window.weiboPublisher) return window.weiboPublisher.domain.action(params); // Electron 模式
       return httpJson('/domain/action', { method: 'POST', body: ... }); // 浏览器模式
     }
     ```

4. **UI Page**:
   - 通过 `import { appApi } from '../api'` 调用。
   - **禁止** 直接调用 `window.electron` 或 `ipcRenderer`。

---

## 2. UI 与美学规范 (UI-UX Standards)

### 2.1 Tailwind CSS 约束
- **强制前缀**: 必须使用 `tw-` 前缀（例如：`tw-flex`, `tw-bg-brand-500`）。
- **风格**: 遵循 **Modern Oriental (现代东方)** 风格。使用高斯模糊、呼吸感间距、精致阴影。

### 2.2 状态反馈
- 所有异步操作（如同步、保存、启动浏览器）必须有 `loading` 状态反馈。
- 成功/错误必须使用 UI 提示（通过 `connectionMessage` 或 `error` 状态），禁止直接 `alert()`。

---

## 3. 开发环境红线
- **主进程修改**: 修改 `main` 进程或 `preload` 代码后，必须手动重启 `npm run dev` 才能生效。
- **配置**: API 密钥等敏感信息优先从数据库 `settings` 获取，其次从 `.env` 获取。

---

## 4. 故障排查 (Debug)
- 若点击无反应，首要检查浏览器控制台：`Cannot read properties of undefined (reading 'xxx')` 通常意味着 Preload 暴露失败或 API 调用路径错误。
