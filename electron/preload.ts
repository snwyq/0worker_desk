import electron from 'electron';
import type { AnalyzeHotPeopleInput, CopyContentStyleInput, CreateAccountInput, CreateContentItemInput, CreateContentStyleInput, CreateDistributionTaskInput, CreateHotBaziTaskInput, CreatePostInput, CreateReviewItemInput, GenerateHotBaziBatchInput, UpdateAccountInput, UpdateContentItemInput, UpdateContentStyleInput, UpdateDistributionTaskInput, UpdateHotBaziTaskInput, CreatePublishingStrategyInput, UpdatePublishingStrategyInput } from '../src/shared/types.js';

const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld('weiboPublisher', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input: CreateAccountInput) => ipcRenderer.invoke('accounts:create', input),
    update: (id: number, input: UpdateAccountInput) => ipcRenderer.invoke('accounts:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('accounts:delete', id),
    testConnection: (accountId: number) => ipcRenderer.invoke('accounts:testConnection', accountId),
    syncAdsPower: () => ipcRenderer.invoke('accounts:sync-adspower'),
    openBrowser: (accountId: number) => ipcRenderer.invoke('accounts:open-browser', accountId),
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
    selectDirectory: (defaultPath?: string) => ipcRenderer.invoke('media:selectDirectory', defaultPath),
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
    create: (input: CreateDistributionTaskInput) => ipcRenderer.invoke('distributionTasks:create', input),
    update: (id: number, input: UpdateDistributionTaskInput) => ipcRenderer.invoke('distributionTasks:update', id, input),
    retry: (id: number) => ipcRenderer.invoke('distributionTasks:retry', id),
    cancel: (id: number) => ipcRenderer.invoke('distributionTasks:cancel', id),
    delete: (id: number) => ipcRenderer.invoke('distributionTasks:delete', id),
    publishNow: (id: number) => ipcRenderer.invoke('distributionTasks:publishNow', id),
    retryMany: (ids: number[]) => ipcRenderer.invoke('distributionTasks:retryMany', ids),
    cancelMany: (ids: number[]) => ipcRenderer.invoke('distributionTasks:cancelMany', ids),
    deleteMany: (ids: number[]) => ipcRenderer.invoke('distributionTasks:deleteMany', ids),
    returnToReview: (id: number, comment?: string) => ipcRenderer.invoke('distributionTasks:returnToReview', id, comment),
    assignSchedule: (id: number) => ipcRenderer.invoke('distributionTasks:assignSchedule', id),
    assignScheduleMany: (ids: number[]) => ipcRenderer.invoke('distributionTasks:assignScheduleMany', ids),
  },
  sourceColumns: {
    list: () => ipcRenderer.invoke('sourceColumns:list'),
  },
  publishingStrategies: {
    list: () => ipcRenderer.invoke('publishingStrategies:list'),
    findByWorkflow: (workflowCode: string) => ipcRenderer.invoke('publishingStrategies:findByWorkflow', workflowCode),
    upsert: (input: CreatePublishingStrategyInput) => ipcRenderer.invoke('publishingStrategies:upsert', input),
    delete: (workflowCode: string) => ipcRenderer.invoke('publishingStrategies:delete', workflowCode),
  },
  hotBaziTasks: {
    list: () => ipcRenderer.invoke('hotBaziTasks:list'),
    create: (input: CreateHotBaziTaskInput) => ipcRenderer.invoke('hotBaziTasks:create', input),
    update: (id: number, input: UpdateHotBaziTaskInput) => ipcRenderer.invoke('hotBaziTasks:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('hotBaziTasks:delete', id),
    deleteMany: (ids: number[]) => ipcRenderer.invoke('hotBaziTasks:deleteMany', ids),
    enqueue: (id: number) => ipcRenderer.invoke('hotBaziTasks:enqueue', id),
    enqueueMany: (ids: number[]) => ipcRenderer.invoke('hotBaziTasks:enqueueMany', ids),
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
  app: {
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },
  ai: {
    generate: (options: any) => ipcRenderer.invoke('ai:generate', options),
    generateImage: (options: any) => ipcRenderer.invoke('ai:generateImage', options),
    listPlugins: () => ipcRenderer.invoke('ai:listPlugins'),
    listStyles: (accountId: number, pluginCode?: string) => ipcRenderer.invoke('ai:listStyles', accountId, pluginCode),
    createStyle: (input: CreateContentStyleInput) => ipcRenderer.invoke('ai:createStyle', input),
    updateStyle: (id: string, input: UpdateContentStyleInput) => ipcRenderer.invoke('ai:updateStyle', id, input),
    copyStyleToAccounts: (id: string, input: CopyContentStyleInput) => ipcRenderer.invoke('ai:copyStyleToAccounts', id, input),
    deleteStyle: (id: string) => ipcRenderer.invoke('ai:deleteStyle', id),
    listWorkflows: (pluginCode: string) => ipcRenderer.invoke('ai:listWorkflows', pluginCode),
    startWorkflowRun: (input: any) => ipcRenderer.invoke('ai:startWorkflowRun', input),
    getWorkflowRun: (runId: string) => ipcRenderer.invoke('ai:getWorkflowRun', runId),
    listHotTopics: (force?: boolean) => ipcRenderer.invoke('ai:listHotTopics', force),
    getHotPeopleQueueSummary: () => ipcRenderer.invoke('ai:getHotPeopleQueueSummary'),
    getHotPeopleAnalyzeProgress: () => ipcRenderer.invoke('ai:getHotPeopleAnalyzeProgress'),
    listHotPeople: () => ipcRenderer.invoke('ai:listHotPeople'),
    deleteAllHotPeople: () => ipcRenderer.invoke('ai:deleteAllHotPeople'),
    resetHotPeopleAnalysis: () => ipcRenderer.invoke('ai:resetHotPeopleAnalysis'),
    analyzeHotPeople: (input?: AnalyzeHotPeopleInput) => ipcRenderer.invoke('ai:analyzeHotPeople', input),
    generateHotBaziBatch: (input: GenerateHotBaziBatchInput) => ipcRenderer.invoke('ai:generateHotBaziBatch', input),
    regenerateHotBaziMedia: (taskIds: number[], mediaDir?: string) => ipcRenderer.invoke('ai:regenerateHotBaziMedia', taskIds, mediaDir),
    listTodayTopicPeople: () => ipcRenderer.invoke('ai:listTodayTopicPeople'),
    onHotBaziProgress: (callback: any) => {
      const subscription = (_event: any, data: any) => callback(_event, data);
      ipcRenderer.on('hot-bazi:progress', subscription);
      return () => ipcRenderer.removeListener('hot-bazi:progress', subscription);
    },
    previewWorkflow: (pluginCode: string, workflowCode: string, inputParams: any) => ipcRenderer.invoke('ai:previewWorkflow_v3', pluginCode, workflowCode, inputParams),
    startAgentSchedule: (accountId: number) => ipcRenderer.invoke('ai:startAgentSchedule', accountId),
    onWorkflowLog: (callback: any) => {
      const subscription = (_event: any, log: any) => callback(log);
      ipcRenderer.on('ai:workflow-log', subscription);
      return () => ipcRenderer.removeListener('ai:workflow-log', subscription);
    },
  },
  review: {
    listItems: () => ipcRenderer.invoke('review:listItems'),
    create: (input: CreateReviewItemInput) => ipcRenderer.invoke('review:create', input),
    approve: (id: number, reviewerId: string, comment?: string) => ipcRenderer.invoke('review:approve', id, reviewerId, comment),
    reject: (id: number, reviewerId: string, comment?: string) => ipcRenderer.invoke('review:reject', id, reviewerId, comment),
    rewrite: (id: number, reviewerId: string, comment?: string, rewrittenBody?: string) => (
      ipcRenderer.invoke('review:rewrite', id, reviewerId, comment, rewrittenBody)
    ),
  },
});
