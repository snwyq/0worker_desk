import { Solar, LunarUtil } from 'lunar-typescript';
import { getShenQiangShenRuo } from './utils';
import { getGanShiShen, getTaoHua, getYiMa, getYangRen, getLushen, getTianYi, getCaiKuEls } from './zytransform';
import { getCommonGeJu } from './geju-engine';
import { getLoveHate } from './lovehate';

const GAN_ZHI_COLOR_MAP: Record<string, string> = {
  '甲': '#2eaa51', '乙': '#2eaa51', '寅': '#2eaa51', '卯': '#2eaa51',
  '丙': '#ef4436', '丁': '#ef4436', '巳': '#ef4436', '午': '#ef4436',
  '戊': '#a17323', '己': '#a17323', '辰': '#a17323', '戌': '#a17323', '丑': '#a17323', '未': '#a17323',
  '庚': '#f9bb05', '辛': '#f9bb05', '申': '#f9bb05', '酉': '#f9bb05',
  '壬': '#4286f7', '癸': '#4286f7', '亥': '#4286f7', '子': '#4286f7',
};

const getWuXingColor = (char: string) => GAN_ZHI_COLOR_MAP[char] || '#333';

export function extractAndPaipan(text: string, person: any, generatedContent: any) {
  const match = text.match(
    /(?:出生|生于)[^\d]*?(\d{4})[年-](\d{1,2})[月-](\d{1,2})(?:日)?(?:.*?([上下]午|凌晨|早[上晨]?|晚[上间]?|夜里|夜间)?\s*(\d{1,2})(?:[点时:]))?/
  ) || text.match(
    /(\d{4})[年-](\d{1,2})[月-](\d{1,2})(?:日)?(?:.*?([上下]午|凌晨|早[上晨]?|晚[上间]?|夜里|夜间)?\s*(\d{1,2})(?:[点时:]))?/
  );

  let y = 1990, m = 1, d = 1, h = 12;
  if (match) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3]);
    if (match[5]) {
      let hour = Number(match[5]);
      const period = match[4] || '';
      if (['下午', '傍晚', '晚上', '夜间', '夜里', '晚'].includes(period) && hour < 12) hour += 12;
      else if (period === '凌晨' && hour === 12) hour = 0;
      h = hour;
    }
  }

  const solar = Solar.fromYmdHms(y, m, d, h, 0, 0);
  const bazi = solar.getLunar().getEightChar();
  const allPillars = ['Year', 'Month', 'Day', 'Time'].map((key, idx) => {
    let gan = (bazi as any)[`get${key}Gan`]() || '';
    let zhi = (bazi as any)[`get${key}Zhi`]() || '';

    let shishen = idx === 2 ? '日主' : (typeof (bazi as any)[`get${key}ShiShenGan`] === 'function' ? (bazi as any)[`get${key}ShiShenGan`]() : '');
    let canggan = typeof (bazi as any)[`get${key}HideGan`] === 'function' ? (bazi as any)[`get${key}HideGan`]() : [];
    let fuxing = typeof (bazi as any)[`get${key}ShiShenZhi`] === 'function' ? (bazi as any)[`get${key}ShiShenZhi`]() : [];
    let nayin = typeof (bazi as any)[`get${key}NaYin`] === 'function' ? (bazi as any)[`get${key}NaYin`]() : '';
    let dishi = typeof (bazi as any)[`get${key}DiShi`] === 'function' ? (bazi as any)[`get${key}DiShi`]() : '';
    let kongwang = typeof (bazi as any)[`get${key}XunKong`] === 'function' ? (bazi as any)[`get${key}XunKong`]() : '';

    if (idx === 3) {
      gan = '*'; zhi = '*'; shishen = '*'; canggan = ['*']; fuxing = ['*']; nayin = '*'; dishi = '*'; kongwang = '*';
    }

    const labels = ['year', 'month', 'day', 'time'];
    const names = ['年柱', '月柱', '日柱', '时柱'];
    const enNames = ['YEAR', 'MONTH', 'DAY', 'HOUR'];

    return {
      key: labels[idx], name: names[idx], enName: enNames[idx],
      gan, ganColor: idx === 3 ? '#ccc' : getWuXingColor(gan),
      zhi, zhiColor: idx === 3 ? '#ccc' : getWuXingColor(zhi),
      shishen, canggan, fuxing, nayin, dishi, kongwang
    };
  });

  const dayGan = bazi.getDayGan();
  const yearZhi = bazi.getYearZhi();
  const dayZhi = bazi.getDayZhi();
  const yearGan = bazi.getYearGan();
  const dayWuXingObj = bazi.getDayWuXing();
  const dayWuXing = dayWuXingObj ? dayWuXingObj[0] : '';

  const tianyiBase = [...getTianYi(yearGan), ...getTianYi(dayGan)];
  const yimaBase = getYiMa(yearZhi) === getYiMa(dayZhi) ? [getYiMa(yearZhi)] : [getYiMa(yearZhi), getYiMa(dayZhi)];
  const taohuaBase = getTaoHua(yearZhi) === getTaoHua(dayZhi) ? [getTaoHua(yearZhi)] : [getTaoHua(yearZhi), getTaoHua(dayZhi)];

  let xiwuxing: string[] = [];
  let jiwuxing: string[] = [];
  let geJu = '-';
  try {
    const _gejuInfo: any = getCommonGeJu(bazi);
    if (_gejuInfo && _gejuInfo.length > 0) {
      geJu = _gejuInfo[0].result || _gejuInfo[0].geJu || '-';
    }
    const loveHateRes: any = getLoveHate(bazi);
    if (loveHateRes && loveHateRes.length > 0) {
      xiwuxing = loveHateRes[0].xiWuxing || [];
      jiwuxing = loveHateRes[0].jiWuxing || [];
    }
  } catch (e) {
    console.error("love hate calc error:", e);
  }
  
  let shenQiangRes = { result: '-' };
  try {
    shenQiangRes = getShenQiangShenRuo(bazi);
  } catch (e) {
    console.error("ShenQiang calculation error:", e);
  }

  const baziExtra = {
    taohua: [...new Set(taohuaBase.filter(Boolean))],
    yima: [...new Set(yimaBase.filter(Boolean))],
    yangren: getYangRen(dayGan) || '',
    lushen: getLushen(dayGan) || '',
    tianyi: [...new Set(tianyiBase.filter(Boolean))],
    caiku: getCaiKuEls(dayWuXing) || '',
    shenQiang: shenQiangRes.result || '-',
    geJu,
    xiwuxing,
    jiwuxing
  };

  const zhiAnimalMap: Record<string, string> = { '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔', '辰': '龙', '巳': '蛇', '午': '马', '未': '羊', '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪' };

  const hexinYaoSuList = [
    { label: '感情·看桃花', chars: baziExtra.taohua, prefix: '多在 ', suffix: ' 年。', empty: '原局无明显桃花。' },
    { label: '搬迁·看驿马', chars: baziExtra.yima, prefix: '多在 ', suffix: ' 年。', empty: '原局无明显驿马。' },
    { label: '意外·看阳刃', chars: baziExtra.yangren, prefix: '多在 ', suffix: ' 年。', empty: '原局无明显阳刃。' },
    { label: '吃喝·看禄神', chars: baziExtra.lushen, prefix: '多在 ', suffix: ' 年。', empty: '原局无明显禄神。' },
    { label: '贵人·看天乙', chars: baziExtra.tianyi, prefix: '多在 ', suffix: ' 年。', empty: '原局无明显天乙贵人。' },
    { label: '财运·看财库', chars: baziExtra.caiku, prefix: '多在 ', suffix: ' 年。', empty: '原局无明显财库。' }
  ].map(item => {
    let arr = Array.isArray(item.chars) ? item.chars : (item.chars ? [item.chars] : []);
    arr = arr.filter(Boolean);
    const zhiItems = arr.map(z => ({
      text: `${z}(${zhiAnimalMap[z] || z})`,
      color: getWuXingColor(z)
    }));
    return {
      label: item.label,
      items: zhiItems,
      prefix: item.prefix,
      suffix: item.suffix,
      empty: item.empty
    }
  });

  const getWuxing = (char: string) => {
    const map: Record<string, string> = {
      '甲': '木', '乙': '木', '寅': '木', '卯': '木',
      '丙': '火', '丁': '火', '巳': '火', '午': '火',
      '戊': '土', '己': '土', '辰': '土', '戌': '土', '丑': '土', '未': '土',
      '庚': '金', '辛': '金', '申': '金', '酉': '金',
      '壬': '水', '癸': '水', '亥': '水', '子': '水'
    };
    return map[char] || '';
  };

  const isLucky = (char: string) => {
    if (!char || !baziExtra.xiwuxing) return false;
    let wuxing = getWuxing(char);
    return baziExtra.xiwuxing.includes(wuxing);
  };

  const GetDaYunTeDian = (ganZhi: string) => {
    let res: any[] = [];
    if (!ganZhi) return res;
    let gan = ganZhi[0];
    let zhi = ganZhi[1];

    // 1. 基础神煞触发
    if (baziExtra.taohua && baziExtra.taohua.includes(zhi)) res.push({ name: '桃花', color: '#e83e8c' }); 
    if (baziExtra.tianyi && baziExtra.tianyi.includes(zhi)) res.push({ name: '贵人', color: '#00b050' }); 
    if (baziExtra.yima && baziExtra.yima.includes(zhi)) res.push({ name: '驿马', color: '#4286f7' }); 
    if (baziExtra.lushen === zhi) res.push({ name: '禄神', color: '#00b050' }); 
    if (baziExtra.yangren === zhi) res.push({ name: '阳刃', color: '#ef4436' }); 
    if (baziExtra.caiku === zhi) res.push({ name: '财库', color: '#f9bb05' }); 

    if (bazi) {
      // 2. 空亡探测（以日柱查空亡）
      if (typeof bazi.getDayXunKong === 'function') {
        let kw = bazi.getDayXunKong() || '';
        if (kw.includes(zhi)) res.push({ name: '空亡', color: '#ef4436' }); 
      }

      // 3. 刑冲合害探测与伏吟
      const pillars = ['年', '月', '日', '时'];
      const keys = ['Year', 'Month', 'Day', 'Time'];
      const chongMap: Record<string, string> = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
      const haiMap: Record<string, string> = { '子': '未', '未': '子', '丑': '午', '午': '丑', '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯', '申': '亥', '亥': '申', '酉': '戌', '戌': '酉' };
      const poMap: Record<string, string> = { '子': '酉', '酉': '子', '卯': '午', '午': '卯', '辰': '丑', '丑': '辰', '未': '戌', '戌': '未', '寅': '亥', '亥': '寅', '巳': '申', '申': '巳' };
      const ganHeMap: Record<string, string> = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' };
      const zhiHeMap: Record<string, string> = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' };

      let allZhis: string[] = [];

      for (let i = 0; i < 4; i++) {
        let pGan = typeof (bazi as any)[`get${keys[i]}Gan`] === 'function' ? (bazi as any)[`get${keys[i]}Gan`]() : '';
        let pZhi = typeof (bazi as any)[`get${keys[i]}Zhi`] === 'function' ? (bazi as any)[`get${keys[i]}Zhi`]() : '';
        if (pZhi) allZhis.push(pZhi);

        if (pGan && pZhi) {
          let ganHe = ganHeMap[gan] === pGan;
          let zhiHe = zhiHeMap[zhi] === pZhi;
          if (gan === pGan && zhi === pZhi) {
            res.push({ name: pillars[i] + '柱伏吟', color: '#ef4436' }); 
          }
          if (chongMap[zhi] === pZhi) {
            res.push({ name: pillars[i] + '支逄冲', color: '#ef4436' }); 
          } else if (haiMap[zhi] === pZhi) {
            res.push({ name: pillars[i] + '支相害', color: '#ef4436' }); 
          } else if (poMap[zhi] === pZhi) {
            res.push({ name: pillars[i] + '支相破', color: '#ef4436' }); 
          }
          if (ganHe && zhiHe) {
            res.push({ name: pillars[i] + '柱鸳鸯合', color: '#e83e8c' }); 
          } else if (zhiHe) {
            res.push({ name: pillars[i] + '支六合', color: '#00b050' }); 
          }
        }
      }

      // 4. 三刑探测
      allZhis.push(zhi);
      const sanXingSets = [['寅', '巳', '申'], ['丑', '未', '戌']];
      if (sanXingSets.some(set => set.includes(zhi) && set.every(item => allZhis.includes(item)))) {
        res.push({ name: '构成三刑', color: '#ef4436' }); 
      }

      // 5. 高阶星煞 (文昌、华盖、将星、红鸾)
      const wenchangMap: Record<string, string> = { '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯' };
      if (dayGan && wenchangMap[dayGan] === zhi) res.push({ name: '文昌', color: '#8E24AA' }); 

      const hongluanMap: Record<string, string> = { '子': '卯', '丑': '寅', '寅': '丑', '卯': '子', '辰': '亥', '巳': '戌', '午': '酉', '未': '申', '申': '未', '酉': '午', '戌': '巳', '亥': '辰' };
      if ((yearZhi && hongluanMap[yearZhi] === zhi) || (dayZhi && hongluanMap[dayZhi] === zhi)) {
        res.push({ name: '红鸾', color: '#e83e8c' }); 
      }

      const getSanHeZhuJi = (tz: string) => {
        if (['申', '子', '辰'].includes(tz)) return { huagai: '辰', jiangxing: '子' };
        if (['亥', '卯', '未'].includes(tz)) return { huagai: '未', jiangxing: '卯' };
        if (['寅', '午', '戌'].includes(tz)) return { huagai: '戌', jiangxing: '午' };
        if (['巳', '酉', '丑'].includes(tz)) return { huagai: '丑', jiangxing: '酉' };
        return { huagai: '', jiangxing: '' };
      };
      let yearJi = getSanHeZhuJi(yearZhi);
      let dayJi = getSanHeZhuJi(dayZhi);
      if (yearJi.huagai === zhi || dayJi.huagai === zhi) res.push({ name: '华盖', color: '#795548' }); 
      if (yearJi.jiangxing === zhi || dayJi.jiangxing === zhi) res.push({ name: '将星', color: '#4286f7' }); 
    }

    return res;
  };

  const isFemale = person.gender === '女' || person.gender === 0 || person.gender === '0';
  const daYunRaw = bazi.getYun(isFemale ? 0 : 1).getDaYun();
  const daYunList = daYunRaw.map((dy: any) => {
    const gz = dy.getGanZhi() || '';
    const gan = gz.charAt(0);
    const zhi = gz.charAt(1);
    
    const tedian = GetDaYunTeDian(gz);

    const isLuckyGan = isLucky(gan);
    const isLuckyZhi = isLucky(zhi);

    return {
      DaYunStarAge: dy.getStartAge(),
      DaYunEndAge: dy.getStartAge() + 9,
      DaYunStarYear: dy.getStartYear(),
      DaYunEndYear: dy.getStartYear() + 9,
      DaYunGanZhi: gz,
      DaYunShiShenGan: getGanShiShen(dayGan, gan) || '', 
      DaYunShiShenZhi: getGanShiShen(dayGan, (LunarUtil.ZHI_HIDE_GAN[zhi] || [''])[0]) || '',
      isCurrent: new Date().getFullYear() >= dy.getStartYear() && new Date().getFullYear() <= dy.getStartYear() + 9,
      isLuckyGan,
      isLuckyZhi,
      tedian
    };
  }).slice(0, 8); 

  const currentYear = new Date().getFullYear();
  const lunarYear = Solar.fromYmdHms(currentYear, 7, 1, 12, 0, 0).getLunar();
  const lnGan = lunarYear.getYearGan() || '';
  const lnZhi = lunarYear.getYearZhi() || '';
  const ganZhiYear = lnGan + lnZhi;

  let currentDaYun = daYunList.find(item => currentYear >= item.DaYunStarYear && currentYear <= item.DaYunEndYear);
  let resultList: any[] = [];

  if (currentDaYun) {
    let dyGan = (currentDaYun.DaYunGanZhi || '').charAt(0);
    let dyZhi = (currentDaYun.DaYunGanZhi || '').charAt(1);

    if (lnGan === dyGan && lnZhi === dyZhi) {
      resultList.push({
        key: `流年大运并临`,
        content: `【六亲震荡】：此年为人生极大转折，需警惕至亲的长辈与配偶突发重病或遭遇恶性官非牵连。；【口舌洗牌】：极易卷入名誉受损的巨大非议或伴侣无妄离异，切忌主动与人合伙惹官司，宜守弱保平安。`,
        analysis: `流年干支 [${ganZhiYear}] 与当前大运干支 [${dyGan}${dyZhi}] 完全一致，双重能量叠加暴震。`,
        mangpai: `按“岁运并临，不死自己死他人”之理（现代释为六亲宫位及自身气数受剧震）。流运同象产生极强共振共鸣，引发气运极端化。`,
        type: 'danger'
      });
    }

    const chongMap: Record<string, string> = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
    if (chongMap[lnZhi] === dyZhi) {
      resultList.push({
        key: `流年交战大运`,
        content: `【事业官非】：外部大环境将面临强制性重组，存在被动裁员风险，极易卷入公司级合同纠纷或行业性官司。；【意外口角】：易引发突发住所搬迁置业离乡，且逢人易起激烈的口角非议，需预防交通碰瓷与四肢伤病。`,
        analysis: `流年地支（${lnZhi}）与主导十年的大运地支（${dyZhi}）发生强烈对冲，构成岁运交战。`,
        mangpai: `按“岁运相冲，谓之交战”之理。大运为静态环境，流年为动态激发点，二者相冲犹如引爆雷管，主宏观大环境剧烈洗牌。`,
        type: 'danger'
      });
    }

    const ganHeMap: Record<string, string> = { '甲': '己', '己': '甲', '乙': '庚', '庚': '乙', '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊' };
    const zhiHeMap: Record<string, string> = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' };
    if (ganHeMap[lnGan] === dyGan && zhiHeMap[lnZhi] === dyZhi) {
      resultList.push({
        key: `天地鸳鸯大合`,
        content: `【天赐良缘】：单身者极易在此年落定终身大事或受孕得子，已婚者亦有家庭共创巨额财富之喜。；【贵人合局】：工作中极易促成重大贵人相助的商业合伙，即使有顽固伤病也可遇良医得到奇迹般治愈。`,
        analysis: `流年干支（${ganZhiYear}）与主导大运（${dyGan}${dyZhi}）天干相合、地支相合，是最高级别的融洽共振。`,
        mangpai: `按“天合地合，为鸳鸯双飞”之理。干支同时被合化，原局僵持的矛盾被外在贵人或婚恋的巨大磁场强行抚平羁绊。`,
        type: 'success'
      });
    }
  }

  const pillars = ['年', '月', '日', '时'];
  const keys = ['Year', 'Month', 'Day', 'Time'];
  const chongMap: Record<string, string> = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
  const zhiHeMap: Record<string, string> = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' };
  const haiMap: Record<string, string> = { '子': '未', '未': '子', '丑': '午', '午': '丑', '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯', '申': '亥', '亥': '申', '酉': '戌', '戌': '酉' };
  const poMap: Record<string, string> = { '子': '酉', '酉': '子', '卯': '午', '午': '卯', '辰': '丑', '丑': '辰', '未': '戌', '戌': '未', '寅': '亥', '亥': '寅', '巳': '申', '申': '巳' };

  for (let i = 0; i < 4; i++) {
    let pZhi = typeof (bazi as any)[`get${keys[i]}Zhi`] === 'function' ? (bazi as any)[`get${keys[i]}Zhi`]() : '';
    if (!pZhi) continue;

    if (chongMap[lnZhi] === pZhi) {
      let content = '';
      let prin = '';
      if (i === 0) { content = '【长上非议】：除了警惕长辈重疾，亦极易与单位高层或执法机关爆发激烈口角与法务官司被夺权。；【头部外伤】：个人须极度警惕意外伤及头部，且不宜打探负面花边，防卷入无妄之灾。'; prin = '“流年冲太岁，无喜必有祸”。年柱为长辈宫及首部，受冲为根基不稳与高层口舌震荡。'; }
      else if (i === 1) { content = '【职场强拆】：冲击事业中枢，极易因小人非议造谣导致被动辞退，或与领导决裂引发全网风波。；【人际官非】：同辈圈子面临极端对抗，不仅需警惕心肺隐疾，更易与平级朋友或合伙人对簿公堂。'; prin = '“月令不容重犯”。月令乃提纲与胸背，逢冲必见工作交际系统巨震与名誉缠斗。'; }
      else if (i === 2) { content = '【桃色花边】：夫妻宫直受爆破，单身者易陷三角感情纠纷，已婚者极易爆出出轨花边丑闻或因第三者引发婚姻破裂。；【财色非议】：心力交瘁导致免疫力锐减，极易因男女感情问题引发不可控的口角与名誉官司。'; prin = '“日支冲则动内”。日支专司感情及配偶家庭，逢冲犹如后院起火，多因色欲惹非议。'; }
      else if (i === 3) { content = '【下属官非】：手下员工极易惹出巨大口角非议甚至携巨款背刺，导致项目烂尾且引来劳务纠纷官司。；【子息不安】：家中孩童易有跌打外伤，或因早恋等隐蔽的感情花边问题引发极大反叛。'; prin = '“时冲事业脚无根”。时柱掌管下半身、下属及子嗣，逢强冲则下路受创，多生基层派系口舌。'; }
      resultList.push({
        key: `流年冲${pillars[i]}支`,
        content: content,
        analysis: `流年的地支（${lnZhi}）狠狠冲撞了命局代表${pillars[i]}柱的地支（${pZhi}）。`,
        mangpai: prin,
        type: 'danger'
      });
    }

    if (zhiHeMap[lnZhi] === pZhi) {
      let content = '';
      let prin = '';
      if (i === 0) { content = '【名誉平反】：易化解过往的官非指控，过去的口舌非议得以澄清，隐密顽疾易遇良医好转。；【长上提携】：且能得系统中老一代领导的破格提携，父母亲族健康平稳逢凶化吉。'; prin = '“合太岁为逢贵”。年柱受相合乃得天时眷顾，大系统的意志力与社会名流产生了良性绑定。'; }
      else if (i === 1) { content = '【化敌为友】：职场人际圈能量爆发，曾经的竞争对手与口角宿敌极易化干戈为玉帛。；【暧昧萌芽】：不仅心肺系统康泰，在工作圈中也极易隐秘滋生有利于事业推进的花边感情与暧昧助力。'; prin = '“月令逢合，广结善缘”。提纲交泰，对外的人脉风评与事业阻力瓦解，贵人在外帮你搭桥。'; }
      else if (i === 2) { content = '【红鸾花边】：独身者必有强烈感情羁绊落实，已有伴侣者极易在此年跨越诱惑爆出甜蜜花边。；【完美公关】：内宫阴影一扫而空，过去因长期的男女感情非议或纠纷，将得到完美的公关隐匿修复。'; prin = '“日支逢合，婚姻宫动”。内心独处与性器官宫位被顺遂能量牵合，主桃花正缘出没及暗结连理。'; }
      else if (i === 3) { content = '【属下效命】：易招募心腹死士平息基层的劳务纠纷官司，中年人极易有隐秘的双宿双飞感情之喜。；【子息降临】：子女宫遇合为极易有添丁领养之喜，或晚辈在私人感情上终于有确定性归宿。'; prin = '“合时柱，福及子孙晚景”。时柱主新生能量及私密社交，被合为有外力暗中滋养其生机。'; }
      resultList.push({
        key: `流年合${pillars[i]}支`,
        content: content,
        analysis: `流年的地支（${lnZhi}）与命局代表${pillars[i]}柱的地支（${pZhi}）产生极致羁绊相合。`,
        mangpai: prin,
        type: 'success'
      });
    }

    if (haiMap[lnZhi] === pZhi || poMap[lnZhi] === pZhi) {
      let typeStr = haiMap[lnZhi] === pZhi ? '害' : '破';
      resultList.push({
        key: `流年含${typeStr}`,
        content: `【口舌非议】：此乃充满隐蔽耗损的周期，极易陷入查无实据的桃色花边绯闻，或名誉严重受损的暗斗口角。；【感情背刺】：需极度提防亲密圈内（甚至因地下感情）引爆的利益敲诈、法务官司与暗算，且防突发恶疾。`,
        analysis: `流年进入的地支（${lnZhi}）对原局${pillars[i]}宫位的地支（${pZhi}）形成了潜藏相${typeStr}的破坏耗损。`,
        mangpai: `按“恩将仇报，穿凿暗损”之理。由于非正面明刀明枪（相冲），相害相破犹如慢性毒药，多发名声受克与熟人背刺。`,
        type: 'warning'
      });
    }
  }

  let importantList = resultList.slice(0, 4);
  if (importantList.length === 0) {
    importantList.push({
      key: `流年平运`,
      content: `【平安是福】：没有刑冲合害的剧烈引动，意味着今年您的长辈父母、配偶与子女在身体层面均波澜不惊，无大碍。；【谢绝折腾】：遭遇车祸大病与被迫裁员的巨灾几率极小，最宜按部就班调养作息，死死抱住现有的饭碗不宜投资妄动。`,
      analysis: `今年的流年干支（${ganZhiYear}）并未在您的八字四柱或大运中泛起任何剧烈的地支摩擦与冲撞。`,
      mangpai: `“五行不战，其气和平”。岁运未动原局根本宫门，代表生理气血与社会地位阶层维系恒定原貌。`,
      type: 'normal'
    });
  }

  const currentYearAnalysis = {
    year: currentYear,
    ganZhi: ganZhiYear,
    list: importantList
  };

  return {
    surname: (person.name || '某').charAt(0),
    fullName: person.name || '某某',
    identity: person.sourceTopicTitle || '热点人物',
    gender: person.gender,
    dateStr: `${y}年${m}月${d}日`,
    allPillars,
    baziExtra,
    hexinYaoSuList,
    wuxing: `${bazi.getYearWuXing()} ${bazi.getMonthWuXing()} ${bazi.getDayWuXing()} ${bazi.getTimeWuXing()}`,
    chartAnalysis: generatedContent?.chartAnalysis || generatedContent?.bazi_analysis || '',
    luckAnalysis: generatedContent?.luckAnalysis || generatedContent?.luck_analysis || '',
    paragraphs: generatedContent?.paragraphs || [],
    daYunList,
    currentYearAnalysis
  };
}
