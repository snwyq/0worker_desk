import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSetting, SchedulerStatus, UpdateCheckResult, UpdateConfig } from '../../shared/types';
import { appApi } from '../api';

export function SettingsPage() {
  const { i18n, t } = useTranslation();
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig | null>(null);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function refresh() {
    const [nextStatus, nextSettings, nextUpdateStatus] = await Promise.all([
      appApi.scheduler.status(),
      appApi.settings.list(),
      appApi.updates.status(),
    ]);
    setStatus(nextStatus);
    setSettings(nextSettings);
    setUpdateConfig(nextUpdateStatus.config);
    setDraftValues(Object.fromEntries(nextSettings.map((setting) => [setting.key, setting.value])));
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
    await appApi.settings.set('ui.language', language);
    await i18n.changeLanguage(language);
  }

  async function saveSetting(key: string) {
    setError('');
    try {
      setSettings(await appApi.settings.set(key, draftValues[key] ?? ''));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function checkUpdates() {
    setError('');
    setUpdateResult(null);
    try {
      setUpdateResult(await appApi.updates.check());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
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
      <h3>{t('settings.updates')}</h3>
      <div className="status-grid">
        <span>{t('settings.currentVersion')}</span>
        <strong>{updateResult?.currentVersion ?? '-'}</strong>
        <span>{t('settings.updateProvider')}</span>
        <strong>{updateConfig ? `${updateConfig.provider}:${updateConfig.owner || '-'} / ${updateConfig.repo || '-'}` : '-'}</strong>
        <span>{t('settings.updateStatus')}</span>
        <strong>{updateConfig?.canCheck ? t('settings.readyToCheck') : updateConfig?.reason ?? '-'}</strong>
        <span>{t('settings.updateMessage')}</span>
        <strong>{updateResult?.message ?? '-'}</strong>
      </div>
      <div className="button-row">
        <button type="button" onClick={() => void checkUpdates()}>{t('settings.checkUpdates')}</button>
      </div>
      <h3>{t('settings.publicConfig')}</h3>
      <div className="settings-table">
        {settings.map((setting) => (
          <div className="setting-row" key={setting.key}>
            <code>{setting.key}</code>
            <input
              aria-label={setting.description || setting.key}
              value={draftValues[setting.key] ?? ''}
              onChange={(event) => setDraftValues((current) => ({ ...current, [setting.key]: event.target.value }))}
            />
            <button className="inline-button" type="button" onClick={() => void saveSetting(setting.key)}>
              {t('settings.saveConfig')}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
