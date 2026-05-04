import type { Account, AccountStatus, BrowserMode, Platform } from '../../shared/types';
import { Edit3, ExternalLink, Globe, RefreshCw, Shield, Trash2, Zap } from 'lucide-react';

interface AccountCardProps {
  account: Account;
  platform?: Platform;
  onTest: (account: Account) => void;
  onOpenBrowser: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

const statusMeta: Record<AccountStatus, { label: string; dot: string; tone: string }> = {
  active: { label: '运行中', dot: 'tw-bg-emerald-500', tone: 'tw-text-emerald-600 tw-bg-emerald-50' },
  paused: { label: '已暂停', dot: 'tw-bg-amber-500', tone: 'tw-text-amber-600 tw-bg-amber-50' },
  needs_manual_action: { label: '需人工处理', dot: 'tw-bg-orange-500', tone: 'tw-text-orange-600 tw-bg-orange-50' },
  login_expired: { label: '登录失效', dot: 'tw-bg-red-500', tone: 'tw-text-red-600 tw-bg-red-50' },
  risk_blocked: { label: '风控拦截', dot: 'tw-bg-red-600', tone: 'tw-text-red-700 tw-bg-red-50' },
};

const browserModeLabel: Record<BrowserMode, string> = {
  adspower: 'AdsPower',
  bitbrowser: '比特浏览器',
  gologin: 'GoLogin',
  manual_port: '调试端口',
  manual_ws: 'WebSocket',
};

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getDispatchPolicy(account: Account) {
  const policy = account.aiConfigJson.dispatchPolicy;
  return policy && typeof policy === 'object' ? policy as Record<string, unknown> : {};
}

export function AccountCard({ account, platform, onTest, onOpenBrowser, onEdit, onDelete }: AccountCardProps) {
  const status = statusMeta[account.status];
  const policy = getDispatchPolicy(account);
  const persona = getString(account.aiConfigJson.persona);
  const dailyLimit = typeof policy.dailyLimit === 'number' ? policy.dailyLimit : 0;
  const autoPublish = policy.autoPublish === true;

  return (
    <div className="tw-group tw-relative tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-transition-all hover:tw-border-brand-200 hover:tw-shadow-xl hover:tw-shadow-brand-500/5">
      <div className="tw-flex tw-items-start tw-justify-between tw-mb-6">
        <div className="tw-flex tw-items-center tw-gap-3 tw-min-w-0">
          <div className="tw-w-10 tw-h-10 tw-bg-slate-50 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-border tw-border-slate-100 tw-text-slate-400 group-hover:tw-bg-brand-50 group-hover:tw-text-brand-500 tw-transition-all">
            <Globe size={18} />
          </div>
          <div className="tw-min-w-0">
            <div className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">
              {platform?.name || account.platform}
            </div>
            <h3 className="tw-text-base tw-font-black tw-text-slate-900 tw-tracking-tight tw-mt-0.5 tw-truncate">
              {account.name}
            </h3>
          </div>
        </div>
        <div className={`tw-flex tw-items-center tw-gap-1.5 tw-px-2.5 tw-py-1 tw-rounded-lg ${status.tone}`}>
          <div className={`tw-w-1.5 tw-h-1.5 tw-rounded-full ${status.dot}`} />
          <span className="tw-text-[10px] tw-font-black tw-whitespace-nowrap">{status.label}</span>
        </div>
      </div>

      <div className="tw-space-y-3 tw-mb-6">
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-4">
          <span className="tw-text-[10px] tw-font-black tw-text-slate-300 tw-uppercase tw-tracking-widest">插件</span>
          <span className="tw-text-[11px] tw-font-bold tw-text-slate-600 tw-truncate">
            {account.activePluginCode || '未指定'}
          </span>
        </div>
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-4">
          <span className="tw-text-[10px] tw-font-black tw-text-slate-300 tw-uppercase tw-tracking-widest">浏览器</span>
          <span className="tw-text-[11px] tw-font-bold tw-text-slate-600 tw-flex tw-items-center tw-gap-1.5">
            <Shield size={12} className="tw-text-brand-500" />
            {browserModeLabel[account.browserMode]}
          </span>
        </div>
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-4">
          <span className="tw-text-[10px] tw-font-black tw-text-slate-300 tw-uppercase tw-tracking-widest">Profile</span>
          <span className="tw-text-[11px] tw-font-mono tw-font-bold tw-text-slate-600 tw-truncate">
            {account.providerProfileId || account.wsEndpoint || account.debuggingPort || '未配置'}
          </span>
        </div>
      </div>

      <div className="tw-mb-6 tw-rounded-xl tw-bg-slate-50 tw-border tw-border-slate-100 tw-p-4">
        <p className="tw-text-[11px] tw-font-bold tw-text-slate-700 tw-line-clamp-2">
          {persona || '未配置账号人设，Agent 将只使用插件默认风格。'}
        </p>
        <div className="tw-flex tw-items-center tw-gap-2 tw-mt-3 tw-text-[10px] tw-font-bold tw-text-slate-400">
          <span>每日上限 {dailyLimit || '不限'}</span>
          <span className="tw-w-1 tw-h-1 tw-rounded-full tw-bg-slate-300" />
          <span>{autoPublish ? '允许自动发布' : '进入调度池待处理'}</span>
        </div>
      </div>

      {account.healthMessage && (
        <div className="tw-mb-5 tw-flex tw-items-start tw-gap-2 tw-text-[11px] tw-text-slate-500 tw-bg-slate-50/70 tw-rounded-xl tw-p-3">
          <ExternalLink size={13} className="tw-mt-0.5 tw-text-slate-400" />
          <span className="tw-line-clamp-2">{account.healthMessage}</span>
        </div>
      )}

      <div className="tw-grid tw-grid-cols-2 tw-gap-3">
        <button
          type="button"
          onClick={() => onOpenBrowser(account)}
          className="tw-col-span-2 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2.5 tw-bg-brand-500 tw-text-white tw-text-[11px] tw-font-black tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-shadow-lg tw-shadow-brand-500/20"
        >
          <Zap size={14} />
          打开浏览器环境
        </button>
        <button
          type="button"
          onClick={() => onEdit(account)}
          className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2.5 tw-bg-slate-50 tw-text-slate-600 tw-text-[11px] tw-font-black tw-rounded-xl hover:tw-bg-slate-100 tw-transition-all"
        >
          <Edit3 size={14} />
          编辑
        </button>
        <button
          type="button"
          onClick={() => onTest(account)}
          className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2.5 tw-bg-slate-50 tw-text-slate-600 tw-text-[11px] tw-font-black tw-rounded-xl hover:tw-bg-slate-100 tw-transition-all"
        >
          <RefreshCw size={14} />
          检测
        </button>
      </div>

      <button
        type="button"
        onClick={() => onDelete(account)}
        className="tw-absolute tw-top-4 tw-right-4 tw-p-1.5 tw-text-slate-200 hover:tw-text-red-500 tw-transition-colors tw-opacity-0 group-hover:tw-opacity-100"
        title="删除账号"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
