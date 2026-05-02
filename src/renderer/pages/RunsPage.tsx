import { useTranslation } from 'react-i18next';

export function RunsPage() {
  const { t } = useTranslation();

  return (
    <section className="panel">
      <h2>{t('runs.title')}</h2>
      <p className="muted">{t('runs.description')}</p>
    </section>
  );
}
