import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, Search, Plus, AlertCircle, CheckCircle2, Users, RefreshCw } from 'lucide-react';
import type { Account, AccountStatus, BrowserMode, Platform, PlatformCapabilities, PlatformCode } from '../../shared/types';
import { appApi } from '../api';
import { AccountCard } from '../components/AccountCard';

const browserModes: BrowserMode[] = ['manual_port', 'manual_ws', 'adspower', 'bitbrowser', 'gologin'];
const accountStatuses: AccountStatus[] = ['active', 'paused', 'needs_manual_action', 'login_expired', 'risk_blocked'];

export function AccountsPage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [enabledBrowserModes, setEnabledBrowserModes] = useState<string[]>(['adspower', 'manual_port', 'manual_ws']);
  
  // Form State
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<PlatformCode>('weibo');
  const [browserMode, setBrowserMode] = useState<BrowserMode>('adspower');
  const [providerProfileId, setProviderProfileId] = useState('');
  const [wsEndpoint, setWsEndpoint] = useState('');
  const [debuggingPort, setDebuggingPort] = useState('9222');
  const [status, setStatus] = useState<AccountStatus>('active');
  const [notes, setNotes] = useState('');
  
  const [error, setError] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  async function loadAccounts() {
    const [nextAccounts, nextPlatforms, nextCapabilities, nextSettings] = await Promise.all([
      appApi.accounts.list(),
      appApi.platforms.list(),
      appApi.platformCapabilities.list(),
      appApi.settings.list(),
    ]);
    setAccounts(nextAccounts);
    setPlatforms(nextPlatforms);
    setCapabilities(nextCapabilities);
    
    const enabledSetting = nextSettings.find(s => s.key === 'ui.enabledBrowserModes');
    if (enabledSetting) {
      const modes = enabledSetting.value.split(',').filter(Boolean);
      setEnabledBrowserModes(modes);
      // 如果当前模式不在启用列表中，自动切到第一个启用的
      if (modes.length > 0 && !modes.includes(browserMode)) {
        setBrowserMode(modes[0] as BrowserMode);
      }
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

      resetForm();
      setShowForm(false);
      await loadAccounts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setPlatform('weibo');
    setBrowserMode(enabledBrowserModes[0] as BrowserMode || 'adspower');
    setProviderProfileId('');
    setWsEndpoint('');
    setDebuggingPort('9222');
    setStatus('active');
    setNotes('');
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
      setTimeout(() => setConnectionMessage(''), 5000);
    } catch (cause) {
      setConnectionMessage('');
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(t('accounts.deleteConfirm', { name: account.name }))) return;
    try {
      await appApi.accounts.delete(account.id);
      await loadAccounts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function syncAdsPower() {
    if (isSyncing) return;
    setIsSyncing(true);
    setError('');
    try {
      const result = await appApi.accounts.syncAdsPower();
      if (result.ok) {
        setConnectionMessage(result.message);
        await loadAccounts();
        setTimeout(() => setConnectionMessage(''), 5000);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSyncing(false);
    }
  }

  async function openBrowser(account: Account) {
    setError('');
    setConnectionMessage(t('accounts.starting', { name: account.name }) || `Starting browser for ${account.name}...`);
    try {
      const result = await appApi.accounts.openBrowser(account.id);
      if (result.ok) {
        setConnectionMessage(t('accounts.started', { name: account.name }) || `Browser for ${account.name} is ready.`);
        await loadAccounts();
      } else {
        setError(result.message);
      }
      setTimeout(() => setConnectionMessage(''), 5000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setConnectionMessage('');
    }
  }

  return (
    <div className="tw-space-y-6">
      {/* Search & Filter Bar */}
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4">
        <div className="tw-flex tw-items-center tw-gap-2">
          <button className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-white tw-border tw-border-slate-200 tw-rounded-xl tw-text-sm tw-font-medium tw-text-slate-600 hover:tw-bg-slate-50 tw-transition-all">
            <Filter size={16} />
            筛选平台
          </button>
          <button 
            onClick={syncAdsPower}
            disabled={isSyncing}
            className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-white tw-border tw-border-slate-200 tw-rounded-xl tw-text-sm tw-font-medium tw-text-slate-600 hover:tw-bg-slate-50 tw-transition-all disabled:tw-opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? 'tw-animate-spin' : ''} />
            {isSyncing ? '同步中...' : '同步 AdsPower'}
          </button>
          <div className="tw-flex tw-gap-1">
            {['weibo', 'xiaohongshu', 'douyin'].map((p) => (
              <button key={p} className="tw-px-3 tw-py-1 tw-bg-slate-100 tw-text-slate-500 tw-rounded-lg tw-text-[12px] tw-font-bold hover:tw-bg-brand-50 hover:tw-text-brand-600 tw-transition-all">
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        
        {!showForm && (
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-brand-600 tw-text-white tw-rounded-xl tw-text-sm tw-font-bold tw-shadow-lg tw-shadow-brand-100 hover:tw-bg-brand-700 tw-transition-all active:tw-scale-95"
          >
            <Plus size={18} />
            添加新账号
          </button>
        )}
      </div>

      {/* Form Section (Conditional) */}
      {showForm && (
        <div className="tw-bg-white tw-rounded-2xl tw-p-6 tw-border tw-border-brand-100 tw-shadow-xl tw-shadow-brand-50 tw-animate-fade-in">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
            <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">
              {editingId ? '编辑账号信息' : '配置新账号'}
            </h2>
            <button 
              onClick={() => setShowForm(false)}
              className="tw-text-slate-400 hover:tw-text-slate-600"
            >
              取消
            </button>
          </div>
          
          <form className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6" onSubmit={createAccount}>
            <div className="tw-space-y-1.5">
              <label className="tw-text-[13px] tw-font-bold tw-text-slate-500 tw-ml-1">账号显示名称</label>
              <input 
                className="tw-w-full tw-px-4 tw-py-2.5 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-ring-2 focus:tw-ring-brand-500/20 tw-transition-all"
                value={name} onChange={(e) => setName(e.target.value)} required 
              />
            </div>
            
            <div className="tw-space-y-1.5">
              <label className="tw-text-[13px] tw-font-bold tw-text-slate-500 tw-ml-1">所属平台</label>
              <select 
                className="tw-w-full tw-px-4 tw-py-2.5 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-ring-2 focus:tw-ring-brand-500/20 tw-transition-all"
                value={platform} onChange={(e) => setPlatform(e.target.value as PlatformCode)}
              >
                {platforms.map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            </div>

            <div className="tw-space-y-1.5">
              <label className="tw-text-[13px] tw-font-bold tw-text-slate-500 tw-ml-1">指纹浏览器类型</label>
              <select 
                className="tw-w-full tw-px-4 tw-py-2.5 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-ring-2 focus:tw-ring-brand-500/20 tw-transition-all"
                value={browserMode} onChange={(e) => setBrowserMode(e.target.value as BrowserMode)}
              >
                {enabledBrowserModes.includes('adspower') && <option value="adspower">AdsPower</option>}
                {enabledBrowserModes.includes('manual_port') && <option value="manual_port">手动调试端口 (Chrome)</option>}
                {enabledBrowserModes.includes('manual_ws') && <option value="manual_ws">手动 WebSocket</option>}
              </select>
            </div>

            <div className="tw-space-y-1.5">
              <label className="tw-text-[13px] tw-font-bold tw-text-slate-500 tw-ml-1">指纹浏览器 ID</label>
              <input 
                placeholder="例如：j6k8l9m"
                className="tw-w-full tw-px-4 tw-py-2.5 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-ring-2 focus:tw-ring-brand-500/20 tw-transition-all"
                value={providerProfileId} onChange={(e) => setProviderProfileId(e.target.value)}
              />
            </div>

            <div className="tw-col-span-1 md:tw-col-span-2 tw-space-y-1.5">
              <label className="tw-text-[13px] tw-font-bold tw-text-slate-500 tw-ml-1">备注信息</label>
              <input 
                className="tw-w-full tw-px-4 tw-py-2.5 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-ring-2 focus:tw-ring-brand-500/20 tw-transition-all"
                value={notes} onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="tw-col-span-full tw-flex tw-justify-end tw-gap-3 tw-pt-2">
              <button 
                type="submit"
                className="tw-bg-slate-900 tw-text-white tw-px-8 tw-py-2.5 tw-rounded-xl tw-font-bold tw-text-sm hover:tw-bg-slate-800 tw-transition-all"
              >
                {editingId ? '保存更改' : '立即添加'}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="tw-mt-4 tw-p-3 tw-bg-red-50 tw-text-red-600 tw-text-xs tw-rounded-lg tw-flex tw-items-center tw-gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {connectionMessage && (
        <div className="tw-p-4 tw-bg-brand-50 tw-text-brand-700 tw-text-sm tw-rounded-2xl tw-border tw-border-brand-100 tw-flex tw-items-center tw-gap-3 tw-animate-fade-in">
          <CheckCircle2 size={18} className="tw-text-brand-500" />
          {connectionMessage}
        </div>
      )}

      {/* Account Grid */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
        {accounts.map((account) => (
          <AccountCard 
            key={account.id}
            account={account}
            platform={platforms.find(p => p.code === account.platform)}
            onTest={testConnection}
            onOpenBrowser={openBrowser}
            onEdit={(acc) => {
              setEditingId(acc.id);
              setName(acc.name);
              setPlatform(acc.platform);
              setBrowserMode(acc.browserMode);
              setProviderProfileId(acc.providerProfileId);
              setWsEndpoint(acc.wsEndpoint);
              setDebuggingPort(acc.debuggingPort ? String(acc.debuggingPort) : '9222');
              setStatus(acc.status);
              setNotes(acc.notes);
              setShowForm(true);
            }}
            onDelete={deleteAccount}
          />
        ))}
        
        {accounts.length === 0 && !showForm && (
          <div className="tw-col-span-full tw-py-20 tw-text-center tw-bg-white tw-rounded-3xl tw-border tw-border-dashed tw-border-slate-200">
            <div className="tw-w-16 tw-h-16 tw-bg-slate-50 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-4 tw-text-slate-300">
              <Users size={32} />
            </div>
            <h3 className="tw-text-slate-900 tw-font-bold">暂无账号数据</h3>
            <p className="tw-text-slate-400 tw-text-sm tw-mt-1">点击右上角按钮开始添加您的第一个账号</p>
          </div>
        )}
      </div>
    </div>
  );
}
