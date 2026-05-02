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
    <section className="content-hub">
      <div className="content-rail">
        <div className="hub-section-head">
          <span>已保存内容</span>
          <button className="icon-button compact" type="button" onClick={resetForm} title="新建内容" aria-label="新建内容">
            <Plus size={14} />
          </button>
        </div>
        <div className="source-list">
          {contents.map((content) => (
            <button
              className={content.id === editingId ? 'source-item active' : 'source-item'}
              key={content.id}
              onClick={() => editContent(content)}
              type="button"
            >
              <span>{content.title}</span>
              <code>{statusOptions.find((item) => item.value === content.status)?.label ?? content.status}</code>
            </button>
          ))}
          {!contents.length && <p className="muted compact-copy">还没有保存过内容。</p>}
        </div>
      </div>

      <form className="source-editor" onSubmit={saveContent}>
        <div className="hub-section-head">
          <span>先写原文</span>
          <div className="button-cluster">
            <select value={status} onChange={(event) => setStatus(event.target.value as ContentStatus)}>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              <Check size={15} />
              保存
            </button>
          </div>
        </div>
        <label>
          标题
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="editor-field">
          原文内容
          <textarea
            placeholder="把你想发布的内容先写在这里。比如一段产品更新、活动通知、周报总结，或者从别处粘贴过来的草稿。"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        {notice && <p className="info-text">{notice}</p>}
      </form>

      <section className="transformation-console">
        <div className="hub-section-head">
          <span>再生成不同账号的发布稿</span>
          <span className="engine-pill"><span className="status-dot processing" /> 预览中</span>
        </div>

        <div className="console-block">
          <h3>选择要发布到哪些账号</h3>
          <div className="target-grid">
            {accounts.map((account) => (
              <button
                className={selectedAccountIds.includes(account.id) ? 'target-account active' : 'target-account'}
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                type="button"
              >
                <span className={`status-dot ${account.status === 'active' ? 'online' : 'warning'}`} />
                <strong>{account.name}</strong>
                <code>{account.platform}</code>
              </button>
            ))}
            {!accounts.length && <p className="muted compact-copy">还没有添加账号。</p>}
          </div>
        </div>

        <div className="console-block">
          <h3>选择改写方式</h3>
          <div className="segmented-control">
            {writingStyles.map((style) => (
              <button
                className={style.id === styleId ? 'active' : ''}
                key={style.id}
                onClick={() => chooseStyle(style.id)}
                type="button"
              >
                {style.label}
              </button>
            ))}
          </div>
          <label>
            改写要求
            <textarea className="prompt-box" value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} />
          </label>
        </div>

        <div className="console-block preview-block">
          <div className="hub-section-head nested">
            <h3>各账号发布稿预览</h3>
            <button className="primary-button" disabled={!generationPreviews.length} type="button" onClick={pushToPublishQueue}>
              <Send size={15} />
              加入发布
            </button>
          </div>
          <div className="variant-grid">
            {generationPreviews.map((preview) => (
              <article className="variant-card" key={preview.account.id}>
                <header>
                  <span>{preview.account.name}</span>
                  <code>{preview.account.platform}</code>
                </header>
                <textarea value={preview.body} readOnly />
                <footer>
                  <button className="ghost-button" type="button">
                    <GitCompare size={14} />
                    对比原文
                  </button>
                  <button className="ghost-button danger" type="button" onClick={() => toggleAccount(preview.account.id)}>
                    <Trash2 size={14} />
                    移除
                  </button>
                </footer>
              </article>
            ))}
            {!generationPreviews.length && (
              <div className="empty-variants">
                <Sparkles size={22} />
                <span>选择账号后，这里会预览每个账号对应的发布稿。</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
