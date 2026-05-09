import { useEffect, useState } from 'react';
import {
  Bell,
  Box,
  Cpu,
  LogOut,
  MonitorDot,
  Rocket,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  UsersRound,
} from 'lucide-react';

import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { QueuePage } from './pages/QueuePage';
import { SettingsPage } from './pages/SettingsPage';

import { HotTopicsPage } from './pages/HotTopicsPage';
import { HotPeoplePage } from './pages/HotPeoplePage';
import { HotBaziPage } from './pages/HotBaziPage';
import { FacePalmPage } from './pages/FacePalmPage';
import { BaziChartExportPage } from './pages/export/BaziChartExportPage';
import VideoHookExportPage from './pages/export/VideoHookExportPage';

import {
  createInitialWorkspace,
  openWorkspaceModule,
  type WorkspaceModule,
} from './workspaceModel';

const navGroups = [
  {
    group: '核心指挥',
    items: [
      { id: 'home', label: '仪表盘', icon: MonitorDot },
      { id: 'accounts', label: '账号矩阵', icon: Users },
    ],
  },
  {
    group: '内容生成',
    items: [
      { id: 'hot-bazi', label: '热点八字', icon: Box },
      { id: 'face-palm', label: '面相手相', icon: Sparkles },
    ],
  },
  {
    group: '内容发布',
    items: [
      { id: 'distribution', label: '发布调度', icon: Rocket },
    ],
  },
  {
    group: '公共信息',
    items: [
      { id: 'hot-topics', label: '实时热点', icon: TrendingUp },
      { id: 'hot-people', label: '热点人物', icon: UsersRound },
    ],
  },
  {
    group: '系统配置',
    items: [
      { id: 'settings', label: '系统设置', icon: Settings },
    ],
  },
] as const;

export function App() {
  const [workspace, setWorkspace] = useState(createInitialWorkspace);
  const [searchQuery, setSearchQuery] = useState('');

  const activeModule = workspace.activeModule;
  const bridgeLabel = window.weiboPublisher ? '桌面端已连接' : '本地服务已连接';

  function openModule(module: WorkspaceModule) {
    setWorkspace((current) => openWorkspaceModule(current, module));
  }

  useEffect(() => {
    const handleOpenHotPeople = () => openModule('hot-people');
    const handleOpenSettings = () => openModule('settings');
    
    window.addEventListener('workspace:open-hot-people', handleOpenHotPeople);
    window.addEventListener('workspace:open-settings', handleOpenSettings);
    
    return () => {
      window.removeEventListener('workspace:open-hot-people', handleOpenHotPeople);
      window.removeEventListener('workspace:open-settings', handleOpenSettings);
    };
  }, []);

  const renderContent = () => {
    switch (activeModule) {
      case 'home': return <HomePage />;

      case 'accounts': return <AccountsPage />;
      case 'distribution': return <QueuePage />;
      case 'hot-topics': return <HotTopicsPage />;
      case 'hot-people': return <HotPeoplePage onOpenHotTopics={() => openModule('hot-topics')} />;
      case 'hot-bazi': return <HotBaziPage />;
      case 'face-palm': return <FacePalmPage />;
      case 'settings': return <SettingsPage />;
      case 'export-bazi-chart': return <BaziChartExportPage />;
      case 'export-video-hook': return <VideoHookExportPage />;
      default: return <HomePage />;
    }
  };

  // 🔴 关键修复：如果是导出页面，直接渲染，不包裹 Layout 框架
  if (activeModule === 'export-bazi-chart') {
    return <BaziChartExportPage />;
  }
  if (activeModule === 'export-video-hook') {
    return <VideoHookExportPage />;
  }

  return (
    <div className="tw-flex tw-h-screen tw-bg-slate-50 tw-text-slate-900 tw-font-sans">
      <aside className="tw-w-[240px] tw-bg-white tw-flex tw-flex-col tw-z-20 tw-border-r tw-border-slate-200">
        <div className="tw-p-6 tw-flex tw-items-center tw-gap-3">
          <div className="tw-w-8 tw-h-8 tw-bg-slate-900 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-text-white tw-shadow-sm">
            <MonitorDot size={18} />
          </div>
          <div className="tw-flex tw-flex-col">
            <span className="tw-font-black tw-text-lg tw-tracking-tight tw-text-slate-900">0Worker</span>
          </div>
        </div>

        <nav className="tw-flex-1 tw-px-4 tw-space-y-5 tw-overflow-y-auto tw-py-2">
          {navGroups.map((group) => (
            <div key={group.group} className="tw-space-y-1.5">
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
                      className={`tw-w-full tw-group tw-flex tw-items-center tw-gap-3 tw-px-3 tw-py-2 tw-rounded-lg tw-transition-colors ${
                        isActive
                          ? 'tw-bg-slate-900 tw-text-white tw-shadow-sm'
                          : 'tw-text-slate-900 hover:tw-bg-slate-100'
                      }`}
                    >
                      <div className={`${isActive ? 'tw-text-white' : 'tw-text-slate-900 group-hover:tw-text-black'}`}>
                        <Icon size={16} />
                      </div>
                      <span className={`tw-text-sm tw-tracking-wide tw-font-medium ${isActive ? 'tw-font-semibold' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="tw-p-4 tw-mt-auto">
          <div className="tw-p-4 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200">
            <div className="tw-flex tw-items-center tw-gap-3 tw-mb-3">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                alt="Avatar"
                className="tw-w-8 tw-h-8 tw-rounded-lg tw-bg-white tw-border tw-border-slate-200"
              />
              <div className="tw-flex-1 tw-min-w-0">
                <div className="tw-text-sm tw-font-bold tw-text-slate-900 tw-truncate">管理员</div>
              </div>
            </div>
            <button className="tw-w-full tw-py-2 tw-text-xs tw-font-semibold tw-text-slate-900 hover:tw-bg-slate-200 hover:tw-text-black tw-rounded-lg tw-transition-colors tw-flex tw-items-center tw-justify-center tw-gap-2">
              <LogOut size={14} />
              退出
            </button>
          </div>
        </div>
      </aside>

      <main className="tw-flex-1 tw-flex tw-flex-col tw-overflow-hidden tw-bg-slate-50">
        <header className="tw-h-16 tw-bg-white tw-border-b tw-border-slate-200 tw-px-8 tw-flex tw-items-center tw-justify-between tw-z-10">
          <div className="tw-flex tw-items-center tw-gap-6">
            <div className="tw-relative tw-w-80">
              <Search className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={14} />
              <input
                type="text"
                placeholder="搜索资源、规则或日志..."
                className="tw-w-full tw-pl-9 tw-pr-4 tw-py-2 tw-bg-white tw-border tw-border-slate-200 focus:tw-border-slate-900 tw-rounded-xl tw-text-sm tw-transition-all tw-outline-none tw-shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-flex tw-items-center tw-gap-2">
              <div className="tw-w-1.5 tw-h-1.5 tw-bg-emerald-500 tw-rounded-full" />
              <span className="tw-text-xs tw-font-medium tw-text-slate-500">{bridgeLabel}</span>
            </div>
          </div>
        </header>

        <div className="tw-flex-1 tw-overflow-y-auto tw-p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
