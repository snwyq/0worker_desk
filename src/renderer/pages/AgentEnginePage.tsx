import { useEffect, useState, useRef } from 'react';
import { 
  Play, 
  Activity, 
  Zap, 
  ChevronRight, 
  Terminal as TerminalIcon, 
  Trash2, 
  Sparkles,
  Command,
  Layers,
  History,
} from 'lucide-react';
import { appApi } from '../api';
import type { AiPlugin, AiWorkflow, Account } from '../../shared/types';

export function AgentEnginePage() {
  const [plugins, setPlugins] = useState<AiPlugin[]>([]);
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [selectedPlugin, setSelectedPlugin] = useState<string>('maoxiaoxian');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('maoxiaoxian.daily_topics');
  
  const [params, setParams] = useState({
    userBirth: '1995-06-15 12:00:00',
    persona: '年轻女性职场人',
    tone: '神秘、温柔、治愈'
  });
  
  const [result, setResult] = useState<{ content?: string; imageUrl?: string } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
    // 订阅实时日志
    const unsubscribe = appApi.ai.onWorkflowLog((log: any) => {
       if (log) setLogs(prev => [...prev, log]);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  async function loadInitialData() {
    try {
      const [pluginsData, accountsData] = await Promise.all([
        appApi.ai.listPlugins().catch(() => []),
        appApi.accounts.list().catch(() => []),
      ]);
      setPlugins(pluginsData || []);
      setAccounts(accountsData || []);
      
      const defaultPlugin = pluginsData?.[0]?.code || 'maoxiaoxian';
      setSelectedPlugin(defaultPlugin);
      
      const wfData = await appApi.ai.listWorkflows(defaultPlugin).catch(() => []);
      setWorkflows(wfData || []);
    } catch (error) {
      console.error('Failed to load agent data', error);
    }
  }

  async function handlePreview() {
    if (isRunning) return;
    setIsRunning(true);
    console.log('[AI-DEBUG-UI] Preview Request:', { selectedPlugin, selectedWorkflow, params });
    setLogs([{ level: 'info', message: '引擎初始化中...', time: new Date().toISOString() }]);
    
    try {
      const runResult = await appApi.ai.previewWorkflow(selectedPlugin, selectedWorkflow, {
        userBirth: params.userBirth,
        targetPersona: params.persona,
        tone: params.tone
      });
      
      console.log('[AI-DEBUG-UI] Run Result:', runResult);

      // 捕获生成结果 - 兼容多种可能的字段名
      if (runResult) {
        const state = runResult.state || runResult;
        setResult({
          content: state.finalContent || state.content || '文案生成成功，正在提取...',
          imageUrl: state.imageUrl || state.image || state.url
        });
      }
      
      setLogs(prev => [...prev, { level: 'success', message: '工作流执行序列已完成。', time: new Date().toISOString() }]);
    } catch (error) {
      setLogs(prev => [...prev, { level: 'error', message: `执行失败: ${String(error)}`, time: new Date().toISOString() }]);
    } finally {
      setIsRunning(false);
    }
  }

  const clearLogs = () => setLogs([]);

  return (
    <div className="tw-min-h-screen tw-pb-20 tw-animate-fade-in">
      {/* 顶部标题栏 */}
      <div className="tw-mb-10 tw-flex tw-items-end tw-justify-between tw-border-b tw-border-slate-100 tw-pb-8">
        <div>
          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
             <div className="tw-w-2 tw-h-2 tw-bg-brand-500 tw-rounded-full tw-animate-pulse" />
             <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-[0.3em]">AI Engine v1.0</span>
          </div>
          <h1 className="tw-text-4xl tw-font-black tw-text-slate-900 tw-tracking-tight">Agent 工作台</h1>
          <p className="tw-text-slate-500 tw-text-sm tw-mt-2 tw-font-medium">
             通过高度模块化的节点编排，构建属于您的自动化内容生产流水线。
          </p>
        </div>
        
        <div className="tw-flex tw-items-center tw-gap-4">
           <button className="tw-px-4 tw-py-2 tw-bg-white tw-border tw-border-slate-200 tw-text-slate-600 tw-text-xs tw-font-bold tw-rounded-xl hover:tw-bg-slate-50 tw-transition-all tw-flex tw-items-center tw-gap-2 shadow-sm">
              <History size={14} />
              执行历史
           </button>
           <button 
              onClick={handlePreview}
              disabled={isRunning}
              className="tw-px-6 tw-py-2.5 tw-bg-slate-900 tw-text-white tw-text-xs tw-font-bold tw-rounded-xl hover:tw-bg-slate-800 tw-transition-all tw-flex tw-items-center tw-gap-2 tw-shadow-lg disabled:tw-opacity-50"
           >
              {isRunning ? <Activity className="tw-animate-spin" size={16} /> : <Play size={16} />}
              立即预览运行
           </button>
        </div>
      </div>

      <div className="tw-grid tw-grid-cols-12 tw-gap-10">
        {/* 左侧配置列 */}
        <div className="tw-col-span-12 lg:tw-col-span-4 tw-space-y-10">
          {/* 业务能力列表 */}
          <section>
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-4 tw-px-1">
              <Layers size={16} className="tw-text-brand-500" />
              <h3 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">业务能力库</h3>
            </div>
            <div className="tw-space-y-3">
              <div 
                className={`tw-group tw-relative tw-p-6 tw-bg-white tw-border-2 tw-rounded-[2rem] tw-transition-all hover:tw-shadow-2xl tw-cursor-pointer shadow-premium ${
                  selectedPlugin === 'maoxiaoxian' ? 'tw-border-brand-500 tw-shadow-brand-500/10' : 'tw-border-slate-100'
                }`}
                onClick={() => setSelectedPlugin('maoxiaoxian')}
              >
                <div className="tw-flex tw-items-center tw-gap-5">
                  <div className="tw-w-14 tw-h-14 tw-bg-brand-500 tw-text-white tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-shadow-lg tw-shadow-brand-500/30">
                    <Sparkles size={28} />
                  </div>
                  <div className="tw-flex-1">
                    <div className="tw-text-base tw-font-black tw-text-slate-900">猫小仙内容矩阵</div>
                    <div className="tw-text-xs tw-text-slate-500 tw-mt-1 tw-font-medium">基于命理算法的内容生产流水线</div>
                  </div>
                  <div className="tw-w-8 tw-h-8 tw-bg-slate-50 tw-rounded-full tw-flex tw-items-center tw-justify-center">
                    <ChevronRight size={16} className="tw-text-slate-400" />
                  </div>
                </div>
                
                <div className="tw-mt-6 tw-pt-6 tw-border-t tw-border-slate-50 tw-flex tw-items-center tw-justify-between">
                   <div className="tw-flex tw-items-center tw-gap-2">
                      <div className="tw-w-1.5 tw-h-1.5 tw-bg-green-500 tw-rounded-full" />
                      <span className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">Ready to execute</span>
                   </div>
                   <div className="tw-text-[10px] tw-font-black tw-text-brand-500 tw-bg-brand-50 tw-px-2 tw-py-0.5 tw-rounded-md">
                      V1.2 PREMIUM
                   </div>
                </div>
              </div>

              {workflows.length > 0 && selectedPlugin === 'maoxiaoxian' && (
                <div className="tw-px-4 tw-py-2 tw-bg-brand-50/50 tw-rounded-2xl tw-border tw-border-brand-100/50 tw-mx-2">
                   <div className="tw-text-[10px] tw-font-black tw-text-brand-400 tw-uppercase tw-tracking-widest tw-mb-1">当前选定工作流</div>
                   <div className="tw-text-xs tw-font-bold tw-text-brand-600">每日治愈系话题生成</div>
                </div>
              )}
            </div>
          </section>

          {/* 运行时参数 */}
          <section>
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-4 tw-px-1">
              <Command size={16} className="tw-text-brand-500" />
              <h3 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">运行时配置</h3>
            </div>
            <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-p-8 tw-space-y-8 shadow-premium">
              <div className="tw-space-y-6">
                <div>
                  <label className="tw-block tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-3">生辰八字 (User Birth)</label>
                  <input 
                    type="text" 
                    value={params.userBirth}
                    onChange={(e) => setParams(prev => ({ ...prev, userBirth: e.target.value }))}
                    placeholder="YYYY-MM-DD HH:MM:SS"
                    className="tw-w-full tw-px-0 tw-py-2 tw-bg-transparent tw-border-b tw-border-slate-100 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none tw-transition-all"
                  />
                </div>
                <div>
                  <label className="tw-block tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-3">人设设定 (Persona)</label>
                  <input 
                    type="text" 
                    value={params.persona}
                    onChange={(e) => setParams(prev => ({ ...prev, persona: e.target.value }))}
                    className="tw-w-full tw-px-0 tw-py-2 tw-bg-transparent tw-border-b tw-border-slate-100 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none tw-transition-all"
                  />
                </div>
                <div>
                  <label className="tw-block tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest tw-mb-3">语气风格 (Tone)</label>
                  <input 
                    type="text" 
                    value={params.tone}
                    onChange={(e) => setParams(prev => ({ ...prev, tone: e.target.value }))}
                    className="tw-w-full tw-px-0 tw-py-2 tw-bg-transparent tw-border-b tw-border-slate-100 tw-text-sm tw-font-bold focus:tw-border-brand-500 tw-outline-none tw-transition-all"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 右侧日志流列 */}
        <div className="tw-col-span-8">
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4 tw-px-1">
            <div className="tw-flex tw-items-center tw-gap-2">
              <TerminalIcon size={16} className="tw-text-brand-500" />
              <h3 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">实时执行链路</h3>
            </div>
            <div className="tw-flex tw-items-center tw-gap-2">
               <button onClick={clearLogs} className="tw-p-1.5 tw-text-slate-400 hover:tw-text-slate-900 tw-transition-colors">
                  <Trash2 size={14} />
               </button>
            </div>
          </div>
          
          <div className="tw-bg-slate-50 tw-rounded-[2.5rem] tw-shadow-inner tw-overflow-hidden tw-h-[480px] tw-flex tw-flex-col tw-border tw-border-slate-200">
            {/* 终端顶部 */}
            <div className="tw-px-8 tw-py-5 tw-bg-white/50 tw-backdrop-blur-sm tw-border-b tw-border-slate-200 tw-flex tw-items-center tw-justify-between">
               <div className="tw-flex tw-items-center tw-gap-1.5">
                  <div className="tw-w-2.5 tw-h-2.5 tw-rounded-full tw-bg-slate-200" />
                  <div className="tw-w-2.5 tw-h-2.5 tw-rounded-full tw-bg-slate-200" />
                  <div className="tw-w-2.5 tw-h-2.5 tw-rounded-full tw-bg-slate-200" />
               </div>
               <div className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-widest">
                  Instance: worker-agent-node-01
               </div>
            </div>

            {/* 日志内容 */}
            <div className="tw-flex-1 tw-p-10 tw-overflow-y-auto tw-font-mono tw-text-[13px]">
              {logs.length === 0 && (
                <div className="tw-h-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-opacity-30">
                  <Activity size={64} className="tw-text-slate-400 tw-mb-6" />
                  <div className="tw-text-slate-400 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest">引擎待命 (System Standby)</div>
                </div>
              )}
              <div className="tw-space-y-3">
                {logs.map((log, idx) => (
                  <div key={idx} className="tw-flex tw-gap-6 tw-animate-slide-up">
                    <span className="tw-text-slate-400 tw-shrink-0 tw-tabular-nums">
                      {log?.time ? new Date(log.time).toLocaleTimeString([], { hour12: false }) : '--:--:--'}
                    </span>
                    <div className="tw-flex tw-items-start tw-gap-3">
                      <span className={`${
                        log?.level === 'error' ? 'tw-text-red-600' :
                        log?.level === 'warning' ? 'tw-text-amber-600' :
                        log?.level === 'success' ? 'tw-text-green-600' :
                        'tw-text-slate-500'
                      } tw-font-black`}>
                        [{(log?.level || 'info').toUpperCase()}]
                      </span>
                      <span className="tw-text-slate-700 tw-leading-relaxed">
                        {log?.message || ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div ref={logEndRef} />
            </div>

            {/* 终端状态栏 */}
            <div className="tw-px-8 tw-py-4 tw-bg-white tw-border-t tw-border-slate-200 tw-flex tw-items-center tw-justify-between">
                <div className="tw-flex tw-items-center tw-gap-4">
                   <div className="tw-flex tw-items-center tw-gap-2">
                      <div className="tw-w-1.5 tw-h-1.5 tw-bg-green-500 tw-rounded-full shadow-[0_0_8px_#22c55e]" />
                      <span className="tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase">网关已连接</span>
                   </div>
                   <div className="tw-w-[1px] tw-h-3 tw-bg-slate-200" />
                   <span className="tw-text-[10px] tw-font-mono tw-text-slate-400">实例 ID: AGENT-RX-78</span>
                </div>
                {isRunning && (
                   <div className="tw-flex tw-items-center tw-gap-2 tw-text-brand-500 tw-text-[10px] tw-font-black tw-animate-pulse">
                      <Zap size={12} />
                      正在执行创作流水线...
                   </div>
                )}
            </div>
          </div>

          {/* 成果展示区 (移出日志框，独立显示) */}
          {result && (
            <div className="tw-mt-8 tw-animate-scale-in">
              <div className="tw-flex tw-items-center tw-gap-2 tw-mb-4 tw-px-1">
                <Sparkles size={16} className="tw-text-brand-500" />
                <h3 className="tw-text-xs tw-font-black tw-text-slate-900 tw-uppercase tw-tracking-widest">内容预览成果</h3>
              </div>
              
              <div className="tw-bg-white tw-rounded-[2.5rem] tw-border tw-border-slate-100 tw-p-8 tw-shadow-premium">
                <div className="tw-grid tw-grid-cols-12 tw-gap-10">
                  <div className="tw-col-span-7">
                    <div className="tw-p-6 tw-bg-slate-50 tw-rounded-2xl tw-text-slate-700 tw-text-sm tw-leading-loose tw-italic tw-font-medium tw-border tw-border-slate-100">
                      “ {result.content} ”
                    </div>
                    <div className="tw-mt-6 tw-flex tw-gap-3">
                       <button className="tw-flex-1 tw-py-2.5 tw-bg-brand-500 tw-text-white tw-text-[11px] tw-font-black tw-rounded-xl hover:tw-bg-brand-600 tw-transition-all">立即存为草稿</button>
                       <button className="tw-flex-1 tw-py-2.5 tw-bg-slate-100 tw-text-slate-600 tw-text-[11px] tw-font-black tw-rounded-xl hover:tw-bg-slate-200 tw-transition-all">重新生成</button>
                    </div>
                  </div>
                  <div className="tw-col-span-5">
                    {result.imageUrl ? (
                      <div className="tw-group tw-relative tw-overflow-hidden tw-rounded-2xl tw-border-4 tw-border-white tw-shadow-lg">
                        <img 
                          src={result.imageUrl.startsWith('http') ? result.imageUrl : `atom:///${result.imageUrl}`} 
                          alt="AI Result" 
                          className="tw-w-full tw-h-auto tw-object-cover"
                        />
                      </div>
                    ) : (
                      <div className="tw-aspect-square tw-bg-slate-100 tw-rounded-2xl tw-flex tw-items-center tw-justify-center">
                         <Activity className="tw-animate-spin tw-text-slate-300" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
