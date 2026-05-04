import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Globe,
  RefreshCw,
  Search,
  Wand2,
} from 'lucide-react';
import { appApi } from '../api';
import { AGENT_DRAFT_STORAGE_KEY, buildAgentDraftFromHotTopic } from '../../shared/agentDraft';

type HotTopic = Record<string, any> & {
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

const mirrorColumns: TopicColumn[] = [
  { key: 'platform', label: '平台', group: 'core', width: '110px' },
  { key: 'title', label: '标题内容', group: 'core', width: '280px' },
  { key: 'rank', label: '排名', group: 'api', width: '80px' },
  { key: 'hotValue', label: '热度值', group: 'api', width: '120px' },
  { key: 'hot_value', label: '原始热度', group: 'api', width: '120px' },
  { key: 'author', label: '作者', group: 'api', width: '140px' },
  { key: 'desc', label: '内容描述', group: 'mirror', width: '320px' },
  { key: 'url', label: 'PC 链接', group: 'link', width: '130px' },
  { key: 'mobilUrl', label: '移动端', group: 'link', width: '130px' },
  { key: 'thumbnail', label: '封面图', group: 'mirror', width: '180px' },
  { key: 'extra', label: '扩展信息', group: 'mirror', width: '160px' },
];

function readTopicValue(topic: HotTopic, key: string) {
  if (key === 'desc') return topic.desc ?? topic.description;
  if (key === 'hotValue') return topic.hotValue ?? topic.heat;
  return topic[key];
}

function getPlatformStyle(platform: string | undefined) {
  const value = platform?.toLowerCase() ?? '';
  if (value.includes('微博') || value.includes('weibo')) return 'tw-bg-red-50 tw-text-red-500 tw-border-red-100';
  if (value.includes('知乎') || value.includes('zhihu')) return 'tw-bg-blue-50 tw-text-blue-500 tw-border-blue-100';
  if (value.includes('百度') || value.includes('baidu')) return 'tw-bg-blue-50 tw-text-blue-600 tw-border-blue-100';
  if (value.includes('头条') || value.includes('toutiao')) return 'tw-bg-orange-50 tw-text-orange-600 tw-border-orange-100';
  return 'tw-bg-slate-100 tw-text-slate-600 tw-border-slate-200';
}

function getColumnStyle(group: TopicColumn['group']) {
  if (group === 'core') return 'tw-text-slate-900 tw-bg-slate-100/60';
  if (group === 'api') return 'tw-text-blue-500 tw-bg-blue-50/40';
  if (group === 'link') return 'tw-text-green-600 tw-bg-green-50/30';
  return 'tw-text-slate-400 tw-bg-slate-50';
}

export function HotTopicsPage({ onOpenAgent }: HotTopicsPageProps) {
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  async function loadHotTopics(force = false) {
    setLoading(true);
    setError('');
    try {
      const response = await appApi.ai.listHotTopics(force);
      setHotTopics(response.items || []);
      setLastFetchTime(response.lastFetchTime || new Date().toISOString());
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

  const isCoolingDown = Boolean(
    lastFetchTime && (new Date().getTime() - new Date(lastFetchTime).getTime()) < 6 * 60 * 60 * 1000,
  );
  const cooldownHours = lastFetchTime
    ? Math.ceil((6 * 60 * 60 * 1000 - (new Date().getTime() - new Date(lastFetchTime).getTime())) / (60 * 60 * 1000))
    : 0;

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
      <div className="tw-flex tw-flex-col xl:tw-flex-row tw-items-start xl:tw-items-center tw-justify-between tw-gap-6 tw-mb-8 tw-bg-white/70 tw-backdrop-blur-xl tw-p-6 tw-rounded-[2rem] tw-border tw-border-white/70 tw-shadow-sm">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-p-3 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-shadow-lg">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="tw-text-2xl tw-font-black tw-text-slate-900 tw-tracking-tight">实时热点素材池</h1>
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-mt-1">
              <span className="tw-text-[11px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">Data Stream: hot_topics_history</span>
              {lastFetchTime && (
                <span className="tw-text-[10px] tw-text-slate-300">最后同步：{new Date(lastFetchTime).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-4">
          {lastFetchTime && (
            <div className="tw-text-right">
              <div className={`tw-text-[10px] tw-font-bold ${isCoolingDown ? 'tw-text-orange-400' : 'tw-text-green-500'}`}>
                {isCoolingDown ? `同步冷却中（约 ${Math.max(cooldownHours, 1)}h 后解除）` : '接口可刷新'}
              </div>
              <div className="tw-text-[9px] tw-text-slate-300 tw-mt-0.5">策略保护：6 小时 / 次</div>
            </div>
          )}

          <div className="tw-relative tw-w-72">
            <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={14} />
            <input
              type="text"
              placeholder="搜索标题、平台、描述..."
              className="tw-w-full tw-pl-10 tw-pr-4 tw-py-2.5 tw-bg-slate-100/60 focus:tw-bg-white tw-border tw-border-transparent focus:tw-border-slate-200 tw-rounded-xl tw-text-xs tw-outline-none tw-transition-all"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <button
            onClick={() => void loadHotTopics(true)}
            disabled={loading || isCoolingDown}
            className={`tw-px-6 tw-py-2.5 tw-text-white tw-text-[11px] tw-font-bold tw-rounded-xl tw-transition-all tw-flex tw-items-center tw-gap-2 tw-shadow-md ${
              loading || isCoolingDown
                ? 'tw-bg-slate-300 tw-cursor-not-allowed'
                : 'tw-bg-slate-900 hover:tw-bg-black tw-active:tw-scale-95'
            }`}
            type="button"
          >
            <RefreshCw size={12} className={loading ? 'tw-animate-spin' : ''} />
            {loading ? '同步中' : '全量同步'}
          </button>
        </div>
      </div>

      {error && (
        <div className="tw-mb-6 tw-rounded-2xl tw-border tw-border-red-100 tw-bg-red-50 tw-px-4 tw-py-3 tw-text-xs tw-font-bold tw-text-red-600">
          热点同步失败：{error}
        </div>
      )}

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-mb-6 tw-px-2">
        <button
          onClick={() => setFilter('all')}
          className={`tw-px-4 tw-py-1.5 tw-text-[11px] tw-font-bold tw-rounded-lg tw-transition-all ${
            filter === 'all' ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-white tw-text-slate-400 hover:tw-bg-slate-100'
          }`}
          type="button"
        >
          全部数据
        </button>
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => setFilter(platform)}
            className={`tw-px-4 tw-py-1.5 tw-text-[11px] tw-font-bold tw-rounded-lg tw-transition-all ${
              filter === platform ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-white tw-text-slate-400 hover:tw-bg-slate-100'
            }`}
            type="button"
          >
            {platform}
          </button>
        ))}
      </div>

      <div className="tw-bg-white tw-border tw-border-slate-200/60 tw-rounded-[1.5rem] tw-overflow-hidden tw-shadow-2xl tw-shadow-slate-200/50 tw-flex tw-flex-col">
        <div className="tw-overflow-auto tw-max-h-[calc(100vh-320px)] tw-scrollbar-thin">
          <table className="tw-w-full tw-text-left tw-border-collapse tw-min-w-[2100px] tw-table-fixed">
            <thead className="tw-sticky tw-top-0 tw-z-20">
              <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-100">
                <th className="tw-px-4 tw-py-3 tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-w-[60px] tw-sticky tw-left-0 tw-bg-slate-50 tw-z-30 tw-text-center">IDX</th>
                <th className="tw-px-4 tw-py-3 tw-text-[10px] tw-font-black tw-text-slate-900 tw-uppercase tw-w-[120px] tw-bg-slate-100/70">操作</th>
                {mirrorColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`tw-px-4 tw-py-3 tw-text-[10px] tw-font-black tw-uppercase tw-tracking-wider ${getColumnStyle(column.group)}`}
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
                    <td className="tw-px-4 tw-py-2.5 tw-text-[10px] tw-text-slate-400 tw-font-mono tw-sticky tw-left-0 tw-bg-inherit tw-z-10 tw-border-r tw-border-slate-100 group-hover:tw-bg-blue-50/50 tw-text-center">
                      {String(index + 1).padStart(3, '0')}
                    </td>
                    <td className="tw-px-4 tw-py-2.5">
                      <button
                        type="button"
                        onClick={() => useTopicForAgent(topic)}
                        className="tw-inline-flex tw-items-center tw-gap-1.5 tw-px-3 tw-py-1.5 tw-bg-slate-900 tw-text-white tw-rounded-lg tw-text-[10px] tw-font-bold hover:tw-bg-brand-600 tw-transition-all"
                        title="带入 Agent 引擎生成微博"
                      >
                        <Wand2 size={12} />
                        用于生成
                      </button>
                    </td>
                    {mirrorColumns.map((column) => {
                      const value = readTopicValue(topic, column.key);
                      const isEmpty = value === null || value === undefined || value === '';

                      return (
                        <td key={column.key} className="tw-px-4 tw-py-2.5">
                          {column.key === 'platform' ? (
                            <span className={`tw-px-2 tw-py-0.5 tw-rounded-md tw-text-[10px] tw-font-bold tw-border ${getPlatformStyle(String(value || ''))}`}>
                              {isEmpty ? '未知平台' : String(value)}
                            </span>
                          ) : column.key === 'title' ? (
                            <div className="tw-text-[11px] tw-text-slate-900 tw-font-bold tw-truncate tw-max-w-full" title={String(value || '')}>
                              {isEmpty ? '未命名热点' : String(value)}
                            </div>
                          ) : column.group === 'link' && !isEmpty ? (
                            <a
                              href={String(value)}
                              target="_blank"
                              rel="noreferrer"
                              className="tw-inline-flex tw-items-center tw-gap-1 tw-text-blue-500 hover:tw-text-blue-700 tw-text-[10px] tw-font-bold tw-transition-colors"
                            >
                              打开资源 <ExternalLink size={10} />
                            </a>
                          ) : (
                            <div className={`tw-text-[11px] tw-font-medium tw-truncate ${isEmpty ? 'tw-text-slate-200' : 'tw-text-slate-500'}`} title={String(value || '')}>
                              {isEmpty ? '-' : String(value)}
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
                    <div className="tw-flex tw-flex-col tw-items-center tw-gap-2">
                      <div className="tw-w-12 tw-h-12 tw-bg-slate-50 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-slate-200">
                        <Search size={24} />
                      </div>
                      <div className="tw-text-slate-300 tw-text-[12px] tw-font-bold">未检测到符合条件的热点素材</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tw-mt-6 tw-px-4 tw-flex tw-items-center tw-justify-between">
        <div className="tw-flex tw-items-center tw-gap-4">
          <div className="tw-flex tw-items-center tw-gap-1.5">
            <div className="tw-w-1.5 tw-h-1.5 tw-bg-green-500 tw-rounded-full tw-animate-pulse" />
            <span className="tw-text-[10px] tw-font-bold tw-text-slate-400">数据库节点：Cluster-01</span>
          </div>
          <div className="tw-text-[10px] tw-text-slate-300 tw-bg-slate-100 tw-px-2 tw-py-0.5 tw-rounded">
            Total Records: {filteredTopics.length}
          </div>
        </div>
        <div className="tw-flex tw-items-center tw-gap-6 tw-text-[10px] tw-font-bold tw-text-slate-400">
          <div className="tw-flex tw-items-center tw-gap-1.5">
            <div className="tw-w-2 tw-h-2 tw-bg-slate-900 tw-rounded-sm" /> 核心字段
          </div>
          <div className="tw-flex tw-items-center tw-gap-1.5">
            <div className="tw-w-2 tw-h-2 tw-bg-blue-400 tw-rounded-sm" /> API 原始
          </div>
          <div className="tw-flex tw-items-center tw-gap-1.5">
            <div className="tw-w-2 tw-h-2 tw-bg-slate-200 tw-rounded-sm" /> 扩展镜像
          </div>
        </div>
      </div>
    </div>
  );
}
