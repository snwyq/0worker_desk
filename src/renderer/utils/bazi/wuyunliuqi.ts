/**
 * 五运六气专业计算引擎
 * 基于中医传统理论：天干化运、地支司天在泉、主运客运、主气客气、客主加临
 */

// ========================= 基础常量 =========================

// 十天干
const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
// 十二地支
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

// 五行
const WUXING = ['木', '火', '土', '金', '水'] as const;

// 五运名称
const WU_YUN = ['木运', '火运', '土运', '金运', '水运'] as const;

// 六气名称（三阴三阳 + 所主之气）
const LIU_QI = [
    { name: '厥阴风木', short: '厥阴', nature: '风', wuxing: '木' },
    { name: '少阴君火', short: '少阴', nature: '火', wuxing: '火' },
    { name: '少阳相火', short: '少阳', nature: '火', wuxing: '火' },
    { name: '太阴湿土', short: '太阴', nature: '湿', wuxing: '土' },
    { name: '阳明燥金', short: '阳明', nature: '燥', wuxing: '金' },
    { name: '太阳寒水', short: '太阳', nature: '寒', wuxing: '水' },
] as const;

// 五行相生索引映射（用于客运推排）
// 木=0→火=1→土=2→金=3→水=4→木=0
const WUXING_SHENGXU = [0, 1, 2, 3, 4];

// ========================= 辅助函数 =========================

/**
 * 获取指定公历年份的天干
 * 约定：公元4年为甲子年（甲=0）
 */
export function getYearTianGan(year: number): string {
    return TIANGAN[(year - 4) % 10];
}

/**
 * 获取指定公历年份的地支
 */
export function getYearDiZhi(year: number): string {
    return DIZHI[(year - 4) % 12];
}

/**
 * 获取指定年份的干支纪年
 */
export function getGanZhiYear(year: number): string {
    return `${getYearTianGan(year)}${getYearDiZhi(year)}`;
}

/**
 * 近似计算大寒日期
 * 大寒通常在1月20日前后（±1日），此处取近似值
 */
export function getDaHanDate(year: number): Date {
    // 大寒大约在每年1月20日，精确到天即可满足运气推算需求
    return new Date(year, 0, 20);
}

/**
 * 计算一年中从大寒起算的天数
 * 五运六气以大寒为岁首
 */
function getDaysSinceDaHan(date: Date): number {
    const year = date.getFullYear();
    const daHan = getDaHanDate(year);

    if (date >= daHan) {
        // 大寒当日或之后：当年大寒到今天的天数
        return Math.floor((date.getTime() - daHan.getTime()) / 86400000);
    } else {
        // 大寒之前：属于上一年的运气周期
        const prevDaHan = getDaHanDate(year - 1);
        return Math.floor((date.getTime() - prevDaHan.getTime()) / 86400000);
    }
}

/**
 * 获取运气年份（以大寒为界）
 * 大寒前属上一年运气，大寒后属当年运气
 */
export function getYunQiYear(date: Date): number {
    const year = date.getFullYear();
    const daHan = getDaHanDate(year);
    return date >= daHan ? year : year - 1;
}

// ========================= 岁运（中运/大运） =========================

export interface YearYunResult {
    /** 天干 */
    tianGan: string;
    /** 地支 */
    diZhi: string;
    /** 干支纪年 */
    ganZhi: string;
    /** 所化五行（木/火/土/金/水） */
    wuxing: string;
    /** 五运名称（木运/火运/...） */
    yunName: string;
    /** 太过/不及 */
    taiGuoBuJi: '太过' | '不及';
    /** 阳干/阴干 */
    yinYang: '阳' | '阴';
    /** 专业描述 */
    description: string;
}

/**
 * 计算岁运
 * 天干化运规则：甲己→土，乙庚→金，丙辛→水，丁壬→木，戊癸→火
 * 太过不及：阳干太过，阴干不及
 */
export function getYearYun(year: number): YearYunResult {
    const tianGan = getYearTianGan(year);
    const diZhi = getYearDiZhi(year);
    const ganZhi = `${tianGan}${diZhi}`;
    const tianGanIdx = TIANGAN.indexOf(tianGan as any);

    // 天干化运映射：甲己=土(2), 乙庚=金(3), 丙辛=水(4), 丁壬=木(0), 戊癸=火(1)
    const huaYunMap = [2, 3, 4, 0, 1, 2, 3, 4, 0, 1]; // 甲乙丙丁戊己庚辛壬癸
    const wuxingIdx = huaYunMap[tianGanIdx];
    const wuxing = WUXING[wuxingIdx];
    const yunName = WU_YUN[wuxingIdx];

    // 阳干（偶数索引0,2,4,6,8=甲丙戊庚壬）太过，阴干不及
    const isYang = tianGanIdx % 2 === 0;
    const taiGuoBuJi = isYang ? '太过' as const : '不及' as const;
    const yinYang = isYang ? '阳' as const : '阴' as const;

    // 生成描述
    const taiGuoDesc = taiGuoBuJi === '太过'
        ? `${wuxing}气偏盛，${wuxing}所胜之气受抑，需防${wuxing}气过旺之弊`
        : `${wuxing}气不足，${wuxing}所不胜之气来乘，需补${wuxing}气之虚`;

    return {
        tianGan,
        diZhi,
        ganZhi,
        wuxing,
        yunName,
        taiGuoBuJi,
        yinYang,
        description: `${year}年（${ganZhi}年），天干${tianGan}化${wuxing}运，${yinYang}干主${taiGuoBuJi}。${taiGuoDesc}。`,
    };
}

// ========================= 主运 =========================

export interface ZhuYunStep {
    /** 步序（1-5） */
    step: number;
    /** 五运名称 */
    yunName: string;
    /** 五行 */
    wuxing: string;
    /** 是否当前所处 */
    isCurrent: boolean;
    /** 起始天数（从大寒起） */
    startDay: number;
    /** 结束天数 */
    endDay: number;
}

/**
 * 获取主运五步
 * 主运固定不变：木运→火运→土运→金运→水运
 * 从大寒日起，每步约73天5刻（≈73.05天）
 */
export function getZhuYun(date: Date): ZhuYunStep[] {
    const daysSinceDaHan = getDaysSinceDaHan(date);
    const STEP_DAYS = 73; // 每步约73天

    return WUXING.map((wx, i) => {
        const startDay = i * STEP_DAYS;
        const endDay = (i + 1) * STEP_DAYS - 1;
        return {
            step: i + 1,
            yunName: WU_YUN[i],
            wuxing: wx,
            isCurrent: daysSinceDaHan >= startDay && daysSinceDaHan <= endDay,
            startDay,
            endDay,
        };
    });
}

// ========================= 客运 =========================

export interface KeYunStep {
    /** 步序（1-5） */
    step: number;
    /** 五运名称 */
    yunName: string;
    /** 五行 */
    wuxing: string;
    /** 是否当前所处 */
    isCurrent: boolean;
}

/**
 * 获取客运五步
 * 以岁运为初运，五行相生排列
 */
export function getKeYun(date: Date): KeYunStep[] {
    const year = getYunQiYear(date);
    const yearYun = getYearYun(year);
    const startIdx = WUXING.indexOf(yearYun.wuxing as any);
    const daysSinceDaHan = getDaysSinceDaHan(date);
    const STEP_DAYS = 73;

    return Array.from({ length: 5 }, (_, i) => {
        const wuxingIdx = (startIdx + i) % 5;
        const startDay = i * STEP_DAYS;
        const endDay = (i + 1) * STEP_DAYS - 1;
        return {
            step: i + 1,
            yunName: WU_YUN[wuxingIdx],
            wuxing: WUXING[wuxingIdx],
            isCurrent: daysSinceDaHan >= startDay && daysSinceDaHan <= endDay,
        };
    });
}

// ========================= 司天 / 在泉 =========================

export interface SiTianZaiQuanResult {
    /** 司天（三阴三阳信息） */
    siTian: typeof LIU_QI[number];
    /** 在泉（三阴三阳信息） */
    zaiQuan: typeof LIU_QI[number];
    /** 说明 */
    description: string;
}

/**
 * 计算司天与在泉
 * 地支决定司天：子午→少阴君火，丑未→太阴湿土，寅申→少阳相火，
 *               卯酉→阳明燥金，辰戌→太阳寒水，巳亥→厥阴风木
 * 司天↔在泉对应关系（三阴对三阳）：
 *   厥阴(0)↔少阳(2), 少阴(1)↔阳明(4), 太阴(3)↔太阳(5)
 */
export function getSiTianZaiQuan(year: number): SiTianZaiQuanResult {
    const diZhi = getYearDiZhi(year);
    const diZhiIdx = DIZHI.indexOf(diZhi as any);

    // 地支→司天映射（按对冲分组）
    // 子午(0,6)→少阴君火(1), 丑未(1,7)→太阴湿土(3), 寅申(2,8)→少阳相火(2)
    // 卯酉(3,9)→阳明燥金(4), 辰戌(4,10)→太阳寒水(5), 巳亥(5,11)→厥阴风木(0)
    const siTianMap: Record<number, number> = {
        0: 1, 6: 1,   // 子午 → 少阴君火
        1: 3, 7: 3,   // 丑未 → 太阴湿土
        2: 2, 8: 2,   // 寅申 → 少阳相火
        3: 4, 9: 4,   // 卯酉 → 阳明燥金
        4: 5, 10: 5,  // 辰戌 → 太阳寒水
        5: 0, 11: 0,  // 巳亥 → 厥阴风木
    };

    // 司天↔在泉对应：三阴对三阳
    // 厥阴(0)↔少阳(2), 少阴(1)↔阳明(4), 少阳(2)↔厥阴(0)
    // 太阴(3)↔太阳(5), 阳明(4)↔少阴(1), 太阳(5)↔太阴(3)
    const zaiQuanMap: Record<number, number> = { 0: 2, 1: 4, 2: 0, 3: 5, 4: 1, 5: 3 };

    const siTianIdx = siTianMap[diZhiIdx];
    const zaiQuanIdx = zaiQuanMap[siTianIdx];

    const siTian = LIU_QI[siTianIdx];
    const zaiQuan = LIU_QI[zaiQuanIdx];

    return {
        siTian,
        zaiQuan,
        description: `${diZhi}年之支，${siTian.name}司天主上半年，${zaiQuan.name}在泉主下半年。天气${siTian.nature}化，地气${zaiQuan.nature}化。`,
    };
}

// ========================= 主气 =========================

export interface QiStep {
    /** 步序（1-6） */
    step: number;
    /** 步名称 */
    stepName: string;
    /** 三阴三阳 + 气性 */
    qi: typeof LIU_QI[number];
    /** 是否当前所处 */
    isCurrent: boolean;
    /** 起始天数（从大寒起） */
    startDay: number;
    /** 结束天数 */
    endDay: number;
}

const STEP_NAMES = ['初之气', '二之气', '三之气', '四之气', '五之气', '终之气'];

/**
 * 获取主气六步
 * 固定顺序：厥阴风木→少阴君火→少阳相火→太阴湿土→阳明燥金→太阳寒水
 * 从大寒起每步约60.875天
 */
export function getZhuQi(date: Date): QiStep[] {
    const daysSinceDaHan = getDaysSinceDaHan(date);
    const STEP_DAYS = 61; // 约60.875天，取整

    return LIU_QI.map((qi, i) => {
        const startDay = i * STEP_DAYS;
        const endDay = (i + 1) * STEP_DAYS - 1;
        return {
            step: i + 1,
            stepName: STEP_NAMES[i],
            qi,
            isCurrent: daysSinceDaHan >= startDay && daysSinceDaHan <= endDay,
            startDay,
            endDay,
        };
    });
}

// ========================= 客气 =========================

/**
 * 获取客气六步
 * 司天为第三气，在泉为第六气
 * 其余四间气按三阴三阳固定顺序排列
 * 
 * 排列规则：六气固定顺序为 厥阴(0)→少阴(1)→太阴(3)→少阳(2)→阳明(4)→太阳(5)
 * 从司天的位置确定起点，按此顺序填入六步
 */
export function getKeQi(date: Date): QiStep[] {
    const year = getYunQiYear(date);
    const { siTian, zaiQuan } = getSiTianZaiQuan(year);
    const daysSinceDaHan = getDaysSinceDaHan(date);
    const STEP_DAYS = 61;

    // 六气标准顺序：厥阴→少阴→太阴→少阳→阳明→太阳
    const stdOrder = [0, 1, 3, 2, 4, 5];
    const siTianIdx = LIU_QI.findIndex(q => q.name === siTian.name);

    // 在标准顺序中找到司天的位置
    const siTianPosInStd = stdOrder.indexOf(siTianIdx);

    // 司天为第3步（index=2），所以从 siTianPos - 2 开始排列
    const steps: QiStep[] = [];
    for (let i = 0; i < 6; i++) {
        const posInStd = (siTianPosInStd - 2 + i + 6) % 6;
        const qiIdx = stdOrder[posInStd];
        const startDay = i * STEP_DAYS;
        const endDay = (i + 1) * STEP_DAYS - 1;
        steps.push({
            step: i + 1,
            stepName: STEP_NAMES[i],
            qi: LIU_QI[qiIdx],
            isCurrent: daysSinceDaHan >= startDay && daysSinceDaHan <= endDay,
            startDay,
            endDay,
        });
    }

    return steps;
}

// ========================= 客主加临分析 =========================

export interface JiaLinResult {
    /** 步序 */
    step: number;
    /** 步名 */
    stepName: string;
    /** 主气 */
    zhuQi: typeof LIU_QI[number];
    /** 客气 */
    keQi: typeof LIU_QI[number];
    /** 五行关系 */
    relation: string;
    /** 吉凶判定 */
    judgment: '顺' | '逆' | '天刑' | '平';
    /** 解读 */
    description: string;
}

/**
 * 五行生克关系判断
 */
function getWuXingRelation(keWx: string, zhuWx: string): { relation: string; judgment: '顺' | '逆' | '天刑' | '平' } {
    if (keWx === zhuWx) return { relation: '同气', judgment: '平' };

    // 五行相生判断
    const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    // 五行相克判断
    const keMap: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

    if (shengMap[keWx] === zhuWx) return { relation: '客生主', judgment: '顺' };
    if (shengMap[zhuWx] === keWx) return { relation: '主生客', judgment: '逆' };
    if (keMap[keWx] === zhuWx) return { relation: '客克主', judgment: '天刑' };
    if (keMap[zhuWx] === keWx) return { relation: '主克客', judgment: '顺' };

    return { relation: '无明显关系', judgment: '平' };
}

/**
 * 客主加临分析
 * 将客气叠加于主气之上，分析五行生克
 */
export function getJiaLin(date: Date): JiaLinResult[] {
    const zhuQiSteps = getZhuQi(date);
    const keQiSteps = getKeQi(date);

    return zhuQiSteps.map((zhu, i) => {
        const ke = keQiSteps[i];
        const { relation, judgment } = getWuXingRelation(ke.qi.wuxing, zhu.qi.wuxing);

        let description = '';
        switch (judgment) {
            case '顺':
                description = `${ke.qi.short}客加${zhu.qi.short}主，${relation}，气候调和，利于养生。`;
                break;
            case '逆':
                description = `${ke.qi.short}客加${zhu.qi.short}主，${relation}，主气被泄，气候偏异，需注意调摄。`;
                break;
            case '天刑':
                description = `${ke.qi.short}客加${zhu.qi.short}主，${relation}，名为天刑，气候乖戾，需格外谨慎。`;
                break;
            default:
                description = `${ke.qi.short}客加${zhu.qi.short}主，${relation}，气候平稳。`;
        }

        return {
            step: i + 1,
            stepName: STEP_NAMES[i],
            zhuQi: zhu.qi,
            keQi: ke.qi,
            relation,
            judgment,
            description,
        };
    });
}

// ========================= 养生建议 =========================

export interface HealthAdvice {
    /** 类别 */
    category: string;
    /** 图标名 */
    icon: string;
    /** 建议标题 */
    title: string;
    /** 详细建议 */
    detail: string;
}

/**
 * 根据当前主导运气生成专业养生建议
 */
export function getHealthAdvice(date: Date): HealthAdvice[] {
    const year = getYunQiYear(date);
    const yearYun = getYearYun(year);
    const stq = getSiTianZaiQuan(year);
    const zhuQi = getZhuQi(date).find(q => q.isCurrent);
    const keQi = getKeQi(date).find(q => q.isCurrent);
    const jiaLin = getJiaLin(date).find((_, i) => getZhuQi(date)[i]?.isCurrent);

    const currentNature = zhuQi?.qi.nature || '风';
    const currentWuxing = zhuQi?.qi.wuxing || '木';

    // 基于当前主气性质的养生建议
    const adviceByNature: Record<string, HealthAdvice[]> = {
        '风': [
            { category: '脏腑', icon: 'spa', title: '养肝疏风', detail: '风气主令，肝木当旺。宜疏肝理气，保持情绪舒畅。可食用芹菜、菠菜等绿色蔬菜，佐以枸杞、菊花泡茶。' },
            { category: '起居', icon: 'bedtime', title: '早卧早起', detail: '春生之气，宜广步于庭。晨起宜散步、太极，舒展筋骨。注意防风保暖，避免风邪入侵。' },
            { category: '情志', icon: 'mood', title: '畅达情志', detail: '肝主疏泄，喜条达而恶抑郁。避免急躁易怒，可练习书法、听轻音乐以安神定志。' },
        ],
        '火': [
            { category: '脏腑', icon: 'spa', title: '养心清热', detail: '火气主令，心火易亢。宜清心降火，苦味入心，可适量食用莲子心、苦瓜，忌辛辣厚味。' },
            { category: '起居', icon: 'bedtime', title: '午休养心', detail: '火旺之时宜静养。午时小憩15-30分钟，养心安神。避免烈日暴晒，运动宜选清晨或傍晚。' },
            { category: '情志', icon: 'mood', title: '宁心安神', detail: '心主神明，火旺易生烦躁。宜静坐冥想，避免过分兴奋。保持平和心态，戒躁戒怒。' },
        ],
        '湿': [
            { category: '脏腑', icon: 'spa', title: '健脾祛湿', detail: '湿气主令，脾土受困。宜健脾利湿，可食山药、茯苓、薏苡仁粥。少食生冷、油腻、甜食。' },
            { category: '起居', icon: 'bedtime', title: '除湿防潮', detail: '居处宜通风干燥，避免久坐潮湿之地。适量运动出汗，有助排湿。雨天注意防潮。' },
            { category: '情志', icon: 'mood', title: '振奋精神', detail: '湿困脾土，易生困倦懈怠。保持积极心态，参与社交活动，避免思虑过度伤脾。' },
        ],
        '燥': [
            { category: '脏腑', icon: 'spa', title: '润肺生津', detail: '燥气主令，肺金受灼。宜滋阴润燥，多食梨、银耳、百合、蜂蜜。忌辛辣燥热之品。' },
            { category: '起居', icon: 'bedtime', title: '保湿润养', detail: '室内宜适度加湿，多饮温水。皮肤注意保湿，避免大汗淋漓的剧烈运动。' },
            { category: '情志', icon: 'mood', title: '收敛神气', detail: '秋收之气宜收敛。安宁平和，减少悲忧情绪。可品茗赏花，怡情养性。' },
        ],
        '寒': [
            { category: '脏腑', icon: 'spa', title: '温肾散寒', detail: '寒气主令，肾水当旺。宜温补肾阳，可食当归生姜羊肉汤、核桃、黑芝麻。忌生冷寒凉。' },
            { category: '起居', icon: 'bedtime', title: '早卧晚起', detail: '冬藏之气，宜减少活动以蓄养精气。注意头部、足部保暖，睡前热水泡脚温通经络。' },
            { category: '情志', icon: 'mood', title: '潜藏安神', detail: '冬主封藏，心境宜静。避免大喜大悲消耗阳气，适合阅读、静坐、养内功。' },
        ],
    };

    const baseAdvice = adviceByNature[currentNature] || adviceByNature['风'];

    // 添加岁运相关建议
    const yunAdvice: HealthAdvice = {
        category: '岁运',
        icon: 'calendar_month',
        title: `${yearYun.yunName}${yearYun.taiGuoBuJi}之年`,
        detail: yearYun.taiGuoBuJi === '太过'
            ? `全年${yearYun.wuxing}气偏盛，${yearYun.wuxing}所主脏腑功能亢进，需特别注意克制${yearYun.wuxing}气的过度影响。饮食起居应以制约${yearYun.wuxing}气为要。`
            : `全年${yearYun.wuxing}气不足，${yearYun.wuxing}所主脏腑功能偏弱，需补养${yearYun.wuxing}气。饮食起居应以扶助${yearYun.wuxing}气为要。`,
    };

    return [yunAdvice, ...baseAdvice];
}

// ========================= 综合数据接口 =========================

export interface WuYunLiuQiData {
    /** 日期标签 */
    dateLabel: string;
    /** 运气纪年（大寒为界） */
    yunQiYear: number;
    /** 干支纪年 */
    ganZhi: string;
    /** 岁运 */
    yearYun: YearYunResult;
    /** 司天在泉 */
    siTianZaiQuan: SiTianZaiQuanResult;
    /** 主运五步 */
    zhuYun: ZhuYunStep[];
    /** 客运五步 */
    keYun: KeYunStep[];
    /** 主气六步 */
    zhuQi: QiStep[];
    /** 客气六步 */
    keQi: QiStep[];
    /** 客主加临 */
    jiaLin: JiaLinResult[];
    /** 养生建议 */
    healthAdvice: HealthAdvice[];
    /** 当前主运 */
    currentZhuYun: ZhuYunStep | undefined;
    /** 当前客运 */
    currentKeYun: KeYunStep | undefined;
    /** 当前主气 */
    currentZhuQi: QiStep | undefined;
    /** 当前客气 */
    currentKeQi: QiStep | undefined;
    /** 当前加临分析 */
    currentJiaLin: JiaLinResult | undefined;
}

/**
 * 一键获取所有五运六气数据
 */
export function getWuYunLiuQiData(date: Date = new Date()): WuYunLiuQiData {
    const yunQiYear = getYunQiYear(date);
    const ganZhi = getGanZhiYear(yunQiYear);
    const yearYun = getYearYun(yunQiYear);
    const siTianZaiQuan = getSiTianZaiQuan(yunQiYear);
    const zhuYun = getZhuYun(date);
    const keYun = getKeYun(date);
    const zhuQi = getZhuQi(date);
    const keQi = getKeQi(date);
    const jiaLin = getJiaLin(date);
    const healthAdvice = getHealthAdvice(date);

    const month = date.getMonth() + 1;
    const day = date.getDate();

    return {
        dateLabel: `${date.getFullYear()}年${month}月${day}日`,
        yunQiYear,
        ganZhi,
        yearYun,
        siTianZaiQuan,
        zhuYun,
        keYun,
        zhuQi,
        keQi,
        jiaLin,
        healthAdvice,
        currentZhuYun: zhuYun.find(y => y.isCurrent),
        currentKeYun: keYun.find(y => y.isCurrent),
        currentZhuQi: zhuQi.find(q => q.isCurrent),
        currentKeQi: keQi.find(q => q.isCurrent),
        currentJiaLin: jiaLin.find((_, i) => zhuQi[i]?.isCurrent),
    };
}
