import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Play, 
  Square, 
  RefreshCcw, 
  Languages, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Info, 
  Save, 
  Terminal, 
  ChevronRight,
  Database,
  Globe
} from 'lucide-react';
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
  const [success, setSuccess] = useState('');

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
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  async function startWorker() {
    try {
      setStatus(await appApi.scheduler.start());
      setSuccess('调度器已启动');
      setTimeout(() => setSuccess(''), 3000);
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function stopWorker() {
    try {
      setStatus(await appApi.scheduler.stop());
      setSuccess('调度器已停止');
      setTimeout(() => setSuccess(''), 3000);
    } catch (cause) {
      setError(String(cause));
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
      await appApi.settings.set(key, draftValues[key] ?? '');
      setSuccess(`设置 ${key} 已保存`);
      setTimeout(() => setSuccess(''), 2000);
      await refresh();
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function checkUpdates() {
    setError('');
    setUpdateResult(null);
    try {
      setUpdateResult(await appApi.updates.check());
    } catch (cause) {
      setError(String(cause));
    }
  }

  return (
    <div className="tw-space-y-8 tw-animate-fade-in">
      {/* Header */}
      <div className="tw-flex tw-items-center tw-justify-between">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-text-slate-900 tw-tracking-tight">系统设置</h1>
          <p className="tw-text-slate-500 tw-text-sm tw-mt-1">配置应用程序全局参数与自动化调度逻辑</p>
        </div>
        <div className="tw-flex tw-items-center tw-gap-3">
           <div className="tw-px-4 tw-py-2 tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-shadow-sm tw-flex tw-items-center tw-gap-2">
              <div className={`tw-w-2 tw-h-2 tw-rounded-full ${status?.running ? 'tw-bg-green-500 tw-animate-pulse' : 'tw-bg-slate-300'}`} />
              <span className="tw-text-xs tw-font-bold tw-text-slate-600">{status?.running ? '调度运行中' : '调度已停止'}</span>
           </div>
        </div>
      </div>

      {error && (
        <div className="tw-bg-red-50 tw-border tw-border-red-100 tw-text-red-600 tw-p-4 tw-rounded-2xl tw-text-sm tw-flex tw-items-center tw-gap-3 tw-animate-shake">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="tw-bg-emerald-50 tw-border tw-border-emerald-100 tw-text-emerald-600 tw-p-4 tw-rounded-2xl tw-text-sm tw-flex tw-items-center tw-gap-3 tw-animate-fade-in">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">
        {/* Basic Settings Card */}
        <div className="tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm hover:tw-shadow-xl tw-transition-all tw-duration-500">
          <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
            <div className="tw-p-3 tw-bg-blue-50 tw-text-blue-600 tw-rounded-2xl">
              <Languages size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">常规选项</h2>
              <p className="tw-text-xs tw-text-slate-400">基础偏好设置</p>
            </div>
          </div>

          <div className="tw-space-y-6">
            <div className="tw-flex tw-items-center tw-justify-between tw-p-4 tw-bg-slate-50/50 tw-rounded-2xl tw-border tw-border-slate-50">
              <div>
                <p className="tw-text-sm tw-font-bold tw-text-slate-700">界面语言</p>
                <p className="tw-text-[11px] tw-text-slate-400">选择您偏好的用户界面显示语言</p>
              </div>
              <select 
                value={i18n.language} 
                onChange={(e) => void changeLanguage(e.target.value)}
                className="tw-bg-white tw-border tw-border-slate-200 tw-px-4 tw-py-2 tw-rounded-xl tw-text-sm tw-font-bold tw-shadow-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-transition-all"
              >
                <option value="zh">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Browser Modes Card */}
        <div className="tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm hover:tw-shadow-xl tw-transition-all tw-duration-500">
          <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
            <div className="tw-p-3 tw-bg-cyan-50 tw-text-cyan-600 tw-rounded-2xl">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">指纹浏览器管理</h2>
              <p className="tw-text-xs tw-text-slate-400">控制可见的浏览器引擎</p>
            </div>
          </div>

          <div className="tw-space-y-3">
            {[
              { id: 'adspower', label: 'AdsPower (推荐)', desc: '深度集成的指纹自动化' },
              { id: 'manual_port', label: '手动调试端口', desc: '标准 Chrome 调试模式' },
              { id: 'manual_ws', label: '手动 WebSocket', desc: '远程浏览器集群连接' }
            ].map(mode => {
              const enabledModes = (draftValues['ui.enabledBrowserModes'] || '').split(',');
              const isChecked = enabledModes.includes(mode.id);
              return (
                <label key={mode.id} className={`tw-flex tw-items-center tw-justify-between tw-p-4 tw-rounded-2xl tw-border tw-transition-all tw-cursor-pointer ${isChecked ? 'tw-bg-brand-50/30 tw-border-brand-100' : 'tw-bg-slate-50/50 tw-border-transparent hover:tw-bg-slate-50'}`}>
                  <div>
                    <p className="tw-text-sm tw-font-bold tw-text-slate-700">{mode.label}</p>
                    <p className="tw-text-[10px] tw-text-slate-400">{mode.desc}</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={async (e) => {
                      const nextModes = e.target.checked 
                        ? [...enabledModes, mode.id] 
                        : enabledModes.filter(m => m !== mode.id);
                      const value = nextModes.filter(Boolean).join(',');
                      setDraftValues(prev => ({ ...prev, ['ui.enabledBrowserModes']: value }));
                      await appApi.settings.set('ui.enabledBrowserModes', value);
                      setSuccess('浏览器列表已更新');
                      setTimeout(() => setSuccess(''), 2000);
                    }}
                    className="tw-w-5 tw-h-5 tw-accent-brand-600"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Scheduler Status Card */}
        <div className="tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm hover:tw-shadow-xl tw-transition-all tw-duration-500">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
            <div className="tw-flex tw-items-center tw-gap-4">
              <div className="tw-p-3 tw-bg-purple-50 tw-text-purple-600 tw-rounded-2xl">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">自动调度</h2>
                <p className="tw-text-xs tw-text-slate-400">后台分发引擎状态</p>
              </div>
            </div>
          </div>

          <div className="tw-grid tw-grid-cols-2 tw-gap-4 tw-mb-8">
            <div className="tw-bg-slate-50/80 tw-p-5 tw-rounded-[24px] tw-border tw-border-slate-100">
              <p className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-mb-1 tw-tracking-widest">检查间隔</p>
              <p className="tw-text-xl tw-font-bold tw-text-slate-900">
                {status ? Math.round(status.intervalMs / 1000) : '-'} <span className="tw-text-xs tw-font-medium tw-text-slate-400">SEC</span>
              </p>
            </div>
            <div className="tw-bg-slate-50/80 tw-p-5 tw-rounded-[24px] tw-border tw-border-slate-100">
              <p className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-mb-1 tw-tracking-widest">最后执行</p>
              <p className="tw-text-xs tw-font-bold tw-text-slate-700 tw-truncate tw-mt-1">
                {status?.lastRunAt ? new Date(status.lastRunAt).toLocaleTimeString() : '尚未开始'}
              </p>
            </div>
          </div>

          <div className="tw-flex tw-gap-3">
            {!status?.running ? (
              <button 
                onClick={startWorker}
                className="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-6 tw-py-4 tw-bg-brand-600 tw-text-white tw-rounded-2xl tw-text-sm tw-font-bold hover:tw-bg-brand-700 tw-shadow-lg tw-shadow-brand-100 tw-transition-all active:tw-scale-95"
              >
                <Play size={18} /> 启动引擎
              </button>
            ) : (
              <button 
                onClick={stopWorker}
                className="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-6 tw-py-4 tw-bg-red-50 tw-text-red-600 tw-rounded-2xl tw-text-sm tw-font-bold hover:tw-bg-red-100 tw-transition-all active:tw-scale-95"
              >
                <Square size={18} /> 停止调度
              </button>
            )}
            <button 
              onClick={refresh}
              className="tw-p-4 tw-bg-slate-50 tw-text-slate-400 tw-rounded-2xl hover:tw-bg-slate-100 hover:tw-text-slate-600 tw-transition-all"
            >
              <RefreshCcw size={22} />
            </button>
          </div>
        </div>

        {/* Update Card */}
        <div className="tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-p-8 tw-shadow-sm hover:tw-shadow-xl tw-transition-all tw-duration-500">
          <div className="tw-flex tw-items-center tw-gap-4 tw-mb-8">
            <div className="tw-p-3 tw-bg-amber-50 tw-text-amber-600 tw-rounded-2xl">
              <RefreshCcw size={24} />
            </div>
            <div>
              <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">版本控制</h2>
              <p className="tw-text-xs tw-text-slate-400">系统更新与维护</p>
            </div>
          </div>

          <div className="tw-space-y-1 tw-mb-6">
            <div className="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-1">
              <span className="tw-text-sm tw-font-medium tw-text-slate-400">当前版本</span>
              <span className="tw-text-sm tw-font-bold tw-text-slate-900 tw-bg-slate-50 tw-px-3 tw-py-1 tw-rounded-lg">{updateResult?.currentVersion || 'v1.0.0-mvp'}</span>
            </div>
            <div className="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-1">
              <span className="tw-text-sm tw-font-medium tw-text-slate-400">状态</span>
              <span className="tw-text-xs tw-font-bold tw-text-emerald-500">{updateResult?.message || '已是最新'}</span>
            </div>
          </div>
          
          <button 
            onClick={checkUpdates}
            className="tw-w-full tw-px-6 tw-py-4 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-text-sm tw-font-bold hover:tw-bg-brand-600 tw-shadow-xl tw-shadow-slate-200 tw-transition-all active:tw-scale-95"
          >
            检查系统更新
          </button>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-overflow-hidden tw-shadow-sm">
        <div className="tw-p-8 tw-border-b tw-border-slate-50 tw-flex tw-items-center tw-gap-4">
          <div className="tw-p-3 tw-bg-slate-900 tw-text-white tw-rounded-2xl">
            <Terminal size={24} />
          </div>
          <div>
            <h2 className="tw-text-lg tw-font-bold tw-text-slate-900">数据库底层配置</h2>
            <p className="tw-text-xs tw-text-slate-400">直接操作 App Settings 表 (仅限专家使用)</p>
          </div>
        </div>

        <div className="tw-divide-y tw-divide-slate-50">
          {settings.map((setting) => (
            <div key={setting.key} className="tw-p-6 hover:tw-bg-slate-50/30 tw-transition-all">
              <div className="tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center tw-gap-6">
                <div className="tw-flex-1">
                  <span className="tw-text-[10px] tw-font-bold tw-bg-slate-100 tw-text-slate-500 tw-px-2 tw-py-0.5 tw-rounded-md tw-font-mono tw-tracking-tight">
                    {setting.key}
                  </span>
                  <p className="tw-text-xs tw-text-slate-400 tw-mt-2">{setting.description || '无详细描述'}</p>
                </div>
                <div className="tw-flex tw-items-center tw-gap-4">
                  <input
                    value={draftValues[setting.key] ?? ''}
                    onChange={(e) => setDraftValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="tw-min-w-[300px] tw-bg-slate-50 tw-border tw-border-slate-100 tw-px-4 tw-py-2.5 tw-rounded-xl tw-text-sm tw-font-mono focus:tw-bg-white focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-transition-all"
                  />
                  <button 
                    onClick={() => void saveSetting(setting.key)}
                    className="tw-flex tw-items-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-white tw-text-slate-600 tw-border tw-border-slate-200 tw-rounded-xl tw-text-xs tw-font-bold hover:tw-bg-slate-900 hover:tw-text-white hover:tw-border-slate-900 tw-transition-all"
                  >
                    <Save size={14} /> 保存
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Actions */}
      <div className="tw-bg-amber-50 tw-rounded-3xl tw-border tw-border-amber-100 tw-p-8 tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center tw-justify-between tw-gap-6">
        <div className="tw-flex tw-items-center tw-gap-4">
          <div className="tw-p-3 tw-bg-amber-500 tw-text-white tw-rounded-2xl tw-shadow-lg tw-shadow-amber-200">
            <RefreshCcw size={24} />
          </div>
          <div>
            <h2 className="tw-text-lg tw-font-bold tw-text-amber-900">开发者选项</h2>
            <p className="tw-text-sm tw-text-amber-700/70">修改主进程或 Preload 后需通过此按钮使变更生效</p>
          </div>
        </div>
        <button 
          onClick={() => {
            if(window.confirm('确定要重启应用吗？所有未保存的状态将丢失。')) {
              appApi.app.relaunch();
            }
          }}
          className="tw-px-8 tw-py-4 tw-bg-amber-500 tw-text-white tw-rounded-2xl tw-font-bold tw-text-sm tw-shadow-xl tw-shadow-amber-200 hover:tw-bg-amber-600 tw-transition-all active:tw-scale-95"
        >
          立即重启应用
        </button>
      </div>
    </div>
  );
}
