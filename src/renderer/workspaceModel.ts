export type WorkspaceModule = 'home' | 'accounts' | 'distribution' | 'settings';

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
    title: '控制中心',
    subtitle: '查看整体运行状态',
    pinned: true,
  },
  accounts: {
    id: 'accounts-matrix',
    module: 'accounts',
    title: '账号矩阵',
    subtitle: '管理要发布内容的平台账号',
    pinned: true,
  },
  distribution: {
    id: 'distribution-runs',
    module: 'distribution',
    title: '发布调度',
    subtitle: '查看哪些内容待发布、已发布或需要人工处理',
  },
  settings: {
    id: 'settings-engine',
    module: 'settings',
    title: '系统设置',
    subtitle: '语言、网络、账号连接和更新设置',
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
