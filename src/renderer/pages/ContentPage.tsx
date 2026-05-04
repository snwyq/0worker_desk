import { useEffect, useMemo, useState } from 'react';
import { Check, GitCompare, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import type { Account, ContentItem, ContentStatus } from '../../shared/types';
import { appApi } from '../api';

const statusOptions: Array<{ value: ContentStatus; label: string }> = [
  { value: 'draft', label: '草稿' },
  { value: 'ready', label: '可发布' },
  { value: 'archived', label: '已归档' },
];

const writingStyles = [
  {
    id: 'clear',
    label: '简单清楚',
    prompt: '用普通人能听懂的话说明，不堆术语，重点说清楚这件事是什么、有什么用、下一步怎么做。',
  },
  {
    id: 'friendly',
    label: '轻松口语',
    prompt: '像发朋友圈一样自然一点，语气亲切，句子短，适合社交平台阅读。',
  },
  {
    id: 'professional',
    label: '正式稳重',
    prompt: '表达更稳重，适合品牌号或公告类内容，少用夸张词，突出可信和清晰。',
  },
];

function getPreviewBody(source: string, account: Account, stylePrompt: string) {
  const excerpt = source.trim().slice(0, 180) || '先在左侧输入原文，这里会显示改写后的预览。';
  return `${account.platform} / ${account.name}\n${stylePrompt}\n\n${excerpt}`;
}

export function ContentPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('未命名内容');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [styleId, setStyleId] = useState(writingStyles[0].id);
  const [customPrompt, setCustomPrompt] = useState(writingStyles[0].prompt);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const [nextContents, nextAccounts] = await Promise.all([appApi.contents.list(), appApi.accounts.list()]);
    setContents(nextContents);
    setAccounts(nextAccounts);
    setSelectedAccountIds((current) => current.filter((id) => nextAccounts.some((account) => account.id === id)));
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedAccounts = accounts.filter((account) => selectedAccountIds.includes(account.id));
  const generationPreviews = useMemo(
    () => selectedAccounts.map((account) => ({
      account,
      body: getPreviewBody(body, account, customPrompt),
    })),
    [body, customPrompt, selectedAccounts],
  );

  function editContent(content: ContentItem) {
    setEditingId(content.id);
    setTitle(content.title);
    setBody(content.body);
    setStatus(content.status);
    setNotice(`已打开：${content.title}`);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('未命名内容');
    setBody('');
    setStatus('draft');
    setNotice('');
  }

  function toggleAccount(accountId: number) {
    setSelectedAccountIds((current) => current.includes(accountId)
      ? current.filter((id) => id !== accountId)
      : [...current, accountId]);
  }

  function chooseStyle(nextStyleId: string) {
    const nextStyle = writingStyles.find((style) => style.id === nextStyleId) ?? writingStyles[0];
    setStyleId(nextStyle.id);
    setCustomPrompt(nextStyle.prompt);
  }

  async function saveContent(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      if (editingId) {
        await appApi.contents.update(editingId, { title, body, status });
      } else {
        await appApi.contents.create({ title, body, source: 'manual', status });
      }
      setNotice('内容已保存');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function deleteContent(content: ContentItem) {
    setError('');
    setNotice('');

    try {
      const result = await appApi.contents.delete(content.id);
      if (!result.ok) {
        throw new Error('删除内容失败');
      }
      if (editingId === content.id) {
        resetForm();
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function pushToPublishQueue() {
    setNotice(`已准备 ${generationPreviews.length} 个账号版本，可以去“发布任务”里继续处理`);
  }

  return (
    <div className="tw-space-y-8 tw-animate-fade-in tw-pb-20">
      {/* Header */}
      <div className="tw-flex tw-flex-col xl:tw-flex-row tw-items-start xl:tw-items-center tw-justify-between tw-gap-6 tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
            <div className="tw-w-2 tw-h-2 tw-bg-brand-500 tw-rounded-full" />
            <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.3em]">Content Vault</span>
          </div>
          <h1 className="tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">内容金库</h1>
          <p className="tw-text-slate-500 tw-text-sm tw-mt-2 tw-font-medium">
            集中管理基础文案内容，并根据不同平台的风格要求派生出专属的发布稿。
          </p>
        </div>

        <div className="tw-flex tw-items-center tw-gap-3">
          <button onClick={resetForm} className="tw-px-4 tw-py-2.5 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-700 tw-text-xs tw-font-bold tw-rounded-xl hover:tw-bg-slate-50 tw-transition-all tw-flex tw-items-center tw-gap-2" type="button">
            <Plus size={16} />
            新建基础内容
          </button>
        </div>
      </div>

      {(notice || error) && (
        <div className={`tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-p-4 tw-text-sm tw-font-bold ${error ? 'tw-bg-red-50 tw-border-red-100 tw-text-red-600' : 'tw-bg-emerald-50 tw-border-emerald-100 tw-text-emerald-600'}`}>
          <Check size={17} />
          {error || notice}
        </div>
      )}

      <div className="tw-grid tw-grid-cols-12 tw-gap-8">
        {/* 左侧：已保存内容列表 */}
        <div className="tw-col-span-12 xl:tw-col-span-3 tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
            <h2 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">已保存内容</h2>
          </div>
          <div className="tw-space-y-2">
            {contents.map((content) => {
              const active = content.id === editingId;
              return (
                <button
                  key={content.id}
                  onClick={() => editContent(content)}
                  type="button"
                  className={`tw-w-full tw-text-left tw-px-4 tw-py-3 tw-rounded-xl tw-border tw-transition-all tw-flex tw-flex-col tw-gap-2 ${active ? 'tw-bg-slate-900 tw-border-slate-900 tw-text-white' : 'tw-bg-white tw-border-slate-100 tw-text-slate-700 hover:tw-border-brand-300'}`}
                >
                  <span className="tw-text-sm tw-font-bold tw-truncate tw-w-full">{content.title}</span>
                  <span className={`tw-text-[10px] tw-font-black tw-px-2 tw-py-0.5 tw-rounded-md tw-self-start ${active ? 'tw-bg-white/20 tw-text-white' : 'tw-bg-slate-100 tw-text-slate-500'}`}>
                    {statusOptions.find((item) => item.value === content.status)?.label ?? content.status}
                  </span>
                </button>
              );
            })}
            {!contents.length && (
              <div className="tw-p-6 tw-bg-slate-50 tw-rounded-xl tw-text-sm tw-text-slate-400 tw-text-center">还没有保存过内容。</div>
            )}
          </div>
        </div>

        {/* 右侧主工作区 */}
        <div className="tw-col-span-12 xl:tw-col-span-9 tw-space-y-8">
          {/* 表单区域 */}
          <form className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-p-8 tw-shadow-sm" onSubmit={saveContent}>
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
              <h2 className="tw-text-lg tw-font-black tw-text-slate-900">1. 编辑基础原文</h2>
              <div className="tw-flex tw-items-center tw-gap-3">
                <select className="tw-px-4 tw-py-2 tw-bg-slate-50 tw-border tw-border-slate-200 tw-rounded-xl tw-text-xs tw-font-bold focus:tw-outline-none" value={status} onChange={(event) => setStatus(event.target.value as ContentStatus)}>
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <button className="tw-px-6 tw-py-2.5 tw-bg-slate-900 tw-text-white tw-text-xs tw-font-bold tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-flex tw-items-center tw-gap-2" type="submit">
                  <Check size={15} /> 保存内容
                </button>
              </div>
            </div>

            <div className="tw-space-y-5">
              <label className="tw-block">
                <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">标题</span>
                <input className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm tw-font-bold focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </label>
              <label className="tw-block">
                <span className="tw-block tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-2">原文内容</span>
                <textarea
                  className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm tw-leading-relaxed focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-min-h-[160px] tw-resize-y"
                  placeholder="把你想发布的内容先写在这里。比如一段产品更新、活动通知、周报总结，或者从别处粘贴过来的草稿。"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                />
              </label>
            </div>
          </form>

          {/* 生成控制台 */}
          <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-p-8 tw-shadow-sm tw-space-y-8">
            <div className="tw-flex tw-items-center tw-justify-between">
              <h2 className="tw-text-lg tw-font-black tw-text-slate-900">2. 派生账号发布稿</h2>
              <div className="tw-flex tw-items-center tw-gap-2 tw-px-3 tw-py-1 tw-bg-blue-50 tw-text-blue-600 tw-rounded-full tw-text-[10px] tw-font-black">
                <span className="tw-w-1.5 tw-h-1.5 tw-bg-blue-500 tw-rounded-full tw-animate-pulse" /> 实时预览中
              </div>
            </div>

            {/* 选择账号 */}
            <div>
              <h3 className="tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-3">选择发布账号</h3>
              <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-3 lg:tw-grid-cols-4 tw-gap-3">
                {accounts.map((account) => {
                  const active = selectedAccountIds.includes(account.id);
                  return (
                    <button
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      type="button"
                      className={`tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-3 tw-rounded-xl tw-border tw-transition-all ${active ? 'tw-bg-brand-50 tw-border-brand-200 tw-shadow-sm' : 'tw-bg-slate-50 tw-border-slate-100 hover:tw-border-slate-300'}`}
                    >
                      <div className={`tw-w-2 tw-h-2 tw-rounded-full ${account.status === 'active' ? 'tw-bg-emerald-400' : 'tw-bg-amber-400'}`} />
                      <div className="tw-flex tw-flex-col tw-items-start tw-overflow-hidden">
                        <span className="tw-text-sm tw-font-bold tw-text-slate-900 tw-truncate tw-w-full tw-text-left">{account.name}</span>
                        <span className="tw-text-[10px] tw-text-slate-500">{account.platform}</span>
                      </div>
                    </button>
                  );
                })}
                {!accounts.length && <p className="tw-col-span-full tw-text-sm tw-text-slate-400 tw-py-4">还没有添加账号。</p>}
              </div>
            </div>

            {/* 选择改写方式 */}
            <div>
              <h3 className="tw-text-[11px] tw-font-bold tw-text-slate-400 tw-mb-3">设置改写规则</h3>
              <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mb-4">
                {writingStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => chooseStyle(style.id)}
                    type="button"
                    className={`tw-px-4 tw-py-2 tw-rounded-lg tw-text-xs tw-font-bold tw-transition-all ${style.id === styleId ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-slate-100 tw-text-slate-600 hover:tw-bg-slate-200'}`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
              <textarea
                className="tw-w-full tw-px-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-xl tw-text-sm tw-leading-relaxed focus:tw-outline-none focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-min-h-[80px]"
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
              />
            </div>

            {/* 预览结果 */}
            <div>
              <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                <h3 className="tw-text-[11px] tw-font-bold tw-text-slate-400">派生预览与发布</h3>
                <button className="tw-px-4 tw-py-2 tw-bg-brand-500 tw-text-white tw-text-xs tw-font-bold tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all tw-flex tw-items-center tw-gap-2 disabled:tw-opacity-50" disabled={!generationPreviews.length} type="button" onClick={pushToPublishQueue}>
                  <Send size={14} /> 加入发布队列
                </button>
              </div>
              <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
                {generationPreviews.map((preview) => (
                  <div className="tw-bg-slate-50 tw-border tw-border-slate-100 tw-rounded-2xl tw-p-5" key={preview.account.id}>
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-3">
                      <div className="tw-flex tw-items-center tw-gap-2">
                        <span className="tw-text-sm tw-font-bold tw-text-slate-900">{preview.account.name}</span>
                        <span className="tw-text-[10px] tw-bg-slate-200 tw-text-slate-600 tw-px-2 tw-py-0.5 tw-rounded-md">{preview.account.platform}</span>
                      </div>
                      <div className="tw-flex tw-items-center tw-gap-1">
                        <button className="tw-p-1.5 tw-text-slate-400 hover:tw-text-brand-600 tw-transition-colors" type="button" title="对比原文">
                          <GitCompare size={14} />
                        </button>
                        <button className="tw-p-1.5 tw-text-slate-400 hover:tw-text-red-500 tw-transition-colors" type="button" onClick={() => toggleAccount(preview.account.id)} title="移除此账号">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <textarea className="tw-w-full tw-bg-white tw-border tw-border-slate-200 tw-rounded-xl tw-p-3 tw-text-sm tw-leading-relaxed tw-min-h-[120px] focus:tw-outline-none" value={preview.body} readOnly />
                  </div>
                ))}
                {!generationPreviews.length && (
                  <div className="tw-col-span-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-12 tw-border-2 tw-border-dashed tw-border-slate-200 tw-rounded-2xl tw-text-slate-400">
                    <Sparkles size={24} className="tw-mb-3 tw-text-slate-300" />
                    <span className="tw-text-sm tw-font-medium">选择账号后，这里会实时预览每个账号对应的发布稿。</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
