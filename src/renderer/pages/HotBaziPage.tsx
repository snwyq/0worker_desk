import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Copy, Pencil, Send, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { appApi } from '../api';
import type { Account, HotBaziTask, HotPerson } from '../../shared/types';

const batchSizeOptions = [
  { value: '2', label: '2 条' },
  { value: '5', label: '5 条' },
  { value: '20', label: '20 条' },
  { value: '50', label: '50 条' },
  { value: 'all', label: '全部' },
];

const HOT_BAZI_CONFIG_STORAGE_KEY = 'hotBazi.generationConfig';
const HOT_BAZI_RUN_STATE_KEY = 'hotBazi.generationState';
const modelOptions = ['qwen3.5-plus', 'deepseek-v3.2', 'kimi-k2.5'] as const;
type HotBaziModel = typeof modelOptions[number];
type HotBaziRunStatus = 'idle' | 'running' | 'success' | 'failed';

interface StoredHotBaziConfig {
  accountId?: string;
  model?: HotBaziModel;
  batchSize?: string;
  promptTemplate?: string;
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
  '请扮演一位铁口直断的高级八字命理专家，根据以下资料撰写一篇人物八字短评。',
  '',
  '【输入资料】',
  '人物：{{personName}}',
  '生日：{{birthday}}',
  '八字：{{sizhu}}',
  '大运：{{dayunInfo}}',
  '热点：{{sourceTopic}}',
  '',
  '【全局要求】',
  '行文风格：铁口直断，专业犀利，干脆利落，理出有据。',
  '字数限制：总字数严格控制在300字以内，拒绝废话。',
  '格式禁忌：除首行话题标签外，正文绝对禁止使用任何 Markdown 格式（如加粗、星号、列表符等），仅保留自然换行。',
  '内容导向：命理分析必须与该人物已知的真实经历、人生轨迹紧密咬合。',
  '流年要求：当前要分析的流年年份是{{currentYear}}年（{{currentYearGanzhi}}），下一年是{{nextYear}}年（{{nextYearGanzhi}}），不要擅自改写成年份或干支。',
  '',
  '【严格文章结构】',
  '第一行（独占一行）：#{{sourceTopic}}#',
  '',
  '第一段（约60字，格局定位）：首句必须直接写出“{{personName}}”的名字。随后简明扼要地给出其八字排盘、格局定性及五行喜忌分析。',
  '',
  '第二段（大运与真实经历对应，重点段落）：',
  '要求：短句为主，不要把分析和经历混在超长句中；真实经历的字数必须多于命理分析。',
  '阶段一：先写1句重点大运或年份的命理判断，紧接2到3句其在该阶段真实的经历变化。',
  '阶段二：必须换行另起，再写1句下一步大运的命理判断，紧接1到2句对应的真实经历。',
  '',
  '第三段（综合论断）：整体评析大运走势，直接点明这套八字组合及运势对该人物在事业、家庭、感情、健康上的实质性影响。',
  '',
  '第四段（流年推断）：补充断定{{currentYear}}年（{{currentYearGanzhi}}）和{{nextYear}}年（{{nextYearGanzhi}}）的流年八字与流年的组合特点，并直言预测这两年可能发生的具体事情或特点。',
].join('\n');

export function HotBaziPage() {
  const storedConfig = readStoredHotBaziConfig();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<HotBaziTask[]>([]);
  const [activeTab, setActiveTab] = useState<'draft' | 'queued'>('draft');
  const [hotPeople, setHotPeople] = useState<HotPerson[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const [accountId, setAccountId] = useState(storedConfig.accountId ?? '');
  const [model, setModel] = useState<HotBaziModel>(modelOptions.includes(storedConfig.model as HotBaziModel) ? (storedConfig.model as HotBaziModel) : 'deepseek-v3.2');
  const [batchSize, setBatchSize] = useState(storedConfig.batchSize ?? '2');
  const [promptTemplate, setPromptTemplate] = useState(storedConfig.promptTemplate || defaultPromptTemplate);
  const [runState, setRunState] = useState<HotBaziRunState>(() => readRunState());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<number | null>(null);
  const [configDraft, setConfigDraft] = useState({
    accountId: storedConfig.accountId ?? '',
    model: modelOptions.includes(storedConfig.model as HotBaziModel) ? (storedConfig.model as HotBaziModel) : 'deepseek-v3.2',
    batchSize: storedConfig.batchSize ?? '2',
  });

  async function load() {
    const [nextAccounts, nextTasks, nextHotPeople] = await Promise.all([
      appApi.accounts.list().catch(() => []),
      appApi.hotBaziTasks.list().catch(() => []),
      appApi.ai.listHotPeople().catch(() => []),
    ]);
    setAccounts(nextAccounts);
    setTasks(nextTasks);
    setHotPeople(nextHotPeople);
    if (!accountId && nextAccounts[0]) {
      setAccountId(String(nextAccounts[0].id));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HOT_BAZI_CONFIG_STORAGE_KEY, JSON.stringify({
      accountId,
      model,
      batchSize,
      promptTemplate,
    }));
  }, [accountId, model, batchSize, promptTemplate]);

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
    });
    setShowConfigModal(true);
  }

  function closeConfigModal() {
    setConfigDraft({
      accountId,
      model,
      batchSize,
    });
    setShowConfigModal(false);
  }

  function resetConfigDraft() {
    setConfigDraft({
      accountId: accounts[0] ? String(accounts[0].id) : accountId,
      model: 'deepseek-v3.2',
      batchSize: '2',
    });
  }

  function saveConfigDraft() {
    setAccountId(configDraft.accountId);
    setModel(configDraft.model);
    setBatchSize(configDraft.batchSize);
    setShowConfigModal(false);
  }

  function setRunStatus(status: HotBaziRunStatus, message = '') {
    setRunState({
      status,
      message,
      updatedAt: new Date().toISOString(),
    });
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
  }

  async function saveEdit(task: HotBaziTask) {
    try {
      setError('');
      await appApi.hotBaziTasks.update(task.id, {
        platformPayload: {
          ...task.platformPayload,
          content: editingContent,
        },
      });
      setEditingTaskId(null);
      setEditingContent('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleBatchDelete() {
    if (selectedTaskIds.length === 0) return;
    try {
      setError('');
      await appApi.hotBaziTasks.deleteMany(selectedTaskIds);
      setNotice(`已删除 ${selectedTaskIds.length} 条热点八字任务。`);
      setSelectedTaskIds([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleBatchEnqueue() {
    if (selectedTaskIds.length === 0) return;
    try {
      setError('');
      await appApi.hotBaziTasks.enqueueMany(selectedTaskIds);
      setNotice(`已将 ${selectedTaskIds.length} 条热点八字任务送入调度池。`);
      setSelectedTaskIds([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleGenerate() {
    setError('');
    setNotice('');
    setRunStatus('running', '正在生成热点八字内容');
    try {
      const result = await appApi.ai.generateHotBaziBatch({
        accountId: Number(accountId),
        model,
        limit: batchSize === 'all' ? todayCompletedHotPeopleCount : Number(batchSize),
        promptTemplate,
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
      void load();
    }
  }

  const summaryLine = `账号：${currentAccountName} | 模型：${model} | 数量：${batchSize === 'all' ? '全部' : `${batchSize} 条`} | 结果：只生成内容，不在本页排发布时间`;
  const runStatusLabel = runState.status === 'running'
    ? '生成中'
    : runState.status === 'success'
      ? '上次生成成功'
      : runState.status === 'failed'
        ? '上次生成失败'
        : '空闲';

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in">
      <div className="tw-mb-6 tw-flex tw-items-center tw-gap-3">
        <div className="tw-rounded-2xl tw-bg-slate-900 tw-p-3 tw-text-white">
          <CalendarClock size={22} />
        </div>
        <div>
          <h1 className="tw-text-3xl tw-font-extrabold tw-text-slate-900">热点八字</h1>
          <p className="tw-mt-1 tw-text-sm tw-text-slate-500">从今日热点人物逐条生成内容；发布时间统一在发布调度里设置。</p>
        </div>
      </div>

      {notice && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-emerald-100 tw-bg-emerald-50 tw-p-4 tw-text-sm tw-font-bold tw-text-emerald-700">{notice}</div>}
      {error && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-red-100 tw-bg-red-50 tw-p-4 tw-text-sm tw-font-bold tw-text-red-600">{error}</div>}

      <div className="tw-grid tw-gap-4">
        <section className="tw-rounded-[1.5rem] tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-sm">
          <div className="tw-space-y-4">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-rounded-xl tw-bg-slate-50 tw-border tw-border-slate-200 tw-px-4 tw-py-3 tw-text-sm tw-font-medium tw-text-slate-600">
              <span className="tw-break-words">{summaryLine}</span>
              <button type="button" onClick={openConfigModal} className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-black tw-text-slate-700 tw-border tw-border-slate-200 tw-ml-auto">
                <Settings2 size={14} />
                配置参数
              </button>
              <button type="button" onClick={() => setShowPromptModal(true)} className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-black tw-text-slate-700 tw-border tw-border-slate-200">
                <Pencil size={14} />
                编辑提示词
              </button>
            </div>

            <div className="tw-text-sm tw-font-bold tw-text-slate-700">
              今天已整理好的热点人物：{todayCompletedHotPeopleCount} 条
            </div>

            <button type="button" onClick={() => void handleGenerate()} disabled={runState.status === 'running' || !accountId} className="tw-inline-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-2xl tw-bg-slate-900 tw-px-4 tw-py-3 tw-text-sm tw-font-black tw-text-white disabled:tw-bg-slate-300">
              <Sparkles size={16} className={runState.status === 'running' ? 'tw-animate-spin' : ''} />
              {runState.status === 'running' ? '正在生成热点八字内容' : '开始生成'}
            </button>
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-xs tw-font-bold">
              <span className={`tw-rounded-full tw-px-3 tw-py-1 ${runState.status === 'running' ? 'tw-bg-blue-50 tw-text-blue-600' : runState.status === 'success' ? 'tw-bg-emerald-50 tw-text-emerald-600' : runState.status === 'failed' ? 'tw-bg-red-50 tw-text-red-600' : 'tw-bg-slate-100 tw-text-slate-500'}`}>
                {runStatusLabel}
              </span>
              {runState.updatedAt && (
                <span className="tw-text-slate-400">
                  {new Date(runState.updatedAt).toLocaleString()}
                </span>
              )}
              {runState.message && (
                <span className="tw-text-slate-500 tw-font-medium">
                  {runState.message}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="tw-rounded-[1.5rem] tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-sm">
          <div className="tw-mb-4 tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-3 tw-border-b tw-border-slate-200 tw-pb-3">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3">
              <label className="tw-inline-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold tw-text-slate-700">
                <input type="checkbox" checked={visibleAllSelected} onChange={toggleAllSelection} />
                全选
              </label>
              <button type="button" onClick={() => void handleBatchEnqueue()} disabled={visibleSelectedTaskIds.length === 0} className="tw-rounded-xl tw-bg-slate-900 tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-text-white disabled:tw-bg-slate-300">
                送调度
              </button>
              <button type="button" onClick={() => void handleBatchDelete()} disabled={visibleSelectedTaskIds.length === 0} className="tw-rounded-xl tw-bg-red-50 tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-text-red-600 tw-border tw-border-red-200 disabled:tw-opacity-50">
                批量删除
              </button>
            </div>
            <div className="tw-flex tw-items-center tw-gap-1 tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-1">
              <button
                type="button"
                onClick={() => setActiveTab('draft')}
                className={`tw-rounded-xl tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-transition-colors ${activeTab === 'draft' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-800'}`}
              >
                待调度 {draftTasks.length}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('queued')}
                className={`tw-rounded-xl tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-transition-colors ${activeTab === 'queued' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-800'}`}
              >
                已调度 {queuedTasks.length}
              </button>
            </div>
          </div>

          {visibleTasks.length === 0 ? (
            <div className="tw-rounded-2xl tw-border tw-border-dashed tw-border-slate-200 tw-bg-slate-50 tw-p-8 tw-text-center tw-text-sm tw-font-medium tw-text-slate-400">还没有热点八字任务</div>
          ) : (
            <div className="tw-max-w-full tw-overflow-x-auto">
              <table className="tw-w-full tw-border-collapse">
                <thead>
                  <tr className="tw-border-b tw-border-slate-200">
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">选择</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">序号</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">热点标题</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">账号</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">状态</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">内容</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task, index) => (
                    <tr key={task.id} className="tw-border-b tw-border-slate-100 hover:tw-bg-slate-50/60">
                      <td className="tw-px-3 tw-py-4 tw-align-top">
                        <input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={() => toggleTaskSelection(task.id)} />
                      </td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-font-bold tw-text-slate-500">{index + 1}</td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-font-bold tw-text-slate-800">{task.sourceTopic || '未标记来源热点'}</td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-text-slate-600">{accountNameById.get(task.accountId) || task.accountId}</td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-font-bold tw-text-slate-600">{task.status === 'queued' ? '已送到发布调度' : '待送调度'}</td>
                      <td className="tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-text-slate-700">
                        {editingTaskId === task.id ? (
                          <div className="tw-space-y-3">
                            <textarea value={editingContent} onChange={(event) => setEditingContent(event.target.value)} rows={8} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-text-sm tw-outline-none" />
                            <div className="tw-flex tw-gap-2">
                              <button type="button" onClick={() => void saveEdit(task)} className={actionButtonPrimaryClass}>保存</button>
                              <button type="button" onClick={() => setEditingTaskId(null)} className={actionButtonNeutralClass}>取消</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className="tw-max-w-[320px] md:tw-max-w-[420px] tw-overflow-hidden tw-text-ellipsis tw-leading-6"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {taskContentPreview(task) || '还没有正文内容'}
                            </div>
                            {task.mediaPathsJson.length > 0 && (
                              <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
                                {task.mediaPathsJson.map((path) => (
                                  <span key={path} className="tw-rounded-full tw-bg-white tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-bold tw-text-slate-500 tw-border tw-border-slate-200">{path}</span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="tw-px-3 tw-py-4 tw-align-top">
                        <div className="tw-flex tw-flex-col tw-gap-2">
                          <button type="button" onClick={() => startEdit(task)} className={actionButtonNeutralClass}>
                            <Pencil size={12} />
                            <span>编辑</span>
                          </button>
                          <button type="button" onClick={() => void appApi.hotBaziTasks.enqueue(task.id).then(() => setNotice('已送入调度池。')).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))} className={actionButtonPrimaryClass}>
                            <Send size={12} />
                            <span>送调度</span>
                          </button>
                          <button type="button" onClick={() => {
                            void copyTextToClipboard(taskContentPreview(task) || '')
                              .then(() => {
                                setError('');
                                setNotice('已复制热点八字内容。');
                                setCopiedTaskId(task.id);
                                window.setTimeout(() => {
                                  setCopiedTaskId((current) => (current === task.id ? null : current));
                                }, 1600);
                              })
                              .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
                          }} className={actionButtonNeutralClass}>
                            <Copy size={12} />
                            <span>{copiedTaskId === task.id ? '已复制' : '复制'}</span>
                          </button>
                          <button type="button" onClick={() => void appApi.hotBaziTasks.delete(task.id).then(() => { setNotice('已删除任务。'); return load(); }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))} className={actionButtonDangerClass}>
                            <Trash2 size={12} />
                            <span>删除</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showConfigModal && (
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-slate-900/35 tw-p-6">
          <div className="tw-w-full tw-max-w-2xl tw-rounded-[1.5rem] tw-bg-white tw-p-6 tw-shadow-2xl">
            <div className="tw-mb-4 tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-text-lg tw-font-black tw-text-slate-900">生成配置</h3>
              <button type="button" onClick={closeConfigModal} className="tw-text-sm tw-font-bold tw-text-slate-500">关闭</button>
            </div>
            <div className="tw-grid tw-gap-4 md:tw-grid-cols-2">
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">账号选择</div>
                <select value={configDraft.accountId} onChange={(event) => setConfigDraft((current) => ({ ...current, accountId: event.target.value }))} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">生成模型</div>
                <select value={configDraft.model} onChange={(event) => setConfigDraft((current) => ({ ...current, model: event.target.value as HotBaziModel }))} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {modelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">本次生成数量</div>
                <select value={configDraft.batchSize} onChange={(event) => setConfigDraft((current) => ({ ...current, batchSize: event.target.value }))} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {batchSizeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <div className="tw-mt-5 tw-flex tw-items-center tw-justify-between tw-gap-3">
              <button type="button" onClick={resetConfigDraft} className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-slate-700">
                重置
              </button>
              <div className="tw-ml-auto tw-flex tw-gap-2">
                <button type="button" onClick={closeConfigModal} className="tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-slate-700">
                  取消
                </button>
                <button type="button" onClick={saveConfigDraft} className="tw-rounded-xl tw-bg-slate-900 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white">
                  保存
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {showPromptModal && (
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-bg-slate-900/35 tw-flex tw-items-center tw-justify-center tw-p-6">
          <div className="tw-w-full tw-max-w-4xl tw-rounded-[1.5rem] tw-bg-white tw-p-6 tw-shadow-2xl">
            <div className="tw-mb-4 tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-text-lg tw-font-black tw-text-slate-900">提示词配置</h3>
              <div className="tw-flex tw-gap-2">
                <button type="button" onClick={() => setPromptTemplate(defaultPromptTemplate)} className="tw-rounded-lg tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-text-slate-600 tw-border tw-border-slate-200">恢复默认</button>
                <button type="button" onClick={() => setShowPromptModal(false)} className="tw-rounded-lg tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-text-slate-600 tw-border tw-border-slate-200">关闭</button>
              </div>
            </div>
            <textarea value={promptTemplate} onChange={(event) => setPromptTemplate(event.target.value)} rows={22} className="tw-w-full tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-4 tw-text-sm tw-font-medium tw-outline-none focus:tw-bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
