import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Search, Sparkles, UserRound } from 'lucide-react';
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
  const [pendingTopics, setPendingTopics] = useState(0);
  const [processedTopics, setProcessedTopics] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'people' | 'failed'>('people');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const next = await appApi.ai.listHotPeople();
      setItems(next || []);
      const queueSummary = await appApi.ai.getHotPeopleQueueSummary().catch(() => ({ pendingTopics: 0 }));
      setPendingTopics(Number(queueSummary.pendingTopics ?? 0));
      const progress = await appApi.ai.getHotPeopleAnalyzeProgress().catch(() => ({ processedTopics: 0 }));
      setProcessedTopics(Number(progress.processedTopics ?? 0));
      const failed = await fetch('http://127.0.0.1:5183/ai/hot-people-failed').then((response) => response.json()).catch(() => []);
      setFailedTopics(failed || []);
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
      const result = await appApi.ai.analyzeHotPeople({ retriever: 'model', provider: 'dashscope' });
      const reasonText = result.failedReasons.length > 0 ? ` 失败原因：${result.failedReasons.join('、')}` : '';
      const queueText = result.pendingTopics === 0
        ? ' 当前没有待分析热点。'
        : result.failedCount > 0
          ? ' 本轮失败热点不会自动重试，可在失败热点页查看。'
          : '';
      setNotice(`本次共扫描 ${result.selectedTopics} 条热点记录，已处理 ${result.processedTopics} 条，其中跳过 ${result.skippedTopics} 条。新增 ${result.createdCount} 人，更新 ${result.updatedCount} 人，失败 ${result.failedCount} 人。${reasonText}${queueText}`);
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
      setNotice(`已删除今天新增的 ${result.deleted} 条人物，并重置今天 ${result.reset} 条热点的分析状态。可以重新点击“从热点里找人物”。`);
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
    if (!analyzing) {
      return;
    }

    const timer = window.setInterval(() => {
      void appApi.ai.getHotPeopleAnalyzeProgress().then((progress) => {
        setProcessedTopics(Number(progress.processedTopics ?? 0));
        setPendingTopics(Number(progress.pendingTopics ?? 0));
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

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
  }, [items, query]);

  const filteredFailedTopics = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return failedTopics;
    return failedTopics.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
  }, [failedTopics, query]);

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in tw-relative">
      <div className="tw-mb-4 tw-flex tw-items-center tw-gap-3">
        <div className="tw-p-3 tw-bg-slate-900 tw-text-white tw-rounded-2xl">
          <UserRound size={22} />
        </div>
        <div className="tw-min-w-0 tw-flex-1">
          <h1 className="tw-text-2xl md:tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">热点人物资料库</h1>
          <div className="tw-mt-1 tw-text-sm tw-text-slate-500">
            人物记录 {items.length} 条，失败热点 {failedTopics.length} 条
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          title="刷新结果"
          aria-label="刷新结果"
          className="tw-inline-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-text-slate-600 tw-shadow-sm hover:tw-bg-slate-50 hover:tw-text-slate-900 disabled:tw-opacity-60"
        >
          <RefreshCw size={18} className={loading ? 'tw-animate-spin' : ''} />
        </button>
      </div>

      {notice && (
        <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-emerald-100 tw-bg-emerald-50 tw-px-5 tw-py-4 tw-text-sm tw-font-bold tw-text-emerald-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="tw-mb-4 tw-rounded-2xl tw-border tw-border-red-100 tw-bg-red-50 tw-px-5 tw-py-4 tw-text-sm tw-font-bold tw-text-red-600">
          {error}
        </div>
      )}

      <div className="tw-mb-4 tw-bg-white tw-border tw-border-slate-200 tw-rounded-[1.25rem] tw-shadow-sm tw-p-4 md:tw-p-5">
        <div className="tw-flex tw-flex-col tw-gap-4">
          <div className="tw-flex tw-flex-col xl:tw-flex-row xl:tw-items-center tw-gap-3">
            <div className="tw-relative tw-flex-1">
              <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={18} />
              <input
                type="text"
                placeholder="搜索人物、来源热点、生日..."
                className="tw-w-full tw-pl-12 tw-pr-4 tw-py-3 tw-bg-slate-50 tw-border tw-border-slate-200 focus:tw-bg-white focus:tw-border-slate-300 tw-rounded-xl tw-text-sm md:tw-text-base tw-font-medium tw-outline-none tw-transition-all"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 xl:tw-ml-auto">
              <span className="tw-text-sm tw-font-bold tw-text-slate-500">
                还有 {pendingTopics} 条热点没处理
              </span>
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={analyzing}
                className="tw-px-5 tw-py-3 tw-text-white tw-text-sm tw-font-bold tw-rounded-xl tw-transition-all tw-inline-flex tw-items-center tw-gap-2 tw-bg-slate-900 hover:tw-bg-black disabled:tw-bg-slate-300 disabled:tw-cursor-not-allowed"
              >
                <Sparkles size={16} className={analyzing ? 'tw-animate-spin' : ''} />
                {analyzing ? '正在从热点里整理人物资料' : '从热点里找人物'}
              </button>
              {analyzing && (
                <span className="tw-inline-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold tw-text-blue-600">
                  <span className="tw-w-2 tw-h-2 tw-rounded-full tw-bg-blue-500 tw-animate-pulse" />
                  已处理 {processedTopics} 条，还剩 {pendingTopics} 条
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowMoreActions((current) => !current)}
                className="tw-px-4 tw-py-3 tw-bg-slate-100 tw-text-slate-600 tw-text-sm tw-font-bold tw-rounded-xl tw-inline-flex tw-items-center tw-gap-2 hover:tw-bg-slate-200"
              >
                更多操作
              </button>
            </div>
          </div>

          {showMoreActions && (
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-pt-1 tw-border-t tw-border-slate-100">
              <button
                type="button"
                onClick={() => void resetAnalysis()}
                disabled={loading || analyzing}
                className="tw-text-sm tw-font-bold tw-text-amber-700 hover:tw-text-amber-800 disabled:tw-opacity-60"
              >
                重置分析
              </button>
              <span className="tw-text-xs tw-font-medium tw-text-slate-400">
                删除今天新增人物，并重置今天热点
              </span>
            </div>
          )}

          {analyzing && (
            <div className="tw-overflow-hidden tw-rounded-full tw-bg-slate-100 tw-h-2">
              <div className="tw-h-full tw-w-1/3 tw-bg-slate-900 tw-rounded-full tw-animate-pulse" />
            </div>
          )}
        </div>
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('people')}
          className={`tw-px-4 tw-py-2 tw-rounded-xl tw-text-sm tw-font-bold ${activeTab === 'people' ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-slate-100 tw-text-slate-600 hover:tw-bg-slate-200'}`}
        >
          已整理的人物 {filtered.length}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('failed')}
          className={`tw-px-4 tw-py-2 tw-rounded-xl tw-text-sm tw-font-bold ${activeTab === 'failed' ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-slate-100 tw-text-slate-600 hover:tw-bg-slate-200'}`}
        >
          处理失败的热点 {filteredFailedTopics.length}
        </button>
      </div>

      <div className="tw-bg-white tw-border tw-border-slate-200/60 tw-rounded-[1.5rem] tw-overflow-hidden tw-shadow-2xl tw-shadow-slate-200/50 tw-flex tw-flex-col">
        <div className="tw-overflow-x-auto tw-scrollbar-thin">
          <div className="tw-overflow-y-auto tw-max-h-[calc(100vh-280px)] tw-scrollbar-thin">
            {activeTab === 'people' ? (
              <table className="tw-w-full tw-text-left tw-border-collapse tw-min-w-[1640px] tw-table-fixed">
                <thead className="tw-sticky tw-top-0 tw-z-20">
                  <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-100">
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-400 tw-uppercase tw-w-[70px]">IDX</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[170px]">姓名</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[260px]">来源热点</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[90px]">性别</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[160px]">生日</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[100px]">星座</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[180px]">四柱</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[520px]">大运</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[120px]">状态</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[200px]">更新时间</th>
                  </tr>
                </thead>
                <tbody className="tw-divide-y tw-divide-slate-50">
                  {filtered.length > 0 ? (
                    filtered.map((item, index) => (
                      <tr key={item.id} className="tw-even:tw-bg-slate-50/40 hover:tw-bg-blue-50/30 tw-transition-all">
                        <td className="tw-px-4 tw-py-4 tw-text-xs tw-text-slate-400 tw-font-mono">{String(index + 1).padStart(3, '0')}</td>
                        <td className="tw-px-4 tw-py-4">
                          <div className="tw-flex tw-flex-col tw-gap-2">
                            <div className="tw-text-sm tw-font-bold tw-text-slate-900">{item.name}</div>
                            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-text-xs tw-font-bold">
                              <a
                                href={buildWikidataSearchUrl(item.name)}
                                target="_blank"
                                rel="noreferrer"
                                className="tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-text-blue-600 hover:tw-text-blue-700"
                              >
                                Wikidata <ExternalLink size={12} />
                              </a>
                              <a
                                href={buildBaikeSearchUrl(item.name)}
                                target="_blank"
                                rel="noreferrer"
                                className="tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-text-slate-500 hover:tw-text-slate-700"
                              >
                                百度百科 <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-600 tw-leading-6">{item.sourceTopicTitle || '-'}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-600">{item.gender || '-'}</td>
                        <td className="tw-px-4 tw-py-4">
                          <div className="tw-text-sm tw-text-slate-600">
                            {item.birthday || '-'}
                          </div>
                          {item.verifyBirthday && (
                            <div className={`tw-mt-1 tw-text-xs ${item.verifyBirthday !== item.birthday ? 'tw-text-red-500 tw-font-bold' : 'tw-text-slate-400'}`}>
                              验证生日：{item.verifyBirthday}
                            </div>
                          )}
                        </td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-600">{item.constellation || '-'}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-600 tw-leading-6">{item.sizhu || '-'}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-leading-6 tw-text-slate-600">{item.dayunInfo || '-'}</td>
                        <td className="tw-px-4 tw-py-4">
                          <span className={`tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-1 tw-text-xs tw-font-bold ${item.analysisStatus === 'completed' ? 'tw-bg-emerald-50 tw-text-emerald-600' : 'tw-bg-amber-50 tw-text-amber-600'}`}>
                            {item.analysisStatus === 'completed' ? '核心资料已生成' : '待处理'}
                          </span>
                        </td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-500">{new Date(item.updateTime).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="tw-px-6 tw-py-16 tw-text-center tw-text-sm tw-text-slate-400">
                        还没有热点人物数据，点击上方“从热点里找人物”生成核心资料。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="tw-w-full tw-text-left tw-border-collapse tw-min-w-[1280px] tw-table-fixed">
                <thead className="tw-sticky tw-top-0 tw-z-20">
                  <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-100">
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-400 tw-uppercase tw-w-[70px]">IDX</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[140px]">平台</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[360px]">热点标题</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[190px]">抓取时间</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[140px]">重试次数</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[220px]">最早重试时间</th>
                    <th className="tw-px-4 tw-py-4 tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-w-[280px]">失败原因</th>
                  </tr>
                </thead>
                <tbody className="tw-divide-y tw-divide-slate-50">
                  {filteredFailedTopics.length > 0 ? (
                    filteredFailedTopics.map((item, index) => (
                      <tr key={item.id} className="tw-even:tw-bg-slate-50/40 hover:tw-bg-amber-50/30 tw-transition-all">
                        <td className="tw-px-4 tw-py-4 tw-text-xs tw-text-slate-400 tw-font-mono">{String(index + 1).padStart(3, '0')}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-600">{item.platform || '-'}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-font-bold tw-text-slate-900 tw-leading-6">{item.title || '-'}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-500">{item.retryCount ?? 0}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-slate-500">{item.nextRetryAt ? new Date(item.nextRetryAt).toLocaleString() : '-'}</td>
                        <td className="tw-px-4 tw-py-4 tw-text-sm tw-text-red-500 tw-leading-6">{item.lastError || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="tw-px-6 tw-py-16 tw-text-center tw-text-sm tw-text-slate-400">
                        当前没有失败热点。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
