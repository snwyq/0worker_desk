/**
 * VideoHookExportPage — 视频"黄金3秒"钩子帧渲染页面
 * 
 * 用途：被 LocalChartRenderer.renderVideoHook() 在隐藏窗口中加载，
 * 渲染高保真金句画面后由 capturePage() 截图保存。
 * 
 * 不会在主界面中显示，纯粹用于离屏渲染。
 */

import React, { useEffect, useState } from 'react';

interface VideoHookData {
  hookSentence: string;
  personName: string;
  topicTitle: string;
  personPhoto: string | null;
}

export default function VideoHookExportPage() {
  const [data, setData] = useState<VideoHookData | null>(null);

  useEffect(() => {
    // 监听来自主进程的数据注入
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'RENDER_VIDEO_HOOK') {
        setData(event.data.payload);
      }
    };
    window.addEventListener('message', handler);

    // 也尝试从全局变量中读取（备选方案）
    if ((window as any).__VIDEO_HOOK_DATA__) {
      setData((window as any).__VIDEO_HOOK_DATA__);
    }

    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (data) {
      // 给一点时间让字体和图片加载完成
      const timer = setTimeout(() => {
        (window as any).__VIDEO_HOOK_READY__ = true;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!data) {
    return <div style={{ width: 1080, height: 1920, background: '#0a0a0a' }} />;
  }

  // 解析金句，将其中的引号内容高亮为夺目的亮黄色
  const renderHookSentence = (text: string) => {
    // 匹配中文或英文的引号段落
    const regex = /([“"「].*?[”"」])/g;
    const segments = text.split(regex);
    
    return segments.map((seg, idx) => {
      if (/^[“"「].*[”"」]$/.test(seg)) {
        return (
          <span key={idx} style={{ 
            color: '#FDE047', // 亮黄色
            textShadow: '0 0 30px rgba(253,224,71,0.6)', 
            display: 'inline-block',
            transform: 'scale(1.05)',
            margin: '0 8px'
          }}>
            {seg}
          </span>
        );
      }
      return <span key={idx}>{seg}</span>;
    });
  };

  const { hookSentence, personName, topicTitle, personPhoto } = data;

  // 将本地文件路径转为 file:// URL（Electron 需要）
  const photoUrl = personPhoto
    ? `file:///${personPhoto.replace(/\\/g, '/')}`
    : null;

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#050505',
        fontFamily: '"PingFang SC", "-apple-system", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* 极度模糊的背景图，保留氛围色调但不泄露隐私 */}
      {photoUrl ? (
        <div
          style={{
            position: 'absolute',
            inset: -100, // 延展更多防止白边
            backgroundImage: `url(${photoUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            filter: 'blur(25px) brightness(0.35) saturate(1.5)', // 加强饱和度，压暗亮度
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, #1a0b12, #000000)',
          }}
        />
      )}

      {/* 剧场感遮罩：上下极黑渐变，视线聚焦中心 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.98) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* 上下电影感遮幅 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: '#000', zIndex: 5 }}></div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: '#000', zIndex: 5 }}></div>

      {/* 主体排版区：极具视觉冲击力的海报排版 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
          zIndex: 10,
        }}
      >
        {/* 脱敏人物名标签（警示红框） */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ef4444',
            padding: '16px 48px',
            borderRadius: '100px',
            marginBottom: '70px',
            boxShadow: '0 20px 50px rgba(239, 68, 68, 0.4), inset 0 4px 10px rgba(255,255,255,0.3)',
            border: '4px solid rgba(255, 255, 255, 0.15)',
            transform: 'rotate(-3deg) scale(1.1)', // 微倾斜增加动感
          }}
        >
          <span
            style={{
              fontSize: 54,
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: 12,
              marginRight: -12,
              textShadow: '0 4px 10px rgba(0,0,0,0.5)'
            }}
          >
            独家命盘 · {personName && personName.length > 1 
              ? personName.charAt(0) + 'X'.repeat(personName.length - 1)
              : personName + 'X'}
          </span>
        </div>

        {/* 爆炸性金句主体 */}
        <h1
          style={{
            // 根据字数动态调整字号，但整体比以前更大更粗
            fontSize: hookSentence.length > 14 ? 130 : 160,
            fontWeight: 900,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.25,
            WebkitTextStroke: '6px rgba(0,0,0,0.9)', // 深邃的黑色描边
            paintOrder: 'stroke fill',
            textShadow: '0 20px 60px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.5)', // 超强立体投影
            margin: 0,
            maxWidth: 960,
            wordBreak: 'normal',
            whiteSpace: 'pre-wrap',
            fontStyle: 'italic', // 倾斜字体制造极端张力
            letterSpacing: 4,
          }}
        >
          {renderHookSentence(hookSentence)}
        </h1>

        {/* 底部能量装饰条 */}
        <div style={{
          marginTop: 100,
          display: 'flex',
          gap: '16px'
        }}>
          <div style={{ width: 32, height: 12, backgroundColor: '#ef4444', borderRadius: 6, transform: 'skewX(-20deg)' }}></div>
          <div style={{ width: 120, height: 12, backgroundColor: '#FDE047', borderRadius: 6, boxShadow: '0 0 20px rgba(253,224,71,0.6)', transform: 'skewX(-20deg)' }}></div>
          <div style={{ width: 32, height: 12, backgroundColor: '#ef4444', borderRadius: 6, transform: 'skewX(-20deg)' }}></div>
        </div>
      </div>
    </div>
  );
}
