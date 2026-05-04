import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account, PublishRun } from '../../shared/types';
import { appApi } from '../api';

export function RunsPage() {
  const { t } = useTranslation();
  const [runs, setRuns] = useState<PublishRun[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  async function load() {
    const [nextRuns, nextAccounts] = await Promise.all([appApi.publishRuns.list(), appApi.accounts.list()]);
    setRuns(nextRuns);
    setAccounts(nextAccounts);
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="tw-space-y-8 tw-animate-fade-in tw-pb-20">
      {/* Header */}
      <div className="tw-flex tw-flex-col xl:tw-flex-row tw-items-start xl:tw-items-center tw-justify-between tw-gap-6 tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
            <div className="tw-w-2 tw-h-2 tw-bg-brand-500 tw-rounded-full" />
            <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.3em]">Execution Logs</span>
          </div>
          <h1 className="tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">{t('runs.title')}</h1>
          <p className="tw-text-slate-500 tw-text-sm tw-mt-2 tw-font-medium">
            {t('runs.description')}
          </p>
        </div>

        <div className="tw-flex tw-items-center tw-gap-3">
          <button onClick={() => void load()} className="tw-px-4 tw-py-2.5 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-700 tw-text-xs tw-font-bold tw-rounded-xl hover:tw-bg-slate-50 tw-transition-all tw-flex tw-items-center tw-gap-2" type="button">
            {t('common.refresh')}
          </button>
        </div>
      </div>

      <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-shadow-sm tw-overflow-hidden">
        <div className="tw-overflow-x-auto">
          <table className="tw-w-full tw-text-left tw-border-collapse">
            <thead>
              <tr className="tw-border-b tw-border-slate-100">
                <th className="tw-py-4 tw-px-6 tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-bg-slate-50/50">{t('runs.platform')}</th>
                <th className="tw-py-4 tw-px-6 tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-bg-slate-50/50">{t('common.account')}</th>
                <th className="tw-py-4 tw-px-6 tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-bg-slate-50/50">{t('common.status')}</th>
                <th className="tw-py-4 tw-px-6 tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-bg-slate-50/50">{t('runs.finishedAt')}</th>
                <th className="tw-py-4 tw-px-6 tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-bg-slate-50/50">{t('runs.message')}</th>
              </tr>
            </thead>
            <tbody className="tw-divide-y tw-divide-slate-50">
              {runs.map((run) => {
                const isSuccess = run.status === 'published';
                const isFailed = run.status === 'failed';
                return (
                  <tr key={run.id} className="hover:tw-bg-slate-50/50 tw-transition-colors">
                    <td className="tw-py-4 tw-px-6 tw-text-sm tw-font-bold tw-text-slate-900">{run.platform}</td>
                    <td className="tw-py-4 tw-px-6 tw-text-sm tw-font-medium tw-text-slate-600">
                      {accounts.find((account) => account.id === run.accountId)?.name ?? run.accountId}
                    </td>
                    <td className="tw-py-4 tw-px-6">
                      <span className={`tw-px-2 tw-py-1 tw-rounded-md tw-text-[10px] tw-font-black ${isSuccess ? 'tw-bg-emerald-50 tw-text-emerald-600' : isFailed ? 'tw-bg-red-50 tw-text-red-600' : 'tw-bg-slate-100 tw-text-slate-500'}`}>
                        {t(`common.statuses.${run.status}`)}
                      </span>
                    </td>
                    <td className="tw-py-4 tw-px-6 tw-text-sm tw-font-medium tw-text-slate-500 tw-whitespace-nowrap">
                      {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}
                    </td>
                    <td className="tw-py-4 tw-px-6 tw-text-sm tw-text-slate-600">
                      <div className="tw-max-w-md tw-truncate" title={run.message}>{run.message}</div>
                    </td>
                  </tr>
                );
              })}
              {!runs.length && (
                <tr>
                  <td colSpan={5} className="tw-py-12 tw-text-center tw-text-sm tw-text-slate-400">
                    暂无执行日志记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
