import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  LayoutGrid, 
  Workflow, 
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { appApi } from '../api';
import type { AiWorkflow, PublishingStrategy } from '../../shared/types';
import { PublishingStrategyCard } from './PublishingStrategyCard';
import { SchedulingSandbox } from './SchedulingSandbox';

interface StrategyManagerProps {
  onClose: () => void;
}

/**
 * 智能发布策略管理中心 (StrategyManager)
 * 整合了栏目选择、策略编辑与 Sandbox 实时模拟预览
 */
export const StrategyManager: React.FC<StrategyManagerProps> = ({ onClose }) => {
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [selectedWorkflowCode, setSelectedWorkflowCode] = useState<string>('');
  const [strategy, setStrategy] = useState<PublishingStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // 初始化加载所有 Workflow
  useEffect(() => {
    const loadData = async () => {
      try {
        const plugins = await appApi.ai.listPlugins();
        // 简单聚合所有插件的 workflow
        const allWorkflows: AiWorkflow[] = [];
        for (const plugin of plugins) {
          const wfs = await appApi.ai.listWorkflows(plugin.code);
          allWorkflows.push(...wfs);
        }
        setWorkflows(allWorkflows);
        if (allWorkflows.length > 0) {
          setSelectedWorkflowCode(allWorkflows[0].code);
        }
      } catch (err) {
        console.error('Failed to load workflows:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 切换 Workflow 时加载 Strategy
  useEffect(() => {
    if (!selectedWorkflowCode) return;
    
    const loadStrategy = async () => {
      setStrategy(null); // 加载前清空，避免旧数据干扰
      setLoading(true);
      try {
        const existing = await appApi.publishingStrategies.findByWorkflow(selectedWorkflowCode);
        if (existing) {
          setStrategy(existing);
        } else {
          // 初始化默认策略
          setStrategy({
            id: '',
            workflowCode: selectedWorkflowCode,
            name: workflows.find(w => w.code === selectedWorkflowCode)?.name || '默认策略',
            maxDailyPosts: 12,
            minIntervalMins: 60,
            jitterMins: 15,
            activeTimeRangesJson: [['08:00', '22:00']],
            isActive: true,
            createdAt: '',
            updatedAt: ''
          });
        }
      } catch (err) {
        console.error('Failed to load strategy:', err);
        setNotice({ type: 'error', message: '加载策略失败: ' + String(err) });
      } finally {
        setLoading(false);
      }
    };
    loadStrategy();
  }, [selectedWorkflowCode, workflows]);

  const handleUpdateStrategy = (updates: Partial<PublishingStrategy>) => {
    if (!strategy) return;
    setStrategy({ ...strategy, ...updates });
  };

  const handleSave = async () => {
    if (!strategy) return;
    setIsSaving(true);
    setNotice(null);
    try {
      await appApi.publishingStrategies.upsert({
        workflowCode: strategy.workflowCode,
        name: strategy.name,
        maxDailyPosts: strategy.maxDailyPosts,
        minIntervalMins: strategy.minIntervalMins,
        jitterMins: strategy.jitterMins,
        activeTimeRangesJson: strategy.activeTimeRangesJson,
        isActive: strategy.isActive
      });
      setNotice({ type: 'success', message: '排期策略已成功同步到引擎。' });
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setNotice({ type: 'error', message: '保存失败: ' + String(err) });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && workflows.length === 0) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-h-full">
        <div className="tw-w-8 tw-h-8 tw-border-4 tw-border-brand-100 tw-border-t-brand-600 tw-rounded-full tw-animate-spin" />
      </div>
    );
  }

  return (
    <div className="tw-flex tw-flex-col tw-h-full tw-bg-[#f8fafc]">
      {/* Navbar Overlay */}
      <div className="tw-px-10 tw-py-8 tw-flex tw-items-center tw-justify-between tw-border-b tw-border-slate-100 tw-bg-white">
        <div className="tw-flex tw-items-center tw-gap-4">
          <button 
            onClick={onClose}
            className="tw-w-10 tw-h-10 tw-rounded-xl tw-border tw-border-slate-100 tw-flex tw-items-center tw-justify-center hover:tw-bg-slate-50 tw-transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="tw-text-2xl tw-font-black tw-text-slate-900 tw-tracking-tight">智能排期中心</h2>
            <p className="tw-text-sm tw-text-slate-400">配置各栏目的“水库截流”平滑发布策略</p>
          </div>
        </div>
        
        <div className="tw-flex tw-items-center tw-gap-6">
          {notice && (
            <div className={`tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-xl tw-text-xs tw-font-bold tw-animate-fade-in ${
              notice.type === 'success' ? 'tw-bg-emerald-50 tw-text-emerald-600' : 'tw-bg-red-50 tw-text-red-600'
            }`}>
              {notice.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {notice.message}
            </div>
          )}
          <div className="tw-h-10 tw-w-[1px] tw-bg-slate-100" />
          <button onClick={onClose} className="tw-text-slate-400 hover:tw-text-slate-900 tw-transition-all">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="tw-flex-1 tw-overflow-y-auto tw-p-10">
        <div className="tw-max-w-7xl tw-mx-auto">
          {/* Workflow Selector */}
          <div className="tw-mb-10">
            <div className="tw-flex tw-items-center tw-gap-3 tw-mb-4">
              <Workflow size={18} className="tw-text-brand-500" />
              <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">选择受控栏目</label>
            </div>
            <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-4 lg:tw-grid-cols-6 tw-gap-3">
              {workflows.map((wf) => (
                <button
                  key={wf.code}
                  onClick={() => setSelectedWorkflowCode(wf.code)}
                  className={`tw-px-4 tw-py-3 tw-rounded-2xl tw-text-left tw-transition-all tw-border ${
                    selectedWorkflowCode === wf.code 
                    ? 'tw-bg-slate-900 tw-text-white tw-border-slate-900 tw-shadow-xl' 
                    : 'tw-bg-white tw-text-slate-600 tw-border-slate-100 hover:tw-border-slate-300'
                  }`}
                >
                  <div className="tw-text-[11px] tw-font-black tw-truncate">{wf.name}</div>
                  <div className={`tw-text-[9px] tw-mt-1 tw-truncate tw-opacity-50 ${selectedWorkflowCode === wf.code ? 'tw-text-slate-300' : 'tw-text-slate-400'}`}>
                    {wf.code}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Layout */}
          <div className="tw-grid tw-grid-cols-12 tw-gap-10">
            <div className="tw-col-span-12 lg:tw-col-span-5">
              {loading ? (
                <div className="tw-bg-white tw-rounded-[32px] tw-h-[600px] tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-border tw-border-slate-100">
                  <div className="tw-w-10 tw-h-10 tw-border-4 tw-border-slate-100 tw-border-t-brand-500 tw-rounded-full tw-animate-spin" />
                  <p className="tw-text-xs tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">正在推演调度算法...</p>
                </div>
              ) : strategy ? (
                <PublishingStrategyCard 
                  strategy={strategy} 
                  onUpdate={handleUpdateStrategy}
                  onSave={handleSave}
                  isSaving={isSaving}
                />
              ) : (
                <div className="tw-bg-white tw-rounded-[32px] tw-h-64 tw-flex tw-items-center tw-justify-center tw-border tw-border-slate-100 tw-border-dashed">
                   <p className="tw-text-xs tw-text-slate-400">未找到有效策略，请尝试重新选择栏目</p>
                </div>
              )}
            </div>
            <div className="tw-col-span-12 lg:tw-col-span-7 tw-space-y-8">
              {!loading && strategy && <SchedulingSandbox strategy={strategy} />}
              
              {/* Info Card */}
              <div className="tw-bg-slate-900 tw-rounded-[32px] tw-p-8 tw-text-white tw-relative tw-overflow-hidden">
                <div className="tw-relative tw-z-10">
                  <h4 className="tw-text-lg tw-font-black tw-mb-4 tw-flex tw-items-center tw-gap-2">
                    <LayoutGrid size={20} className="tw-text-brand-400" />
                    什么是“水库截流”排期？
                  </h4>
                  <p className="tw-text-sm tw-text-slate-300 tw-leading-relaxed">
                    为了防止内容生成过快导致的“断崖式发布”，系统引入了自动缓冲机制：
                  </p>
                  <ul className="tw-mt-6 tw-space-y-4">
                    <li className="tw-flex tw-items-start tw-gap-3">
                      <div className="tw-w-5 tw-h-5 tw-bg-brand-500/20 tw-text-brand-400 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shrink-0 tw-mt-0.5">1</div>
                      <p className="tw-text-xs tw-text-slate-400"><b>自动流量整形</b>：即使短时间内生成大量内容，引擎也会根据设置的<b>最小间隔</b>将任务拉长到未来。建议针对高产出栏目设置 30-120min 间隔。</p>
                    </li>
                    <li className="tw-flex tw-items-start tw-gap-3">
                      <div className="tw-w-5 tw-h-5 tw-bg-brand-500/20 tw-text-brand-400 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shrink-0 tw-mt-0.5">2</div>
                      <p className="tw-text-xs tw-text-slate-400"><b>冷热启动识别</b>：若栏目长时间未更新（冷启动），第一篇内容将<b>即刻发布</b>；若栏目正在密集工作（热启动），后续内容将自动顺延至队尾。</p>
                    </li>
                    <li className="tw-flex tw-items-start tw-gap-3">
                      <div className="tw-w-5 tw-h-5 tw-bg-brand-500/20 tw-text-brand-400 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-shrink-0 tw-mt-0.5">3</div>
                      <p className="tw-text-xs tw-text-slate-400"><b>动态 Jitter</b>：为每一篇内容注入细微的随机时间偏移，有效规避平台对“固定时间整点发布”的特征监测。</p>
                    </li>
                  </ul>
                </div>
                {/* Decoration */}
                <div className="tw-absolute tw-top-[-100px] tw-right-[-100px] tw-w-[300px] tw-h-[300px] tw-bg-brand-500/10 tw-rounded-full tw-blur-[100px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
