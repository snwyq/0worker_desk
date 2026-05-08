import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Solar } from 'lunar-typescript';
import { getShenQiangShenRuo } from '../../utils/bazi/utils';
import { getCommonGeJu, getSpecGeJu } from '../../utils/bazi/geju-engine';
import { getLoveHate } from '../../utils/bazi/lovehate';
import { extractAndPaipan } from '../../utils/bazi/baziExportHelper';

// ----------------- 高级视觉配置 (Modern Oriental) -----------------
const PALETTE = {
  paper: '#FAF9F6', // 宣纸白
  ink: '#1A1A1A',   // 沉香墨
  gold: '#B08D57',  // 赤金
  glass: 'rgba(255, 255, 255, 0.7)',
};

const GAN_ZHI_COLOR_MAP: Record<string, string> = {
  '甲': '#2eaa51', '乙': '#2eaa51', '寅': '#2eaa51', '卯': '#2eaa51', // 亮绿
  '丙': '#ef4436', '丁': '#ef4436', '巳': '#ef4436', '午': '#ef4436', // 亮红
  '戊': '#a17323', '己': '#a17323', '辰': '#a17323', '戌': '#a17323', '丑': '#a17323', '未': '#a17323', // 亮土
  '庚': '#f9bb05', '辛': '#f9bb05', '申': '#f9bb05', '酉': '#f9bb05', // 亮金
  '壬': '#4286f7', '癸': '#4286f7', '亥': '#4286f7', '子': '#4286f7', // 亮蓝
};

const getWuXingColor = (char: string) => GAN_ZHI_COLOR_MAP[char] || '#333';
const GetGanZhiColor = getWuXingColor;
const GetWuxingColor = (wx: string) => {
  const map: Record<string, string> = { '金': '#f9bb05', '木': '#2eaa51', '水': '#4286f7', '火': '#ef4436', '土': '#a17323' };
  return map[wx] || '#333';
};

// ----------------- 离屏渲染入口 -----------------
export function BaziChartExportPage() {
  const [data, setData] = useState<any>(null);

  // 监听主进程发来的数据
  useEffect(() => {
    // 允许本地开发预览
    if (window.location.hash.includes('preview=1')) {
      const mockPerson = { name: '成某', verifyBirthday: '1954年4月7日', gender: '男', sourceTopicTitle: '风云焦点人物' };
      const mockContent = { chartAnalysis: '癸水柔中带刚，灵活适应环境', luckAnalysis: '大运起伏有致，顺风顺水' };
      const baziData = extractAndPaipan(`生于 1954年4月7日`, mockPerson, mockContent);
      setData(baziData);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RENDER_BAZI_CHART') {
        const { person, generatedContent } = event.data.payload;
        // Text is just person details if source text isn't passed, we simulate it
        const baziData = extractAndPaipan(`生于 ${person.verifyBirthday || person.birthday || ''}`, person, generatedContent);
        setData(baziData);
      }
    };
    window.addEventListener('message', handleMessage);
    
    // 增强型数据检测
    const checkData = () => {
      if ((window as any).__BAZI_RENDER_DATA_RAW__) {
        try {
          const { person, generatedContent } = (window as any).__BAZI_RENDER_DATA_RAW__;
          console.log("Starting extraction for:", person?.name);
          const baziData = extractAndPaipan(`生于 ${person.verifyBirthday || person.birthday || ''}`, person, generatedContent);
          setData(baziData);
          
          // 🚀 核心优化：数据准备好后，通知主进程已就绪
          setTimeout(() => {
            (window as any).__RENDER_READY__ = true;
          }, 500);
        } catch (err) {
          console.error("Extraction error:", err);
          // 即使出错也通知就绪，否则主进程会死等 60s
          (window as any).__RENDER_READY__ = true;
          (window as any).__RENDER_ERROR__ = String(err);
        }
        return true;
      }
      return false;
    };

    if (!checkData()) {
      const timer = setInterval(() => {
        if (checkData()) clearInterval(timer);
      }, 100);
      return () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(timer);
      };
    }
    
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!data) {
    return <div className="tw-p-8 tw-text-center tw-text-gray-500">等待注入渲染数据...</div>;
  }

  // 从 helper 接收已经算好的四柱、神煞格局、流年大运数据
  const allPillars = data.allPillars || [];
  const baziExtra = data.baziExtra || {
    shenQiang: '-', geJu: '-', xiwuxing: [], jiwuxing: []
  };
  const hexinYaoSuList = data.hexinYaoSuList || [];

  const daYunList = data.daYunList || [];
  const currentYearAnalysis = data.currentYearAnalysis || null;

  // 姓名脱敏处理
  const getMaskedName = (fullName: string, gender: any) => {
    if (!fullName) return '某先生/女士';
    const surname = fullName.charAt(0);
    // 兼容多种性别表示方式：'女'、0、'0'
    const isFemale = gender === '女' || gender === 0 || gender === '0';
    if (isFemale) {
      return fullName.length >= 3 ? `${surname}某某女士` : `${surname}某女士`;
    } else {
      return fullName.length >= 3 ? `${surname}某某先生` : `${surname}某先生`;
    }
  };

  const maskedName = getMaskedName(data.fullName, data.gender);

  // 全局真名脱敏函数：防止 AI 大模型生成的长文中直呼其名
  const sanitizeName = (text: string) => {
    if (!text || typeof text !== 'string' || !data.fullName) return text;
    return text.split(data.fullName).join(maskedName);
  };

  // 极致兜底与数据提纯逻辑
  const rawParagraphs = data.paragraphs || [];
  const validParagraphs = rawParagraphs.filter((p: string) => p && typeof p === 'string' && p.trim().length > 0);
  const finalParagraphsToRender = validParagraphs.length > 0 
    ? validParagraphs.map(sanitizeName)
    : [data.chartAnalysis, data.luckAnalysis]
        .filter((p: string) => p && typeof p === 'string' && p.trim().length > 0)
        .map(sanitizeName);

  // 重构：专门为微博九宫格防裁剪设计的【下沉式居中海报横幅】
  const HeroHeader = ({ subtitle }: { subtitle: string }) => (
    <div className="tw-pt-[160px] tw-px-[40px] tw-mb-[40px] tw-w-full">
      <div className="tw-bg-gradient-to-br tw-from-[#003366] tw-to-[#00152b] tw-py-[80px] tw-px-[40px] tw-rounded-2xl tw-shadow-[0_20px_40px_rgba(0,51,102,0.15)] tw-flex tw-flex-col tw-items-center tw-justify-center tw-relative tw-overflow-hidden">
         <div className="tw-absolute tw-text-[#ffffff] tw-opacity-[0.03] tw-font-black tw-text-[240px] tw-whitespace-nowrap tw-select-none tw-top-1/2 tw-transform -tw-translate-y-1/2" style={{ fontFamily: 'STZhongsong, STSong, serif' }}>
           {maskedName}
         </div>
         <div className="tw-relative tw-z-10 tw-text-[#f5d996] tw-text-[90px] tw-font-black tw-tracking-[0.1em] tw-mb-[24px] tw-leading-none" style={{ fontFamily: 'STZhongsong, STSong, serif' }}>
           {maskedName}
         </div>
         <div className="tw-relative tw-z-10 tw-flex tw-items-center tw-gap-[24px]">
            <span className="tw-w-[60px] tw-h-[3px] tw-bg-[#B08D57]"></span>
            <span className="tw-text-[36px] tw-text-[#f5d996] tw-tracking-widest tw-font-bold tw-opacity-90">
              {subtitle}
            </span>
            <span className="tw-w-[60px] tw-h-[3px] tw-bg-[#B08D57]"></span>
         </div>
      </div>
    </div>
  );

  return (
    <div className="tw-fixed tw-inset-0 tw-bg-white tw-z-[9999] tw-overflow-auto">
      <div className="tw-flex tw-flex-col tw-bg-[#f7f7f7]">
      {/* -------------------- Part 1: 四柱排盘 -------------------- */}
      <div id="bazi-part-1" className="tw-flex tw-flex-col tw-w-[1080px] tw-relative tw-bg-[#f7f7f7] tw-overflow-hidden tw-mx-auto" style={{ minHeight: '1080px', boxSizing: 'border-box' }}>
        <HeroHeader subtitle="核心排盘数据" />
        <div className="tw-px-[40px] tw-mb-[32px] tw-text-center">
           <span className="tw-text-[24px] tw-text-[#666] tw-bg-white tw-px-[24px] tw-py-[8px] tw-rounded-full tw-shadow-sm">排盘基准时间：{data.dateStr}</span>
        </div>
        {data.chartAnalysis && data.chartAnalysis !== '命局解析' && (
          <div className="tw-px-[40px] tw-mb-[40px]">
            <div className="tw-bg-[#ffffff] tw-border-l-[8px] tw-border-[#003366] tw-py-[24px] tw-px-[32px] tw-rounded-r-xl tw-shadow-sm">
               <div className="tw-text-[26px] tw-font-bold tw-text-[#333] tw-leading-relaxed">{sanitizeName(data.chartAnalysis)}</div>
            </div>
          </div>
        )}

        <div className="tw-flex tw-w-full tw-px-[40px] tw-mt-[40px] tw-mb-[20px] tw-gap-2">
          {allPillars.map((pillar: any) => (
            <div key={pillar.key} className="tw-flex tw-flex-col tw-items-center tw-flex-1 tw-relative">
              {pillar.key === 'day' && <div className="tw-absolute tw-inset-0 tw-bg-[#f8fafc] tw-rounded-xl tw-z-0"></div>}
              
              <div className="tw-relative tw-z-10 tw-flex tw-flex-col tw-items-center tw-w-full tw-py-[32px]">
                <div className="tw-text-[14px] tw-font-black tw-text-[#ccc] tw-tracking-widest tw-mb-2">{pillar.enName}</div>
                <div className="tw-text-[26px] tw-font-black tw-text-[#1a1a1a] tw-mb-4">{pillar.name}</div>
                <div className="tw-text-[18px] tw-font-bold tw-text-[#666] tw-mb-[32px]">{pillar.shishen}</div>

                <div className="tw-text-[96px] tw-font-black tw-leading-none tw-mb-[24px]" style={{ color: pillar.ganColor }}>{pillar.gan}</div>
                <div className="tw-text-[96px] tw-font-black tw-leading-none tw-mb-[24px]" style={{ color: pillar.zhiColor }}>{pillar.zhi}</div>

                <div className="tw-flex tw-flex-col tw-items-center tw-space-y-2 tw-mb-[40px]">
                  {pillar.canggan.map((gan: string, i: number) => (
                    <div key={i} className="tw-flex tw-items-center tw-space-x-2">
                      <span className="tw-text-[22px] tw-font-black" style={{ color: GetGanZhiColor(gan) }}>{gan}</span>
                      <span className="tw-text-[16px] tw-text-[#999] tw-font-medium">{pillar.fuxing[i]}</span>
                    </div>
                  ))}
                </div>

                <div className="tw-w-[40px] tw-h-[1px] tw-bg-[#ddd] tw-mb-[32px]"></div>

                <div className="tw-text-[18px] tw-text-[#999] tw-mb-3">{pillar.nayin}</div>
                <div className="tw-text-[22px] tw-font-bold" style={{ color: pillar.key === 'year' ? '#ef4436' : '#4286f7' }}>{pillar.kongwang}</div>
                <div className="tw-text-[18px] tw-text-[#999] tw-mt-3">{pillar.dishi}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="tw-px-[40px] tw-mb-[20px]">
           <div className="tw-w-full tw-h-[1px] tw-bg-[#eee]"></div>
        </div>

        {/* 强弱格局与神煞 */}
        <div className="tw-px-[40px] tw-pb-[60px]">
          <div className="tw-flex tw-gap-[20px] tw-mb-[40px]">
            <div className="tw-flex-[0.8] tw-bg-[#fcfcfc] tw-border tw-border-[#eee] tw-rounded-xl tw-flex tw-flex-col tw-items-center tw-justify-center tw-py-[32px]">
              <span className="tw-text-[20px] tw-text-[#999] tw-mb-[16px]">强弱研判</span>
              <span className="tw-text-[64px] tw-font-black tw-text-[#1a1a1a]">{baziExtra.shenQiang}</span>
            </div>
            <div className="tw-flex-1 tw-flex tw-flex-col tw-gap-[20px]">
              <div className="tw-bg-[#fcfcfc] tw-border tw-border-[#eee] tw-rounded-xl tw-flex tw-items-center tw-px-[32px] tw-py-[28px]">
                <span className="tw-text-[20px] tw-text-[#999] tw-mr-6">核心格局</span>
                <span className="tw-text-[34px] tw-font-black tw-text-[#1a1a1a]">{baziExtra.geJu}</span>
              </div>
              <div className="tw-flex tw-gap-[20px]">
                <div className="tw-flex-1 tw-bg-[#fcfcfc] tw-border tw-border-[#eee] tw-rounded-xl tw-py-[24px] tw-flex tw-flex-col tw-items-center">
                  <span className="tw-text-[18px] tw-text-[#999] tw-mb-[12px]">喜用神</span>
                  <div className="tw-flex tw-gap-2">
                    {baziExtra.xiwuxing.map((wx: string) => <span key={wx} className="tw-text-[36px] tw-font-black" style={{ color: GetWuxingColor(wx) }}>{wx}</span>)}
                  </div>
                </div>
                <div className="tw-flex-1 tw-bg-[#fcfcfc] tw-border tw-border-[#eee] tw-rounded-xl tw-py-[24px] tw-flex tw-flex-col tw-items-center">
                  <span className="tw-text-[18px] tw-text-[#999] tw-mb-[12px]">忌神</span>
                  <div className="tw-flex tw-gap-2">
                    {baziExtra.jiwuxing.map((wx: string) => <span key={wx} className="tw-text-[36px] tw-font-black" style={{ color: GetWuxingColor(wx) }}>{wx}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="tw-flex tw-flex-col tw-gap-[28px] tw-px-[10px]">
            {hexinYaoSuList.map((item: any, i: number) => (
              <div key={i} className={`tw-flex tw-items-center tw-text-[24px] ${item.items && item.items.length ? '' : 'tw-opacity-40'}`}>
                <span className="tw-text-[#999] tw-w-[180px] tw-flex-shrink-0">{item.label}</span>
                <span className="tw-text-[#333]">
                  {item.items && item.items.length ? (
                    <>
                      {item.prefix}
                      {item.items.map((zItem: any, zIdx: number) => (
                        <span key={zIdx}>
                          <span className="tw-font-black" style={{ color: zItem.color }}>{zItem.text}</span>
                          {zIdx < item.items.length - 1 && <span className="tw-mx-[4px]">、</span>}
                        </span>
                      ))}
                      {item.suffix}
                    </>
                  ) : (
                    item.empty
                  )}
                </span>
              </div>
            ))}
          </div>
          
          <div className="tw-w-full tw-text-left tw-mt-[80px] tw-text-[20px] tw-text-[#bbb] tw-font-bold">数据来源于解盘软件，仅供参考</div>
        </div>
      </div>

      {/* -------------------- Part 2: 大运解析 -------------------- */}
      <div id="bazi-part-2" className="tw-flex tw-flex-col tw-w-[1080px] tw-relative tw-bg-[#f7f7f7] tw-mx-auto" style={{ minHeight: '1080px', boxSizing: 'border-box' }}>
        <HeroHeader subtitle="大运人生复盘" />

        {daYunList && daYunList.length > 0 && (
          <div className="tw-py-[24px] tw-px-[40px] tw-flex-1 tw-flex tw-flex-col tw-w-full" style={{ boxSizing: 'border-box' }}>
            <div className="tw-mb-[40px] tw-flex tw-items-center tw-justify-center tw-relative tw-w-full">
              <span className="tw-text-[44px] tw-font-black tw-text-[#1a1a1a]">大运顺滞情况</span>

              <div className="tw-absolute tw-right-0 tw-flex tw-items-center tw-space-x-[16px]">
                <div className="tw-flex tw-items-center tw-space-x-[8px]">
                  <div className="tw-w-[16px] tw-h-[16px] tw-bg-[#00b050] tw-rounded-sm"></div>
                  <span className="tw-text-[18px] tw-text-[#666]">顺</span>
                </div>
                <div className="tw-flex tw-items-center tw-space-x-[8px]">
                  <div className="tw-w-[16px] tw-h-[16px] tw-bg-[#ccc] tw-rounded-sm"></div>
                  <span className="tw-text-[18px] tw-text-[#666]">滞</span>
                </div>
              </div>
            </div>

            <div className="tw-mb-[32px] tw-flex-shrink-0">
              <div className="tw-px-[40px] tw-py-[32px] tw-bg-[#ffffff] tw-border-l-[12px] tw-border-[#003366] tw-rounded-r-xl tw-shadow-sm tw-flex tw-flex-col">
                <span className="tw-text-[42px] tw-text-[#1a1a1a] tw-font-black tw-mb-[4px]">
                  {maskedName}
                </span>
                <span className="tw-text-[22px] tw-text-[#999] tw-mb-[16px]">大运历程 / {data.dateStr}</span>
                {data.luckAnalysis && data.luckAnalysis !== '' && (
                  <span className="tw-text-[26px] tw-font-bold tw-text-[#333] tw-leading-relaxed">{data.luckAnalysis}</span>
                )}
              </div>
            </div>

            <div className="tw-flex tw-flex-col tw-flex-1 tw-gap-[16px]">
              {daYunList.map((item: any, index: number) => (
                <div key={index} className={`tw-relative tw-flex tw-items-center tw-w-full tw-py-[24px] tw-px-[24px] tw-rounded-xl tw-transition-colors ${item.isCurrent ? 'tw-bg-[#f8fafc] tw-border-l-[6px] tw-border-[#003366]' : 'tw-bg-[#fcfcfc] tw-border tw-border-transparent'}`}>

                  <div className="tw-flex tw-flex-col tw-w-[160px] tw-flex-shrink-0">
                    <span className={`tw-text-[32px] tw-font-black tw-leading-none tw-whitespace-nowrap ${item.isCurrent ? 'tw-text-[#003366]' : 'tw-text-[#1a1a1a]'}`}>
                      {item.DaYunStarAge}-{item.DaYunEndAge}岁
                    </span>
                    <span className="tw-text-[18px] tw-text-[#999] tw-mt-[8px] tw-whitespace-nowrap">{item.DaYunStarYear}-{item.DaYunEndYear}</span>
                  </div>

                  <div className="tw-flex tw-items-center tw-w-[140px] tw-flex-shrink-0">
                    <div className="tw-flex tw-flex-col">
                      <div className="tw-flex tw-space-x-[4px] tw-whitespace-nowrap tw-leading-none">
                        <span className="tw-text-[48px] tw-font-black" style={{ color: GetGanZhiColor(item.DaYunGanZhi[0]) }}>{item.DaYunGanZhi[0]}</span>
                        <span className="tw-text-[48px] tw-font-black" style={{ color: GetGanZhiColor(item.DaYunGanZhi[1]) }}>{item.DaYunGanZhi[1]}</span>
                      </div>
                      <div className="tw-flex tw-space-x-[12px] tw-mt-[8px] tw-whitespace-nowrap tw-ml-[4px]">
                        <span className="tw-text-[16px] tw-text-[#999]">{item.DaYunShiShenGan || '正印'}</span>
                        <span className="tw-text-[16px] tw-text-[#999]">{item.DaYunShiShenZhi || '偏财'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="tw-flex-1 tw-flex tw-flex-col tw-justify-center tw-pl-[24px]">
                    <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-[12px] tw-gap-y-[8px] tw-w-full tw-mb-[16px]">
                      {item.tedian && item.tedian.length > 0 ? item.tedian.map((feature: any, fIdx: number) => (
                        <div key={fIdx} className="tw-flex tw-items-center tw-whitespace-nowrap">
                          <span className="tw-text-[18px] tw-font-bold" style={{ color: feature.color || '#1a1a1a' }}>{feature.name}</span>
                          {fIdx !== item.tedian.length - 1 && (
                            <span className="tw-text-[#eee] tw-mx-[4px] tw-text-[18px]">|</span>
                          )}
                        </div>
                      )) : (
                        <div className="tw-flex tw-items-center tw-whitespace-nowrap">
                          <span className="tw-text-[18px] tw-font-bold tw-text-[#00b050]">贵人</span>
                          <span className="tw-text-[#eee] tw-mx-[12px] tw-text-[18px]">|</span>
                          <span className="tw-text-[18px] tw-font-bold tw-text-[#ef4436]">空亡</span>
                        </div>
                      )}
                    </div>

                    <div className="tw-flex tw-items-center tw-h-[42px] tw-rounded-md tw-overflow-hidden tw-w-full">
                      <div className={`tw-flex-1 tw-h-full tw-flex tw-items-center tw-justify-center tw-transition-colors ${item.isLuckyGan ? 'tw-bg-[#00b050]' : 'tw-bg-[#eee]'}`}>
                        <span className={`tw-text-[18px] tw-font-bold tw-whitespace-nowrap ${item.isLuckyGan ? 'tw-text-white' : 'tw-text-[#999]'}`}>
                          前5年{item.isLuckyGan ? '顺' : '滞'}
                        </span>
                      </div>
                      <div className="tw-w-[2px] tw-h-full tw-bg-white"></div>
                      <div className={`tw-flex-1 tw-h-full tw-flex tw-items-center tw-justify-center tw-transition-colors ${item.isLuckyZhi ? 'tw-bg-[#00b050]' : 'tw-bg-[#eee]'}`}>
                        <span className={`tw-text-[18px] tw-font-bold tw-whitespace-nowrap ${item.isLuckyZhi ? 'tw-text-white' : 'tw-text-[#999]'}`}>
                          后5年{item.isLuckyZhi ? '顺' : '滞'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="tw-w-full tw-text-left tw-mt-[80px] tw-text-[20px] tw-text-[#bbb] tw-font-bold">数据来源于解盘软件，仅供参考</div>
          </div>
        )}
      </div>

      {/* -------------------- Part 3: 流年概览 -------------------- */}
      <div id="bazi-part-3" className="tw-flex tw-flex-col tw-w-[1080px] tw-relative tw-bg-[#f7f7f7] tw-mx-auto" style={{ minHeight: '1080px', boxSizing: 'border-box' }}>
        <HeroHeader subtitle="近期流年推演" />

        {currentYearAnalysis && (
          <div className="tw-py-[24px] tw-px-[40px] tw-flex-1 tw-flex tw-flex-col tw-w-full" style={{ boxSizing: 'border-box' }}>
            <div className="tw-mb-[32px] tw-flex tw-items-center tw-justify-between">
            </div>

            <div className="tw-mb-[24px] tw-flex tw-items-baseline tw-space-x-[12px]">
              <span className="tw-text-[84px] tw-font-black tw-text-[#1a1a1a] tw-tracking-tighter tw-leading-none">{currentYearAnalysis.year}</span>
              <div className="tw-flex tw-items-center">
                <span className="tw-text-[48px] tw-font-black tw-leading-none" style={{ color: GetGanZhiColor(currentYearAnalysis.ganZhi.charAt(0)) }}>{currentYearAnalysis.ganZhi.charAt(0)}</span>
                <span className="tw-text-[48px] tw-font-black tw-leading-none" style={{ color: GetGanZhiColor(currentYearAnalysis.ganZhi.charAt(1)) }}>{currentYearAnalysis.ganZhi.charAt(1)}</span>
              </div>
            </div>

            <div className="tw-mb-[40px]">
              <div className="tw-px-[40px] tw-py-[32px] tw-bg-[#ffffff] tw-border-l-[12px] tw-border-[#003366] tw-rounded-r-xl tw-shadow-sm tw-flex tw-flex-col">
                <span className="tw-text-[42px] tw-text-[#1a1a1a] tw-font-black tw-mb-2">
                  {maskedName}
                </span>
                <span className="tw-text-[22px] tw-text-[#999]">
                  {currentYearAnalysis.year}年度整体情况
                </span>
              </div>
            </div>

            <div className="tw-flex tw-flex-col tw-flex-1 tw-gap-[32px]">
              {currentYearAnalysis.list && currentYearAnalysis.list.map((item: any, idx: number) => (
                <div key={idx} className="tw-flex tw-flex-col">
                  <div className="tw-flex tw-items-center tw-gap-3 tw-mb-[20px]">
                    <div className="tw-w-[32px] tw-h-[32px] tw-bg-[#1a1a1a] tw-rounded tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-text-[16px]">
                      {item.key.charAt(0)}
                    </div>
                    <span className="tw-text-[26px] tw-font-black tw-text-[#1a1a1a]">
                      {item.key}
                    </span>
                  </div>

                  <div className="tw-mb-[24px] tw-flex tw-flex-col tw-space-y-[12px]">
                    {item.content && item.content.split('；').map((line: string, lidx: number) => {
                      if (!line.trim()) return null;
                      const splitIndex = line.indexOf('：');
                      const title = splitIndex > -1 ? line.substring(0, splitIndex).replace(/|/g, '') + '：' : '';
                      const content = splitIndex > -1 ? line.substring(splitIndex + 1) : line;
                      return (
                        <div key={lidx} className="tw-text-[22px] tw-leading-relaxed tw-text-[#333] tw-text-justify">
                          {title && <span className="tw-font-black tw-text-[#1a1a1a]">{title}</span>}
                          <span className="tw-font-medium">{content}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="tw-flex tw-flex-col tw-space-y-[16px]">
                    {item.analysis && (
                      <div className="tw-bg-[#f8fafc] tw-border tw-border-[#eee] tw-rounded-xl tw-p-[24px]">
                        <div className="tw-mb-[12px]">
                          <span className="tw-text-[20px] tw-font-black tw-text-[#003366]">命盘引动</span>
                        </div>
                        <span className="tw-block tw-text-[20px] tw-font-medium tw-leading-relaxed tw-text-[#666] tw-text-justify">{item.analysis}</span>
                      </div>
                    )}
                    {item.mangpai && (
                      <div className="tw-bg-[#fcfcfc] tw-border tw-border-[#eee] tw-rounded-xl tw-p-[24px]">
                        <div className="tw-mb-[12px]">
                          <span className="tw-text-[20px] tw-font-black tw-text-[#1a1a1a]">盲派直断</span>
                        </div>
                        <span className="tw-block tw-text-[20px] tw-font-medium tw-leading-relaxed tw-text-[#666] tw-text-justify">{item.mangpai}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="tw-w-full tw-text-left tw-mt-[80px] tw-text-[20px] tw-text-[#bbb] tw-font-bold">数据来源于解盘软件，仅供参考</div>
          </div>
        )}
      </div>

      {/* -------------------- Part 4: AI 命理断言长文 -------------------- */}
      <div id="bazi-part-4" className="tw-flex tw-flex-col tw-w-[1080px] tw-relative tw-bg-[#f7f7f7] tw-mx-auto" style={{ boxSizing: 'border-box' }}>
        <HeroHeader subtitle="运势深度揭秘" />

        {finalParagraphsToRender.length > 0 && (
          <div className="tw-py-[24px] tw-px-[40px] tw-flex-1 tw-flex tw-flex-col tw-w-full" style={{ boxSizing: 'border-box' }}>
            <div className="tw-bg-[#ffffff] tw-border tw-border-[#e5e5e5] tw-rounded-2xl tw-p-[40px] tw-shadow-sm tw-flex-1">
              <div className="tw-flex tw-flex-col tw-space-y-[32px]">
                {finalParagraphsToRender.reduce((acc: string[], curr: string) => {
                  const subParas = curr.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                  acc.push(...subParas);
                  return acc;
                }, []).map((para: string, idx: number) => {
                  const isHighlight = /^(阶段|20\d{2}|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/.test(para);
                  
                  if (idx === 0) {
                    return (
                      <div key={idx} className="tw-bg-gradient-to-r tw-from-[#003366] tw-to-[#002244] tw-text-[#f5d996] tw-p-[40px] tw-rounded-2xl tw-shadow-xl tw-relative tw-z-10 tw-my-[20px]">
                         <span className="tw-text-[48px] tw-font-black tw-leading-snug tw-tracking-widest">
                           {para}
                         </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={idx} className="tw-text-[26px] tw-leading-relaxed tw-text-[#333] tw-text-justify tw-tracking-wide">
                      {isHighlight ? (
                        <span className="tw-font-black tw-text-[#003366] tw-block tw-mb-2">{para}</span>
                      ) : (
                        <span className="tw-font-medium">{para}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tw-mt-auto tw-pt-[80px] tw-mb-[40px] tw-w-full">
              <div className="tw-w-full tw-h-[1px] tw-bg-[#e5e5e5] tw-mb-[30px]"></div>
              <div className="tw-flex tw-items-center tw-justify-between">
                <span className="tw-text-[20px] tw-text-[#888] tw-font-bold tw-tracking-widest">数据来源于解盘软件，仅供参考</span>
                <span className="tw-text-[20px] tw-text-[#bba371] tw-font-bold tw-tracking-widest">扫码测算专属流年运势 👇</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  </div>
  );
}
