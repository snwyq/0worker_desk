import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Layers,
  PenLine,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
  UserCircle,
  Wand2,
} from 'lucide-react';
import { appApi } from '../api';
import { AGENT_DRAFT_STORAGE_KEY, type AgentDraft } from '../../shared/agentDraft';
import { extractGeneratedContent } from '../../shared/aiOutput';
import { buildWorkflowFormFields, mergeWorkflowDefaults } from '../agentWorkflowForm';
import type { Account, AiPlugin, AiWorkflow, AiWorkflowRun, ContentStyle, ReviewMode } from '../../shared/types';

type RunLog = {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  time: string;
};

type PreviewResult = {
  content: string;
  imageUrl?: string;
  runId: string;
  persistedContentId?: number;
};

const defaultParams: Record<string, unknown> = {
  topic: '今日微博热点',
  targetPersona: '面向微博大众用户，表达自然，有观点但不过度冒犯。',
  requirement: '生成一条适合微博发布的内容，控制在 180 字以内，保留可人工编辑空间。',
};

const emptyStyleForm = {
  name: '',
  description: '',
  reviewMode: 'manual' as ReviewMode,
};

function readReviewMode(style: ContentStyle | null): ReviewMode {
  const policy = style?.reviewPolicyJson ?? {};
  if (policy.mode === 'auto') return 'auto';
  if (policy.mode === 'sample') return 'sample';
  return 'manual';
}

function readPolicyLabel(style: ContentStyle | null) {
  const policy = style?.reviewPolicyJson ?? {};
  if (policy.mode === 'auto' || policy.autoApproveWhenRiskBelow || policy.autoApproveBelowRiskScore) return '低风险免审';
  if (policy.mode === 'sample' || policy.sampleRate) return '抽样审核';
  return '人工审核';
}

function reviewPolicyFor(mode: ReviewMode) {
  if (mode === 'auto') return { mode: 'auto', autoApproveBelowRiskScore: 30 };
  if (mode === 'sample') return { mode: 'sample', sampleRate: 0.3 };
  return { mode: 'manual' };
}

function readParam(params: Record<string, unknown>, key: string) {
  const value = params[key];
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : '';
}

function extractPreviewResult(raw: AiWorkflowRun | any, fallbackRunId: string): PreviewResult {
  const state = raw?.contextSnapshot ?? raw?.state ?? raw ?? {};
  const generated = extractGeneratedContent(state);
  return {
    runId: raw?.runId ?? state.runId ?? fallbackRunId,
    content: generated?.content ?? state.finalContent ?? state.final_post ?? state.content ?? state.text ?? '工作流已完成，请在结果中补充最终文案。',
    imageUrl: state.imageUrl ?? state.image ?? state.url,
    persistedContentId: typeof state.persistedContentId === 'number' ? state.persistedContentId : undefined,
  };
}

async function waitForWorkflowRun(runId: string): Promise<AiWorkflowRun> {
  let latest = await appApi.ai.getWorkflowRun(runId);
  for (let attempt = 0; attempt < 20 && latest?.status === 'running'; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    latest = await appApi.ai.getWorkflowRun(runId);
  }
  if (!latest) throw new Error(`Workflow run ${runId} was not found`);
  return latest;
}

export function AgentEnginePage() {
  const [plugins, setPlugins] = useState<AiPlugin[]>([]);
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [styles, setStyles] = useState<ContentStyle[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState('maoxiaoxian');
  const [selectedStyleId, setSelectedStyleId] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState('maoxiaoxian.daily_topics');
  const [reviewMode, setReviewMode] = useState<ReviewMode>('manual');
  const [params, setParams] = useState<Record<string, unknown>>(defaultParams);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showStyleForm, setShowStyleForm] = useState(false);
  const [showCopyMatrix, setShowCopyMatrix] = useState(false);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleForm, setStyleForm] = useState(emptyStyleForm);
  const [copyTargetIds, setCopyTargetIds] = useState<number[]>([]);
  const [copySuffix, setCopySuffix] = useState('矩阵复用');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;
  const selectedStyle = styles.find((style) => style.id === selectedStyleId) ?? null;
  const selectedPluginRecord = plugins.find((plugin) => plugin.code === selectedPlugin) ?? null;
  const selectedWorkflowRecord = workflows.find((workflow) => workflow.code === selectedWorkflow) ?? null;
  const matrixAccounts = accounts.filter((account) => account.id !== selectedAccountId && account.activePluginCode === selectedPlugin);

  const workflowOptions = useMemo(() => {
    const styleWorkflow = selectedStyle?.workflowCode;
    const existing = workflows.map((workflow) => workflow.code);
    return styleWorkflow && !existing.includes(styleWorkflow)
      ? [{
        id: -1,
        pluginCode: selectedPlugin,
        code: styleWorkflow,
        name: `${selectedStyle?.name ?? '当前风格'}工作流`,
        definitionJson: {},
        createdAt: '',
        updatedAt: '',
      }, ...workflows]
      : workflows;
  }, [selectedPlugin, selectedStyle, workflows]);

  const workflowFields = useMemo(() => buildWorkflowFormFields(selectedWorkflowRecord), [selectedWorkflowRecord]);
  const visibleFields = workflowFields.length > 0
    ? workflowFields
    : [
      { key: 'topic', label: '选题', description: '', control: 'text' as const, defaultValue: '今日微博热点' },
      { key: 'targetPersona', label: '目标人设', description: '', control: 'textarea' as const, defaultValue: defaultParams.targetPersona as string },
      { key: 'requirement', label: '生成要求', description: '', control: 'textarea' as const, defaultValue: defaultParams.requirement as string },
    ];

  useEffect(() => {
    void loadInitialData();
    applyPendingAgentDraft();
    const unsubscribe = appApi.ai.onWorkflowLog((log: any) => {
      if (!log) return;
      setLogs((current) => [...current, {
        level: log.level ?? 'info',
        message: log.message ?? String(log),
        time: log.time ?? new Date().toISOString(),
      }]);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (selectedAccountId) void loadStyles(selectedAccountId, selectedPlugin);
  }, [selectedAccountId, selectedPlugin]);

  useEffect(() => {
    if (selectedPlugin) void loadWorkflows(selectedPlugin);
  }, [selectedPlugin]);

  useEffect(() => {
    if (selectedStyle?.workflowCode) {
      setSelectedWorkflow(selectedStyle.workflowCode);
      setReviewMode(readReviewMode(selectedStyle));
    }
  }, [selectedStyle?.workflowCode]);

  useEffect(() => {
    setParams((current) => mergeWorkflowDefaults(current, selectedWorkflowRecord));
  }, [selectedWorkflowRecord?.code]);

  async function loadInitialData() {
    setError('');
    try {
      const [pluginsData, accountsData] = await Promise.all([
        appApi.ai.listPlugins().catch(() => []),
        appApi.accounts.list().catch(() => []),
      ]);
      setPlugins(pluginsData);
      setAccounts(accountsData);

      const firstAccount = accountsData[0] ?? null;
      const pluginCode = firstAccount?.activePluginCode || pluginsData[0]?.code || 'maoxiaoxian';
      setSelectedAccountId(firstAccount?.id ?? null);
      setSelectedPlugin(pluginCode);
      await Promise.all([
        firstAccount ? loadStyles(firstAccount.id, pluginCode) : Promise.resolve(),
        loadWorkflows(pluginCode),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function loadStyles(accountId: number, pluginCode: string) {
    const nextStyles = await appApi.ai.listStyles(accountId, pluginCode).catch(() => []);
    setStyles(nextStyles);
    setSelectedStyleId((current) => (
      nextStyles.some((style) => style.id === current) ? current : nextStyles[0]?.id ?? ''
    ));
  }

  async function loadWorkflows(pluginCode: string) {
    const nextWorkflows = await appApi.ai.listWorkflows(pluginCode).catch(() => []);
    setWorkflows(nextWorkflows);
    setSelectedWorkflow((current) => (
      nextWorkflows.some((workflow) => workflow.code === current) ? current : nextWorkflows[0]?.code ?? 'maoxiaoxian.daily_topics'
    ));
  }

  function addLog(level: RunLog['level'], message: string) {
    setLogs((current) => [...current, { level, message, time: new Date().toISOString() }]);
  }

  function updateParam(key: string, value: string | number | boolean) {
    setParams((current) => ({ ...current, [key]: value }));
  }

  function applyPendingAgentDraft() {
    const rawDraft = window.localStorage.getItem(AGENT_DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as AgentDraft;
      if (!draft.topic && !draft.requirement) return;
      setParams((current) => ({
        ...current,
        topic: draft.topic || current.topic,
        requirement: draft.requirement || current.requirement,
      }));
      setNotice(`已带入热点素材：${draft.topic || '今日热点'}`);
      window.localStorage.removeItem(AGENT_DRAFT_STORAGE_KEY);
    } catch (cause) {
      console.warn('[agent-draft] Failed to apply pending hot topic draft.', cause);
      window.localStorage.removeItem(AGENT_DRAFT_STORAGE_KEY);
    }
  }

  function beginCreateStyle() {
    setEditingStyleId(null);
    setStyleForm({ ...emptyStyleForm, reviewMode, description: String(readParam(params, 'requirement')) });
    setShowStyleForm(true);
  }

  function beginEditStyle(style: ContentStyle) {
    setEditingStyleId(style.id);
    setStyleForm({
      name: style.name,
      description: style.description,
      reviewMode: readReviewMode(style),
    });
    setShowStyleForm(true);
  }

  function beginCopyMatrix() {
    setCopyTargetIds(matrixAccounts.map((account) => account.id));
    setCopySuffix('矩阵复用');
    setShowCopyMatrix(true);
  }

  async function copyStyle(style: ContentStyle) {
    if (!selectedAccount) return;
    setError('');
    try {
      const created = await appApi.ai.createStyle({
        accountId: selectedAccount.id,
        pluginCode: selectedPlugin,
        workflowCode: style.workflowCode || selectedWorkflow,
        name: `${style.name} 副本`,
        description: style.description,
        promptTemplateId: style.promptTemplateId,
        modelPolicyJson: style.modelPolicyJson,
        reviewPolicyJson: style.reviewPolicyJson,
        dispatchPolicyJson: style.dispatchPolicyJson,
        dedupePolicyJson: style.dedupePolicyJson,
        status: 'active',
      });
      await loadStyles(selectedAccount.id, selectedPlugin);
      setSelectedStyleId(created.id);
      setNotice(`已复制风格：${created.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function copyStyleToMatrix() {
    if (!selectedStyle || !selectedAccount || copyTargetIds.length === 0) return;
    setError('');
    try {
      const copied = await appApi.ai.copyStyleToAccounts(selectedStyle.id, {
        targetAccountIds: copyTargetIds,
        nameSuffix: copySuffix,
      });
      await loadStyles(selectedAccount.id, selectedPlugin);
      setShowCopyMatrix(false);
      setNotice(`已复制到 ${copied.length} 个矩阵账号。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function pauseStyle(style: ContentStyle) {
    if (!selectedAccount) return;
    setError('');
    try {
      await appApi.ai.updateStyle(style.id, { status: 'paused' });
      await loadStyles(selectedAccount.id, selectedPlugin);
      setNotice(`已暂停风格：${style.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function deleteStyle(style: ContentStyle) {
    if (!selectedAccount) return;
    if (!confirm(`确定要删除风格「${style.name}」吗？此操作不可恢复。`)) return;
    setError('');
    try {
      await appApi.ai.deleteStyle(style.id);
      await loadStyles(selectedAccount.id, selectedPlugin);
      setNotice(`已删除风格：${style.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function saveStyle(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAccount) return;
    setError('');
    try {
      if (editingStyleId) {
        const updated = await appApi.ai.updateStyle(editingStyleId, {
          name: styleForm.name,
          description: styleForm.description,
          workflowCode: selectedWorkflow,
          reviewPolicyJson: reviewPolicyFor(styleForm.reviewMode),
          status: 'active',
        });
        await loadStyles(selectedAccount.id, selectedPlugin);
        setSelectedStyleId(updated.id);
        setNotice(`已更新风格：${updated.name}`);
      } else {
        const created = await appApi.ai.createStyle({
          accountId: selectedAccount.id,
          pluginCode: selectedPlugin,
          workflowCode: selectedWorkflow,
          name: styleForm.name,
          description: styleForm.description,
          reviewPolicyJson: reviewPolicyFor(styleForm.reviewMode),
          dispatchPolicyJson: { inheritAccountPolicy: true },
          dedupePolicyJson: { topicWindowHours: 24 },
          status: 'active',
        });
        await loadStyles(selectedAccount.id, selectedPlugin);
        setSelectedStyleId(created.id);
        setNotice(`已创建风格：${created.name}`);
      }
      setShowStyleForm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handlePreview() {
    if (isRunning || !selectedAccount) return;
    setIsRunning(true);
    setNotice('');
    setError('');
    setResult(null);
    setLogs([{ level: 'info', message: '开始装配账号、插件、内容风格和运行参数。', time: new Date().toISOString() }]);

    try {
      const startedRun = await appApi.ai.startWorkflowRun({
        accountId: selectedAccount.id,
        pluginCode: selectedPlugin,
        workflowCode: selectedWorkflow,
        inputParams: {
          ...params,
          accountId: selectedAccount.id,
          styleId: selectedStyleId,
          reviewMode,
        },
      });
      addLog('info', `正式运行已创建：${startedRun.runId}`);
      const runResult = await waitForWorkflowRun(startedRun.runId);
      setResult(extractPreviewResult(runResult, `preview_${Date.now()}`));
      setLogs((current) => [
        ...current,
        ...runResult.logs
          .filter((log: any) => log?.message)
          .map((log: any) => ({
            level: log.level === 'fatal' ? 'error' : (log.level ?? 'info'),
            message: log.message,
            time: log.time ?? new Date().toISOString(),
          })),
      ]);
      addLog(runResult.status === 'failed' ? 'error' : 'success', `工作流状态：${runResult.status}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      addLog('error', message);
    } finally {
      setIsRunning(false);
    }
  }

  async function saveGeneratedContent() {
    if (!result || !selectedAccount || !selectedStyle) return;
    setIsSaving(true);
    setNotice('');
    setError('');
    try {
      if (result.persistedContentId) {
        setNotice(reviewMode !== 'auto'
          ? `工作流已自动保存内容 #${result.persistedContentId}，并加入审核池。`
          : `工作流已自动保存内容 #${result.persistedContentId}。`);
        return;
      }

      const content = await appApi.contents.create({
        title: `${selectedStyle.name} - ${String(readParam(params, 'topic') || selectedWorkflow)}`,
        body: result.content,
        source: 'ai',
        status: reviewMode === 'auto' ? 'approved' : 'reviewing',
        tenantId: selectedStyle.tenantId,
        accountId: selectedAccount.id,
        pluginCode: selectedPlugin,
        styleId: selectedStyle.id,
        runId: result.runId,
        topicsJson: String(readParam(params, 'topic') || '').trim() ? [String(readParam(params, 'topic'))] : [],
        mediaJson: result.imageUrl ? [{ url: result.imageUrl }] : [],
        sourceJson: {
          accountName: selectedAccount.name,
          pluginName: selectedPluginRecord?.name ?? selectedPlugin,
          workflowCode: selectedWorkflow,
          input: params,
        },
        riskJson: { score: reviewMode === 'auto' ? 10 : 40, reviewMode },
      });

      if (reviewMode !== 'auto') {
        await appApi.review.create({
          contentId: content.id,
          reviewMode,
          status: 'pending',
          comment: 'AI 生成后进入人工审核池',
        });
        setNotice('已保存内容，并加入人工审核池。');
      } else {
        setNotice('已免审保存为可调度内容。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="tw-space-y-8 tw-animate-fade-in">
      <div className="tw-flex tw-flex-col xl:tw-flex-row tw-items-start xl:tw-items-center tw-justify-between tw-gap-6 tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
            <div className="tw-w-2 tw-h-2 tw-bg-brand-500 tw-rounded-full" />
            <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.3em]">AI Content Operations</span>
          </div>
          <h1 className="tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">Agent 引擎</h1>
          <p className="tw-text-slate-500 tw-text-sm tw-mt-2 tw-font-medium">
            为不同客户、不同微博号配置插件和内容风格，生成后按策略进入审核池或可调度内容池。
          </p>
        </div>

        <div className="tw-flex tw-items-center tw-gap-3">
          <button onClick={() => void loadInitialData()} className="tw-w-11 tw-h-11 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-500 tw-rounded-xl tw-flex tw-items-center tw-justify-center hover:tw-bg-slate-50 tw-transition-all" title="刷新配置" type="button">
            <RefreshCcw size={17} />
          </button>
          <button onClick={handlePreview} disabled={isRunning || !selectedAccount || !selectedStyle} className="tw-px-6 tw-py-3 tw-bg-slate-900 tw-text-white tw-text-xs tw-font-bold tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-flex tw-items-center tw-gap-2 disabled:tw-opacity-50" type="button">
            {isRunning ? <Activity className="tw-animate-spin" size={16} /> : <Play size={16} />}
            运行预览
          </button>
        </div>
      </div>

      {(notice || error) && (
        <div className={`tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-p-4 tw-text-sm tw-font-bold ${error ? 'tw-bg-red-50 tw-border-red-100 tw-text-red-600' : 'tw-bg-emerald-50 tw-border-emerald-100 tw-text-emerald-600'}`}>
          {error ? <Trash2 size={17} /> : <CheckCircle2 size={17} />}
          {error || notice}
        </div>
      )}

      <div className="tw-grid tw-grid-cols-12 tw-gap-8">
        <section className="tw-col-span-12 xl:tw-col-span-4 tw-space-y-6">
          <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-shadow-sm">
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-5">
              <UserCircle size={17} className="tw-text-brand-500" />
              <h2 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">账号与插件</h2>
            </div>
            <div className="tw-space-y-5">
              <label className="tw-block">
                <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">微博账号</span>
                <select className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm tw-font-bold focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10" value={selectedAccountId ?? ''} onChange={(event) => {
                  const account = accounts.find((item) => item.id === Number(event.target.value)) ?? null;
                  setSelectedAccountId(account?.id ?? null);
                  if (account?.activePluginCode) setSelectedPlugin(account.activePluginCode);
                }}>
                  <option value="">选择账号</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name} ({account.platform})</option>
                  ))}
                </select>
              </label>
              <label className="tw-block">
                <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">客户插件</span>
                <select className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm tw-font-bold focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10" value={selectedPlugin} onChange={(event) => setSelectedPlugin(event.target.value)}>
                  {plugins.length === 0 && <option value="maoxiaoxian">猫小仙样例插件</option>}
                  {plugins.map((plugin) => (
                    <option key={plugin.code} value={plugin.code}>{plugin.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-shadow-sm">
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-mb-5">
              <div className="tw-flex tw-items-center tw-gap-2">
                <Layers size={17} className="tw-text-brand-500" />
                <h2 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">内容风格</h2>
              </div>
              <button type="button" onClick={beginCreateStyle} disabled={!selectedAccount} className="tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-bg-brand-50 tw-text-brand-600 tw-rounded-lg tw-text-[11px] tw-font-black disabled:tw-opacity-50">
                <Plus size={13} />
                新建
              </button>
            </div>
            <div className="tw-space-y-3">
              {styles.map((style) => {
                const active = selectedStyleId === style.id;
                return (
                  <div key={style.id} className={`tw-rounded-xl tw-border tw-transition-all ${active ? 'tw-border-brand-500 tw-bg-brand-50 tw-shadow-sm' : 'tw-border-slate-100 tw-bg-slate-50/50 hover:tw-bg-white'}`}>
                    <button type="button" onClick={() => setSelectedStyleId(style.id)} className="tw-w-full tw-text-left tw-p-4">
                      <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
                        <span className="tw-text-sm tw-font-black tw-text-slate-900">{style.name}</span>
                        <span className="tw-text-[10px] tw-font-bold tw-text-slate-400">{readPolicyLabel(style)}</span>
                      </div>
                      <p className="tw-text-xs tw-text-slate-500 tw-mt-2 tw-leading-relaxed">{style.description || '暂无描述'}</p>
                    </button>
                    {active && (
                      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-px-4 tw-pb-4">
                        <button type="button" onClick={() => beginEditStyle(style)} className="tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-bg-white tw-border tw-border-slate-100 tw-rounded-lg tw-text-[10px] tw-font-black tw-text-slate-500">
                          <PenLine size={12} /> 编辑
                        </button>
                        <button type="button" onClick={() => void copyStyle(style)} className="tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-bg-white tw-border tw-border-slate-100 tw-rounded-lg tw-text-[10px] tw-font-black tw-text-slate-500">
                          <Copy size={12} /> 复制
                        </button>
                        <button type="button" onClick={beginCopyMatrix} disabled={matrixAccounts.length === 0} className="tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-bg-white tw-border tw-border-slate-100 tw-rounded-lg tw-text-[10px] tw-font-black tw-text-slate-500 disabled:tw-opacity-40">
                          <Layers size={12} /> 批量到矩阵
                        </button>
                        <button type="button" onClick={() => void pauseStyle(style)} className="tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-bg-white tw-border tw-border-red-100 tw-rounded-lg tw-text-[10px] tw-font-black tw-text-red-500">
                          <Trash2 size={12} /> 暂停
                        </button>
                        <button type="button" onClick={() => void deleteStyle(style)} className="tw-inline-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1.5 tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-lg tw-text-[10px] tw-font-black tw-text-red-600 hover:tw-bg-red-100 tw-transition-all">
                          <Trash2 size={12} /> 删除
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {styles.length === 0 && (
                <div className="tw-p-6 tw-bg-slate-50 tw-rounded-xl tw-text-sm tw-text-slate-400 tw-text-center">当前账号还没有可用内容风格。</div>
              )}
            </div>
          </div>

          <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-shadow-sm">
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-5">
              <Settings2 size={17} className="tw-text-brand-500" />
              <h2 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">审核策略</h2>
            </div>
            <div className="tw-grid tw-grid-cols-3 tw-gap-2">
              {[
                { value: 'manual' as ReviewMode, label: '人工审核', hint: '生成后进入审核池' },
                { value: 'auto' as ReviewMode, label: '免审核', hint: '直接保存为可调度' },
                { value: 'sample' as ReviewMode, label: '抽样审核', hint: '按抽检比例审核' },
              ].map((mode) => (
                <button key={mode.value} type="button" onClick={() => setReviewMode(mode.value)} className={`tw-p-4 tw-rounded-xl tw-border tw-text-left tw-transition-all ${reviewMode === mode.value ? 'tw-bg-slate-900 tw-text-white tw-border-slate-900' : 'tw-bg-slate-50 tw-text-slate-600 tw-border-slate-100'}`}>
                  <span className="tw-block tw-text-xs tw-font-black">{mode.label}</span>
                  <span className="tw-block tw-text-[10px] tw-mt-1 tw-opacity-70">{mode.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="tw-col-span-12 xl:tw-col-span-8 tw-space-y-6">
          <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-shadow-sm">
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-5">
              <Wand2 size={17} className="tw-text-brand-500" />
              <h2 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">运行参数</h2>
            </div>
            <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-5">
              {visibleFields.map((field) => (
                <label key={field.key} className={`tw-block ${field.control === 'textarea' ? 'lg:tw-col-span-2' : ''}`}>
                  <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">{field.label}</span>
                  {field.control === 'checkbox' ? (
                    <input
                      type="checkbox"
                      className="tw-h-5 tw-w-5 tw-accent-brand-500"
                      checked={Boolean(readParam(params, field.key))}
                      onChange={(event) => updateParam(field.key, event.target.checked)}
                    />
                  ) : field.control === 'number' ? (
                    <input
                      type="number"
                      className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10"
                      value={String(readParam(params, field.key) || field.defaultValue)}
                      onChange={(event) => updateParam(field.key, Number(event.target.value))}
                    />
                  ) : field.control === 'textarea' ? (
                    <textarea
                      className="tw-w-full tw-min-h-28 tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-resize-none"
                      value={String(readParam(params, field.key) || '')}
                      onChange={(event) => updateParam(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10"
                      value={String(readParam(params, field.key) || '')}
                      onChange={(event) => updateParam(field.key, event.target.value)}
                    />
                  )}
                  {field.description && <span className="tw-block tw-mt-1 tw-text-[10px] tw-font-medium tw-text-slate-400">{field.description}</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
            <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-shadow-sm">
              <div className="tw-flex tw-items-center tw-justify-between tw-mb-5">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <TerminalIcon size={17} className="tw-text-brand-500" />
                  <h2 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">执行日志</h2>
                </div>
                <button type="button" onClick={() => setLogs([])} className="tw-text-[10px] tw-font-bold tw-text-slate-400 hover:tw-text-slate-700">清空</button>
              </div>
              <div className="tw-h-80 tw-overflow-y-auto tw-bg-slate-950 tw-rounded-xl tw-p-4 tw-space-y-3">
                {logs.length === 0 && <div className="tw-h-full tw-flex tw-items-center tw-justify-center tw-text-slate-500"><span className="tw-text-xs tw-font-bold">等待运行</span></div>}
                {logs.map((log, index) => (
                  <div key={`${log.time}-${index}`} className="tw-flex tw-gap-3 tw-text-[11px] tw-font-mono">
                    <span className="tw-text-slate-400 tw-tabular-nums">{new Date(log.time).toLocaleTimeString([], { hour12: false })}</span>
                    <span className={log.level === 'error' ? 'tw-text-red-300' : log.level === 'success' ? 'tw-text-emerald-300' : 'tw-text-slate-300'}>{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-p-6 tw-shadow-sm">
              <div className="tw-flex tw-items-center tw-justify-between tw-mb-5">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <Sparkles size={17} className="tw-text-brand-500" />
                  <h2 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">生成结果</h2>
                </div>
                {result && <span className="tw-text-[10px] tw-font-bold tw-text-slate-400">Run: {result.runId}</span>}
              </div>
              {result ? (
                <div className="tw-space-y-4">
                  <textarea className="tw-w-full tw-h-64 tw-p-4 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm tw-leading-7 tw-resize-none focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10" value={result.content} onChange={(event) => setResult((current) => current ? { ...current, content: event.target.value } : current)} />
                  {result.imageUrl && <img src={result.imageUrl} alt="AI 生成图" className="tw-w-full tw-rounded-xl tw-border tw-border-slate-100" />}
                  <button type="button" onClick={saveGeneratedContent} disabled={isSaving || !selectedStyle} className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-px-5 tw-py-3 tw-bg-brand-500 tw-text-white tw-rounded-xl tw-text-sm tw-font-black hover:tw-bg-brand-600 tw-transition-all disabled:tw-opacity-50">
                    {isSaving ? <Activity className="tw-animate-spin" size={16} /> : <Save size={16} />}
                    保存到审核/调度流程
                  </button>
                </div>
              ) : (
                <div className="tw-h-80 tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-slate-400 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-200">
                  <ClipboardCheck size={34} className="tw-mb-3" />
                  <p className="tw-text-sm tw-font-bold">运行后会在这里编辑和保存微博内容。</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {showStyleForm && (
        <div className="tw-fixed tw-inset-0 tw-z-[100] tw-bg-slate-900/10 tw-backdrop-blur-md tw-flex tw-items-center tw-justify-center tw-p-6">
          <form onSubmit={saveStyle} className="tw-w-full tw-max-w-2xl tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-shadow-2xl tw-p-8 tw-space-y-6">
            <div>
              <h2 className="tw-text-xl tw-font-black tw-text-slate-900">{editingStyleId ? '编辑内容风格' : '新建内容风格'}</h2>
              <p className="tw-text-xs tw-text-slate-400 tw-mt-2">风格会绑定当前账号和插件，用于后续生成、审核和调度策略。</p>
            </div>
            <label className="tw-block">
              <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">风格名称</span>
              <input required className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10" value={styleForm.name} onChange={(event) => setStyleForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如：温柔治愈型 / 热点锐评型" />
            </label>
            <label className="tw-block">
              <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">风格说明与生成要求</span>
              <textarea required className="tw-w-full tw-min-h-32 tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-resize-none" value={styleForm.description} onChange={(event) => setStyleForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div>
              <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">默认审核策略</span>
              <div className="tw-grid tw-grid-cols-3 tw-gap-2">
                {[
                  { value: 'manual' as ReviewMode, label: '人工审核' },
                  { value: 'auto' as ReviewMode, label: '低风险免审' },
                  { value: 'sample' as ReviewMode, label: '抽样审核' },
                ].map((mode) => (
                  <button key={mode.value} type="button" onClick={() => setStyleForm((current) => ({ ...current, reviewMode: mode.value }))} className={`tw-px-3 tw-py-3 tw-rounded-xl tw-text-xs tw-font-black tw-border ${styleForm.reviewMode === mode.value ? 'tw-bg-slate-900 tw-text-white tw-border-slate-900' : 'tw-bg-slate-50 tw-text-slate-500 tw-border-slate-100'}`}>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-pt-2">
              <button type="button" onClick={() => setShowStyleForm(false)} className="tw-px-6 tw-py-3 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-600 tw-rounded-xl tw-text-sm tw-font-bold">取消</button>
              <button type="submit" className="tw-px-8 tw-py-3 tw-bg-slate-900 tw-text-white tw-rounded-xl tw-text-sm tw-font-black hover:tw-bg-brand-600">保存风格</button>
            </div>
          </form>
        </div>
      )}

      {showCopyMatrix && selectedStyle && (
        <div className="tw-fixed tw-inset-0 tw-z-[100] tw-bg-slate-900/10 tw-backdrop-blur-md tw-flex tw-items-center tw-justify-center tw-p-6">
          <div className="tw-w-full tw-max-w-2xl tw-bg-white tw-border tw-border-slate-100 tw-rounded-2xl tw-shadow-2xl tw-p-8 tw-space-y-6">
            <div>
              <h2 className="tw-text-xl tw-font-black tw-text-slate-900">批量复制到矩阵账号</h2>
              <p className="tw-text-xs tw-text-slate-400 tw-mt-2">将「{selectedStyle.name}」复制到同插件账号，保留工作流、审核、调度和去重策略。</p>
            </div>
            <label className="tw-block">
              <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">新风格后缀</span>
              <input className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10" value={copySuffix} onChange={(event) => setCopySuffix(event.target.value)} />
            </label>
            <div className="tw-space-y-3">
              <div className="tw-flex tw-items-center tw-justify-between">
                <span className="tw-text-[11px] tw-font-bold tw-text-slate-400">目标账号</span>
                <button type="button" className="tw-text-[11px] tw-font-black tw-text-brand-600" onClick={() => setCopyTargetIds(matrixAccounts.map((account) => account.id))}>全选</button>
              </div>
              {matrixAccounts.map((account) => (
                <label key={account.id} className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-p-4 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl">
                  <span>
                    <span className="tw-block tw-text-sm tw-font-black tw-text-slate-800">{account.name}</span>
                    <span className="tw-block tw-text-[11px] tw-text-slate-400 tw-mt-1">{account.platform} / {account.status}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={copyTargetIds.includes(account.id)}
                    onChange={(event) => {
                      setCopyTargetIds((current) => event.target.checked
                        ? Array.from(new Set([...current, account.id]))
                        : current.filter((id) => id !== account.id));
                    }}
                    className="tw-h-5 tw-w-5 tw-accent-brand-500"
                  />
                </label>
              ))}
              {matrixAccounts.length === 0 && <div className="tw-p-6 tw-bg-slate-50 tw-rounded-xl tw-text-sm tw-text-slate-400 tw-text-center">没有同插件的其他账号可复制。</div>}
            </div>
            <div className="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-pt-2">
              <button type="button" onClick={() => setShowCopyMatrix(false)} className="tw-px-6 tw-py-3 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-600 tw-rounded-xl tw-text-sm tw-font-bold">取消</button>
              <button type="button" onClick={() => void copyStyleToMatrix()} disabled={copyTargetIds.length === 0} className="tw-px-8 tw-py-3 tw-bg-slate-900 tw-text-white tw-rounded-xl tw-text-sm tw-font-black hover:tw-bg-brand-600 disabled:tw-opacity-50">复制到账号</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
