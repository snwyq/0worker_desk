import { contextBridge, ipcRenderer } from 'electron';
import type { CreateAccountInput, CreateContentItemInput, CreatePostInput, UpdateAccountInput, UpdateContentItemInput, UpdateDistributionTaskInput } from '../src/shared/types.js';

contextBridge.exposeInMainWorld('weiboPublisher', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input: CreateAccountInput) => ipcRenderer.invoke('accounts:create', input),
    update: (id: number, input: UpdateAccountInput) => ipcRenderer.invoke('accounts:update', id, input),
    testConnection: (accountId: number) => ipcRenderer.invoke('accounts:testConnection', accountId),
  },
  posts: {
    list: () => ipcRenderer.invoke('posts:list'),
    create: (input: CreatePostInput) => ipcRenderer.invoke('posts:create', input),
    delete: (postId: number) => ipcRenderer.invoke('posts:delete', postId),
    due: () => ipcRenderer.invoke('posts:due'),
    attemptPublish: (postId: number) => ipcRenderer.invoke('posts:attemptPublish', postId),
    publishNow: (postId: number) => ipcRenderer.invoke('posts:publishNow', postId),
  },
  scheduler: {
    start: () => ipcRenderer.invoke('scheduler:start'),
    stop: () => ipcRenderer.invoke('scheduler:stop'),
    status: () => ipcRenderer.invoke('scheduler:status'),
  },
  media: {
    selectFiles: () => ipcRenderer.invoke('media:selectFiles'),
  },
  settings: {
    list: () => ipcRenderer.invoke('settings:list'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },
  platforms: {
    list: () => ipcRenderer.invoke('platforms:list'),
  },
  platformCapabilities: {
    list: () => ipcRenderer.invoke('platformCapabilities:list'),
  },
  contents: {
    list: () => ipcRenderer.invoke('contents:list'),
    create: (input: CreateContentItemInput) => ipcRenderer.invoke('contents:create', input),
    update: (id: number, input: UpdateContentItemInput) => ipcRenderer.invoke('contents:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('contents:delete', id),
    versions: (id: number) => ipcRenderer.invoke('contents:versions', id),
  },
  distributionTasks: {
    list: () => ipcRenderer.invoke('distributionTasks:list'),
    update: (id: number, input: UpdateDistributionTaskInput) => ipcRenderer.invoke('distributionTasks:update', id, input),
    retry: (id: number) => ipcRenderer.invoke('distributionTasks:retry', id),
    cancel: (id: number) => ipcRenderer.invoke('distributionTasks:cancel', id),
    retryMany: (ids: number[]) => ipcRenderer.invoke('distributionTasks:retryMany', ids),
    cancelMany: (ids: number[]) => ipcRenderer.invoke('distributionTasks:cancelMany', ids),
  },
  publishRuns: {
    list: (taskId?: number) => ipcRenderer.invoke('publishRuns:list', taskId),
  },
  updates: {
    status: () => ipcRenderer.invoke('updates:status'),
    check: () => ipcRenderer.invoke('updates:check'),
  },
  helpDocs: {
    get: () => ipcRenderer.invoke('helpDocs:get'),
  },
});
