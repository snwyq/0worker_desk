import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Image as ImageIcon, 
  History, 
  Copy, 
  Check, 
  RefreshCw, 
  Type,
  Layout,
  MessageSquare,
  TrendingUp,
  Activity,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { appApi } from '../api';

export function AiWriterPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState<'dashscope' | 'apiyi'>('dashscope');
  const [model, setModel] = useState('qwen-turbo');
  
  // 热点相关状态
  const [hotTopics, setHotTopics] = useState<any[]>([]);
  const [hotLoading, setHotLoading] = useState(false);
  const [hotError, setHotError] = useState<string | null>(null);

  const models = {
    dashscope: [
      { id: 'qwen-turbo', name: '通义千问 Turbo' },
      { id: 'qwen-plus', name: '通义千问 Plus' },
      { id: 'qwen-max', name: '通义千问 Max' },
    ],
    apiyi: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ]
  };

  useEffect(() => {
    loadHotTopics();
  }, []);

  const loadHotTopics = async () => {
    setHotLoading(true);
    setHotError(null);
    try {
      const data = await appApi.ai.listHotTopics();
      setHotTopics(data?.items || []);
    } catch (err) {
      setHotError(String(err));
    } finally {
      setHotLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResult('');
    try {
      const response = await appApi.ai.generate({
        prompt,
        provider,
        model
      });
      setResult(response.content);
    } catch (error) {
      console.error('Generation failed:', error);
      setResult(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProviderChange = (p: 'dashscope' | 'apiyi') => {
    setProvider(p);
    setModel(models[p][0].id);
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setImageUrl('');
    try {
      const response = await appApi.ai.generateImage({ prompt });
      setImageUrl(response.url);
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tw-min-h-screen tw-pb-10 tw-animate-fade-in">
      {/* Header */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-8 tw-border-b tw-border-slate-100 tw-pb-6">
        <div>
          <h1 className="tw-text-3xl tw-font-black tw-text-slate-900 tw-tracking-tight">AI 智能创作</h1>
          <p className="tw-text-slate-400 tw-text-xs tw-mt-1 tw-font-bold tw-uppercase tw-tracking-widest">Digital Content Engine</p>
        </div>
        <div className="tw-flex tw-items-center tw-gap-4">
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="tw-bg-white tw-border tw-border-slate-200 tw-px-4 tw-py-2 tw-rounded-xl tw-text-xs tw-font-bold tw-shadow-sm focus:tw-outline-none tw-transition-all"
          >
            {models[provider].map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="tw-flex tw-bg-slate-100 tw-p-1 tw-rounded-xl">
            <button 
              onClick={() => handleProviderChange('dashscope')}
              className={`tw-px-4 tw-py-1.5 tw-text-[10px] tw-font-black tw-uppercase tw-rounded-lg tw-transition-all ${provider === 'dashscope' ? 'tw-bg-white tw-text-brand-500 tw-shadow-sm' : 'tw-text-slate-400 hover:tw-text-slate-600'}`}
            >
              DashScope
            </button>
            <button 
              onClick={() => handleProviderChange('apiyi')}
              className={`tw-px-4 tw-py-1.5 tw-text-[10px] tw-font-black tw-uppercase tw-rounded-lg tw-transition-all ${provider === 'apiyi' ? 'tw-bg-white tw-text-brand-500 tw-shadow-sm' : 'tw-text-slate-400 hover:tw-text-slate-600'}`}
            >
              Gemini/APIYi
            </button>
          </div>
        </div>
      </div>

      <div className="tw-grid tw-grid-cols-12 tw-gap-8">
        {/* Left Column: Hot Topics灵感库 */}
        <div className="tw-col-span-12 lg:tw-col-span-3 tw-space-y-6">
           <div className="tw-flex tw-items-center tw-justify-between tw-px-2">
              <div className="tw-flex tw-items-center tw-gap-2">
                 <TrendingUp size={16} className="tw-text-brand-500" />
                 <h3 className="tw-text-xs tw-font-black tw-uppercase tw-tracking-widest">实时热点灵感</h3>
              </div>
              <button onClick={loadHotTopics} className="tw-p-1 tw-text-slate-300 hover:tw-text-brand-500">
                 <Activity size={12} className={hotLoading ? 'tw-animate-spin' : ''} />
              </button>
           </div>
           
           <div className="tw-bg-white tw-border tw-border-slate-100 tw-rounded-[2rem] tw-p-4 tw-h-[600px] tw-overflow-y-auto shadow-premium">
              {hotError ? (
                <div className="tw-h-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-red-300 tw-p-4 tw-text-center">
                   <AlertTriangle size={24} className="tw-mb-2 tw-opacity-50" />
                   <div className="tw-text-[10px] tw-font-bold">{hotError}</div>
                </div>
              ) : hotTopics.length > 0 ? (
                <div className="tw-space-y-3">
                   {hotTopics.map((topic, idx) => (
                     <div 
                        key={idx} 
                        onClick={() => setPrompt(`基于热搜“${topic.title}”写一段吸引人的文案：`)}
                        className="tw-group tw-p-4 tw-bg-slate-50 tw-rounded-2xl tw-cursor-pointer hover:tw-bg-brand-500 tw-transition-all"
                     >
                        <div className="tw-flex tw-items-center tw-gap-2 tw-mb-2">
                           <span className="tw-text-[9px] tw-font-black tw-bg-white/80 tw-px-1.5 tw-py-0.5 tw-rounded tw-text-slate-500 group-hover:tw-text-brand-600">{topic.platform}</span>
                           <span className="tw-text-[10px] tw-font-bold tw-text-slate-300 group-hover:tw-text-white/50">{topic.heat}</span>
                        </div>
                        <div className="tw-text-[13px] tw-font-bold tw-text-slate-700 tw-leading-snug group-hover:tw-text-white tw-transition-colors">{topic.title}</div>
                        <div className="tw-mt-3 tw-flex tw-items-center tw-gap-1 tw-text-[9px] tw-font-black tw-uppercase tw-text-brand-500 tw-opacity-0 group-hover:tw-opacity-100 group-hover:tw-text-white tw-transition-all">
                           立即引用 <ChevronRight size={10} />
                        </div>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="tw-h-full tw-flex tw-items-center tw-justify-center tw-text-slate-300 tw-text-xs">
                   加载灵感中...
                </div>
              )}
           </div>
        </div>

        {/* Middle Column: Input Section */}
        <div className="tw-col-span-12 lg:tw-col-span-4 tw-space-y-6">
          <div className="tw-bg-white tw-rounded-[2.5rem] tw-p-8 tw-shadow-xl shadow-premium tw-border tw-border-slate-100">
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-6">
              <div className="tw-p-2 tw-bg-brand-50 tw-rounded-xl">
                <MessageSquare size={18} className="tw-text-brand-500" />
              </div>
              <span className="tw-font-black tw-text-sm tw-uppercase tw-tracking-widest">创作指令</span>
            </div>
            
            <textarea
              className="tw-w-full tw-h-64 tw-p-6 tw-bg-slate-50 tw-border-none tw-rounded-[1.5rem] tw-text-[14px] tw-font-medium focus:tw-ring-4 focus:tw-ring-brand-500/10 tw-transition-all tw-resize-none placeholder:tw-text-slate-300 tw-leading-relaxed"
              placeholder="从左侧选择热点，或在此输入您的创作指令..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="tw-space-y-3 tw-mt-8">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-4 tw-bg-brand-500 tw-text-white tw-rounded-2xl tw-font-black tw-uppercase tw-text-[11px] tw-tracking-widest tw-shadow-xl tw-shadow-brand-500/20 hover:tw-bg-brand-600 disabled:tw-opacity-50 tw-transition-all"
              >
                {isGenerating ? <RefreshCw size={18} className="tw-animate-spin" /> : <Sparkles size={18} />}
                开始智能合成
              </button>
              <button 
                onClick={handleGenerateImage}
                disabled={isGenerating || !prompt.trim()}
                className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-4 tw-bg-white tw-text-slate-900 tw-border tw-border-slate-200 tw-rounded-2xl tw-font-black tw-uppercase tw-text-[11px] tw-tracking-widest hover:tw-bg-slate-50 disabled:tw-opacity-50 tw-transition-all"
              >
                <ImageIcon size={18} />
                生成视觉配图
              </button>
            </div>
          </div>

          <div className="tw-bg-[#f8fafc] tw-rounded-[2rem] tw-p-6 tw-border tw-border-slate-100">
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-4">
              <History size={16} className="tw-text-slate-400" />
              <span className="tw-text-[10px] tw-font-black tw-text-slate-400 tw-uppercase tw-tracking-widest">创作快捷键</span>
            </div>
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              {['爆款文案', '反直觉标题', '小红书风', '专业深度', '幽默吐槽'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setPrompt(p => p + (p ? ' ' : '') + tag)}
                  className="tw-px-4 tw-py-2 tw-bg-white tw-rounded-xl tw-text-[11px] tw-font-bold tw-text-slate-600 tw-border tw-border-slate-100 hover:tw-border-brand-500 hover:tw-text-brand-500 tw-transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Result Section */}
        <div className="tw-col-span-12 lg:tw-col-span-5 tw-space-y-6">
          <div className="tw-bg-white tw-rounded-[2.5rem] tw-p-8 tw-shadow-xl shadow-premium tw-border tw-border-slate-100 tw-min-h-[640px] tw-flex tw-flex-col">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
              <div className="tw-flex tw-items-center tw-gap-3">
                <div className="tw-w-1.5 tw-h-6 tw-bg-brand-500 tw-rounded-full" />
                <h3 className="tw-font-black tw-text-sm tw-uppercase tw-tracking-widest">合成结果</h3>
              </div>
              <div className="tw-flex tw-gap-2">
                <button 
                  onClick={copyToClipboard}
                  disabled={!result}
                  className="tw-p-2.5 tw-text-slate-400 hover:tw-text-brand-500 hover:tw-bg-brand-50 tw-rounded-xl tw-transition-all"
                >
                  {copied ? <Check size={20} className="tw-text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="tw-flex-1">
              {!result && !imageUrl && !isGenerating && (
                <div className="tw-h-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-slate-300">
                  <Layout size={48} className="tw-mb-4 tw-opacity-10" />
                  <p className="tw-text-[10px] tw-font-black tw-uppercase tw-tracking-widest">等待合成指令...</p>
                </div>
              )}
              
              {isGenerating && !result && (
                <div className="tw-h-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-slate-400">
                  <div className="tw-w-12 tw-h-12 tw-border-4 tw-border-slate-100 tw-border-t-brand-500 tw-rounded-full tw-animate-spin tw-mb-6" />
                  <p className="tw-text-[11px] tw-font-black tw-uppercase tw-tracking-widest">AI 算力注入中...</p>
                </div>
              )}

              {result && (
                <div className="tw-prose tw-prose-slate tw-max-w-none">
                  <div className="tw-text-slate-700 tw-leading-relaxed tw-whitespace-pre-wrap tw-text-[15px] tw-font-medium">
                    {result}
                  </div>
                </div>
              )}

              {imageUrl && (
                <div className="tw-mt-8 tw-rounded-3xl tw-overflow-hidden tw-border tw-border-slate-100 tw-shadow-2xl">
                  <img src={imageUrl} alt="AI Generated" className="tw-w-full tw-h-auto" />
                </div>
              )}
            </div>

            {result && (
              <div className="tw-mt-8 tw-pt-8 tw-border-t tw-border-slate-50 tw-flex tw-justify-end">
                <button className="tw-px-8 tw-py-3 tw-bg-slate-900 tw-text-white tw-rounded-2xl tw-text-[11px] tw-font-black tw-uppercase tw-tracking-widest tw-flex tw-items-center tw-gap-3 hover:tw-bg-black tw-transition-all tw-shadow-xl tw-shadow-black/10">
                  <Send size={16} />
                  一键同步至分发队列
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
