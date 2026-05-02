import { describe, expect, it } from 'vitest';
import { createInitialWorkspace, openWorkspaceModule, closeWorkspaceTab } from '../../src/renderer/workspaceModel';

describe('workspaceModel', () => {
  it('starts with dashboard selected and one pinned tab', () => {
    const workspace = createInitialWorkspace();

    expect(workspace.activeModule).toBe('dashboard');
    expect(workspace.activeTabId).toBe('dashboard-overview');
    expect(workspace.tabs).toEqual([
      expect.objectContaining({
        id: 'dashboard-overview',
        module: 'dashboard',
        title: '首页',
        pinned: true,
      }),
    ]);
  });

  it('opens and activates the module tab when switching modules', () => {
    const workspace = openWorkspaceModule(createInitialWorkspace(), 'content');

    expect(workspace.activeModule).toBe('content');
    expect(workspace.activeTabId).toBe('content-writing');
    expect(workspace.tabs.map((tab) => tab.id)).toEqual(['dashboard-overview', 'content-writing']);
  });

  it('keeps an existing module tab instead of duplicating it', () => {
    const workspace = openWorkspaceModule(openWorkspaceModule(createInitialWorkspace(), 'content'), 'content');

    expect(workspace.tabs.filter((tab) => tab.id === 'content-writing')).toHaveLength(1);
    expect(workspace.activeTabId).toBe('content-writing');
  });

  it('activates the previous tab when closing the current unpinned tab', () => {
    const workspace = closeWorkspaceTab(openWorkspaceModule(createInitialWorkspace(), 'content'), 'content-writing');

    expect(workspace.activeModule).toBe('dashboard');
    expect(workspace.activeTabId).toBe('dashboard-overview');
    expect(workspace.tabs.map((tab) => tab.id)).toEqual(['dashboard-overview']);
  });
});
