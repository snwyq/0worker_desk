import { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
  CircleHelp,
  Cpu,
  FileText,
  Gauge,
  PanelBottom,
  Rocket,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { AccountsPage } from './pages/AccountsPage';
import { ContentPage } from './pages/ContentPage';
import { HelpPage } from './pages/HelpPage';
import { HomePage } from './pages/HomePage';
import { QueuePage } from './pages/QueuePage';
import { SettingsPage } from './pages/SettingsPage';
import {
  activateWorkspaceTab,
  closeWorkspaceTab,
  createInitialWorkspace,
  openWorkspaceModule,
  type WorkspaceModule,
  type WorkspaceModuleDefinition,
} from './workspaceModel';

const moduleDefinitions: WorkspaceModuleDefinition[] = [
  {
    id: 'dashboard',
    label: '首页',
    tooltip: '首页',
    tab: {
      id: 'dashboard-overview',
      module: 'dashboard',
      title: '首页',
      subtitle: '今天要做的事都在这里',
      pinned: true,
    },
    explorerTitle: '常用入口',
    explorerGroups: [
      {
        title: '现在可以做',
        items: [
          { label: '写一篇新内容', meta: '新建', state: 'online' },
          { label: '检查账号是否可用', meta: '12 个账号', state: 'processing' },
          { label: '看看失败的发布', meta: '2 条提醒', state: 'warning' },
        ],
      },
      {
        title: '最近处理',
        items: [
          { label: '周报总结', meta: '待发布' },
          { label: '微博账号检查', meta: '8 分钟前' },
        ],
      },
    ],
    component: HomePage,
  },
  {
    id: 'content',
    label: '写内容',
    tooltip: '写内容',
    tab: {
      id: 'content-writing',
      module: 'content',
      title: '写内容',
      subtitle: '写一篇内容，再改成适合不同账号发布的版本',
    },
    explorerTitle: '内容列表',
    explorerGroups: [
      {
        title: '按状态看',
        items: [
          { label: '收集箱', meta: '8' },
          { label: '草稿', meta: '未完成' },
          { label: '已发布', meta: '存档' },
        ],
      },
      {
        title: '按类型看',
        items: [
          { label: '行业观察', meta: '标签' },
          { label: '产品更新', meta: '标签' },
          { label: '复盘总结', meta: '标签' },
        ],
      },
    ],
    component: ContentPage,
  },
  {
    id: 'accounts',
    label: '账号管理',
    tooltip: '账号管理',
    tab: {
      id: 'accounts-matrix',
      module: 'accounts',
      title: '账号管理',
      subtitle: '管理要发布内容的平台账号',
    },
    explorerTitle: '账号分类',
    explorerGroups: [
      {
        title: '平台',
        items: [
          { label: '微博', meta: '可用', state: 'online' },
          { label: '小红书', meta: '准备中' },
          { label: '抖音', meta: '准备中' },
        ],
      },
      {
        title: '账号状态',
        items: [
          { label: '正常可用', meta: '绿色', state: 'online' },
          { label: '登录失效', meta: '需要处理', state: 'warning' },
        ],
      },
    ],
    component: AccountsPage,
  },
  {
    id: 'distribution',
    label: '发布任务',
    tooltip: '发布任务',
    tab: {
      id: 'distribution-runs',
      module: 'distribution',
      title: '发布任务',
      subtitle: '查看哪些内容待发布、已发布或需要人工处理',
    },
    explorerTitle: '任务列表',
    explorerGroups: [
      {
        title: '发布进度',
        items: [
          { label: '正在排队', meta: '进行中', state: 'processing' },
          { label: '发布记录', meta: '历史' },
          { label: '定时发布', meta: '计划' },
        ],
      },
    ],
    component: QueuePage,
  },
  {
    id: 'settings',
    label: '设置',
    tooltip: '设置',
    tab: {
      id: 'settings-engine',
      module: 'settings',
      title: '设置',
      subtitle: '语言、网络、账号连接和更新设置',
    },
    explorerTitle: '设置项',
    explorerGroups: [
      {
        title: '基础设置',
        items: [
          { label: '工作区与主题' },
          { label: '网络与代理' },
          { label: 'AI 服务设置' },
        ],
      },
    ],
    component: SettingsPage,
  },
  {
    id: 'help',
    label: '帮助',
    tooltip: '帮助',
    tab: {
      id: 'help-docs',
      module: 'help',
      title: '帮助',
      subtitle: '查看使用说明和常见问题',
    },
    explorerTitle: '帮助目录',
    explorerGroups: [
      {
        title: '文档',
        items: [
          { label: '怎么开始使用' },
          { label: '怎么升级软件' },
          { label: '怎么接入平台账号' },
        ],
      },
    ],
    component: HelpPage,
  },
];

const moduleIcons: Record<WorkspaceModule, typeof Gauge> = {
  dashboard: Gauge,
  content: FileText,
  accounts: Users,
  distribution: Rocket,
  settings: Settings,
  help: CircleHelp,
};

export function App() {
  const [workspace, setWorkspace] = useState(createInitialWorkspace);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const activeDefinition = moduleDefinitions.find((item) => item.id === workspace.activeModule) ?? moduleDefinitions[0];
  const activeTab = workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? workspace.tabs[0];
  const activeTabDefinition = moduleDefinitions.find((item) => item.id === activeTab.module) ?? moduleDefinitions[0];
  const ActiveCanvas = activeTabDefinition.component;
  const bridgeLabel = window.weiboPublisher ? '桌面端已连接' : '本地服务已连接';
  const primaryModules = moduleDefinitions.filter((item) => !['settings', 'help'].includes(item.id));
  const utilityModules = moduleDefinitions.filter((item) => ['settings', 'help'].includes(item.id));
  const terminalLines = useMemo(
    () => [
      '[状态] 软件已启动，可以开始使用',
      '[发布] 暂无正在发布的任务',
      `[连接] ${bridgeLabel}`,
      '[提醒] 有问题的账号或任务会显示在这里',
    ],
    [bridgeLabel],
  );

  function openModule(module: WorkspaceModule) {
    setWorkspace((current) => openWorkspaceModule(current, module));
  }

  return (
    <main className="ide-shell">
      <header className="title-bar">
        <div className="workspace-mark">
          <Boxes size={16} />
          <span>0Worker Desk</span>
          <strong>帮你把一篇内容发到多个平台</strong>
        </div>
        <label className="command-center">
          <Search size={15} />
          <input aria-label="搜索内容、账号或任务" placeholder="搜索内容、账号或发布任务..." />
        </label>
        <div className="title-actions">
          <span className="engine-pill">
            <span className="status-dot online" />
            {bridgeLabel}
          </span>
          <button className="icon-button" type="button" title="提醒" aria-label="提醒">
            <Bell size={16} />
          </button>
          <button className="icon-button" type="button" title="连接状态" aria-label="连接状态">
            <Cpu size={16} />
          </button>
        </div>
      </header>

      <aside className="activity-bar" aria-label="主要功能">
        <nav className="activity-group">
          {primaryModules.map((item) => {
            const Icon = moduleIcons[item.id];
            return (
              <button
                aria-label={item.label}
                className={item.id === workspace.activeModule ? 'activity-button active' : 'activity-button'}
                key={item.id}
                onClick={() => openModule(item.id)}
                title={item.tooltip}
                type="button"
              >
                <Icon size={20} />
              </button>
            );
          })}
        </nav>
        <nav className="activity-group utility">
          {utilityModules.map((item) => {
            const Icon = moduleIcons[item.id];
            return (
              <button
                aria-label={item.label}
                className={item.id === workspace.activeModule ? 'activity-button active' : 'activity-button'}
                key={item.id}
                onClick={() => openModule(item.id)}
                title={item.tooltip}
                type="button"
              >
                <Icon size={20} />
              </button>
            );
          })}
        </nav>
      </aside>

      <aside className="explorer-panel">
        <div className="explorer-head">
          <span>{activeDefinition.explorerTitle}</span>
          <ChevronDown size={14} />
        </div>
        <div className="explorer-body">
          {activeDefinition.explorerGroups.map((group) => (
            <section className="explorer-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.items.map((item) => (
                <button className="explorer-row" key={`${group.title}-${item.label}`} type="button">
                  {item.state && <span className={`status-dot ${item.state}`} />}
                  <span>{item.label}</span>
                  {item.meta && <code>{item.meta}</code>}
                </button>
              ))}
            </section>
          ))}
        </div>
      </aside>

      <section className="editor-area">
        <div className="tab-strip" role="tablist" aria-label="已打开页面">
          {workspace.tabs.map((tab) => (
            <button
              className={tab.id === workspace.activeTabId ? 'editor-tab active' : 'editor-tab'}
              key={tab.id}
              onClick={() => setWorkspace((current) => activateWorkspaceTab(current, tab.id))}
              role="tab"
              type="button"
            >
              <span>{tab.title}</span>
              {!tab.pinned && (
                <X
                  aria-hidden="true"
                  size={13}
                  onClick={(event) => {
                    event.stopPropagation();
                    setWorkspace((current) => closeWorkspaceTab(current, tab.id));
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="canvas-toolbar">
          <div>
            <p>{activeTab.subtitle}</p>
            <h1>{activeTab.title}</h1>
          </div>
          <div className="toolbar-actions">
            <button className="ghost-button" type="button">
              <Activity size={15} />
              查看记录
            </button>
            <button className="primary-button" type="button">
              <Rocket size={15} />
              加入发布
            </button>
          </div>
        </div>

        <div className="canvas-scroll">
          <ActiveCanvas />
        </div>

        <section className={terminalOpen ? 'terminal-panel open' : 'terminal-panel'}>
          <button className="terminal-toggle" type="button" onClick={() => setTerminalOpen((value) => !value)}>
            <PanelBottom size={15} />
            <span>运行信息</span>
          </button>
          {terminalOpen && (
            <div className="terminal-content">
              <div className="terminal-tabs">
                <button className="active" type="button">运行信息</button>
                <button type="button">发布队列</button>
                <button type="button">提醒</button>
              </div>
              <pre>{terminalLines.join('\n')}</pre>
            </div>
          )}
        </section>
      </section>

      <footer className="status-bar">
        <span><span className="status-dot online" /> {bridgeLabel}</span>
        <span>网络正常</span>
        <span>AI 服务可用</span>
        <span><BookOpen size={13} /> 当前工作区：默认</span>
      </footer>
    </main>
  );
}
