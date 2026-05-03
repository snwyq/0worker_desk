export type WorkspaceModule = 
  | 'home' 
  | 'ai-writer' 
  | 'agent-engine'
  | 'asset-factory' 
  | 'accounts' 
  | 'distribution' 
  | 'hot-topics'
  | 'settings';


export interface WorkspaceTab {
  id: string;
  module: WorkspaceModule;
  title: string;
  subtitle: string;
  pinned?: boolean;
}

export interface WorkspaceState {
  activeModule: WorkspaceModule;
  activeTabId: string;
  tabs: WorkspaceTab[];
}

export const moduleTabs: Record<WorkspaceModule, WorkspaceTab> = {
  home: {
    id: 'dashboard',
    module: 'home',
    title: '仪表盘',
    subtitle: '实时监控与核心策略调度',
    pinned: true,
  },

  'ai-writer': {
    id: 'ai-writer-tab',
    module: 'ai-writer',
    title: 'AI 智能创作',
    subtitle: '基于大模型的文案生成与优化',
  },
  'agent-engine': {
    id: 'agent-engine-tab',
    module: 'agent-engine',
    title: 'Agent 引擎',
    subtitle: '自动化内容生产流水线编排',
  },
  'asset-factory': {
    id: 'asset-factory-tab',
    module: 'asset-factory',
    title: '素材工厂',
    subtitle: '多媒体素材管理与批量处理',
  },
  accounts: {
    id: 'accounts-matrix',
    module: 'accounts',
    title: '账号矩阵',
    subtitle: '全平台社交账号集成管理',
    pinned: true,
  },
  distribution: {
    id: 'distribution-runs',
    module: 'distribution',
    title: '发布调度',
    subtitle: '自动化发布流与状态追踪',
  },
  'hot-topics': {
    id: 'hot-topics-tab',
    module: 'hot-topics',
    title: '实时热点',
    subtitle: '聚合全网热点，提供即时创作灵感',
  },
  settings: {
    id: 'settings-engine',
    module: 'settings',
    title: '系统设置',
    subtitle: '偏好设置、网络环境与安全选项',
  },
};


export function createInitialWorkspace(): WorkspaceState {
  const homeTab = moduleTabs.home;
  return {
    activeModule: homeTab.module,
    activeTabId: homeTab.id,
    tabs: [homeTab],
  };
}

export function openWorkspaceModule(workspace: WorkspaceState, module: WorkspaceModule): WorkspaceState {
  const nextTab = moduleTabs[module];
  const existingTab = workspace.tabs.find((tab) => tab.id === nextTab.id);

  return {
    activeModule: module,
    activeTabId: existingTab?.id ?? nextTab.id,
    tabs: existingTab ? workspace.tabs : [...workspace.tabs, nextTab],
  };
}

export function activateWorkspaceTab(workspace: WorkspaceState, tabId: string): WorkspaceState {
  const tab = workspace.tabs.find((item) => item.id === tabId);
  if (!tab) {
    return workspace;
  }

  return {
    ...workspace,
    activeModule: tab.module,
    activeTabId: tab.id,
  };
}

export function closeWorkspaceTab(workspace: WorkspaceState, tabId: string): WorkspaceState {
  const closingTab = workspace.tabs.find((tab) => tab.id === tabId);
  if (!closingTab || closingTab.pinned) {
    return workspace;
  }

  const closingIndex = workspace.tabs.findIndex((tab) => tab.id === tabId);
  const nextTabs = workspace.tabs.filter((tab) => tab.id !== tabId);
  const fallbackTab = nextTabs[Math.max(0, closingIndex - 1)] ?? nextTabs[0] ?? moduleTabs.accounts;

  return {
    activeModule: fallbackTab.module,
    activeTabId: fallbackTab.id,
    tabs: nextTabs.length ? nextTabs : [fallbackTab],
  };
}
