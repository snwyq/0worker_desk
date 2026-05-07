/**
 * 国学日历核心引擎
 * 提供月历网格数据、传统黄历宜忌、专业运势评分、特征标签、十二时辰
 */
import { Lunar, Solar } from 'lunar-typescript'
import { getWuXing } from './zytransform'

// ==================== 类型定义 ====================

/** 单日日历数据 */
export interface DayCalendarData {
    // 阳历
    solarYear: number
    solarMonth: number
    solarDay: number
    weekDay: string        // 周几
    weekIndex: number      // 0=日 1=一 ... 6=六
    isToday: boolean
    isCurrentMonth: boolean

    // 农历
    lunarMonthStr: string
    lunarDayStr: string
    lunarYear: number
    lunarMonth: number

    // 干支
    dayGan: string
    dayZhi: string
    dayGanZhi: string
    yearGanZhi: string
    monthGanZhi: string

    // 节气 & 特殊信息
    jieQi: string
    chong: string
    sha: string
    shengXiao: string

    // 黄历宜忌（通用）
    yi: string[]
    ji: string[]

    // 吉神/凶神
    jiShen: string[]
    xiongSha: string[]

    // 专业运势评分（基于 today.vue 的打分系统）
    fortuneScore: number
    fortuneLevel: FortuneLevel
    fortuneSummary: string

    // 上下半天判定
    isGanXi: boolean   // 上半天（干）是否为喜
    isZhiXi: boolean   // 下半天（支）是否为喜

    // 特征标签（桃花/贵人/驿马/日冲等）
    features: FeatureTag[]

    // 个性化宜忌速查
    personalYi: string[]
    personalJi: string[]

    // 简易评级
    scoreLevel: 'great' | 'good' | 'neutral' | 'bad'
}

/** 运势等级 */
export interface FortuneLevel {
    text: string
    emoji: string
    color: string
}

/** 特征标签 */
export interface FeatureTag {
    name: string
    color: string
}

/** 月历网格 */
export interface MonthCalendarGrid {
    year: number
    month: number
    lunarMonthStr: string
    days: DayCalendarData[]
    greatDays: number
    goodDays: number
    neutralDays: number
    badDays: number
}

/** 时辰数据 */
export interface ShichenData {
    gan: string
    zhi: string
    ganZhi: string
    timeRange: string
    isCurrent: boolean
    isGanXi: boolean
    isZhiXi: boolean
    wuxing: string
}

/** 用户八字上下文（用于个性化计算） */
export interface UserBaziContext {
    dayGan: string        // 日主
    xiWuxing: string[]
    jiWuxing: string[]
    // 神煞
    taohua?: string[]     // 桃花
    tianyi?: string[]      // 天乙贵人
    yima?: string[]        // 驿马
    lushen?: string        // 禄神
    yangren?: string       // 阳刃
    natalDayZhi?: string   // 本命日支
}

// ==================== 常量 ====================

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六']
const TIAN_GANS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHIS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 日冲对照表
const CHONG_PAIRS: Record<string, string> = {
    '子': '午', '午': '子', '丑': '未', '未': '丑',
    '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳'
}

// 特征标签颜色
const COLOR_BAD = '#E53935'
const COLOR_WARN = '#FB8C00'
const COLOR_GOOD = '#43A047'
const COLOR_INFO = '#1E88E5'

// ==================== 核心计算函数 ====================

/**
 * 计算专业运势评分（对齐 today.vue 的 fortuneScore 系统）
 * 基于：喜忌五行匹配 + 神煞加减 + 日冲扣分
 */
export function calcFortuneScore(
    dayGan: string,
    dayZhi: string,
    ctx: UserBaziContext
): number {
    if (!ctx.xiWuxing || ctx.xiWuxing.length === 0) return 50

    const ganWx = getWuXing(dayGan) || ''
    const zhiWx = getWuXing(dayZhi) || ''
    const isGanXi = ctx.xiWuxing.includes(ganWx)
    const isZhiXi = ctx.xiWuxing.includes(zhiWx)

    // 基础分
    let score = 50
    if (isGanXi && isZhiXi) score = 88
    else if (isGanXi || isZhiXi) score = 60
    else score = 32

    // 神煞加减
    if (ctx.tianyi?.includes(dayZhi)) score += 5   // 贵人+5
    if (ctx.lushen === dayZhi) score += 3          // 禄神+3
    if (ctx.taohua?.includes(dayZhi)) score += 2   // 桃花+2
    if (ctx.yangren === dayZhi) score -= 5         // 阳刃-5

    // 日冲-8
    if (ctx.natalDayZhi && CHONG_PAIRS[ctx.natalDayZhi] === dayZhi) {
        score -= 8
    }

    return Math.max(10, Math.min(98, score))
}

/**
 * 根据评分获取运势等级
 */
export function getFortuneLevel(score: number): FortuneLevel {
    if (score >= 80) return { text: '大吉', emoji: '🔥', color: '#E91E63' }
    if (score >= 65) return { text: '小吉', emoji: '✨', color: '#43A047' }
    if (score >= 45) return { text: '平稳', emoji: '🌊', color: '#1E88E5' }
    if (score >= 30) return { text: '小凶', emoji: '🌙', color: '#FB8C00' }
    return { text: '宜静', emoji: '🛡️', color: '#90A4AE' }
}

/**
 * 根据评分获取一句话总结
 */
export function getFortuneSummary(score: number): string {
    if (score >= 80) return '天地之气与命局高度契合，气场和谐顺畅。适宜推进重要事务、社交会友。'
    if (score >= 65) return '今日运势较好，把握有利时机处理核心事务，可有所作为。'
    if (score >= 45) return '今日运势平稳，宜按部就班处理日常事务，顺其自然。'
    if (score >= 30) return '今日气场较为复杂，建议保持沉稳，以静制动，避免冲动决策。'
    return '今日宜静守蓄力，养精蓄锐。适合修身养性，为来日做准备。'
}

/**
 * 获取每日特征标签（桃花/贵人/驿马/日冲/十神等）
 * 与 today.vue 的 getDailyFeatures 逻辑完全一致
 */
export function getDailyFeatures(
    dayZhi: string,
    ctx: UserBaziContext,
    shiShenByZhiFn?: (dayMaster: string, zhi: string) => string[] | null
): FeatureTag[] {
    const features: FeatureTag[] = []

    // 1. 神煞
    if (ctx.taohua?.includes(dayZhi)) features.push({ name: '桃花', color: '#E91E63' })
    if (ctx.tianyi?.includes(dayZhi)) features.push({ name: '贵人', color: COLOR_GOOD })
    if (ctx.yima?.includes(dayZhi)) features.push({ name: '驿马', color: COLOR_INFO })
    if (ctx.lushen === dayZhi) features.push({ name: '禄神', color: COLOR_GOOD })
    if (ctx.yangren === dayZhi) features.push({ name: '阳刃', color: COLOR_WARN })

    // 2. 十神信息（如果提供了计算函数）
    if (shiShenByZhiFn && ctx.dayGan) {
        const zhiGodArr = shiShenByZhiFn(ctx.dayGan, dayZhi)
        const zhiGod = zhiGodArr ? zhiGodArr[0] : ''
        if (zhiGod === '正财' || zhiGod === '偏财') features.push({ name: zhiGod, color: '#FFA000' })
        if (zhiGod === '正官' || zhiGod === '七杀') features.push({ name: zhiGod, color: '#7B1FA2' })
    }

    // 3. 日冲
    if (ctx.natalDayZhi && CHONG_PAIRS[ctx.natalDayZhi] === dayZhi) {
        features.push({ name: '日冲', color: COLOR_BAD })
    }

    return features
}

/**
 * 获取个性化宜忌速查（对齐 today.vue 的 yiJiList）
 */
export function getPersonalYiJi(
    score: number,
    dayZhi: string,
    ctx: UserBaziContext
): { yi: string[]; ji: string[] } {
    const yi: string[] = []
    const ji: string[] = []

    if (score >= 65) {
        yi.push('推进重要事务', '社交会面')
        if (ctx.tianyi?.includes(dayZhi)) yi.push('求贵人帮助')
        if (ctx.taohua?.includes(dayZhi)) yi.push('感情交流')
        if (ctx.lushen === dayZhi) yi.push('享受美食')
        ji.push('过于激进', '忽视细节')
    } else if (score >= 45) {
        yi.push('处理日常事务', '学习进修', '修养身心')
        ji.push('仓促决策', '投机冒险')
    } else {
        yi.push('静心思考', '整理规划', '休息调养')
        ji.push('冲动决策', '大额消费', '争执对抗')
        if (ctx.yangren === dayZhi) ji.push('高风险活动')
    }

    // 日冲特殊忌
    if (ctx.natalDayZhi && CHONG_PAIRS[ctx.natalDayZhi] === dayZhi) {
        ji.push('远行出差')
    }

    return { yi: yi.slice(0, 4), ji: ji.slice(0, 4) }
}

/**
 * 获取单日完整黄历数据（增强版 — 融合 today.vue 的专业性）
 */
export function getDayCalendarData(
    date: Date,
    currentDisplayMonth: number,
    ctx: UserBaziContext,
    shiShenByZhiFn?: (dayMaster: string, zhi: string) => string[] | null
): DayCalendarData {
    const solar = Solar.fromDate(date)
    const lunar = solar.getLunar()
    const eightChar = lunar.getEightChar()

    const today = new Date()
    const isToday =
        solar.getYear() === today.getFullYear() &&
        solar.getMonth() === (today.getMonth() + 1) &&
        solar.getDay() === today.getDate()

    const dayGan = eightChar.getDayGan()
    const dayZhi = eightChar.getDayZhi()

    // 专业运势评分
    const fortuneScore = calcFortuneScore(dayGan, dayZhi, ctx)
    const fortuneLevel = getFortuneLevel(fortuneScore)
    const fortuneSummary = getFortuneSummary(fortuneScore)

    // 上下半天喜忌
    const ganWx = getWuXing(dayGan) || ''
    const zhiWx = getWuXing(dayZhi) || ''
    const isGanXi = ctx.xiWuxing.includes(ganWx)
    const isZhiXi = ctx.xiWuxing.includes(zhiWx)

    // 特征标签
    const features = getDailyFeatures(dayZhi, ctx, shiShenByZhiFn)

    // 个性化宜忌
    const { yi: personalYi, ji: personalJi } = getPersonalYiJi(fortuneScore, dayZhi, ctx)

    // 评级
    let scoreLevel: 'great' | 'good' | 'neutral' | 'bad'
    if (fortuneScore >= 80) scoreLevel = 'great'
    else if (fortuneScore >= 60) scoreLevel = 'good'
    else if (fortuneScore >= 40) scoreLevel = 'neutral'
    else scoreLevel = 'bad'

    // 节气
    const jieQi = lunar.getJieQi() || ''

    // 宜忌（安全调用）
    let yiArr: string[] = []
    let jiArr: string[] = []
    let jiShen: string[] = []
    let xiongSha: string[] = []
    try {
        yiArr = lunar.getDayYi()
        jiArr = lunar.getDayJi()
        jiShen = lunar.getDayJiShen()
        xiongSha = lunar.getDayXiongSha()
    } catch (e) {
        console.warn('黄历数据计算异常:', e)
    }

    // 农历日显示：初一显示月份
    const lunarDayStr = lunar.getDayInChinese()
    const lunarMonthStr = (lunar.getMonth() < 0 ? '闰' : '') + lunar.getMonthInChinese() + '月'
    const displayLunarStr = lunarDayStr === '初一' ? lunarMonthStr : lunarDayStr

    return {
        solarYear: solar.getYear(),
        solarMonth: solar.getMonth(),
        solarDay: solar.getDay(),
        weekDay: WEEK_DAYS[solar.getWeek()],
        weekIndex: solar.getWeek(),
        isToday,
        isCurrentMonth: solar.getMonth() === currentDisplayMonth,

        lunarMonthStr,
        lunarDayStr: displayLunarStr,
        lunarYear: lunar.getYear(),
        lunarMonth: lunar.getMonth(),

        dayGan,
        dayZhi,
        dayGanZhi: dayGan + dayZhi,
        yearGanZhi: eightChar.getYear(),
        monthGanZhi: eightChar.getMonth(),

        jieQi,
        chong: lunar.getChongDesc(),
        sha: lunar.getSha(),
        shengXiao: lunar.getDayShengXiao(),

        yi: yiArr,
        ji: jiArr,
        jiShen,
        xiongSha,

        fortuneScore,
        fortuneLevel,
        fortuneSummary,
        isGanXi,
        isZhiXi,
        features,
        personalYi,
        personalJi,
        scoreLevel,
    }
}

/**
 * 获取某月的完整日历网格数据
 */
export function getMonthCalendarGrid(
    year: number,
    month: number,
    ctx: UserBaziContext,
    shiShenByZhiFn?: (dayMaster: string, zhi: string) => string[] | null
): MonthCalendarGrid {
    const firstDay = new Date(year, month - 1, 1)
    const firstDayWeek = firstDay.getDay()
    const lastDay = new Date(year, month, 0)
    const totalDays = lastDay.getDate()
    const totalCells = Math.ceil((firstDayWeek + totalDays) / 7) * 7

    const days: DayCalendarData[] = []
    let greatDays = 0, goodDays = 0, neutralDays = 0, badDays = 0

    for (let i = 0; i < totalCells; i++) {
        const date = new Date(year, month - 1, 1 - firstDayWeek + i)
        const dayData = getDayCalendarData(date, month, ctx, shiShenByZhiFn)
        days.push(dayData)

        if (dayData.isCurrentMonth) {
            switch (dayData.scoreLevel) {
                case 'great': greatDays++; break
                case 'good': goodDays++; break
                case 'neutral': neutralDays++; break
                case 'bad': badDays++; break
            }
        }
    }

    const midMonthDate = new Date(year, month - 1, 15)
    const midLunar = Solar.fromDate(midMonthDate).getLunar()
    const lunarMonthStr = midLunar.getMonthInChinese() + '月'

    return { year, month, lunarMonthStr, days, greatDays, goodDays, neutralDays, badDays }
}

/**
 * 获取某日的十二时辰（五鼠遁法起时辰干支）
 * 与 today.vue 的 getDayTimes 逻辑一致
 */
export function getDayShichen(
    date: Date,
    xiWuxing: string[] = []
): ShichenData[] {
    const lunar = Lunar.fromDate(date)
    const eightChar = lunar.getEightChar()
    const dayGan = eightChar.getDayGan()

    // 五鼠遁法：日干定时干起始
    const map: Record<string, number> = {
        '甲': 0, '己': 0,  // 甲己还加甲 → 甲子
        '乙': 2, '庚': 2,  // 乙庚丙作初 → 丙子
        '丙': 4, '辛': 4,  // 丙辛从戊起 → 戊子
        '丁': 6, '壬': 6,  // 丁壬庚子居 → 庚子
        '戊': 8, '癸': 8   // 戊癸壬子头 → 壬子
    }
    const startIdx = map[dayGan] ?? 0

    const nowHour = new Date().getHours()
    const isDateToday = date.toDateString() === new Date().toDateString()

    const result: ShichenData[] = []

    for (let i = 0; i < 12; i++) {
        const gan = TIAN_GANS[(startIdx + i) % 10]
        const zhi = DI_ZHIS[i]
        const ganWx = getWuXing(gan) || ''
        const zhiWx = getWuXing(zhi) || ''

        // 判断当前时辰
        let isCurrent = false
        if (isDateToday) {
            if (i === 0) {
                isCurrent = nowHour >= 23 || nowHour < 1
            } else {
                isCurrent = nowHour >= (i * 2 - 1) && nowHour < (i * 2 + 1)
            }
        }

        // 时间范围
        const minHm = i === 0 ? '23:00' : `${String(i * 2 - 1).padStart(2, '0')}:00`
        const maxHm = `${String(i * 2 + 1).padStart(2, '0')}:00`

        result.push({
            gan,
            zhi,
            ganZhi: gan + zhi,
            timeRange: `${minHm}-${maxHm}`,
            isCurrent,
            isGanXi: xiWuxing.includes(ganWx),
            isZhiXi: xiWuxing.includes(zhiWx),
            wuxing: zhiWx,
        })
    }

    return result
}
