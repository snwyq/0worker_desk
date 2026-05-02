import { contextBridge, ipcRenderer } from 'electron';
import type { CreateAccountInput, CreatePostInput } from '../src/shared/types.js';

contextBridge.exposeInMainWorld('weiboPublisher', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input: CreateAccountInput) => ipcRenderer.invoke('accounts:create', input),
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
});
