import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Clock, AlertTriangle, ArrowUpRight, Zap, CheckCircle2 } from 'lucide-react';
import type { Account, DistributionTask } from '../../shared/types';
import { appApi } from '../api';

export function HomePage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<DistributionTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [nextAccounts, nextTasks] = await Promise.all([
          appApi.accounts.list(), 
          appApi.distributionTasks.list()
        ]);
        setAccounts(nextAccounts || []);
        setTasks(nextTasks || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const pendingTasks = (tasks || []).filter((task) => task?.status === 'queued').length;
  const manualAccounts = (accounts || []).filter((account) => account?.status !== 'active');
  const manualTasks = (tasks || []).filter((task) => task?.status === 'needs_manual_action' || task?.status === 'failed').slice(0, 5);
  const accountsById = new Map((accounts || []).map((account) => [account?.id, account]));

  if (loading) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-h-[60vh]">
        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
          <div className="tw-w-12 tw-h-12 tw-border-4 tw-border-brand-100 tw-border-t-brand-500 tw-rounded-full tw-animate-spin" />
          <p className="tw-text-sm tw-text-slate-400 tw-font-medium">正在同步控制中心数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-space-y-8 tw-animate-fade-in">
      {/* 顶部欢迎语 - Modern Oriental Banner */}
      <div className="tw-relative tw-p-10 tw-bg-slate-900 tw-rounded-[40px] tw-text-white tw-overflow-hidden tw-shadow-2xl tw-shadow-slate-200">
        <div className="tw-relative tw-z-10">
          <div className="tw-flex tw-items-center tw-gap-3 tw-mb-4">
             <div className="tw-px-3 tw-py-1 tw-bg-brand-500/20 tw-text-brand-400 tw-rounded-full tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-border tw-border-brand-500/30">
               SYSTEM CORE V2.0
             </div>
             <div className="tw-flex tw-items-center tw-gap-2 tw-bg-white/5 tw-px-3 tw-py-1 tw-rounded-full tw-backdrop-blur-md">
                <div className="tw-w-1.5 tw-h-1.5 tw-bg-green-400 tw-rounded-full tw-animate-pulse" />
                <span className="tw-text-[10px] tw-font-bold tw-text-slate-300">节点连接正常</span>
             </div>
          </div>
          <h1 className="tw-text-4xl tw-font-bold tw-tracking-tight">{t('home.title')}</h1>
          <p className="tw-text-slate-400 tw-mt-3 tw-max-w-lg tw-leading-relaxed">{t('home.description')}</p>
          
          <div className="tw-flex tw-gap-6 tw-mt-10">
             <div className="tw-group tw-cursor-default">
                <p className="tw-text-[10px] tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-widest">任务调度中</p>
                <div className="tw-flex tw-items-baseline tw-gap-2">
                   <span className="tw-text-2xl tw-font-black">{pendingTasks}</span>
                   <Zap size={14} className="tw-text-amber-400 group-hover:tw-animate-bounce" />
                </div>
             </div>
             <div className="tw-w-px tw-h-10 tw-bg-white/10" />
             <div className="tw-group tw-cursor-default">
                <p className="tw-text-[10px] tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-widest">活跃账户数</p>
                <div className="tw-flex tw-items-baseline tw-gap-2">
                   <span className="tw-text-2xl tw-font-black">{(accounts || []).length}</span>
                   <Users size={14} className="tw-text-blue-400" />
                </div>
             </div>
          </div>
        </div>

        {/* Decorative Elements - 东方意蕴装饰 */}
        <div className="tw-absolute tw-right-0 tw-top-0 tw-w-[500px] tw-h-[500px] tw-bg-brand-600/10 tw-rounded-full tw-blur-[120px] tw-animate-pulse" />
        <div className="tw-absolute -tw-right-20 -tw-bottom-20 tw-w-80 tw-h-80 tw-border tw-border-white/5 tw-rounded-full" />
        <div className="tw-absolute tw-right-10 tw-bottom-10 tw-w-40 tw-h-40 tw-border tw-border-white/5 tw-rounded-full tw-opacity-50" />
        <div className="tw-absolute tw-left-1/2 tw-top-0 tw-w-px tw-h-full tw-bg-gradient-to-b tw-from-transparent tw-via-white/5 tw-to-transparent" />
      </div>

      {/* 核心指标栅格 */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-8">
        {[
          { label: t('home.accounts'), value: (accounts || []).length, icon: Users, color: 'tw-text-blue-600', bg: 'tw-bg-blue-50/50' },
          { label: t('home.pending'), value: pendingTasks, icon: Clock, color: 'tw-text-brand-600', bg: 'tw-bg-brand-50/50' },
          { label: t('home.manual'), value: manualAccounts.length + manualTasks.length, icon: AlertTriangle, color: 'tw-text-amber-600', bg: 'tw-bg-amber-50/50' }
        ].map((stat, idx) => (
          <div key={idx} className="tw-group tw-relative tw-bg-white tw-p-8 tw-rounded-[32px] tw-border tw-border-slate-100 tw-shadow-sm hover:tw-shadow-2xl hover:tw-border-brand-100 tw-transition-all tw-duration-500">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
              <div className={`tw-p-4 ${stat.bg} ${stat.color} tw-rounded-2xl tw-transition-transform tw-duration-500 group-hover:tw-scale-110 group-hover:tw-rotate-3`}>
                <stat.icon size={28} />
              </div>
              <div className="tw-p-2 tw-bg-slate-50 tw-text-slate-300 tw-rounded-xl group-hover:tw-bg-brand-50 group-hover:tw-text-brand-600 tw-transition-all">
                <ArrowUpRight size={18} />
              </div>
            </div>
            <p className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.2em]">{stat.label}</p>
            <h3 className="tw-text-4xl tw-font-black tw-text-slate-900 tw-mt-2">{stat.value}</h3>
            
            {/* 底部装饰线 */}
            <div className="tw-absolute tw-bottom-0 tw-left-8 tw-right-8 tw-h-1 tw-bg-slate-50 tw-rounded-t-full tw-overflow-hidden">
               <div className={`tw-h-full tw-w-0 group-hover:tw-w-full tw-transition-all tw-duration-700 ${stat.color.replace('text', 'bg')}`} />
            </div>
          </div>
        ))}
      </div>

      {/* 待办与异常双栏列表 */}
      <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">
        {/* 账号状态模块 */}
        <div className="tw-bg-white tw-rounded-[40px] tw-p-10 tw-border tw-border-slate-100 tw-shadow-sm tw-animate-slide-up">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
            <div>
              <h3 className="tw-text-xl tw-font-bold tw-text-slate-900">账号异常监控</h3>
              <p className="tw-text-xs tw-text-slate-400 tw-mt-1">发现 {manualAccounts.length} 个账号需要重新授权或检查连接</p>
            </div>
            <div className="tw-p-3 tw-bg-slate-50 tw-text-slate-400 tw-rounded-2xl">
               <Users size={20} />
            </div>
          </div>
          <div className="tw-space-y-4">
            {manualAccounts.length ? manualAccounts.slice(0, 5).map((account, idx) => (
              <div key={account?.id} 
                style={{ animationDelay: `${idx * 100}ms` }}
                className="tw-animate-slide-up tw-flex tw-items-center tw-gap-4 tw-p-5 tw-bg-slate-50/50 tw-rounded-3xl tw-border tw-border-slate-50 hover:tw-bg-white hover:tw-shadow-xl hover:tw-border-amber-100 tw-transition-all tw-group">
                <div className="tw-w-12 tw-h-12 tw-bg-amber-100 tw-text-amber-600 tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-transition-transform group-hover:tw-rotate-12">
                   <AlertTriangle size={20} />
                </div>
                <div className="tw-flex-1 tw-min-w-0">
                  <h4 className="tw-text-sm tw-font-bold tw-text-slate-900 tw-truncate">{account?.name || '未命名账号'}</h4>
                  <p className="tw-text-[11px] tw-text-slate-400 tw-truncate tw-mt-1">{account?.manualActionReason || account?.healthMessage || '检测到会话已过期，请手动重新连接'}</p>
                </div>
                <div className="tw-flex tw-flex-col tw-items-end tw-gap-1">
                  <span className="tw-px-2 tw-py-1 tw-bg-amber-50 tw-text-amber-600 tw-rounded-lg tw-text-[9px] tw-font-black tw-uppercase">
                    {account?.status || 'ERROR'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="tw-py-16 tw-text-center tw-bg-slate-50/30 tw-rounded-[32px] tw-border tw-border-dashed tw-border-slate-200">
                <div className="tw-w-16 tw-h-16 tw-bg-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-4 tw-shadow-sm">
                  <CheckCircle2 size={32} className="tw-text-emerald-500 tw-opacity-40" />
                </div>
                <p className="tw-text-sm tw-text-slate-500 tw-font-bold">所有账号链路通畅</p>
                <p className="tw-text-[11px] tw-text-slate-400 tw-mt-1">暂无需要人工干预的异常账户</p>
              </div>
            )}
          </div>
        </div>

        {/* 任务状态模块 */}
        <div className="tw-bg-white tw-rounded-[40px] tw-p-10 tw-border tw-border-slate-100 tw-shadow-sm tw-animate-slide-up">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
            <div>
              <h3 className="tw-text-xl tw-font-bold tw-text-slate-900">故障任务队列</h3>
              <p className="tw-text-xs tw-text-slate-400 tw-mt-1">当前有 {manualTasks.length} 个任务发布失败，已自动移入观察区</p>
            </div>
            <div className="tw-p-3 tw-bg-slate-50 tw-text-slate-400 tw-rounded-2xl">
               <Zap size={20} />
            </div>
          </div>
          <div className="tw-space-y-4">
            {manualTasks.length ? manualTasks.map((task, idx) => (
              <div key={task?.id} 
                style={{ animationDelay: `${idx * 100}ms` }}
                className="tw-animate-slide-up tw-flex tw-items-center tw-gap-4 tw-p-5 tw-bg-slate-50/50 tw-rounded-3xl tw-border tw-border-slate-50 hover:tw-bg-white hover:tw-shadow-xl hover:tw-border-red-100 tw-transition-all tw-group">
                <div className="tw-w-12 tw-h-12 tw-bg-red-100 tw-text-red-600 tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-transition-transform group-hover:tw-rotate-12">
                   <Zap size={20} />
                </div>
                <div className="tw-flex-1 tw-min-w-0">
                  <h4 className="tw-text-sm tw-font-bold tw-text-slate-900 tw-truncate">
                    {accountsById.get(task?.accountId)?.name || '未知账号'}
                  </h4>
                  <p className="tw-text-[11px] tw-text-slate-400 tw-truncate tw-mt-1">
                    失败原因: {task?.lastError || '内容格式校验未通过，请检查发布正文'}
                  </p>
                </div>
                <div className="tw-flex tw-flex-col tw-items-end tw-gap-1">
                  <span className="tw-px-2 tw-py-1 tw-bg-red-50 tw-text-red-600 tw-rounded-lg tw-text-[9px] tw-font-black tw-uppercase">
                    {task?.status || 'FAILED'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="tw-py-16 tw-text-center tw-bg-slate-50/30 tw-rounded-[32px] tw-border tw-border-dashed tw-border-slate-200">
                <div className="tw-w-16 tw-h-16 tw-bg-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-4 tw-shadow-sm">
                  <CheckCircle2 size={32} className="tw-text-emerald-500 tw-opacity-40" />
                </div>
                <p className="tw-text-sm tw-text-slate-500 tw-font-bold">分发队列清空</p>
                <p className="tw-text-[11px] tw-text-slate-400 tw-mt-1">所有计划均已按时送达或暂无计划</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
