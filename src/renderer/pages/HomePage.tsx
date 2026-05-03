import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Zap, 
  CheckCircle2, 
  TrendingUp, 
  Activity,
  Calendar,
  Layers,
  MoreHorizontal
} from 'lucide-react';
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

  const pendingTasks = (tasks || []).filter((task) => task?.status === 'queued').length;
  const manualAccounts = (accounts || []).filter((account) => account?.status !== 'active');
  const manualTasks = (tasks || []).filter((task) => task?.status === 'needs_manual_action' || task?.status === 'failed').slice(0, 5);

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
         {/* Main Vital Card - Light Style */}
         <div className="tw-col-span-12 lg:tw-col-span-4 tw-p-8 tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2.5rem] tw-text-slate-900 tw-relative tw-overflow-hidden tw-shadow-xl shadow-premium">
            <div className="tw-absolute tw-top-0 tw-right-0 tw-p-8 tw-opacity-5 tw-text-brand-500">
               <TrendingUp size={120} />
            </div>
            <div className="tw-relative tw-z-10">
               <div className="tw-flex tw-items-center tw-gap-2 tw-mb-10">
                  <Activity size={16} className="tw-text-brand-500" />
                  <span className="tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">{t('home.activeVelocity')}</span>
               </div>
               <div className="tw-text-6xl tw-font-black tw-tracking-tighter tw-mb-4 tw-text-slate-900">98.2<span className="tw-text-2xl tw-text-slate-300">%</span></div>
               <div className="tw-flex tw-items-center tw-gap-3">
                  <div className="tw-px-2 tw-py-1 tw-bg-green-50 tw-rounded tw-text-[10px] tw-font-bold tw-text-green-600">+4.2%</div>
                  <span className="tw-text-slate-400 tw-text-[11px] tw-font-medium">{t('home.systemOptimized')}</span>
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
