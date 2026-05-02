import type { ComponentType } from 'react';

export type WorkspaceModule = 'dashboard' | 'content' | 'accounts' | 'distribution' | 'settings' | 'help';

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

export interface WorkspaceModuleDefinition {
  id: WorkspaceModule;
  label: string;
  tooltip: string;
  tab: WorkspaceTab;
  explorerTitle: string;
  explorerGroups: Array<{
    title: string;
    items: Array<{
      label: string;
      meta?: string;
      state?: 'online' | 'processing' | 'warning' | 'idle';
    }>;
  }>;
  component: ComponentType;
}

export const moduleTabs: Record<WorkspaceModule, WorkspaceTab> = {
  dashboard: {
    id: 'dashboard-overview',
    module: 'dashboard',
    title: '首页',
    subtitle: '今天要做的事都在这里',
    pinned: true,
  },
  content: {
    id: 'content-writing',
    module: 'content',
    title: '写内容',
    subtitle: '写一篇内容，再改成适合不同账号发布的版本',
  },
  accounts: {
    id: 'accounts-matrix',
    module: 'accounts',
    title: '账号管理',
    subtitle: '管理要发布内容的平台账号',
  },
  distribution: {
    id: 'distribution-runs',
    module: 'distribution',
    title: '发布任务',
    subtitle: '查看哪些内容待发布、已发布或需要人工处理',
  },
  settings: {
    id: 'settings-engine',
    module: 'settings',
    title: '设置',
    subtitle: '语言、网络、账号连接和更新设置',
  },
  help: {
    id: 'help-docs',
    module: 'help',
    title: '帮助',
    subtitle: '查看使用说明和常见问题',
  },
};

export function createInitialWorkspace(): WorkspaceState {
  const dashboardTab = moduleTabs.dashboard;
  return {
    activeModule: dashboardTab.module,
    activeTabId: dashboardTab.id,
    tabs: [dashboardTab],
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
  const fallbackTab = nextTabs[Math.max(0, closingIndex - 1)] ?? nextTabs[0] ?? moduleTabs.dashboard;

  return {
    activeModule: fallbackTab.module,
    activeTabId: fallbackTab.id,
    tabs: nextTabs.length ? nextTabs : [fallbackTab],
  };
}
