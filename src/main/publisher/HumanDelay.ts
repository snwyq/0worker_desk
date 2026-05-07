/**
 * HumanDelay — 人类行为模拟工具
 *
 * 所有延迟、坐标偏移、打字节奏均通过本模块统一管理，
 * 确保自动化行为在时间和空间维度上呈现自然的随机分布，
 * 规避微博前端风控引擎对固定模式的检测。
 */

// ---------------------------------------------------------------------------
// 随机基础设施
// ---------------------------------------------------------------------------

/**
 * Box-Muller 变换：产生标准正态分布随机数
 * 比 Math.random() 均匀分布更贴近真人行为的"集中偏好 + 偶尔偏移"特征
 */
function gaussianRandom(mean = 0, stdDev = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/** 将值约束在 [min, max] 范围内 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// 延迟工具
// ---------------------------------------------------------------------------

/**
 * 带高斯抖动的延迟
 *
 * @param baseMs   基准毫秒数
 * @param jitter   抖动比例 (0~1)，默认 0.3 即 ±30%
 * @returns 实际等待毫秒数（保证 ≥ baseMs * 0.3）
 *
 * @example
 *   await humanDelay(2000, 0.3); // 实际等待 1400~2600ms，集中于 2000ms 附近
 */
export async function humanDelay(baseMs: number, jitter = 0.3): Promise<number> {
  const stdDev = baseMs * jitter;
  const actualMs = clamp(
    Math.round(gaussianRandom(baseMs, stdDev)),
    Math.round(baseMs * 0.3),
    Math.round(baseMs * 2.5),
  );
  await new Promise((resolve) => setTimeout(resolve, actualMs));
  return actualMs;
}

/**
 * 模拟人类"看一眼按钮再点"的自然停顿
 * 200~600ms 高斯分布，中心 350ms
 */
export async function humanPreClickPause(): Promise<number> {
  return humanDelay(350, 0.35);
}

/**
 * 帖子之间的冷却等待
 * 3~8s 高斯分布，中心 5s
 */
export async function humanPostPublishCooldown(): Promise<number> {
  return humanDelay(5000, 0.4);
}

// ---------------------------------------------------------------------------
// 坐标工具
// ---------------------------------------------------------------------------

/**
 * 在按钮区域内随机偏移坐标
 *
 * @param x       按钮中心 X
 * @param y       按钮中心 Y
 * @param width   按钮宽度（可选，默认用 radius）
 * @param height  按钮高度（可选，默认用 radius）
 * @returns 偏移后的坐标，保证仍在按钮内部
 */
export function humanJitterCoord(
  x: number,
  y: number,
  width?: number,
  height?: number,
): { x: number; y: number } {
  // 按钮区域的安全偏移范围：不超过按钮尺寸的 30%
  const maxOffsetX = width ? Math.floor(width * 0.3) : 6;
  const maxOffsetY = height ? Math.floor(height * 0.3) : 4;

  const offsetX = clamp(Math.round(gaussianRandom(0, maxOffsetX * 0.5)), -maxOffsetX, maxOffsetX);
  const offsetY = clamp(Math.round(gaussianRandom(0, maxOffsetY * 0.5)), -maxOffsetY, maxOffsetY);

  return {
    x: Math.round(x + offsetX),
    y: Math.round(y + offsetY),
  };
}

// ---------------------------------------------------------------------------
// 鼠标轨迹工具
// ---------------------------------------------------------------------------

/**
 * 生成从 startPoint 到 endPoint 的拟人鼠标移动路径
 *
 * 采用简化贝塞尔插值 + 随机微偏，产生 3~6 个中间点
 * 模拟真人鼠标"从某处划过来"的轨迹
 */
export function generateMousePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Array<{ x: number; y: number; delayMs: number }> {
  const steps = clamp(Math.round(gaussianRandom(4, 1)), 3, 6);
  const path: Array<{ x: number; y: number; delayMs: number }> = [];

  // 贝塞尔控制点：在起点到终点连线的垂直方向上偏移
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const perpX = -(endY - startY) * 0.15;
  const perpY = (endX - startX) * 0.15;
  const ctrlX = midX + gaussianRandom(perpX, Math.abs(perpX) * 0.5 || 5);
  const ctrlY = midY + gaussianRandom(perpY, Math.abs(perpY) * 0.5 || 5);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // 二阶贝塞尔插值
    const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX;
    const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY;
    // 加入微小噪声
    const noiseX = gaussianRandom(0, 2);
    const noiseY = gaussianRandom(0, 2);

    path.push({
      x: Math.round(bx + noiseX),
      y: Math.round(by + noiseY),
      delayMs: clamp(Math.round(gaussianRandom(50, 20)), 20, 100),
    });
  }

  // 确保最后一个点精确到目标（加入微小偏移，不需要完全精确）
  const last = path[path.length - 1];
  if (last) {
    last.x = endX;
    last.y = endY;
  }

  return path;
}

/**
 * 生成一个随机的鼠标起始点（距离目标 80~250px）
 * 模拟真人鼠标从页面某处划过来的效果
 */
export function randomMouseOrigin(targetX: number, targetY: number): { x: number; y: number } {
  const distance = clamp(Math.round(gaussianRandom(150, 50)), 80, 250);
  const angle = Math.random() * 2 * Math.PI;
  return {
    x: Math.max(10, Math.round(targetX + distance * Math.cos(angle))),
    y: Math.max(10, Math.round(targetY + distance * Math.sin(angle))),
  };
}

// ---------------------------------------------------------------------------
// 打字模拟工具
// ---------------------------------------------------------------------------

/**
 * 将文本拆分为模拟打字节奏的分段
 *
 * 每段长度 15~60 字符（高斯分布），段间间隔 30~120ms
 * 模拟真人在输入法 buffer 中组词后提交的行为
 *
 * 对于超长文本（>500字）自动降级为 2~4 大段（防止性能问题）
 */
export function humanTypingChunks(text: string): Array<{ text: string; delayMs: number }> {
  if (!text) {
    return [];
  }

  // 超长文本降级：拆为 2~4 大段
  if (text.length > 500) {
    const segmentCount = clamp(Math.round(gaussianRandom(3, 0.7)), 2, 4);
    const segmentSize = Math.ceil(text.length / segmentCount);
    const chunks: Array<{ text: string; delayMs: number }> = [];

    for (let i = 0; i < text.length; i += segmentSize) {
      chunks.push({
        text: text.slice(i, i + segmentSize),
        delayMs: clamp(Math.round(gaussianRandom(200, 80)), 80, 400),
      });
    }

    return chunks;
  }

  // 正常长度：细粒度打字模拟
  const chunks: Array<{ text: string; delayMs: number }> = [];
  let offset = 0;

  while (offset < text.length) {
    const chunkSize = clamp(Math.round(gaussianRandom(30, 12)), 8, 60);
    const end = Math.min(offset + chunkSize, text.length);
    chunks.push({
      text: text.slice(offset, end),
      delayMs: clamp(Math.round(gaussianRandom(70, 30)), 25, 150),
    });
    offset = end;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// 按压时长工具
// ---------------------------------------------------------------------------

/**
 * 真人鼠标按下到松开的时长
 * 均匀分布 60~130ms（真人很少超过 200ms，也不会是 0ms）
 */
export function humanClickPressDuration(): number {
  return clamp(Math.round(gaussianRandom(90, 25)), 50, 160);
}
