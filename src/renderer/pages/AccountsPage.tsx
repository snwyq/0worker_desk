import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account, BrowserMode } from '../../shared/types';
import { appApi } from '../api';

const browserModes: BrowserMode[] = ['manual_port', 'manual_ws', 'adspower', 'bitbrowser', 'gologin'];

export function AccountsPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [browserMode, setBrowserMode] = useState<BrowserMode>('manual_port');
  const [providerProfileId, setProviderProfileId] = useState('');
  const [wsEndpoint, setWsEndpoint] = useState('');
  const [debuggingPort, setDebuggingPort] = useState('9222');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');

  async function loadAccounts() {
    setAccounts(await appApi.accounts.list());
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await appApi.accounts.create({
        name,
        platform: 'weibo',
        browserMode,
        providerProfileId,
        wsEndpoint,
        debuggingPort: browserMode === 'manual_port' ? Number(debuggingPort) : null,
        status: 'active',
        notes,
      });

      setName('');
      setProviderProfileId('');
      setWsEndpoint('');
      setDebuggingPort('9222');
      setNotes('');
      await loadAccounts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function testConnection(account: Account) {
    setError('');
    setConnectionMessage(t('accounts.testing', { name: account.name }));

    try {
      const result = await appApi.accounts.testConnection(account.id);
      setConnectionMessage(
        result.ok
          ? t('accounts.connected', { message: result.message, url: result.currentUrl ?? 'unknown' })
          : t('accounts.failed', { message: result.message }),
      );
    } catch (cause) {
      setConnectionMessage('');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('accounts.title')}</h2>
          <p className="muted">{t('accounts.description')}</p>
        </div>
      </div>

      <form className="form-grid" onSubmit={createAccount}>
        <label>
          {t('accounts.accountName')}
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          {t('accounts.browserMode')}
          <select value={browserMode} onChange={(event) => setBrowserMode(event.target.value as BrowserMode)}>
            {browserModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('accounts.providerProfileId')}
          <input
            placeholder={t('accounts.providerProfilePlaceholder')}
            value={providerProfileId}
            onChange={(event) => setProviderProfileId(event.target.value)}
          />
        </label>
        <label>
          {t('accounts.debuggingPort')}
          <input value={debuggingPort} onChange={(event) => setDebuggingPort(event.target.value)} inputMode="numeric" />
        </label>
        <label>
          {t('accounts.wsEndpoint')}
          <input value={wsEndpoint} onChange={(event) => setWsEndpoint(event.target.value)} />
        </label>
        <label className="wide">
          {t('accounts.notes')}
          <input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button type="submit">{t('accounts.addAccount')}</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {connectionMessage && <p className="info-text">{connectionMessage}</p>}

      <div className="table">
        <div className="table-row table-head">
          <span>{t('accounts.accountName')}</span>
          <span>{t('accounts.mode')}</span>
          <span>{t('common.status')}</span>
          <span>{t('common.connection')}</span>
          <span>{t('common.action')}</span>
        </div>
        {accounts.map((account) => (
          <div className="table-row" key={account.id}>
            <span>{account.name}</span>
            <span>{account.browserMode}</span>
            <span className={`badge ${account.status}`}>{account.status}</span>
            <span>
              {account.browserMode === 'adspower'
                ? account.providerProfileId
                : account.browserMode === 'manual_port'
                  ? account.debuggingPort
                  : account.wsEndpoint || 'not set'}
            </span>
            <span>
              <button className="inline-button" type="button" onClick={() => void testConnection(account)}>
                {t('accounts.test')}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
