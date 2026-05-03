import type { Account, Platform } from '../../shared/types';
import { ExternalLink, MoreVertical, RefreshCw, Trash2, Edit3, Globe } from 'lucide-react';

interface AccountCardProps {
  account: Account;
  platform?: Platform;
  onTest: (account: Account) => void;
  onOpenBrowser: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export function AccountCard({ account, platform, onTest, onOpenBrowser, onEdit, onDelete }: AccountCardProps) {
  const isExpired = account.status === 'login_expired' || account.status === 'risk_blocked';
  const isActive = account.status === 'active';
  const statusColor = isExpired ? 'tw-bg-red-500' : isActive ? 'tw-bg-emerald-500' : 'tw-bg-amber-500';
  
  return (
    <div className="tw-group tw-relative tw-bg-white tw-rounded-[32px] tw-p-7 tw-border tw-border-slate-100 tw-shadow-sm hover:tw-shadow-2xl hover:tw-shadow-slate-200/50 hover:tw-border-brand-100 tw-transition-all tw-duration-500 tw-ease-out hover:tw--translate-y-2">
      {/* 顶部信息栏 */}
      <div className="tw-flex tw-items-start tw-justify-between tw-mb-6">
        <div className="tw-flex tw-items-center tw-gap-4">
          <div className="tw-relative">
            <div className="tw-w-16 tw-h-16 tw-bg-slate-50 tw-rounded-[22px] tw-flex tw-items-center tw-justify-center tw-border tw-border-slate-100 tw-text-slate-400 group-hover:tw-bg-brand-50 group-hover:tw-text-brand-500 tw-transition-all tw-duration-500">
              <Globe size={30} strokeWidth={1.2} className="group-hover:tw-rotate-12 tw-transition-transform tw-duration-500" />
            </div>
            <div className={`tw-absolute tw--bottom-0.5 tw--right-0.5 tw-w-4.5 tw-h-4.5 tw-rounded-full tw-border-4 tw-border-white ${statusColor} tw-shadow-sm ${isActive ? 'tw-animate-pulse' : ''}`} />
          </div>
          <div className="tw-space-y-1">
            <h3 className="tw-font-black tw-text-slate-900 tw-text-[18px] tw-tracking-tight group-hover:tw-text-brand-600 tw-transition-colors">{account.name}</h3>
            <div className="tw-flex tw-items-center tw-gap-2">
              <span className="tw-text-[9px] tw-font-black tw-tracking-widest tw-px-2 tw-py-0.5 tw-bg-slate-900 tw-text-white tw-rounded-md tw-uppercase">
                {platform?.name || account.platform}
              </span>
              <span className="tw-text-[10px] tw-font-bold tw-text-slate-400"># {account.providerProfileId || '未绑定 ID'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 配置详情区 - 玻璃感容器 */}
      <div className="tw-grid tw-grid-cols-2 tw-gap-4 tw-mb-8">
        <div className="tw-bg-slate-50/80 tw-rounded-2xl tw-p-4 tw-border tw-border-slate-100/50 group-hover:tw-bg-white tw-transition-colors">
          <p className="tw-text-[9px] tw-font-black tw-text-slate-400 tw-uppercase tw-mb-1.5 tw-tracking-[0.1em]">浏览器环境</p>
          <p className="tw-text-[13px] tw-font-bold tw-text-slate-700 tw-capitalize">{account.browserMode.replace('_', ' ')}</p>
        </div>
        <div className="tw-bg-slate-50/80 tw-rounded-2xl tw-p-4 tw-border tw-border-slate-100/50 group-hover:tw-bg-white tw-transition-colors">
          <p className="tw-text-[9px] tw-font-black tw-text-slate-400 tw-uppercase tw-mb-1.5 tw-tracking-[0.1em]">账号健康度</p>
          <p className={`tw-text-[13px] tw-font-bold ${isActive ? 'tw-text-emerald-600' : 'tw-text-amber-600'}`}>
            {isActive ? '运行良好' : '需要干预'}
          </p>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="tw-flex tw-items-center tw-justify-between tw-pt-5 tw-border-t tw-border-slate-50">
        <div className="tw-flex tw-gap-3">
          <button 
            onClick={() => onOpenBrowser(account)}
            className="tw-flex tw-items-center tw-gap-2 tw-px-5 tw-py-2.5 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-text-xs tw-font-bold hover:tw-bg-brand-600 tw-transition-all tw-shadow-lg tw-shadow-slate-200 active:tw-scale-95"
          >
            <ExternalLink size={14} />
            启动环境
          </button>
          
          <div className="tw-flex tw-items-center tw-bg-slate-50 tw-rounded-2xl tw-p-1">
            <button 
              onClick={() => onTest(account)}
              className="tw-p-2 tw-text-slate-400 hover:tw-text-brand-600 hover:tw-bg-white hover:tw-shadow-sm tw-rounded-xl tw-transition-all"
              title="连接诊断"
            >
              <RefreshCw size={18} />
            </button>
            <button 
              onClick={() => onEdit(account)}
              className="tw-p-2 tw-text-slate-400 hover:tw-text-blue-600 hover:tw-bg-white hover:tw-shadow-sm tw-rounded-xl tw-transition-all"
              title="配置修改"
            >
              <Edit3 size={18} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => onDelete(account)}
          className="tw-p-2.5 tw-text-slate-200 hover:tw-text-red-500 hover:tw-bg-red-50 tw-rounded-2xl tw-transition-all"
          title="移除账号"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
