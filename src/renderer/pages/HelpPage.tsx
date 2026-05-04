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
    <div className="tw-space-y-8 tw-animate-fade-in tw-pb-20">
      {/* Header */}
      <div className="tw-flex tw-flex-col xl:tw-flex-row tw-items-start xl:tw-items-center tw-justify-between tw-gap-6 tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
            <div className="tw-w-2 tw-h-2 tw-bg-brand-500 tw-rounded-full" />
            <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.3em]">Documentation</span>
          </div>
          <h1 className="tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">{t('help.title')}</h1>
          <p className="tw-text-slate-500 tw-text-sm tw-mt-2 tw-font-medium">
            {t('help.description')}
          </p>
        </div>
      </div>

      {error && (
        <div className="tw-p-4 tw-bg-red-50 tw-border tw-border-red-100 tw-text-red-600 tw-rounded-2xl tw-text-sm tw-font-bold">
          {error}
        </div>
      )}

      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6">
        <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-p-8 tw-shadow-sm">
          <h3 className="tw-text-lg tw-font-black tw-text-slate-900 tw-mb-6">{t('help.usageTitle')}</h3>
          <div className="tw-text-sm tw-text-slate-600 tw-leading-relaxed tw-whitespace-pre-wrap tw-font-mono tw-bg-slate-50 tw-p-4 tw-rounded-xl tw-max-h-[60vh] tw-overflow-y-auto">
            {docs?.userGuide ?? t('help.loading')}
          </div>
        </div>
        
        <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-p-8 tw-shadow-sm">
          <h3 className="tw-text-lg tw-font-black tw-text-slate-900 tw-mb-6">{t('help.updateTitle')}</h3>
          <div className="tw-text-sm tw-text-slate-600 tw-leading-relaxed tw-whitespace-pre-wrap tw-font-mono tw-bg-slate-50 tw-p-4 tw-rounded-xl tw-max-h-[60vh] tw-overflow-y-auto">
            {docs?.updateGuide ?? t('help.loading')}
          </div>
        </div>
        
        <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-p-8 tw-shadow-sm">
          <h3 className="tw-text-lg tw-font-black tw-text-slate-900 tw-mb-6">{t('help.releaseTitle')}</h3>
          <div className="tw-text-sm tw-text-slate-600 tw-leading-relaxed tw-whitespace-pre-wrap tw-font-mono tw-bg-slate-50 tw-p-4 tw-rounded-xl tw-max-h-[60vh] tw-overflow-y-auto">
            {docs?.releaseNotes ?? t('help.loading')}
          </div>
        </div>
      </div>
    </div>
  );
}
