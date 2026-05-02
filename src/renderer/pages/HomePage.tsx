import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account, DistributionTask } from '../../shared/types';
import { appApi } from '../api';

export function HomePage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<DistributionTask[]>([]);

  useEffect(() => {
    async function load() {
      const [nextAccounts, nextTasks] = await Promise.all([appApi.accounts.list(), appApi.distributionTasks.list()]);
      setAccounts(nextAccounts);
      setTasks(nextTasks);
    }

    void load();
  }, []);

  const pendingTasks = tasks.filter((task) => task.status === 'queued').length;
  const manualAccounts = accounts.filter((account) => account.status !== 'active');
  const manualTasks = tasks.filter((task) => task.status === 'needs_manual_action' || task.status === 'failed').slice(0, 5);
  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('home.title')}</h2>
          <p className="muted">{t('home.description')}</p>
        </div>
      </div>
      <div className="quick-stats">
        <article>
          <span>{t('home.accounts')}</span>
          <strong>{accounts.length}</strong>
        </article>
        <article>
          <span>{t('home.pending')}</span>
          <strong>{pendingTasks}</strong>
        </article>
        <article>
          <span>{t('home.manual')}</span>
          <strong>{manualAccounts.length + manualTasks.length}</strong>
        </article>
      </div>
      <div className="handoff-grid">
        <section>
          <h3>{t('home.manualAccounts')}</h3>
          {manualAccounts.slice(0, 5).length ? manualAccounts.slice(0, 5).map((account) => (
            <article key={account.id}>
              <span className={`badge ${account.status}`}>{account.status}</span>
              <strong>{account.name}</strong>
              <p className="truncate" title={account.manualActionReason || account.healthMessage}>
                {account.manualActionReason || account.healthMessage || '-'}
              </p>
            </article>
          )) : <p className="muted">{t('home.noManualAccounts')}</p>}
        </section>
        <section>
          <h3>{t('home.manualTasks')}</h3>
          {manualTasks.length ? manualTasks.map((task) => (
            <article key={task.id}>
              <span className={`badge ${task.status}`}>{t(`common.statuses.${task.status}`)}</span>
              <strong>{accountsById.get(task.accountId)?.name ?? task.accountId}</strong>
              <p className="truncate" title={task.lastError || String(task.platformPayload.content ?? '')}>
                {task.lastError || String(task.platformPayload.content ?? '-')}
              </p>
            </article>
          )) : <p className="muted">{t('home.noManualTasks')}</p>}
        </section>
      </div>
      <div className="workflow-strip">
        <span>{t('home.stepContent')}</span>
        <span>{t('home.stepDistribute')}</span>
        <span>{t('home.stepTrack')}</span>
      </div>
    </section>
  );
}
