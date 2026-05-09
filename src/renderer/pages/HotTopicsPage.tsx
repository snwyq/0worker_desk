import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  ExternalLink,
  Globe,
  RefreshCw,
  Search,
  Wand2,
  Hash,
  Clock,
  AlertCircle,
  LayoutGrid,
} from 'lucide-react';
import { appApi } from '../api';


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

type HotTopicsPageProps = {};

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
  if (value.includes('微博') || value.includes('weibo')) return 'tw-text-red-500 tw-bg-red-50/50';
  if (value.includes('知乎') || value.includes('zhihu')) return 'tw-text-blue-500 tw-bg-blue-50/50';
  if (value.includes('百度') || value.includes('baidu')) return 'tw-text-blue-600 tw-bg-blue-50/50';
  if (value.includes('头条') || value.includes('toutiao')) return 'tw-text-orange-600 tw-bg-orange-50/50';
  return 'tw-text-slate-500 tw-bg-slate-50';
}

function formatTopicPreview(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

export function HotTopicsPage({}: HotTopicsPageProps) {
  const { t } = useTranslation();
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [lastInsertedCount, setLastInsertedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const mirrorColumns: TopicColumn[] = useMemo(() => ([
    { key: 'platform', label: t('hotTopics.columns.platform'), group: 'core', width: '100px' },
    { key: 'title', label: t('hotTopics.columns.title'), group: 'core', width: '320px' },
    { key: 'extra', label: t('hotTopics.columns.extra'), group: 'mirror', width: '140px' },
    { key: 'createdAt', label: t('hotTopics.columns.createdAt'), group: 'api', width: '160px' },
    { key: 'rank', label: t('hotTopics.columns.rank'), group: 'api', width: '70px' },
    { key: 'hotValue', label: t('hotTopics.columns.hotValue'), group: 'api', width: '100px' },
    { key: 'hot_value', label: t('hotTopics.columns.hotValueRaw'), group: 'api', width: '110px' },
    { key: 'author', label: t('hotTopics.columns.author'), group: 'api', width: '120px' },
    { key: 'desc', label: t('hotTopics.columns.desc'), group: 'mirror', width: '300px' },
    { key: 'mobilUrl', label: t('hotTopics.columns.mobileUrl'), group: 'link', width: '130px' },
    { key: 'thumbnail', label: t('hotTopics.columns.thumbnail'), group: 'mirror', width: '150px' },
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
    const confirmed = window.confirm('【警告】此操作将彻底删除本地存储的所有热点素材数据！\n\n该操作不可撤销，确定要清空数据库并重新同步吗？');
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      const deleted = await appApi.ai.deleteAllHotTopics();
      const response = await appApi.ai.listHotTopics(true);
      setHotTopics(response.items || []);
      setLastFetchTime(response.lastFetchTime || new Date().toISOString());
      setLastInsertedCount(Number(response.insertedCount ?? 0));
      const summary = t('hotTopics.resetSummary', {
        deleted: deleted.deleted,
        inserted: response.insertedCount ?? response.items?.length ?? 0,
      });
      setError(summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHotTopics(false);
  }, []);

  const isToday = (dateString: string | undefined) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && 
           d.getMonth() === now.getMonth() && 
           d.getDate() === now.getDate();
  };

  const todayTopicsCount = useMemo(() => hotTopics.filter(t => isToday(t.createdAt)).length, [hotTopics]);

  const platforms = useMemo(() => (
    Array.from(new Set(hotTopics.map((topic) => topic.platform).filter(Boolean))) as string[]
  ), [hotTopics]);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return hotTopics.filter((topic) => {
      const isTimeMatch = filter === 'today' ? isToday(topic.createdAt) : true;
      const isPlatformMatch = (filter === 'all' || filter === 'today') ? true : topic.platform === filter;
      
      if (!isTimeMatch || !isPlatformMatch) return false;
      if (!query) return true;
      return JSON.stringify(topic).toLowerCase().includes(query);
    });
  }, [filter, hotTopics, searchQuery]);

  const cooldownMs = 6 * 60 * 60 * 1000;
  const remainingCooldownMs = lastFetchTime
    ? Math.max(cooldownMs - (new Date().getTime() - new Date(lastFetchTime).getTime()), 0)
    : 0;
  const isCoolingDown = Boolean(lastFetchTime && remainingCooldownMs > 0);
  const cooldownHours = Math.floor(remainingCooldownMs / (60 * 60 * 1000));
  const cooldownMinutes = Math.ceil((remainingCooldownMs % (60 * 60 * 1000)) / (60 * 1000));



  return (
    <div className="tw-min-h-screen tw-bg-slate-50/30 tw-px-2 md:tw-px-6 tw-py-4 tw-animate-fade-in">
      {/* 极简无界页头 */}
      <div className="tw-mb-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center tw-justify-between tw-gap-4">
        <div className="tw-flex tw-items-center tw-gap-4">
          <div className="tw-h-12 tw-w-12 tw-bg-white tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-shadow-sm">
            <Globe className="tw-text-brand-500" size={24} />
          </div>
          <div>
            <h1 className="tw-text-xl tw-font-bold tw-text-slate-900 tw-tracking-tight">{t('hotTopics.title')}</h1>
            <div className="tw-flex tw-items-center tw-gap-3 tw-mt-0.5">
              <span className="tw-text-[11px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-wider">实时热度素材库</span>
              <div className="tw-h-1 tw-w-1 tw-bg-slate-200 tw-rounded-full" />
              <div className="tw-flex tw-items-center tw-gap-2 tw-text-[11px] tw-font-bold">
                <span className="tw-text-brand-500">今日新增 {todayTopicsCount}</span>
                <span className="tw-text-slate-300">/</span>
                <span className="tw-text-slate-400">库内总计 {hotTopics.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tw-flex tw-flex-col tw-items-end tw-gap-1">
          <div className="tw-flex tw-items-center tw-gap-4">
            {isCoolingDown && !loading && (
              <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-bold tw-text-orange-500/80">
                <Clock size={12} />
                <span>距下次同步 {cooldownHours}h {Math.max(cooldownMinutes, 1)}m</span>
              </div>
            )}
            <button
              onClick={() => void loadHotTopics(true)}
              disabled={loading || isCoolingDown}
              className={`tw-flex tw-items-center tw-gap-2 tw-px-6 tw-py-2.5 tw-bg-white tw-rounded-2xl tw-shadow-sm tw-text-xs tw-font-bold tw-transition-all active:tw-scale-95 ${loading || isCoolingDown ? 'tw-text-slate-300' : 'tw-text-brand-500 hover:tw-bg-brand-50/50'}`}
            >
              <RefreshCw size={14} className={loading ? 'tw-animate-spin' : ''} />
              {loading ? t('hotTopics.syncing') : '同步最新热点'}
            </button>
          </div>
          {lastFetchTime && (
            <span className="tw-text-[10px] tw-font-bold tw-text-slate-300">
              上次同步: {new Date(lastFetchTime).toLocaleString()} 
              {lastInsertedCount > 0 && ` (新增 ${lastInsertedCount} 条)`}
            </span>
          )}
        </div>
      </div>

      {/* 极简无界内容区 */}
      <div className="tw-bg-white tw-rounded-[2rem] tw-shadow-xl tw-shadow-slate-200/50 tw-overflow-hidden">
        {/* 工具栏：紧凑布局 */}
        <div className="tw-p-4 md:tw-p-6 tw-flex tw-flex-col lg:tw-flex-row lg:tw-items-center tw-gap-6">
          <div className="tw-flex-1 tw-relative">
            <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-300" size={18} />
            <input
              type="text"
              placeholder={t('hotTopics.searchPlaceholder')}
              className="tw-w-full tw-pl-12 tw-pr-4 tw-py-3 tw-bg-slate-50/50 tw-border-none tw-rounded-2xl tw-text-sm tw-font-medium tw-placeholder-slate-300 focus:tw-bg-white focus:tw-ring-2 focus:tw-ring-brand-500/10 tw-transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="tw-flex tw-items-center tw-gap-2 tw-overflow-x-auto tw-scrollbar-none">
            <button
              onClick={() => setFilter('today')}
              className={`tw-px-5 tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-transition-all ${filter === 'today' ? 'tw-bg-brand-500 tw-text-white tw-shadow-lg tw-shadow-brand-500/20' : 'tw-bg-slate-50 tw-text-slate-500 hover:tw-bg-slate-100'}`}
            >
              今日热点 ({todayTopicsCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`tw-px-5 tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-transition-all ${filter === 'all' ? 'tw-bg-brand-500 tw-text-white tw-shadow-lg tw-shadow-brand-500/20' : 'tw-bg-slate-50 tw-text-slate-500 hover:tw-bg-slate-100'}`}
            >
              全部 ({hotTopics.length})
            </button>
            <div className="tw-w-[1px] tw-h-4 tw-bg-slate-200 tw-mx-2" />
            {platforms.map(p => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`tw-px-5 tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-bold tw-transition-all ${filter === p ? 'tw-bg-brand-500 tw-text-white tw-shadow-lg tw-shadow-brand-500/20' : 'tw-bg-slate-50 tw-text-slate-500 hover:tw-bg-slate-100'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 表格区：交替背景、紧凑行高、无边框线 */}
        <div className="tw-overflow-auto tw-max-h-[calc(100vh-280px)] tw-scrollbar-thin">
          <table className="tw-w-full tw-border-collapse tw-min-w-[2000px] tw-table-fixed">
            <thead className="tw-sticky tw-top-0 tw-z-30 tw-bg-white/95 tw-backdrop-blur-sm">
              <tr>
                <th className="tw-w-16 tw-px-6 tw-py-4 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest tw-text-center">#</th>

                {mirrorColumns.map(col => (
                  <th key={col.key} className="tw-px-4 tw-py-4 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic, idx) => (
                  <tr 
                    key={`${topic.platform}-${topic.title}-${idx}`} 
                    className={`tw-group tw-transition-colors ${idx % 2 === 0 ? 'tw-bg-white' : 'tw-bg-slate-50/40'} hover:tw-bg-brand-50/30`}
                  >
                    <td className="tw-px-6 tw-py-3 tw-text-xs tw-font-mono tw-font-bold tw-text-slate-300 group-hover:tw-text-brand-400 tw-text-center">
                      {String(idx + 1).padStart(2, '0')}
                    </td>

                    {mirrorColumns.map(col => {
                      const val = readTopicValue(topic, col.key);
                      const empty = !val;
                      return (
                        <td key={col.key} className="tw-px-4 tw-py-3">
                          {col.key === 'platform' ? (
                            <span className={`tw-px-2 tw-py-0.5 tw-rounded-md tw-text-[10px] tw-font-bold ${getPlatformStyle(String(val))}`}>
                              {val || '未知'}
                            </span>
                          ) : col.key === 'title' ? (
                            <div className="tw-flex tw-items-center tw-gap-2 tw-max-w-full">
                              {isToday(topic.createdAt) && (
                                <span className="tw-shrink-0 tw-px-1.5 tw-py-0.5 tw-rounded tw-bg-brand-500 tw-text-white tw-text-[9px] tw-font-black tw-animate-pulse">
                                  NEW
                                </span>
                              )}
                              <span className="tw-text-sm tw-font-bold tw-text-slate-700 tw-truncate" title={String(val)}>
                                {val || '未命名话题'}
                              </span>
                              {topic.url && (
                                <a href={topic.url} target="_blank" rel="noreferrer" className="tw-opacity-0 group-hover:tw-opacity-100 tw-text-slate-300 hover:tw-text-brand-500 tw-transition-all">
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          ) : col.key === 'createdAt' ? (
                            <span className="tw-text-[11px] tw-font-medium tw-text-slate-400">
                              {empty ? '-' : new Date(String(val)).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <div className={`tw-text-[11px] tw-font-medium tw-line-clamp-1 ${empty ? 'tw-text-slate-200' : 'tw-text-slate-500'}`}>
                              {formatTopicPreview(val)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={mirrorColumns.length + 2} className="tw-py-32 tw-text-center">
                    <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
                      <div className="tw-h-16 tw-w-16 tw-bg-slate-50 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-slate-200">
                        <Search size={32} />
                      </div>
                      <p className="tw-text-sm tw-font-bold tw-text-slate-400">未发现匹配的热点话题</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 极简页脚 */}
        <div className="tw-px-6 tw-py-3 tw-bg-slate-50/30 tw-flex tw-items-center tw-justify-between">
          <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">
              <LayoutGrid size={12} />
              <span>Auto-sorted Matrix</span>
            </div>
            <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">
              <Globe size={12} />
              <span>Global Sources</span>
            </div>
          </div>
          <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-text-[10px] tw-font-bold tw-text-slate-400">
              {loading ? <span className="tw-animate-pulse tw-text-brand-500">Syncing...</span> : 'Ready'}
            </div>
            <div className="tw-w-[1px] tw-h-3 tw-bg-slate-200" />
            <button
              onClick={() => void deleteAndForceReload()}
              disabled={loading}
              className="tw-text-[10px] tw-font-bold tw-text-slate-300 hover:tw-text-red-400 tw-transition-colors"
              title="危险操作：清空所有热点数据"
            >
              重置数据库
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
