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
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('runs.title')}</h2>
          <p className="muted">{t('runs.description')}</p>
        </div>
        <button type="button" onClick={() => void load()}>{t('common.refresh')}</button>
      </div>
      <div className="table">
        <div className="table-row runs table-head">
          <span>{t('runs.platform')}</span>
          <span>{t('common.account')}</span>
          <span>{t('common.status')}</span>
          <span>{t('runs.finishedAt')}</span>
          <span>{t('runs.message')}</span>
        </div>
        {runs.map((run) => (
          <div className="table-row runs" key={run.id}>
            <span>{run.platform}</span>
            <span>{accounts.find((account) => account.id === run.accountId)?.name ?? run.accountId}</span>
            <span className={`badge ${run.status}`}>{t(`common.statuses.${run.status}`)}</span>
            <span>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}</span>
            <span className="truncate" title={run.message}>{run.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
