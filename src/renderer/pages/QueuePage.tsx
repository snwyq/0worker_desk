import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account, Post } from '../../shared/types';
import { appApi } from '../api';

export function QueuePage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [accountId, setAccountId] = useState('');
  const [content, setContent] = useState('');
  const [mediaPaths, setMediaPaths] = useState('');
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');
  const [attemptMessage, setAttemptMessage] = useState('');
  const [showPublished, setShowPublished] = useState(false);
  const [busyPost, setBusyPost] = useState<{ id: number; action: 'draft' | 'publish' } | null>(null);

  async function load() {
    const [nextAccounts, nextPosts] = await Promise.all([
      appApi.accounts.list(),
      appApi.posts.list(),
    ]);
    setAccounts(nextAccounts);
    setPosts(nextPosts);
    if (!accountId && nextAccounts[0]) {
      setAccountId(String(nextAccounts[0].id));
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [accountId]);

  async function createPost(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      await appApi.posts.create({
        accountId: Number(accountId),
        content,
        mediaPaths: mediaPaths.split('\n').map((path) => path.trim()).filter(Boolean),
        scheduledAt: new Date(scheduledAt).toISOString(),
        status: 'queued',
      });

      setContent('');
      setMediaPaths('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function selectMediaFiles() {
    setError('');
    try {
      const paths = await appApi.media.selectFiles();
      if (!paths.length) {
        return;
      }

      setMediaPaths((current) => {
        const existing = current.split('\n').map((path) => path.trim()).filter(Boolean);
        return [...existing, ...paths].join('\n');
      });
    } catch (cause) {
      setError(t('queue.filePickerFailed', { message: cause instanceof Error ? cause.message : String(cause) }));
    }
  }

  async function attemptPublish(post: Post) {
    setError('');
    setAttemptMessage(t('queue.attempting', { id: post.id }));
    setBusyPost({ id: post.id, action: 'draft' });

    try {
      const result = await appApi.posts.attemptPublish(post.id);
      setAttemptMessage(
        result.ok ? t('queue.published', { message: result.message }) : t('queue.attemptFinished', { message: result.message }),
      );
      await load();
    } catch (cause) {
      setAttemptMessage('');
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyPost(null);
    }
  }

  async function publishNow(post: Post) {
    setError('');
    setAttemptMessage(t('queue.publishing', { id: post.id }));
    setBusyPost({ id: post.id, action: 'publish' });

    try {
      const result = await appApi.posts.publishNow(post.id);
      setAttemptMessage(
        result.ok ? t('queue.published', { message: result.message }) : t('queue.publishFailed', { message: result.message }),
      );
      await load();
    } catch (cause) {
      setAttemptMessage('');
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusyPost(null);
    }
  }

  async function deletePost(post: Post) {
    if (!window.confirm(t('queue.deleteConfirm'))) {
      return;
    }

    setError('');
    try {
      const result = await appApi.posts.delete(post.id);
      if (!result.ok) {
        throw new Error(result.message);
      }
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setAttemptMessage('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const visiblePosts = showPublished ? posts : posts.filter((post) => post.status !== 'published');

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('queue.title')}</h2>
          <p className="muted">{t('queue.description')}</p>
        </div>
        <button type="button" onClick={() => setShowPublished((value) => !value)}>
          {showPublished ? t('queue.hidePublished') : t('queue.showPublished')}
        </button>
      </div>

      <form className="form-grid" onSubmit={createPost}>
        <label>
          {t('common.account')}
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('queue.scheduledTime')}
          <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
        </label>
        <label className="wide">
          {t('queue.content')}
          <textarea value={content} onChange={(event) => setContent(event.target.value)} required rows={4} />
        </label>
        <label className="wide">
          {t('queue.mediaPaths')}
          <textarea value={mediaPaths} onChange={(event) => setMediaPaths(event.target.value)} rows={3} />
        </label>
        <button className="secondary-form-button" type="button" onClick={() => void selectMediaFiles()}>
          {t('queue.selectMedia')}
        </button>
        <button type="submit" disabled={!accounts.length}>
          {t('queue.createPost')}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {attemptMessage && <p className="info-text">{attemptMessage}</p>}

      <div className="table">
        <div className="table-row table-head queue">
          <span>{t('common.account')}</span>
          <span>{t('common.status')}</span>
          <span>{t('queue.scheduled')}</span>
          <span>{t('queue.content')}</span>
          <span>{t('common.action')}</span>
        </div>
        {visiblePosts.map((post) => (
            <div className="table-row queue" key={post.id}>
            <span>{accounts.find((account) => account.id === post.accountId)?.name ?? post.accountId}</span>
            <span className={`badge ${post.status}`}>{t(`common.statuses.${post.status}`)}</span>
            <span>{new Date(post.scheduledAt).toLocaleString()}</span>
            <span className="truncate" title={post.content}>{post.content}</span>
            <span>
              <button
                className="inline-button"
                disabled={Boolean(busyPost)}
                type="button"
                onClick={() => void attemptPublish(post)}
              >
                {busyPost?.id === post.id && busyPost.action === 'draft' ? t('queue.drafting') : t('queue.draft')}
              </button>
              <button
                className="inline-button danger"
                disabled={Boolean(busyPost)}
                type="button"
                onClick={() => void publishNow(post)}
              >
                {busyPost?.id === post.id && busyPost.action === 'publish' ? t('queue.publishingButton') : t('queue.publishNow')}
              </button>
              <button className="inline-button danger" disabled={Boolean(busyPost)} type="button" onClick={() => void deletePost(post)}>
                {t('queue.delete')}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
