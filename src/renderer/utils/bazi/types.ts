/**
 * 流年信息
 */
export interface LiuNianInfo {
    year: number;
    age: number;
    ganZhi: string;
}

/**
 * 大运信息
 */
export interface DaYunInfo {
    startYear: number;
    startAge: number;
    endYear: number;
    endAge: number;
    ganZhi: string;
    liuNianArr: LiuNianInfo[];
}

/**
 * 五行计算结果
 */
export interface WuXingData {
    list: number[];
    // 可能还有其他属性，根据 ComputedWuXing 的实际返回补充
    [key: string]: any;
}

/**
 * 八字基础数据结果
 */
export interface BaziBaseData {
    timestamp: number | string;
    gender: number;
    sect: number;
    dayGan: string;
    yearGanZhi: string;
    monthGanZhi: string;
    ShengXiao: string;
    XingZuo: string;
    dayGanZhi: string;
    timeGanZhi: string;
    gansArr: string[];
    zhisArr: string[];
    baziArr: string[];
    gansWuxingArr: string[];
    zhisWuxingArr: string[];
    shenSha: string[][];
    GanRelaBase: string[];
    DiZhiRelaBase: string[];
    DayunArr: DaYunInfo[];
    wuxingnumBase: number[];
    wuxingnumAll: number[];
    nincludewuxingData: WuXingData;
    includewuxingData: WuXingData;
    wangshuai: string[];
}
