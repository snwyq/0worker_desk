import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ImagePlus, Pencil, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { appApi } from '../api';
import type { Account, HotBaziTask, HotPerson } from '../../shared/types';

const scheduleOptions = [
  { value: 'morning', label: '早高峰' },
  { value: 'noon', label: '午间' },
  { value: 'evening_peak', label: '晚高峰' },
  { value: 'night', label: '夜间' },
];

const batchSizeOptions = [
  { value: '2', label: '2 条' },
  { value: '5', label: '5 条' },
  { value: '20', label: '20 条' },
  { value: '50', label: '50 条' },
  { value: 'all', label: '全部' },
];

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<HotBaziTask[]>([]);
  const [hotPeople, setHotPeople] = useState<HotPerson[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  const [accountId, setAccountId] = useState('');
  const [scheduleRule, setScheduleRule] = useState('evening_peak');
  const [model, setModel] = useState<'qwen3.5-plus' | 'deepseek-v3.2' | 'kimi-k2.5'>('deepseek-v3.2');
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState('90');
  const [batchSize, setBatchSize] = useState('2');
  const [requireReview, setRequireReview] = useState(true);
  const [promptTemplate, setPromptTemplate] = useState(defaultPromptTemplate);
  const [mediaPaths, setMediaPaths] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

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

  const taskContentPreview = (task: HotBaziTask) => {
    const payloadContent = typeof task.platformPayload?.content === 'string' ? task.platformPayload.content.trim() : '';
    return payloadContent;
  };

  const scheduleRuleLabel = (task: HotBaziTask) => {
    const rule = typeof task.scheduleRuleJson?.rule === 'string' ? task.scheduleRuleJson.rule : '';
    return rule || '未设置';
  };

  async function pickMedia() {
    const files = await appApi.media.selectFiles();
    setMediaPaths((current) => [...new Set([...current, ...files])]);
  }

  function toggleTaskSelection(id: number) {
    setSelectedTaskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllSelection() {
    setSelectedTaskIds(allSelected ? [] : tasks.map((task) => task.id));
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
    setRunning(true);
    setError('');
    setNotice('');
    try {
      const result = await appApi.ai.generateHotBaziBatch({
        accountId: Number(accountId),
        scheduleRule,
        model,
        automationEnabled,
        intervalMinutes: Number(intervalMinutes || 90),
        limit: batchSize === 'all' ? todayCompletedHotPeopleCount : Number(batchSize),
        requireReview,
        mediaPaths,
        promptTemplate,
      });
      setNotice(`已生成 ${result.createdContents} 条内容，写入审核 ${result.createdReviews} 条，写入热点八字任务 ${result.createdTasks} 条。`);
      if (result.errors.length > 0) setError(result.errors.join('；'));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  }

  const summaryLine = `账号：${currentAccountName} | 规律：${scheduleOptions.find((item) => item.value === scheduleRule)?.label || scheduleRule} | 模型：${model} | 间隔：${intervalMinutes} 分钟 | 数量：${batchSize === 'all' ? '全部' : `${batchSize} 条`} | 审核：${requireReview ? '先入审核池' : '直接生成任务'} | 媒体：${mediaPaths.length > 0 ? `${mediaPaths.length} 个` : '未绑定'}`;

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in">
      <div className="tw-mb-6 tw-flex tw-items-center tw-gap-3">
        <div className="tw-rounded-2xl tw-bg-slate-900 tw-p-3 tw-text-white">
          <CalendarClock size={22} />
        </div>
        <div>
          <h1 className="tw-text-3xl tw-font-extrabold tw-text-slate-900">热点八字</h1>
          <p className="tw-mt-1 tw-text-sm tw-text-slate-500">从今日热点人物逐条生成内容，进入审核与热点八字任务表。</p>
        </div>
      </div>

      {notice && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-emerald-100 tw-bg-emerald-50 tw-p-4 tw-text-sm tw-font-bold tw-text-emerald-700">{notice}</div>}
      {error && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-red-100 tw-bg-red-50 tw-p-4 tw-text-sm tw-font-bold tw-text-red-600">{error}</div>}

      <div className="tw-grid tw-gap-4">
        <section className="tw-rounded-[1.5rem] tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-sm">
          <div className="tw-space-y-4">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-rounded-xl tw-bg-slate-50 tw-border tw-border-slate-200 tw-px-4 tw-py-3 tw-text-sm tw-font-medium tw-text-slate-600">
              <span className="tw-break-words">{summaryLine}</span>
              <button type="button" onClick={() => setShowConfigModal(true)} className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-black tw-text-slate-700 tw-border tw-border-slate-200 tw-ml-auto">
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

            <button type="button" onClick={() => void handleGenerate()} disabled={running || !accountId} className="tw-inline-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-2xl tw-bg-slate-900 tw-px-4 tw-py-3 tw-text-sm tw-font-black tw-text-white disabled:tw-bg-slate-300">
              <Sparkles size={16} className={running ? 'tw-animate-spin' : ''} />
              {running ? '正在生成热点八字内容' : '开始生成'}
            </button>
          </div>
        </section>

        <section className="tw-rounded-[1.5rem] tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-sm">
          <div className="tw-mb-4 tw-flex tw-items-center tw-justify-between">
            <h2 className="tw-text-lg tw-font-black tw-text-slate-900">热点八字任务</h2>
            <span className="tw-text-sm tw-font-bold tw-text-slate-500">{tasks.length} 条</span>
          </div>

          <div className="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
            <label className="tw-inline-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold tw-text-slate-700">
              <input type="checkbox" checked={allSelected} onChange={toggleAllSelection} />
              全选
            </label>
            <button type="button" onClick={() => void handleBatchEnqueue()} disabled={selectedTaskIds.length === 0} className="tw-rounded-xl tw-bg-slate-900 tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-text-white disabled:tw-bg-slate-300">
              进入调度池
            </button>
            <button type="button" onClick={() => void handleBatchDelete()} disabled={selectedTaskIds.length === 0} className="tw-rounded-xl tw-bg-red-50 tw-px-4 tw-py-2 tw-text-xs tw-font-black tw-text-red-600 tw-border tw-border-red-200 disabled:tw-opacity-50">
              批量删除
            </button>
          </div>

          {tasks.length === 0 ? (
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
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">综合信息</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">计划时间</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">内容</th>
                    <th className="tw-whitespace-nowrap tw-px-3 tw-py-3 tw-text-left tw-text-xs tw-font-black tw-text-slate-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={task.id} className="tw-border-b tw-border-slate-100 hover:tw-bg-slate-50/60">
                      <td className="tw-px-3 tw-py-4 tw-align-top">
                        <input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={() => toggleTaskSelection(task.id)} />
                      </td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-font-bold tw-text-slate-500">{index + 1}</td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-font-bold tw-text-slate-800">{task.sourceTopic || '未标记来源热点'}</td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-text-slate-600">{accountNameById.get(task.accountId) || task.accountId}</td>
                      <td className="tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-text-slate-600">
                        <div className="tw-whitespace-nowrap">状态：{task.status}</div>
                        <div className="tw-whitespace-nowrap">规律：{scheduleRuleLabel(task)}</div>
                        <div className="tw-whitespace-nowrap">间隔：{task.intervalMinutes} 分钟</div>
                        <div className="tw-whitespace-nowrap">自动化：{task.automationEnabled ? '开启' : '关闭'}</div>
                      </td>
                      <td className="tw-whitespace-nowrap tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-text-slate-600">{new Date(task.scheduledAt).toLocaleString()}</td>
                      <td className="tw-px-3 tw-py-4 tw-align-top tw-text-sm tw-text-slate-700">
                        {editingTaskId === task.id ? (
                          <div className="tw-space-y-3">
                            <textarea value={editingContent} onChange={(event) => setEditingContent(event.target.value)} rows={8} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3 tw-text-sm tw-outline-none" />
                            <div className="tw-flex tw-gap-2">
                              <button type="button" onClick={() => void saveEdit(task)} className="tw-rounded-lg tw-bg-slate-900 tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-text-white">保存</button>
                              <button type="button" onClick={() => setEditingTaskId(null)} className="tw-rounded-lg tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-text-slate-600 tw-border tw-border-slate-200">取消</button>
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
                          <button type="button" onClick={() => startEdit(task)} className="tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-lg tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-text-slate-700 tw-border tw-border-slate-200">
                            <Pencil size={12} />
                            编辑
                          </button>
                          <button type="button" onClick={() => void appApi.hotBaziTasks.enqueue(task.id).then(() => setNotice('已送入调度池。')).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))} className="tw-whitespace-nowrap tw-rounded-lg tw-bg-slate-900 tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-text-white">
                            入调度池
                          </button>
                          <button type="button" onClick={() => void appApi.hotBaziTasks.delete(task.id).then(() => { setNotice('已删除任务。'); return load(); }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))} className="tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-text-red-600 tw-border tw-border-red-200">
                            <Trash2 size={12} />
                            删除
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
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-bg-slate-900/35 tw-flex tw-items-center tw-justify-center tw-p-6">
          <div className="tw-w-full tw-max-w-2xl tw-rounded-[1.5rem] tw-bg-white tw-p-6 tw-shadow-2xl">
            <div className="tw-mb-4 tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-text-lg tw-font-black tw-text-slate-900">生成配置</h3>
              <button type="button" onClick={() => setShowConfigModal(false)} className="tw-text-sm tw-font-bold tw-text-slate-500">关闭</button>
            </div>
            <div className="tw-grid tw-gap-4 md:tw-grid-cols-2">
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">账号选择</div>
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">发布时间规律</div>
                <select value={scheduleRule} onChange={(event) => setScheduleRule(event.target.value)} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {scheduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">生成模型</div>
                <select value={model} onChange={(event) => setModel(event.target.value as 'qwen3.5-plus' | 'deepseek-v3.2' | 'kimi-k2.5')} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  <option value="qwen3.5-plus">qwen3.5-plus</option>
                  <option value="deepseek-v3.2">deepseek-v3.2</option>
                  <option value="kimi-k2.5">kimi-k2.5</option>
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">自动化发布间隔时间</div>
                <select value={intervalMinutes} onChange={(event) => setIntervalMinutes(event.target.value)} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  <option value="30">30 分钟</option>
                  <option value="60">60 分钟</option>
                  <option value="90">90 分钟</option>
                  <option value="120">120 分钟</option>
                </select>
              </label>
              <label className="tw-block">
                <div className="tw-mb-2 tw-text-sm tw-font-bold tw-text-slate-700">本次生成数量</div>
                <select value={batchSize} onChange={(event) => setBatchSize(event.target.value)} className="tw-w-full tw-rounded-xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3 tw-text-sm">
                  {batchSizeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="tw-flex tw-items-center tw-justify-between tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3">
                <span className="tw-text-sm tw-font-bold tw-text-slate-700">自动化开关</span>
                <input type="checkbox" checked={automationEnabled} onChange={(event) => setAutomationEnabled(event.target.checked)} />
              </label>
              <label className="tw-flex tw-items-center tw-justify-between tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-4 tw-py-3">
                <span className="tw-text-sm tw-font-bold tw-text-slate-700">默认先入审核池</span>
                <input type="checkbox" checked={requireReview} onChange={(event) => setRequireReview(event.target.checked)} />
              </label>
            </div>

            <div className="tw-mt-5 tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-4">
              <div className="tw-mb-3 tw-flex tw-items-center tw-justify-between">
                <span className="tw-text-sm tw-font-bold tw-text-slate-700">媒体文件上传</span>
                <button type="button" onClick={() => void pickMedia()} className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-black tw-text-slate-700 tw-border tw-border-slate-200">
                  <ImagePlus size={14} />
                  选择文件
                </button>
              </div>
              <div className="tw-space-y-2">
                {mediaPaths.length === 0 ? <div className="tw-text-xs tw-text-slate-400">还没有绑定媒体文件</div> : mediaPaths.map((path) => (
                  <div key={path} className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-medium tw-text-slate-600 tw-border tw-border-slate-200">
                    <span className="tw-truncate">{path}</span>
                    <button type="button" onClick={() => setMediaPaths((current) => current.filter((item) => item !== path))} className="tw-text-red-500">删除</button>
                  </div>
                ))}
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
