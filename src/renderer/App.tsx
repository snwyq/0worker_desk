import { useState } from 'react';
import {
  Bell,
  Cpu,
  LayoutDashboard,
  LogOut,
  Plus,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { QueuePage } from './pages/QueuePage';
import { SettingsPage } from './pages/SettingsPage';
import {
  activateWorkspaceTab,
  createInitialWorkspace,
  openWorkspaceModule,
  type WorkspaceModule,
} from './workspaceModel';

const mainNavItems = [
  { id: 'home', label: '控制中心', icon: LayoutDashboard },
  { id: 'accounts', label: '账号矩阵', icon: Users },
  { id: 'distribution', label: '发布调度', icon: Rocket },
  { id: 'settings', label: '系统设置', icon: Settings },
] as const;

export function App() {
  const [workspace, setWorkspace] = useState(createInitialWorkspace);
  const [searchQuery, setSearchQuery] = useState('');

  const activeModule = workspace.activeModule;
  const bridgeLabel = window.weiboPublisher ? '桌面端已连接' : '本地服务已连接';

  function openModule(module: WorkspaceModule) {
    setWorkspace((current) => openWorkspaceModule(current, module));
  }

  const renderContent = () => {
    switch (activeModule) {
      case 'home': return <HomePage />;
      case 'accounts': return <AccountsPage />;
      case 'distribution': return <QueuePage />;
      case 'settings': return <SettingsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="tw-flex tw-h-screen tw-bg-slate-50 tw-text-slate-900 tw-font-sans">
      {/* Sidebar */}
      <aside className="tw-w-64 tw-bg-white tw-border-r tw-border-slate-200 tw-flex tw-flex-col tw-z-10">
        <div className="tw-p-6 tw-flex tw-items-center tw-gap-3">
          <div className="tw-w-10 tw-h-10 tw-bg-brand-500 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-text-white tw-shadow-lg tw-shadow-brand-200">
            <LayoutDashboard size={22} />
          </div>
          <span className="tw-font-bold tw-text-xl tw-tracking-tight">0Worker</span>
        </div>

        <nav className="tw-flex-1 tw-px-4 tw-space-y-1">
          <div className="tw-text-[11px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-wider tw-px-3 tw-mb-2 tw-mt-4">
            核心工作区
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => openModule(item.id as WorkspaceModule)}
                className={`tw-w-full tw-relative tw-flex tw-items-center tw-gap-4 tw-px-6 tw-py-4 tw-rounded-2xl tw-transition-all tw-duration-300 tw-group ${
                  isActive 
                  ? 'tw-bg-slate-900 tw-text-white tw-shadow-xl tw-shadow-slate-200' 
                  : 'tw-text-slate-400 hover:tw-bg-slate-50 hover:tw-text-slate-600'
                }`}
              >
                {isActive && (
                  <div className="tw-absolute tw-left-0 tw-top-1/2 tw--translate-y-1/2 tw-w-1 tw-h-6 tw-bg-brand-500 tw-rounded-r-full tw-shadow-[0_0_8px_rgba(14,141,233,0.8)]" />
                )}
                <Icon size={20} className={`tw-transition-transform tw-duration-500 ${isActive ? 'tw-scale-110' : 'group-hover:tw-scale-110'}`} />
                <span className="tw-text-sm tw-font-bold tw-tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="tw-p-4 tw-mt-auto">
          <div className="tw-bg-slate-50 tw-rounded-2xl tw-p-4 tw-border tw-border-slate-100">
            <div className="tw-flex tw-items-center tw-gap-3 tw-mb-3">
              <div className="tw-relative">
                <div className="tw-w-10 tw-h-10 tw-bg-slate-200 tw-rounded-full tw-overflow-hidden">
                  <UserCircle size={40} className="tw-text-slate-400" />
                </div>
                <div className="tw-absolute tw-bottom-0 tw-right-0 tw-w-3 tw-h-3 tw-bg-green-500 tw-border-2 tw-border-white tw-rounded-full" />
              </div>
              <div className="tw-flex-1 tw-min-w-0">
                <div className="tw-text-sm tw-font-bold tw-truncate">管理员</div>
                <div className="tw-text-[11px] tw-text-slate-500">专业版已激活</div>
              </div>
            </div>
            <button className="tw-w-full tw-py-2 tw-text-[12px] tw-font-semibold tw-text-slate-500 hover:tw-text-red-500 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-colors">
              <LogOut size={14} />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="tw-flex-1 tw-flex tw-flex-col tw-overflow-hidden">
        {/* Header */}
        <header className="tw-h-20 tw-bg-white/80 tw-backdrop-blur-md tw-border-b tw-border-slate-100 tw-px-8 tw-flex tw-items-center tw-justify-between tw-z-10">
          <div className="tw-relative tw-w-96">
            <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索账号、任务或内容..."
              className="tw-w-full tw-pl-12 tw-pr-4 tw-py-2.5 tw-bg-slate-50 tw-border-none tw-rounded-xl tw-text-sm focus:tw-ring-2 focus:tw-ring-brand-500/20 tw-transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-1.5 tw-bg-green-50 tw-rounded-lg tw-border tw-border-green-100">
              <ShieldCheck size={14} className="tw-text-green-500" />
              <span className="tw-text-[12px] tw-font-medium tw-text-green-700">{bridgeLabel}</span>
            </div>
            <button className="tw-p-2.5 tw-text-slate-500 hover:tw-bg-slate-50 tw-rounded-xl tw-transition-colors tw-relative">
              <Bell size={20} />
              <span className="tw-absolute tw-top-2 tw-right-2 tw-w-2 tw-h-2 tw-bg-red-500 tw-border-2 tw-border-white tw-rounded-full" />
            </button>
            <button className="tw-p-2.5 tw-text-slate-500 hover:tw-bg-slate-50 tw-rounded-xl tw-transition-colors">
              <Cpu size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="tw-flex-1 tw-overflow-y-auto tw-p-8">
          <div className="tw-max-w-7xl tw-mx-auto">
            <div className="tw-animate-fade-in">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
