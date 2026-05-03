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
  Sparkles,
  Box,
  ChevronRight,
  MonitorDot,
  TrendingUp,
} from 'lucide-react';

import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { QueuePage } from './pages/QueuePage';
import { SettingsPage } from './pages/SettingsPage';
import { AiWriterPage } from './pages/AiWriterPage';
import { AgentEnginePage } from './pages/AgentEnginePage';
import { HotTopicsPage } from './pages/HotTopicsPage';

import {
  activateWorkspaceTab,
  createInitialWorkspace,
  openWorkspaceModule,
  type WorkspaceModule,
} from './workspaceModel';

const navGroups = [
  {
    group: '核心指挥',
    items: [
      { id: 'home', label: '仪表盘', icon: MonitorDot },
    ]

  },
  {
    group: '内容生成',
    items: [
      { id: 'ai-writer', label: 'AI 智能创作', icon: Sparkles },
      { id: 'agent-engine', label: 'Agent 引擎', icon: Cpu },
    ]
  },
  {
    group: '内容发布',
    items: [
      { id: 'accounts', label: '账号矩阵', icon: Users },
      { id: 'distribution', label: '发布调度', icon: Rocket },
    ]
  },
  {
    group: '公共信息',
    items: [
      { id: 'hot-topics', label: '实时热点', icon: TrendingUp },
    ]
  },
  {
    group: '系统配置',
    items: [
      { id: 'settings', label: '系统设置', icon: Settings },
    ]
  }
] as const;

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-[60vh] tw-text-slate-400 tw-animate-fade-in">
    <div className="tw-w-24 tw-h-24 tw-bg-white tw-shadow-xl tw-shadow-slate-200/50 tw-rounded-[2.5rem] tw-flex tw-items-center tw-justify-center tw-mb-8 tw-border tw-border-slate-100">
      <Sparkles size={48} className="tw-text-brand-500 tw-animate-pulse" />
    </div>
    <h2 className="tw-text-2xl tw-font-bold tw-text-slate-800 tw-mb-3">{title}</h2>
    <p className="tw-text-slate-500 tw-max-w-xs tw-text-center tw-leading-relaxed">
      该模块正在进行最后的打磨，我们将很快为您带来前所未有的创作体验。
    </p>
  </div>
);


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
      case 'ai-writer': return <AiWriterPage />;

      case 'agent-engine': return <AgentEnginePage />;
      case 'accounts': return <AccountsPage />;
      case 'distribution': return <QueuePage />;
      case 'hot-topics': return <HotTopicsPage />;
      case 'settings': return <SettingsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="tw-flex tw-h-screen tw-bg-[#f8fafc] tw-text-slate-900 tw-font-sans">
      {/* Sidebar - Light Pro Style */}
      <aside className="tw-w-[260px] tw-bg-white tw-flex tw-flex-col tw-z-20 tw-border-r tw-border-slate-100 tw-transition-all">
        <div className="tw-p-8 tw-flex tw-items-center tw-gap-4">
          <div className="tw-w-10 tw-h-10 tw-bg-brand-500 tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-text-white tw-shadow-lg tw-shadow-brand-500/20">
            <MonitorDot size={22} />
          </div>
          <div className="tw-flex tw-flex-col">
            <span className="tw-font-black tw-text-xl tw-tracking-tight tw-text-slate-900">0Worker</span>
            <span className="tw-text-[10px] tw-font-black tw-text-brand-500 tw-uppercase tw-tracking-[0.2em] tw-mt-0.5">Control Center</span>
          </div>
        </div>

        <nav className="tw-flex-1 tw-px-5 tw-space-y-10 tw-overflow-y-auto tw-py-8">
          {navGroups.map((group) => (
            <div key={group.group} className="tw-space-y-3">
              <div className="tw-px-3">
                <span className="tw-text-[9px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.3em]">
                  {group.group}
                </span>
              </div>
              <div className="tw-space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => openModule(item.id as WorkspaceModule)}
                      className={`tw-w-full tw-group tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2.5 tw-rounded-xl tw-transition-all tw-duration-300 ${
                        isActive 
                        ? 'tw-bg-brand-50 tw-text-brand-600' 
                        : 'tw-text-slate-500 hover:tw-bg-slate-50 hover:tw-text-slate-900'
                      }`}
                    >
                      <div className={`tw-transition-all ${isActive ? 'tw-text-brand-600' : 'tw-text-slate-400 group-hover:tw-text-slate-600'}`}>
                        <Icon size={18} />
                      </div>
                      <span className={`tw-text-[13px] tw-tracking-wide tw-font-bold`}>
                        {item.label}
                      </span>
                      {isActive && (
                         <div className="tw-ml-auto tw-w-1 tw-h-1 tw-bg-brand-600 tw-rounded-full tw-shadow-[0_0_8px_#2563eb]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="tw-p-6 tw-mt-auto">
          <div className="tw-p-5 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100">
            <div className="tw-flex tw-items-center tw-gap-3 tw-mb-4">
              <div className="tw-relative">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                  alt="Avatar" 
                  className="tw-w-10 tw-h-10 tw-rounded-xl tw-border tw-border-slate-200"
                />
                <div className="tw-absolute tw-bottom-0 tw-right-0 tw-w-3 tw-h-3 tw-bg-green-500 tw-border-2 tw-border-white tw-rounded-full" />
              </div>
              <div className="tw-flex-1 tw-min-w-0">
                <div className="tw-text-xs tw-font-black tw-text-slate-900 tw-truncate">管理员</div>
                <div className="tw-text-[10px] tw-text-slate-400">工作站所有者</div>
              </div>
            </div>
            <button className="tw-w-full tw-py-2.5 tw-bg-white hover:tw-bg-white/80 tw-text-[11px] tw-font-black tw-text-slate-500 tw-rounded-lg tw-transition-all tw-border tw-border-slate-200 tw-flex tw-items-center tw-justify-center tw-gap-2">
              <LogOut size={12} />
              退出系统
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="tw-flex-1 tw-flex tw-flex-col tw-overflow-hidden tw-bg-[#f8fafc]">
        {/* Header - Big Tech Style */}
        <header className="tw-h-20 tw-bg-white/80 tw-backdrop-blur-xl tw-border-b tw-border-slate-100 tw-px-10 tw-flex tw-items-center tw-justify-between tw-z-10">
          <div className="tw-flex tw-items-center tw-gap-6">
            <div className="tw-relative tw-w-96">
              <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={16} />
              <input
                type="text"
                placeholder="搜索资源、智能体或日志..."
                className="tw-w-full tw-pl-11 tw-pr-4 tw-py-2.5 tw-bg-slate-100/50 tw-border tw-border-transparent focus:tw-bg-white focus:tw-border-slate-200 tw-rounded-2xl tw-text-sm tw-transition-all tw-outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="tw-absolute tw-right-3 tw-top-1/2 tw--translate-y-1/2 tw-px-1.5 tw-py-0.5 tw-bg-white tw-border tw-border-slate-200 tw-rounded-md tw-text-[10px] tw-font-bold tw-text-slate-400 tw-shadow-sm">
                ⌘ K
              </div>
            </div>
          </div>

          <div className="tw-flex tw-items-center tw-gap-6">
            <div className="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-1.5 tw-bg-slate-50 tw-rounded-full tw-border tw-border-slate-200/50">
              <div className="tw-w-2 tw-h-2 tw-bg-green-500 tw-rounded-full" />
              <span className="tw-text-[11px] tw-font-bold tw-text-slate-600 tw-uppercase tw-tracking-tight">{bridgeLabel}</span>
            </div>
            
            <div className="tw-h-4 tw-w-[1px] tw-bg-slate-200" />

            <div className="tw-flex tw-items-center tw-gap-2">
              <button className="tw-p-2 tw-text-slate-400 hover:tw-text-slate-900 hover:tw-bg-slate-100 tw-rounded-xl tw-transition-all tw-relative">
                <Bell size={18} />
                <span className="tw-absolute tw-top-2 tw-right-2 tw-w-2 tw-h-2 tw-bg-brand-accent tw-rounded-full tw-ring-2 tw-ring-white" />
              </button>
              <button className="tw-p-2 tw-text-slate-400 hover:tw-text-slate-900 hover:tw-bg-slate-100 tw-rounded-xl tw-transition-all">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area - Optimized for Fluid Layout */}
        <div className="tw-flex-1 tw-overflow-y-auto tw-p-6 lg:tw-p-10">
          <div className="tw-w-full tw-mx-auto">
            <div className="tw-animate-fade-in">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
