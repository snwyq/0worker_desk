import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ContentItem, ContentStatus } from '../../shared/types';
import { appApi } from '../api';

export function ContentPage() {
  const { t } = useTranslation();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [error, setError] = useState('');

  async function load() {
    setContents(await appApi.contents.list());
  }

  useEffect(() => {
    void load();
  }, []);

  function editContent(content: ContentItem) {
    setEditingId(content.id);
    setTitle(content.title);
    setBody(content.body);
    setStatus(content.status);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setBody('');
    setStatus('draft');
  }

  async function saveContent(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    try {
      if (editingId) {
        await appApi.contents.update(editingId, { title, body, status });
      } else {
        await appApi.contents.create({ title, body, source: 'manual', status });
      }
      resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function deleteContent(content: ContentItem) {
    if (!window.confirm(t('content.deleteConfirm'))) {
      return;
    }

    setError('');
    try {
      const result = await appApi.contents.delete(content.id);
      if (!result.ok) {
        throw new Error(t('content.deleteFailed'));
      }
      if (editingId === content.id) {
        resetForm();
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('content.title')}</h2>
          <p className="muted">{t('content.description')}</p>
        </div>
        <button type="button" onClick={resetForm}>
          {t('content.newContent')}
        </button>
      </div>
      <form className="form-grid" onSubmit={saveContent}>
        <label>
          {t('content.contentTitle')}
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          {t('common.status')}
          <select value={status} onChange={(event) => setStatus(event.target.value as ContentStatus)}>
            <option value="draft">{t('content.statuses.draft')}</option>
            <option value="ready">{t('content.statuses.ready')}</option>
            <option value="archived">{t('content.statuses.archived')}</option>
          </select>
        </label>
        <label className="wide">
          {t('content.body')}
          <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={6} />
        </label>
        <button type="submit">{editingId ? t('content.saveChanges') : t('content.create')}</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <div className="table">
        <div className="table-row content table-head">
          <span>{t('content.contentTitle')}</span>
          <span>{t('common.status')}</span>
          <span>{t('content.updatedAt')}</span>
          <span>{t('common.action')}</span>
        </div>
        {contents.map((content) => (
          <div className="table-row content" key={content.id}>
            <span className="truncate" title={content.body}>{content.title}</span>
            <span className={`badge ${content.status}`}>{t(`content.statuses.${content.status}`)}</span>
            <span>{new Date(content.updatedAt).toLocaleString()}</span>
            <span>
              <button className="inline-button" type="button" onClick={() => editContent(content)}>
                {t('content.edit')}
              </button>
              <button className="inline-button danger" type="button" onClick={() => void deleteContent(content)}>
                {t('content.delete')}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
