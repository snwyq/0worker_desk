import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Copy, Flame, FolderOpen, Image as ImageIcon, Loader2, Pencil, Send, Settings2, Sparkles, Trash2, X } from 'lucide-react';
import { appApi } from '../api';
import { useHotBaziPipeline } from '../hooks/useHotBaziPipeline';
import type { Account, HotBaziTask, HotPerson, AiWorkflow, TopicPersonPair } from '../../shared/types';

const batchSizeOptions = [
  { value: '2', label: '2 条' },
  { value: '5', label: '5 条' },
  { value: '20', label: '20 条' },
  { value: '50', label: '50 条' },
  { value: 'all', label: '全部' },
];

const HOT_BAZI_CONFIG_STORAGE_KEY = 'hotBazi.generationConfig';
const HOT_BAZI_RUN_STATE_KEY = 'hotBazi.generationState';
const OPEN_HOT_PEOPLE_EVENT = 'workspace:open-hot-people';
const modelOptions = ['qwen3.5-plus', 'deepseek-v3.2', 'kimi-k2.5'] as const;
type HotBaziModel = typeof modelOptions[number];
type HotBaziRunStatus = 'idle' | 'running' | 'success' | 'failed';

interface StoredHotBaziConfig {
  accountId?: string;
  model?: HotBaziModel;
  batchSize?: string;
  promptTemplate?: string;
  workflowCode?: string;
  mediaDir?: string;
}

interface HotBaziRunState {
  status: HotBaziRunStatus;
  message: string;
  updatedAt: string;
}

function readStoredHotBaziConfig(): StoredHotBaziConfig {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HOT_BAZI_CONFIG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredHotBaziConfig;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readRunState(): HotBaziRunState {
  if (typeof window === 'undefined') return { status: 'idle', message: '', updatedAt: '' };
  try {
    const raw = window.localStorage.getItem(HOT_BAZI_RUN_STATE_KEY);
    if (!raw) return { status: 'idle', message: '', updatedAt: '' };
    const parsed = JSON.parse(raw) as HotBaziRunState;
    return {
      status: parsed?.status === 'running' || parsed?.status === 'success' || parsed?.status === 'failed' ? parsed.status : 'idle',
      message: typeof parsed?.message === 'string' ? parsed.message : '',
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return { status: 'idle', message: '', updatedAt: '' };
  }
}

const defaultPromptTemplate = [
  '请扮演一位拥有二十年实战经验、铁口直断的高级命理师。请根据以下资料，撰写一篇用词犀利、极具宿命感的人物八字短评。',
  '',
  '【输入资料】',
  '人物：{{personName}}',
  '生日：{{birthday}}',
  '八字：{{sizhu}}',
  '大运：{{dayunInfo}}',
  '话题标签：{{sourceTopic}}',
  '',
  '【全局铁律】',
  '1. 独立论命，绝不迎合：正文完全独立进行命理推断与运势分析，【绝对禁止】在正文中生搬硬套、牵强附会地去解释“话题标签”的内容。保持命理师的高冷与客观。',
  '2. 禁绝幻觉：必须结合该人物已知的真实经历。如果对部分经历不确定，请用宏观的运势起伏（如“必生波折”、“得贵人提携”）来替代，严禁凭空捏造未曾发生的具体事件。',
  '3. 行文风格：一针见血，干脆利落。多用带有宿命感的短句与四字词（如：水大木漂、岁运并临、贪财坏印等），带出专业压迫感。',
  '4. 格式与字数：总字数严格控制在300字以内，拒绝废话。除首行话题标签外，正文绝对禁止使用任何 Markdown 格式（如加粗、星号等），仅保留自然换行。',
  '5. 严守流年：当前流年为{{currentYear}}年（{{currentYearGanzhi}}），下一年为{{nextYear}}年（{{nextYearGanzhi}}），禁止篡改。',
  '',
  '【严密的文章结构】',
  '第一行（独占一行）：#{{sourceTopic}}#',
  '',
  '第一段（定调与格局，约70字）：必须以【命局提要】开头。首句必须直呼“{{personName}}”其名，然后一两句话写这个人的重要的年份和经历简介，接着写出“公开资料显示其生日是{{birthday}}，八字为{{sizhu}}”，然后用一句话下定论（如“这是典型的xx之命”），接着简练点出其八字核心格局及最致命的喜忌。',
  '',
  '第二段（约150字，大运复盘，流年分析，必须分层写，一句一行，大运或年份起头）：',
  '要求：短句为主，真实经历的字数必须多于命理分析。',
  '阶段一：必须以【大运复盘】开头。先写1句重点大运或年份的干支作用，紧接其在该阶段真实的经历变化。',
  '阶段二：换行另起，写1句下一步大运的命理判断，紧接对应的真实境遇变化。',
  '如果有更多关键阶段，继续换行另起增加内容，保持相同格式。',
  '',
  '第三段（综合论断与流年推断今年和明年的情况，也是一句一行，年份起头）：',
  '必须以【近期流年】开头。专业评析流年的干支与本命局以及大运干支在这两年对其事业、感情或健康或重要事件的可能性事件与影响。',
  '最后，直接断定{{currentYear}}年（{{currentYearGanzhi}}）与{{nextYear}}年（{{nextYearGanzhi}}）的流年走势，并直言预测这两年最明显的运势特点。',
].join('\n');

export function HotBaziPage() {
  const storedConfig = readStoredHotBaziConfig();
  const pipeline = useHotBaziPipeline();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<HotBaziTask[]>([]);
  const [topicPeople, setTopicPeople] = useState<TopicPersonPair[]>([]);
  const [activeTab, setActiveTab] = useState<'draft' | 'queued'>('draft');
  const [hotPeople, setHotPeople] = useState<HotPerson[]>([]);
  const [autoEnqueue, setAutoEnqueue] = useState(false);
  const [selectedPairKeys, setSelectedPairKeys] = useState<Set<string>>(new Set());
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingMediaPaths, setEditingMediaPaths] = useState<string[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const [accountId, setAccountId] = useState(storedConfig.accountId ?? '');
  const [model, setModel] = useState<HotBaziModel>(modelOptions.includes(storedConfig.model as HotBaziModel) ? (storedConfig.model as HotBaziModel) : 'deepseek-v3.2');
  const [batchSize, setBatchSize] = useState(storedConfig.batchSize ?? '2');
  const [workflowCode, setWorkflowCode] = useState(storedConfig.workflowCode ?? '');
  const [mediaDir, setMediaDir] = useState(storedConfig.mediaDir ?? '');
  const [promptTemplate, setPromptTemplate] = useState(storedConfig.promptTemplate || defaultPromptTemplate);
  const [runState, setRunState] = useState<HotBaziRunState>(() => readRunState());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingTaskId, setIsSavingTaskId] = useState<number | null>(null);
  const [isDeletingTaskId, setIsDeletingTaskId] = useState<number | null>(null);
  const [isEnqueueingTaskId, setIsEnqueueingTaskId] = useState<number | null>(null);
  const [batchWorkingType, setBatchWorkingType] = useState<'enqueue' | 'delete' | 'regenerate' | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [configDraft, setConfigDraft] = useState({
    accountId: storedConfig.accountId ?? '',
    model: modelOptions.includes(storedConfig.model as HotBaziModel) ? (storedConfig.model as HotBaziModel) : 'deepseek-v3.2',
    batchSize: storedConfig.batchSize ?? '2',
    workflowCode: storedConfig.workflowCode ?? '',
    mediaDir: storedConfig.mediaDir ?? '',
  });

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);

  // 今日热点×人物配对展示列表（按热度排序，标注生成状态）
  const displayList = useMemo(() => {
    const taskMap = new Map(
      tasks.map(t => [`${t.hotPersonId}::${t.sourceTopic}`, t])
    );
    return topicPeople.map(pair => ({
      ...pair,
      key: `${pair.personId}::${pair.topicTitle}`,
      generated: taskMap.has(`${pair.personId}::${pair.topicTitle}`),
      task: taskMap.get(`${pair.personId}::${pair.topicTitle}`) || null,
    }));
  }, [topicPeople, tasks]);

  const pendingItems = displayList.filter(d => !d.generated);
  const generatedItems = displayList.filter(d => d.generated);

  // 按热点分组的数据
  const groupedTopics = useMemo(() => {
    const groups: Record<string, {
      topicTitle: string;
      topicPlatform: string;
      hotValue: string;
      hotValueNum: number;
      pairs: typeof displayList;
    }> = {};
    
    displayList.forEach(item => {
      if (!groups[item.topicTitle]) {
        groups[item.topicTitle] = {
          topicTitle: item.topicTitle,
          topicPlatform: item.topicPlatform,
          hotValue: item.hotValue,
          hotValueNum: item.hotValueNum,
          pairs: [],
        };
      }
      groups[item.topicTitle].pairs.push(item);
    });
    
    return Object.values(groups).sort((a, b) => b.hotValueNum - a.hotValueNum);
  }, [displayList]);

  function formatHotValue(raw: string, num: number): string {
    if (raw) return raw;
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
    if (num > 0) return String(num);
    return '';
  }

  async function load() {
    setIsInitialLoading(true);
    try {
      const [nextAccounts, nextTasks, nextTopicPeople, nextHotPeople, plugins] = await Promise.all([
        appApi.accounts.list().catch(() => []),
        appApi.hotBaziTasks.list().catch(() => []),
        appApi.ai.listTodayTopicPeople().catch(() => []),
        appApi.ai.listHotPeople().catch(() => []),
        appApi.ai.listPlugins().catch(() => []),
      ]);

      const allWorkflows: AiWorkflow[] = [];
      for (const plugin of plugins) {
        try {
          const wfs = await appApi.ai.listWorkflows(plugin.code);
          allWorkflows.push(...wfs);
        } catch (e) { console.error(e); }
      }
      setWorkflows(allWorkflows);
      setAccounts(nextAccounts);
      setTasks(nextTasks);
      setTopicPeople(nextTopicPeople);
      setHotPeople(nextHotPeople);

      if (!accountId && nextAccounts[0]) {
        setAccountId(String(nextAccounts[0].id));
      }
      if (!workflowCode && allWorkflows.length > 0) {
        setWorkflowCode(allWorkflows[0].code);
      }
    } catch (e) {
      console.error('Failed to load HotBaziPage data:', e);
    } finally {
      setIsInitialLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Pipeline 完成后自动刷新页面数据
  useEffect(() => {
    if (pipeline.state.stage === 'done' || pipeline.state.stage === 'error') {
      void load();
    }
  }, [pipeline.state.stage]);

  useEffect(() => {
    window.localStorage.setItem(HOT_BAZI_CONFIG_STORAGE_KEY, JSON.stringify({
      accountId,
      model,
      batchSize,
      promptTemplate,
      workflowCode,
      mediaDir,
    }));
  }, [accountId, model, batchSize, promptTemplate, workflowCode, mediaDir]);

  useEffect(() => {
    window.localStorage.setItem(HOT_BAZI_RUN_STATE_KEY, JSON.stringify(runState));
  }, [runState]);

  useEffect(() => {
    if (runState.status !== 'running' || !runState.updatedAt) return;
    const startedAt = new Date(runState.updatedAt).getTime();
    if (Number.isNaN(startedAt)) return;
    const staleMs = 30 * 60 * 1000;
    if (Date.now() - startedAt > staleMs) {
      setRunStatus('idle', '');
    }
  }, [runState.status, runState.updatedAt]);

  function openConfigModal() {
    setConfigDraft({
      accountId,
      model,
      batchSize,
      workflowCode,
      mediaDir,
    });
    setShowConfigModal(true);
  }

  function closeConfigModal() {
    setConfigDraft({
      accountId,
      model,
      batchSize,
      workflowCode,
      mediaDir,
    });
    setShowConfigModal(false);
  }

  function resetConfigDraft() {
    setConfigDraft({
      accountId: accounts[0] ? String(accounts[0].id) : accountId,
      model: 'deepseek-v3.2',
      batchSize: '2',
      workflowCode: workflows[0]?.code || '',
      mediaDir: '',
    });
  }

  function saveConfigDraft() {
    setAccountId(configDraft.accountId);
    setModel(configDraft.model);
    setBatchSize(configDraft.batchSize);
    setWorkflowCode(configDraft.workflowCode);
    setMediaDir(configDraft.mediaDir);
    setShowConfigModal(false);
  }

  function setRunStatus(status: HotBaziRunStatus, message = '') {
    setRunState({
      status,
      message,
      updatedAt: new Date().toISOString(),
    });
  }

  function openHotPeoplePage() {
    window.dispatchEvent(new CustomEvent(OPEN_HOT_PEOPLE_EVENT));
  }

  async function copyTextToClipboard(text: string) {
    if (!text) {
      throw new Error('没有可复制的内容');
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.setAttribute('readonly', 'true');
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error('复制失败，请重试');
    }
  }

  const accountNameById = useMemo(() => new Map(accounts.map((item) => [item.id, item.name])), [accounts]);
  const currentAccountName = accountNameById.get(Number(accountId)) || '未选择';

  const todayCompletedHotPeopleCount = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    return hotPeople.filter((item) => {
      if (item.analysisStatus !== 'completed') return false;
      const sourceTime = item.updateTime || item.createTime;
      const parsed = new Date(sourceTime);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === date;
    }).length;
  }, [hotPeople]);

  const allSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;
  const draftTasks = tasks.filter((task) => task.status !== 'queued');
  const queuedTasks = tasks.filter((task) => task.status === 'queued');
  const visibleTasks = activeTab === 'queued' ? queuedTasks : draftTasks;
  const visibleTaskIds = visibleTasks.map((task) => task.id);
  const visibleSelectedTaskIds = selectedTaskIds.filter((id) => visibleTaskIds.includes(id));
  const visibleAllSelected = visibleTasks.length > 0 && visibleSelectedTaskIds.length === visibleTasks.length;
  const actionButtonClass = 'tw-inline-flex tw-h-9 tw-w-[120px] tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-lg tw-border tw-px-3 tw-text-xs tw-font-bold tw-transition-colors';
  const actionButtonNeutralClass = `${actionButtonClass} tw-border-slate-200 tw-bg-white tw-text-slate-700 hover:tw-bg-slate-50`;
  const actionButtonPrimaryClass = `${actionButtonClass} tw-border-slate-900 tw-bg-slate-900 tw-text-white hover:tw-bg-slate-800`;
  const actionButtonDangerClass = `${actionButtonClass} tw-border-red-200 tw-bg-red-50 tw-text-red-600 hover:tw-bg-red-100`;

  const taskContentPreview = (task: HotBaziTask) => {
    const payloadContent = typeof task.platformPayload?.content === 'string' ? task.platformPayload.content.trim() : '';
    return payloadContent;
  };

  function toggleTaskSelection(id: number) {
    setSelectedTaskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllSelection() {
    setSelectedTaskIds(visibleAllSelected
      ? selectedTaskIds.filter((id) => !visibleTaskIds.includes(id))
      : Array.from(new Set([...selectedTaskIds, ...visibleTaskIds])));
  }

  function startEdit(task: HotBaziTask) {
    setEditingTaskId(task.id);
    setEditingContent(taskContentPreview(task));
    setEditingMediaPaths(task.mediaPathsJson || []);
  }

  async function handleSelectMedia() {
    try {
      const files = await appApi.media.selectFiles();
      if (files && files.length > 0) {
        setEditingMediaPaths((current) => [...current, ...files]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function removeMedia(path: string) {
    setEditingMediaPaths((current) => current.filter((p) => p !== path));
  }

  async function saveEdit(task: HotBaziTask) {
    try {
      setError('');
      setIsSavingTaskId(task.id);
      await appApi.hotBaziTasks.update(task.id, {
        platformPayload: {
          ...task.platformPayload,
          content: editingContent,
        },
        mediaPathsJson: editingMediaPaths,
      });
      setEditingTaskId(null);
      setEditingContent('');
      setEditingMediaPaths([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSavingTaskId(null);
    }
  }

  async function handleBatchDelete() {
    if (selectedTaskIds.length === 0) return;
    try {
      setError('');
      setBatchWorkingType('delete');
      await appApi.hotBaziTasks.deleteMany(selectedTaskIds);
      setNotice(`已删除 ${selectedTaskIds.length} 条热点八字任务。`);
      setSelectedTaskIds([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBatchWorkingType(null);
    }
  }

  async function handleBatchEnqueue() {
    if (selectedTaskIds.length === 0) return;
    try {
      setError('');
      setBatchWorkingType('enqueue');
      await appApi.hotBaziTasks.enqueueMany(selectedTaskIds);
      setNotice(`已将 ${selectedTaskIds.length} 条热点八字任务送入调度池。`);
      setSelectedTaskIds([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBatchWorkingType(null);
    }
  }

  async function handleRegenerateMedia() {
    if (selectedTaskIds.length === 0) return;
    try {
      setError('');
      setNotice('');
      setBatchWorkingType('regenerate');
      setRunStatus('running', '正在重新生成图片和排盘...');
      const result = await appApi.ai.regenerateHotBaziMedia(selectedTaskIds, mediaDir);
      setNotice(`重新生成完成：成功 ${result.successCount} 条，总计请求 ${result.totalRequested} 条。`);
      setRunStatus('success', `图片重构完成 (${result.successCount})`);
      setSelectedTaskIds([]);
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setRunStatus('failed', message);
    } finally {
      setBatchWorkingType(null);
    }
  }

  async function handleGenerate() {
    setError('');
    setNotice('');
    setIsGenerating(true);
    setRunStatus('running', '正在生成热点八字内容');
    try {
      const result = await appApi.ai.generateHotBaziBatch({
        accountId: Number(accountId),
        model,
        limit: batchSize === 'all' ? todayCompletedHotPeopleCount : Number(batchSize),
        promptTemplate,
        workflowCode, // 绑定栏目 ID
        mediaDir,
      });
      setNotice(`已生成 ${result.createdContents} 条内容，写入热点八字任务 ${result.createdTasks} 条。`);
      if (result.errors.length > 0) {
        const message = result.errors.join('；');
        setError(message);
        setRunStatus('failed', message);
      } else {
        setRunStatus('success', `已生成 ${result.createdContents} 条内容`);
      }
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setRunStatus('failed', message);
    } finally {
      setIsGenerating(false);
      void load();
    }
  }

  const runStatusLabel = runState.status === 'running'
    ? '生成中'
    : runState.status === 'success'
      ? '上次生成成功'
      : runState.status === 'failed'
        ? '上次生成失败'
        : '空闲';

  return (
    <div className="tw-min-h-screen tw-bg-slate-50 tw-pb-20 tw-animate-fade-in">
      <div className="tw-mb-4 tw-flex tw-items-center tw-gap-3">
        <div className="tw-rounded-2xl tw-bg-slate-900 tw-p-3 tw-text-white">
          <CalendarClock size={22} />
        </div>
        <div className="tw-min-w-0 tw-flex-1 tw-flex tw-items-center tw-justify-between tw-gap-3">
          <div className="tw-min-w-0">
            <h1 className="tw-text-2xl tw-font-extrabold tw-tracking-tight tw-text-slate-900">热点八字</h1>
          </div>
        </div>
      </div>

      {notice && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-emerald-100 tw-bg-emerald-50 tw-p-4 tw-text-sm tw-font-bold tw-text-emerald-700">{notice}</div>}
      {error && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-red-100 tw-bg-red-50 tw-p-4 tw-text-sm tw-font-bold tw-text-red-600">{error}</div>}

      <div className="tw-grid tw-gap-4">
        <section className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-3 tw-shadow-sm">
          <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-4">
            
            {/* 左侧：精简的单行文字状态 */}
            <div className="tw-flex tw-items-center tw-gap-3">
              <div className="tw-flex tw-items-center tw-justify-center tw-w-8 tw-h-8 tw-rounded-full tw-bg-rose-50 tw-text-rose-500">
                <Flame size={16} />
              </div>
              <div className="tw-text-[13px] tw-font-medium tw-text-slate-600">
                <span className="tw-font-bold tw-text-slate-900 tw-mr-1.5">今日情报：</span>
                发现 <strong className="tw-text-slate-900">{displayList.length}</strong> 位，
                待生成 <strong className="tw-text-amber-500">{pendingItems.length}</strong> 位，
                已完成 <strong className="tw-text-emerald-500">{generatedItems.length}</strong> 位。
              </div>
            </div>

            {/* 右侧：单排按钮及开关 */}
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2.5">
              <label className="tw-flex tw-items-center tw-gap-1.5 tw-cursor-pointer tw-text-xs tw-font-bold tw-text-slate-500 hover:tw-text-slate-800">
                <input type="checkbox" checked={autoEnqueue} onChange={e => setAutoEnqueue(e.target.checked)} className="tw-rounded tw-border-slate-300 tw-text-violet-600 focus:tw-ring-violet-500 tw-w-3.5 tw-h-3.5" />
                自动送发
              </label>

              <div className="tw-hidden sm:tw-block tw-w-px tw-h-4 tw-bg-slate-200 tw-mx-0.5"></div>

              {displayList.length > 0 && !pipeline.isRunning && (
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(true)}
                  className="tw-inline-flex tw-h-8 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-text-xs tw-font-bold tw-text-slate-700 hover:tw-bg-slate-50 tw-transition-colors"
                >
                  挑选人物
                </button>
              )}

              {pipeline.isRunning ? (
                <button type="button" onClick={pipeline.cancel} className="tw-inline-flex tw-h-8 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-red-200 tw-bg-red-50 tw-px-3 tw-text-xs tw-font-bold tw-text-red-600 hover:tw-bg-red-100 tw-transition-colors">
                  ⏹ 紧急中止
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!accountId) { setError('请先配置发号器'); openConfigModal(); return; }
                    const limitNum = batchSize === 'all' ? undefined : Number(batchSize);
                    void pipeline.runPipeline({
                      accountId: Number(accountId), model, promptTemplate, autoEnqueue, mediaDir,
                      limit: limitNum,
                      selectedPairs: selectedPairKeys.size > 0
                        ? pendingItems.filter(d => selectedPairKeys.has(d.key)).map(d => ({ personId: d.personId, topicTitle: d.topicTitle }))
                        : undefined,
                    });
                  }}
                  disabled={!accountId}
                  className="tw-inline-flex tw-h-8 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-lg tw-bg-slate-900 tw-px-4 tw-text-xs tw-font-black tw-text-white tw-shadow-sm hover:tw-shadow-md tw-transition-all disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
                >
                  <Sparkles size={12} /> {selectedPairKeys.size > 0 ? `只生成选中 (${selectedPairKeys.size})` : `一键生成`}
                </button>
              )}

              <button type="button" onClick={openConfigModal} className="tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-text-slate-500 hover:tw-bg-slate-50 tw-transition-colors" title="配置流水线">
                <Settings2 size={14} />
              </button>
            </div>
          </div>

          {/* Pipeline 状态反馈区域 (Only show if running or has steps) */}
          {(pipeline.isRunning || Object.keys(pipeline.state.steps).length > 0) && (
            <div className="tw-mt-8 tw-rounded-2xl tw-bg-slate-50 tw-p-5 tw-border tw-border-slate-100">
              {/* 进度条 */}
              {pipeline.isRunning && (
                <div className="tw-mb-4">
                  <div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-mb-2">
                    <span className="tw-flex-1 tw-min-w-0 tw-truncate tw-text-xs tw-font-bold tw-text-slate-500" title={pipeline.state.currentMessage}>
                      {pipeline.state.currentMessage}
                    </span>
                    <span className="tw-shrink-0 tw-text-xs tw-font-black tw-text-slate-900">{pipeline.state.progress}%</span>
                  </div>
                  <div className="tw-h-2 tw-rounded-full tw-bg-slate-200 tw-overflow-hidden">
                    <div className="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-violet-500 tw-to-indigo-500 tw-transition-all tw-duration-500" style={{ width: `${pipeline.state.progress}%` }} />
                  </div>
                </div>
              )}

              {/* 步骤结果 */}
              {Object.keys(pipeline.state.steps).length > 0 && (
                <div className="tw-flex tw-flex-col tw-gap-2">
                  {Object.entries(pipeline.state.steps).map(([key, step]) => (
                    <div key={key} className="tw-flex tw-items-start tw-gap-2 tw-text-sm">
                      <span className={`tw-shrink-0 tw-mt-0.5 ${step.ok ? 'tw-text-emerald-500' : 'tw-text-red-500'}`}>
                        {step.ok ? '✓' : '✗'}
                      </span>
                      <span className={`tw-font-medium ${step.ok ? 'tw-text-slate-600' : 'tw-text-red-600'}`}>
                        {step.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 热点×人物 选择弹窗 */}
        {isTopicModalOpen && (
          <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-slate-900/50 tw-p-4 tw-backdrop-blur-sm">
            <div className="tw-flex tw-h-full tw-max-h-[85vh] tw-w-full tw-max-w-3xl tw-flex-col tw-rounded-[2rem] tw-bg-white tw-shadow-2xl tw-overflow-hidden">
              <div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-slate-100 tw-px-6 tw-py-5">
                <h2 className="tw-text-lg tw-font-extrabold tw-text-slate-900 tw-flex tw-items-center tw-gap-2">
                  <Flame className="tw-text-rose-500" size={20} />
                  今日热点与相关人物
                </h2>
                <button type="button" onClick={() => setIsTopicModalOpen(false)} className="tw-rounded-full tw-p-2 tw-text-slate-400 hover:tw-bg-slate-100 hover:tw-text-slate-600 tw-transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="tw-flex-1 tw-overflow-y-auto tw-p-6 tw-space-y-4 tw-bg-slate-50/50">
                {groupedTopics.length === 0 ? (
                  <div className="tw-py-12 tw-text-center">
                    <p className="tw-text-sm tw-font-bold tw-text-slate-500">暂无今日热点×人物匹配数据</p>
                    <p className="tw-mt-1 tw-text-xs tw-text-slate-400">请先在控制面板点击"一键生成"来同步数据</p>
                  </div>
                ) : (
                  groupedTopics.map((group, idx) => {
                    const hotLabel = formatHotValue(group.hotValue, group.hotValueNum);
                    const platformColors: Record<string, string> = { '微博': 'tw-bg-red-50 tw-text-red-600', '头条': 'tw-bg-orange-50 tw-text-orange-600', '腾讯': 'tw-bg-blue-50 tw-text-blue-600', 'ZAKER': 'tw-bg-emerald-50 tw-text-emerald-700' };
                    const pClass = platformColors[group.topicPlatform] || 'tw-bg-slate-100 tw-text-slate-600';
                    const allGenerated = group.pairs.every(p => p.generated);
                    const someSelected = group.pairs.some(p => selectedPairKeys.has(p.key));
                    const allSelectableSelected = group.pairs.filter(p => !p.generated).length > 0 && group.pairs.filter(p => !p.generated).every(p => selectedPairKeys.has(p.key));

                    return (
                      <div key={idx} className={`tw-rounded-2xl tw-border tw-bg-white tw-overflow-hidden tw-transition-colors ${allGenerated ? 'tw-border-slate-200/60 tw-opacity-70' : someSelected ? 'tw-border-violet-300' : 'tw-border-slate-200'}`}>
                        {/* Topic Header */}
                        <div className={`tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-3 tw-border-b ${allGenerated ? 'tw-border-slate-100 tw-bg-slate-50/50' : 'tw-border-slate-100 tw-bg-slate-50'}`}>
                          {!allGenerated && (
                            <input
                              type="checkbox"
                              checked={allSelectableSelected}
                              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelectableSelected; }}
                              onChange={() => {
                                setSelectedPairKeys(prev => {
                                  const next = new Set(prev);
                                  const selectable = group.pairs.filter(p => !p.generated);
                                  if (allSelectableSelected) {
                                    selectable.forEach(p => next.delete(p.key));
                                  } else {
                                    selectable.forEach(p => next.add(p.key));
                                  }
                                  return next;
                                });
                              }}
                              className="tw-rounded tw-shrink-0"
                            />
                          )}
                          <div className="tw-flex-1 tw-min-w-0">
                            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-1">
                              <span className={`tw-shrink-0 tw-rounded-md tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-bold ${pClass}`}>{group.topicPlatform}</span>
                              {hotLabel && (
                                <span className="tw-shrink-0 tw-inline-flex tw-items-center tw-gap-0.5 tw-rounded-md tw-bg-rose-50 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-rose-600">
                                  <Flame size={10} /> {hotLabel}
                                </span>
                              )}
                            </div>
                            <h3 className={`tw-text-sm tw-font-bold tw-truncate ${allGenerated ? 'tw-text-slate-500' : 'tw-text-slate-900'}`}>{group.topicTitle}</h3>
                          </div>
                          {allGenerated && <span className="tw-shrink-0 tw-text-[10px] tw-font-bold tw-text-emerald-600 tw-bg-emerald-50 tw-px-2 tw-py-1 tw-rounded-full">✅ 全部已生成</span>}
                        </div>
                        
                        {/* People List */}
                        <div className="tw-divide-y tw-divide-slate-50 tw-px-4">
                          {group.pairs.map(pair => {
                            const isSelected = selectedPairKeys.has(pair.key);
                            return (
                              <label key={pair.key} className={`tw-flex tw-items-center tw-gap-3 tw-py-2.5 tw-cursor-pointer hover:tw-bg-slate-50/50 tw-transition-colors ${pair.generated ? 'tw-opacity-60 tw-cursor-default' : ''}`}>
                                {!pair.generated ? (
                                  <input type="checkbox" checked={isSelected} onChange={() => {
                                    setSelectedPairKeys(prev => {
                                      const next = new Set(prev);
                                      if (next.has(pair.key)) next.delete(pair.key);
                                      else next.add(pair.key);
                                      return next;
                                    });
                                  }} className="tw-rounded tw-shrink-0" />
                                ) : (
                                  <div className="tw-w-3.5 tw-shrink-0" />
                                )}
                                <span className={`tw-flex-1 tw-text-sm tw-font-bold ${pair.generated ? 'tw-text-slate-500' : isSelected ? 'tw-text-violet-700' : 'tw-text-slate-700'}`}>
                                  {pair.personName}
                                </span>
                                <span className={`tw-shrink-0 tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[10px] tw-font-bold ${pair.generated ? 'tw-bg-emerald-50 tw-text-emerald-600' : 'tw-bg-amber-50 tw-text-amber-600'}`}>
                                  {pair.generated ? '已生成' : '待生成'}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="tw-flex tw-items-center tw-justify-between tw-border-t tw-border-slate-100 tw-bg-slate-50 tw-px-6 tw-py-4">
                <span className="tw-text-xs tw-font-bold tw-text-slate-500">
                  已选 <strong className="tw-text-violet-600 tw-text-sm">{selectedPairKeys.size}</strong> 个人物
                </span>
                <div className="tw-flex tw-gap-3">
                  <button type="button" onClick={() => setIsTopicModalOpen(false)} className="tw-rounded-xl tw-bg-white tw-px-5 tw-py-2 tw-text-sm tw-font-bold tw-text-slate-600 tw-border tw-border-slate-200 hover:tw-bg-slate-50">
                    取消
                  </button>
                  <button type="button" onClick={() => {
                    setIsTopicModalOpen(false);
                  }} disabled={selectedPairKeys.size === 0} className="tw-rounded-xl tw-bg-slate-900 tw-px-5 tw-py-2 tw-text-sm tw-font-bold tw-text-white disabled:tw-opacity-50 disabled:tw-cursor-not-allowed">
                    {`确认挑选 (${selectedPairKeys.size})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <section className="tw-rounded-[1.5rem] tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-sm">
          <div className="tw-mb-4 tw-flex tw-flex-col tw-gap-3 tw-border-b tw-border-slate-200 tw-pb-3 md:tw-flex-row md:tw-items-end md:tw-justify-between">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
              <label className="tw-inline-flex tw-min-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-text-sm tw-font-bold tw-text-slate-700">
                <input type="checkbox" checked={visibleAllSelected} onChange={toggleAllSelection} aria-label="全选当前列表任务" />
                全选
              </label>
              <button type="button" onClick={() => void handleBatchEnqueue()} disabled={visibleSelectedTaskIds.length === 0 || batchWorkingType !== null} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-rounded-xl tw-bg-slate-900 tw-px-4 tw-text-xs tw-font-black tw-text-white disabled:tw-cursor-not-allowed disabled:tw-bg-slate-300">
                {batchWorkingType === 'enqueue' ? <Loader2 size={14} className="tw-animate-spin" /> : null}
                送调度
              </button>
              <button type="button" onClick={() => void handleBatchDelete()} disabled={visibleSelectedTaskIds.length === 0 || batchWorkingType !== null} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-red-200 tw-bg-red-50 tw-px-4 tw-text-xs tw-font-black tw-text-red-600 disabled:tw-cursor-not-allowed disabled:tw-opacity-50">
                {batchWorkingType === 'delete' ? <Loader2 size={14} className="tw-animate-spin" /> : null}
                批量删除
              </button>
              <button type="button" onClick={() => void handleRegenerateMedia()} disabled={visibleSelectedTaskIds.length === 0 || batchWorkingType !== null} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-blue-200 tw-bg-blue-50 tw-px-4 tw-text-xs tw-font-black tw-text-blue-600 disabled:tw-cursor-not-allowed disabled:tw-opacity-50">
                {batchWorkingType === 'regenerate' ? <Loader2 size={14} className="tw-animate-spin" /> : null}
                补全图片/排盘
              </button>
            </div>
            <div className="tw-flex tw-items-center tw-gap-1 tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-1">
              <button type="button" onClick={() => setActiveTab('draft')} className={`tw-rounded-xl tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-transition-colors ${activeTab === 'draft' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-800'}`}>
                待调度 {draftTasks.length}
              </button>
              <button type="button" onClick={() => setActiveTab('queued')} className={`tw-rounded-xl tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-transition-colors ${activeTab === 'queued' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-800'}`}>
                已调度 {queuedTasks.length}
              </button>
            </div>
          </div>

          {isInitialLoading ? (
            <div className="tw-grid tw-gap-3">
              <div className="tw-h-14 tw-rounded-2xl tw-bg-slate-100 tw-animate-pulse" />
              <div className="tw-h-14 tw-rounded-2xl tw-bg-slate-100 tw-animate-pulse" />
              <div className="tw-h-14 tw-rounded-2xl tw-bg-slate-100 tw-animate-pulse" />
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="tw-rounded-2xl tw-border tw-border-dashed tw-border-slate-200 tw-bg-slate-50 tw-p-8 tw-text-center">
              <div className="tw-text-sm tw-font-bold tw-text-slate-700">还没有热点八字任务</div>
              <p className="tw-mt-2 tw-text-sm tw-leading-6 tw-text-slate-500">先生成内容，或者切换到另一个状态标签看看是否已有已调度任务。</p>
              <div className="tw-mt-4 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 sm:tw-flex-row">
                <button type="button" onClick={() => void handleGenerate()} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-bg-slate-900 tw-px-4 tw-text-sm tw-font-bold tw-text-white">
                  <Sparkles size={14} />
                  立即生成
                </button>
                <button type="button" onClick={openConfigModal} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-text-sm tw-font-bold tw-text-slate-700">
                  <Settings2 size={14} />
                  调整配置
                </button>
              </div>
            </div>
          ) : (
            <div className="tw-flex tw-flex-col tw-gap-5 tw-w-full tw-animate-in tw-fade-in tw-duration-300">
              {visibleTasks.map((task, index) => {
                const payloadContent = taskContentPreview(task);
                const imageExts = ['png', 'jpg', 'jpeg', 'webp'];
                const imagePaths = task.mediaPathsJson.filter((p) => imageExts.includes(p.split('.').pop()?.toLowerCase() || ''));
                const nonImagePaths = task.mediaPathsJson.filter((p) => !imageExts.includes(p.split('.').pop()?.toLowerCase() || ''));

                return (
                  <div key={task.id} className="tw-group tw-flex tw-flex-col tw-rounded-[1.25rem] tw-border tw-border-slate-200 tw-bg-white hover:tw-border-slate-300 hover:tw-shadow-md tw-transition-all tw-duration-300">
                    
                    {/* Header: Checkbox + Avatar + Topic/Account */}
                    <div className="tw-flex tw-items-center tw-justify-between tw-px-5 tw-py-4">
                      <div className="tw-flex tw-items-center tw-gap-3 tw-min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="tw-shrink-0 tw-w-4 tw-h-4 tw-rounded tw-border-slate-300 tw-text-violet-600 focus:tw-ring-violet-500 tw-transition-colors tw-cursor-pointer"
                        />
                        <div className="tw-flex tw-items-center tw-justify-center tw-w-10 tw-h-10 tw-rounded-full tw-bg-gradient-to-br tw-from-violet-500 tw-to-fuchsia-500 tw-text-white tw-font-bold tw-text-sm tw-shrink-0 tw-shadow-sm">
                           {accountNameById.get(task.accountId)?.charAt(0) || '账'}
                        </div>
                        <div className="tw-flex-1 tw-min-w-0">
                          <h4 className="tw-text-[15px] tw-font-extrabold tw-text-slate-900 tw-truncate">
                            {accountNameById.get(task.accountId) || task.accountId}
                          </h4>
                          <div className="tw-flex tw-items-center tw-gap-2 tw-mt-0.5 tw-text-[12px] tw-text-slate-400">
                            <span className="tw-font-bold">#{index + 1}</span>
                            <span>·</span>
                            <span className="tw-text-violet-600 tw-font-bold tw-truncate" title={task.sourceTopic || '未标记来源热点'}>
                              {task.sourceTopic ? `#${task.sourceTopic}#` : '#未标记热点#'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="tw-shrink-0 tw-ml-3">
                        {task.status === 'queued' ? (
                          <div className="tw-flex tw-items-center tw-gap-1 tw-px-2.5 tw-py-1 tw-rounded-md tw-bg-emerald-50 tw-text-[11px] tw-font-black tw-text-emerald-600 tw-border tw-border-emerald-100">
                            <Send size={10} />
                            已调度
                          </div>
                        ) : (
                          <div className="tw-flex tw-items-center tw-gap-1 tw-px-2.5 tw-py-1 tw-rounded-md tw-bg-amber-50 tw-text-[11px] tw-font-black tw-text-amber-600 tw-border tw-border-amber-100">
                            待调度
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="tw-px-5 tw-pb-4">
                      <div className={`tw-text-[15px] tw-leading-[1.8] tw-text-slate-800 tw-whitespace-pre-wrap tw-transition-all ${expandedTaskIds.has(task.id) ? '' : 'tw-line-clamp-4'}`}>
                        {payloadContent || <span className="tw-text-slate-400 tw-italic">还没有正文内容...</span>}
                      </div>
                      {payloadContent && payloadContent.length > 120 && (
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedTaskIds(prev => {
                              const next = new Set(prev);
                              if (next.has(task.id)) next.delete(task.id);
                              else next.add(task.id);
                              return next;
                            });
                          }}
                          className="tw-mt-1 tw-text-[14px] tw-font-bold tw-text-violet-600 hover:tw-text-violet-700 tw-transition-colors"
                        >
                          {expandedTaskIds.has(task.id) ? '收起' : '全文'}
                        </button>
                      )}

                      {/* Media Assets */}
                      {task.mediaPathsJson.length > 0 && (
                        <div className="tw-mt-3">
                          {imagePaths.length > 0 && (
                            <div className="tw-flex tw-flex-wrap tw-gap-2">
                              {imagePaths.map((p, i) => {
                                const safeFileUrl = (imgPath: string) => 'file:///' + imgPath.replace(/\\/g, '/').split('/').map(seg => seg.match(/^[a-zA-Z]:$/) ? seg : encodeURIComponent(seg)).join('/');
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => { setLightboxImages(imagePaths.map(img => safeFileUrl(img))); setLightboxIndex(i); }}
                                    className={`tw-relative tw-shrink-0 tw-overflow-hidden tw-border tw-border-slate-100 tw-bg-slate-50 hover:tw-opacity-90 tw-transition-opacity tw-rounded-xl ${imagePaths.length === 1 ? 'tw-w-[200px] tw-h-[200px]' : 'tw-w-[110px] tw-h-[110px]'}`}
                                  >
                                    <img src={safeFileUrl(p)} alt="" className="tw-w-full tw-h-full tw-object-cover" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Non-image files */}
                          {nonImagePaths.length > 0 && (
                            <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                              {nonImagePaths.map(p => (
                                <div key={p} className="tw-flex tw-items-center tw-px-3 tw-py-1.5 tw-rounded-lg tw-bg-slate-50 tw-border tw-border-slate-200 tw-text-[12px] tw-font-bold tw-text-slate-500 tw-max-w-[200px] tw-truncate" title={p}>
                                  <FolderOpen size={14} className="tw-mr-1.5 tw-shrink-0" />
                                  {p.split(/[\\/]/).pop()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions Panel (Weibo action bar style) */}
                    <div className="tw-flex tw-items-center tw-border-t tw-border-slate-100 tw-bg-slate-50/50 tw-rounded-b-[1.25rem]">
                      <button type="button" onClick={() => startEdit(task)} className="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-py-3 tw-text-[13px] tw-font-bold tw-text-slate-500 hover:tw-text-violet-600 hover:tw-bg-slate-100 tw-rounded-bl-[1.25rem] tw-transition-colors">
                        <Pencil size={14} /> 编辑
                      </button>
                      <div className="tw-w-px tw-h-4 tw-bg-slate-200"></div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setIsEnqueueingTaskId(task.id);
                          void appApi.hotBaziTasks.enqueue(task.id)
                            .then(() => { setNotice('已送入调度池。'); return load(); })
                            .catch(cause => setError(cause instanceof Error ? cause.message : String(cause)))
                            .finally(() => setIsEnqueueingTaskId(null));
                        }}
                        disabled={isEnqueueingTaskId === task.id || task.status === 'queued'}
                        className="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-py-3 tw-text-[13px] tw-font-bold tw-text-slate-500 hover:tw-text-emerald-600 hover:tw-bg-slate-100 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-transition-colors"
                      >
                        {isEnqueueingTaskId === task.id ? <Loader2 size={14} className="tw-animate-spin" /> : <Send size={14} />} 送发
                      </button>
                      <div className="tw-w-px tw-h-4 tw-bg-slate-200"></div>

                      <button
                        type="button"
                        onClick={() => {
                          void copyTextToClipboard(payloadContent)
                            .then(() => {
                              setError(''); setNotice('已复制内容。');
                              setCopiedTaskId(task.id);
                              setTimeout(() => setCopiedTaskId(c => c === task.id ? null : c), 1600);
                            })
                            .catch(e => setError(e instanceof Error ? e.message : String(e)));
                        }}
                        className="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-py-3 tw-text-[13px] tw-font-bold tw-text-slate-500 hover:tw-text-blue-600 hover:tw-bg-slate-100 tw-transition-colors"
                      >
                        {copiedTaskId === task.id ? <Copy size={14} className="tw-text-emerald-500" /> : <Copy size={14} />} {copiedTaskId === task.id ? '已复制' : '复制'}
                      </button>
                      <div className="tw-w-px tw-h-4 tw-bg-slate-200"></div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsDeletingTaskId(task.id);
                          void appApi.hotBaziTasks.delete(task.id)
                            .then(() => { setNotice('已删除任务。'); return load(); })
                            .catch(e => setError(e instanceof Error ? e.message : String(e)))
                            .finally(() => setIsDeletingTaskId(null));
                        }}
                        disabled={isDeletingTaskId === task.id}
                        className="tw-flex-1 tw-flex tw-items-center tw-justify-center tw-gap-1.5 tw-py-3 tw-text-[13px] tw-font-bold tw-text-slate-500 hover:tw-text-red-500 hover:tw-bg-slate-100 disabled:tw-opacity-50 tw-rounded-br-[1.25rem] tw-transition-colors"
                      >
                        {isDeletingTaskId === task.id ? <Loader2 size={14} className="tw-animate-spin" /> : <Trash2 size={14} />} 删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showConfigModal && (
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-end tw-justify-center tw-bg-slate-900/35 tw-p-4 sm:tw-items-center sm:tw-p-6">
          <div className="tw-w-full tw-max-w-2xl tw-rounded-t-[1.5rem] tw-bg-white tw-p-6 tw-shadow-2xl sm:tw-rounded-[1.5rem]">
            <div className="tw-mb-4 tw-flex tw-items-center tw-justify-between tw-gap-3">
              <h3 className="tw-text-lg tw-font-black tw-text-slate-900">设置</h3>
              <div className="tw-flex tw-gap-2">
                <button type="button" onClick={() => setShowPromptModal(true)} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-text-sm tw-font-bold tw-text-slate-600">
                  <Pencil size={14} />
                  提示词
                </button>
                <button type="button" onClick={closeConfigModal} className="tw-inline-flex tw-h-10 tw-items-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-text-sm tw-font-bold tw-text-slate-500">关闭</button>
              </div>
            </div>
            <div className="tw-grid tw-gap-4 md:tw-grid-cols-2">
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">账号</div>
                <select value={configDraft.accountId} onChange={(event) => setConfigDraft((current) => ({ ...current, accountId: event.target.value }))} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">模型</div>
                <select value={configDraft.model} onChange={(event) => setConfigDraft((current) => ({ ...current, model: event.target.value as HotBaziModel }))} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {modelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">数量</div>
                <select value={configDraft.batchSize} onChange={(event) => setConfigDraft((current) => ({ ...current, batchSize: event.target.value }))} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {batchSizeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">关联受控栏目</div>
                <select value={configDraft.workflowCode} onChange={(event) => setConfigDraft((current) => ({ ...current, workflowCode: event.target.value }))} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {workflows.map((wf) => <option key={wf.code} value={wf.code}>{wf.name}</option>)}
                  {workflows.length === 0 && <option value="">无可用栏目</option>}
                </select>
              </label>
              <label className="tw-block tw-col-span-full">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">媒体资产存储路径</div>
                <div className="tw-flex tw-gap-2">
                  <input
                    type="text"
                    value={configDraft.mediaDir}
                    onChange={(event) => setConfigDraft((current) => ({ ...current, mediaDir: event.target.value }))}
                    placeholder="留空则使用默认路径 (项目根目录/media_assets/hot_bazi)"
                    className="tw-flex-1 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const dir = await appApi.media.selectDirectory(configDraft.mediaDir);
                        if (dir) {
                          setConfigDraft((current) => ({ ...current, mediaDir: dir }));
                        }
                      } catch (err) {
                        console.error('Failed to select directory:', err);
                        alert('无法打开目录选择器，请检查应用权限或手动输入路径。');
                      }
                    }}
                    className="tw-inline-flex tw-items-center tw-justify-center tw-px-4 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-text-slate-600 hover:tw-bg-slate-50 tw-transition-colors"
                    title="选择文件夹"
                  >
                    <FolderOpen size={18} />
                  </button>
                </div>
                <p className="tw-mt-1.5 tw-text-[11px] tw-text-slate-400 tw-font-medium">
                  所有生成的图片、抓图、排盘截图将保存至此。支持绝对路径。
                </p>
              </label>
            </div>
            <div className="tw-mt-5 tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
              <button type="button" onClick={resetConfigDraft} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-text-sm tw-font-bold tw-text-slate-700">
                重置
              </button>
              <div className="tw-flex tw-gap-2">
                <button type="button" onClick={closeConfigModal} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-text-sm tw-font-bold tw-text-slate-700">
                  取消
                </button>
                <button type="button" onClick={saveConfigDraft} className="tw-inline-flex tw-h-11 tw-items-center tw-justify-center tw-rounded-xl tw-bg-slate-900 tw-px-4 tw-text-sm tw-font-bold tw-text-white">
                  保存
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {showPromptModal && (
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-end tw-justify-center tw-bg-slate-900/35 tw-p-4 sm:tw-items-center sm:tw-p-6">
          <div className="tw-w-full tw-max-w-4xl tw-rounded-t-[1.5rem] tw-bg-white tw-p-6 tw-shadow-2xl sm:tw-rounded-[1.5rem]">
            <div className="tw-mb-4 tw-flex tw-items-center tw-justify-between tw-gap-3">
              <h3 className="tw-text-lg tw-font-black tw-text-slate-900">提示词</h3>
              <div className="tw-flex tw-gap-2">
                <button type="button" onClick={() => setPromptTemplate(defaultPromptTemplate)} className="tw-inline-flex tw-h-10 tw-items-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-text-xs tw-font-bold tw-text-slate-600">恢复默认</button>
                <button type="button" onClick={() => setShowPromptModal(false)} className="tw-inline-flex tw-h-10 tw-items-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-text-xs tw-font-bold tw-text-slate-600">关闭</button>
              </div>
            </div>
            <textarea value={promptTemplate} onChange={(event) => setPromptTemplate(event.target.value)} rows={22} className="tw-w-full tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-4 tw-text-sm tw-font-medium tw-leading-6 tw-outline-none focus:tw-bg-white" aria-label="热点八字提示词编辑器" />
          </div>
        </div>
      )}

      {editingTaskId && (
        <div className="tw-fixed tw-inset-0 tw-z-[100] tw-flex tw-items-center tw-justify-center tw-bg-slate-900/40 tw-backdrop-blur-sm tw-p-4 sm:tw-p-6">
          <div className="tw-w-full tw-max-w-3xl tw-bg-white tw-rounded-[2rem] tw-shadow-2xl tw-overflow-hidden tw-animate-in tw-fade-in tw-zoom-in tw-duration-200">
            <div className="tw-px-8 tw-py-6 tw-border-b tw-border-slate-100 tw-flex tw-items-center tw-justify-between">
              <div>
                <h3 className="tw-text-xl tw-font-black tw-text-slate-900">编辑任务</h3>
                <p className="tw-text-xs tw-font-bold tw-text-slate-400 tw-mt-1">
                  正在编辑：{tasks.find(t => t.id === editingTaskId)?.sourceTopic || '热点素材'}
                </p>
              </div>
              <button 
                onClick={() => setEditingTaskId(null)}
                className="tw-p-2 tw-rounded-full hover:tw-bg-slate-100 tw-text-slate-400 hover:tw-text-slate-600 tw-transition-all"
              >
                取消
              </button>
            </div>
            
            <div className="tw-p-8 tw-space-y-6">
              <div className="tw-space-y-2">
                <label className="tw-text-[12px] tw-font-black tw-text-slate-500 tw-uppercase tw-tracking-widest">
                  文案内容
                </label>
                <textarea 
                  value={editingContent} 
                  onChange={(e) => setEditingContent(e.target.value)} 
                  rows={10} 
                  className="tw-w-full tw-rounded-2xl tw-border-2 tw-border-slate-100 tw-bg-slate-50/50 tw-p-4 tw-text-sm tw-font-medium tw-leading-relaxed tw-outline-none focus:tw-border-brand-500/20 focus:tw-bg-white tw-transition-all" 
                />
              </div>

              <div className="tw-space-y-3">
                <div className="tw-flex tw-items-center tw-justify-between">
                  <label className="tw-text-[12px] tw-font-black tw-text-slate-500 tw-uppercase tw-tracking-widest">
                    媒体素材 ({editingMediaPaths.length})
                  </label>
                  <button 
                    type="button"
                    onClick={handleSelectMedia}
                    className="tw-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-1.5 tw-bg-brand-50 tw-text-brand-600 tw-rounded-lg tw-text-xs tw-font-bold hover:tw-bg-brand-100 tw-transition-all"
                  >
                    <Settings2 size={12} />
                    添加素材
                  </button>
                </div>
                
                <div className="tw-flex tw-flex-wrap tw-gap-2">
                  {editingMediaPaths.map((path) => (
                    <div key={path} className="tw-group tw-relative tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-2 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-max-w-[240px]">
                      <div className="tw-min-w-0 tw-flex-1">
                        <p className="tw-text-[11px] tw-font-bold tw-text-slate-600 tw-truncate" title={path}>
                          {path.split(/[\\/]/).pop()}
                        </p>
                      </div>
                      <button 
                        onClick={() => removeMedia(path)}
                        className="tw-text-slate-300 hover:tw-text-red-500 tw-transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {editingMediaPaths.length === 0 && (
                    <div className="tw-w-full tw-py-8 tw-border-2 tw-border-dashed tw-border-slate-100 tw-rounded-2xl tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-text-slate-300">
                      <Settings2 size={24} />
                      <span className="tw-text-[11px] tw-font-bold">暂无上传素材</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="tw-px-8 tw-py-6 tw-bg-slate-50/50 tw-border-t tw-border-slate-100 tw-flex tw-items-center tw-justify-end tw-gap-3">
              <button 
                type="button" 
                onClick={() => setEditingTaskId(null)} 
                className="tw-px-6 tw-py-2.5 tw-text-sm tw-font-bold tw-text-slate-500 hover:tw-text-slate-700"
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const task = tasks.find(t => t.id === editingTaskId);
                  if (task) void saveEdit(task);
                }} 
                disabled={isSavingTaskId === editingTaskId} 
                className="tw-flex tw-items-center tw-gap-2 tw-px-8 tw-py-2.5 tw-bg-slate-900 tw-text-white tw-rounded-xl tw-text-sm tw-font-black hover:tw-bg-slate-800 tw-shadow-lg tw-shadow-slate-900/20 tw-transition-all active:tw-scale-95"
              >
                {isSavingTaskId === editingTaskId && <Loader2 size={14} className="tw-animate-spin" />}
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Lightbox 全屏大图预览 ===== */}
      {lightboxImages.length > 0 && (
        <div
          className="tw-fixed tw-inset-0 tw-z-[200] tw-flex tw-items-center tw-justify-center tw-bg-black/80 tw-backdrop-blur-md tw-animate-in tw-fade-in tw-duration-200"
          onClick={() => setLightboxImages([])}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxImages([]);
            if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length);
            if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % lightboxImages.length);
          }}
          tabIndex={0}
          role="dialog"
          aria-label="图片预览"
        >
          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={() => setLightboxImages([])}
            className="tw-absolute tw-top-6 tw-right-6 tw-z-10 tw-p-2 tw-rounded-full tw-bg-white/10 tw-text-white/80 hover:tw-bg-white/20 hover:tw-text-white tw-transition-all tw-backdrop-blur-sm"
          >
            <X size={20} />
          </button>

          {/* 图片计数 */}
          <div className="tw-absolute tw-top-6 tw-left-1/2 tw--translate-x-1/2 tw-z-10 tw-px-4 tw-py-1.5 tw-rounded-full tw-bg-white/10 tw-backdrop-blur-sm tw-text-white/80 tw-text-xs tw-font-bold">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {/* 左箭头 */}
          {lightboxImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length); }}
              className="tw-absolute tw-left-4 tw-z-10 tw-p-3 tw-rounded-full tw-bg-white/10 tw-text-white/80 hover:tw-bg-white/20 hover:tw-text-white tw-transition-all tw-backdrop-blur-sm"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* 主图 */}
          <img
            src={lightboxImages[lightboxIndex]}
            alt={`预览图 ${lightboxIndex + 1}`}
            className="tw-max-w-[90vw] tw-max-h-[85vh] tw-object-contain tw-rounded-2xl tw-shadow-2xl tw-select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* 右箭头 */}
          {lightboxImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % lightboxImages.length); }}
              className="tw-absolute tw-right-4 tw-z-10 tw-p-3 tw-rounded-full tw-bg-white/10 tw-text-white/80 hover:tw-bg-white/20 hover:tw-text-white tw-transition-all tw-backdrop-blur-sm"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* 底部缩略图导航条 */}
          {lightboxImages.length > 1 && (
            <div className="tw-absolute tw-bottom-6 tw-left-1/2 tw--translate-x-1/2 tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-rounded-2xl tw-bg-white/10 tw-backdrop-blur-sm">
              {lightboxImages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`tw-w-12 tw-h-12 tw-rounded-lg tw-overflow-hidden tw-border-2 tw-transition-all tw-cursor-pointer ${
                    i === lightboxIndex
                      ? 'tw-border-white tw-shadow-lg tw-scale-110'
                      : 'tw-border-white/30 tw-opacity-60 hover:tw-opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="tw-w-full tw-h-full tw-object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
