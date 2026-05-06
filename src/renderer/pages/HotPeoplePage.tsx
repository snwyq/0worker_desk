import { useEffect, useMemo, useState } from 'react';
import { 
  Activity, 
  Calendar, 
  ChevronRight, 
  ExternalLink, 
  Hash, 
  Info, 
  RefreshCw, 
  Search, 
  Sparkles, 
  UserRound, 
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  LayoutGrid
} from 'lucide-react';
import type { HotPerson } from '../../shared/types';
import { appApi } from '../api';

type FailedHotTopic = {
  id: number;
  platform?: string;
  title?: string;
  analysisStatus?: string;
  retryCount?: number;
  nextRetryAt?: string;
  lastError?: string;
  createdAt?: string;
};

function buildWikidataSearchUrl(name: string) {
  return `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(name)}`;
}

function buildBaikeSearchUrl(name: string) {
  return `https://baike.baidu.com/search/word?word=${encodeURIComponent(name)}`;
}

export function HotPeoplePage() {
  const [items, setItems] = useState<HotPerson[]>([]);
  const [failedTopics, setFailedTopics] = useState<FailedHotTopic[]>([]);
  const [todayHotTopicCount, setTodayHotTopicCount] = useState(0); // 待扫描
  const [todayTotalTopics, setTodayTotalTopics] = useState(0);
  const [processedTopics, setProcessedTopics] = useState(0); // 已完成
  const [pendingTopics, setPendingTopics] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'all' | 'failed'>('today');

  // 判断是否为今天
  const isToday = (dateString: string | number) => {
    const d = new Date(dateString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && 
           d.getMonth() === now.getMonth() && 
           d.getDate() === now.getDate();
  };

  const todayPeople = useMemo(() => items.filter(item => isToday(item.updateTime)), [items]);

  const filtered = useMemo(() => {
    const source = activeTab === 'today' ? todayPeople : items;
    const keyword = query.trim().toLowerCase();
    if (!keyword) return source;
    return source.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
  }, [items, todayPeople, query, activeTab]);

  const filteredFailedTopics = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return failedTopics;
    return failedTopics.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
  }, [failedTopics, query]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      // 1. 获取人物列表
      const next = await appApi.ai.listHotPeople();
      setItems(next || []);
      
      // 2. 获取今日采集的总热点数
      const hotTopics = await appApi.ai.listHotTopics(false).catch(() => ({ items: [] as any[] }));
      const total = Array.isArray(hotTopics.items) ? hotTopics.items.length : 0;
      setTodayTotalTopics(total);

      // 3. 获取待处理数
      const queueSummary = await appApi.ai.getHotPeopleQueueSummary().catch(() => ({ pendingTopics: 0 }));
      const pending = Number(queueSummary.pendingTopics ?? 0);
      setPendingTopics(pending);
      setTodayHotTopicCount(pending);

      // 4. 获取失败记录数
      const failed = await fetch('http://127.0.0.1:5183/ai/hot-people-failed').then((response) => response.json()).catch(() => []);
      const failedCount = Array.isArray(failed) ? failed.length : 0;
      setFailedTopics(failed || []);

      // 5. 计算已完成数 = 总数 - 待处理 - 失败
      const done = Math.max(0, total - pending - failedCount);
      setProcessedTopics(done);

    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    setAnalyzing(true);
    setError('');
    setNotice('');
    try {
      await appApi.ai.analyzeHotPeople({ retriever: 'model', provider: 'dashscope' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setAnalyzing(false);
    }
  }

  async function resetAnalysis() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await appApi.ai.resetHotPeopleAnalysis();
      setNotice(`已删除今天新增的 ${result.deleted} 条人物，并重置今天 ${result.reset} 条热点的分析状态。`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!analyzing) return;

    const timer = window.setInterval(() => {
      void appApi.ai.getHotPeopleAnalyzeProgress().then((progress) => {
        const pending = Number(progress.pendingTopics ?? 0);
        setPendingTopics(pending);
        setTodayHotTopicCount(pending);
      }).catch(() => {});
      void appApi.ai.listHotPeople().then((next) => {
        setItems(next || []);
      }).catch(() => {});
      void fetch('http://127.0.0.1:5183/ai/hot-people-failed')
        .then((response) => response.json())
        .then((failed) => setFailedTopics(failed || []))
        .catch(() => {});
    }, 1000);

    return () => window.clearInterval(timer);
  }, [analyzing]);

  return (
    <div className="tw-relative tw-min-h-screen tw-animate-fade-in tw-pb-6 tw-px-1 md:tw-px-4">
      {/* 极致简约：单行扁平任务控制台 */}
      <div className="tw-mb-3 tw-flex tw-items-center tw-justify-between tw-py-2 tw-border-b tw-border-slate-100">
        <div className="tw-flex tw-items-center tw-gap-6">
          <div className="tw-flex tw-items-center tw-gap-2">
            <div className="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-bg-slate-900 tw-text-white">
              <UserRound size={16} />
            </div>
            <h1 className="tw-text-lg tw-font-black tw-text-slate-900 tw-tracking-tight">
              热点人物<span className="tw-text-brand-500">库</span>
            </h1>
          </div>

          {/* 紧凑型指标组 */}
          <div className="tw-hidden md:tw-flex tw-items-center tw-gap-4 tw-text-[11px] tw-font-bold">
            <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-slate-500">
              <Hash size={12} className="tw-text-slate-300" />
              资讯总计: <span className="tw-text-slate-900">{todayTotalTopics}</span>
            </div>
            <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-slate-500">
              <CheckCircle2 size={12} className="tw-text-emerald-500" />
              已完成: <span className="tw-text-emerald-600">{processedTopics}</span>
            </div>
            <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-slate-500">
              <AlertCircle size={12} className={failedTopics.length > 0 ? 'tw-text-red-500' : 'tw-text-slate-300'} />
              失败: <span className={failedTopics.length > 0 ? 'tw-text-red-600' : 'tw-text-slate-900'}>{failedTopics.length}</span>
            </div>
            <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-slate-500">
              <Clock size={12} className={todayHotTopicCount > 0 ? 'tw-text-brand-500' : 'tw-text-slate-300'} />
              剩余: <span className={todayHotTopicCount > 0 ? 'tw-text-brand-600' : 'tw-text-slate-900'}>{todayHotTopicCount}</span>
            </div>
          </div>
        </div>

        <div className="tw-flex tw-items-center tw-gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-100 tw-bg-white tw-text-slate-400 hover:tw-text-slate-900 tw-transition-all active:tw-scale-95 disabled:tw-opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'tw-animate-spin' : ''} />
          </button>
          
          <div className="tw-relative">
            {todayHotTopicCount > 0 && !analyzing && (
              <div className="tw-absolute tw-right-full tw-mr-3 tw-top-1/2 tw--translate-y-1/2 tw-animate-bounce-x">
                <div className="tw-rounded tw-bg-brand-500 tw-px-1.5 tw-py-0.5 tw-text-[9px] tw-font-black tw-text-white tw-shadow-lg">
                  立即扫描 →
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => void analyze()}
              disabled={analyzing}
              className={`tw-flex tw-items-center tw-gap-2 tw-rounded-lg tw-px-4 tw-py-1.5 tw-text-[13px] tw-font-black tw-transition-all active:tw-scale-95 ${analyzing ? 'tw-bg-slate-100 tw-text-slate-400' : 'tw-bg-slate-900 tw-text-white hover:tw-bg-black'}`}
            >
              <Sparkles size={14} className={analyzing ? 'tw-animate-spin' : ''} />
              <span>{analyzing ? '分析中...' : '开始扫描'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice & Error */}
      {notice && (
        <div className="tw-mb-4 tw-flex tw-items-start tw-gap-3 tw-rounded-xl tw-border tw-border-emerald-100 tw-bg-emerald-50/50 tw-p-3 tw-backdrop-blur-sm">
          <Info className="tw-shrink-0 tw-text-emerald-500" size={16} />
          <p className="tw-text-xs tw-font-bold tw-text-emerald-800">{notice}</p>
        </div>
      )}
      {error && (
        <div className="tw-mb-4 tw-flex tw-items-start tw-gap-3 tw-rounded-xl tw-border tw-border-red-100 tw-bg-red-50/50 tw-p-3 tw-backdrop-blur-sm">
          <AlertCircle className="tw-shrink-0 tw-text-red-500" size={16} />
          <p className="tw-text-xs tw-font-bold tw-text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="tw-group/container tw-relative tw-overflow-hidden tw-rounded-2xl tw-border tw-border-slate-100 tw-bg-white tw-shadow-sm">
        <div className="tw-absolute tw-inset-x-0 tw-top-0 tw-h-24 tw-bg-gradient-to-b tw-from-slate-50/50 tw-to-transparent" />
        
        {/* Toolbar */}
        <div className="tw-relative tw-border-b tw-border-slate-100 tw-p-6">
          <div className="tw-flex tw-flex-col tw-gap-6 lg:tw-flex-row lg:tw-items-center lg:tw-justify-between">
            <div className="tw-flex tw-items-center tw-gap-2 tw-rounded-2xl tw-bg-slate-100 tw-p-1">
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-px-5 tw-py-2.5 tw-text-sm tw-font-black tw-transition-all ${activeTab === 'today' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-900'}`}
              >
                <Sparkles size={16} className={activeTab === 'today' ? 'tw-text-brand-500' : ''} />
                <span>今日热点人物</span>
                <span className={`tw-ml-1 tw-rounded-full tw-px-1.5 tw-py-0.5 tw-text-[10px] ${activeTab === 'today' ? 'tw-bg-brand-500 tw-text-white' : 'tw-bg-slate-200 tw-text-slate-600'}`}>
                  {todayPeople.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-px-5 tw-py-2.5 tw-text-sm tw-font-black tw-transition-all ${activeTab === 'all' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-900'}`}
              >
                <Users size={16} />
                <span>全部</span>
                <span className={`tw-ml-1 tw-rounded-full tw-px-1.5 tw-py-0.5 tw-text-[10px] ${activeTab === 'all' ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-slate-200 tw-text-slate-600'}`}>
                  {items.length}
                </span>
              </button>
              <div className="tw-mx-1 tw-h-4 tw-w-px tw-bg-slate-200" />
              <button
                type="button"
                onClick={() => setActiveTab('failed')}
                className={`tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-px-5 tw-py-2.5 tw-text-sm tw-font-black tw-transition-all ${activeTab === 'failed' ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm' : 'tw-text-slate-500 hover:tw-text-slate-900'}`}
              >
                <AlertCircle size={16} className={activeTab === 'failed' ? 'tw-text-red-500' : ''} />
                <span>分析失败</span>
                <span className={`tw-ml-1 tw-rounded-full tw-px-1.5 tw-py-0.5 tw-text-[10px] ${activeTab === 'failed' ? 'tw-bg-red-500 tw-text-white' : 'tw-bg-slate-200 tw-text-slate-600'}`}>
                  {filteredFailedTopics.length}
                </span>
              </button>
            </div>

            <div className="tw-flex tw-flex-1 tw-items-center tw-gap-4 lg:tw-max-w-md">
              <div className="tw-relative tw-w-full">
                <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索库中人物..."
                  className="tw-h-12 tw-w-full tw-rounded-2xl tw-border-none tw-bg-slate-50 tw-pl-12 tw-pr-4 tw-text-sm tw-font-bold tw-text-slate-900 tw-placeholder-slate-400 tw-transition-all focus:tw-bg-white focus:tw-ring-2 focus:tw-ring-brand-500/10 focus:tw-shadow-inner"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMoreActions(!showMoreActions)}
                className={`tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-2xl tw-transition-all ${showMoreActions ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-slate-50 tw-text-slate-400 hover:tw-bg-slate-100 hover:tw-text-slate-600'}`}
              >
                <Info size={20} />
              </button>
            </div>
          </div>

          {showMoreActions && (
            <div className="tw-mt-4 tw-flex tw-items-center tw-justify-between tw-rounded-2xl tw-bg-amber-50 tw-p-4 tw-border tw-border-amber-100 tw-animate-in tw-slide-in-from-top-2">
              <div className="tw-flex tw-items-center tw-gap-3">
                <div className="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-bg-amber-100 tw-text-amber-600">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <div className="tw-text-xs tw-font-black tw-text-amber-900">高级操作：重置分析</div>
                  <div className="tw-text-[10px] tw-font-bold tw-text-amber-600">删除今天新增的人物数据并重置热点处理状态</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void resetAnalysis()}
                disabled={loading || analyzing}
                className="tw-rounded-xl tw-bg-amber-600 tw-px-4 tw-py-2 tw-text-[11px] tw-font-black tw-text-white hover:tw-bg-amber-700 disabled:tw-opacity-40"
              >
                确认重置
              </button>
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="tw-relative tw-overflow-x-auto tw-scrollbar-none">
          <div className="tw-max-h-[calc(100vh-180px)] tw-overflow-y-auto tw-scrollbar-thin">
            {activeTab !== 'failed' ? (
              <table className="tw-w-full tw-min-w-[1200px] tw-border-collapse">
                <thead className="tw-sticky tw-top-0 tw-z-30 tw-bg-white/90 tw-backdrop-blur-md">
                  <tr className="tw-border-b tw-border-slate-100">
                    <th className="tw-w-[80px] tw-px-6 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">Idx</th>
                    <th className="tw-w-[180px] tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">姓名档案</th>
                    <th className="tw-w-[280px] tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">来源热点</th>
                    <th className="tw-w-[180px] tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">生日信息</th>
                    <th className="tw-w-[240px] tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">玄学资料 (四柱)</th>
                    <th className="tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">大运走势</th>
                    <th className="tw-w-[120px] tw-px-6 tw-py-4 tw-text-right tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">更新</th>
                  </tr>
                </thead>
                <tbody className="tw-divide-y tw-divide-slate-50">
                  {filtered.length > 0 ? (
                    filtered.map((item, index) => (
                      <tr key={item.id} className="tw-group/row tw-transition-colors hover:tw-bg-slate-50/50">
                        <td className="tw-px-6 tw-py-5">
                          <span className="tw-font-mono tw-text-xs tw-font-bold tw-text-slate-300 group-hover/row:tw-text-brand-400">
                            {String(index + 1).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <div className="tw-flex tw-items-start tw-gap-3">
                            <div className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-slate-100 tw-text-slate-400 tw-text-sm tw-font-black tw-transition-all group-hover/row:tw-bg-brand-500 group-hover/row:tw-text-white">
                              {item.name.charAt(0)}
                            </div>
                            <div className="tw-min-w-0">
                              <div className="tw-flex tw-items-center tw-gap-2">
                                <span className="tw-text-sm tw-font-black tw-text-slate-900 tw-truncate">{item.name}</span>
                                <span className={`tw-text-[9px] tw-font-black tw-px-1 tw-py-0.5 tw-rounded ${item.gender === '女' ? 'tw-bg-pink-50 tw-text-pink-500' : 'tw-bg-blue-50 tw-text-blue-500'}`}>
                                  {item.gender || '?'}
                                </span>
                              </div>
                              <div className="tw-mt-2 tw-flex tw-flex-col tw-gap-1.5">
                                <a href={buildWikidataSearchUrl(item.name)} target="_blank" rel="noreferrer" className="tw-group/link tw-flex tw-items-center tw-gap-1.5 tw-text-[10px] tw-font-bold tw-text-slate-400 hover:tw-text-brand-500">
                                  <div className="tw-h-1 tw-w-1 tw-rounded-full tw-bg-slate-200 group-hover/link:tw-bg-brand-500" />
                                  <span className="tw-truncate">Wikidata</span>
                                  <ExternalLink size={10} className="tw-opacity-0 group-hover/link:tw-opacity-100" />
                                </a>
                                <a href={buildBaikeSearchUrl(item.name)} target="_blank" rel="noreferrer" className="tw-group/link tw-flex tw-items-center tw-gap-1.5 tw-text-[10px] tw-font-bold tw-text-slate-400 hover:tw-text-slate-900">
                                  <div className="tw-h-1 tw-w-1 tw-rounded-full tw-bg-slate-200 group-hover/link:tw-bg-slate-900" />
                                  <span className="tw-truncate">百度百科</span>
                                  <ExternalLink size={10} className="tw-opacity-0 group-hover/link:tw-opacity-100" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <div className="tw-group/topic tw-relative">
                            <div className="tw-line-clamp-2 tw-text-[13px] tw-font-bold tw-leading-relaxed tw-text-slate-600">
                              {item.sourceTopicTitle || '-'}
                            </div>
                            {item.sourcePlatform && (
                              <div className="tw-mt-1.5 tw-inline-flex tw-items-center tw-gap-1 tw-rounded-md tw-bg-slate-100 tw-px-1.5 tw-py-0.5 tw-text-[9px] tw-font-black tw-uppercase tw-tracking-wider tw-text-slate-400">
                                {item.sourcePlatform}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <div className="tw-space-y-1">
                            <div className="tw-flex tw-items-center tw-gap-2 tw-text-[13px] tw-font-bold tw-text-slate-700">
                              <Calendar size={14} className="tw-text-slate-300" />
                              {item.birthday || '-'}
                            </div>
                            {item.constellation && (
                              <div className="tw-text-[11px] tw-font-bold tw-text-brand-500">{item.constellation}座</div>
                            )}
                            {item.verifyBirthday && item.verifyBirthday !== item.birthday && (
                              <div className="tw-flex tw-items-center tw-gap-1 tw-text-[10px] tw-font-black tw-text-amber-600">
                                <Info size={10} />
                                校验：{item.verifyBirthday}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <div className="tw-rounded-xl tw-bg-slate-50 tw-p-2.5 tw-font-mono tw-text-[11px] tw-font-black tw-leading-loose tw-text-slate-600 tw-border tw-border-slate-100/50">
                            {item.sizhu || '资料缺失'}
                          </div>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <div className="tw-line-clamp-2 tw-max-w-md tw-text-[11px] tw-font-bold tw-leading-relaxed tw-text-slate-500">
                            {item.dayunInfo || '-'}
                          </div>
                        </td>
                        <td className="tw-px-6 tw-py-5 tw-text-right">
                          <div className="tw-text-[10px] tw-font-black tw-text-slate-300">
                            {new Date(item.updateTime).toLocaleDateString()}
                          </div>
                          <div className="tw-mt-1 tw-text-[10px] tw-font-mono tw-text-slate-200">
                            {new Date(item.updateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="tw-px-6 tw-py-32 tw-text-center">
                        <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
                          <div className="tw-flex tw-h-20 tw-w-20 tw-items-center tw-justify-center tw-rounded-[2rem] tw-bg-slate-50 tw-text-slate-200">
                            <UserRound size={40} />
                          </div>
                          <div className="tw-max-w-xs">
                            <h3 className="tw-text-lg tw-font-black tw-text-slate-900">暂无人物资料</h3>
                            <p className="tw-mt-2 tw-text-sm tw-font-bold tw-text-slate-400">
                              点击上方的“开始热点扫描”按钮，AI 将从当前热点话题中挖掘公众人物。
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="tw-w-full tw-min-w-[1000px] tw-border-collapse">
                <thead className="tw-sticky tw-top-0 tw-z-30 tw-bg-white/90 tw-backdrop-blur-md">
                  <tr className="tw-border-b tw-border-slate-100">
                    <th className="tw-w-[80px] tw-px-6 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">Idx</th>
                    <th className="tw-w-[140px] tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">平台</th>
                    <th className="tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">热点标题</th>
                    <th className="tw-w-[120px] tw-px-4 tw-py-4 tw-text-center tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">重试</th>
                    <th className="tw-w-[320px] tw-px-4 tw-py-4 tw-text-left tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">失败原因与日志</th>
                    <th className="tw-w-[160px] tw-px-6 tw-py-4 tw-text-right tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest tw-text-slate-400">时间</th>
                  </tr>
                </thead>
                <tbody className="tw-divide-y tw-divide-slate-50">
                  {filteredFailedTopics.length > 0 ? (
                    filteredFailedTopics.map((item, index) => (
                      <tr key={item.id} className="tw-group/row tw-transition-colors hover:tw-bg-red-50/20">
                        <td className="tw-px-6 tw-py-5">
                          <span className="tw-font-mono tw-text-xs tw-font-bold tw-text-slate-300">
                            {String(index + 1).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <span className="tw-inline-flex tw-rounded-lg tw-bg-slate-100 tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-black tw-uppercase tw-tracking-wider tw-text-slate-500">
                            {item.platform || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <div className="tw-text-[13px] tw-font-bold tw-leading-relaxed tw-text-slate-900">
                            {item.title || '-'}
                          </div>
                        </td>
                        <td className="tw-px-4 tw-py-5 tw-text-center">
                          <div className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-slate-50 tw-px-3 tw-py-1">
                            <RefreshCw size={10} className="tw-text-slate-400" />
                            <span className="tw-font-mono tw-text-[11px] tw-font-black tw-text-slate-600">{item.retryCount ?? 0}</span>
                          </div>
                        </td>
                        <td className="tw-px-4 tw-py-5">
                          <div className="tw-flex tw-items-start tw-gap-2 tw-rounded-xl tw-bg-red-50 tw-p-3 tw-text-[11px] tw-font-bold tw-leading-relaxed tw-text-red-600">
                            <AlertCircle size={14} className="tw-mt-0.5 tw-shrink-0" />
                            <span className="tw-line-clamp-2">{item.lastError || '未知分析错误'}</span>
                          </div>
                        </td>
                        <td className="tw-px-6 tw-py-5 tw-text-right">
                          <div className="tw-text-[10px] tw-font-black tw-text-slate-400">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="tw-px-6 tw-py-20 tw-text-center">
                        <div className="tw-flex tw-flex-col tw-items-center tw-gap-3">
                          <CheckCircle2 size={32} className="tw-text-emerald-200" />
                          <p className="tw-text-sm tw-font-bold tw-text-slate-400">暂无失败记录</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="tw-border-t tw-border-slate-100 tw-bg-slate-50/50 tw-px-6 tw-py-2">
          <div className="tw-flex tw-items-center tw-justify-between">
            <div className="tw-flex tw-items-center tw-gap-4">
              <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-[10px] tw-font-black tw-text-slate-400">
                <LayoutGrid size={12} />
                <span>数据已按更新时间倒序排列</span>
              </div>
              <div className="tw-h-1 tw-w-1 tw-rounded-full tw-bg-slate-300" />
              <div className="tw-flex tw-items-center tw-gap-1.5 tw-text-[10px] tw-font-black tw-text-slate-400">
                <Sparkles size={12} />
                <span>AI 赋能资料整理</span>
              </div>
            </div>
            <div className="tw-text-[10px] tw-font-bold tw-text-slate-400">
              {analyzing ? (
                <span className="tw-animate-pulse tw-text-brand-500">正在分析热点特征...</span>
              ) : (
                '系统就绪'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
