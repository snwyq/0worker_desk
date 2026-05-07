// @ts-nocheck

import { Solar, LunarUtil, EightChar } from "lunar-typescript";
import type { BaziBaseData, DaYunInfo, LiuNianInfo } from "./types";
import {
  shishenTiangan,
  shishenDizhi,
  colorList,
  tianganYinYang,
  dizhiYinYang,
  tianganChunYinYang,
  dizhiChunYinYang,
  tianganShuHuoYinYang,
  dizhiShuHuoYinYang,
  wuxingcolorList,
  wangshuai as wuxingWangshuai,
} from "./zydict";
import {
  CHENGGU_YEAR_ATOM,
  CHENGGU_MONTH_ATOM,
  CHENGGU_DAY_ATOM,
  CHENGGU_TIME_ATOM,
  CHENGGU_RESULT,
} from "./book/chenggu";
import { baseUrl, tianganList, dizhiList, shengxiaoList } from "./zydict";
import { wuxingLabelList } from "./zydict";
import {
  countElements,
  getDiZhiRela,
  getEightSumInfo,
  getGanShiShen,
  getifExistGen,
  getShiShenXing,
  getTianGanRela,
  getWuxing,
  getWuxingByGanZhi,
  getWuXingByShiShen,
  getWuXingRelation,
  getWuxingShiShen,
  wuxingToShishenList,
} from "./zytransform";
export {
  countElements,
  getDiZhiRela,
  getEightSumInfo,
  getGanShiShen,
  getifExistGen,
  getShiShenXing,
  getTianGanRela,
  getWuxing,
  getWuxingByGanZhi,
  getWuXingByShiShen,
  getWuXingRelation,
  getWuxingShiShen,
  wuxingToShishenList,
};
import vk from "@/uni_modules/vk-unicloud";
import { getShenSha } from "./zyshensha";
import dayjs from "dayjs";

/**
 * 获取头像URL（带内存缓存，避免列表重复计算）
 * @param gender 1:男, 0:女
 * @param timestamp 出生时间戳或日期字符串
 * @returns 头像URL
 */
const _avatarCache = new Map<string, string>();
export const getAvatar = (gender: number, timestamp: string | number): string => {
  const cacheKey = `${gender}_${timestamp}`;
  const cached = _avatarCache.get(cacheKey);
  if (cached) return cached;
  const v = 'v3';
  if (!timestamp) {
    const fallback = gender === 0 ? `/static/img/woman.png?v=${v}` : `/static/img/man.jpg?v=${v}`;
    _avatarCache.set(cacheKey, fallback);
    return fallback;
  }

  const birthDate = dayjs(timestamp);
  let age = dayjs().diff(birthDate, 'year');
  if (age < 0) age = 0; // 防止负数
  const prefix = gender === 1 ? 'm' : 'w';

  // 新逻辑：2岁一个阶段，向下取偶数
  // 例如: 65 -> 64, 66 -> 66
  // 但注意：资源文件是否真的覆盖了所有偶数点？
  // 假设资源是完整的 0, 2, ... 98 (w) / 100 (m)

  if (age < 100) {
    let step = Math.floor(age / 2) * 2;

    // 女性最大只到 98
    if (gender === 0 && step > 98) step = 98;

    // 返回 jpg
    const result = `/static/img/avatars/${prefix}_${step}.jpg?v=${v}`;
    _avatarCache.set(cacheKey, result);
    return result;
  } else if (age <= 100) {
    // 100岁
    const step = gender === 0 ? 98 : 100;
    const result = `/static/img/avatars/${prefix}_${step}.jpg?v=${v}`;
    _avatarCache.set(cacheKey, result);
    return result;
  } else if (age <= 200) {
    // 修仙模式
    const step = gender === 0 ? 98 : 200;
    const result = `/static/img/avatars/${prefix}_${step}.jpg?v=${v}`;
    _avatarCache.set(cacheKey, result);
    return result;
  } else {
    const step = gender === 0 ? 98 : 300;
    const result = `/static/img/avatars/${prefix}_${step}.jpg?v=${v}`;
    _avatarCache.set(cacheKey, result);
    return result;
  }
};

/**
 * 获取时间并格式化函数
 * @param M 格式模板 如: YYYY-MM-DD  HH:hh:mm:ss ...
 * @param Time 可选传入时间参数 默认为 Now
 */
export const getFormatDate = (
  M: string,
  Time: Date | null | string | number = null
) => {
  let date: Date = Time ? new Date(Time) : new Date();

  let pattern: RegExp =
    /(Y{2,4}|M{1,2}|D{1,2}|H{1,2}|h{1,2}|m{1,2}|s{1,2}|C{1,2}|W{1,2})/g;
  let tmp: any = (S: string | number) => (Number(S) < 10 ? "0" + S : S);
  let res: string = M.replace(pattern, ($0: string) => {
    switch ($0) {
      case "YY":
        return date.getFullYear().toString().slice(-2);
      case "YYYY":
        return date.getFullYear();
      case "M":
        return date.getMonth() + 1;
      case "MM":
        return tmp(date.getMonth() + 1);
      case "D":
        return date.getDate();
      case "DD":
        return tmp(date.getDate());
      case "W":
        return date.getDay();
      case "WW":
        return ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
      case "H":
      case "h":
        return date.getHours();
      case "HH":
      case "hh":
        return tmp(date.getHours());
      case "m":
        return date.getMinutes();
      case "mm":
        return tmp(date.getMinutes());
      case "s":
        return date.getSeconds();
      case "ss":
        return tmp(date.getSeconds());
      case "C":
        return Math.trunc(date.getTime() / 1000);
      case "CC":
        return date.getTime();
      default:
        return $0;
    }
  });
  return res;
};

// 隐藏时间内秒单位
export const HideTimeSecond = (time: any): string => {
  const solar = Solar.fromDate(new Date(time));
  let date = solar.toYmdHms().replace(/-/g, "/");
  return date.substring(0, date.lastIndexOf(":"));
};

// 天罡称骨计算
export const ChengGuComputed = (
  y: string,
  m: number,
  d: number,
  t: number
): { man: '', woman: '', typesMan: '', typesWoman: any, notesMan: any, notesWoman: any, total: '' } => {
  let total =
    CHENGGU_YEAR_ATOM[y] +
    CHENGGU_MONTH_ATOM[m - 1] +
    CHENGGU_DAY_ATOM[d - 1] +
    CHENGGU_TIME_ATOM[t];
  total = total.toFixed(1);
  const chineseNumber = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
  var key = "";
  if (total == 1) {
    key = "一两";
  } else {
    let _total = String(total);
    let diff: any = _total.split(".");
    if (diff[0] != 0) key = chineseNumber[diff[0] - 1] + "两";
    if (diff[1] != 0) key += chineseNumber[diff[1] - 1] + "钱";
  }
  const chenggu = CHENGGU_RESULT[key] ?? {};
  chenggu.total = key;
  return chenggu;
};

export const BaseTransformShiShen = (str: string): string => {
  const map: any = {
    印: "正印",
    官: "正官",
    劫: "劫财",
    伤: "伤官",
    财: "正财",
    杀: "七杀",
    枭: "偏印",
    比: "比肩",
    食: "食神",
    才: "偏财",
  };
  return map[str] ?? "";
};

export const GetChangSheng = (
  gan: string,
  ganIndex: number,
  zhiIndex: number
) => {
  const CHANG_SHENG_OFFSET = {
    甲: 1,
    丙: 10,
    戊: 10,
    庚: 7,
    壬: 4,
    乙: 6,
    丁: 9,
    己: 9,
    辛: 0,
    癸: 3,
  };
  const offset = CHANG_SHENG_OFFSET[gan];
  let index = offset + (ganIndex % 2 == 0 ? zhiIndex : -zhiIndex);
  if (index >= 12) {
    index -= 12;
  }
  if (index < 0) {
    index += 12;
  }
  return LunarUtil.CHANG_SHENG[index];
};

// 获取十神简称
export const GetShiShen = (ganzhi: string, dayGan?: string): string => {

  let selfgan = dayGan || "";

  let gan = null;
  let zhi = null;
  if (ganzhi == "童限") {
    gan = "";
    zhi = "";
  } else {
    gan = ganzhi[0];
    zhi = ganzhi[1];
  }

  if (!selfgan || !shishenTiangan[selfgan]) {
    return "";
  }

  return (
    TransformShiShen(shishenTiangan[selfgan][gan]) +
    TransformShiShen(shishenDizhi[selfgan][zhi])
  );
};


// 取得当前年份 

export const getCurrentYearLunar = () => {

  // 取阴历年份 
  const todaySolar = Solar.fromDate(new Date());
  const todaylunar = todaySolar.getLunar();
  const currentYear = todaylunar.getYear();
  return currentYear
}

export const getCurrentYearByTimestamp = (timestamp) => {

  // 取阴历年份 
  const todaySolar = Solar.fromDate(new Date(timestamp));
  const todaylunar = todaySolar.getLunar();
  const currentYear = todaylunar.getYear();
  return currentYear
}


// 取得当前月份
export const getCurrentMonthLunar = () => {

  // 取阴历年份 
  const todaySolar = Solar.fromDate(new Date());
  const todaylunar = todaySolar.getLunar();
  const currentMonth = todaylunar.getMonth();
  return currentMonth < 0 ? currentMonth * -1 : currentMonth
}



// 取得当前年份 

export const getCurrentDayBazi = () => {

  // 取阴历年份 
  const todaySolar = Solar.fromDate(new Date());
  const todaylunar = todaySolar.getLunar();
  const currentBazi = todaylunar.getEightChar();
  return currentBazi.toString()
}

// 取得任意阳历日期八字
export const getBaziByAnyTime = (str: string) => {

  // 取阴历年份 
  const todaySolar = Solar.fromDate(new Date(str));
  const todaylunar = todaySolar.getLunar();
  const currentBazi = todaylunar.getEightChar();
  return currentBazi.toString()
}

//得到八字的数据

export const getBaziArrayByTimeStamp = (param) => {
  const { gender, sect, timestamp } = param;
  const solar = Solar.fromDate(new Date(timestamp));
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();
  bazi.setSect(sect);

  // 直接调用方法获取八字干支数组
  return [
    bazi.getYearGan(),
    bazi.getYearZhi(),
    bazi.getMonthGan(),
    bazi.getMonthZhi(),
    bazi.getDayGan(),
    bazi.getDayZhi(),
    bazi.getTimeGan(),
    bazi.getTimeZhi(),
  ];
};




// 取得任意阳历日期八字的一些基础数据
export const getBaziBaseDataByTimeStamp = (param): BaziBaseData | null => {
  if (!param) return null;
  const {
    gender,
    sect,
    timestamp,

  } = param;
  if (!timestamp) return null;
  //个人八字日期信息
  let ts = timestamp;
  if (typeof ts === 'string' && !isNaN(Number(ts)) && ts.length >= 10) {
    ts = Number(ts);
  }
  const solarDate = new Date(ts);
  if (isNaN(solarDate.getTime())) return null;

  const solar = Solar.fromDate(solarDate);
  const lunar = solar.getLunar();
  let bazi = lunar.getEightChar();
  bazi.setSect(sect);


  const ShenSha = getShenSha(lunar, solar, gender);



  const gansArr = [bazi.getYearGan(), bazi.getMonthGan(), bazi.getDayGan(), bazi.getTimeGan()]

  const GanRelaBase = (getTianGanRela(gansArr).length > 0 ? getTianGanRela(gansArr) : ['无合化关系']);
  const DiZhiRelaBase = (getDiZhiRela(bazi).length > 0 ? getDiZhiRela(bazi) : ['无合化关系']);

  //得到大运的信息 
  const DayunInfoArr = [];

  const userYun = bazi.getYun(gender);
  const userDayunArr = userYun.getDaYun();

  for (let i = 0; i < userDayunArr.length; i++) {
    const daYun = userDayunArr[i];
    const daYunObj: any = {
      startYear: daYun.getStartYear(),
      startAge: daYun.getStartAge(),
      endYear: daYun.getEndYear(),
      endAge: daYun.getEndAge(),
      ganZhi: daYun.getGanZhi(),
      liuNianArr: []
    };

    const LiuNianArr = daYun.getLiuNian();
    for (let k = 0; k < LiuNianArr.length; k++) {
      const liuNian = LiuNianArr[k];
      daYunObj.liuNianArr.push({
        year: liuNian.getYear(),
        age: liuNian.getAge(),
        ganZhi: liuNian.getGanZhi()
      });
    }

    DayunInfoArr.push(daYunObj);
  }

  //得到五行信息 
  let nincludewuxingData = ComputedWuXing(bazi);
  let includewuxingData = ComputedWuXing(bazi, "all");

  const wuxingnumBase = [...nincludewuxingData.list]
  const wuxingnumAll = [...includewuxingData.list]

  // 旺衰
  let wangshuai = [];
  for (let zhis in wuxingWangshuai) {
    let ws = wuxingWangshuai[zhis];
    if (zhis.indexOf(bazi.getMonthZhi()) != -1) {
      wangshuai = ws;
      break;
    }
  }

  //个人的八字信息
  const userBaZi = {
    timestamp: timestamp,
    gender: gender,
    sect: sect,
    dayGan: bazi.getDayGan(),
    yearGanZhi: bazi.getYear(),
    monthGanZhi: bazi.getMonth(),
    ShengXiao: lunar.getShengxiao(),
    XingZuo: solar.getXingZuo(),
    dayGanZhi: bazi.getDay(),
    timeGanZhi: bazi.getTime(),
    gansArr: [bazi.getYearGan(), bazi.getMonthGan(), bazi.getDayGan(), bazi.getTimeGan()],
    zhisArr: [bazi.getYearZhi(), bazi.getMonthZhi(), bazi.getDayZhi(), bazi.getTimeZhi()],
    baziArr: [bazi.getYearGan(), bazi.getYearZhi(), bazi.getMonthGan(), bazi.getMonthZhi(), bazi.getDayGan(), bazi.getDayZhi(), bazi.getTimeGan(), bazi.getTimeZhi()],
    gansWuxingArr: [bazi.getYearWuXing()[0], bazi.getMonthWuXing()[0], bazi.getDayWuXing()[0], bazi.getTimeWuXing()[0]],
    zhisWuxingArr: [bazi.getYearWuXing()[1], bazi.getMonthWuXing()[1], bazi.getDayWuXing()[1], bazi.getTimeWuXing()[1]],
    shenSha: [ShenSha.shenShaYear, ShenSha.shenShaMonth, ShenSha.shenShaDay, ShenSha.shenShaTime],
    GanRelaBase: GanRelaBase,
    DiZhiRelaBase: DiZhiRelaBase,
    DayunArr: DayunInfoArr,
    wuxingnumBase: wuxingnumBase,
    wuxingnumAll: wuxingnumAll,
    nincludewuxingData: nincludewuxingData,
    includewuxingData: includewuxingData,
    wangshuai: wangshuai
  };

  return userBaZi

}



// 取得当前人的大运信息

export const getDayunObj = (params) => {

  let { gender, sect, timestamp } = params

  //取得八字
  const solar = Solar.fromDate(new Date(timestamp));
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(sect)

  // 运信息  
  const yun = eightChar.getYun(gender, sect);
  // 大运信息  
  return yun.getDaYun();
}




// 获取干支的五行颜色 (直接映射，更稳固)
export const GetGanZhiColor = (str: string | null | undefined): string => {
  if (!str) return '#333333';
  const wuxing = getWuxing(str);
  const colorMap: { [key: string]: string } = {
    '木': '#2eaa51',
    '火': '#ef4436',
    '土': '#a17323',
    '金': '#f9bb05',
    '水': '#4286f7'
  };
  return colorMap[wuxing] || '#333333';
};

// 转换简写十神
export const TransformShiShen = (str: string): string => {
  const map: any = {
    正印: "印",
    正官: "官",
    劫财: "劫",
    伤官: "伤",
    正财: "财",
    七杀: "杀",
    偏印: "枭",
    比肩: "比",
    食神: "食",
    偏财: "才",
  };
  return map[str];
};

// 转换五行
export const TransformWuXing = (str: string, type = "t") => {
  // let list: string[] = [];
  // let el: string[] = [];
  // if (type == "t") {
  // 	// 天干
  // 	list = tianganList;
  // 	el = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  // } else if (type == "d") {
  // 	// 地支
  // 	list = dizhiList;
  // 	el = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  // } else if (type == "s") {
  // 	// 生肖
  // 	list = shengxiaoList;
  // 	el = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  // }
  // return el[list.indexOf(str)] || "*";

  const Wuxing = LunarUtil.WU_XING_GAN[str]
    ? LunarUtil.WU_XING_GAN[str]
    : LunarUtil.WU_XING_ZHI[str];
  return Wuxing || "*";
};

// 结构数组
export const DeArray = (arr: any, type = "default", reArr = false) => {
  if (type == "canggan") {
    let str = [];
    for (let key of arr) {
      key && str.push(key + TransformWuXing(key));
    }
    return reArr ? str : str.join("\r\n");
  } else {
    return reArr ? arr : arr.join("\r\n");
  }
};

// 获取生肖头像URL
export const GetChineseZodiac = (sx) => {
  const index = shengxiaoList.indexOf(sx);
  let path;
  if (index !== -1) {
    path = `/zodiac/${index}.svg`;
  } else {
    path = `/site/logo.svg`;
  }
  return GetFileUrl(`static/icon${path}`);
};

//得到身强身弱
export const getShenQiangShenRuo = (eightChar: any) => {
  let result: string, reason: string;
  //初始化八字信息
  let riGan = eightChar.getDayGan();
  let tmp = eightChar.getYearGan();
  let riGanWuxing = LunarUtil.WU_XING_GAN[riGan];

  //得到分数
  let score = 0;
  //得到关系

  const relaYG = getWuXingRelation(
    riGanWuxing,
    LunarUtil.WU_XING_GAN[eightChar.getYearGan()]
  );
  const relaYZ = getWuXingRelation(
    riGanWuxing,
    LunarUtil.WU_XING_ZHI[eightChar.getYearZhi()]
  );
  const relaMG = getWuXingRelation(
    riGanWuxing,
    LunarUtil.WU_XING_GAN[eightChar.getMonthGan()]
  );
  const relaMZ = getWuXingRelation(
    riGanWuxing,
    LunarUtil.WU_XING_ZHI[eightChar.getMonthZhi()]
  );
  const relaDZ = getWuXingRelation(
    riGanWuxing,
    LunarUtil.WU_XING_ZHI[eightChar.getDayZhi()]
  );
  const relaTG = getWuXingRelation(
    riGanWuxing,
    LunarUtil.WU_XING_GAN[eightChar.getTimeGan()]
  );
  const relaTZ = getWuXingRelation(
    riGanWuxing,
    LunarUtil.WU_XING_ZHI[eightChar.getTimeZhi()]
  );
  //计算积分
  if (relaYG === "同" || relaYG == "生") {
    score += 8;
  }

  if (relaYZ === "同" || relaYZ == "生") score += 4;

  if (relaMG === "同" || relaMG == "生") {
    score += 12;
  }

  if (relaMZ === "同" || relaMZ == "生") score += 40;

  if (relaDZ === "同" || relaDZ == "生") score += 12;

  if (relaTG === "同" || relaTG == "生") {
    score += 12;
  }

  if (relaTZ === "同" || relaTZ == "生") score += 12;

  //根据地支藏干来重新计算得分
  if (score >= 50) {
    result = "身强";
    reason =
      "印比和大于50为身强 。 \n 印比得分：" +
      score +
      `分，\n传统判断标准：年:8+4分,月:12+40分 日支:12 时：12+12分`;
  } else {
    result = "身弱";
    reason =
      "印比和小于50为身弱 。\n  印比得分：" +
      score +
      `分，\n传统派判断方法：(年:8+4,月:12+40 日支:12 时：12+12分`;
  }
  return {
    result: result,
    reason: reason,
  };
};


//得到十神的数量  
export const getShiShenNumBase = (obj: string[]): Record<string, number> => {
  const ShiShen: Record<string, number> = {
    正官: 0,
    七杀: 0,
    正印: 0,
    偏印: 0,
    正财: 0,
    偏财: 0,
    比肩: 0,
    劫财: 0,
    食神: 0,
    伤官: 0,
  };

  for (const item of obj) {
    if (item in ShiShen) {
      ShiShen[item]++;
    }
  }

  return ShiShen;
};

//得到十神的数量  
export const getWuxingNumBase = (obj: string[]): Record<string, number> => {
  const wuxingNum: Record<string, number> = {
    木: 0,
    火: 0,
    土: 0,
    金: 0,
    水: 0
  };

  for (const item of obj) {
    if (item in wuxingNum) {
      wuxingNum[item]++;
    }
  }

  return wuxingNum;
};




//计算十神数量
export const ComputedShiShen = (obj: any, type = "default") => {
  let ganList = [
    obj.getYearShiShenGan(),
    obj.getMonthShiShenGan(),
    obj.getTimeShiShenGan(),
  ];
  let DayGanWuxing = obj.getDayWuXing()[0];
  let DayGan = obj.getDayGan();

  let list = [];
  if (type == "all") {
    list = [
      ...obj.getYearShiShenZhi(),
      ...obj.getMonthShiShenZhi(),
      ...obj.getDayShiShenZhi(),
      ...obj.getTimeShiShenZhi(),
      ...ganList,
    ];
  } else {
    list = [
      obj.getYearShiShenZhi()[0],
      obj.getMonthShiShenZhi()[0],
      obj.getDayShiShenZhi()[0],
      obj.getTimeShiShenZhi()[0],
      ...ganList,
    ];
  }

  // 得出来合计
  const ShiShen = {
    正官: 0,
    七杀: 0,
    正印: 0,
    偏印: 0,
    正财: 0,
    偏财: 0,
    比肩: 0,
    劫财: 0,
    食神: 0,
    伤官: 0,
  };

  for (let i = 0; i < list.length; i++) {
    let shiShen = list[i];

    if (ShiShen[shiShen]) {
      ShiShen[shiShen]++;
    } else {
      ShiShen[shiShen] = 1;
    }
  }

  // 得到十神五行
  const ShiShenWuXing = {
    正官: "",
    七杀: "",
    正印: "",
    偏印: "",
    正财: "",
    偏财: "",
    比肩: "",
    劫财: "",
    食神: "",
    伤官: "",
  };
  const ShiShenEleList = getShiShenXing(DayGan, "ele");

  for (let key in ShiShenWuXing) {
    ShiShenWuXing[key] = getWuXingByShiShen(DayGanWuxing, key);
  }

  // 得到合计
  const ShiShenSumNum = {
    比劫: ShiShen["比肩"] + ShiShen["劫财"],
    食伤: ShiShen["食神"] + ShiShen["伤官"],
    财才: ShiShen["正财"] + ShiShen["偏财"],
    官杀: ShiShen["正官"] + ShiShen["七杀"],
    印枭: ShiShen["正印"] + ShiShen["偏印"],
  };

  let res = {
    ShiShen: ShiShen,
    ShiShenSumNum: ShiShenSumNum,
    ShiShenWuXing: ShiShenWuXing,
    ShiShenEleList: ShiShenEleList,
  };

  return res;
};

//计算阴阳数量
export const ComputedYinYang = (obj: any, type = "default") => {
  let baseList = obj.toString().split(" ").join("").split("").slice(0, 8);

  let list = [];
  if (type == "all") {
    list = [
      ...obj.getYearHideGan(),
      ...obj.getMonthHideGan(),
      ...obj.getDayHideGan(),
      ...obj.getTimeHideGan(),
      ...baseList,
    ];
  } else {
    list = baseList;
  }

  // 得出来合计
  let YinYang = { 阴: 0, 阳: 0 };
  let ChunYinYang = { 阴: 0, 阳: 0, 混: 0 };
  let ShuiHuoYinYang = { 阴: 0, 阳: 0 };

  // 传统阴阳
  for (let i = 0; i < list.length; i++) {
    let yinyang = tianganYinYang[list[i]] || dizhiYinYang[list[i]];
    YinYang[yinyang]++;
  }

  // 纯阴阳
  for (let i = 0; i < list.length; i++) {
    let yinyang = tianganChunYinYang[list[i]] || dizhiChunYinYang[list[i]];
    ChunYinYang[yinyang]++;
  }
  // 水火阴阳
  for (let i = 0; i < list.length; i++) {
    let yinyang = tianganShuHuoYinYang[list[i]] || dizhiShuHuoYinYang[list[i]];
    ShuiHuoYinYang[yinyang]++;
  }

  let res = {
    YinYang: YinYang,
    ChunYinYang: ChunYinYang,
    ShuiHuoYinYang: ShuiHuoYinYang,
  };

  return res;
};

export const GetWuxingColor = (item: string) => {
  return wuxingcolorList[item];
};

// 计算五行个数
export const ComputedWuXing = (obj: any, type = "default") => {
  let str =
    obj.getYearWuXing() +
    obj.getMonthWuXing() +
    obj.getDayWuXing() +
    obj.getTimeWuXing();




  if (type == "all") {
    const list = [
      ...obj.getYearHideGan(),
      ...obj.getMonthHideGan(),
      ...obj.getDayHideGan(),
      ...obj.getTimeHideGan(),
    ];
    for (let item of list) {
      str += TransformWuXing(item);
    }
  }
  let num = [0, 0, 0, 0, 0];
  const wuxing = str.split("");

  // let rg = 0;
  let DayGanWuxing = obj.getDayWuXing()[0];


  for (let i = 0; i < wuxing.length; i++) {
    // 取得某个五行的索引
    const index = wuxingLabelList.indexOf(wuxing[i]);

    // 按照 木 火 土 金 水的顺序赋值
    num[index] = num[index] + 1;
  }

  let wuxingNumObj = {};
  let ShiShenWuXingList = {};
  let WuXingShiShenList = {};

  for (let i = 0; i < wuxingLabelList.length; i++) {
    wuxingNumObj[wuxingLabelList[i]] = num[i];
  }


  // Using Object.fromEntries to create object in one line
  ShiShenWuXingList = Object.fromEntries(
    wuxingToShishenList[DayGanWuxing].map((shishen, i) => [shishen, wuxingLabelList[i]])
  );

  for (let i = 0; i < wuxingLabelList.length; i++) {
    WuXingShiShenList[wuxingLabelList[i]] =
      wuxingToShishenList[DayGanWuxing][i];
  }

  let res = {
    list: num,
    wuxingNumObj: wuxingNumObj,
    total: wuxing.length,
    label: wuxingToShishenList[DayGanWuxing],
    ShiShenWuXingList: ShiShenWuXingList,
    WuXingShiShenList: WuXingShiShenList,
  };

  return res;
};

// 日主天干转十神
export const TianGanToShiShen = (str: string): string[] => {
  const list = wuxingToShishenList;
  return list[wuxingLabelList.indexOf(str)];
};

// 处理CDN静态资源
export const GetFileUrl = (path) => {
  return baseUrl + path;
};
// ====== 从子模块 barrel re-export（保持向后兼容） ======

// 格局引擎
export { getCommonGeJu, getSpecGeJu, getSpecHuaQiGeJu, getSpecFuGuiGeJu } from './geju-engine';

// 生克评分
export { getKeDayGanWuxing, getShengKeScore, getShenKeAllNum, isEven, getBaZiShengKeNum, getShenKeNum, getNormalGeJu } from './shengke-score';

// 喜忌用神
export { getLoveHate, getWuxingQiangRuo } from './lovehate';
