/**
 * VideoExportService — 短视频导出编排服务
 * 
 * 职责：
 * 1. AI 生成口播稿（复用 AiService）
 * 2. 前端渲染钩子帧图片（复用 LocalChartRenderer）
 * 3. 调用 Python 脚本生成视频（child_process）
 * 4. 将视频路径写回 DB
 * 
 * 零侵入：不修改 HotBaziService / LocalChartRenderer 等现有管线
 */

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { AppDatabase } from '../db/database.js';
import { AiService } from './AiService.js';
import { localChartRenderer } from './LocalChartRenderer.js';

export interface VideoGenerateResult {
  ok: boolean;
  videoPath?: string;
  durationSec?: number;
  error?: string;
}

export class VideoExportService {
  private db: AppDatabase | null = null;
  private ai = new AiService();
  private pythonOk: boolean | null = null; // 缓存检测结果

  init(db: AppDatabase) {
    this.db = db;
    this.ai.init(db);
  }

  // ═══════════════════════════════════════════════════════════
  // 公开方法
  // ═══════════════════════════════════════════════════════════

  /** 为单条 HotBazi 任务生成视频 */
  async generateVideoForTask(
    taskId: number,
    onProgress?: (msg: string) => void,
  ): Promise<VideoGenerateResult> {
    if (!this.db) throw new Error('VideoExportService 未初始化');

    // 0. 环境检测
    if (this.pythonOk === null) {
      onProgress?.('检测 Python 环境...');
      this.pythonOk = await this.checkPythonEnv();
    }
    if (!this.pythonOk) {
      return { ok: false, error: 'Python 环境不可用。请确保已安装 Python 3 + edge-tts + imageio-ffmpeg' };
    }

    // 1. 读取任务数据
    onProgress?.('读取任务数据...');
    const task = this.db.hotBaziTasks.findById(taskId);
    if (!task) return { ok: false, error: `任务 ${taskId} 不存在` };

    const content = this.db.contentItems.findById(task.contentId);
    if (!content) return { ok: false, error: `内容 ${task.contentId} 不存在` };

    const person = task.hotPersonId ? this.db.hotPeople.findById(task.hotPersonId) : null;
    const personName = person?.name ?? task.sourceTopic ?? '未知';
    const body = content.body || '';

    // 获取图片和人物照片路径
    const mediaPaths = task.mediaPathsJson || [];
    const renderImages = mediaPaths.filter((p: string) => /bazi_.*part/.test(p) && p.endsWith('.png'));
    const personPhotos = mediaPaths.filter((p: string) => p.endsWith('.jpg') || p.endsWith('.jpeg'));

    if (renderImages.length === 0) {
      return { ok: false, error: '没有找到渲染图片，请先生成图片' };
    }

    // 确定媒体目录
    const mediaDir = renderImages[0] ? path.dirname(renderImages[0]) : path.join(process.cwd(), 'media_assets', 'hot_bazi');

    try {
      // 2. AI 生成口播稿
      onProgress?.('AI 生成口播解说词...');
      const voiceoverText = await this.generateVoiceoverScript(body, personName);

      // 3. 提取金句（口播稿第一句）
      const hookSentence = this.extractFirstSentence(voiceoverText);

      // 4. 前端渲染钩子帧图片
      onProgress?.('渲染黄金钩子画面...');
      const hookImagePath = await localChartRenderer.renderVideoHook({
        hookSentence,
        personName,
        topicTitle: task.sourceTopic || '',
        personPhoto: personPhotos[0] || null,
        outputDir: mediaDir,
      });

      // 5. 组装 Python 配置并调用
      onProgress?.('合成视频中（TTS + 运镜 + 字幕）...');
      const outputPath = path.join(mediaDir, `video_${personName}_${Date.now()}.mp4`);

      // 隐私保护：仅保留八字分析图，剔除人物原图（原图仅在封面模糊处理后用作背景）
      const allImages = [...renderImages].filter(Boolean);

      const config = {
        voiceover_text: voiceoverText,
        hook_sentence: hookSentence,
        person_name: personName,
        topic_title: task.sourceTopic || '',
        images: allImages,
        hook_image: hookImagePath,
        output_path: outputPath,
        voice: 'zh-CN-YunxiNeural',
        rate: '-5%',
      };

      const result = await this.callPythonScript(config);

      if (!result.ok) {
        return { ok: false, error: result.error || '视频生成失败' };
      }

      // 6. 追加视频路径到 task.mediaPathsJson
      onProgress?.('更新任务数据...');
      const updatedPaths = [...mediaPaths, outputPath];
      this.db.hotBaziTasks.update(taskId, { mediaPathsJson: updatedPaths });

      onProgress?.('✅ 视频生成完成！');
      return {
        ok: true,
        videoPath: result.video_path,
        durationSec: result.duration_sec,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[VideoExport] 生成失败:', message);
      return { ok: false, error: message };
    }
  }

  /** 批量生成视频 */
  async generateVideoForTasks(
    taskIds: number[],
    onProgress?: (msg: string) => void,
  ): Promise<{ successCount: number; totalRequested: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    for (const taskId of taskIds) {
      onProgress?.(`正在处理 ${successCount + 1}/${taskIds.length}...`);
      const result = await this.generateVideoForTask(taskId, onProgress);
      if (result.ok) {
        successCount++;
      } else {
        errors.push(`任务${taskId}: ${result.error}`);
      }
    }

    return { successCount, totalRequested: taskIds.length, errors };
  }

  // ═══════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════

  /** 提取口播稿的第一句话作为钩子金句 */
  private extractFirstSentence(text: string): string {
    // 去掉话题标签行
    const cleanText = text.replace(/#[^#]+#/g, '').trim();
    // 按句号/感叹号/问号截取第一句
    const match = cleanText.match(/^(.+?[。！？!?])/);
    if (match) {
      const sentence = match[1].trim();
      // 控制在25字以内
      if (sentence.length <= 25) return sentence;
      // 超长则在逗号处截断
      const commaIdx = sentence.indexOf('，');
      if (commaIdx > 0 && commaIdx <= 20) return sentence.substring(0, commaIdx + 1) + '…';
      return sentence.substring(0, 22) + '…';
    }
    return cleanText.substring(0, 20) + '…';
  }

  /** AI 生成口播解说词 */
  private async generateVoiceoverScript(fullText: string, personName: string): Promise<string> {
    const prompt = [
      '你是一位短视频命理博主。请将以下微博文案改写为一段可以在抖音/小红书上直接播放的口播文案。',
      '',
      '要求：',
      '1. 字数控制在 150-250 字左右（大约需要 40-60 秒读完），语速适中，留给观众看图的时间。',
      '2. 第一句必须是最具冲击力的"钩子"金句（≤20字），直接点出人物命局核心特质。第一句话必须单独作为一段。',
      '3. 中间挑最劲爆的1-2步大运，用铁口直断的口吻衔接真实经历。',
      '4. 结尾要有一句引导互动或关注的通用话术。',
      '5. 纯口语化，像真人在镜头前侃侃而谈，不要念经式排比。',
      '6. 必须是纯文本，不要带有任何 [画面提示]、(笑声) 等非解说词内容。',
      '',
      `人物：${personName}`,
      `原文：${fullText}`,
    ].join('\n');

    const result = await this.ai.generateText({
      prompt,
      model: 'qwen-turbo',
      maxTokens: 500,
    });

    return result.content.trim();
  }

  /** 调用 Python 视频生成脚本 */
  private callPythonScript(config: object): Promise<any> {
    return new Promise((resolve, reject) => {
      // 写配置到临时 JSON 文件
      const configPath = path.join(
        path.dirname((config as any).output_path),
        `_video_config_${Date.now()}.json`,
      );
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

      const scriptPath = path.join(process.cwd(), 'scripts', 'generate_video.py');

      const child = execFile(
        'python',
        [scriptPath, '--config-file', configPath],
        { timeout: 180_000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          // 清理配置文件
          try { fs.unlinkSync(configPath); } catch { /* ignore */ }

          if (stderr) {
            console.log('[VideoExport:Python]', stderr);
          }

          if (error) {
            reject(new Error(`Python 脚本执行失败: ${error.message}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`));
            return;
          }

          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch {
            reject(new Error(`无法解析 Python 输出: ${stdout}`));
          }
        },
      );
    });
  }

  /** 检测 Python 环境是否可用 */
  private checkPythonEnv(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(
        'python',
        ['-c', 'import edge_tts; import imageio_ffmpeg; print("OK")'],
        { timeout: 15_000 },
        (error, stdout) => {
          const ok = !error && stdout.trim() === 'OK';
          if (!ok) {
            console.warn('[VideoExport] Python 环境检测失败:', error?.message || stdout);
          }
          resolve(ok);
        },
      );
    });
  }
}

export const videoExportService = new VideoExportService();
