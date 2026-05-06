import React from 'react';
import { 
  Settings2, 
  Hash, 
  Timer, 
  Shuffle, 
  CalendarClock, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  X,
  Volume2
} from 'lucide-react';
import type { PublishingStrategy } from '../../shared/types';

interface PublishingStrategyCardProps {
  strategy: PublishingStrategy;
  onUpdate: (updates: Partial<PublishingStrategy>) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
}

/**
 * 动态释义组件 (Interpreter)
 */
const Interpreter: React.FC<{ strategy: PublishingStrategy }> = ({ strategy }) => {
  const timeWindowsStr = strategy.activeTimeRangesJson?.length 
    ? strategy.activeTimeRangesJson.map(r => `${r[0]}-${r[1]}`).join('、')
    : '全天 24H';

  return (
    <div className="tw-bg-brand-50/50 tw-border tw-border-brand-100 tw-rounded-2xl tw-p-5 tw-flex tw-gap-4 tw-items-start tw-animate-fade-in tw-mb-6">
      <div className="tw-w-8 tw-h-8 tw-bg-brand-500 tw-text-white tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shrink-0 tw-shadow-lg tw-shadow-brand-500/20">
        <Volume2 size={16} />
      </div>
      <div>
        <h4 className="tw-text-xs tw-font-black tw-text-brand-900 tw-mb-1">系统大白话释义</h4>
        <p className="tw-text-[12px] tw-text-brand-700 tw-leading-relaxed tw-font-medium">
          📢 该规则下：该栏目将在每天的 <b className="tw-text-brand-900">{timeWindowsStr}</b> 期间发布，每天最多 <b className="tw-text-brand-900">{strategy.maxDailyPosts}</b> 条，相邻发文至少间隔 <b className="tw-text-brand-900">{strategy.minIntervalMins} 分钟</b>，时间随机波动 <b className="tw-text-brand-900">±{strategy.jitterMins} 分钟</b>。
        </p>
      </div>
    </div>
  );
};

/**
 * 策略配置卡片 (PublishingStrategyCard)
 * 提供精细化的调度参数调节 UI，支持 UI-UX-Pro-Max 极致质感
 */
export const PublishingStrategyCard: React.FC<PublishingStrategyCardProps> = ({ 
  strategy, 
  onUpdate, 
  onSave,
  isSaving = false
}) => {
  
  const handleAddRange = () => {
    const newRanges = [...(strategy.activeTimeRangesJson || []), ['08:00', '22:00']];
    onUpdate({ activeTimeRangesJson: newRanges });
  };

  const handleRemoveRange = (index: number) => {
    const newRanges = strategy.activeTimeRangesJson.filter((_, i) => i !== index);
    onUpdate({ activeTimeRangesJson: newRanges });
  };

  const handleUpdateRange = (index: number, startOrEnd: 0 | 1, value: string) => {
    if (!strategy.activeTimeRangesJson) return;
    const newRanges = strategy.activeTimeRangesJson.map((r, i) => 
      i === index ? (startOrEnd === 0 ? [value, r[1]] : [r[0], value]) : r
    );
    onUpdate({ activeTimeRangesJson: newRanges });
  };

  return (
    <div className="tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-shadow-2xl tw-shadow-slate-200/40 tw-overflow-hidden tw-flex tw-flex-col">
      {/* Header */}
      <div className="tw-px-8 tw-py-6 tw-bg-slate-50/50 tw-border-b tw-border-slate-50 tw-flex tw-items-center tw-justify-between">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-w-10 tw-h-10 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-flex tw-items-center tw-justify-center">
            <Settings2 size={20} />
          </div>
          <div>
            <h3 className="tw-text-base tw-font-black tw-text-slate-900">排期策略配置</h3>
            <p className="tw-text-[11px] tw-text-slate-400 tw-font-bold tw-uppercase tw-tracking-wider">受控栏目: {strategy.workflowCode}</p>
          </div>
        </div>
        <div className="tw-flex tw-items-center tw-gap-3">
           <button
             type="button"
             onClick={() => onUpdate({ isActive: !strategy.isActive })}
             className={`tw-relative tw-w-12 tw-h-7 tw-rounded-full tw-transition-colors tw-duration-300 tw-cursor-pointer ${
               strategy.isActive ? 'tw-bg-emerald-500' : 'tw-bg-slate-200'
             }`}
           >
             <span className={`tw-absolute tw-top-[3px] tw-left-[3px] tw-w-[22px] tw-h-[22px] tw-bg-white tw-rounded-full tw-shadow-md tw-transition-transform tw-duration-300 ${
               strategy.isActive ? 'tw-translate-x-[20px]' : 'tw-translate-x-0'
             }`} />
           </button>
           <span className={`tw-text-[11px] tw-font-black tw-uppercase ${strategy.isActive ? 'tw-text-emerald-600' : 'tw-text-slate-400'}`}>
             {strategy.isActive ? '已激活' : '已禁用'}
           </span>
        </div>
      </div>

      <div className="tw-p-8 tw-space-y-8">
        {/* Row 1: Daily Quota & Min Interval */}
        <div className="tw-grid tw-grid-cols-2 tw-gap-6">
          <div className="tw-space-y-3">
            <div className="tw-flex tw-items-center tw-gap-2 tw-ml-1">
              <Hash size={14} className="tw-text-slate-400" />
              <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">每日发帖上限</label>
            </div>
            <div className="tw-relative">
              <input 
                type="number"
                className="tw-w-full tw-px-6 tw-py-4 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-2xl tw-text-sm tw-font-black tw-text-slate-900 focus:tw-bg-white focus:tw-ring-4 focus:tw-ring-brand-500/10 focus:tw-border-brand-500/20 tw-transition-all"
                value={strategy.maxDailyPosts}
                onChange={(e) => onUpdate({ maxDailyPosts: parseInt(e.target.value) || 0 })}
              />
              <span className="tw-absolute tw-right-6 tw-top-1/2 tw--translate-y-1/2 tw-text-[10px] tw-font-bold tw-text-slate-300">篇 / 每日</span>
            </div>
          </div>

          <div className="tw-space-y-3">
            <div className="tw-flex tw-items-center tw-gap-2 tw-ml-1">
              <Timer size={14} className="tw-text-slate-400" />
              <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">最短发布间隔</label>
            </div>
            <div className="tw-relative">
              <input 
                type="number"
                className="tw-w-full tw-px-6 tw-py-4 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-2xl tw-text-sm tw-font-black tw-text-slate-900 focus:tw-bg-white focus:tw-ring-4 focus:tw-ring-brand-500/10 focus:tw-border-brand-500/20 tw-transition-all"
                value={strategy.minIntervalMins}
                onChange={(e) => onUpdate({ minIntervalMins: parseInt(e.target.value) || 0 })}
              />
              <span className="tw-absolute tw-right-6 tw-top-1/2 tw--translate-y-1/2 tw-text-[10px] tw-font-bold tw-text-slate-300">分钟</span>
            </div>
          </div>
        </div>

        {/* Row 2: Jitter */}
        <div className="tw-space-y-3">
          <div className="tw-flex tw-items-center tw-justify-between tw-ml-1">
            <div className="tw-flex tw-items-center tw-gap-2">
              <Shuffle size={14} className="tw-text-slate-400" />
              <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">拟人化随机抖动</label>
            </div>
            <span className="tw-text-[11px] tw-font-black tw-text-brand-500">±{strategy.jitterMins}min</span>
          </div>
          <div className="tw-px-2">
            <input 
              type="range"
              min="0"
              max="120"
              step="1"
              className="tw-w-full tw-h-2 tw-bg-slate-100 tw-rounded-lg tw-appearance-none tw-cursor-pointer accent-brand-500"
              value={strategy.jitterMins}
              onChange={(e) => onUpdate({ jitterMins: parseInt(e.target.value) || 0 })}
            />
            <div className="tw-flex tw-justify-between tw-mt-2">
              <span className="tw-text-[9px] tw-font-bold tw-text-slate-300 uppercase">精准模式</span>
              <span className="tw-text-[9px] tw-font-bold tw-text-slate-300 uppercase">高度随机</span>
            </div>
          </div>
        </div>

        {/* Row 3: Time Windows */}
        <div className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between tw-ml-1">
            <div className="tw-flex tw-items-center tw-gap-2">
              <CalendarClock size={14} className="tw-text-slate-400" />
              <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">活跃时间窗</label>
            </div>
            <button 
              onClick={handleAddRange}
              className="tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-1.5 tw-bg-slate-900 tw-text-white tw-text-[10px] tw-font-black tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all"
            >
              <Plus size={12} />
              新增时段
            </button>
          </div>
          
          <div className="tw-space-y-3">
            {strategy.activeTimeRangesJson?.length > 0 ? (
              strategy.activeTimeRangesJson.map((range, idx) => (
                <div key={idx} className="tw-flex tw-items-center tw-gap-4 tw-p-4 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100 tw-group">
                  <div className="tw-flex-1 tw-grid tw-grid-cols-2 tw-gap-3">
                    <input 
                      type="time" 
                      className="tw-bg-white tw-border tw-border-slate-200 tw-rounded-xl tw-px-3 tw-py-2 tw-text-xs tw-font-black tw-text-slate-700 tw-outline-none"
                      value={range[0]}
                      onChange={(e) => handleUpdateRange(idx, 0, e.target.value)}
                    />
                    <input 
                      type="time" 
                      className="tw-bg-white tw-border tw-border-slate-200 tw-rounded-xl tw-px-3 tw-py-2 tw-text-xs tw-font-black tw-text-slate-700 tw-outline-none"
                      value={range[1]}
                      onChange={(e) => handleUpdateRange(idx, 1, e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => handleRemoveRange(idx)}
                    className="tw-w-8 tw-h-8 tw-bg-white tw-text-slate-300 hover:tw-text-red-500 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-transition-all tw-opacity-0 group-hover:tw-opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="tw-text-center tw-py-8 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-dashed tw-border-slate-200">
                <p className="tw-text-xs tw-text-slate-400 tw-font-bold">未设置时间窗，默认全天 24H 活跃</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="tw-mt-auto tw-p-8 tw-bg-slate-50/50 tw-border-t tw-border-slate-50 tw-flex tw-flex-col tw-gap-6">
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-3 tw-py-4 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-text-sm tw-font-black tw-shadow-xl tw-shadow-slate-200 hover:tw-bg-brand-600 tw-transition-all active:tw-scale-[0.98] disabled:tw-opacity-50"
        >
          {isSaving ? (
            <div className="tw-w-4 tw-h-4 tw-border-2 tw-border-white/20 tw-border-t-white tw-rounded-full tw-animate-spin" />
          ) : (
            <>
              <Save size={18} />
              保存当前栏目策略
            </>
          )}
        </button>

        <Interpreter strategy={strategy} />
      </div>
    </div>
  );
};
