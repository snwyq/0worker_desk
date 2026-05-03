import { Fragment, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  PenLine, 
  Trash2,
  RotateCcw,
  XCircle,
  FileText,
  Image as ImageIcon,
  History,
  MoreHorizontal,
  Settings,
  Square,
  RefreshCcw,
  Rocket,
  Zap,
  Users,
  X,
  Bold,
  Italic,
  Type,
  Palette,
  Maximize2,
  FolderOpen
} from 'lucide-react';
import type { Account, ContentItem, DistributionTask, PlatformCode, Post, PostStatus, PublishRun, SchedulerStatus } from '../../shared/types';
import { appApi } from '../api';
import { readTaskEditorDraft } from '../queueEditorModel';
import { htmlToPlainPreview } from '../textFormatting';

const taskFilters: Array<{ id: 'all' | PostStatus; label: string }> = [
  { id: 'all', label: '全部状态' },
  { id: 'queued', label: '队列中' },
  { id: 'published', label: '已发布' },
  { id: 'failed', label: '执行失败' },
  { id: 'needs_manual_action', label: '需要人工' },
];

export function QueuePage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<DistributionTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | PostStatus>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [taskRuns, setTaskRuns] = useState<Record<number, PublishRun[]>>({});
  const [busyPost, setBusyPost] = useState<Post | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  
  // Form State
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState('');
  const [mediaPaths, setMediaPaths] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  
  // 用一个 ref 来存储真实的 HTML 内容，避免 React 重新渲染导致的输入 Bug
  const contentRef = useRef('');

  async function load() {
    try {
      const [nextAccounts, nextContents, nextPosts, nextTasks] = await Promise.all([
        appApi.accounts.list(),
        appApi.contents.list(),
        appApi.posts.list(),
        appApi.distributionTasks.list(),
      ]);
      setAccounts(nextAccounts || []);
      setContents(nextContents || []);
      setPosts(nextPosts || []);
      setTasks(nextTasks || []);
    } catch (err) {
      console.error('Failed to load queue data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshScheduler() {
    try {
      const nextStatus = await appApi.scheduler.status();
      setSchedulerStatus(nextStatus);
    } catch (err) {
      console.error('Failed to refresh scheduler status:', err);
    }
  }

  async function startWorker() {
    try {
      setSchedulerStatus(await appApi.scheduler.start());
    } catch (err) {
      alert('启动失败: ' + String(err));
    }
  }

  async function stopWorker() {
    try {
      setSchedulerStatus(await appApi.scheduler.stop());
    } catch (err) {
      alert('停止失败: ' + String(err));
    }
  }

  useEffect(() => {
    void load();
    void refreshScheduler();
    const timer = window.setInterval(() => {
      void load();
      void refreshScheduler();
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);


  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const postsById = new Map(posts.map((p) => [p.id, p]));

  const filteredTasks = tasks.filter((task) => {
    const account = accountsById.get(task.accountId);
    const matchesSearch = 
      account?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || task.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const visibleTasks = filteredTasks.sort((a, b) => 
    new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );

  function resetForm() {
    setEditingTaskId(null);
    setAccountId(accounts[0]?.id.toString() || '');
    setMediaPaths('');
    setEditorHtml('');
    contentRef.current = '';
    
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setScheduledAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    setError('');
  }

  function editTask(task: DistributionTask) {
    setEditingTaskId(task.id);
    setAccountId(task.accountId.toString());
    const draft = readTaskEditorDraft(task, contents);
    contentRef.current = draft.contentHtml;
    setEditorHtml(draft.contentHtml);
    
    setMediaPaths(draft.mediaPathsText);
    setScheduledAt(new Date(task.scheduledAt).toISOString().slice(0, 16));
    setShowForm(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      const dateObj = new Date(scheduledAt);
      if (isNaN(dateObj.getTime())) throw new Error('发布时间格式不正确');

      const nextMediaPaths = mediaPaths.split('\n').map((path) => path.trim()).filter(Boolean);
      const finalContent = editorHtml;

      if (editingTaskId) {
        await appApi.distributionTasks.update(editingTaskId, {
          accountId: Number(accountId),
          scheduledAt: dateObj.toISOString(),
          status: tasks.find((task) => task.id === editingTaskId)?.status ?? 'queued',
          platformPayload: { content: finalContent, mediaPaths: nextMediaPaths },
        });
      } else {
        await appApi.posts.create({
          accountId: Number(accountId),
          content: finalContent,
          mediaPaths: nextMediaPaths,
          scheduledAt: dateObj.toISOString(),
          status: 'queued',
        });
      }

      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function handleBrowseFiles() {
    try {
      const files = await appApi.media.selectFiles();
      if (files && files.length > 0) {
        const current = mediaPaths.split('\n').filter(Boolean);
        const combined = [...new Set([...current, ...files])];
        setMediaPaths(combined.join('\n'));
      }
    } catch (err) {
      console.error('File selection failed:', err);
    }
  }

  async function deleteTask(postId: number) {
    if (!window.confirm('确定要删除此任务吗？')) return;
    try {
      await appApi.posts.delete(postId);
      await load();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function publishNow(post: Post) {
    if (busyPost) return;
    setBusyPost(post);
    try {
      const account = accountsById.get(post.accountId);
      if (account?.browserMode === 'adspower') {
        await appApi.posts.publishNow(post.id);
      } else {
        await appApi.posts.attemptPublish(post.id);
      }
      await load();
    } catch (err) {
      console.error('Manual publish failed:', err);
      alert('执行失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusyPost(null);
    }
  }

  function getStatusBadge(status: PostStatus) {
    switch (status) {
      case 'published':
        return <span className="tw-px-3 tw-py-1 tw-bg-emerald-50 tw-text-emerald-600 tw-rounded-full tw-text-[10px] tw-font-black tw-uppercase">已发布</span>;
      case 'publishing':
        return <span className="tw-px-3 tw-py-1 tw-bg-brand-50 tw-text-brand-600 tw-rounded-full tw-text-[10px] tw-font-black tw-uppercase tw-animate-pulse">发布中</span>;
      case 'failed':
        return <span className="tw-px-3 tw-py-1 tw-bg-red-50 tw-text-red-600 tw-rounded-full tw-text-[10px] tw-font-black tw-uppercase">失败</span>;
      case 'needs_manual_action':
        return <span className="tw-px-3 tw-py-1 tw-bg-amber-50 tw-text-amber-600 tw-rounded-full tw-text-[10px] tw-font-black tw-uppercase">需人工</span>;
      default:
        return <span className="tw-px-3 tw-py-1 tw-bg-blue-50 tw-text-blue-600 tw-rounded-full tw-text-[10px] tw-font-black tw-uppercase">排队中</span>;
    }
  }

  if (loading) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-h-[60vh]">
        <div className="tw-w-10 tw-h-10 tw-border-4 tw-border-brand-100 tw-border-t-brand-600 tw-rounded-full tw-animate-spin" />
      </div>
    );
  }

  return (
    <div className="tw-space-y-8 tw-animate-fade-in">
      {/* Header Section */}
      <div className="tw-flex tw-flex-col md:tw-flex-row tw-items-start md:tw-items-center tw-justify-between tw-gap-6">
        <div>
          <h1 className="tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">发布调度</h1>
          <p className="tw-text-slate-400 tw-text-sm tw-mt-1">管理并监控全平台自动化发布任务</p>
        </div>
        <div className="tw-flex tw-items-center tw-gap-3">
          {/* Scheduler Controls */}
          <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[24px] tw-p-2 tw-pr-6 tw-flex tw-items-center tw-gap-4 tw-shadow-sm">
             <div className="tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-2 tw-bg-slate-50 tw-rounded-2xl tw-border tw-border-slate-100">
                <div className={`tw-w-2.5 tw-h-2.5 tw-rounded-full ${schedulerStatus?.running ? 'tw-bg-emerald-500 tw-animate-pulse' : 'tw-bg-slate-300'}`} />
                <span className="tw-text-[11px] tw-font-black tw-text-slate-600 tw-uppercase tw-tracking-tight">
                  {schedulerStatus?.running ? '引擎运行中' : '引擎已停止'}
                </span>
             </div>

             <div className="tw-flex tw-items-center tw-gap-1">
                {!schedulerStatus?.running ? (
                  <button 
                    onClick={startWorker}
                    className="tw-w-10 tw-h-10 tw-bg-emerald-50 tw-text-emerald-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center hover:tw-bg-emerald-100 tw-transition-all active:tw-scale-95"
                    title="启动引擎"
                  >
                    <Play size={18} fill="currentColor" />
                  </button>
                ) : (
                  <button 
                    onClick={stopWorker}
                    className="tw-w-10 tw-h-10 tw-bg-red-50 tw-text-red-500 tw-rounded-xl tw-flex tw-items-center tw-justify-center hover:tw-bg-red-100 tw-transition-all active:tw-scale-95"
                    title="停止引擎"
                  >
                    <Square size={18} fill="currentColor" />
                  </button>
                )}
                <button 
                  onClick={refreshScheduler}
                  className="tw-w-10 tw-h-10 tw-bg-slate-50 tw-text-slate-400 tw-rounded-xl tw-flex tw-items-center tw-justify-center hover:tw-bg-slate-100 hover:tw-text-slate-600 tw-transition-all"
                  title="刷新状态"
                >
                  <RefreshCcw size={18} />
                </button>
             </div>
          </div>

          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="tw-flex tw-items-center tw-gap-2 tw-px-8 tw-py-4 tw-bg-slate-900 tw-text-white tw-rounded-[24px] tw-text-sm tw-font-black tw-shadow-2xl tw-shadow-slate-200 hover:tw-bg-brand-600 tw-transition-all active:tw-scale-95"
          >
            <Plus size={18} />
            部署新任务
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-4">
        <div className="tw-relative tw-flex-1 tw-min-w-[300px]">
          <Search size={18} className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-300" />
          <input 
            type="text"
            placeholder="搜索账号或平台名称..."
            className="tw-w-full tw-pl-12 tw-pr-4 tw-py-3.5 tw-bg-white tw-border tw-border-slate-100 tw-rounded-[20px] tw-text-sm focus:tw-ring-4 focus:tw-ring-brand-500/10 focus:tw-border-brand-500/20 tw-transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="tw-flex tw-bg-white tw-p-1 tw-rounded-[20px] tw-border tw-border-slate-100">
          {taskFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`tw-px-5 tw-py-2.5 tw-rounded-[16px] tw-text-xs tw-font-bold tw-transition-all ${
                activeFilter === f.id 
                ? 'tw-bg-slate-900 tw-text-white tw-shadow-lg' 
                : 'tw-text-slate-400 hover:tw-text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rich Content Modal Form Overlay */}
      {showForm && (
        <div className="tw-fixed tw-inset-0 tw-z-[100] tw-flex tw-items-center tw-justify-center tw-p-4 md:tw-p-10">
          <div 
            className="tw-absolute tw-inset-0 tw-bg-slate-900/70 tw-backdrop-blur-md tw-animate-fade-in"
            onClick={() => { setShowForm(false); resetForm(); }}
          />
          
          <div className="tw-relative tw-w-full tw-max-w-6xl tw-h-full tw-max-h-[90vh] tw-bg-white tw-rounded-[48px] tw-shadow-[0_0_100px_rgba(0,0,0,0.3)] tw-border tw-border-white/10 tw-flex tw-flex-col tw-overflow-hidden tw-animate-slide-up">
            {/* Modal Header */}
            <div className="tw-flex tw-items-center tw-justify-between tw-px-10 tw-py-8 tw-border-b tw-border-slate-50 tw-bg-slate-50/30">
              <div className="tw-flex tw-items-center tw-gap-4">
                 <div className="tw-w-12 tw-h-12 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-flex tw-items-center tw-justify-center">
                    <PenLine size={24} />
                 </div>
                 <div>
                    <h2 className="tw-text-2xl tw-font-black tw-text-slate-900">
                      {editingTaskId ? '编辑任务计划' : '部署分发任务'}
                    </h2>
                    <p className="tw-text-sm tw-text-slate-400">自动化分发任务配置中心</p>
                 </div>
              </div>
              <button 
                onClick={() => { setShowForm(false); resetForm(); }}
                className="tw-w-12 tw-h-12 tw-bg-white tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-slate-400 hover:tw-bg-red-50 hover:tw-text-red-500 tw-shadow-sm tw-transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="tw-flex-1 tw-flex tw-flex-col tw-overflow-hidden">
              <div className="tw-flex-1 tw-p-10 tw-overflow-y-auto">
                <div className="tw-grid tw-grid-cols-12 tw-gap-10">
                  
                  {/* Left Column: Editor & Media */}
                  <div className="tw-col-span-8 tw-space-y-8">
                    <div className="tw-space-y-3">
                      <div className="tw-flex tw-items-center tw-justify-between">
                        <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-ml-1">发布内容 (仅限纯文本)</label>
                        <span className="tw-text-[10px] tw-font-bold tw-text-slate-300">PLAIN TEXT MODE</span>
                      </div>
                      <div className="tw-relative tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-overflow-hidden focus-within:tw-ring-4 focus-within:tw-ring-brand-500/10 focus-within:tw-border-brand-500/20 tw-transition-all">
                        <textarea
                          className="tw-w-full tw-px-8 tw-py-8 tw-bg-white tw-min-h-[400px] focus:tw-outline-none tw-text-base tw-leading-relaxed tw-resize-none tw-border-none"
                          placeholder="输入发布内容，仅支持换行与分段..."
                          value={editorHtml}
                          onChange={(e) => {
                            setEditorHtml(e.target.value);
                            contentRef.current = e.target.value;
                          }}
                        />
                      </div>
                    </div>

                    <div className="tw-space-y-4">
                       <div className="tw-flex tw-items-center tw-justify-between">
                          <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-ml-1">媒体附件 (支持多选本地图片)</label>
                          <button 
                            type="button"
                            onClick={handleBrowseFiles}
                            className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-slate-900 tw-text-white tw-text-[11px] tw-font-black tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-shadow-xl tw-shadow-slate-100"
                          >
                             <FolderOpen size={14} />
                             选择媒体文件
                          </button>
                       </div>
                       <div className="tw-bg-slate-50 tw-p-6 tw-rounded-[32px] tw-border tw-border-slate-100">
                          <textarea
                            className="tw-w-full tw-bg-transparent tw-border-none tw-p-0 tw-text-[12px] tw-font-mono tw-text-slate-500 tw-min-h-[80px] focus:tw-ring-0 tw-resize-none"
                            placeholder="D:\Images\1.jpg"
                            value={mediaPaths}
                            onChange={(e) => setMediaPaths(e.target.value)}
                          />
                       </div>
                    </div>
                  </div>

                  {/* Right Column: Config */}
                  <div className="tw-col-span-4 tw-space-y-8">
                    <div className="tw-bg-slate-50/50 tw-p-8 tw-rounded-[40px] tw-border tw-border-slate-50 tw-space-y-8">
                      <div className="tw-space-y-4">
                        <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-ml-1">投放账号</label>
                        <select
                          className="tw-w-full tw-px-6 tw-py-4 tw-bg-white tw-border tw-border-slate-100 tw-rounded-[20px] tw-text-sm tw-font-bold tw-shadow-sm focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-transition-all"
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          required
                        >
                          <option value="">请选择执行账号...</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.platform})</option>
                          ))}
                        </select>
                      </div>

                      <div className="tw-space-y-4">
                        <label className="tw-text-[11px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-ml-1">计划发布时间</label>
                        <input
                          type="datetime-local"
                          className="tw-w-full tw-px-6 tw-py-4 tw-bg-white tw-border tw-border-slate-100 tw-rounded-[20px] tw-text-sm tw-font-bold tw-shadow-sm focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-transition-all"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          required
                        />
                        <div className="tw-flex tw-flex-wrap tw-gap-2">
                          {[1, 5, 30, 60].map(m => (
                            <button key={m} type="button" onClick={() => {
                              const n = new Date(); n.setMinutes(n.getMinutes() + m);
                              setScheduledAt(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`);
                            }} className="tw-px-3 tw-py-1 tw-bg-white tw-border tw-border-slate-100 tw-text-[10px] tw-font-bold tw-rounded-lg hover:tw-bg-brand-50 hover:tw-text-brand-600 tw-transition-all">+{m}m</button>
                          ))}
                        </div>
                      </div>

                      <div className="tw-p-6 tw-bg-white/80 tw-rounded-[28px] tw-border tw-border-slate-100 tw-backdrop-blur-md tw-shadow-sm">
                         <p className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-mb-4">实时任务快照</p>
                         <div className="tw-flex tw-items-center tw-gap-3">
                            <div className="tw-w-10 tw-h-10 tw-bg-emerald-50 tw-text-emerald-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                               <CheckCircle2 size={18} />
                            </div>
                            <div>
                               <p className="tw-text-xs tw-font-black tw-text-slate-900">
                                 {accountsById.get(Number(accountId))?.name || '待选择账号'}
                               </p>
                               <p className="tw-text-[10px] tw-text-slate-400 tw-mt-0.5">
                                 {scheduledAt ? `计划于 ${new Date(scheduledAt).toLocaleString()} 发布` : '未设置时间'}
                               </p>
                            </div>
                         </div>
                      </div>
                    </div>

                    {error && (
                      <div className="tw-p-6 tw-bg-red-50 tw-text-red-600 tw-text-xs tw-font-bold tw-rounded-[32px] tw-flex tw-items-start tw-gap-3">
                        <AlertCircle size={18} className="tw-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="tw-px-10 tw-py-8 tw-bg-white tw-border-t tw-border-slate-50 tw-flex tw-items-center tw-justify-end tw-gap-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="tw-px-8 tw-py-4 tw-bg-slate-50 tw-text-slate-500 tw-rounded-[24px] tw-text-sm tw-font-bold hover:tw-bg-slate-100 tw-transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="tw-px-12 tw-py-4 tw-bg-slate-900 tw-text-white tw-rounded-[24px] tw-font-black tw-text-sm hover:tw-bg-brand-600 tw-transition-all tw-shadow-2xl active:tw-scale-[0.98]"
                >
                  {editingTaskId ? '更新任务计划' : '立即部署调度'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task List Section */}
      <div className="tw-bg-white tw-rounded-[32px] tw-border tw-border-slate-100 tw-shadow-sm tw-overflow-hidden">
        <div className="tw-overflow-x-auto">
          <table className="tw-w-full tw-text-left tw-min-w-[1000px]">
            <thead>
              <tr className="tw-bg-slate-50/50 tw-border-b tw-border-slate-50">
                <th className="tw-px-8 tw-py-5 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest tw-w-48">任务主体</th>
                <th className="tw-px-8 tw-py-5 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">内容摘要</th>
                <th className="tw-px-8 tw-py-5 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest tw-w-40">执行时间</th>
                <th className="tw-px-8 tw-py-5 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest tw-w-32">当前状态</th>
                <th className="tw-px-8 tw-py-5 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest tw-text-right tw-w-64">交互操作</th>
              </tr>
            </thead>
            <tbody className="tw-divide-y tw-divide-slate-50">
              {visibleTasks.map((task) => {
                const post = task.legacyPostId ? postsById.get(task.legacyPostId) : null;
                const account = accountsById.get(task.accountId);
                const taskDraft = readTaskEditorDraft(task, contents);
                const taskContentHtml = taskDraft.contentHtml;
                const taskMediaCount = taskDraft.mediaPathsText ? taskDraft.mediaPathsText.split('\n').length : 0;
                const isExpanded = expandedTaskId === task.id;

                return (
                  <Fragment key={task.id}>
                    <tr className="hover:tw-bg-slate-50/40 tw-transition-colors group">
                      <td className="tw-px-8 tw-py-6 tw-whitespace-nowrap">
                        <div className="tw-flex tw-items-center tw-gap-3">
                          <div className="tw-w-10 tw-h-10 tw-bg-slate-50 tw-text-slate-400 tw-rounded-xl tw-flex tw-items-center tw-justify-center group-hover:tw-bg-brand-50 group-hover:tw-text-brand-500 tw-transition-all">
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="tw-text-sm tw-font-bold tw-text-slate-900">{account?.name || '未知账号'}</p>
                            <span className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">{task.platform}</span>
                          </div>
                        </div>
                      </td>
                      <td className="tw-px-8 tw-py-6">
                        <div className="tw-max-w-xs xl:tw-max-w-md">
                          <p className="tw-text-[13px] tw-text-slate-600 tw-truncate tw-font-medium" 
                             title={htmlToPlainPreview(taskContentHtml)}>
                            {htmlToPlainPreview(taskContentHtml)}
                          </p>
                          {taskMediaCount > 0 && (
                            <div className="tw-flex tw-items-center tw-gap-2 tw-mt-1.5">
                              <span className="tw-px-2 tw-py-0.5 tw-bg-blue-50/50 tw-text-blue-600 tw-rounded-md tw-text-[9px] tw-font-bold tw-flex tw-items-center tw-gap-1">
                                <ImageIcon size={10} /> {taskMediaCount} 媒体文件
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="tw-px-8 tw-py-6 tw-whitespace-nowrap">
                        <div className="tw-flex tw-items-center tw-gap-3">
                          <div className={`tw-p-2 tw-rounded-lg ${
                            new Date(task.scheduledAt) > new Date() 
                            ? 'tw-bg-brand-50 tw-text-brand-600' 
                            : task.status === 'published' 
                              ? 'tw-bg-emerald-50 tw-text-emerald-600'
                              : 'tw-bg-red-50 tw-text-red-600'
                          }`}>
                            <Clock size={14} />
                          </div>
                          <div className="tw-flex tw-flex-col tw-gap-0.5">
                            <div className="tw-flex tw-items-center tw-gap-1.5">
                              <span className="tw-text-xs tw-font-black tw-text-slate-900">
                                {new Date(task.scheduledAt).toLocaleDateString([], { month: '2-digit', day: '2-digit' })} {new Date(task.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            </div>
                            <span className={`tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest ${
                              new Date(task.scheduledAt) > new Date() 
                              ? 'tw-text-brand-500' 
                              : task.status === 'published' 
                                ? 'tw-text-emerald-500'
                                : 'tw-text-red-500'
                            }`}>
                              {new Date(task.scheduledAt) > new Date() 
                                ? '• 预约执行' 
                                : task.status === 'published' 
                                  ? '• 已按时发布' 
                                  : '• 计划已超时'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="tw-px-8 tw-py-6 tw-whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="tw-px-8 tw-py-6 tw-whitespace-nowrap">
                        <div className="tw-flex tw-items-center tw-justify-end tw-gap-2">
                          {task.status !== 'published' && post && (
                            <button 
                              onClick={() => publishNow(post)}
                              disabled={busyPost?.id === post.id}
                              className="tw-flex tw-items-center tw-gap-2 tw-px-5 tw-py-2 tw-bg-slate-900 tw-text-white tw-rounded-xl tw-text-[12px] tw-font-bold tw-shadow-sm hover:tw-bg-brand-600 tw-transition-all active:tw-scale-95 disabled:tw-opacity-50"
                            >
                              <Play size={14} />
                              手动执行
                            </button>
                          )}
                          <div className="tw-flex tw-items-center tw-gap-1 tw-ml-2">
                            <button 
                              onClick={async () => {
                                if (isExpanded) {
                                  setExpandedTaskId(null);
                                } else {
                                  setExpandedTaskId(task.id);
                                  const runs = await appApi.publishRuns.list(task.id);
                                  setTaskRuns(prev => ({ ...prev, [task.id]: runs.slice(0, 5) || [] }));
                                }
                              }}
                              className={`tw-p-2 tw-rounded-xl tw-transition-all ${isExpanded ? 'tw-bg-slate-900 tw-text-white tw-shadow-lg' : 'tw-text-slate-300 hover:tw-text-slate-900 hover:tw-bg-slate-50'}`}
                              title="日志"
                            >
                              <History size={18} />
                            </button>
                            <button onClick={() => editTask(task)} className="tw-p-2 tw-text-slate-300 hover:tw-text-blue-600 hover:tw-bg-slate-50 tw-rounded-xl tw-transition-all" title="编辑">
                              <Settings size={18} />
                            </button>
                            <button onClick={() => post && deleteTask(post.id)} className="tw-p-2 tw-text-slate-300 hover:tw-text-red-500 hover:tw-bg-red-50 tw-rounded-xl tw-transition-all" title="删除">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="tw-bg-slate-50/20">
                        <td colSpan={5} className="tw-px-8 tw-py-6">
                          <div className="tw-bg-white tw-rounded-2xl tw-p-6 tw-border tw-border-slate-100 tw-shadow-sm tw-animate-fade-in">
                            <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                              <h4 className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">任务执行链路追溯</h4>
                              {task.lastError && (
                                <div className="tw-flex tw-items-center tw-gap-2 tw-text-red-500 tw-bg-red-50 tw-px-3 tw-py-1 tw-rounded-lg">
                                  <AlertCircle size={12} />
                                  <span className="tw-text-[10px] tw-font-bold">异常记录: {task.lastError}</span>
                                </div>
                              )}
                            </div>
                            <div className="tw-space-y-2">
                              {(taskRuns[task.id] || []).length > 0 ? (
                                taskRuns[task.id].map((run) => (
                                  <div key={run.id} className="tw-flex tw-items-center tw-justify-between tw-bg-slate-50/30 tw-px-4 tw-py-2.5 tw-rounded-xl tw-border tw-border-slate-50">
                                    <div className="tw-flex tw-items-center tw-gap-4">
                                      <span className="tw-text-[9px] tw-font-bold tw-text-slate-400 tw-w-24">{new Date(run.finishedAt).toLocaleTimeString()}</span>
                                      <div className="tw-w-1.5 tw-h-1.5 tw-bg-slate-200 tw-rounded-full" />
                                      <span className="tw-text-[11px] tw-text-slate-600 tw-font-bold">{run.message || '心跳检测正常'}</span>
                                    </div>
                                    <div className="tw-flex tw-items-center tw-gap-2">
                                       <span className={`tw-text-[9px] tw-font-black tw-uppercase ${run.status === 'published' ? 'tw-text-emerald-500' : 'tw-text-slate-400'}`}>{run.status}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="tw-py-6 tw-text-center tw-text-slate-300 tw-text-xs">
                                  尚未同步到实时运行日志
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {visibleTasks.length === 0 && !showForm && (
        <div className="tw-py-24 tw-text-center tw-bg-white tw-rounded-[40px] tw-border tw-border-dashed tw-border-slate-200">
          <div className="tw-w-20 tw-h-20 tw-bg-slate-50 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-6 tw-text-slate-200">
            <Rocket size={40} />
          </div>
          <h3 className="tw-text-slate-900 tw-font-bold tw-text-lg">没有找到分发计划</h3>
          <p className="tw-text-slate-400 tw-text-sm tw-mt-1">当前筛选条件下暂无任务，或者您可以点击右上方创建新任务</p>
        </div>
      )}
    </div>
  );
}
