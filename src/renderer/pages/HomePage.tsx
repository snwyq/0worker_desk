import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Activity,
  Calendar,
  Layers,
  MoreHorizontal,
  FileText,
  Eye,
  Send,
  Sparkles,
} from 'lucide-react';
import type { Account, ContentItem, DistributionTask, ReviewItem } from '../../shared/types';
import { appApi } from '../api';

export function HomePage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<DistributionTask[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [nextAccounts, nextTasks, nextContents, nextReviewItems] = await Promise.all([
          appApi.accounts.list(),
          appApi.distributionTasks.list(),
          appApi.contents.list(),
          appApi.review.listItems().catch(() => []),
        ]);
        setAccounts(nextAccounts || []);
        setTasks(nextTasks || []);
        setContents(nextContents || []);
        setReviewItems(nextReviewItems || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-h-[70vh]">
        <div className="tw-relative">
          <div className="tw-w-16 tw-h-16 tw-border-2 tw-border-slate-100 tw-rounded-full" />
          <div className="tw-absolute tw-top-0 tw-w-16 tw-h-16 tw-border-2 tw-border-black tw-border-t-transparent tw-rounded-full tw-animate-spin" />
        </div>
      </div>
    );
  }

  // 真实数据指标计算
  const pendingTasks = (tasks || []).filter((task) => task?.status === 'queued').length;
  const publishedTasks = (tasks || []).filter((task) => task?.status === 'published').length;
  const failedTasks = (tasks || []).filter((task) => task?.status === 'failed').length;
  const totalFinishedTasks = publishedTasks + failedTasks;
  const successRate = totalFinishedTasks > 0 ? Math.round((publishedTasks / totalFinishedTasks) * 1000) / 10 : 100;

  const manualAccounts = (accounts || []).filter((account) => account?.status !== 'active');
  const manualTasks = (tasks || []).filter((task) => task?.status === 'needs_manual_action' || task?.status === 'failed').slice(0, 5);

  // 今日数据
  const today = new Date().toISOString().split('T')[0];
  const todayContents = contents.filter((c) => c.createdAt?.startsWith(today));
  const pendingReviews = reviewItems.filter((r) => r.status === 'pending').length;
  const approvedContents = contents.filter((c) => c.status === 'approved').length;

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in">
      {/* Executive Header */}
      <div className="tw-flex tw-items-end tw-justify-between tw-mb-12 tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
           <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
              <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.4em]">{t('home.overview')}</span>
           </div>
           <h1 className="tw-text-4xl tw-font-black tw-text-black tw-tracking-tighter">{t('home.title')}</h1>
        </div>
        <div className="tw-flex tw-items-center tw-gap-3">
           <button className="tw-px-4 tw-py-2 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-500 tw-text-[11px] tw-font-bold tw-rounded-xl hover:tw-bg-slate-50 tw-transition-all tw-flex tw-items-center tw-gap-2">
              <Calendar size={14} />
              {t('home.last24h')}
           </button>
           <button className="tw-px-4 tw-py-2 tw-bg-brand-500 tw-text-white tw-text-[11px] tw-font-bold tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-shadow-xl tw-shadow-brand-500/20">
              {t('home.generateReport')}
           </button>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="tw-grid tw-grid-cols-12 tw-gap-6 tw-mb-12">
         {/* Main Vital Card - 真实发布成功率 */}
         <div className="tw-col-span-12 lg:tw-col-span-4 tw-p-8 tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2.5rem] tw-text-slate-900 tw-relative tw-overflow-hidden tw-shadow-xl shadow-premium">
            <div className="tw-absolute tw-top-0 tw-right-0 tw-p-8 tw-opacity-5 tw-text-brand-500">
               <TrendingUp size={120} />
            </div>
            <div className="tw-relative tw-z-10">
               <div className="tw-flex tw-items-center tw-gap-2 tw-mb-10">
                  <Activity size={16} className="tw-text-brand-500" />
                  <span className="tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">发布成功率</span>
               </div>
               <div className="tw-text-6xl tw-font-black tw-tracking-tighter tw-mb-4 tw-text-slate-900">
                  {successRate}<span className="tw-text-2xl tw-text-slate-300">%</span>
               </div>
               <div className="tw-flex tw-items-center tw-gap-3">
                  <div className={`tw-px-2 tw-py-1 tw-rounded tw-text-[10px] tw-font-bold ${successRate >= 90 ? 'tw-bg-green-50 tw-text-green-600' : successRate >= 70 ? 'tw-bg-yellow-50 tw-text-yellow-600' : 'tw-bg-red-50 tw-text-red-600'}`}>
                    {publishedTasks}/{totalFinishedTasks || '-'}
                  </div>
                  <span className="tw-text-slate-400 tw-text-[11px] tw-font-medium">
                    {totalFinishedTasks === 0 ? '暂无已完成任务' : '已完成任务统计'}
                  </span>
               </div>
            </div>
         </div>

         {/* Secondary Stats */}
         <div className="tw-col-span-12 lg:tw-col-span-8 tw-grid tw-grid-cols-3 tw-gap-6">
            {[
               { label: t('home.totalAccounts'), value: accounts.length, icon: Users, sub: t('home.connectedNodes') },
               { label: t('home.pendingQueue'), value: pendingTasks, icon: Clock, sub: t('home.awaitingRelay') },
               { label: t('home.failurePoints'), value: manualAccounts.length + manualTasks.length, icon: AlertTriangle, sub: t('home.actionRequired'), alert: true },
            ].map((stat, idx) => (
               <div key={idx} className="tw-p-8 tw-bg-white tw-border tw-border-black/[0.05] tw-rounded-[2.5rem] tw-transition-all hover:tw-border-black/20 shadow-premium">
                  <div className="tw-w-10 tw-h-10 tw-bg-slate-50 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-mb-8">
                     <stat.icon size={18} className={stat.alert ? 'tw-text-red-500' : 'tw-text-black'} />
                  </div>
                  <div className="tw-text-3xl tw-font-black tw-text-black tw-tracking-tight tw-mb-2">{stat.value}</div>
                  <div className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">{stat.label}</div>
                  <div className="tw-text-[10px] tw-text-slate-300 tw-mt-1">{stat.sub}</div>
               </div>
            ))}
         </div>
      </div>

      {/* 内容运营指标 */}
      <div className="tw-grid tw-grid-cols-12 tw-gap-6 tw-mb-12">
        {[
          { label: '今日生成', value: todayContents.length, icon: Sparkles, color: 'tw-text-violet-500', bg: 'tw-bg-violet-50' },
          { label: '待审核', value: pendingReviews, icon: Eye, color: 'tw-text-amber-500', bg: 'tw-bg-amber-50' },
          { label: '已批准', value: approvedContents, icon: FileText, color: 'tw-text-blue-500', bg: 'tw-bg-blue-50' },
          { label: '已发布', value: publishedTasks, icon: Send, color: 'tw-text-emerald-500', bg: 'tw-bg-emerald-50' },
        ].map((stat, idx) => (
          <div key={idx} className="tw-col-span-6 lg:tw-col-span-3 tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-shadow-sm hover:tw-shadow-md tw-transition-all">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
              <div className={`tw-w-9 tw-h-9 ${stat.bg} tw-rounded-lg tw-flex tw-items-center tw-justify-center`}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <span className="tw-text-2xl tw-font-black tw-text-slate-900">{stat.value}</span>
            </div>
            <span className="tw-text-[11px] tw-font-bold tw-text-slate-400">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Detail Analysis */}
      <div className="tw-grid tw-grid-cols-12 tw-gap-10">
         {/* Monitoring Panel */}
         <div className="tw-col-span-12 lg:tw-col-span-12">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-6 tw-px-2">
               <div className="tw-flex tw-items-center tw-gap-3">
                  <Layers size={16} className="tw-text-brand-accent" />
                  <h3 className="tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-black">{t('home.anomalyDetection')}</h3>
               </div>
               <MoreHorizontal size={16} className="tw-text-slate-300" />
            </div>
            <div className="tw-bg-white tw-border tw-border-black/[0.05] tw-rounded-[2.5rem] tw-p-8 shadow-premium">
               {manualAccounts.length ? (
                  <div className="tw-space-y-4">
                     {manualAccounts.slice(0, 4).map((account) => (
                        <div key={account?.id} className="tw-group tw-flex tw-items-center tw-gap-6 tw-p-4 tw-rounded-2xl hover:tw-bg-slate-50 tw-transition-all">
                           <div className="tw-w-12 tw-h-12 tw-bg-red-50 tw-text-red-500 tw-rounded-2xl tw-flex tw-items-center tw-justify-center">
                              <AlertTriangle size={20} />
                           </div>
                           <div className="tw-flex-1">
                              <div className="tw-text-sm tw-font-black tw-text-black">{account?.name}</div>
                              <div className="tw-text-[11px] tw-text-slate-400 tw-mt-1">{account?.manualActionReason || t('home.authTokenExpired')}</div>
                           </div>
                           <button className="tw-px-4 tw-py-2 tw-bg-slate-900 tw-text-white tw-text-[10px] tw-font-black tw-uppercase tw-rounded-lg tw-opacity-0 group-hover:tw-opacity-100 tw-transition-all">
                              {t('home.recover')}
                           </button>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="tw-h-[320px] tw-flex tw-flex-col tw-items-center tw-justify-center tw-opacity-10">
                     <CheckCircle2 size={64} className="tw-text-slate-900 tw-mb-6" />
                     <div className="tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest">{t('home.noAnomalies')}</div>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
