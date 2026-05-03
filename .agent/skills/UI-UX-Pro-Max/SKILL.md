---
name: UI-UX-Pro-Max
description: 自动应用最高级的前端美学标准（Tailwind 极致阴影、毛玻璃、微交互）。确保所有交付的 UI 均达到商业级水准。
---

# UI-UX-Pro-Max Skill

这个技能强制 Agent 在开发过程中遵循最高标准的 UI/UX 设计原则。

## 核心设计规范

### 1. 视觉美学 (Aesthetics)
- **色彩**: 严禁使用原始色值，必须使用经过精心调配的 HSL 色板或品牌渐变。
- **质感**: 深度应用 `backdrop-blur` (毛玻璃) 和复杂的 `box-shadow`（分层阴影）。
- **字体**: 优先使用现代非衬线字体，严格控制字重（Font Weight）以体现信息层级。

### 2. 交互体验 (Interactions)
- **微动效**: 所有按钮和交互元素必须具备 hover/active 态的平滑过渡。
- **状态感知**: 任何异步操作必须配合精美的 Skeleton (骨架屏) 或 Loading 状态。
- **反馈**: 操作成功/失败必须有明确的视觉反馈（Toast/Message）。

### 3. Tailwind 强制要求
- **前缀**: 所有类名必须严格带有 `tw-` 前缀。
- **组合性**: 优先使用 Tailwind 的原子类组合实现视觉效果，严禁在 `<style>` 中书写传统 CSS。
