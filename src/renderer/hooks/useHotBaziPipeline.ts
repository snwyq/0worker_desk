import { useCallback, useEffect, useRef, useState } from 'react';
import { appApi } from '../api';
import type { GenerateHotBaziBatchResult, HotBaziProgressEvent, TopicPersonPair } from '../../shared/types';

// ============================================================
// Pipeline 四步状态机
// ============================================================

export type PipelineStage =
  | 'idle'
  | 'syncing-topics'
  | 'analyzing-people'
  | 'generating-bazi'
  | 'enqueueing'
  | 'done'
  | 'error';

export interface StepResult {
  ok: boolean;
  message: string;
  skipped: boolean;
}

export interface PipelineState {
  stage: PipelineStage;
  progress: number;
  currentMessage: string;
  generateProgress: { index: number; total: number } | null;
  steps: Record<string, StepResult>;
  errors: string[];
}

export interface DiagnosticInfo {
  lastFetchTime: string | null;
  todayTopicCount: number;
  matchedPairCount: number;
  pendingCount: number;
  generatedCount: number;
  pendingAnalysis: number;
}

const INITIAL_STATE: PipelineState = {
  stage: 'idle',
  progress: 0,
  currentMessage: '',
  generateProgress: null,
  steps: {},
  errors: [],
};

let globalState = INITIAL_STATE;
const stateListeners = new Set<(state: PipelineState) => void>();

function setGlobalState(updater: PipelineState | ((prev: PipelineState) => PipelineState)) {
  globalState = typeof updater === 'function' ? updater(globalState) : updater;
  stateListeners.forEach(listener => listener(globalState));
}

let globalCancelled = false;

export function useHotBaziPipeline() {
  const [state, setState] = useState<PipelineState>(globalState);

  useEffect(() => {
    stateListeners.add(setState);
    return () => {
      stateListeners.delete(setState);
    };
  }, []);

  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo>({
    lastFetchTime: null,
    todayTopicCount: 0,
    matchedPairCount: 0,
    pendingCount: 0,
    generatedCount: 0,
    pendingAnalysis: 0,
  });

  // 监听逐条生成进度事件
  useEffect(() => {
    const handler = (_: unknown, data: HotBaziProgressEvent) => {
      setGlobalState(prev => ({
        ...prev,
        generateProgress: { index: data.index, total: data.total },
        currentMessage: `正在生成(${data.index}/${data.total}) ${data.personName} · ${data.status || '处理中...'}`,
        progress: 50 + Math.round((data.index / data.total) * 35),
      }));
    };
    const api = (window as any).weiboPublisher;
    if (api?.onHotBaziProgress) {
      const cleanup = api.onHotBaziProgress(handler);
      return cleanup;
    }
    // Electron IPC event listener
    const ipcRenderer = (window as any).electronAPI;
    if (ipcRenderer?.on) {
      ipcRenderer.on('hot-bazi:progress', handler);
      return () => ipcRenderer?.off?.('hot-bazi:progress', handler);
    }
    return undefined;
  }, []);

  /** 加载诊断信息 */
  const loadDiagnostic = useCallback(async () => {
    try {
      const [topicResult, pairs, tasks, queueSummary] = await Promise.all([
        appApi.ai.listHotTopics(false),
        appApi.ai.listTodayTopicPeople(),
        appApi.hotBaziTasks.list(),
        appApi.ai.getHotPeopleQueueSummary(),
      ]);

      const existingKeys = new Set(
        tasks.map(t => `${t.hotPersonId}::${t.sourceTopic}`)
      );
      const pendingCount = pairs.filter(
        p => !existingKeys.has(`${p.personId}::${p.topicTitle}`)
      ).length;

      setDiagnostic({
        lastFetchTime: topicResult.lastFetchTime,
        todayTopicCount: topicResult.items?.length ?? 0,
        matchedPairCount: pairs.length,
        pendingCount,
        generatedCount: pairs.length - pendingCount,
        pendingAnalysis: queueSummary.pendingTopics,
      });
    } catch (err) {
      console.error('Failed to load diagnostic:', err);
    }
  }, []);

  /** 执行完整 Pipeline */
  const runPipeline = useCallback(async (config: {
    accountId: number;
    model: string;
    promptTemplate: string;
    autoEnqueue: boolean;
    limit?: number;
    mediaDir?: string;
    selectedPairs?: Array<{ personId: number; topicTitle: string }>;
  }) => {
    if (globalState.stage !== 'idle' && globalState.stage !== 'done' && globalState.stage !== 'error') {
      console.warn('Pipeline is already running');
      return;
    }
    
    globalCancelled = false;
    setGlobalState({ ...INITIAL_STATE, stage: 'syncing-topics', currentMessage: '正在检查热点数据...', progress: 5 });

    try {
      // ===== Step 1: 同步热点 =====
      const topicResult = await appApi.ai.listHotTopics(false);
      const lastFetchTime = topicResult.lastFetchTime;
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      const isExpired = !lastFetchTime || new Date(lastFetchTime).getTime() < sixHoursAgo;

      if (isExpired) {
        setGlobalState(prev => ({ ...prev, currentMessage: '正在同步实时热点...', progress: 10 }));
        const freshResult = await appApi.ai.listHotTopics(true);
        setGlobalState(prev => ({
          ...prev,
          steps: { ...prev.steps, sync: { ok: true, message: `已同步 ${freshResult.insertedCount ?? 0} 条新热点`, skipped: false } },
          progress: 20,
        }));
      } else {
        const elapsed = Math.round((Date.now() - new Date(lastFetchTime!).getTime()) / 3600000);
        setGlobalState(prev => ({
          ...prev,
          steps: { ...prev.steps, sync: { ok: true, message: `热点已于近期（${elapsed}h前）获取，跳过同步`, skipped: true } },
          progress: 20,
        }));
      }
      if (globalCancelled) throw new Error('USER_CANCELLED');

      // ===== Step 2: 提取人物 =====
      setGlobalState(prev => ({ ...prev, stage: 'analyzing-people', currentMessage: '正在检查人物提取...', progress: 25 }));
      const queueSummary = await appApi.ai.getHotPeopleQueueSummary();

      if (queueSummary.pendingTopics > 0) {
        setGlobalState(prev => ({ ...prev, currentMessage: `正在从 ${queueSummary.pendingTopics} 条热点中提取人物...`, progress: 30 }));
        const analyzeResult = await appApi.ai.analyzeHotPeople({});
        setGlobalState(prev => ({
          ...prev,
          steps: {
            ...prev.steps,
            analyze: {
              ok: true,
              message: `从 ${analyzeResult.processedTopics} 条热点中提取出 ${analyzeResult.createdCount} 个新人物`,
              skipped: false,
            },
          },
          progress: 50,
        }));
      } else {
        setGlobalState(prev => ({
          ...prev,
          steps: { ...prev.steps, analyze: { ok: true, message: '近期热点人物均已分析完毕，跳过提取', skipped: true } },
          progress: 50,
        }));
      }
      if (globalCancelled) throw new Error('USER_CANCELLED');

      // ===== Step 3: 生成八字 =====
      setGlobalState(prev => ({
        ...prev,
        stage: 'generating-bazi',
        currentMessage: '正在准备生成八字分析...',
        progress: 52,
      }));

      const generateResult = await appApi.ai.generateHotBaziBatch({
        accountId: config.accountId,
        model: config.model,
        promptTemplate: config.promptTemplate,
        mediaDir: config.mediaDir,
        selectedPairs: config.selectedPairs,
        limit: config.limit,
      });

      setGlobalState(prev => ({
        ...prev,
        steps: {
          ...prev.steps,
          generate: {
            ok: generateResult.createdContents > 0,
            message: generateResult.createdContents > 0
              ? `成功生成 ${generateResult.createdContents} 条八字分析`
              : '未能生成新内容',
            skipped: generateResult.createdContents === 0,
          },
        },
        progress: 85,
      }));
      if (globalCancelled) throw new Error('USER_CANCELLED');

      // ===== Step 4: 自动送调度 =====
      if (config.autoEnqueue && generateResult.createdTaskIds.length > 0) {
        setGlobalState(prev => ({ ...prev, stage: 'enqueueing', currentMessage: '正在自动送入调度...', progress: 90 }));

        await appApi.hotBaziTasks.batchUpdateStatus({
          taskIds: generateResult.createdTaskIds,
          status: 'queued',
        });
        setGlobalState(prev => ({
          ...prev,
          steps: {
            ...prev.steps,
            enqueue: {
              ok: true,
              message: `已自动调度 ${generateResult.createdTaskIds.length} 条内容`,
              skipped: false,
            },
          },
          progress: 98,
        }));
      }

      // ===== 完成 =====
      setGlobalState(prev => ({
        ...prev,
        stage: 'done',
        progress: 100,
        currentMessage: '全部操作完成！',
      }));

    } catch (err) {
      if (err instanceof Error && err.message === 'USER_CANCELLED') {
        setGlobalState(prev => ({
          ...prev,
          stage: 'error',
          currentMessage: '已取消执行',
          errors: [...prev.errors, '用户手动终止了流水线'],
        }));
      } else {
        console.error('Pipeline failed:', err);
        setGlobalState(prev => ({
          ...prev,
          stage: 'error',
          currentMessage: '执行中发生错误',
          errors: [...prev.errors, err instanceof Error ? err.message : String(err)],
        }));
      }
    }
    await loadDiagnostic();
  }, [loadDiagnostic]);

  /** 取消 Pipeline */
  const cancel = useCallback(() => {
    globalCancelled = true;
    setGlobalState(prev => ({ ...prev, currentMessage: '正在强制取消...', progress: prev.progress }));
  }, []);

  /** 重置状态 */
  const reset = useCallback(() => {
    setGlobalState(INITIAL_STATE);
  }, []);

  return {
    state,
    diagnostic,
    isRunning: state.stage !== 'idle' && state.stage !== 'done' && state.stage !== 'error',
    loadDiagnostic,
    runPipeline,
    cancel,
    reset,
  };
}
