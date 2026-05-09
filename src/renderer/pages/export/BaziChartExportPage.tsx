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
      const mockPerson = { name: '白鹿', verifyBirthday: '1994年9月23日', gender: '女', sourceTopicTitle: '白鹿新剧热播霸屏' };
      const mockContent = {
        chartAnalysis: '【命局提要】白鹿，甲戌年癸酉月壬子日生，此为金白水清、杀印相生之格。壬水滔滔，坐子水帝旺，金水势强，身旺无疑。最喜火土暖局调候，锻造锋芒，亦需木来泄秀，方成格局。',
        luckAnalysis: '【近期流年】2026丙午，偏财透干，干支皆火，冲战日支子水。此年机遇与波澜并至，事业必有重要推进，然财来坏印，团队、合约或舆论易生变动，心绪纷扰。2027丁未，官来合身，午未合火，财官之力强旺。此年运势趋于明朗稳定，地位巩固，然竞争不减，宜守宜稳，防范过度消耗。',
        paragraphs: [
          '【命局提要】白鹿，甲戌年癸酉月壬子日生，此为金白水清、杀印相生之格。壬水滔滔，坐子水帝旺，金水势强，身旺无疑。最喜火土暖局调候，锻造锋芒，亦需木来泄秀，方成格局。',
          '【大运复盘】2019年交庚午大运，财官旺地，火来暖局。此运始，资源跃升，主演作品接连播出，人气积聚，辨识度打开。',
          '2022壬寅、2023癸卯，食伤泄秀，才华得显。凭借个性鲜明的角色与综艺表现，观众缘迅猛增长，事业格局突破。',
          '【核心断言】此命金水旺而喜火，事业需逢火运方能大放异彩。感情方面壬水多情，桃花不断但难以长久，需防合约与舆论纷扰。健康方面水旺火弱需注意心血管与内分泌系统，平日宜多运动养阳。',
          '【近期流年】2026丙午，偏财透干，干支皆火，冲战日支子水。此年机遇与波澜并至，事业必有重要推进，然财来坏印，团队、合约或舆论易生变动，心绪纷扰。2027丁未，官来合身，午未合火，财官之力强旺。此年运势趋于明朗稳定，地位巩固，然竞争不减，宜守宜稳，防范过度消耗。'
        ]
      };
      const baziData = extractAndPaipan(`生于 1994年9月23日`, mockPerson, mockContent);
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

  const renderBold = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="tw-font-black tw-text-[#1a1a1a]">{part.slice(2, -2)}</span>;
      }
      return <span key={i} className="tw-font-medium">{part}</span>;
    });
  };

  // 增强版：App 化高亮系统（Tag 化时间戳、干支、核心词汇）
  const renderBoldWithYearHighlight = (str: string) => {
    // 1. 先提取加粗和括号作为一级高亮
    const boldParts = str.split(/(\*\*.*?\*\*|【.*?】)/g);
    return boldParts.map((part, i) => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      const isBracket = part.startsWith('【') && part.endsWith('】');
      
      let text = part;
      if (isBold) text = part.slice(2, -2);
      if (isBracket) text = part.slice(1, -1);
      
      // 【】括号括起来的重点（如事件小标题）：渲染为 App 黑底白字小标签
      if (isBracket) {
         return (
           <span key={`bracket-${i}`} className="tw-inline-flex tw-items-center tw-justify-center tw-bg-[#1a1a1a] tw-text-white tw-font-bold tw-px-[20px] tw-py-[4px] tw-rounded-[14px] tw-mx-[8px] tw-shadow-sm tw-align-middle tw-text-[34px]">
             {text}
           </span>
         );
      }

      // 2. 正则：匹配年份干支组合、命理词汇以及需要手绘下划线的核心事件词
      const regex = /(\d{4}-\d{4}年[甲乙丙丁戊己庚辛壬癸]?[子丑寅卯辰巳午未申酉戌亥]?[运年]?|\d{4}[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥][年运]?|\d{4}-\d{4}年|\d{4}年|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]|七杀|伤官|劫财|羊刃|枭神|比肩|正印|偏印|正官|偏官|正财|偏财|食神|食伤泄秀|贵人|天乙|桃色花边|桃花|财色非议|名誉官司|名誉|出轨|第三者|防范|过度消耗|消耗|爆破|丑闻|花边丑闻|婚姻破裂|破裂|三角感情纠纷|三角感情|心力交瘁|免疫力锐减|免疫力|男女感情|不可控|离婚|结婚|破财|突发|纠纷|绯闻|官司|暴富|恩将仇报|背刺|陷阱|暗算|口角|阻碍|不淑|是非|波折|隐患|危机)/g;
      const segments = text.split(regex);
      
      return segments.map((seg, j) => {
        if (!seg) return null;
        
        // 关键事件词：人工红笔波浪下划线标重点效果
        if (/(桃色花边|财色非议|名誉官司|名誉|出轨|第三者|防范|过度消耗|消耗|爆破|丑闻|花边丑闻|婚姻破裂|破裂|三角感情纠纷|三角感情|心力交瘁|免疫力锐减|免疫力|男女感情|不可控|离婚|结婚|破财|突发|纠纷|绯闻|官司|暴富|恩将仇报|背刺|陷阱|暗算|口角|阻碍|不淑|是非|波折|隐患|危机|食伤泄秀)/.test(seg)) {
           return (
             <span key={`${i}-${j}`} className="tw-relative tw-inline-block tw-font-bold tw-text-[#1a1a1a] tw-mx-[4px]">
               <span className="tw-relative tw-z-10">{seg}</span>
               <svg className="tw-absolute -tw-bottom-[4px] tw-left-[-5%] tw-w-[110%] tw-h-[14px] tw-z-0 tw-text-[#ef4444] tw-opacity-80" viewBox="0 0 100 10" preserveAspectRatio="none">
                 <path d="M2,8 Q25,2 50,6 T98,4" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
               </svg>
             </span>
           );
        }

        // 杀气红：带有攻击性、波折的词汇
        if (/(七杀|伤官|劫财|羊刃|枭神)/.test(seg)) {
           return <span key={`${i}-${j}`} className="tw-font-black tw-text-[#ef4444] tw-mx-[4px]">{seg}</span>;
        }
        // 贵气金：带有福报、正向的词汇
        if (/(正印|正官|正财|偏财|食神|贵人|天乙)/.test(seg)) {
           return <span key={`${i}-${j}`} className="tw-font-black tw-text-[#f59e0b] tw-mx-[4px]">{seg}</span>;
        }
        
        // 年份/大运/干支时间戳：变成 App 风格的流年/大运浅色 Tag
        const isTemporal = /(\d{4}-\d{4}年[甲乙丙丁戊己庚辛壬癸]?[子丑寅卯辰巳午未申酉戌亥]?[运年]?|\d{4}[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥][年运]?|\d{4}-\d{4}年|\d{4}年|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/.test(seg);
        if (isTemporal && seg.length >= 2) {
           return (
             <span key={`${i}-${j}`} className="tw-inline-flex tw-items-center tw-justify-center tw-bg-[#F2F2F7] tw-text-[#1a1a1a] tw-font-black tw-px-[16px] tw-py-[2px] tw-rounded-[12px] tw-mx-[8px] tw-border tw-border-[#e5e5ea] tw-align-baseline tw-text-[36px]">
               <span className="tw-relative tw-top-[-2px]">{seg}</span>
             </span>
           );
        }
        
        if (isBold) {
          return <span key={`${i}-${j}`} className="tw-font-black tw-text-[#1a1a1a]">{seg}</span>;
        }
        return <span key={`${i}-${j}`} className="tw-font-medium">{seg}</span>;
      });
    });
  };

  const MarkdownLine = ({ text }: { text: string }) => {
    const isHighlight = /^(阶段|20\d{2}|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])/.test(text);

    // 解析 【小标题】 格式
    const bracketMatch = text.match(/^【(.*?)】(.*)/);
    if (bracketMatch) {
      const title = bracketMatch[1].trim();
      const content = bracketMatch[2].trim();
      return (
        <div className="tw-mb-[24px]">
          <div className="tw-mt-[48px] tw-mb-[16px] tw-flex tw-items-center">
            <div className="tw-w-[8px] tw-h-[28px] tw-bg-[#003366] tw-rounded-full tw-mr-[16px]"></div>
            <span className="tw-text-[34px] tw-font-black tw-text-[#003366] tw-tracking-widest">{title}</span>
          </div>
          {content && (
            <div className="tw-text-[26px] tw-leading-[1.8] tw-text-[#333] tw-text-justify tw-tracking-wide">
              {renderBold(content)}
            </div>
          )}
        </div>
      );
    }

    if (text.startsWith('### ') || text.startsWith('## ') || text.startsWith('# ')) {
      const content = text.replace(/^#+\s*/, '');
      return (
        <div className="tw-mt-[48px] tw-mb-[24px] tw-flex tw-items-center">
          <div className="tw-w-[8px] tw-h-[28px] tw-bg-[#003366] tw-rounded-full tw-mr-[16px]"></div>
          <span className="tw-text-[34px] tw-font-black tw-text-[#003366] tw-tracking-widest">{renderBold(content)}</span>
        </div>
      );
    }
  
    if (/^[-*]\s+/.test(text)) {
      const content = text.replace(/^[-*]\s+/, '');
      return (
        <div className="tw-flex tw-items-start tw-mb-[20px] tw-pl-[24px]">
          <div className="tw-w-[8px] tw-h-[8px] tw-bg-[#B08D57] tw-rounded-full tw-mt-[16px] tw-mr-[16px] tw-flex-shrink-0"></div>
          <div className="tw-text-[26px] tw-leading-[1.8] tw-text-[#333] tw-text-justify">{renderBold(content)}</div>
        </div>
      );
    }
    
    if (/^\d+\.\s+/.test(text)) {
      const match = text.match(/^(\d+)\.\s+(.*)/);
      if (match) {
        return (
          <div className="tw-flex tw-items-start tw-mb-[20px] tw-pl-[12px]">
            <div className="tw-text-[26px] tw-font-black tw-text-[#003366] tw-w-[48px] tw-flex-shrink-0 tw-mt-[2px]">{match[1]}.</div>
            <div className="tw-text-[26px] tw-leading-[1.8] tw-text-[#333] tw-text-justify">{renderBold(match[2])}</div>
          </div>
        );
      }
    }
  
    return (
      <div className="tw-text-[26px] tw-leading-[1.8] tw-text-[#333] tw-text-justify tw-tracking-wide tw-mb-[24px]">
        {isHighlight ? (
          <span className="tw-font-black tw-text-[#003366] tw-block tw-mb-2">{renderBold(text)}</span>
        ) : (
          renderBold(text)
        )}
      </div>
    );
  };

  // 原生 iOS 风格的顶部导航栏 (NavigationBar)
  const AppNavBar = ({ title, rightText = '' }: { title: string, rightText?: string }) => (
    <div className="tw-bg-white/90 tw-backdrop-blur-xl tw-w-full tw-pt-[88px] tw-pb-[32px] tw-px-[48px] tw-flex tw-items-center tw-justify-between tw-sticky tw-top-0 tw-z-50 tw-shadow-[0_1px_12px_rgba(0,0,0,0.03)] tw-border-b tw-border-[#f0f0f0]">
      <div className="tw-flex tw-items-center tw-gap-[16px] tw-text-[#1a1a1a]">
        {/* 模拟 iOS 的返回箭头 */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        <span className="tw-text-[42px] tw-font-medium">返回</span>
      </div>
      <div className="tw-absolute tw-left-1/2 tw-transform -tw-translate-x-1/2 tw-text-[48px] tw-font-bold tw-text-[#1a1a1a]">{title}</div>
      <div className="tw-text-[42px] tw-text-[#1a1a1a] tw-font-medium">{rightText}</div>
    </div>
  );

  return (
    <div className="tw-fixed tw-inset-0 tw-bg-[#F7F8FA] tw-z-[9999] tw-overflow-auto" style={{ fontFamily: '"PingFang SC", "-apple-system", "Microsoft YaHei", sans-serif' }}>
      <div className="tw-flex tw-flex-col tw-bg-[#F7F8FA]">
      {/* -------------------- Part 2: 大运解析 -------------------- */}
      <div id="bazi-part-2" className="tw-flex tw-flex-col tw-w-[1080px] tw-relative tw-bg-[#F7F8FA] tw-mx-auto" style={{ minHeight: '1080px', boxSizing: 'border-box' }}>

        {daYunList && daYunList.length > 0 && (
          <div className="tw-flex-1 tw-flex tw-flex-col tw-w-full" style={{ boxSizing: 'border-box' }}>
            <AppNavBar title="大运排盘详析" />
            
            <div className="tw-pt-[40px] tw-px-[40px] tw-pb-[24px]">
              {/* 四柱八字排盘卡片 */}
              <div className="tw-bg-white tw-rounded-[40px] tw-p-[48px] tw-mb-[48px] tw-shadow-[0_12px_40px_rgba(0,0,0,0.03)] tw-border tw-border-[#f0f0f0] tw-relative">
                <div className="tw-absolute tw-top-[32px] tw-left-[48px] tw-bg-[#F7F8FA] tw-text-[#666] tw-text-[24px] tw-font-medium tw-px-[24px] tw-py-[12px] tw-rounded-full tw-border tw-border-[#eee]">排盘基准：{data.dateStr}</div>
                <div className="tw-absolute tw-top-[32px] tw-right-[48px] tw-text-[#1a1a1a] tw-text-[32px] tw-font-bold tw-px-[24px] tw-py-[8px] tw-bg-[#fefce8] tw-text-[#a16207] tw-rounded-full">{maskedName}</div>
                
                <div className="tw-flex tw-w-full tw-mt-[80px]">
                  {allPillars.map((pillar: any) => (
                    <div key={pillar.key} className="tw-flex tw-flex-col tw-items-center tw-flex-1 tw-relative">
                      {pillar.key === 'day' && <div className="tw-absolute tw-inset-0 tw-bg-[#F7F8FA] tw-rounded-[24px] tw-z-0 tw-border tw-border-[#eee]"></div>}
                      <div className="tw-relative tw-z-10 tw-flex tw-flex-col tw-items-center tw-w-full tw-py-[32px]">
                        <div className="tw-text-[22px] tw-font-black tw-text-[#1a1a1a] tw-mb-[12px]">{pillar.name}</div>
                        <div className="tw-text-[20px] tw-font-bold tw-text-[#666] tw-mb-[24px]">{pillar.shishen}</div>
                        <div className="tw-text-[80px] tw-font-black tw-leading-none tw-mb-[20px]" style={{ color: pillar.ganColor }}>{pillar.gan}</div>
                        <div className="tw-text-[80px] tw-font-black tw-leading-none tw-mb-[24px]" style={{ color: pillar.zhiColor }}>{pillar.zhi}</div>
                        <div className="tw-text-[20px] tw-font-bold tw-text-[#666]">{pillar.fuxing && pillar.fuxing.length > 0 ? pillar.fuxing[0] : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 大运列表卡片 */}
              <div className="tw-bg-white tw-rounded-[40px] tw-p-[40px] tw-shadow-[0_12px_40px_rgba(0,0,0,0.03)] tw-border tw-border-[#f0f0f0]">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-[40px]">
                  <span className="tw-text-[48px] tw-font-black tw-text-[#1a1a1a]">十年大运起伏</span>
                </div>


            <div className="tw-mb-[24px] tw-flex tw-justify-end tw-w-full">
              <div className="tw-flex tw-items-center tw-space-x-[16px]">
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

                <div className="tw-flex tw-flex-col tw-w-full tw-gap-[24px]">
                  {daYunList.map((item: any, index: number) => (
                    <div key={index} className={`tw-relative tw-flex tw-items-center tw-w-full tw-py-[32px] tw-px-[32px] tw-rounded-[24px] tw-transition-colors ${item.isCurrent ? 'tw-bg-[#F4F7FB] tw-border-l-[8px] tw-border-[#0ea5e9] tw-shadow-sm' : 'tw-bg-[#F7F8FA] tw-border tw-border-[#f0f0f0]'}`}>

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
                          <div className="tw-relative tw-inline-block">
                            <span className="tw-relative tw-z-10 tw-text-[18px] tw-font-bold" style={{ color: feature.color || '#1a1a1a' }}>{feature.name}</span>
                            {item.isCurrent && (
                              <svg className="tw-absolute tw-top-1/2 tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-w-[220%] tw-h-[240%] tw-pointer-events-none tw-text-[#ef4444] tw-opacity-80 tw-z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M50,15 C85,10 95,40 85,70 C70,95 15,90 10,60 C5,30 20,12 55,15" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          {fIdx !== item.tedian.length - 1 && (
                            <span className="tw-text-[#eee] tw-mx-[6px] tw-text-[18px]">|</span>
                          )}
                        </div>
                      )) : (
                        <div className="tw-flex tw-items-center tw-whitespace-nowrap">
                          <div className="tw-relative tw-inline-block">
                            <span className="tw-relative tw-z-10 tw-text-[18px] tw-font-bold tw-text-[#00b050]">贵人</span>
                            {item.isCurrent && (
                              <svg className="tw-absolute tw-top-1/2 tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-w-[220%] tw-h-[240%] tw-pointer-events-none tw-text-[#ef4444] tw-opacity-80 tw-z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M50,15 C85,10 95,40 85,70 C70,95 15,90 10,60 C5,30 20,12 55,15" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="tw-text-[#eee] tw-mx-[12px] tw-text-[18px]">|</span>
                          <div className="tw-relative tw-inline-block">
                            <span className="tw-relative tw-z-10 tw-text-[18px] tw-font-bold tw-text-[#ef4436]">空亡</span>
                            {item.isCurrent && (
                              <svg className="tw-absolute tw-top-1/2 tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-w-[220%] tw-h-[240%] tw-pointer-events-none tw-text-[#ef4444] tw-opacity-80 tw-z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M50,15 C85,10 95,40 85,70 C70,95 15,90 10,60 C5,30 20,12 55,15" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
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
              </div>
            </div>
            <div className="tw-w-full tw-text-center tw-mt-[80px] tw-text-[24px] tw-text-[#bbb] tw-font-bold">数据来源于解盘软件，仅供参考</div>
          </div>
        )}
      </div>

      {/* -------------------- Part 3: 流年概览 -------------------- */}
      <div id="bazi-part-3" className="tw-flex tw-flex-col tw-w-[1080px] tw-relative tw-bg-[#F7F8FA] tw-mx-auto" style={{ minHeight: '1080px', boxSizing: 'border-box' }}>

        {currentYearAnalysis && (
          <div className="tw-flex-1 tw-flex tw-flex-col tw-w-full" style={{ boxSizing: 'border-box' }}>
            <AppNavBar title="流年运势推演" />
            
            <div className="tw-pt-[40px] tw-px-[40px] tw-pb-[24px]">
              {/* App 风格的大标题卡片 */}
              <div className="tw-bg-white tw-rounded-[40px] tw-shadow-[0_12px_40px_rgba(0,0,0,0.03)] tw-border tw-border-[#f0f0f0] tw-p-[48px] tw-mb-[48px] tw-flex tw-items-center tw-justify-between">
                <div className="tw-flex tw-flex-col">
                  <span className="tw-text-[80px] tw-font-black tw-text-[#1a1a1a] tw-tracking-tight tw-leading-none">{currentYearAnalysis.year}年</span>
                  <span className="tw-text-[32px] tw-text-[#888] tw-font-medium tw-mt-[20px]">流年运势核心基调</span>
                </div>
                <div className="tw-flex tw-items-center tw-gap-[16px] tw-bg-[#F7F8FA] tw-px-[32px] tw-py-[20px] tw-rounded-[24px] tw-border tw-border-[#eee]">
                  <span className="tw-text-[64px] tw-font-black" style={{ color: GetGanZhiColor(currentYearAnalysis.ganZhi.charAt(0)) }}>{currentYearAnalysis.ganZhi.charAt(0)}</span>
                  <span className="tw-text-[64px] tw-font-black" style={{ color: GetGanZhiColor(currentYearAnalysis.ganZhi.charAt(1)) }}>{currentYearAnalysis.ganZhi.charAt(1)}</span>
                </div>
              </div>

              <div className="tw-flex tw-flex-col tw-flex-1 tw-gap-[40px]">
                {currentYearAnalysis.list && currentYearAnalysis.list.map((item: any, idx: number) => (
                  <div key={idx} className="tw-flex tw-flex-col tw-bg-white tw-rounded-[40px] tw-p-[48px] tw-shadow-[0_12px_40px_rgba(0,0,0,0.03)] tw-border tw-border-[#f0f0f0]">
                    <div className="tw-flex tw-items-center tw-gap-6 tw-mb-[36px] tw-border-b tw-border-[#f7f8fa] tw-pb-[28px]">
                      <div className="tw-w-[72px] tw-h-[72px] tw-bg-gradient-to-br tw-from-[#1a1a1a] tw-to-[#333333] tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-text-[#f5d996] tw-font-black tw-text-[36px] tw-shadow-md">
                      {item.key.charAt(0)}
                    </div>
                    <span className="tw-text-[48px] tw-font-black tw-text-[#1a1a1a] tw-tracking-widest">
                      {item.key}
                    </span>
                  </div>

                  <div className="tw-mb-[32px] tw-flex tw-flex-col tw-space-y-[24px]">
                    {item.content && item.content.split('；').map((line: string, lidx: number) => {
                      if (!line.trim()) return null;
                      const splitIndex = line.indexOf('：');
                      const title = splitIndex > -1 ? line.substring(0, splitIndex).replace(/|/g, '') + '：' : '';
                      const content = splitIndex > -1 ? line.substring(splitIndex + 1) : line;
                      return (
                        <div key={lidx} className="tw-text-[36px] tw-leading-[1.8] tw-text-[#444] tw-text-justify tw-flex tw-items-start">
                          <span className="tw-w-[14px] tw-h-[14px] tw-bg-[#d4c098] tw-rounded-full tw-mt-[24px] tw-mr-[24px] tw-flex-shrink-0"></span>
                          <div>
                            {title && (
                              <div className="tw-relative tw-inline-block tw-mr-[8px]">
                                <span className="tw-relative tw-z-10 tw-font-black tw-text-[#1a1a1a]">{title}</span>
                                {title.includes('【') && (
                                  <svg className="tw-absolute tw-top-1/2 tw-left-1/2 tw-transform -tw-translate-x-1/2 -tw-translate-y-1/2 tw-w-[110%] tw-h-[140%] tw-pointer-events-none tw-text-[#ef4444] tw-opacity-80 tw-z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M50,15 C85,10 95,40 85,70 C70,95 15,90 10,60 C5,30 20,12 55,15" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            )}
                            <span className="tw-font-medium">{renderBoldWithYearHighlight(content)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(item.analysis || item.mangpai) && (
                    <div className="tw-mt-[24px] tw-pt-[32px] tw-border-t tw-border-dashed tw-border-[#eee] tw-flex tw-flex-col tw-gap-[28px]">
                      {item.analysis && (
                        <div className="tw-bg-white/40 tw-backdrop-blur-md tw-rounded-2xl tw-p-[36px] tw-border tw-border-white/60">
                          <div className="tw-flex tw-items-center tw-mb-[16px]">
                            <div className="tw-w-[8px] tw-h-[24px] tw-bg-[#003366] tw-rounded-full tw-mr-[12px]"></div>
                            <span className="tw-text-[32px] tw-font-black tw-text-[#003366]">命盘引动</span>
                          </div>
                          <span className="tw-block tw-text-[32px] tw-font-medium tw-leading-relaxed tw-text-[#555] tw-text-justify">{renderBoldWithYearHighlight(item.analysis)}</span>
                        </div>
                      )}
                      {item.mangpai && (
                        <div className="tw-bg-white/40 tw-backdrop-blur-md tw-rounded-2xl tw-p-[36px] tw-border tw-border-white/60">
                          <div className="tw-flex tw-items-center tw-mb-[16px]">
                            <div className="tw-w-[8px] tw-h-[24px] tw-bg-[#b08d57] tw-rounded-full tw-mr-[12px]"></div>
                            <span className="tw-text-[32px] tw-font-black tw-text-[#8c6b36]">盲派直断</span>
                          </div>
                          <span className="tw-block tw-text-[32px] tw-font-medium tw-leading-relaxed tw-text-[#666] tw-text-justify">{renderBoldWithYearHighlight(item.mangpai)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="tw-w-full tw-text-center tw-mt-[80px] tw-text-[24px] tw-text-[#bbb] tw-font-bold">数据来源于解盘软件，仅供参考</div>
          </div>
        </div>
        )}
      </div>

      {/* -------------------- Part 4: 盲派分析事件清单 -------------------- */}
      <div id="bazi-part-4" className="tw-flex tw-flex-col tw-w-[1080px] tw-relative tw-bg-[#F7F8FA] tw-mx-auto" style={{ minHeight: '1080px', boxSizing: 'border-box' }}>
        
        <AppNavBar title="盲派分析事件清单" />

        {/* === 正文区域 === */}
        <div className="tw-flex-1 tw-mt-[40px] tw-mx-[40px] tw-mb-[40px]">
          {finalParagraphsToRender.length > 0 && (
            <div className="tw-flex tw-flex-col tw-w-full tw-gap-[40px]">
              {finalParagraphsToRender.reduce((acc: any[], curr: string) => {
                const subParas = curr.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                subParas.forEach(para => {
                  const bracketMatch = para.match(/^【(.*?)】(.*)/);
                  if (bracketMatch) {
                    acc.push({
                      title: bracketMatch[1].trim(),
                      paragraphs: bracketMatch[2].trim() ? [bracketMatch[2].trim()] : []
                    });
                  } else {
                    if (acc.length === 0) {
                      acc.push({ title: '', paragraphs: [] });
                    }
                    acc[acc.length - 1].paragraphs.push(para);
                  }
                });
                return acc;
              }, []).map((section: any, idx: number) => (
                <div key={idx} className="tw-bg-white tw-rounded-[40px] tw-p-[48px] tw-shadow-[0_12px_40px_rgba(0,0,0,0.03)] tw-border tw-border-[#f0f0f0]">
                  {section.title && (
                    <div className="tw-flex tw-items-center tw-gap-[20px] tw-mb-[40px] tw-border-b tw-border-[#f7f8fa] tw-pb-[32px]">
                      <div className="tw-w-[12px] tw-h-[48px] tw-bg-gradient-to-b tw-from-[#1a1a1a] tw-to-[#333333] tw-rounded-full tw-shadow-sm"></div>
                      <span className="tw-text-[54px] tw-font-black tw-text-[#1a1a1a] tw-tracking-widest">
                        {section.title}
                      </span>
                    </div>
                  )}
                  <div className="tw-flex tw-flex-col tw-gap-[36px]">
                    {section.paragraphs.map((para: string, pIdx: number) => (
                      <div key={pIdx} className="tw-text-[44px] tw-leading-[1.9] tw-text-[#333] tw-text-justify tw-tracking-wide">
                        {renderBoldWithYearHighlight(para)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === 底部版权 + CTA === */}
        <div className="tw-mx-[56px] tw-mb-[50px]">
          <div className="tw-w-full tw-h-[1px] tw-bg-[#ddd] tw-mb-[24px]"></div>
          <div className="tw-flex tw-items-center tw-justify-between">
            <span className="tw-text-[22px] tw-text-[#aaa] tw-font-medium tw-tracking-wider">数据来源于解盘软件，仅供参考</span>
            <span className="tw-text-[22px] tw-text-[#bba371] tw-font-bold tw-tracking-widest">扫码测算专属流年运势 👇</span>
          </div>
        </div>
      </div>

    </div>
  </div>
  );
}
