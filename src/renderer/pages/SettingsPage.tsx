import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SchedulerStatus } from '../../shared/types';
import { appApi } from '../api';

export function SettingsPage() {
  const { i18n, t } = useTranslation();
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [error, setError] = useState('');

  async function refresh() {
    setStatus(await appApi.scheduler.status());
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  async function start() {
    setError('');
    try {
      setStatus(await appApi.scheduler.start());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function stop() {
    setError('');
    try {
      setStatus(await appApi.scheduler.stop());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function changeLanguage(language: string) {
    localStorage.setItem('language', language);
    await i18n.changeLanguage(language);
  }

  return (
    <section className="panel">
      <h2>{t('settings.title')}</h2>
      <p className="muted">{t('settings.description')}</p>
      {error && <p className="error-text">{error}</p>}
      <label className="language-select">
        {t('settings.language')}
        <select value={i18n.language} onChange={(event) => void changeLanguage(event.target.value)}>
          <option value="zh">{t('settings.chinese')}</option>
          <option value="en">{t('settings.english')}</option>
        </select>
      </label>
      <div className="status-grid">
        <span>{t('settings.autoWorker')}</span>
        <strong>{status?.running ? t('settings.running') : t('settings.stopped')}</strong>
        <span>{t('settings.interval')}</span>
        <strong>{status ? t('settings.seconds', { count: Math.round(status.intervalMs / 1000) }) : '-'}</strong>
        <span>{t('settings.lastRun')}</span>
        <strong>{status?.lastRunAt ? new Date(status.lastRunAt).toLocaleString() : '-'}</strong>
        <span>{t('settings.lastMessage')}</span>
        <strong>{status?.lastMessage ?? '-'}</strong>
      </div>
      <div className="button-row">
        <button type="button" onClick={() => void start()}>
          {t('settings.startWorker')}
        </button>
        <button className="secondary-button" type="button" onClick={() => void stop()}>
          {t('common.stop')}
        </button>
        <button className="secondary-button" type="button" onClick={() => void refresh()}>
          {t('common.refresh')}
        </button>
      </div>
    </section>
  );
}
