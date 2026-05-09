#!/usr/bin/env python3
"""
Hot Bazi 短视频生成器 V6.1
——————————————————————————
TTS: edge-tts + SubMaker → mp3 + srt
视频: 纯 FFmpeg 命令行（zoompan / xfade / drawtext）

依赖: pip install edge-tts imageio-ffmpeg
用法: python generate_video.py --config-file config.json
"""

import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts
from edge_tts import SubMaker
import imageio_ffmpeg

# ═══════════════════════════════════════════════════════════════
# 常量
# ═══════════════════════════════════════════════════════════════
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
# Windows 微软雅黑路径（FFmpeg drawtext 需要转义冒号）
FONT_PATH_RAW = "C:/Windows/Fonts/msyh.ttc"
FONT_PATH_FFMPEG = "C\\:/Windows/Fonts/msyh.ttc"
FPS = 24
VIDEO_W = 1080
VIDEO_H = 1920
FADE_DURATION = 0.5  # 转场时长（秒）


# ═══════════════════════════════════════════════════════════════
# 1. TTS 合成
# ═══════════════════════════════════════════════════════════════
async def synthesize_tts(text: str, voice: str, rate: str, audio_out: str, srt_out: str) -> float:
    """
    使用 edge-tts 合成语音并生成 SRT 字幕。
    返回音频总时长（秒）。
    """
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    
    boundaries = []

    with open(audio_out, "wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary" or chunk["type"] == "SentenceBoundary":
                boundaries.append(chunk)

    # 微软 TTS 最近的更新去掉了 WordBoundary，改为输出 SentenceBoundary
    # offset 和 duration 的单位都是 100 纳秒（10,000,000 = 1 秒）
    def format_time(ticks: int) -> str:
        ms = int(ticks / 10000)
        s = ms // 1000
        ms = ms % 1000
        m = s // 60
        s = s % 60
        h = m // 60
        m = m % 60
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    srt_lines = []
    idx = 1
    for b in boundaries:
        offset = b["offset"]
        duration = b["duration"]
        text_content = b.get("text", "").strip()

        if not text_content:
            continue

        # 将长句子切分成短句（最多 14 个字符）
        max_len = 14
        sub_texts = []
        current = ""
        for char in text_content:
            current += char
            # 如果遇到标点符号，或者长度达到上限，就切断
            if len(current) >= max_len or char in ["，", "。", "！", "？", "、", "；"]:
                sub_texts.append(current)
                current = ""
        if current:
            sub_texts.append(current)

        # 根据字符数量比例，分配这段音频的持续时间
        total_chars = sum(len(s) for s in sub_texts)
        if total_chars == 0:
            continue

        current_offset = offset
        for s in sub_texts:
            # 依比例分配时长
            s_dur = int(duration * (len(s) / total_chars))
            start_str = format_time(current_offset)
            end_str = format_time(current_offset + s_dur)
            srt_lines.append(f"{idx}\n{start_str} --> {end_str}\n{s.strip()}\n")
            current_offset += s_dur
            idx += 1

    with open(srt_out, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))

    # 获取音频时长
    duration = get_media_duration(audio_out)
    return duration


# ═══════════════════════════════════════════════════════════════
# 2. SRT 解析
# ═══════════════════════════════════════════════════════════════
def parse_srt(srt_path: str) -> list:
    """
    解析 SRT 文件，返回 [(start_sec, end_sec, text), ...]
    """
    entries = []
    content = Path(srt_path).read_text(encoding="utf-8")
    blocks = re.split(r"\n\s*\n", content.strip())

    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue
        # 第二行: 时间轴 "00:00:01,500 --> 00:00:03,200"
        time_match = re.match(
            r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})",
            lines[1],
        )
        if not time_match:
            continue
        g = time_match.groups()
        start = int(g[0]) * 3600 + int(g[1]) * 60 + int(g[2]) + int(g[3]) / 1000
        end = int(g[4]) * 3600 + int(g[5]) * 60 + int(g[6]) + int(g[7]) / 1000
        text = " ".join(lines[2:]).strip()
        entries.append((start, end, text))

    return entries


def get_first_sentence_end(srt_entries: list) -> float:
    """
    寻找第一句结束的时间。为了加快转场，遇到逗号、句号、问号、叹号等停顿即认为完成。
    如果找不到，取前3条的 end_sec 或默认 2.0 秒。
    """
    accumulated_text = ""
    for _, end_sec, text in srt_entries:
        accumulated_text += text
        if re.search(r"[，,。！？!?]", accumulated_text):
            return end_sec
    # 降级：取前3条或全部
    if len(srt_entries) >= 3:
        return srt_entries[2][1]
    if srt_entries:
        return srt_entries[-1][1]
    return 2.0


# ═══════════════════════════════════════════════════════════════
# 3. FFmpeg 工具函数
# ═══════════════════════════════════════════════════════════════
def get_media_duration(path: str) -> float:
    """用 ffprobe 获取媒体文件时长（秒）"""
    ffprobe = FFMPEG.replace("ffmpeg", "ffprobe")
    if not os.path.exists(ffprobe):
        # imageio-ffmpeg 可能只有 ffmpeg，用 ffmpeg 方式获取时长
        result = subprocess.run(
            [FFMPEG, "-i", path, "-f", "null", "-"],
            capture_output=True, text=True, timeout=30,
        )
        # 从 stderr 中提取 Duration
        match = re.search(r"Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})", result.stderr)
        if match:
            h, m, s, cs = match.groups()
            return int(h) * 3600 + int(m) * 60 + int(s) + int(cs) / 100
        return 0.0

    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True, timeout=30,
    )
    return float(result.stdout.strip()) if result.stdout.strip() else 0.0


def get_image_size(path: str) -> tuple:
    """获取图片宽高"""
    result = subprocess.run(
        [FFMPEG, "-i", path, "-f", "null", "-"],
        capture_output=True, text=True, timeout=10,
    )
    match = re.search(r"(\d{2,5})x(\d{2,5})", result.stderr)
    if match:
        return int(match.group(1)), int(match.group(2))
    return VIDEO_W, VIDEO_H


def make_clip_from_image(img_path: str, duration: float, output_path: str, motion: str = "zoom_in"):
    """
    单张图片生成带运镜效果的视频片段。
    motion: "static" | "zoom_in" | "zoom_out" | "vertical_pan"
    """
    w, h = get_image_size(img_path)
    frames = max(int(duration * FPS), FPS)  # 至少1秒
    aspect = h / w if w > 0 else 1.78

    if motion == "static":
        # 静态展示（钩子帧）
        vf = f"scale={VIDEO_W}:{VIDEO_H}:force_original_aspect_ratio=decrease,pad={VIDEO_W}:{VIDEO_H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"
    elif aspect > 2.2:
        # 长图 → 垂直向下滑动
        # 先缩放到 1080 宽，然后用 crop 做垂直滑动
        vf = (
            f"scale={VIDEO_W}:-1,"
            f"crop={VIDEO_W}:{VIDEO_H}:0:'min((ih-{VIDEO_H})*t/{duration},ih-{VIDEO_H})',"
            f"setsar=1"
        )
    elif motion == "zoom_in":
        # Ken Burns 慢推（中心放大 1.0 → 1.12）
        zoom_speed = 0.12 / frames
        vf = (
            f"zoompan=z='min(zoom+{zoom_speed:.8f},1.12)'"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={VIDEO_W}x{VIDEO_H}:fps={FPS}"
        )
    else:
        # Ken Burns 慢拉（中心缩小 1.12 → 1.0）
        zoom_speed = 0.12 / frames
        vf = (
            f"zoompan=z='if(eq(on,1),1.12,max(zoom-{zoom_speed:.8f},1.0))'"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={VIDEO_W}x{VIDEO_H}:fps={FPS}"
        )

    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", img_path,
        "-vf", vf,
        "-t", f"{duration:.3f}",
        "-c:v", "libx264", "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        output_path,
    ]
    subprocess.run(cmd, capture_output=True, timeout=120, check=True)


def concat_clips_with_xfade(clip_paths: list, fade_dur: float, output_path: str):
    """
    使用 xfade 滤镜拼接多个视频片段，带淡入淡出转场。
    """
    if len(clip_paths) == 1:
        # 只有一个片段，直接复制
        subprocess.run(
            [FFMPEG, "-y", "-i", clip_paths[0], "-c", "copy", output_path],
            capture_output=True, timeout=60, check=True,
        )
        return

    # 获取每个片段的时长
    durations = [get_media_duration(p) for p in clip_paths]

    # 构建 filter_complex
    inputs = []
    for p in clip_paths:
        inputs.extend(["-i", p])

    # 链式 xfade：[0][1] → [v01], [v01][2] → [v012], ...
    filters = []
    prev_label = "0:v"
    for i in range(1, len(clip_paths)):
        # offset = 前面所有片段时长之和 - 已有的fade重叠 - 当前fade
        offset = sum(durations[:i]) - fade_dur * (i - 1) - fade_dur
        offset = max(offset, 0)
        out_label = f"v{i}"
        filters.append(
            f"[{prev_label}][{i}:v]xfade=transition=fade:duration={fade_dur}:offset={offset:.3f}[{out_label}]"
        )
        prev_label = out_label

    filter_str = ";".join(filters)

    cmd = [
        FFMPEG, "-y",
        *inputs,
        "-filter_complex", filter_str,
        "-map", f"[{prev_label}]",
        "-c:v", "libx264", "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-r", str(FPS),
        output_path,
    ]
    subprocess.run(cmd, capture_output=True, timeout=120, check=True)


def add_audio_to_video(video_path: str, audio_path: str, output_path: str):
    """把配音和生成的玄学氛围BGM混入视频"""
    # 使用 FFmpeg 内置的 lavfi 生成极具压迫感和神秘感的“低频轰鸣（Drone）”背景音
    cmd = [
        FFMPEG, "-y",
        "-i", video_path,
        "-i", audio_path,
        "-f", "lavfi", "-i", "anoisesrc=c=pink:r=48000:a=0.5", # 生成粉红噪声
        "-filter_complex",
        # 2:a -> 经过 150Hz 低通滤波，加上颤音，变成深邃的轰鸣声，音量 0.25
        # 1:a -> 原始配音，音量略微放大
        "[2:a]lowpass=f=150,tremolo=f=0.5:d=0.5,volume=0.25[bgm];"
        "[1:a]volume=1.2[vox];"
        "[vox][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]",
        "-map", "0:v:0",
        "-map", "[a]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        output_path,
    ]
    subprocess.run(cmd, capture_output=True, timeout=60, check=True)


def burn_subtitles(video_path: str, srt_entries: list, hook_end_sec: float, output_path: str):
    """
    使用 drawtext 滤镜硬烧录字幕（不依赖 libass）。
    跳过钩子时间段内的字幕（钩子帧已有大字显示）。
    """
    # 检查字体文件是否存在
    if not os.path.exists(FONT_PATH_RAW):
        print(f"[WARN] 字体文件不存在: {FONT_PATH_RAW}，字幕将使用默认字体", file=sys.stderr)
        font_arg = ""
    else:
        font_arg = f"fontfile='{FONT_PATH_FFMPEG}':"

    filters = []
    for start, end, text in srt_entries:
        # 跳过钩子时段的字幕
        if end <= hook_end_sec + 0.3:
            continue
        # FFmpeg drawtext 文本转义
        escaped = text.replace("\\", "\\\\").replace("'", "'\\''").replace(":", "\\:")
        escaped = escaped.replace("%", "%%")
        filters.append(
            f"drawtext={font_arg}text='{escaped}'"
            f":enable='between(t,{start:.3f},{end:.3f})'"
            f":fontsize=52:fontcolor=white"
            f":borderw=3:bordercolor=black"
            f":shadowcolor=black@0.6:shadowx=4:shadowy=4"
            f":box=1:boxcolor=black@0.4:boxborderw=12"
            f":x=(w-tw)/2:y=h-350"
        )

    if not filters:
        # 没有字幕需要烧录，直接复制
        subprocess.run(
            [FFMPEG, "-y", "-i", video_path, "-c", "copy", output_path],
            capture_output=True, timeout=60, check=True,
        )
        return

    vf = ",".join(filters)
    cmd = [
        FFMPEG, "-y",
        "-i", video_path,
        "-vf", vf,
        "-c:a", "copy",
        output_path,
    ]
    subprocess.run(cmd, capture_output=True, timeout=120, check=True)


# ═══════════════════════════════════════════════════════════════
# 4. 主流程
# ═══════════════════════════════════════════════════════════════
async def generate_video(config: dict) -> dict:
    """
    主入口：接收配置 JSON，生成最终视频。
    
    config 字段:
      voiceover_text: str   — AI 口播稿全文
      hook_sentence: str    — 钩子金句（显示在钩子帧上）
      person_name: str      — 人物名
      topic_title: str      — 话题标题
      images: list[str]     — 渲染图路径列表 [part-4, part-2, part-3]
      hook_image: str       — 前端渲染的钩子帧图片路径
      output_path: str      — 最终视频输出路径
      voice: str            — TTS 语音名称（默认 zh-CN-YunxiNeural）
      rate: str             — TTS 语速（默认 "-5%"）
    """
    voiceover_text = config["voiceover_text"]
    hook_image = config["hook_image"]
    images = config["images"]
    output_path = config["output_path"]
    voice = config.get("voice", "zh-CN-YunxiNeural")
    rate = config.get("rate", "-5%")

    # 创建临时工作目录
    work_dir = os.path.join(os.path.dirname(output_path), "_video_tmp")
    os.makedirs(work_dir, exist_ok=True)

    try:
        # ── Phase 1: TTS 合成 ──
        print("[1/6] TTS 合成中...", file=sys.stderr)
        audio_path = os.path.join(work_dir, "voiceover.mp3")
        srt_path = os.path.join(work_dir, "subtitles.srt")
        audio_duration = await synthesize_tts(voiceover_text, voice, rate, audio_path, srt_path)

        if audio_duration <= 0:
            raise RuntimeError("TTS 合成失败：音频时长为 0")

        # ── Phase 2: 解析时长 ──
        print("[2/6] 解析字幕时间轴...", file=sys.stderr)
        srt_entries = parse_srt(srt_path)
        hook_end_sec = get_first_sentence_end(srt_entries)
        # 确保钩子时长在极快节奏的合理范围内（1.0~2.0秒）
        hook_end_sec = max(1.0, min(hook_end_sec, 2.0))

        # 计算每张图的展示时长
        num_images = len(images)
        if num_images <= 0:
            raise RuntimeError("没有可用的渲染图")
        remaining = audio_duration - hook_end_sec
        per_image = max(remaining / num_images, 2.0)  # 每张至少2秒

        # ── Phase 3: 生成各片段 ──
        print("[3/6] 渲染运镜片段...", file=sys.stderr)
        clip_paths = []

        # 钩子帧（微动效：缓慢放大，打破死帧）
        hook_clip = os.path.join(work_dir, "clip_hook.mp4")
        make_clip_from_image(hook_image, hook_end_sec, hook_clip, motion="zoom_in")
        clip_paths.append(hook_clip)

        # 渲染图片（交替运镜方向）
        motion_modes = ["zoom_in", "zoom_out", "zoom_in"]
        for i, img_path in enumerate(images):
            clip_out = os.path.join(work_dir, f"clip_{i}.mp4")
            mode = motion_modes[i % len(motion_modes)]
            make_clip_from_image(img_path, per_image, clip_out, motion=mode)
            clip_paths.append(clip_out)

        # ── Phase 4: 拼接 + 转场 ──
        print("[4/6] 拼接转场...", file=sys.stderr)
        merged_path = os.path.join(work_dir, "merged.mp4")
        concat_clips_with_xfade(clip_paths, FADE_DURATION, merged_path)

        # ── Phase 5: 混入音频 ──
        print("[5/6] 混入配音...", file=sys.stderr)
        with_audio_path = os.path.join(work_dir, "with_audio.mp4")
        add_audio_to_video(merged_path, audio_path, with_audio_path)

        # ── Phase 6: 字幕硬烧录 ──
        print("[6/6] 烧录字幕...", file=sys.stderr)
        burn_subtitles(with_audio_path, srt_entries, hook_end_sec, output_path)

        # 获取最终视频时长
        final_duration = get_media_duration(output_path)

        return {
            "ok": True,
            "video_path": output_path,
            "duration_sec": round(final_duration, 1),
            "audio_duration_sec": round(audio_duration, 1),
            "hook_duration_sec": round(hook_end_sec, 1),
        }

    finally:
        # 清理临时文件
        try:
            import shutil
            shutil.rmtree(work_dir, ignore_errors=True)
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════
# CLI 入口
# ═══════════════════════════════════════════════════════════════
def main():
    import argparse

    parser = argparse.ArgumentParser(description="Hot Bazi 短视频生成器")
    parser.add_argument("--config", type=str, help="JSON 配置字符串")
    parser.add_argument("--config-file", type=str, help="JSON 配置文件路径")
    args = parser.parse_args()

    if args.config_file:
        with open(args.config_file, "r", encoding="utf-8") as f:
            config = json.load(f)
    elif args.config:
        config = json.loads(args.config)
    else:
        print(json.dumps({"ok": False, "error": "请提供 --config 或 --config-file 参数"}))
        sys.exit(1)

    try:
        result = asyncio.run(generate_video(config))
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
