import { useState, useEffect } from 'react';
import { 
  RefreshCw,
  Search,
  Clock,
  Globe
} from 'lucide-react';
import { appApi } from '../api';

export function HotTopicsPage() {
  const [hotTopics, setHotTopics] = useState<any[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const mirrorColumns = [
    { key: 'platform', label: '平台', group: 'core' },
    { key: 'title', label: '标题内容', group: 'core' },
    { key: 'rank', label: 'RANK', group: 'api' },
    { key: 'hotValue', label: '热度值', group: 'api' },
    { key: 'hot_value', label: '原始热度', group: 'api' },
    { key: 'author', label: '作者', group: 'api' },
    { key: 'desc', label: '内容描述', group: 'mirror' },
    { key: 'url', label: 'PC 链接', group: 'link' },
    { key: 'mobilUrl', label: '移动端', group: 'link' },
    { key: 'thumbnail', label: '封面图', group: 'mirror' },
    { key: 'extra', label: '扩展镜像', group: 'mirror' },
  ];

  const loadHotTopics = async (force = false) => {
    setLoading(true);
    try {
      const response = await appApi.ai.listHotTopics(force);
      setHotTopics(response.items || []);
      setLastFetchTime(response.lastFetchTime || new Date().toISOString());
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotTopics(false); // 初始进入页面，不强制刷新 API，优先读本地镜像
  }, []);

  const platforms = Array.from(new Set(hotTopics.map(t => t.platform)));

  const filteredTopics = hotTopics.filter(topic => {
    const matchesFilter = filter === 'all' || topic.platform === filter;
    const searchStr = JSON.stringify(topic).toLowerCase();
    return matchesFilter && searchStr.includes(searchQuery.toLowerCase());
  });

  const getPlatformStyle = (platform: string) => {
    const p = platform?.toLowerCase();
    if (p?.includes('微博')) return 'tw-bg-red-50 tw-text-red-500 tw-border-red-100';
    if (p?.includes('知乎')) return 'tw-bg-blue-50 tw-text-blue-500 tw-border-blue-100';
    if (p?.includes('百度')) return 'tw-bg-blue-50 tw-text-blue-600 tw-border-blue-100';
    if (p?.includes('头条')) return 'tw-bg-orange-50 tw-text-orange-600 tw-border-orange-100';
    return 'tw-bg-slate-100 tw-text-slate-600 tw-border-slate-200';
  };

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in tw-relative">
      {/* 头部：更干练的布局 */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-8 tw-bg-white/40 tw-backdrop-blur-xl tw-p-6 tw-rounded-[2.5rem] tw-border tw-border-white/60 tw-shadow-sm">
        <div>
           <div className="tw-flex tw-items-center tw-gap-3">
             <div className="tw-p-3 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-shadow-lg">
               <Globe size={24} />
             </div>
             <div>
               <h1 className="tw-text-2xl tw-font-black tw-text-slate-900 tw-tracking-tight">实时热点镜像视图</h1>
               <div className="tw-flex tw-items-center tw-gap-2 tw-mt-1">
                 <span className="tw-text-[11px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">Data Stream: hot_topics_history</span>
                 {lastFetchTime && (
                   <span className="tw-text-[10px] tw-text-slate-300">| 最后采集: {new Date(lastFetchTime).toLocaleString()}</span>
                 )}
               </div>
             </div>
           </div>
        </div>
        
        <div className="tw-flex tw-items-center tw-gap-4">
           {lastFetchTime && (
             <div className="tw-text-right">
               <div className={`tw-text-[10px] tw-font-bold ${
                 (!lastFetchTime || (new Date().getTime() - new Date(lastFetchTime).getTime()) > 6 * 60 * 60 * 1000)
                 ? 'tw-text-green-500' : 'tw-text-orange-400'
               }`}>
                 {(!lastFetchTime || (new Date().getTime() - new Date(lastFetchTime).getTime()) > 6 * 60 * 60 * 1000) 
                   ? '接口就绪' : `同步冷却中 (${Math.ceil((6 * 60 * 60 * 1000 - (new Date().getTime() - new Date(lastFetchTime).getTime())) / (60 * 60 * 1000))}h 后解除)`}
               </div>
               <div className="tw-text-[9px] tw-text-slate-300 tw-mt-0.5">策略保护: 6小时/次</div>
             </div>
           )}

           <div className="tw-relative tw-w-64">
             <Search className="tw-absolute tw-left-4 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400" size={14} />
             <input
               type="text"
               placeholder="全字段穿透搜索..."
               className="tw-w-full tw-pl-10 tw-pr-4 tw-py-2.5 tw-bg-slate-100/50 focus:tw-bg-white tw-border tw-border-transparent focus:tw-border-slate-200 tw-rounded-xl tw-text-xs tw-outline-none tw-transition-all"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
           <button 
             onClick={() => loadHotTopics(true)}
             disabled={loading || (lastFetchTime !== null && (new Date().getTime() - new Date(lastFetchTime).getTime()) < 6 * 60 * 60 * 1000)}
             className={`tw-px-6 tw-py-2.5 tw-text-white tw-text-[11px] tw-font-bold tw-rounded-xl tw-transition-all tw-flex tw-items-center tw-gap-2 tw-shadow-md ${
               (loading || (lastFetchTime !== null && (new Date().getTime() - new Date(lastFetchTime).getTime()) < 6 * 60 * 60 * 1000))
               ? 'tw-bg-slate-300 tw-cursor-not-allowed' : 'tw-bg-slate-900 hover:tw-bg-black tw-active:tw-scale-95'
             }`}
           >
              <RefreshCw size={12} className={loading ? 'tw-animate-spin' : ''} />
              {loading ? '同步中' : '执行全量同步'}
           </button>
        </div>
      </div>

      {/* 平台快捷切换 */}
      <div className="tw-flex tw-items-center tw-gap-2 tw-mb-6 tw-px-2">
        <button 
          onClick={() => setFilter('all')}
          className={`tw-px-4 tw-py-1.5 tw-text-[11px] tw-font-bold tw-rounded-lg tw-transition-all ${filter === 'all' ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-white tw-text-slate-400 hover:tw-bg-slate-100'}`}
        >
          全部数据
        </button>
        {platforms.map(p => (
          <button 
            key={p}
            onClick={() => setFilter(p)}
            className={`tw-px-4 tw-py-1.5 tw-text-[11px] tw-font-bold tw-rounded-lg tw-transition-all ${filter === p ? 'tw-bg-slate-900 tw-text-white' : 'tw-bg-white tw-text-slate-400 hover:tw-bg-slate-100'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 高密度数据镜像表格 */}
      <div className="tw-bg-white tw-border tw-border-slate-200/60 tw-rounded-[1.5rem] tw-overflow-hidden tw-shadow-2xl tw-shadow-slate-200/50 tw-flex tw-flex-col">
        <div className="tw-overflow-auto tw-max-h-[calc(100vh-320px)] tw-scrollbar-thin">
          <table className="tw-w-full tw-text-left tw-border-collapse tw-min-w-[2200px] tw-table-fixed">
            <thead className="tw-sticky tw-top-0 tw-z-20">
              <tr className="tw-bg-slate-50 tw-border-b tw-border-slate-100">
                <th className="tw-px-4 tw-py-3 tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-w-[60px] tw-sticky tw-left-0 tw-bg-slate-50 tw-z-30 tw-text-center">IDX</th>
                {mirrorColumns.map(col => (
                  <th key={col.key} className={`tw-px-4 tw-py-3 tw-text-[10px] tw-font-black tw-uppercase tw-tracking-wider ${
                    col.group === 'core' ? 'tw-text-slate-900 tw-bg-slate-100/50' : 
                    col.group === 'api' ? 'tw-text-blue-500 tw-bg-blue-50/30' : 
                    col.group === 'link' ? 'tw-text-green-600 tw-bg-green-50/20' :
                    'tw-text-slate-400'
                  }`}>
                    <div className="tw-flex tw-items-center tw-gap-1.5">
                      {col.group === 'mirror' && <div className="tw-w-1 tw-h-1 tw-bg-slate-300 tw-rounded-full" />}
                      {col.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tw-divide-y tw-divide-slate-50">
              {filteredTopics.length > 0 ? (
                filteredTopics.map((topic, idx) => (
                  <tr key={idx} className="tw-group tw-even:tw-bg-slate-50/40 tw-hover:tw-bg-blue-50/30 tw-transition-all">
                    <td className="tw-px-4 tw-py-2.5 tw-text-[10px] tw-text-slate-400 font-mono tw-sticky tw-left-0 tw-bg-inherit tw-z-10 tw-border-r tw-border-slate-100 group-hover:tw-bg-blue-50/50 tw-text-center">
                      {String(idx + 1).padStart(3, '0')}
                    </td>
                    {mirrorColumns.map(col => {
                      const val = topic[col.key];
                      const isEmpty = val === null || val === undefined || val === '';
                      
                      return (
                        <td key={col.key} className="tw-px-4 tw-py-2.5">
                          {col.key === 'platform' ? (
                            <span className={`tw-px-2 tw-py-0.5 tw-rounded-md tw-text-[10px] tw-font-bold tw-border ${getPlatformStyle(val)}`}>
                              {val}
                            </span>
                          ) : col.key === 'title' ? (
                            <div className="tw-text-[11px] tw-text-slate-900 tw-font-bold tw-truncate tw-max-w-full" title={val}>
                              {val}
                            </div>
                          ) : col.group === 'link' && !isEmpty ? (
                            <a 
                              href={String(val)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="tw-inline-flex tw-items-center tw-gap-1 tw-text-blue-500 hover:tw-text-blue-700 tw-text-[10px] tw-font-bold tw-transition-colors"
                            >
                              打开资源 <Globe size={10} />
                            </a>
                          ) : (
                            <div className={`tw-text-[11px] tw-font-medium tw-truncate ${isEmpty ? 'tw-text-slate-200' : 'tw-text-slate-500'}`} title={val}>
                              {isEmpty ? '—' : String(val)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={mirrorColumns.length + 1} className="tw-px-8 tw-py-24 tw-text-center">
                    <div className="tw-flex tw-flex-col tw-items-center tw-gap-2">
                       <div className="tw-w-12 tw-h-12 tw-bg-slate-50 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-slate-200">
                         <Search size={24} />
                       </div>
                       <div className="tw-text-slate-300 tw-text-[12px] tw-font-bold">未探测到符合条件的镜像数据</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 底部状态 */}
      <div className="tw-mt-6 tw-px-4 tw-flex tw-items-center tw-justify-between">
         <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <div className="tw-w-1.5 tw-h-1.5 tw-bg-green-500 tw-rounded-full tw-animate-pulse" />
              <span className="tw-text-[10px] tw-font-bold tw-text-slate-400">数据库节点: Cluster-01</span>
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
              <div className="tw-w-2 tw-h-2 tw-bg-blue-400 tw-rounded-sm" /> API原始
            </div>
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <div className="tw-w-2 tw-h-2 tw-bg-slate-200 tw-rounded-sm" /> 扩展镜像
            </div>
         </div>
      </div>
    </div>
  );
}
