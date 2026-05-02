import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account, AccountStatus, BrowserMode, Platform, PlatformCapabilities, PlatformCode } from '../../shared/types';
import { appApi } from '../api';

const browserModes: BrowserMode[] = ['manual_port', 'manual_ws', 'adspower', 'bitbrowser', 'gologin'];
const accountStatuses: AccountStatus[] = ['active', 'paused', 'needs_manual_action', 'login_expired', 'risk_blocked'];

export function AccountsPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<PlatformCode>('weibo');
  const [browserMode, setBrowserMode] = useState<BrowserMode>('manual_port');
  const [providerProfileId, setProviderProfileId] = useState('');
  const [wsEndpoint, setWsEndpoint] = useState('');
  const [debuggingPort, setDebuggingPort] = useState('9222');
  const [status, setStatus] = useState<AccountStatus>('active');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');

  async function loadAccounts() {
    const [nextAccounts, nextPlatforms, nextCapabilities] = await Promise.all([
      appApi.accounts.list(),
      appApi.platforms.list(),
      appApi.platformCapabilities.list(),
    ]);
    setAccounts(nextAccounts);
    setPlatforms(nextPlatforms);
    setCapabilities(nextCapabilities);
    if (!nextPlatforms.find((item) => item.code === platform) && nextPlatforms[0]) {
      setPlatform(nextPlatforms[0].code);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      if (editingId) {
        await appApi.accounts.update(editingId, {
          name,
          browserMode,
          providerProfileId,
          wsEndpoint,
          debuggingPort: browserMode === 'manual_port' ? Number(debuggingPort) : null,
          status,
          notes,
        });
      } else {
        await appApi.accounts.create({
          name,
          platform,
          browserMode,
          providerProfileId,
          wsEndpoint,
          debuggingPort: browserMode === 'manual_port' ? Number(debuggingPort) : null,
          status: 'active',
          notes,
        });
      }

      setEditingId(null);
      setName('');
      setProviderProfileId('');
      setWsEndpoint('');
      setDebuggingPort('9222');
      setStatus('active');
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

  function editAccount(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setPlatform(account.platform);
    setBrowserMode(account.browserMode);
    setProviderProfileId(account.providerProfileId);
    setWsEndpoint(account.wsEndpoint);
    setDebuggingPort(account.debuggingPort ? String(account.debuggingPort) : '');
    setStatus(account.status);
    setNotes(account.notes);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setPlatform('weibo');
    setBrowserMode('manual_port');
    setProviderProfileId('');
    setWsEndpoint('');
    setDebuggingPort('9222');
    setStatus('active');
    setNotes('');
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('accounts.title')}</h2>
          <p className="muted">{t('accounts.description')}</p>
        </div>
        <button type="button" onClick={resetForm}>{t('accounts.newAccount')}</button>
      </div>

      <form className="form-grid" onSubmit={createAccount}>
        <label>
          {t('accounts.accountName')}
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          {t('accounts.platform')}
          <select value={platform} onChange={(event) => setPlatform(event.target.value as PlatformCode)}>
            {platforms.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}{capabilities.find((capability) => capability.platform === item.code)?.implemented ? '' : ` (${t('accounts.planned')})`}
              </option>
            ))}
          </select>
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
          {t('common.status')}
          <select value={status} onChange={(event) => setStatus(event.target.value as AccountStatus)}>
            {accountStatuses.map((item) => (
              <option key={item} value={item}>
                {t(`common.statuses.${item}`)}
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
        <button type="submit">{editingId ? t('accounts.saveAccount') : t('accounts.addAccount')}</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {connectionMessage && <p className="info-text">{connectionMessage}</p>}

      <div className="table">
        <div className="table-row table-head">
          <span>{t('accounts.accountName')}</span>
          <span>{t('accounts.platform')}</span>
          <span>{t('accounts.mode')}</span>
          <span>{t('common.status')}</span>
          <span>{t('accounts.health')}</span>
          <span>{t('common.connection')}</span>
          <span>{t('common.action')}</span>
        </div>
        {accounts.map((account) => (
          <div className="table-row" key={account.id}>
            <span>{account.name}</span>
            <span>
              {platforms.find((item) => item.code === account.platform)?.name ?? account.platform}
              {!capabilities.find((capability) => capability.platform === account.platform)?.implemented && (
                <span className="mini-tag">{t('accounts.planned')}</span>
              )}
            </span>
            <span>{account.browserMode}</span>
            <span className={`badge ${account.status}`}>{account.status}</span>
            <span className="truncate" title={account.manualActionReason || account.healthMessage}>
              {account.manualActionReason || account.healthMessage || '-'}
            </span>
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
              <button className="inline-button" type="button" onClick={() => editAccount(account)}>
                {t('accounts.edit')}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
