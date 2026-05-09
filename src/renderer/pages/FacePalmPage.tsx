import { useEffect, useState } from 'react';
import { CalendarClock, Trash2, Settings2, Sparkles, AlertCircle, X, FileEdit } from 'lucide-react';
import { appApi } from '../api';
import type { Account, FacePalmTask, FacePalmCategory, AiWorkflow } from '../../shared/types';

const CONFIG_STORAGE_KEY = 'facePalm.generationConfig';

interface StoredConfig {
  accountId?: string;
  category?: FacePalmCategory;
  model?: string;
  batchSize?: number;
  workflowCode?: string;
}

function readStoredConfig(): StoredConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function FacePalmPage() {
  const storedConfig = readStoredConfig();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tasks, setTasks] = useState<FacePalmTask[]>([]);
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  
  const [accountId, setAccountId] = useState(storedConfig.accountId ?? '');
  const [category, setCategory] = useState<FacePalmCategory>(storedConfig.category ?? 'face');
  const [model, setModel] = useState(storedConfig.model ?? 'deepseek-v3.2');
  const [batchSize, setBatchSize] = useState<number>(storedConfig.batchSize ?? 3);
  const [workflowCode, setWorkflowCode] = useState(storedConfig.workflowCode ?? '');
  const [promptTemplate, setPromptTemplate] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentTab, setCurrentTab] = useState<'draft' | 'queued'>('draft');
  
  async function load() {
    try {
      const [accs, tsks, plugins] = await Promise.all([
        appApi.accounts.list().catch(() => []),
        appApi.facePalmTasks.list().catch(() => []),
        appApi.ai.listPlugins().catch(() => []),
      ]);
      
      setAccounts(accs);
      setTasks(tsks);
      
      const allWorkflows: AiWorkflow[] = [];
      for (const plugin of plugins) {
        try {
          const wfs = await appApi.ai.listWorkflows(plugin.code);
          allWorkflows.push(...wfs);
        } catch (e) { }
      }
      setWorkflows(allWorkflows);
      
      if (!accountId && accs[0]) setAccountId(String(accs[0].id));
      if (!workflowCode && allWorkflows.length > 0) setWorkflowCode(allWorkflows[0].code);
      
      const prompt = await appApi.ai.getFacePalmDefaultPrompt(category);
      setPromptTemplate(prompt);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { void load(); }, []);
  
  useEffect(() => {
    appApi.ai.getFacePalmDefaultPrompt(category).then(setPromptTemplate).catch(console.error);
  }, [category]);

  useEffect(() => {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      accountId, category, model, batchSize, workflowCode
    }));
  }, [accountId, category, model, batchSize, workflowCode]);

  async function handleGenerate() {
    if (!accountId) {
      setError('请先选择发号器！');
      return;
    }
    setError(''); setNotice(''); setIsGenerating(true);
    try {
      const res = await appApi.ai.generateFacePalmBatch({
        accountId: Number(accountId),
        category,
        model,
        batchSize,
        promptTemplate,
        workflowCode
      });
      if (res.errors.length > 0) {
        setError(`部分生成失败: ${res.errors.join('; ')}`);
      } else {
        setNotice(`成功生成 ${res.createdContents} 条科普内容`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete() {
    if (selectedTaskIds.length === 0) return;
    try {
      await appApi.facePalmTasks.deleteMany(selectedTaskIds);
      setSelectedTaskIds([]);
      setNotice('删除成功');
      await load();
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleBatchEnqueue() {
    if (selectedTaskIds.length === 0) return;
    try {
      await appApi.facePalmTasks.enqueueMany(selectedTaskIds);
      setSelectedTaskIds([]);
      setNotice('成功批量排期入列调度中心');
      await load();
    } catch (e) {
      setError(String(e));
    }
  }

  const toggleTaskSelection = (id: number) => {
    setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = () => {
    const visibleTasks = tasks.filter(t => t.status === currentTab);
    if (selectedTaskIds.length === visibleTasks.length && visibleTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(visibleTasks.map(t => t.id));
    }
  };

  const toggleTaskExpand = (id: number) => {
    const next = new Set(expandedTaskIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedTaskIds(next);
  };
  
  return (
    <div className="tw-min-h-screen tw-bg-slate-50 tw-pb-20 tw-animate-fade-in">
      {/* 顶部标题 */}
      <div className="tw-mb-6 tw-flex tw-items-center tw-gap-3">
        <div className="tw-rounded-2xl tw-bg-slate-900 tw-p-3 tw-text-white tw-shadow-md">
          <CalendarClock size={22} />
        </div>
        <div>
          <h1 className="tw-text-2xl tw-font-extrabold tw-tracking-tight tw-text-slate-900">面相手相</h1>
          <p className="tw-text-sm tw-text-slate-500 tw-mt-1">批量生成垂直领域科普知识与图文</p>
        </div>
      </div>

      {notice && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-emerald-100 tw-bg-emerald-50 tw-p-4 tw-text-sm tw-font-bold tw-text-emerald-700 tw-flex tw-items-center tw-gap-2"><Sparkles size={16} />{notice}</div>}
      {error && <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-red-100 tw-bg-red-50 tw-p-4 tw-text-sm tw-font-bold tw-text-red-600 tw-flex tw-items-center tw-gap-2"><AlertCircle size={16} />{error}</div>}

      {/* 控制台面板 */}
      <div className="tw-grid tw-gap-4 tw-mb-6">
        <section className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-px-5 tw-py-4 tw-shadow-sm">
          <div className="tw-flex tw-flex-col md:tw-flex-row md:tw-items-end tw-gap-4 tw-justify-between">
            <div className="tw-flex tw-flex-wrap tw-gap-4 tw-items-end">
              <div className="tw-flex tw-flex-col tw-gap-1.5">
                <label className="tw-text-xs tw-font-bold tw-text-slate-700">生成类型</label>
                <div className="tw-flex tw-bg-slate-100 tw-p-1 tw-rounded-lg">
                  <button onClick={() => setCategory('face')} className={`tw-px-4 tw-py-1.5 tw-rounded-md tw-text-sm tw-font-bold tw-transition-all ${category === 'face' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-700'}`}>面相解析</button>
                  <button onClick={() => setCategory('palm')} className={`tw-px-4 tw-py-1.5 tw-rounded-md tw-text-sm tw-font-bold tw-transition-all ${category === 'palm' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-700'}`}>手相科普</button>
                </div>
              </div>

              <div className="tw-flex tw-flex-col tw-gap-1.5">
                <label className="tw-text-xs tw-font-bold tw-text-slate-700">生成数量 (1-10)</label>
                <input type="number" min="1" max="10" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="tw-h-[34px] tw-w-24 tw-rounded-lg tw-border tw-border-slate-200 tw-px-3 tw-text-sm tw-outline-none focus:tw-border-slate-900" />
              </div>

              <div className="tw-flex tw-flex-col tw-gap-1.5">
                <label className="tw-text-xs tw-font-bold tw-text-slate-700">挂载发号器</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="tw-h-[34px] tw-rounded-lg tw-border tw-border-slate-200 tw-px-3 tw-text-sm tw-outline-none focus:tw-border-slate-900">
                  <option value="">请选择账号</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>

              <div className="tw-flex tw-flex-col tw-gap-1.5">
                <label className="tw-text-xs tw-font-bold tw-text-slate-700">栏目调度绑定</label>
                <select value={workflowCode} onChange={e => setWorkflowCode(e.target.value)} className="tw-h-[34px] tw-rounded-lg tw-border tw-border-slate-200 tw-px-3 tw-text-sm tw-outline-none focus:tw-border-slate-900">
                  <option value="">未绑定栏目</option>
                  {workflows.map(wf => <option key={wf.code} value={wf.code}>{wf.name}</option>)}
                </select>
              </div>
            </div>

            <div className="tw-shrink-0 tw-flex tw-items-center tw-gap-2">
              <button
                type="button"
                onClick={() => setShowPromptModal(true)}
                className="tw-inline-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-text-slate-500 hover:tw-bg-slate-50 hover:tw-text-slate-900 tw-transition-colors"
                title="修改提示词"
              >
                <FileEdit size={16} />
              </button>
              <button
                disabled={isGenerating}
                onClick={handleGenerate}
                className="tw-inline-flex tw-h-10 tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-bg-slate-900 tw-px-6 tw-text-sm tw-font-black tw-text-white tw-shadow-sm hover:tw-shadow-md tw-transition-all disabled:tw-opacity-50"
              >
                <Sparkles size={16} /> {isGenerating ? 'AI推演中...' : '开始生成'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 历史任务列表 */}
      <div className="tw-mb-4 tw-flex tw-items-center tw-gap-2">
        <button 
          onClick={() => { setCurrentTab('draft'); setSelectedTaskIds([]); }} 
          className={`tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-rounded-xl tw-transition-all ${currentTab === 'draft' ? 'tw-bg-slate-900 tw-text-white tw-shadow-sm' : 'tw-bg-white tw-text-slate-600 tw-border tw-border-slate-200 hover:tw-bg-slate-50'}`}
        >
          未调度的草稿 ({tasks.filter(t => t.status === 'draft').length})
        </button>
        <button 
          onClick={() => { setCurrentTab('queued'); setSelectedTaskIds([]); }} 
          className={`tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-rounded-xl tw-transition-all ${currentTab === 'queued' ? 'tw-bg-slate-900 tw-text-white tw-shadow-sm' : 'tw-bg-white tw-text-slate-600 tw-border tw-border-slate-200 hover:tw-bg-slate-50'}`}
        >
          已调度的推文 ({tasks.filter(t => t.status === 'queued').length})
        </button>
      </div>

      <div className="tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-shadow-sm tw-overflow-hidden">
        <div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-slate-100 tw-bg-slate-50/50 tw-px-5 tw-py-3">
          <div className="tw-flex tw-items-center tw-gap-3">
            <input 
              type="checkbox" 
              checked={tasks.filter(t => t.status === currentTab).length > 0 && selectedTaskIds.length === tasks.filter(t => t.status === currentTab).length}
              onChange={handleToggleSelectAll}
              className="tw-w-4 tw-h-4 tw-rounded tw-border-slate-300 tw-text-indigo-600 focus:tw-ring-indigo-500 tw-cursor-pointer"
              title="全选/全不选当前页"
            />
            <h2 className="tw-text-sm tw-font-bold tw-text-slate-900">{currentTab === 'draft' ? '待入库内容' : '已排期内容'}</h2>
          </div>
          {selectedTaskIds.length > 0 && (
            <div className="tw-flex tw-items-center tw-gap-2">
              <button onClick={handleBatchEnqueue} className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-bg-emerald-50 tw-px-3 tw-py-1.5 tw-text-xs tw-font-bold tw-text-emerald-600 hover:tw-bg-emerald-100 tw-transition-colors">
                <CalendarClock size={14} /> 批量入库 ({selectedTaskIds.length})
              </button>
              <button onClick={handleDelete} className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-1.5 tw-text-xs tw-font-bold tw-text-red-600 hover:tw-bg-red-100 tw-transition-colors">
                <Trash2 size={14} /> 批量删除 ({selectedTaskIds.length})
              </button>
            </div>
          )}
        </div>

        <div className="tw-overflow-x-auto">
          {tasks.filter(t => t.status === currentTab).length === 0 ? (
            <div className="tw-py-12 tw-text-center tw-text-sm tw-text-slate-500 tw-font-medium">当前分类暂无记录</div>
          ) : (
            <table className="tw-w-full tw-text-left tw-border-collapse">
              <thead>
                <tr className="tw-border-b tw-border-slate-100 tw-bg-slate-50/30 tw-text-xs tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-wider">
                  <th className="tw-p-4 tw-w-12 tw-text-center">#</th>
                  <th className="tw-p-4 tw-w-24">状态</th>
                  <th className="tw-p-4 tw-w-20">分类</th>
                  <th className="tw-p-4">内容预览</th>
                </tr>
              </thead>
              <tbody className="tw-divide-y tw-divide-slate-100">
                {tasks.filter(t => t.status === currentTab).map(task => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  const isExpanded = expandedTaskIds.has(task.id);
                  const payload = task.platformPayload || {};
                  const fullContent = payload.content ? String(payload.content) : '无内容';
                  const contentPreview = isExpanded ? fullContent : (fullContent.length > 60 ? fullContent.slice(0, 60) + '...' : fullContent);
                  
                  return (
                    <tr key={task.id} className={`tw-transition-colors hover:tw-bg-slate-50/50 ${isSelected ? 'tw-bg-indigo-50/30' : ''}`}>
                      <td className="tw-p-4 tw-text-center tw-align-top">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleTaskSelection(task.id)} 
                          className="tw-w-4 tw-h-4 tw-rounded tw-border-slate-300 tw-text-indigo-600 focus:tw-ring-indigo-500"
                        />
                      </td>
                      <td className="tw-p-4 tw-align-top">
                        <span className={`tw-inline-flex tw-items-center tw-justify-center tw-px-2.5 tw-py-1 tw-rounded-md tw-text-xs tw-font-black tw-tracking-wide ${task.status === 'queued' ? 'tw-bg-emerald-500 tw-text-white tw-shadow-sm' : 'tw-bg-slate-100 tw-text-slate-500'}`}>
                          {task.status === 'queued' ? '已排队' : '草稿 (未调)'}
                        </span>
                      </td>
                      <td className="tw-p-4 tw-align-top">
                        <span className={`tw-px-2 tw-py-0.5 tw-rounded tw-text-[10px] tw-font-black tw-uppercase tw-tracking-wider ${task.category === 'face' ? 'tw-bg-amber-100 tw-text-amber-700' : 'tw-bg-teal-100 tw-text-teal-700'}`}>
                          {task.category === 'face' ? '面相' : '手相'}
                        </span>
                      </td>
                      <td className="tw-p-4 tw-align-top">
                        <div className="tw-relative">
                          <p className={`tw-text-sm tw-text-slate-700 tw-leading-relaxed tw-whitespace-pre-wrap ${!isExpanded ? 'tw-cursor-pointer hover:tw-opacity-80 tw-transition-opacity' : ''}`} onClick={() => !isExpanded && toggleTaskExpand(task.id)}>
                            {contentPreview}
                          </p>
                          {fullContent.length > 60 && (
                            <button
                              onClick={() => toggleTaskExpand(task.id)}
                              className="tw-mt-2 tw-text-[11px] tw-font-bold tw-text-indigo-600 hover:tw-text-indigo-800 tw-transition-colors"
                            >
                              {isExpanded ? '收起内容' : '展开全文'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 提示词编辑弹窗 */}
      {showPromptModal && (
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-slate-900/40 tw-backdrop-blur-sm tw-p-4 tw-animate-fade-in">
          <div className="tw-w-full tw-max-w-3xl tw-rounded-2xl tw-bg-white tw-shadow-2xl tw-overflow-hidden tw-flex tw-flex-col tw-max-h-[85vh]">
            <div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-slate-100 tw-px-6 tw-py-4">
              <h3 className="tw-text-lg tw-font-bold tw-text-slate-900">高级配置 - 定制生成提示词</h3>
              <button onClick={() => setShowPromptModal(false)} className="tw-text-slate-400 hover:tw-text-slate-600 tw-transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="tw-flex-1 tw-overflow-y-auto tw-p-6">
              <div className="tw-mb-4 tw-flex tw-items-start tw-justify-between tw-rounded-xl tw-bg-slate-50 tw-p-4 tw-border tw-border-slate-100">
                <div className="tw-text-sm tw-text-slate-600 tw-leading-relaxed">
                  当前修改仅针对本次生成生效。如需恢复系统预设，请点击右侧按钮。
                </div>
                <button
                  onClick={async () => {
                    const prompt = await appApi.ai.getFacePalmDefaultPrompt(category);
                    setPromptTemplate(prompt);
                  }}
                  className="tw-shrink-0 tw-ml-4 tw-inline-flex tw-h-8 tw-items-center tw-justify-center tw-rounded-md tw-bg-slate-200 tw-px-3 tw-text-xs tw-font-bold tw-text-slate-700 hover:tw-bg-slate-300 tw-transition-colors"
                >
                  恢复默认提示词
                </button>
              </div>
              <textarea
                value={promptTemplate}
                onChange={e => setPromptTemplate(e.target.value)}
                className="tw-w-full tw-h-[400px] tw-rounded-xl tw-border tw-border-slate-200 tw-p-4 tw-text-sm tw-font-mono tw-text-slate-700 tw-leading-relaxed focus:tw-border-slate-900 tw-outline-none tw-resize-none tw-bg-slate-50 focus:tw-bg-white tw-transition-colors"
                placeholder="在此输入或修改您的提示词..."
              />
            </div>
            
            <div className="tw-flex tw-items-center tw-justify-end tw-gap-3 tw-border-t tw-border-slate-100 tw-bg-slate-50 tw-px-6 tw-py-4">
              <button
                onClick={() => setShowPromptModal(false)}
                className="tw-inline-flex tw-h-9 tw-items-center tw-justify-center tw-rounded-lg tw-px-4 tw-text-sm tw-font-bold tw-text-slate-600 hover:tw-bg-slate-200 tw-transition-colors"
              >
                完成修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
