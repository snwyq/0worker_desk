import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account, ContentItem, DistributionTask, PlatformCode, Post, PostStatus, PublishRun } from '../../shared/types';
import { appApi } from '../api';

const taskFilters: Array<{ id: 'all' | PostStatus; translationKey: string }> = [
  { id: 'all', translationKey: 'queue.filters.all' },
  { id: 'queued', translationKey: 'common.statuses.queued' },
  { id: 'failed', translationKey: 'common.statuses.failed' },
  { id: 'needs_manual_action', translationKey: 'common.statuses.needs_manual_action' },
  { id: 'published', translationKey: 'common.statuses.published' },
];

export function QueuePage() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tasks, setTasks] = useState<DistributionTask[]>([]);
  const [contentId, setContentId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [content, setContent] = useState('');
  const [mediaPaths, setMediaPaths] = useState('');
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');
  const [attemptMessage, setAttemptMessage] = useState('');
  const [showPublished, setShowPublished] = useState(false);
  const [filter, setFilter] = useState<'all' | PostStatus>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformCode>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [taskRuns, setTaskRuns] = useState<Record<number, PublishRun[]>>({});
  const [busyPost, setBusyPost] = useState<{ id: number; action: 'draft' | 'publish' } | null>(null);

  async function load() {
    const [nextAccounts, nextPosts, nextContents, nextTasks] = await Promise.all([
      appApi.accounts.list(),
      appApi.posts.list(),
      appApi.contents.list(),
      appApi.distributionTasks.list(),
    ]);
    setAccounts(nextAccounts);
    setPosts(nextPosts);
    setContents(nextContents);
    setTasks(nextTasks);
    setSelectedTaskIds((current) => current.filter((id) => nextTasks.some((task) => task.id === id)));
    if (!accountId && nextAccounts[0]) {
      setAccountId(String(nextAccounts[0].id));
    }
  }

  function chooseContent(nextContentId: string) {
    setContentId(nextContentId);
    const selected = contents.find((item) => String(item.id) === nextContentId);
    if (selected) {
      setContent(selected.body);
    }
  }

  function editTask(task: DistributionTask) {
    setEditingTaskId(task.id);
    setAccountId(String(task.accountId));
    setScheduledAt(task.scheduledAt.slice(0, 16));
    const body = String(task.platformPayload.content ?? contents.find((item) => item.id === task.contentId)?.body ?? '');
    setContent(body);
    setContentId(String(task.contentId));
    setMediaPaths(Array.isArray(task.platformPayload.mediaPaths) ? task.platformPayload.mediaPaths.join('\n') : '');
  }

  function resetForm() {
    setEditingTaskId(null);
    setContentId('');
    setContent('');
    setMediaPaths('');
    setScheduledAt(new Date().toISOString().slice(0, 16));
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
      const nextMediaPaths = mediaPaths.split('\n').map((path) => path.trim()).filter(Boolean);
      if (editingTaskId) {
        await appApi.distributionTasks.update(editingTaskId, {
          contentId: contentId ? Number(contentId) : undefined,
          accountId: Number(accountId),
          scheduledAt: new Date(scheduledAt).toISOString(),
          status: 'queued',
          platformPayload: {
            content,
            mediaPaths: nextMediaPaths,
          },
        });
      } else {
        await appApi.posts.create({
          accountId: Number(accountId),
          content,
          mediaPaths: nextMediaPaths,
          scheduledAt: new Date(scheduledAt).toISOString(),
          status: 'queued',
        });
      }

      resetForm();
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

  async function retryTask(task: DistributionTask) {
    setError('');
    try {
      await appApi.distributionTasks.retry(task.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function cancelTask(task: DistributionTask) {
    setError('');
    try {
      await appApi.distributionTasks.cancel(task.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function retrySelectedTasks() {
    setError('');
    try {
      await appApi.distributionTasks.retryMany(selectedTaskIds);
      setSelectedTaskIds([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function cancelSelectedTasks() {
    setError('');
    try {
      await appApi.distributionTasks.cancelMany(selectedTaskIds);
      setSelectedTaskIds([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function toggleTaskDetails(task: DistributionTask) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      return;
    }

    setExpandedTaskId(task.id);
    if (!taskRuns[task.id]) {
      const runs = await appApi.publishRuns.list(task.id);
      setTaskRuns((current) => ({ ...current, [task.id]: runs.slice(0, 5) }));
    }
  }

  function toggleTaskSelection(taskId: number) {
    setSelectedTaskIds((current) => current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId]);
  }

  const postsById = new Map(posts.map((post) => [post.id, post]));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const platformOptions = Array.from(new Set(accounts.map((account) => account.platform)));
  const visibleTasks = tasks.filter((task) => {
    if (!showPublished && task.status === 'published') {
      return false;
    }
    if (filter !== 'all' && task.status !== filter) {
      return false;
    }
    if (platformFilter !== 'all' && task.platform !== platformFilter) {
      return false;
    }
    if (accountFilter !== 'all' && task.accountId !== Number(accountFilter)) {
      return false;
    }
    return true;
  });

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('queue.title')}</h2>
          <p className="muted">{t('queue.description')}</p>
        </div>
        <div className="filter-row">
          <select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | PostStatus)}>
            {taskFilters.map((item) => (
              <option key={item.id} value={item.id}>
                {t(item.translationKey)}
              </option>
            ))}
          </select>
          <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as 'all' | PlatformCode)}>
            <option value="all">{t('queue.filters.allPlatforms')}</option>
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
            <option value="all">{t('queue.filters.allAccounts')}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setShowPublished((value) => !value)}>
            {showPublished ? t('queue.hidePublished') : t('queue.showPublished')}
          </button>
          <button type="button" onClick={resetForm}>
            {t('queue.newTask')}
          </button>
        </div>
      </div>
      {selectedTaskIds.length > 0 && (
        <div className="selection-bar">
          <span>{t('queue.selected', { count: selectedTaskIds.length })}</span>
          <button type="button" className="inline-button" onClick={() => void retrySelectedTasks()}>
            {t('queue.retrySelected')}
          </button>
          <button type="button" className="inline-button danger" onClick={() => void cancelSelectedTasks()}>
            {t('queue.cancelSelected')}
          </button>
        </div>
      )}

      <form className="form-grid" onSubmit={createPost}>
        {editingTaskId && (
          <div className="form-banner wide">
            <span>{t('queue.editingTask', { id: editingTaskId })}</span>
            <button type="button" className="inline-button" onClick={resetForm}>
              {t('queue.cancelEditing')}
            </button>
          </div>
        )}
        <label>
          {t('queue.contentLibrary')}
          <select value={contentId} onChange={(event) => chooseContent(event.target.value)}>
            <option value="">{t('queue.manualContent')}</option>
            {contents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
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
          {editingTaskId ? t('queue.saveTask') : t('queue.createPost')}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {attemptMessage && <p className="info-text">{attemptMessage}</p>}

      <div className="table">
        <div className="table-row table-head queue">
          <span>{t('queue.select')}</span>
          <span>{t('common.account')}</span>
          <span>{t('queue.platform')}</span>
          <span>{t('common.status')}</span>
          <span>{t('queue.scheduled')}</span>
          <span>{t('queue.content')}</span>
          <span>{t('common.action')}</span>
        </div>
        {visibleTasks.map((task) => {
          const post = task.legacyPostId ? postsById.get(task.legacyPostId) : null;
          const account = accountsById.get(task.accountId);
          const taskContent = String(task.platformPayload.content ?? contents.find((item) => item.id === task.contentId)?.body ?? '');
          const canUseLegacyPublish = task.platform === 'weibo' && Boolean(post);

          return (
            <Fragment key={task.id}>
              <div className="table-row queue">
                <span>
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task.id)}
                    onChange={() => toggleTaskSelection(task.id)}
                  />
                </span>
                <span>{account?.name ?? task.accountId}</span>
                <span>{task.platform}</span>
                <span className={`badge ${task.status}`}>{t(`common.statuses.${task.status}`)}</span>
                <span>{new Date(task.scheduledAt).toLocaleString()}</span>
                <span className="truncate" title={taskContent}>{taskContent}</span>
                <span>
                  <button
                    className="inline-button"
                    disabled={Boolean(busyPost) || !canUseLegacyPublish}
                    type="button"
                    onClick={() => post && void attemptPublish(post)}
                  >
                    {busyPost?.id === post?.id && busyPost?.action === 'draft' ? t('queue.drafting') : t('queue.draft')}
                  </button>
                  <button
                    className="inline-button danger"
                    disabled={Boolean(busyPost) || !canUseLegacyPublish}
                    type="button"
                    onClick={() => post && void publishNow(post)}
                  >
                    {busyPost?.id === post?.id && busyPost?.action === 'publish' ? t('queue.publishingButton') : t('queue.publishNow')}
                  </button>
                  <button className="inline-button danger" disabled={Boolean(busyPost) || !post} type="button" onClick={() => post && void deletePost(post)}>
                    {t('queue.delete')}
                  </button>
                  <button className="inline-button" type="button" onClick={() => editTask(task)}>
                    {t('queue.edit')}
                  </button>
                  <button className="inline-button" type="button" onClick={() => void toggleTaskDetails(task)}>
                    {expandedTaskId === task.id ? t('queue.hideDetails') : t('queue.details')}
                  </button>
                  <button className="inline-button" type="button" onClick={() => void retryTask(task)}>
                    {t('queue.retry')}
                  </button>
                  <button className="inline-button danger" type="button" onClick={() => void cancelTask(task)}>
                    {t('queue.cancel')}
                  </button>
                </span>
              </div>
              {task.lastError && (
                <div className="task-error-row">
                  <strong>{t('queue.failureReason')}</strong>
                  <span>{task.lastError}</span>
                </div>
              )}
              {expandedTaskId === task.id && (
                <div className="task-detail-row">
                  <div>
                    <strong>{t('queue.taskDetail')}</strong>
                    <span>{t('queue.taskIdentity', { id: task.id, contentId: task.contentId })}</span>
                  </div>
                  <div className="run-mini-list">
                    {(taskRuns[task.id] ?? []).length ? taskRuns[task.id].map((run) => (
                      <article key={run.id}>
                        <span className={`badge ${run.status}`}>{t(`common.statuses.${run.status}`)}</span>
                        <span>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}</span>
                        <span className="truncate" title={run.message}>{run.message || '-'}</span>
                        {run.screenshotPath && <code>{run.screenshotPath}</code>}
                      </article>
                    )) : <span className="muted">{t('queue.noRuns')}</span>}
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
