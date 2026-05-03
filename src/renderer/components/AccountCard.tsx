import type { Account, Platform } from '../../shared/types';
import { ExternalLink, MoreVertical, RefreshCw, Trash2, Edit3, Globe, Shield, Terminal, Zap } from 'lucide-react';

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
  const statusColor = isExpired ? 'tw-bg-red-500' : isActive ? 'tw-bg-green-500' : 'tw-bg-amber-500';
  
  return (
    <div className="tw-group tw-relative tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-transition-all hover:tw-border-brand-200 hover:tw-shadow-xl hover:tw-shadow-brand-500/5">
      {/* Platform Identifier */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
        <div className="tw-flex tw-items-center tw-gap-3">
           <div className="tw-w-10 tw-h-10 tw-bg-slate-50 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-border tw-border-slate-100 tw-text-slate-400 group-hover:tw-bg-brand-50 group-hover:tw-text-brand-500 tw-transition-all">
              <Globe size={18} />
           </div>
           <div>
              <div className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">{platform?.name || account.platform}</div>
              <h3 className="tw-text-base tw-font-black tw-text-slate-900 tw-tracking-tight tw-mt-0.5">{account.name}</h3>
           </div>
        </div>
        <div className="tw-flex tw-items-center tw-gap-1.5 tw-px-2.5 tw-py-1 tw-bg-slate-50 tw-rounded-lg tw-border tw-border-slate-100">
           <div className={`tw-w-1.5 tw-h-1.5 tw-rounded-full ${statusColor} ${isActive ? 'tw-animate-pulse' : ''}`} />
           <span className="tw-text-[9px] tw-font-black tw-text-slate-500 tw-uppercase tw-tracking-widest">
              {account.status.replace('_', ' ')}
           </span>
        </div>
      </div>

      {/* Meta Data Rack */}
      <div className="tw-space-y-2 tw-mb-8">
         <div className="tw-flex tw-items-center tw-justify-between tw-px-1">
            <span className="tw-text-[10px] tw-font-black tw-text-slate-300 tw-uppercase tw-tracking-widest">Profile ID</span>
            <span className="tw-text-[11px] tw-font-mono tw-font-bold tw-text-slate-600">#{account.providerProfileId || 'UNDEF'}</span>
         </div>
         <div className="tw-flex tw-items-center tw-justify-between tw-px-1">
            <span className="tw-text-[10px] tw-font-black tw-text-slate-300 tw-uppercase tw-tracking-widest">Engine Mode</span>
            <span className="tw-text-[11px] tw-font-bold tw-text-slate-600 tw-flex tw-items-center tw-gap-1.5">
               <Shield size={12} className="tw-text-brand-500" />
               {account.browserMode.toUpperCase()}
            </span>
         </div>
      </div>

      {/* Control Surface */}
      <div className="tw-grid tw-grid-cols-2 tw-gap-3">
         <button 
           onClick={() => onOpenBrowser(account)}
           className="tw-col-span-2 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2.5 tw-bg-brand-500 tw-text-white tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-shadow-lg tw-shadow-brand-500/20"
         >
            <Zap size={14} />
            Spawn Instance
         </button>
         
         <button 
           onClick={() => onEdit(account)}
           className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2.5 tw-bg-slate-50 tw-text-slate-600 tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-rounded-xl hover:tw-bg-slate-100 tw-transition-all"
         >
            <Edit3 size={14} />
            Edit
         </button>

         <button 
           onClick={() => onTest(account)}
           className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-2.5 tw-bg-slate-50 tw-text-slate-600 tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-rounded-xl hover:tw-bg-slate-100 tw-transition-all"
         >
            <RefreshCw size={14} />
            Diagnostics
         </button>
      </div>

      <button 
         onClick={() => onDelete(account)}
         className="tw-absolute tw-top-4 tw-right-4 tw-p-1 tw-text-slate-200 hover:tw-text-red-500 tw-transition-colors tw-opacity-0 group-hover:tw-opacity-100"
      >
         <Trash2 size={14} />
      </button>
    </div>
  );
}
