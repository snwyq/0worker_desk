import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Globe, Languages, RefreshCcw, Save, Settings, Sparkles, Terminal } from 'lucide-react';

import type { AppSetting, BrowserMode, UpdateCheckResult, UpdateConfig } from '../../shared/types';
import { appApi } from '../api';

const browserModes: { id: BrowserMode; label: string; desc: string }[] = [
  { id: 'adspower', label: 'AdsPower（推荐）', desc: '用于多账号指纹环境和自动化接管。' },
  { id: 'manual_port', label: 'Chrome 调试端口', desc: '连接本机已开启 remote-debugging-port 的浏览器。' },
  { id: 'manual_ws', label: '远程 WebSocket', desc: '连接外部浏览器集群或远程自动化服务。' },
  { id: 'bitbrowser', label: '比特浏览器', desc: '预留浏览器提供商，适合后续扩展。' },
  { id: 'gologin', label: 'GoLogin', desc: '预留浏览器提供商，适合海外账号环境。' },
];

const settingLabels: Record<string, string> = {
  'ai.dashscopeKey': 'DashScope API Key',
  'ai.apiyiKey': 'APIYi API Key',
  'ai.apiYiKey': 'APIYi API Key（兼容字段）',
  'ai.tophubKey': 'TopHub 热榜 Key',
  'ai.tophubBaseUrl': 'TopHub Base URL',
  'adspower.apiKey': 'AdsPower API Key',
  'browser.connectionTimeoutMs': '浏览器连接超时',
  'http.port': '本地 HTTP 端口',
  'http.allowedOrigins': 'HTTP 允许来源',
  'scheduler.intervalMs': '调度器轮询间隔',
  'ui.enabledBrowserModes': '账号页可选浏览器模式',
  'ui.language': '界面语言',
  'updates.enabled': '自动更新开关',
  'updates.owner': '更新仓库 Owner',
  'updates.repo': '更新仓库 Repo',
  'updates.channel': '更新通道',
};

function getSettingValue(settings: AppSetting[], key: string) {
  return settings.find((setting) => setting.key === key)?.value ?? '';
}

function isSecretSetting(key: string) {
  return /key|token|secret/i.test(key);
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig | null>(null);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh() {
    const [nextSettings, nextUpdateStatus] = await Promise.all([
      appApi.settings.list(),
      appApi.updates.status(),
    ]);
    setSettings(nextSettings);
    setUpdateConfig(nextUpdateStatus.config);
    setDraftValues(Object.fromEntries(nextSettings.map((setting) => [setting.key, setting.value])));
  }

  useEffect(() => {
    void refresh();
  }, []);

  const enabledModes = useMemo(
    () => (draftValues['ui.enabledBrowserModes'] || '').split(',').filter(Boolean) as BrowserMode[],
    [draftValues]
  );

  async function changeLanguage(language: string) {
    localStorage.setItem('language', language);
    await appApi.settings.set('ui.language', language);
    setDraftValues((prev) => ({ ...prev, 'ui.language': language }));
    setSuccess(language === 'zh' ? '界面语言已切换为简体中文。' : 'Language switched to English.');
    setTimeout(() => setSuccess(''), 2000);
  }

  async function saveSetting(key: string) {
    setError('');
    try {
      await appApi.settings.set(key, draftValues[key] ?? '');
      setSuccess(`设置「${settingLabels[key] || key}」已保存。`);
      setTimeout(() => setSuccess(''), 2000);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function toggleBrowserMode(mode: BrowserMode, checked: boolean) {
    const nextModes = checked
      ? Array.from(new Set([...enabledModes, mode]))
      : enabledModes.filter((item) => item !== mode);
    const value = nextModes.join(',');
    setDraftValues((prev) => ({ ...prev, 'ui.enabledBrowserModes': value }));
    await appApi.settings.set('ui.enabledBrowserModes', value);
    setSuccess('账号页浏览器模式已更新。');
    setTimeout(() => setSuccess(''), 2000);
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

  function updateDraft(key: string, value: string) {
    setDraftValues((prev) => ({ ...prev, [key]: value }));
  }

  const hothubKey = getSettingValue(settings, 'ai.tophubKey');
  const dashscopeKey = getSettingValue(settings, 'ai.dashscopeKey');
  const apiyiKey = getSettingValue(settings, 'ai.apiyiKey') || getSettingValue(settings, 'ai.apiYiKey');

  return (
    <div className="tw-space-y-8 tw-animate-fade-in">
      <div className="tw-flex tw-flex-col xl:tw-flex-row xl:tw-items-end xl:tw-justify-between tw-gap-5">
        <div>
          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
            <Settings size={16} className="tw-text-brand-500" />
            <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.35em]">Platform Control</span>
          </div>
          <h1 className="tw-text-3xl tw-font-bold tw-text-slate-900 tw-tracking-tight">系统设置</h1>
          <p className="tw-text-slate-500 tw-text-sm tw-mt-2">
            管理模型、热榜、浏览器、调度器和开发配置，作为所有客户插件的默认运行底座。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="tw-inline-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2.5 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-600 tw-text-[11px] tw-font-bold tw-rounded-xl hover:tw-bg-slate-50 tw-transition-all tw-shadow-sm"
        >
          <RefreshCcw size={14} />
          刷新设置
        </button>
      </div>

      {error && (
        <div className="tw-bg-red-50 tw-border tw-border-red-100 tw-text-red-600 tw-p-4 tw-rounded-2xl tw-text-sm tw-flex tw-items-center tw-gap-3">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="tw-bg-emerald-50 tw-border tw-border-emerald-100 tw-text-emerald-600 tw-p-4 tw-rounded-2xl tw-text-sm tw-flex tw-items-center tw-gap-3">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div className="tw-grid tw-grid-cols-1 xl:tw-grid-cols-2 tw-gap-8">
        <section className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm">
          <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
            <div className="tw-p-3 tw-bg-blue-50 tw-text-blue-600 tw-rounded-2xl">
              <Languages size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">基础偏好</h2>
              <p className="tw-text-xs tw-text-slate-400">控制工作台语言和常用交互偏好。</p>
            </div>
          </div>
          <div className="tw-flex tw-items-center tw-justify-between tw-p-4 tw-bg-slate-50/50 tw-rounded-2xl tw-border tw-border-slate-50">
            <div>
              <p className="tw-text-sm tw-font-bold tw-text-slate-700">界面语言</p>
              <p className="tw-text-[11px] tw-text-slate-400">选择运营工作台显示语言。</p>
            </div>
            <select
              value={draftValues['ui.language'] || 'zh'}
              onChange={(event) => void changeLanguage(event.target.value)}
              className="tw-bg-white tw-border tw-border-slate-200 tw-px-4 tw-py-2 tw-rounded-xl tw-text-sm tw-font-bold tw-shadow-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10"
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </section>

        <section className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm">
          <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
            <div className="tw-p-3 tw-bg-cyan-50 tw-text-cyan-600 tw-rounded-2xl">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">浏览器环境</h2>
              <p className="tw-text-xs tw-text-slate-400">控制账号页可以选择的浏览器连接方式。</p>
            </div>
          </div>
          <div className="tw-space-y-3">
            {browserModes.map((mode) => {
              const isChecked = enabledModes.includes(mode.id);
              return (
                <label key={mode.id} className={`tw-flex tw-items-center tw-justify-between tw-gap-4 tw-p-4 tw-rounded-2xl tw-border tw-transition-all tw-cursor-pointer ${isChecked ? 'tw-bg-brand-50/30 tw-border-brand-100' : 'tw-bg-slate-50/50 tw-border-transparent hover:tw-bg-slate-50'}`}>
                  <span>
                    <span className="tw-block tw-text-sm tw-font-bold tw-text-slate-700">{mode.label}</span>
                    <span className="tw-block tw-text-[11px] tw-text-slate-400 tw-mt-1">{mode.desc}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => void toggleBrowserMode(mode.id, event.target.checked)}
                    className="tw-w-5 tw-h-5 tw-accent-brand-600"
                  />
                </label>
              );
            })}
          </div>
        </section>

        <section className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm xl:tw-col-span-2">
          <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
            <div className="tw-p-3 tw-bg-purple-50 tw-text-purple-600 tw-rounded-2xl">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">AI 与热榜服务</h2>
              <p className="tw-text-xs tw-text-slate-400">模型 Key、图片生成 Key 和 TopHub 热点源会被 Agent 工作流统一使用。</p>
            </div>
          </div>

          <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-4 tw-mb-8">
            <div className="tw-rounded-2xl tw-bg-slate-50 tw-border tw-border-slate-100 tw-p-4">
              <p className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">DashScope</p>
              <p className="tw-text-sm tw-font-black tw-text-slate-800 tw-mt-2">{dashscopeKey ? '已配置' : '未配置'}</p>
            </div>
            <div className="tw-rounded-2xl tw-bg-slate-50 tw-border tw-border-slate-100 tw-p-4">
              <p className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">APIYi</p>
              <p className="tw-text-sm tw-font-black tw-text-slate-800 tw-mt-2">{apiyiKey ? '已配置' : '未配置'}</p>
            </div>
            <div className="tw-rounded-2xl tw-bg-slate-50 tw-border tw-border-slate-100 tw-p-4">
              <p className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">TopHub</p>
              <p className="tw-text-sm tw-font-black tw-text-slate-800 tw-mt-2">{hothubKey ? '已配置' : '未配置'}</p>
            </div>
          </div>

          <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
            {['ai.dashscopeKey', 'ai.apiyiKey', 'ai.apiYiKey', 'ai.tophubKey', 'ai.tophubBaseUrl'].map((key) => (
              <div key={key} className="tw-space-y-2">
                <label className="tw-text-xs tw-font-bold tw-text-slate-500 tw-ml-1">{settingLabels[key] || key}</label>
                <div className="tw-flex tw-gap-2">
                  <input
                    type={isSecretSetting(key) ? 'password' : 'text'}
                    value={draftValues[key] ?? ''}
                    onChange={(event) => updateDraft(key, event.target.value)}
                    className="tw-flex-1 tw-min-w-0 tw-bg-slate-50 tw-border tw-border-slate-100 tw-px-4 tw-py-2.5 tw-rounded-xl tw-text-sm tw-font-mono focus:tw-bg-white focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-outline-none"
                    placeholder={isSecretSetting(key) ? 'sk-...' : 'https://...'}
                  />
                  <button type="button" onClick={() => void saveSetting(key)} className="tw-px-4 tw-bg-slate-100 tw-text-slate-600 tw-rounded-xl hover:tw-bg-brand-500 hover:tw-text-white tw-transition-all" title="保存">
                    <Save size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm">
          <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
            <div className="tw-p-3 tw-bg-amber-50 tw-text-amber-600 tw-rounded-2xl">
              <RefreshCcw size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">版本更新</h2>
              <p className="tw-text-xs tw-text-slate-400">检查桌面应用更新和发布通道。</p>
            </div>
          </div>
          <div className="tw-space-y-2 tw-mb-6">
            <div className="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-1">
              <span className="tw-text-sm tw-font-medium tw-text-slate-400">当前版本</span>
              <span className="tw-text-sm tw-font-bold tw-text-slate-900 tw-bg-slate-50 tw-px-3 tw-py-1 tw-rounded-lg">{updateResult?.currentVersion || 'v1.0.0-mvp'}</span>
            </div>
            <div className="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-1">
              <span className="tw-text-sm tw-font-medium tw-text-slate-400">更新状态</span>
              <span className="tw-text-xs tw-font-bold tw-text-emerald-500">{updateResult?.message || '等待检查'}</span>
            </div>
            <div className="tw-text-[11px] tw-text-slate-400 tw-bg-slate-50 tw-rounded-xl tw-p-3">
              仓库：{updateConfig?.owner || draftValues['updates.owner'] || '-'} / {updateConfig?.repo || draftValues['updates.repo'] || '-'}，通道：{updateConfig?.channel || draftValues['updates.channel'] || 'latest'}
            </div>
          </div>
          <button type="button" onClick={checkUpdates} className="tw-w-full tw-px-6 tw-py-4 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-text-sm tw-font-bold hover:tw-bg-brand-600 tw-shadow-xl tw-shadow-slate-200 tw-transition-all active:tw-scale-95">
            检查更新
          </button>
        </section>

        <section className="tw-bg-amber-50 tw-rounded-2xl tw-border tw-border-amber-100 tw-p-8 tw-flex tw-flex-col tw-justify-between tw-gap-6">
          <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-p-3 tw-bg-amber-500 tw-text-white tw-rounded-2xl tw-shadow-lg tw-shadow-amber-200">
              <RefreshCcw size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-amber-900">开发者操作</h2>
              <p className="tw-text-sm tw-text-amber-700/70">主进程、Preload 或本地服务配置变更后，可以重启应用让配置生效。</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('确认重启应用吗？未保存的页面状态会丢失。')) {
                appApi.app.relaunch();
              }
            }}
            className="tw-px-8 tw-py-4 tw-bg-amber-500 tw-text-white tw-rounded-2xl tw-font-bold tw-text-sm tw-shadow-xl tw-shadow-amber-200 hover:tw-bg-amber-600 tw-transition-all active:tw-scale-95"
          >
            立即重启应用
          </button>
        </section>
      </div>

      <section className="tw-bg-white tw-rounded-2xl tw-border tw-border-slate-100 tw-overflow-hidden tw-shadow-sm">
        <div className="tw-p-8 tw-border-b tw-border-slate-50 tw-flex tw-items-center tw-gap-4">
          <div className="tw-p-3 tw-bg-slate-900 tw-text-white tw-rounded-2xl">
            <Terminal size={24} />
          </div>
          <div>
            <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">高级配置</h2>
            <p className="tw-text-xs tw-text-slate-400">直接编辑 App Settings 表，仅用于排障、集成和部署配置。</p>
          </div>
        </div>

        <div className="tw-divide-y tw-divide-slate-50">
          {settings.map((setting) => (
            <div key={setting.key} className="tw-p-6 hover:tw-bg-slate-50/30 tw-transition-all">
              <div className="tw-flex tw-flex-col xl:tw-flex-row xl:tw-items-center tw-gap-6">
                <div className="tw-flex-1 tw-min-w-0">
                  <span className="tw-text-[10px] tw-font-bold tw-bg-slate-100 tw-text-slate-500 tw-px-2 tw-py-0.5 tw-rounded-md tw-font-mono tw-tracking-tight">
                    {setting.key}
                  </span>
                  <p className="tw-text-xs tw-text-slate-500 tw-font-bold tw-mt-3">{settingLabels[setting.key] || '自定义设置'}</p>
                  <p className="tw-text-xs tw-text-slate-400 tw-mt-1">{setting.description || '暂无说明，修改前请确认调用方含义。'}</p>
                </div>
                <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-gap-3">
                  <input
                    type={isSecretSetting(setting.key) ? 'password' : 'text'}
                    value={draftValues[setting.key] ?? ''}
                    onChange={(event) => updateDraft(setting.key, event.target.value)}
                    className="tw-w-full sm:tw-w-[360px] tw-bg-slate-50 tw-border tw-border-slate-100 tw-px-4 tw-py-2.5 tw-rounded-xl tw-text-sm tw-font-mono focus:tw-bg-white focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10"
                  />
                  <button type="button" onClick={() => void saveSetting(setting.key)} className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-white tw-text-slate-600 tw-border tw-border-slate-200 tw-rounded-xl tw-text-xs tw-font-bold hover:tw-bg-slate-900 hover:tw-text-white hover:tw-border-slate-900 tw-transition-all">
                    <Save size={14} />
                    保存
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="tw-hidden">
        <Database size={1} />
      </div>
    </div>
  );
}
