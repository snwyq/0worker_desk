import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, Search, Plus, AlertCircle, CheckCircle2, Users, RefreshCw, Command, ChevronDown } from 'lucide-react';
import type { Account, AccountStatus, BrowserMode, Platform, PlatformCapabilities, PlatformCode } from '../../shared/types';
import { appApi } from '../api';
import { AccountCard } from '../components/AccountCard';

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
          name, browserMode, providerProfileId, wsEndpoint,
          debuggingPort: browserMode === 'manual_port' ? Number(debuggingPort) : null,
          status, notes,
        });
      } else {
        await appApi.accounts.create({
          name, platform, browserMode, providerProfileId, wsEndpoint,
          debuggingPort: browserMode === 'manual_port' ? Number(debuggingPort) : null,
          status: 'active', notes,
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
    setConnectionMessage(`Testing connection for ${account.name}...`);
    try {
      const result = await appApi.accounts.testConnection(account.id);
      setConnectionMessage(result.ok ? `Connected: ${result.message}` : `Failed: ${result.message}`);
      setTimeout(() => setConnectionMessage(''), 5000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(`Delete ${account.name}?`)) return;
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
    try {
      const result = await appApi.accounts.syncAdsPower();
      if (result.ok) {
        setConnectionMessage(result.message);
        await loadAccounts();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSyncing(false);
    }
  }

  async function openBrowser(account: Account) {
    setConnectionMessage(`Spawning ${account.name}...`);
    try {
      const result = await appApi.accounts.openBrowser(account.id);
      if (result.ok) {
        setConnectionMessage(`Instance ${account.name} online.`);
        await loadAccounts();
      } else {
        setError(result.message);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in">
      {/* Header Section */}
      <div className="tw-flex tw-items-end tw-justify-between tw-mb-12 tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
           <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
              <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.4em]">Node Management</span>
           </div>
           <h1 className="tw-text-4xl tw-font-black tw-text-slate-900 tw-tracking-tight">账号矩阵</h1>
        </div>
        
        <div className="tw-flex tw-items-center tw-gap-3">
           <button 
             onClick={syncAdsPower}
             disabled={isSyncing}
             className="tw-px-4 tw-py-2.5 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-600 tw-text-[11px] tw-font-bold tw-rounded-xl hover:tw-bg-slate-50 tw-transition-all tw-flex tw-items-center tw-gap-2 shadow-sm"
           >
              <RefreshCw size={14} className={isSyncing ? 'tw-animate-spin' : ''} />
              Sync AdsPower
           </button>
           <button 
             onClick={() => { resetForm(); setShowForm(true); }}
             className="tw-px-6 tw-py-2.5 tw-bg-brand-500 tw-text-white tw-text-[11px] tw-font-black tw-uppercase tw-tracking-widest tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-shadow-xl tw-shadow-brand-500/20 tw-flex tw-items-center tw-gap-2"
           >
              <Plus size={16} />
              Register New Node
           </button>
        </div>
      </div>

      {/* Grid Toolbar */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-10 tw-px-1">
         <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-white tw-border tw-border-slate-100 tw-rounded-xl tw-cursor-pointer hover:tw-border-brand-200 tw-transition-all shadow-sm">
               <Filter size={14} className="tw-text-slate-400" />
               <span className="tw-text-[11px] tw-font-bold tw-text-slate-600">All Platforms</span>
               <ChevronDown size={14} className="tw-text-slate-300" />
            </div>
            <div className="tw-h-4 tw-w-[1px] tw-bg-slate-200" />
            <div className="tw-flex tw-gap-4">
               {['WEIBO', 'XHS', 'DOUYIN'].map(p => (
                 <span key={p} className="tw-text-[10px] tw-font-black tw-text-slate-400 hover:tw-text-brand-500 tw-cursor-pointer tw-transition-colors">{p}</span>
               ))}
            </div>
         </div>
      </div>

      {/* Form Overlay */}
      {showForm && (
        <div className="tw-fixed tw-inset-0 tw-z-[100] tw-bg-slate-900/10 tw-backdrop-blur-md tw-flex tw-items-center tw-justify-center tw-p-6">
           <div className="tw-w-full tw-max-w-3xl tw-bg-white tw-border tw-border-slate-100 tw-rounded-[3rem] tw-shadow-2xl tw-overflow-hidden tw-animate-slide-up">
              <div className="tw-p-10 tw-border-b tw-border-slate-50 tw-flex tw-items-center tw-justify-between">
                 <h2 className="tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-900">
                    {editingId ? 'Edit Configuration' : 'Register Service Node'}
                 </h2>
                 <button onClick={() => setShowForm(false)} className="tw-p-2 tw-text-slate-400 hover:tw-text-slate-900 tw-transition-colors">
                    Close
                 </button>
              </div>
              <form className="tw-p-10 tw-space-y-10" onSubmit={createAccount}>
                 <div className="tw-grid tw-grid-cols-2 tw-gap-x-12 tw-gap-y-8">
                    <div className="tw-space-y-2">
                       <label className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">Node Name</label>
                       <input 
                         className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none tw-transition-all"
                         value={name} onChange={(e) => setName(e.target.value)} required 
                       />
                    </div>
                    <div className="tw-space-y-2">
                       <label className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">Platform</label>
                       <select 
                         className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none tw-transition-all tw-appearance-none"
                         value={platform} onChange={(e) => setPlatform(e.target.value as PlatformCode)}
                       >
                         {platforms.map((item) => (
                           <option key={item.code} value={item.code}>{item.name}</option>
                         ))}
                       </select>
                    </div>
                    <div className="tw-space-y-2">
                       <label className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">Engine Mode</label>
                       <select 
                         className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none tw-transition-all tw-appearance-none"
                         value={browserMode} onChange={(e) => setBrowserMode(e.target.value as BrowserMode)}
                       >
                         {enabledBrowserModes.includes('adspower') && <option value="adspower">AdsPower (Pro)</option>}
                         {enabledBrowserModes.includes('manual_port') && <option value="manual_port">Manual Debug</option>}
                         {enabledBrowserModes.includes('manual_ws') && <option value="manual_ws">WebSocket</option>}
                       </select>
                    </div>
                    <div className="tw-space-y-2">
                       <label className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">Profile ID</label>
                       <input 
                         placeholder="e.g. j6k8l9m"
                         className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none tw-transition-all"
                         value={providerProfileId} onChange={(e) => setProviderProfileId(e.target.value)}
                       />
                    </div>
                 </div>
                 
                 <div className="tw-flex tw-justify-end tw-pt-6">
                    <button 
                      type="submit"
                      className="tw-px-10 tw-py-3 tw-bg-slate-900 tw-text-white tw-text-[11px] tw-font-black tw-uppercase tw-tracking-widest tw-rounded-full hover:tw-bg-slate-800 tw-transition-all shadow-lg"
                    >
                      {editingId ? 'Save Configuration' : 'Initialize Node'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Account Grid */}
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-8">
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
      </div>
    </div>
  );
}
