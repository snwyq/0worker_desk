import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  ExternalLink,
  Globe,
  RefreshCw,
  Search,
  Wand2,
} from 'lucide-react';
import { appApi } from '../api';
import { AGENT_DRAFT_STORAGE_KEY, buildAgentDraftFromHotTopic } from '../../shared/agentDraft';

type HotTopic = Record<string, any> & {
  createdAt?: string;
  platform?: string;
  title?: string;
  desc?: string;
  description?: string;
  url?: string;
  mobilUrl?: string;
  mobileUrl?: string;
  rank?: number | string;
  hotValue?: string | number;
  hot_value?: string | number;
  heat?: string | number;
  author?: string;
  thumbnail?: string;
  extra?: string;
};

type HotTopicsPageProps = {
  onOpenAgent?: () => void;
};

type TopicColumn = {
  key: string;
  label: string;
  group: 'core' | 'api' | 'link' | 'mirror';
  width?: string;
};

function readTopicValue(topic: HotTopic, key: string) {
  if (key === 'createdAt') return topic.createdAt;
  if (key === 'desc') return topic.desc ?? topic.description;
  if (key === 'hotValue') return topic.hotValue ?? topic.heat;
  return topic[key];
}

function getPlatformStyle(platform: string | undefined) {
  const value = platform?.toLowerCase() ?? '';
  if (value.includes('寰崥') || value.includes('weibo')) return 'tw-bg-red-50 tw-text-red-500 tw-border-red-100';
  if (value.includes('鐭ヤ箮') || value.includes('zhihu')) return 'tw-bg-blue-50 tw-text-blue-500 tw-border-blue-100';
  if (value.includes('鐧惧害') || value.includes('baidu')) return 'tw-bg-blue-50 tw-text-blue-600 tw-border-blue-100';
  if (value.includes('澶存潯') || value.includes('toutiao')) return 'tw-bg-orange-50 tw-text-orange-600 tw-border-orange-100';
  return 'tw-bg-slate-100 tw-text-slate-600 tw-border-slate-200';
}

function getColumnStyle(group: TopicColumn['group']) {
  if (group === 'core') return 'tw-text-slate-900 tw-bg-slate-100/60';
  if (group === 'api') return 'tw-text-blue-500 tw-bg-blue-50/40';
  if (group === 'link') return 'tw-text-green-600 tw-bg-green-50/30';
  return 'tw-text-slate-400 tw-bg-slate-50';
}

function formatTopicPreview(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

export function HotTopicsPage({ onOpenAgent }: HotTopicsPageProps) {
  const { t } = useTranslation();
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [lastInsertedCount, setLastInsertedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const mirrorColumns: TopicColumn[] = useMemo(() => ([
    { key: 'platform', label: t('hotTopics.columns.platform'), group: 'core', width: '120px' },
    { key: 'createdAt', label: t('hotTopics.columns.createdAt'), group: 'api', width: '190px' },
    { key: 'title', label: t('hotTopics.columns.title'), group: 'core', width: '360px' },
    { key: 'rank', label: t('hotTopics.columns.rank'), group: 'api', width: '90px' },
    { key: 'hotValue', label: t('hotTopics.columns.hotValue'), group: 'api', width: '130px' },
    { key: 'hot_value', label: t('hotTopics.columns.hotValueRaw'), group: 'api', width: '140px' },
    { key: 'author', label: t('hotTopics.columns.author'), group: 'api', width: '150px' },
    { key: 'desc', label: t('hotTopics.columns.desc'), group: 'mirror', width: '380px' },
    { key: 'mobilUrl', label: t('hotTopics.columns.mobileUrl'), group: 'link', width: '150px' },
    { key: 'thumbnail', label: t('hotTopics.columns.thumbnail'), group: 'mirror', width: '180px' },
    { key: 'extra', label: t('hotTopics.columns.extra'), group: 'mirror', width: '180px' },
  ]), [t]);

  function buildSourceStatusMessage(sourceStatus?: Array<{ platform: string; ok: boolean; reason?: string; count?: number }>) {
    if (!sourceStatus || sourceStatus.length === 0) return '';
    const failed = sourceStatus.filter((item) => !item.ok);
    if (failed.length === 0) return '';
    return failed.map((item) => `${item.platform}: ${item.reason || 'unknown error'}`).join(' | ');
  }

  async function loadHotTopics(force = false) {
    setLoading(true);
    setError('');
    try {
      const response = await appApi.ai.listHotTopics(force);
      setHotTopics(response.items || []);
      setLastFetchTime(response.lastFetchTime || new Date().toISOString());
      setLastInsertedCount(Number(response.insertedCount ?? 0));
      const sourceError = buildSourceStatusMessage(response.sourceStatus);
      if (force && sourceError) {
        setError(t('hotTopics.partialFailure', { details: sourceError }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  async function deleteAndForceReload() {
    const confirmed = window.confirm(t('hotTopics.deleteAndSyncConfirm'));
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const deleted = await appApi.ai.deleteAllHotTopics();
      const response = await appApi.ai.listHotTopics(true);
      setHotTopics(response.items || []);
      setLastFetchTime(response.lastFetchTime || new Date().toISOString());
      setLastInsertedCount(Number(response.insertedCount ?? 0));

      const failedPlatforms = buildSourceStatusMessage(response.sourceStatus);
      const summary = t('hotTopics.resetSummary', {
        deleted: deleted.deleted,
        inserted: response.insertedCount ?? response.items?.length ?? 0,
      });
      setError(
        failedPlatforms
          ? t('hotTopics.resetSummaryWithFailure', { summary, details: failedPlatforms })
          : summary,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHotTopics(false);
  }, []);

  const platforms = useMemo(() => (
    Array.from(new Set(hotTopics.map((topic) => topic.platform).filter(Boolean))) as string[]
  ), [hotTopics]);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return hotTopics.filter((topic) => {
      const matchesFilter = filter === 'all' || topic.platform === filter;
      if (!query) return matchesFilter;
      return matchesFilter && JSON.stringify(topic).toLowerCase().includes(query);
    });
  }, [filter, hotTopics, searchQuery]);

  const cooldownMs = 6 * 60 * 60 * 1000;
  const remainingCooldownMs = lastFetchTime
    ? Math.max(cooldownMs - (new Date().getTime() - new Date(lastFetchTime).getTime()), 0)
    : 0;
  const isCoolingDown = Boolean(lastFetchTime && remainingCooldownMs > 0);
  const cooldownHours = Math.floor(remainingCooldownMs / (60 * 60 * 1000));
  const cooldownMinutes = Math.ceil((remainingCooldownMs % (60 * 60 * 1000)) / (60 * 1000));

  function useTopicForAgent(topic: HotTopic) {
    const draft = buildAgentDraftFromHotTopic({
      platform: topic.platform,
      title: topic.title,
      desc: topic.desc ?? topic.description,
      url: topic.url,
      mobileUrl: topic.mobilUrl ?? topic.mobileUrl,
      rank: topic.rank,
      hotValue: topic.hotValue ?? topic.hot_value ?? topic.heat,
    });
    window.localStorage.setItem(AGENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    onOpenAgent?.();
  }

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in tw-relative">
      <div className="tw-mb-4 tw-flex tw-items-center tw-gap-3">
        <div className="tw-p-3 tw-bg-slate-900 tw-text-white tw-rounded-2xl">
          <Globe size={22} />
        </div>
        <div>
          <h1 className="tw-text-2xl md:tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">
            {t('hotTopics.title')}
          </h1>
          {lastFetchTime && (
            <div className="tw-mt-1 tw-text-sm tw-text-slate-500">
              {t('hotTopics.lastSynced')}：{new Date(lastFetchTime).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-5 tw-py-4 tw-text-sm tw-font-bold tw-text-slate-700">
          {error}
        </div>
      )}

      <div className="tw-mb-4 tw-bg-white tw-border tw-border-slate-200 tw-rounded-[1.25rem] tw-shadow-sm tw-p-4 md:tw-p-5">
        <div className="tw-flex tw-flex-col tw-gap-4">
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-6 tw-gap-y-2 tw-text-sm">
            <div className="tw-text-slate-600">
              <span className="tw-font-bold tw-text-slate-500">{t('hotTopics.currentCount')}：</span>
              <span className="tw-font-black tw-text-slate-900">{filteredTopics.length}</span>
            </div>
            <div className="tw-text-slate-600">
              <span className="tw-font-bold tw-text-slate-500">{t('hotTopics.lastAdded')}：</span>
              <span className="tw-font-black tw-text-slate-900">{lastInsertedCount}</span>
            </div>
          </div>

          <div className="tw-flex tw-flex-col xl:tw-flex-row xl:tw-items-center tw-gap-3">
            <div className="tw-relative tw-flex-1">
              <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={18} />
              <input
                type="text"
                placeholder={t('hotTopics.searchPlaceholder')}
                className="tw-w-full tw-pl-12 tw-pr-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-200 focus:tw-bg-white focus:tw-border-slate-300 tw-rounded-xl tw-text-sm md:tw-text-base tw-font-medium tw-outline-none tw-transition-all"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-rounded-xl tw-transition-all ${
                  filter === 'all' ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-slate-100 tw-text-slate-600 hover:tw-bg-slate-200'
                }`}
                type="button"
              >
                {t('hotTopics.allData')}
              </button>
              {platforms.map((platform) => (
                <button
                  key={platform}
                  onClick={() => setFilter(platform)}
                  className={`tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-rounded-xl tw-transition-all ${
                    filter === platform ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-slate-100 tw-text-slate-600 hover:tw-bg-slate-200'
                  }`}
                  type="button"
                >
                  {platform}
                </button>
              ))}
            </div>

            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 xl:tw-ml-auto">
              {loading ? (
                <span className="tw-text-sm tw-font-bold tw-text-blue-600">{t('hotTopics.syncing')}</span>
              ) : isCoolingDown ? (
                <span className="tw-text-sm tw-font-bold tw-text-orange-500">
                  {t('hotTopics.cooldownActive', { hours: cooldownHours, minutes: Math.max(cooldownMinutes, 1) })}
                </span>
              ) : (
                <span className="tw-text-sm tw-font-bold tw-text-emerald-600">{t('hotTopics.refreshReady')}</span>
              )}
              <button
                onClick={() => void loadHotTopics(true)}
                disabled={loading || isCoolingDown}
                className={`tw-px-5 tw-py-3 tw-text-sm tw-font-bold tw-rounded-xl tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-all ${
                  loading || isCoolingDown
                    ? 'tw-bg-slate-300 tw-text-white tw-cursor-not-allowed'
                    : 'tw-bg-slate-900 tw-text-white hover:tw-bg-black'
                }`}
                type="button"
              >
                <RefreshCw size={16} className={loading ? 'tw-animate-spin' : ''} />
                {loading ? t('hotTopics.syncing') : t('hotTopics.syncNow')}
              </button>
              <button
                onClick={() => void deleteAndForceReload()}
                disabled={loading}
                className={`tw-px-5 tw-py-3 tw-text-sm tw-font-bold tw-rounded-xl tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-transition-all ${
                  loading
                    ? 'tw-bg-slate-200 tw-text-slate-400 tw-cursor-not-allowed'
                    : 'tw-bg-red-50 tw-text-red-600 tw-border tw-border-red-100 hover:tw-bg-red-100'
                }`}
                type="button"
                title={t('hotTopics.deleteAndSyncTitle')}
              >
                <Trash2 size={16} />
                {t('hotTopics.deleteAndSync')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="tw-bg-white tw-border tw-border-slate-200/60 tw-rounded-[1.5rem] tw-overflow-hidden tw-shadow-2xl tw-shadow-slate-200/50 tw-flex tw-flex-col">
        <div className="tw-overflow-auto tw-max-h-[calc(100vh-320px)] tw-scrollbar-thin">
          <table className="tw-w-full tw-text-left tw-border-collapse tw-min-w-[2300px] tw-table-fixed">
            <thead className="tw-sticky tw-top-0 tw-z-20">
              <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-100">
                <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-400 tw-uppercase tw-w-[72px] tw-sticky tw-left-0 tw-bg-slate-50 tw-z-30 tw-text-center">IDX</th>
                <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[180px] tw-bg-slate-100/70">{t('hotTopics.actions')}</th>
                {mirrorColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-uppercase tw-tracking-wider ${getColumnStyle(column.group)}`}
                    style={{ width: column.width }}
                  >
                    <div className="tw-flex tw-items-center tw-gap-1.5">
                      {column.group === 'mirror' && <div className="tw-w-1 tw-h-1 tw-bg-slate-300 tw-rounded-full" />}
                      {column.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tw-divide-y tw-divide-slate-50">
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic, index) => (
                  <tr key={`${topic.platform ?? 'topic'}-${topic.title ?? index}-${index}`} className="tw-group tw-even:tw-bg-slate-50/40 hover:tw-bg-blue-50/30 tw-transition-all">
                    <td className="tw-px-4 tw-py-4 tw-text-xs tw-text-slate-400 tw-font-mono tw-sticky tw-left-0 tw-bg-inherit tw-z-10 tw-border-r tw-border-slate-100 group-hover:tw-bg-blue-50/50 tw-text-center">
                      {String(index + 1).padStart(3, '0')}
                    </td>
                    <td className="tw-px-4 tw-py-4 tw-whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => useTopicForAgent(topic)}
                        className="tw-inline-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-slate-900 tw-text-white tw-rounded-xl tw-text-sm tw-font-bold tw-whitespace-nowrap hover:tw-bg-brand-600 tw-transition-all"
                        title={t('hotTopics.generateTitle')}
                      >
                        <Wand2 size={14} />
                        {t('hotTopics.generate')}
                      </button>
                    </td>
                    {mirrorColumns.map((column) => {
                      const value = readTopicValue(topic, column.key);
                      const isEmpty = value === null || value === undefined || value === '';

                      return (
                        <td key={column.key} className="tw-px-4 tw-py-4">
                          {column.key === 'platform' ? (
                            <span className={`tw-px-3 tw-py-1 tw-rounded-lg tw-text-xs tw-font-bold tw-border ${getPlatformStyle(String(value || ''))}`}>
                              {isEmpty ? t('hotTopics.unknownPlatform') : String(value)}
                            </span>
                          ) : column.key === 'title' ? (
                            topic.url ? (
                              <a
                                href={String(topic.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-slate-900 tw-font-bold hover:tw-text-blue-600 tw-transition-colors tw-max-w-full"
                                title={String(value || '')}
                              >
                                <span className="tw-truncate tw-max-w-full">{isEmpty ? t('hotTopics.unnamedTopic') : String(value)}</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <div className="tw-text-sm tw-text-slate-900 tw-font-bold tw-truncate tw-max-w-full" title={String(value || '')}>
                                {isEmpty ? t('hotTopics.unnamedTopic') : String(value)}
                              </div>
                            )
                          ) : column.key === 'createdAt' ? (
                            <div className={`tw-text-sm tw-font-medium ${isEmpty ? 'tw-text-slate-200' : 'tw-text-slate-500'}`} title={String(value || '')}>
                              {isEmpty ? '-' : new Date(String(value)).toLocaleString()}
                            </div>
                          ) : column.group === 'link' && !isEmpty ? (
                            <a
                              href={String(value)}
                              target="_blank"
                              rel="noreferrer"
                              className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-blue-500 hover:tw-text-blue-700 tw-text-sm tw-font-bold tw-transition-colors"
                            >
                              {t('hotTopics.openResource')} <ExternalLink size={12} />
                            </a>
                          ) : (
                            <div
                              className={`tw-text-sm tw-font-medium tw-leading-6 tw-line-clamp-2 ${isEmpty ? 'tw-text-slate-200' : 'tw-text-slate-500'}`}
                              title={String(value || '')}
                            >
                              {formatTopicPreview(value)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={mirrorColumns.length + 2} className="tw-px-8 tw-py-24 tw-text-center">
                    <div className="tw-flex tw-flex-col tw-items-center tw-gap-3">
                      <div className="tw-w-14 tw-h-14 tw-bg-slate-50 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-slate-200">
                        <Search size={26} />
                      </div>
                      <div className="tw-text-slate-300 tw-text-sm tw-font-bold">{t('hotTopics.emptyState')}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
