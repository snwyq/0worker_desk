import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { appApi } from '../api';

interface HelpDocsState {
  userGuide: string;
  updateGuide: string;
  releaseNotes: string;
}

export function HelpPage() {
  const { t } = useTranslation();
  const [docs, setDocs] = useState<HelpDocsState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setDocs(await appApi.helpDocs.get());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    void load();
  }, []);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t('help.title')}</h2>
          <p className="muted">{t('help.description')}</p>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="guide-grid docs-grid">
        <article>
          <h3>{t('help.usageTitle')}</h3>
          <pre className="doc-text">{docs?.userGuide ?? t('help.loading')}</pre>
        </article>
        <article>
          <h3>{t('help.updateTitle')}</h3>
          <pre className="doc-text">{docs?.updateGuide ?? t('help.loading')}</pre>
        </article>
        <article>
          <h3>{t('help.releaseTitle')}</h3>
          <pre className="doc-text">{docs?.releaseNotes ?? t('help.loading')}</pre>
        </article>
      </div>
    </section>
  );
}
