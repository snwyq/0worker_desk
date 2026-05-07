import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, Filter, Plus, RefreshCw, Search, Users } from 'lucide-react';
import type { Account, AccountStatus, BrowserMode, Platform, PlatformCode } from '../../shared/types';
import { appApi } from '../api';
import { AccountCard } from '../components/AccountCard';

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getDispatchPolicy(config: Record<string, unknown>) {
  const policy = config.dispatchPolicy;
  return policy && typeof policy === 'object' ? policy as Record<string, unknown> : {};
}

const browserModeLabel: Record<BrowserMode, string> = {
  adspower: 'AdsPower 指纹浏览器',
  bitbrowser: '比特浏览器',
  gologin: 'GoLogin',
  manual_port: 'Chrome 调试端口',
  manual_ws: '远程 WebSocket',
};

const statusOptions: { value: AccountStatus; label: string }[] = [
  { value: 'active', label: '运行中' },
  { value: 'paused', label: '暂停' },
  { value: 'needs_manual_action', label: '需人工处理' },
  { value: 'login_expired', label: '登录失效' },
  { value: 'risk_blocked', label: '风控拦截' },
];

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [enabledBrowserModes, setEnabledBrowserModes] = useState<BrowserMode[]>(['adspower', 'manual_port', 'manual_ws']);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<PlatformCode>('weibo');
  const [browserMode, setBrowserMode] = useState<BrowserMode>('adspower');
  const [providerProfileId, setProviderProfileId] = useState('');
  const [wsEndpoint, setWsEndpoint] = useState('');
  const [debuggingPort, setDebuggingPort] = useState('9222');
  const [status, setStatus] = useState<AccountStatus>('active');
  const [notes, setNotes] = useState('');
  const [activePluginCode, setActivePluginCode] = useState('maoxiaoxian');
  const [persona, setPersona] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [defaultReviewMode, setDefaultReviewMode] = useState('manual');
  const [autoPublish, setAutoPublish] = useState(false);

  const [error, setError] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  async function loadAccounts() {
    const [nextAccounts, nextPlatforms, nextSettings] = await Promise.all([
      appApi.accounts.list(),
      appApi.platforms.list(),
      appApi.settings.list(),
    ]);
    setAccounts(nextAccounts);
    setPlatforms(nextPlatforms);

    const enabledSetting = nextSettings.find((setting) => setting.key === 'ui.enabledBrowserModes');
    if (enabledSetting) {
      const modes = enabledSetting.value.split(',').filter(Boolean) as BrowserMode[];
      setEnabledBrowserModes(modes.length > 0 ? modes : ['adspower']);
      setBrowserMode((current) => modes.includes(current) ? current : (modes[0] || 'adspower'));
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchPlatform = platformFilter === 'all' || account.platform === platformFilter;
      const matchQuery = !query
        || account.name.toLowerCase().includes(query)
        || account.activePluginCode.toLowerCase().includes(query)
        || account.providerProfileId.toLowerCase().includes(query)
        || String(account.debuggingPort || '').includes(query);
      return matchPlatform && matchQuery;
    });
  }, [accounts, platformFilter, searchQuery]);

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const input = {
      name,
      browserMode,
      providerProfileId,
      wsEndpoint,
      debuggingPort: browserMode === 'manual_port' ? Number(debuggingPort) : null,
      status,
      notes,
      activePluginCode,
      aiConfigJson: {
        persona,
        forbiddenWords: forbiddenWords.split(',').map((word) => word.trim()).filter(Boolean),
        defaultReviewMode,
        dispatchPolicy: {
          autoPublish,
        },
      },
    };

    try {
      if (editingId) {
        await appApi.accounts.update(editingId, input);
      } else {
        await appApi.accounts.create({ ...input, platform });
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
    setBrowserMode(enabledBrowserModes[0] || 'adspower');
    setProviderProfileId('');
    setWsEndpoint('');
    setDebuggingPort('9222');
    setStatus('active');
    setNotes('');
    setActivePluginCode('maoxiaoxian');
    setPersona('');
    setForbiddenWords('');
    setDefaultReviewMode('manual');
    setAutoPublish(false);
  }

  function editAccount(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setPlatform(account.platform);
    setBrowserMode(account.browserMode);
    setProviderProfileId(account.providerProfileId);
    setWsEndpoint(account.wsEndpoint);
    setDebuggingPort(account.debuggingPort ? String(account.debuggingPort) : '9222');
    setStatus(account.status);
    setNotes(account.notes);
    setActivePluginCode(account.activePluginCode || 'maoxiaoxian');
    setPersona(typeof account.aiConfigJson.persona === 'string' ? account.aiConfigJson.persona : '');
    setForbiddenWords(getStringArray(account.aiConfigJson.forbiddenWords).join(','));
    setDefaultReviewMode(typeof account.aiConfigJson.defaultReviewMode === 'string' ? account.aiConfigJson.defaultReviewMode : 'manual');
    const dispatchPolicy = getDispatchPolicy(account.aiConfigJson);
    setAutoPublish(dispatchPolicy.autoPublish === true);
    setShowForm(true);
  }

  async function testConnection(account: Account) {
    setError('');
    setConnectionMessage(`正在检测 ${account.name} 的浏览器连接...`);
    try {
      const result = await appApi.accounts.testConnection(account.id);
      setConnectionMessage(result.ok ? `连接成功：${result.message}` : `连接失败：${result.message}`);
      setTimeout(() => setConnectionMessage(''), 5000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function deleteAccount(account: Account) {
    if (!window.confirm(`确认删除账号「${account.name}」吗？`)) return;
    try {
      await appApi.accounts.delete(account.id);
      await loadAccounts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function syncAdsPower() {
    if (isSyncing) return;
    setError('');
    setIsSyncing(true);
    try {
      const result = await appApi.accounts.syncAdsPower();
      if (result.ok) {
        setConnectionMessage(result.message);
        await loadAccounts();
      } else {
        setError(result.message);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSyncing(false);
    }
  }

  async function openBrowser(account: Account) {
    setError('');
    setConnectionMessage(`正在打开 ${account.name} 的浏览器环境...`);
    try {
      const result = await appApi.accounts.openBrowser(account.id);
      if (result.ok) {
        setConnectionMessage(`${account.name} 的浏览器环境已就绪。`);
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
      <div className="tw-flex tw-flex-col xl:tw-flex-row xl:tw-items-end xl:tw-justify-between tw-gap-6 tw-mb-10 tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
            <Users size={16} className="tw-text-brand-500" />
            <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.35em]">Account Persona</span>
          </div>
          <h1 className="tw-text-4xl tw-font-black tw-text-slate-900 tw-tracking-tight">账号矩阵</h1>
          <p className="tw-text-sm tw-text-slate-500 tw-mt-3">
            为每个微博号配置插件、人设、禁用表达、审核方式和调度策略，保证同一客户也能生成多种内容风格。
          </p>
        </div>

        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
          <button
            type="button"
            onClick={syncAdsPower}
            disabled={isSyncing}
            className="tw-px-4 tw-py-2.5 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-600 tw-text-[11px] tw-font-bold tw-rounded-xl hover:tw-bg-slate-50 tw-transition-all tw-flex tw-items-center tw-gap-2 tw-shadow-sm disabled:tw-opacity-60"
          >
            <RefreshCw size={14} className={isSyncing ? 'tw-animate-spin' : ''} />
            同步 AdsPower
          </button>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="tw-px-6 tw-py-2.5 tw-bg-brand-500 tw-text-white tw-text-[11px] tw-font-black tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-shadow-xl tw-shadow-brand-500/20 tw-flex tw-items-center tw-gap-2"
          >
            <Plus size={16} />
            新增账号
          </button>
        </div>
      </div>

      {(error || connectionMessage) && (
        <div className={`tw-mb-6 tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-p-4 tw-text-sm ${error ? 'tw-bg-red-50 tw-border-red-100 tw-text-red-600' : 'tw-bg-emerald-50 tw-border-emerald-100 tw-text-emerald-600'}`}>
          <AlertCircle size={18} className="tw-mt-0.5" />
          <span>{error || connectionMessage}</span>
        </div>
      )}

      <div className="tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center lg:tw-justify-between tw-gap-4 tw-mb-8">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
          <div className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-white tw-border tw-border-slate-100 tw-rounded-xl tw-shadow-sm">
            <Filter size={14} className="tw-text-slate-400" />
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
              className="tw-bg-transparent tw-text-[11px] tw-font-bold tw-text-slate-600 tw-outline-none"
            >
              <option value="all">全部平台</option>
              {platforms.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="tw-text-slate-300" />
          </div>
          <div className="tw-flex tw-gap-4">
            {platforms.slice(0, 5).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setPlatformFilter(item.code)}
                className="tw-text-[10px] tw-font-black tw-text-slate-400 hover:tw-text-brand-500 tw-transition-colors"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <label className="tw-flex tw-items-center tw-gap-2 tw-bg-white tw-border tw-border-slate-100 tw-rounded-xl tw-px-4 tw-py-2 tw-shadow-sm">
          <Search size={14} className="tw-text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索账号、插件或 Profile"
            className="tw-w-64 tw-bg-transparent tw-text-sm tw-outline-none"
          />
        </label>
      </div>

      {showForm && (
        <div className="tw-fixed tw-inset-0 tw-z-[100] tw-bg-slate-900/10 tw-backdrop-blur-md tw-flex tw-items-center tw-justify-center tw-p-6">
          <div className="tw-w-full tw-max-w-4xl tw-max-h-[90vh] tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-shadow-2xl tw-overflow-y-auto tw-animate-slide-up">
            <div className="tw-p-8 tw-border-b tw-border-slate-50 tw-flex tw-items-center tw-justify-between">
              <div>
                <h2 className="tw-text-xl tw-font-black tw-tracking-tight tw-text-slate-900">
                  {editingId ? '编辑账号配置' : '新增微博账号'}
                </h2>
                <p className="tw-text-xs tw-text-slate-400 tw-mt-1">账号配置会参与 Agent 生成、审核入池和调度发布。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-slate-400 hover:tw-text-slate-900 tw-transition-colors"
              >
                关闭
              </button>
            </div>
            <form className="tw-p-8 tw-space-y-8" onSubmit={saveAccount}>
              <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-x-10 tw-gap-y-6">
                <label className="tw-space-y-2">
                  <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">账号名称</span>
                  <input className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label className="tw-space-y-2">
                  <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">平台</span>
                  <select className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={platform} onChange={(event) => setPlatform(event.target.value as PlatformCode)} disabled={Boolean(editingId)}>
                    {platforms.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                  </select>
                </label>
                <label className="tw-space-y-2">
                  <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">浏览器模式</span>
                  <select className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={browserMode} onChange={(event) => setBrowserMode(event.target.value as BrowserMode)}>
                    {enabledBrowserModes.map((mode) => <option key={mode} value={mode}>{browserModeLabel[mode] || mode}</option>)}
                  </select>
                </label>
                <label className="tw-space-y-2">
                  <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">账号状态</span>
                  <select className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={status} onChange={(event) => setStatus(event.target.value as AccountStatus)}>
                    {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="tw-space-y-2">
                  <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">Profile ID</span>
                  <input className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={providerProfileId} onChange={(event) => setProviderProfileId(event.target.value)} placeholder="AdsPower/指纹浏览器档案 ID" />
                </label>
                <label className="tw-space-y-2">
                  <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">调试端口</span>
                  <input type="number" className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={debuggingPort} onChange={(event) => setDebuggingPort(event.target.value)} />
                </label>
                <label className="tw-space-y-2 md:tw-col-span-2">
                  <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">WebSocket 地址</span>
                  <input className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={wsEndpoint} onChange={(event) => setWsEndpoint(event.target.value)} placeholder="ws://127.0.0.1:9222/devtools/browser/..." />
                </label>
              </div>

              <div className="tw-border-t tw-border-slate-100 tw-pt-8 tw-space-y-6">
                <div>
                  <h3 className="tw-text-sm tw-font-black tw-text-slate-900">AI 内容策略</h3>
                  <p className="tw-text-xs tw-text-slate-400 tw-mt-1">这些规则会作为账号级上下文注入插件工作流，并约束审核池与调度池行为。</p>
                </div>
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-x-10 tw-gap-y-6">
                  <label className="tw-space-y-2">
                    <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">默认插件</span>
                    <input className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={activePluginCode} onChange={(event) => setActivePluginCode(event.target.value)} placeholder="maoxiaoxian" />
                  </label>
                  <label className="tw-space-y-2">
                    <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">默认审核</span>
                    <select className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={defaultReviewMode} onChange={(event) => setDefaultReviewMode(event.target.value)}>
                      <option value="manual">人工审核</option>
                      <option value="sample">抽样审核</option>
                      <option value="auto">低风险免审</option>
                    </select>
                  </label>
                  <label className="tw-space-y-2 md:tw-col-span-2">
                    <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">账号人设</span>
                    <textarea className="tw-w-full tw-min-h-24 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-2xl tw-p-4 tw-text-sm tw-font-medium focus:tw-border-brand-500 tw-outline-none tw-resize-none" value={persona} onChange={(event) => setPersona(event.target.value)} placeholder="例如：温柔但有观点，擅长把热点拆成生活化表达，适合微博女性成长内容。" />
                  </label>
                  <label className="tw-space-y-2 md:tw-col-span-2">
                    <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">禁用表达</span>
                    <input className="tw-w-full tw-bg-transparent tw-border-b tw-border-slate-100 tw-py-2 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none" value={forbiddenWords} onChange={(event) => setForbiddenWords(event.target.value)} placeholder="用英文逗号分隔，例如：绝对,稳赚,必然" />
                  </label>
                  <label className="tw-md:col-span-2 tw-flex tw-items-center tw-justify-between tw-gap-4 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-2xl tw-px-5 tw-py-4 md:tw-col-span-2">
                    <span>
                      <span className="tw-block tw-text-sm tw-font-black tw-text-slate-800">允许自动发布</span>
                      <span className="tw-block tw-text-xs tw-text-slate-400 tw-mt-1">关闭时内容只进入调度池，由运营手动发布或接管。</span>
                    </span>
                    <input type="checkbox" checked={autoPublish} onChange={(event) => setAutoPublish(event.target.checked)} className="tw-h-5 tw-w-5 tw-accent-brand-500" />
                  </label>
                  <label className="tw-space-y-2 md:tw-col-span-2">
                    <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">备注</span>
                    <textarea className="tw-w-full tw-min-h-20 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-2xl tw-p-4 tw-text-sm tw-font-medium focus:tw-border-brand-500 tw-outline-none tw-resize-none" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="记录客户约定、发布时间偏好、禁忌主题等。" />
                  </label>
                </div>
              </div>

              <div className="tw-flex tw-justify-end tw-gap-3 tw-pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="tw-px-6 tw-py-3 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-600 tw-text-[11px] tw-font-black tw-rounded-full hover:tw-bg-slate-50 tw-transition-all">
                  取消
                </button>
                <button type="submit" className="tw-px-10 tw-py-3 tw-bg-slate-900 tw-text-white tw-text-[11px] tw-font-black tw-rounded-full hover:tw-bg-slate-800 tw-transition-all tw-shadow-lg">
                  {editingId ? '保存配置' : '创建账号'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 xl:tw-grid-cols-3 tw-gap-6">
        {filteredAccounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            platform={platforms.find((item) => item.code === account.platform)}
            onTest={testConnection}
            onOpenBrowser={openBrowser}
            onEdit={editAccount}
            onDelete={deleteAccount}
          />
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="tw-bg-white tw-border tw-border-dashed tw-border-slate-200 tw-rounded-2xl tw-p-10 tw-text-center tw-text-sm tw-text-slate-400">
          暂无匹配账号。可以新增账号，或调整筛选条件。
        </div>
      )}
    </div>
  );
}
