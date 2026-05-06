import React, { useMemo } from 'react';
import { Clock, Info, Zap } from 'lucide-react';
import type { PublishingStrategy } from '../../shared/types';

interface SchedulingSandboxProps {
  strategy: PublishingStrategy;
}

/**
 * 未来 24H 时间轴排期模拟器 (Timeline Sandbox)
 * 根据当前的 PublishingStrategy 实时模拟未来 24 小时的发布分布
 */
export const SchedulingSandbox: React.FC<SchedulingSandboxProps> = ({ strategy }) => {
  // 模拟生成排期点位
  const mockSchedulePoints = useMemo(() => {
    const points: Date[] = [];
    const now = new Date();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 未来 24 小时
    
    let currentAnchor = new Date(now);
    const minIntervalMs = (strategy.minIntervalMins || 1) * 60 * 1000;
    const jitterMs = (strategy.jitterMins || 0) * 60 * 1000;
    
    // 简单模拟循环，直到超出 24 小时或达到每日上限
    let dailyCount = 0;
    const maxDaily = strategy.maxDailyPosts || 999;

    // 安全熔断保护：确保间隔至少 1 分钟，防止死循环
    const safeIntervalMs = Math.max(minIntervalMs, 60 * 1000);

    while (currentAnchor < endTime && dailyCount < maxDaily) {
      // 1. 基础间隔
      const nextTime = new Date(currentAnchor.getTime() + safeIntervalMs);
      
      // 2. 注入随机抖动 (Jitter)
      const randomOffset = (Math.random() * 2 - 1) * jitterMs;
      const finalTime = new Date(nextTime.getTime() + randomOffset);
      
      // 3. 简单时间窗校验
      const timeStr = `${finalTime.getHours().toString().padStart(2, '0')}:${finalTime.getMinutes().toString().padStart(2, '0')}`;
      const isInWindow = !strategy.activeTimeRangesJson || strategy.activeTimeRangesJson.length === 0 
        ? true 
        : strategy.activeTimeRangesJson.some(([start, end]) => timeStr >= start && timeStr <= end);
      
      if (isInWindow && finalTime > now && finalTime < endTime) {
        points.push(finalTime);
        dailyCount++;
      }
      
      currentAnchor = nextTime;
    }
    
    return points;
  }, [strategy]);

  // 计算每小时的发布密度
  const hourlyDensity = useMemo(() => {
    const density = new Array(24).fill(0);
    const currentHour = new Date().getHours();
    
    mockSchedulePoints.forEach(p => {
      const hour = p.getHours();
      // 这里简化映射到 0-23 的索引，相对于当前小时
      density[hour]++;
    });
    return density;
  }, [mockSchedulePoints]);

  const maxDensity = Math.max(...hourlyDensity, 1);

  return (
    <div className="tw-bg-white/40 tw-backdrop-blur-xl tw-rounded-[32px] tw-border tw-border-white/20 tw-p-8 tw-shadow-xl tw-shadow-slate-200/50">
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-w-10 tw-h-10 tw-bg-brand-500 tw-text-white tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-shadow-lg tw-shadow-brand-500/20">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="tw-text-base tw-font-black tw-text-slate-900">排期模拟沙盒</h3>
            <p className="tw-text-[11px] tw-text-slate-400 tw-font-bold tw-uppercase tw-tracking-wider">未来 24H 排期模拟预览</p>
          </div>
        </div>
        <div className="tw-flex tw-gap-4">
          <div className="tw-text-right">
            <div className="tw-text-xs tw-font-black tw-text-slate-900">{mockSchedulePoints.length}</div>
            <div className="tw-text-[10px] tw-text-slate-400 tw-font-bold">预估发文量</div>
          </div>
          <div className="tw-text-right">
            <div className="tw-text-xs tw-font-black tw-text-slate-900">
              {mockSchedulePoints.length > 0 
                ? (Math.floor(24 * 60 / mockSchedulePoints.length)) 
                : 0}分
            </div>
            <div className="tw-text-[10px] tw-text-slate-400 tw-font-bold">平均体感间隔</div>
          </div>
        </div>
      </div>

      {/* 可视化柱状图 */}
      <div className="tw-h-32 tw-flex tw-items-end tw-gap-1.5 tw-mb-6 tw-px-2">
        {hourlyDensity.map((count, i) => (
          <div 
            key={i} 
            className="tw-flex-1 tw-group tw-relative"
            style={{ height: `${(count / maxDensity) * 100}%`, minHeight: '4px' }}
          >
            <div className={`tw-w-full tw-h-full tw-rounded-t-lg tw-transition-all tw-duration-500 ${count > 0 ? 'tw-bg-brand-500 tw-opacity-80 group-hover:tw-opacity-100' : 'tw-bg-slate-100'}`} />
            {/* Tooltip */}
            <div className="tw-absolute tw-bottom-full tw-left-1/2 tw--translate-x-1/2 tw-mb-2 tw-px-2 tw-py-1 tw-bg-slate-900 tw-text-white tw-text-[10px] tw-rounded-md tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-pointer-events-none tw-whitespace-nowrap">
              {i}:00 - {count} 篇
            </div>
          </div>
        ))}
      </div>

      {/* 时间轴刻度 */}
      <div className="tw-flex tw-justify-between tw-px-2 tw-mb-8">
        {[0, 6, 12, 18, 23].map(h => (
          <span key={h} className="tw-text-[10px] tw-font-black tw-text-slate-400">{h}:00</span>
        ))}
      </div>

      {/* 点位散点图 (更直观的流感) */}
      <div className="tw-relative tw-h-12 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100 tw-overflow-hidden">
        <div className="tw-absolute tw-inset-0 tw-flex tw-items-center">
          <div className="tw-w-full tw-h-[1px] tw-bg-slate-200" />
        </div>
        {mockSchedulePoints.map((p, idx) => {
          const now = new Date();
          const offsetPercent = ((p.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) * 100;
          return (
            <div 
              key={idx}
              className="tw-absolute tw-w-2.5 tw-h-2.5 tw-bg-brand-500 tw-rounded-full tw-border-2 tw-border-white tw-shadow-sm tw-transition-all hover:tw-scale-150 hover:tw-z-10"
              style={{ left: `${offsetPercent}%` }}
              title={p.toLocaleTimeString()}
            />
          );
        })}
      </div>

      <div className="tw-mt-6 tw-flex tw-items-start tw-gap-2 tw-p-4 tw-bg-brand-50/50 tw-rounded-2xl tw-border tw-border-brand-100/50">
        <Info size={14} className="tw-text-brand-500 tw-mt-0.5" />
        <p className="tw-text-[11px] tw-text-brand-700 tw-leading-relaxed">
          基于当前 <b>{strategy.minIntervalMins}min</b> 间隔与 <b>±{strategy.jitterMins}min</b> 抖动生成的模拟序列。
          实际运行中，引擎会根据“水库截流”逻辑自动调整冷热启动，确保发布曲线平滑。
        </p>
      </div>
    </div>
  );
};
