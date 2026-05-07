// @ts-nocheck
/**
 * 格局引擎  从 utils.ts 拆分
 * 包含正八格、特殊格局、化气格、富贵格等计算逻辑
 */
import { LunarUtil } from 'lunar-typescript';
import {
  countElements,
  getDiZhiRela,
  getEightSumInfo,
  getGanShiShen,
  getifExistGen,
  getShiShenXing,
  getWuxing,
  getWuxingByGanZhi,
  getWuXingByShiShen,
  getWuXingRelation,
  getWuxingShiShen,
  wuxingToShishenList,
} from './zytransform';
import { getShenQiangShenRuo } from './utils';
import * as LoveHate from './lovehate';
import { getKeDayGanWuxing } from './shengke-score';

// 得到正八格格局
// 正官格 七杀格(偏官格)
// 正印格 偏印格
// 正财格 偏财格
// 食神格 伤官格
// 建禄格(比肩格)
// 阳刃格 (劫财格)
// 正八格的分辨方法1.月支本气是否透干2.月支中气是否透干 3 月支余气是否透干
// 还有一种特殊情况，就是月令的藏干在天干上没有透出。
// 则直接以月令的十神定格局。[漫画国学]
// (一) 月支本气透于天干(如寅月透甲, 卯月透乙, 辰月透戌, 巳月透丙, 午月透丁, 未月透己, 申月透庚, 酉月透辛, 戌月透亥, 亥月透壬).
// (二) 干上未透月支本气, 而透月支所藏之神, 即以该神取为格局, (如寅月未透甲木于干上, 而透丙或透戊, 则可取丙或戊为格). 若支藏两神, 并透干上,则斟酌其一(以有力而无克合者为上).
// (三) 月支本气未透, 月内所藏之神, 亦不透, 以月内人元, 轻重较量, 择一有力而无克合者为格.
//
export const getCommonGeJu = (eightChar: any) => {
  interface ResultType {
    result: string;
    xiShiShen: string[]; // 假设数组中存放的是字符串
    jishiShen: string[]; // 同上
    xiWuxing: string[]; // 同上
    jiWuxing: string[]; // 同上
    reason: string; // 原因或描述，假设为字符串
  }

  let resultObj: ResultType = {
    result: "",
    xiShiShen: [],
    jishiShen: [],
    xiWuxing: [],
    jiWuxing: [],
    reason:
      " 以月令十神为主，如果本气是透出的，则以本气，如本气没透出 ，则找余气，同透或者同不透,取五行能量强者。\n 格局共有: 正官格 | 七杀格 | 正财格 | 偏财格 | 正印格 | 偏印格 | 食神格 | 伤官格 | 建禄格(比肩格) | 阳刃格(劫财格) 共十种",
  };
  //得到身强身弱
  let shenqiangruo = getShenQiangShenRuo(eightChar).result;
  //得到十神的数量
  let ShiShenSum = getEightSumInfo(eightChar).ShiShenSum;
  //得到十神对应的五行
  let ShiShenWuxing = getEightSumInfo(eightChar).ShiShenWuXingList;

  let monthShiShenZhi: string[] = eightChar.getMonthShiShenZhi(); //得到月令十神
  let MonthHideGan: string[] = eightChar.getMonthHideGan();
  let touchuShiShen: string[] = []; //得到透出的十神
  touchuShiShen = touchuShiShen.concat(
    eightChar.getYearShiShenGan(),
    eightChar.getMonthShiShenGan(),
    eightChar.getTimeShiShenGan()
  );

  //得到能量排行
  let wuxingQiangRuo = LoveHate.getWuxingQiangRuo(eightChar);

  //  wuxingQiangRuo['金'].score >= 90

  let results: string = "";
  //如果本气是透出的，则以本气为主
  if (touchuShiShen.includes(monthShiShenZhi[0])) {
    results = monthShiShenZhi[0];
  }
  //如果本气没透出 ，则找余气是否透出
  else {
    // 如果本气没有透出找中气和余气，如果三个隐藏支

    if (monthShiShenZhi.length === 3) {
      if (
        touchuShiShen.includes(monthShiShenZhi[1]) &&
        !touchuShiShen.includes(monthShiShenZhi[2])
      ) {
        results = monthShiShenZhi[1];
      } else if (
        !touchuShiShen.includes(monthShiShenZhi[1]) &&
        touchuShiShen.includes(monthShiShenZhi[2])
      ) {
        results = monthShiShenZhi[2];
      } //都不透,取年月时天干的五行能量强为主
      else {
        // let scores = [wuxingQiangRuo[getWuxingGan(MonthHideGan[0])].score,
        let scores = [
          wuxingQiangRuo[eightChar.getYearWuXing()[0]].score,
          wuxingQiangRuo[eightChar.getMonthWuXing()[0]].score,
          wuxingQiangRuo[eightChar.getTimeWuXing()[0]].score,
        ];
        let maxScore = Math.max(...scores);
        let maxIndex = scores.indexOf(maxScore);
        results = touchuShiShen[maxIndex];
      }
    }

    if (monthShiShenZhi.length === 2) {
      if (touchuShiShen.includes(monthShiShenZhi[1])) {
        results = monthShiShenZhi[1];
      } //同透或者同不透,取五行能量为主
      else {
        let scores = [
          wuxingQiangRuo[eightChar.getYearWuXing()[0]].score,
          wuxingQiangRuo[eightChar.getMonthWuXing()[0]].score,
          wuxingQiangRuo[eightChar.getTimeWuXing()[0]].score,
        ];
        let maxScore = Math.max(...scores);
        let maxIndex = scores.indexOf(maxScore);
        results = touchuShiShen[maxIndex];
      }
    }

    if (monthShiShenZhi.length === 1) {
      // results = monthShiShenZhi[0];

      let scores = [
        wuxingQiangRuo[eightChar.getYearWuXing()[0]].score,
        wuxingQiangRuo[eightChar.getMonthWuXing()[0]].score,
        wuxingQiangRuo[eightChar.getTimeWuXing()[0]].score,
      ];
      let maxScore = Math.max(...scores);
      let maxIndex = scores.indexOf(maxScore);
      results = touchuShiShen[maxIndex];
    }
  }

  //得到格局结果
  resultObj.result = results + "格";

  //开始获取喜忌
  switch (results) {
    case "正官":
    case "偏官":
      if (ShiShenSum["正印"] + ShiShenSum["偏印"] > 0) {
        let array: string[] = [];
        let newArray = array.concat(["正印"]);

        resultObj.xiShiShen = resultObj.xiShiShen.concat(["正印"]);
        resultObj.xiShiShen = resultObj.xiShiShen.concat(["偏印"]);
        resultObj.xiWuxing = [].concat(ShiShenWuxing["正印"]);
      }
      //&& shenqiangruo === '身强') || shenqiangruo === '身弱' && ShiShenSum['食神'] + ShiShenSum['伤官'] > 0
      if (shenqiangruo === "身强") {
        if (ShiShenSum["正印"] + ShiShenSum["偏印"] === 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat(["食神"]);
          resultObj.xiShiShen = resultObj.xiShiShen.concat(["伤官"]);
          resultObj.xiWuxing = [].concat(ShiShenWuxing["食神"]);
        }
        if (
          ShiShenSum["比肩"] + ShiShenSum["劫财"] >
          ShiShenSum["正官"] + ShiShenSum["七杀"]
        ) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat(["正官"]);
          resultObj.xiShiShen = resultObj.xiShiShen.concat(["七杀"]);
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正官"]);
        }
      }
      //忌神
      resultObj.jishiShen = resultObj.jishiShen.concat("正财");
      resultObj.jishiShen = resultObj.jishiShen.concat("偏财");
      resultObj.jiWuxing = [].concat(ShiShenWuxing["正财"]);
      resultObj.jishiShen = resultObj.jishiShen.concat("比肩");
      resultObj.jishiShen = resultObj.jishiShen.concat("劫财");
      resultObj.jiWuxing = [].concat(ShiShenWuxing["比肩"]);
      break;
    case "正印":
    case "偏印":
      if (ShiShenSum["正官"] + ShiShenSum["七杀"] > 0) {
        resultObj.xiShiShen = resultObj.xiShiShen.concat("正官");
        resultObj.xiShiShen = resultObj.xiShiShen.concat("七杀");
        resultObj.xiWuxing = [].concat(ShiShenWuxing["正官"]);
      }
      if (shenqiangruo === "身弱") {
        resultObj.xiShiShen = resultObj.xiShiShen.concat("正印");
        resultObj.xiShiShen = resultObj.xiShiShen.concat("偏印");
        resultObj.xiWuxing = [].concat(ShiShenWuxing["正印"]);
        if (ShiShenSum["正官"] + ShiShenSum["七杀"] === 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("劫财");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["比肩"]);
        }
      }
      if (shenqiangruo === "身强") {
        if (ShiShenSum["正官"] + ShiShenSum["七杀"] === 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("食神");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("伤官");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["食神"]);
        }
      }

      resultObj.jishiShen = resultObj.jishiShen.concat("正财", "偏财");
      resultObj.jiWuxing = [].concat(ShiShenWuxing["正财"]);

      break;
    case "正财":
    case "偏财":
      if (shenqiangruo === "身强") {
        if (ShiShenSum["食神"] + ShiShenSum["伤官"] > 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("食神");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("伤官");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["食神"]);
        } else {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("正官");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("七杀");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正官"]);
        }
      }

      if (shenqiangruo === "身弱") {
        if (ShiShenSum["正印"] + ShiShenSum["偏印"] > 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("正印");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("偏印");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正印"]);
        } else {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("劫财");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["比肩"]);
        }
      }
      resultObj.jishiShen = resultObj.jishiShen.concat("正财");
      resultObj.jishiShen = resultObj.jishiShen.concat("偏财");
      resultObj.jiWuxing = [].concat(ShiShenWuxing["正财"]);
      break;
    case "食神":
    case "伤官":
      if (shenqiangruo === "身强") {
        if (ShiShenSum["正财"] + ShiShenSum["偏财"] > 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("正财");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("偏财");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正财"]);
        } else {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("正官");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("七杀");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正官"]);
        }
      }
      if (shenqiangruo === "身弱") {
        if (ShiShenSum["正印"] + ShiShenSum["偏印"] > 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("正印");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("偏印");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正印"]);
        } else {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("劫财");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["比肩"]);
        }
      }
      resultObj.jishiShen = resultObj.xiShiShen.concat("食神");
      resultObj.jishiShen = resultObj.xiShiShen.concat("伤官");
      resultObj.jiWuxing = [].concat(ShiShenWuxing["食神"]);
      break;
    case "比肩":
    case "劫财":
      if (shenqiangruo === "身强") {
        if (ShiShenSum["正官"] + ShiShenSum["七杀"] > 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("正官");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("七杀");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正官"]);
        } else {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("食神");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("伤官");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["食神"]);

          resultObj.xiShiShen = resultObj.xiShiShen.concat("正财");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("偏财");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正财"]);
        }
        resultObj.jishiShen = resultObj.jishiShen.concat("比肩");
        resultObj.jishiShen = resultObj.jishiShen.concat("劫财");
        resultObj.jiWuxing = [].concat(ShiShenWuxing["比肩"]);
      }
      if (shenqiangruo === "身弱") {
        if (ShiShenSum["正印"] + ShiShenSum["偏印"] > 0) {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("正印");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("偏印");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["正印"]);
        } else {
          resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩");
          resultObj.xiShiShen = resultObj.xiShiShen.concat("劫财");
          resultObj.xiWuxing = [].concat(ShiShenWuxing["比肩"]);
        }

        resultObj.jishiShen = resultObj.jishiShen.concat("食神");
        resultObj.jishiShen = resultObj.jishiShen.concat("伤官");
        resultObj.jiWuxing = [].concat(ShiShenWuxing["食神"]);

        resultObj.jishiShen = resultObj.jishiShen.concat("正财");
        resultObj.jishiShen = resultObj.jishiShen.concat("偏财");
        resultObj.jiWuxing = [].concat(ShiShenWuxing["正财"]);
      }

      break;
    default:
      break;
  }

  return resultObj;
};

//得到特殊格局  ww
//曲直格炎上格稼穑格从革格润下格

export const getSpecGeJu = (eightChar: any) => {
  interface ResultType {
    result: string;
    xiShiShen: string[]; // 假设数组中存放的是字符串
    jishiShen: string[]; // 同上
    xiWuxing: string[]; // 同上
    jiWuxing: string[]; // 同上
    reason: string; // 原因或描述，假设为字符串
  }

  let resultObj: ResultType = {
    result: "非从化格",
    xiShiShen: [],
    jishiShen: [],
    xiWuxing: [],
    jiWuxing: [],
    reason:
      "曲直格|炎上格|稼穑格|从革格|润下格|从财格|从杀格|从儿格|从势格(从强格从弱格)|从气格",
  };

  let resultArray = [];

  //得到身强身弱
  let shenqiangruo = getShenQiangShenRuo(eightChar).result;
  //得到十神的数量
  let ShiShenSum = getEightSumInfo(eightChar).ShiShenSum;
  //得到十神的数量
  let ShiShenSumBase = getEightSumInfo(eightChar).ShiShenSumBase;
  //得到五行的数量  因为是从气格,所以都是拿七个基本五行来弄的
  let WuXingSum = getEightSumInfo(eightChar).WuXingSum;
  //得到五行的数量  因为是从气格,所以都是拿七个基本五行来弄的
  let WuXingSumBase = getEightSumInfo(eightChar).WuXingSumBase;

  //得到十神对应的五行
  let ShiShenWuxing = getEightSumInfo(eightChar).ShiShenWuXingList;
  //得到十神对应的元素
  let ShiShenGanZhi = getEightSumInfo(eightChar).ShiShenEleList;

  let MonthShiShenZhi: string[] = eightChar.getMonthShiShenZhi(); //得到月令十神
  let YearShiShenZhi: string[] = eightChar.getYearShiShenZhi(); //得到月令十神
  let DayShiShenZhi: string[] = eightChar.getDayShiShenZhi(); //得到月令十神
  let TimeShiShenZhi: string[] = eightChar.getTimeShiShenZhi(); //得到月令十神
  let DayWuXing = eightChar.getDayWuXing();

  let touchuShiShen: string[] = []; //得到透出的十神
  touchuShiShen = touchuShiShen.concat(
    eightChar.getYearShiShenGan(),
    eightChar.getMonthShiShenGan(),
    eightChar.getTimeShiShenGan()
  );

  // 子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥
  ////曲直格炎上格稼穑格从革格润下格
  const dayGan = eightChar.getDayGan();
  const monthZhi = eightChar.getMonthZhi();

  //从强格

  //  从弱格成格条件：日主弱，而命局中财星、官杀、食伤三者并旺，不分高下，无法从其中之一，唯有调和三者，故曰从势格。
  //  四柱干支尽抑泄耗之星，而无比劫，印星生扶，日主衰极宜泄。

  if (
    ShiShenSumBase["比肩"] + ShiShenSumBase["劫财"] > 0 &&
    ShiShenSumBase["正印"] + ShiShenSumBase["偏印"] >= 0 &&
    ShiShenSumBase["比肩"] +
    ShiShenSumBase["劫财"] +
    ShiShenSumBase["正印"] +
    ShiShenSumBase["偏印"] ===
    7
  ) {
    resultObj.result = "从势格[从强格]";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("比劫", "印枭");
    resultObj.xiWuxing = resultObj.xiShiShen.concat(
      ShiShenWuxing["正印"],
      ShiShenWuxing["比肩"]
    );
    resultObj.jishiShen = resultObj.jishiShen.concat("财才", "官杀", "食伤");
    resultObj.jiWuxing = [].concat(
      ShiShenWuxing["正财"],
      ShiShenWuxing["正官"],
      ShiShenWuxing["食神"]
    );
    resultObj.reason =
      " 从势格成格条件：日主弱极，而命局中财星、官杀、食伤三者并存,  流年最怕合成印比之五行破格，则成为一般格局";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // 专旺格以比劫为用，以印为喜助，见食伤泄也好；如见食伤，财也不忌，最忌官杀
  // 曲直格 ----日干为甲乙木，生于春月，地支有寅卯辰会东方局，或亥卯未合木局。同时，八字中不能有庚辛申酉四个字。[木]
  if (
    (dayGan === "甲" || dayGan === "乙") &&
    !["庚", "辛", "申", "酉"].some((element) =>
      eightChar.toString().includes(element)
    ) &&
    ["寅", "卯", "辰"].includes(monthZhi) &&
    (["寅", "卯", "辰"].every((element) =>
      eightChar.toString().includes(element)
    ) ||
      ["亥", "卯", "未"].every((element) =>
        eightChar.toString().includes(element)
      ))
  ) {
    resultObj.result = "曲直格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩", "正印", "食神");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("木", "水", "火");

    resultObj.jishiShen = resultObj.jishiShen.concat("正官");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("金");
    // 专旺格以比劫为用，以印为喜助，见食伤泄也好；如见食伤，财也不忌，最忌官杀
    if (WuXingSumBase["火"] === 0) {
      resultObj.jishiShen.push("正财");
      resultObj.jiWuxing.push("土");
    }
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  //炎上格  日干为丙丁火，生于夏月，地支有已午未会南方局，或寅午成合火局，同时，八字中无壬癸亥子四字。[火]
  if (
    (dayGan === "丙" || dayGan === "丁") &&
    !["壬", "癸", "亥", "子"].some((element) =>
      eightChar.toString().includes(element)
    ) &&
    ["已", "午", "未"].includes(monthZhi) &&
    (["已", "午", "未"].every((element) =>
      eightChar.toString().includes(element)
    ) ||
      ["寅", "戌", "午"].every((element) =>
        eightChar.toString().includes(element)
      ))
  ) {
    resultObj.result = "炎上格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩", "正印", "食神");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("火", "木", "土");
    resultObj.jishiShen = resultObj.jishiShen.concat("正官");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("水");
    // 专旺格以比劫为用，以印为喜助，见食伤泄也好；如见食伤，财也不忌，最忌官杀
    if (WuXingSumBase["土"] === 0) {
      resultObj.jishiShen.push("正财");
      resultObj.jiWuxing.push("金");
    }

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //稼穑格就是八字之中土专旺，成格条件是:  日干为戊已土，生于辰成丑未月，地支辰成丑未全或四柱纯土。同时，八字中不能有甲乙寅卯四个字。  [土]
  if (
    (dayGan === "戊" || dayGan === "已") &&
    !["甲", "乙", "寅", "卯"].some((element) =>
      eightChar.toString().includes(element)
    ) &&
    ["辰", "戌", "丑", "未"].includes(monthZhi) &&
    (["亥", "子", "丑", "未"].every((element) =>
      eightChar.toString().includes(element)
    ) ||
      WuXingSumBase["土"] === 8)
  ) {
    resultObj.result = "稼穑格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩", "正印", "食神");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("土", "金", "火");
    resultObj.jishiShen = resultObj.jishiShen.concat("正官");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("木");

    // 专旺格以比劫为用，以印为喜助，见食伤泄也好；如见食伤，财也不忌，最忌官杀
    if (WuXingSumBase["金"] === 0) {
      resultObj.jishiShen.push("正财");
      resultObj.jiWuxing.push("水");
    }

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //从革格就是八字之中金专旺，成格条件是: 日干为庚辛金，生于秋月，地支有申酉戌会西方局，或已酉丑合金局。同时，八字中不能有丙丁午未四字 [金]
  if (
    (dayGan === "庚" || dayGan === "辛") &&
    !["丙", "丁", "午", "未"].some((element) =>
      eightChar.toString().includes(element)
    ) &&
    ["申", "酉", "戌"].includes(monthZhi) &&
    (["申", "酉", "戌"].every((element) =>
      eightChar.toString().includes(element)
    ) ||
      ["巳", "酉", "丑"].every((element) =>
        eightChar.toString().includes(element)
      ))
  ) {
    resultObj.result = "从革格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩", "正印", "食神");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("金", "土", "水");
    resultObj.jishiShen = resultObj.jishiShen.concat("正官");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("火");

    // 专旺格以比劫为用，以印为喜助，见食伤泄也好；如见食伤，财也不忌，最忌官杀
    if (WuXingSumBase["水"] === 0) {
      resultObj.jishiShen.push("正财");
      resultObj.jiWuxing.push("木");
    }

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //润下格就是八字之中水专旺，成格条件是: 日干为壬癸水，生于冬月，地支有亥子丑会北方局，或申子辰合水局。同时，八字中不能有戊已未成四个字 [水]
  if (
    (dayGan === "壬" || dayGan === "癸") &&
    !["戊", "已", "未", "戌"].some((element) =>
      eightChar.toString().includes(element)
    ) &&
    ["亥", "子", "丑"].includes(monthZhi) &&
    (["亥", "子", "丑"].every((element) =>
      eightChar.toString().includes(element)
    ) ||
      ["申", "子", "辰"].every((element) =>
        eightChar.toString().includes(element)
      ))
  ) {
    resultObj.result = "润下格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("比肩", "正印", "食神");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("水", "金", "木");
    resultObj.jishiShen = resultObj.jishiShen.concat("正官");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("土");
    resultObj.reason =
      "见金水运则大吉，而行土运则凶。如果遇到火，有木则无妨。同时，也怕地支三刑和天干四冲， 如果水太泛，润下格的人可能需要一二位土来筑起堤岸以制之。既有土又怕它与木相会，此时需要有金为印绶来解救，以使人生有成有败。润下格的人喜行西方金运，忌行水火运";
    // 专旺格以比劫为用，以印为喜助，见食伤泄也好；如见食伤，财也不忌，最忌官杀
    if (WuXingSumBase["木"] === 0) {
      resultObj.jishiShen.push("正财");
      resultObj.jiWuxing.push("火");
    }

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // 从财格从杀格从儿格从势格从气格

  let congCaiFlag = false;
  let congErFlag = false;
  switch (DayWuXing.charAt(0)) {
    case "木":
      congCaiFlag = false;
      congErFlag =
        ["已", "午", "未"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["寅", "戌", "午"].every((element) =>
          eightChar.toString().includes(element)
        );
      break;
    case "火":
      congCaiFlag =
        ["申", "酉", "戌"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["巳", "酉", "丑"].every((element) =>
          eightChar.toString().includes(element)
        );
      congErFlag = false;
      break;
    case "土":
      congCaiFlag =
        ["亥", "子", "丑"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["申", "子", "辰"].every((element) =>
          eightChar.toString().includes(element)
        );
      congErFlag =
        ["申", "酉", "戌"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["巳", "酉", "丑"].every((element) =>
          eightChar.toString().includes(element)
        );

      break;
    case "金":
      congCaiFlag =
        ["寅", "卯", "辰"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["亥", "卯", "未"].every((element) =>
          eightChar.toString().includes(element)
        );
      congErFlag =
        ["亥", "子", "丑"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["申", "子", "辰"].every((element) =>
          eightChar.toString().includes(element)
        );
      break;
    case "水":
      congCaiFlag =
        ["已", "午", "未"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["寅", "戌", "午"].every((element) =>
          eightChar.toString().includes(element)
        );
      congErFlag =
        ["寅", "卯", "辰"].every((element) =>
          eightChar.toString().includes(element)
        ) ||
        ["亥", "卯", "未"].every((element) =>
          eightChar.toString().includes(element)
        );
      break;
    default:
      break;
  }
  //日主弱极无根
  let ruoji = shenqiangruo === "身弱"; //  getifExistGen(eightChar, dayGan)   //判断有没有根

  //从财格的成格条件是：日主弱极，又生于财月且天干透财，而地支全财、合财局或会财方。
  // 月令必须是财星，那么月令就必须是杀。
  // 日主在地支中没有根气，也就是说地支中不仅不能有强根，甚至连余气根都不能有，最好是处于退气的状态1。
  // 天干不能出现官星和七杀，才能从财。如果天干中有印星，那么日主就有了依靠，就不能从财了1。
  // 如果天干中有印星，那么印星在地支中不能有根气。例如，如果丙火是印星，而在地支中有戌土（火库），那么日主就不能从财，因为印星有了根气1。

  if (
    ruoji &&
    (MonthShiShenZhi[0] === "正财" || MonthShiShenZhi[0] === "偏财") &&
    (touchuShiShen.includes("正财") || touchuShiShen.includes("偏财")) &&
    !touchuShiShen.includes("正官") &&
    !touchuShiShen.includes("七杀") &&
    ShiShenSumBase["偏印"] + ShiShenSumBase["正印"] === 0
  ) {
    if (
      ((YearShiShenZhi[0] === "正财" || YearShiShenZhi[0] === "偏财") &&
        (DayShiShenZhi[0] === "正财" || DayShiShenZhi[0] === "偏财") &&
        (TimeShiShenZhi[0] === "正财" || TimeShiShenZhi[0] === "偏财")) ||
      congCaiFlag
    ) {
      resultObj.result = "从财格";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("正财", "食神");
      resultObj.xiWuxing = [].concat(
        ShiShenWuxing["正财"],
        ShiShenWuxing["食神"]
      );
      resultObj.jishiShen = resultObj.jishiShen.concat("正印", "比肩");
      resultObj.jiWuxing = [].concat(
        ShiShenWuxing["正印"],
        ShiShenWuxing["比肩"]
      );

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }
  }
  //从杀格的成格条件是：日主弱极，且杀旺而多，而日主身弱不能抗，只得从之。
  let qishaNum: string[] = [];

  if (
    ruoji &&
    (MonthShiShenZhi[0] === "七杀" || MonthShiShenZhi[0] === "七杀") &&
    (touchuShiShen.includes("七杀") || touchuShiShen.includes("七杀")) &&
    !touchuShiShen.includes("食神") &&
    !touchuShiShen.includes("伤官") &&
    ShiShenSumBase["偏印"] + ShiShenSumBase["正印"] === 0
  ) {
    if (
      qishaNum
        .concat(
          YearShiShenZhi[0],
          MonthShiShenZhi[0],
          DayShiShenZhi[0],
          TimeShiShenZhi[0]
        )
        .filter((item) => item === "七杀").length >= 3
    ) {
      resultObj.result = "从杀格";
      resultObj.xiShiShen = resultObj.xiShiShen.concat(
        "正官",
        "七杀",
        "正财",
        "偏财"
      );
      resultObj.xiWuxing = [].concat(
        ShiShenWuxing["正官"],
        ShiShenWuxing["正财"]
      );
      resultObj.jishiShen = resultObj.jishiShen.concat(
        "正印",
        "偏印",
        "比肩",
        "劫财"
      );
      resultObj.jiWuxing = [].concat(
        ShiShenWuxing["正印"],
        ShiShenWuxing["比肩"]
      );

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }
  }

  //  从儿格的成格条件是：日主弱极，天干食伤结党，地支食伤会方局或三合局。日主不堪盗泄，只得从之。因为伤食为我所生，故曰从儿格。

  if (
    ruoji &&
    (MonthShiShenZhi[0] === "食神" || MonthShiShenZhi[0] === "伤官") &&
    (touchuShiShen.includes("食神") || touchuShiShen.includes("伤官")) &&
    ShiShenSumBase["偏印"] + ShiShenSumBase["正印"] === 0
  ) {
    if (
      ((YearShiShenZhi[0] === "食神" || YearShiShenZhi[0] === "伤官") &&
        (DayShiShenZhi[0] === "食神" || DayShiShenZhi[0] === "伤官") &&
        (TimeShiShenZhi[0] === "食神" || TimeShiShenZhi[0] === "伤官")) ||
      congErFlag
    ) {
      resultObj.result = "从儿格";
      resultObj.xiShiShen = resultObj.xiShiShen.concat(
        "正财",
        "偏财",
        "食神",
        "伤官"
      );
      resultObj.xiWuxing = [].concat(
        ShiShenWuxing["正财"],
        ShiShenWuxing["食神"]
      );
      resultObj.jishiShen = resultObj.jishiShen.concat(
        "正印",
        "偏印",
        "正官",
        "七杀"
      );
      resultObj.jiWuxing = [].concat(
        ShiShenWuxing["正印"],
        ShiShenWuxing["正官"]
      );

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }
  }
  // 从气格成格条件：  日主弱极，八字中不论财、官、印绶、食伤之类，如气势在木火，要行木火运。气势在金水，要行金水运，反此必凶。故曰从气格。
  if (ruoji) {
    if (
      WuXingSumBase["木"] + WuXingSumBase["火"] === 7 &&
      !["木", "火"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从木火]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("木", "火");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("金", "水");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["土"] + WuXingSumBase["火"] === 7 &&
      !["土", "火"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从火土]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("土", "火");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("木", "水");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["土"] + WuXingSumBase["金"] === 7 &&
      !["土", "金"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从金土]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("土", "金");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("木", "火");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["水"] + WuXingSumBase["金"] === 7 &&
      !["水", "金"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从水金]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("水", "金");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("土", "火");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["水"] + WuXingSumBase["木"] === 7 &&
      !["水", "木"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从水土]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("水", "木");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("土", "金");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }
    //相克两旺,取通关为用
    if (
      WuXingSumBase["土"] + WuXingSumBase["木"] === 7 &&
      !["土", "木"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从木土]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("火");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("水");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["土"] + WuXingSumBase["水"] === 7 &&
      !["土", "水"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从土水]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("金");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("火");
      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["水"] + WuXingSumBase["火"] === 7 &&
      !["水", "火"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从水火]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("木");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("金");
      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["火"] + WuXingSumBase["金"] === 7 &&
      !["金", "火"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从金火]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("土");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("木");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    if (
      WuXingSumBase["金"] + WuXingSumBase["木"] === 7 &&
      !["金", "木"].includes(DayWuXing.charAt(0))
    ) {
      resultObj.result = "从气格[从金木]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat("");
      resultObj.xiWuxing = resultObj.xiWuxing.concat("水");
      resultObj.jishiShen = resultObj.jishiShen.concat("");
      resultObj.jiWuxing = resultObj.jiWuxing.concat("土");

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }

    //從勢格
    //  从势格成格条件： 日主弱极，而命局中财星、官杀、食伤三者并旺，不分高下，无法从其中之一，唯有调和三者，故曰从势格。
    //  四柱干支尽抑泄耗之星，而无比劫，印星生扶，日主衰极宜泄。

    //  if (ShiShenSum['比肩'] + ShiShenSum['劫财'] + ShiShenSum['正印'] + ShiShenSum['偏印'] === 0 && getifExistGen(eightChar, ShiShenGanZhi['正官']) && getifExistGen(eightChar, ShiShenGanZhi['食伤']) && getifExistGen(eightChar, ShiShenGanZhi['正财'])) {
    if (
      ShiShenSumBase["比肩"] +
      ShiShenSumBase["劫财"] +
      ShiShenSumBase["正印"] +
      ShiShenSumBase["偏印"] ===
      0 &&
      ShiShenSumBase["正官"] + ShiShenSumBase["七杀"] != 0 &&
      ShiShenSumBase["正财"] + ShiShenSumBase["偏财"] != 0 &&
      ShiShenSumBase["食神"] + ShiShenSumBase["伤官"] != 0
    ) {
      resultObj.result = "从势格[从强格]";
      resultObj.xiShiShen = resultObj.xiShiShen.concat(
        "正财",
        "偏财",
        "正官",
        "偏官",
        "食神",
        "伤官"
      );
      resultObj.xiWuxing = [].concat(
        ShiShenWuxing["正财"],
        ShiShenWuxing["正官"],
        ShiShenWuxing["食神"]
      );
      resultObj.jishiShen = resultObj.jishiShen.concat(
        "比肩",
        "劫财",
        "正印",
        "偏印"
      );
      resultObj.jiWuxing = [].concat(
        ShiShenWuxing["正印"],
        ShiShenWuxing["比肩"]
      );
      resultObj.reason =
        " 从势格成格条件：日主弱极，而命局中财星、官杀、食伤三者并存,  流年最怕合成印比之五行破格，则成为一般格局";

      resultArray.push({
        result: resultObj.result,
        xiShiShen: resultObj.xiShiShen,
        xiWuxing: resultObj.xiWuxing,
        jishiShen: resultObj.jishiShen,
        jiWuxing: resultObj.jiWuxing,
        reason: resultObj.reason,
      });
    }
  }

  if (resultArray.length === 0) {
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // return resultObj;
  return resultArray;
};

//对应的化格自然也就有五种：  化格 化土格 化金格  化水格 化木格  化火格

export const getSpecHuaQiGeJu = (eightChar: any) => {
  interface ResultType {
    result: string;
    xiShiShen: string[]; // 假设数组中存放的是字符串
    jishiShen: string[]; // 同上
    xiWuxing: string[]; // 同上
    jiWuxing: string[]; // 同上
    reason: string; // 原因或描述，假设为字符串
  }
  let resultObj: ResultType = {
    result: "非化气格",
    xiShiShen: [],
    jishiShen: [],
    xiWuxing: [],
    jiWuxing: [],
    reason: "化土格| 化金格| 化水格| 化木格| 化火格|",
  };

  let resultArray = [];
  //得到身强身弱
  let shenqiangruo = getShenQiangShenRuo(eightChar).result;
  //得到十神的数量
  let ShiShenSum = getEightSumInfo(eightChar).ShiShenSum;
  //得到十神的数量
  let ShiShenSumBase = getEightSumInfo(eightChar).ShiShenSumBase;
  //得到五行的数量
  let WuXingSum = getEightSumInfo(eightChar).WuXingSum;
  //得到十神对应的五行
  let ShiShenWuxing = getEightSumInfo(eightChar).ShiShenWuXingList;
  //得到十神对应的元素
  let ShiShenGanZhi = getEightSumInfo(eightChar).ShiShenEleList;

  const YearGan = eightChar.getYearGan();
  const YearZhi = eightChar.getYearZhi();
  const MonthGan = eightChar.getMonthGan();
  const MonthZhi = eightChar.getMonthZhi();
  const DayGan = eightChar.getDayGan();
  const DayZhi = eightChar.getDayZhi();
  const TimeGan = eightChar.getTimeGan();
  const TimeZhi = eightChar.getTimeZhi();

  let MonthGanShiShen = eightChar.getMonthShiShenGan();
  let MonthZhiShiShen = eightChar.getMonthShiShenZhi();
  let YearGanShiShen = eightChar.getYearShiShenGan();
  let YearZhiShiShen = eightChar.getYearShiShenZhi();
  let TimeGanShiShen = eightChar.getTimeShiShenGan();
  let TimeZhiShiShen = eightChar.getTimeShiShenZhi();
  let DayZhiShiShen = eightChar.getDayShiShenZhi();

  let YearWuxing = eightChar.getYearWuXing();
  let MonthWuxing = eightChar.getMonthWuXing();
  let DayWuxing = eightChar.getDayWuXing();
  let TimeWuxing = eightChar.getTimeWuXing();

  let YearGanZhi = YearGan + YearZhi;
  let MonthGanZhi = MonthGan + MonthZhi;
  let DayGanZhi = DayGan + DayZhi;
  let TimeGanZhi = TimeGan + TimeZhi;

  let touchuShiShen: string[] = []; //得到透出的十神
  touchuShiShen = touchuShiShen.concat(
    eightChar.getYearShiShenGan(),
    eightChar.getMonthShiShenGan(),
    eightChar.getTimeShiShenGan()
  );

  let GansArray: string[] = [];
  GansArray = GansArray.concat(
    eightChar.getYearGan(),
    eightChar.getMonthGan(),
    eightChar.getDayGan(),
    eightChar.getTimeGan()
  );

  let ZhisArray: string[] = [];
  ZhisArray = ZhisArray.concat(
    eightChar.getYearZhi(),
    eightChar.getMonthZhi(),
    eightChar.getDayZhi(),
    eightChar.getTimeZhi()
  );

  const GansWuxing = countElements(GansArray);

  const ZhisWuxing = countElements(ZhisArray);

  let DiZhiRela = getDiZhiRela(eightChar); //取得八字地支的所有关系

  // 子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥
  ////曲直格炎上格稼穑格从革格润下格

  let heHuaStr: string[]; //天干合化的天干组合数组
  let HeFlag: string[]; // 是否被合
  //  https://www.zhouyi.cc/bazi/sm/21405.html  此文介绍  化气格是日干与月干或时干之天干形成五合之时，方可论化。日与年遥隔，不可论化

  //  成格说法一： http://www.360doc.com/content/10/0409/14/1170131_22248591.shtml
  // 甲日己时，己日甲时，甲日己月，己月甲日，生辰戌丑未月，不见木，为化土格。
  // 乙月庚时，庚日乙时，乙日庚月，庚日乙月，生已酉丑申月，不见火，为化金格。
  // 丙日辛时，辛日丙时，丙日辛月，辛日丙月，生申子辰亥月，不见土，为化水格。
  // 丁日壬时，壬日丁时，丁日壬月，壬日丁月，生亥卯未寅月，不见金，为化木格。
  // 戊日癸时，癸日戊时，戊日癸月，癸日戊月，生寅午戌巳月，不见水，为化火格

  // 化气格之用神
  // 既已构成化气格，自喜生助化神。
  // 惟化神太强。亦有喜泄，而泄者为用神，
  // 或化格逢破而得救，即以救神为用神。
  // 然终无以克破化神之字，为用神者也。

  // 成格说法二： http://www.360doc.com/content/23/0212/10/32849216_1067272250.shtml
  //仅有甲己化土及 乙庚化金 仍保留原来之性质，
  // (一)日干与邻干(月干或时干)五合成化成不同于日主五行的命局。
  // (二)在命局中，合成化的五行在命局中形成专旺局面。
  // (三)化神与月支五行相同。
  // (四)喜食伤泄其旺势。

  //  化土格的成格条件：甲日己时、己日甲时、甲日己月、己月甲日，生于戌未月，八字不见木 为化土格

  //  三、甲己化土格
  // 1、日干甲，在月或时干有己；日干己，在月或时干有甲；甲己坐下的是火土地支。
  // 2、命局中其他干支土旺，没有乙寅卯木克破化合之土者为真合化；若局中有乙寅卯木，但受 庚辛 申酉 克去，也算入格；
  // 3、日干甲木，不可见庚月或时，日干己，不可见乙月或时。
  // 3. 柱中其他干支皆土或是生土 合土 会土助土之气势
  // 4. 甲己合化后一气专旺，无能够破格的木 水 金

  heHuaStr = ["甲己", "己甲"]; // 甲己化土格

  if (
    ((heHuaStr.includes(DayGan + TimeGan) &&
      (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("土")) ||
      (heHuaStr.includes(DayGan + MonthGan) &&
        (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("土"))) &&
    (MonthZhi === "辰" ||
      MonthZhi === "戌" ||
      MonthZhi === "丑" ||
      MonthZhi === "未") &&
    GansWuxing["金"] + GansWuxing["金"] === 0 &&
    GansWuxing["水"] + GansWuxing["水"] === 0 &&
    GansWuxing["木"] === 1 &&
    ZhisWuxing["木"] === 0
    // && (DayGan + MonthGan) != '甲庚' && (DayGan + TimeGan) != '甲庚' && (DayGan + MonthGan) != '己乙' && (DayGan + TimeGan) != '己乙'
  ) {
    resultObj.result = "甲己化土格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat(
      getGanShiShen(eightChar, "己"),
      getGanShiShen(eightChar, "辛")
    );
    resultObj.xiWuxing = resultObj.xiWuxing.concat("土", "金");
    resultObj.jishiShen = resultObj.jishiShen.concat(
      getGanShiShen(eightChar, "甲"),
      "正官"
    );
    resultObj.jiWuxing = resultObj.jiWuxing.concat(
      "木",
      getKeDayGanWuxing(DayWuxing.charAt(0))
    );
    resultObj.reason =
      "日主五行【甲己】合化成土，甲日己时、己日甲时、甲日己月、己月甲日，生于戌未月，八字不见木 为化土格";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // 化木格的成格条件：    丁日壬时，壬日丁时，丁日壬月，壬日丁月，生于亥卯未月，八字不见金，为化木格

  //  一、丁壬化木格
  // 1、日干丁，在月干或时干有壬；日干壬，在月或时干有丁；丁壬坐下是水木的地支。
  // 2、命局中其他干支木旺，没有被庚辛申酉金克破合化之木者，为真合化；若有庚辛申酉，但被丙丁巳午克去（或申被子辰合化水局），也算入格。
  // 3、出生于寅卯亥子月令及甲辰时，最易入格；未月，有方局合局而定。
  //  大运或流年若与命局合会成克破化神之五行时，则运途会一落千丈，一败涂地，破家败业，艰辛备尝。
  //  行运之中遇到[克日干] 或者遇到 [克与日干五合之字] 之岁运时，称之「一字还原」，逢之必有伤身、损财、刑伤、病灾甚或官讼牢狱之灾。
  //
  // http://www.360doc.com/content/23/0212/10/32849216_1067272250.shtml

  heHuaStr = ["丁壬", "壬丁"]; // 丁壬化木格

  HeFlag = DiZhiRela.filter((str) => str.includes("申子辰"));

  if (
    ((heHuaStr.includes(DayGan + TimeGan) &&
      (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("木")) ||
      (heHuaStr.includes(DayGan + MonthGan) &&
        (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("木"))) &&
    (MonthZhi === "亥" ||
      MonthZhi === "子" ||
      MonthZhi === "寅" ||
      MonthZhi === "未" ||
      MonthZhi === "卯") &&
    GansWuxing["水"] >= 1 &&
    GansWuxing["火"] === 1 &&
    GansWuxing["金"] === 0 &&
    GansWuxing["土"] === 0 &&
    ZhisWuxing["木"] + ZhisWuxing["水"] === 4
    // GansWuxing["火"] >= GansWuxing["金"] + 1 &&
    // (ZhisWuxing["火"] >= ZhisWuxing["金"] || (ZhisWuxing["金"] === 1 && HeFlag.length > 0))
  ) {
    resultObj.result = "丁壬化木格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat(
      getGanShiShen(eightChar, "甲"),
      getGanShiShen(eightChar, "丙")
    );
    resultObj.xiWuxing = resultObj.xiWuxing.concat("木", "火");
    resultObj.jishiShen = resultObj.jishiShen.concat(
      getGanShiShen(eightChar, "辛"),
      "正官"
    );
    resultObj.jiWuxing = resultObj.jiWuxing.concat(
      "金",
      getKeDayGanWuxing(DayWuxing.charAt(0))
    ); //克日主的和克合化的为忌
    resultObj.reason =
      GansWuxing["金"] +
      "行运之中遇到[克日干] 或者遇到 [克与日干五合之字] 之岁运时，称之「一字还原」，逢之必有伤身、损财、刑伤、病灾甚或官讼牢狱之灾。大运或流年之干支与命局合会成金局来克犯化神 逢之恐有破财、亡身，或色情、人口、酒色风波、败业、刑伤、毁家、官讼、牢狱等灾祸。";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // 化金格的成格条件 ：乙月庚时，庚日乙时，乙日庚月，庚日乙月，生于已酉丑月，八字不见火，为化金格。
  // 1、日干乙，月或时干庚，日干庚，月或时干乙；庚乙坐下是土金地支；
  // 2、命局中其他地支金旺，没有丙丁巳午火克破合化之金者为真合化；若局中有丙丁巳午，但受壬癸子水克去，也算入格。
  // 3、出生于申酉辰丑月令，最易入格；未戌月亦可入格，但是未是火的余气，戌是火库，必须注意五行用事分野及命局的燥湿问题，太燥则难入格。
  // 4、日干是乙木，不可生于辛月或时，日干是庚金，不可生于丙丁月或时。

  heHuaStr = ["庚乙", "乙庚"]; // 乙庚化金格
  if (
    ((heHuaStr.includes(DayGan + TimeGan) &&
      (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("金")) ||
      (heHuaStr.includes(DayGan + MonthGan) &&
        (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("金"))) &&
    (MonthZhi === "酉" ||
      MonthZhi === "申" ||
      MonthZhi === "辰" ||
      MonthZhi === "丑") &&
    GansWuxing["木"] === 1 &&
    ZhisWuxing["金"] + ZhisWuxing["土"] === 4
    // && (DayGan + MonthGan) != '乙辛' && (DayGan + TimeGan) != '乙辛' && (DayGan + MonthGan) != '庚丙' && (DayGan + TimeGan) != '庚丙' && (DayGan + MonthGan) != '庚丁' && (DayGan + TimeGan) != '庚丁'
  ) {
    resultObj.result = "乙庚化金格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat(
      getGanShiShen(eightChar, "辛"),
      getGanShiShen(eightChar, "戊")
    );
    resultObj.xiWuxing = resultObj.xiWuxing.concat("金", "土");
    resultObj.jishiShen = resultObj.jishiShen.concat(
      getGanShiShen(eightChar, "丙"),
      "正官"
    );
    resultObj.jiWuxing = resultObj.jiWuxing.concat(
      "火",
      getKeDayGanWuxing(DayWuxing.charAt(0))
    );
    resultObj.reason =
      "行运之中遇到[克日干] 或者遇到 [克与日干五合之字] 之岁运时，称之「一字还原」，逢之必有伤身、损财、刑伤、病灾甚或官讼牢狱之灾。大运或流年之干支与命局合会成金局来克犯化神 .";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //化水格的成格条件： 丙日辛时，辛日丙时，丙日辛月，辛日丙月，生于申子辰月，八字不见土，为化水格。

  // 1、日干丙，月或时干辛，日干辛，月或时干丙，丙辛坐下是金水的地支。
  // 2、命局中其他地支水旺，没有戊己辰戌丑未土克破合化之水者为真合化格；若有戊己戌未，但被甲乙寅卯克去，丑被亥子会成北方水，辰被申子合成水局，也算入格。
  // 3、出生于申、亥、子月令，最易入格，其次是辰、丑月令，生于壬辰时者亦同；
  // 4、日干丙火，不可见戊己月或时；日干辛金，不可见丁月或时。

  heHuaStr = ["丙辛", "辛丙"]; //丙辛化水格

  HeFlag = DiZhiRela.filter(
    (str) => str.includes("申子辰") || str.includes("亥子丑")
  );

  if (
    ((heHuaStr.includes(DayGan + TimeGan) &&
      (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("水")) ||
      (heHuaStr.includes(DayGan + MonthGan) &&
        (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("水"))) &&
    (MonthZhi === "申" ||
      MonthZhi === "亥" ||
      MonthZhi === "子" ||
      MonthZhi === "辰" ||
      MonthZhi === "丑") &&
    GansWuxing["水"] >= 2 &&
    ZhisWuxing["金"] + ZhisWuxing["水"] === 4 &&
    ((ZhisWuxing["木"] >= ZhisWuxing["土"] && HeFlag.length === 0) ||
      (ZhisWuxing["土"] === 1 && HeFlag.length > 0))
    // && (DayGan + MonthGan) != '甲庚' && (DayGan + TimeGan) != '甲庚' && (DayGan + MonthGan) != '己乙' && (DayGan + TimeGan) != '己乙'
  ) {
    resultObj.result = "丙辛化水格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat(
      getGanShiShen(eightChar, "辛"),
      getGanShiShen(eightChar, "壬"),
      getGanShiShen(eightChar, "甲")
    );
    resultObj.xiWuxing = resultObj.xiWuxing.concat("水", "木");
    resultObj.jishiShen = resultObj.jishiShen.concat(
      getGanShiShen(eightChar, "戊"),
      "正官"
    );
    resultObj.jiWuxing = resultObj.jiWuxing.concat(
      "土",
      getKeDayGanWuxing(DayWuxing.charAt(0))
    );
    resultObj.reason = "日主五行合化成土,十神也都会变,请手动排盘看喜忌!!!!!!";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //化火格的成格条件： 戊日癸时，癸日戊时，戊日癸月，癸日戊月，生于寅午戌月，八字不见水，为化火格。
  // http://www.360doc.com/content/23/0212/10/32849216_1067272250.shtml
  // 1、日干戊，在月或时干有癸；日干癸，在月或时干有戊；戊癸坐下是木火地支；
  // 2、命局中其他干支火旺，没有壬亥子克破合化之火者为真合化；若局中有壬亥子，但被戊己辰戌丑未克去，也算入格。
  // 3、生于寅卯巳午月令及丙辰时，最易入格；生于辰、未、戌、丑月令，若地支形成[巳午未]或者[寅午戌]火方局，亦可入格。
  // 4、日干戊，不可生于甲乙月或时，日干癸，不可生于己月或时。

  heHuaStr = ["戊癸", "癸戊"]; // 戊癸化火格

  HeFlag = DiZhiRela.filter(
    (str) => str.includes("巳午未") || str.includes("寅午戌")
  );

  if (
    ((heHuaStr.includes(DayGan + TimeGan) &&
      (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("火")) ||
      (heHuaStr.includes(DayGan + MonthGan) &&
        (DayWuxing.charAt(1) + TimeWuxing.charAt(1)).includes("火"))) &&
    (MonthZhi === "寅" ||
      MonthZhi === "午" ||
      MonthZhi === "巳" ||
      MonthZhi === "卯" ||
      HeFlag.length > 0) &&
    GansWuxing["水"] <= GansWuxing["土"] &&
    DayGan + MonthZhi != "戊甲" &&
    DayGan + MonthZhi != "戊乙" &&
    DayGan + TimeZhi != "戊甲" &&
    DayGan + TimeZhi != "戊乙" &&
    DayGan + MonthZhi != "癸己" &&
    DayGan + TimeZhi != "癸己" &&
    ZhisWuxing["水"] <= ZhisWuxing["土"] &&
    HeFlag.length === 0
  ) {
    resultObj.result = "戊癸化火格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat(
      getGanShiShen(eightChar, "丙"),
      getGanShiShen(eightChar, "甲")
    );
    resultObj.xiWuxing = resultObj.xiWuxing.concat("火", "木");
    resultObj.jishiShen = resultObj.jishiShen.concat(
      getGanShiShen(eightChar, "戊"),
      getGanShiShen(eightChar, "壬")
    );
    resultObj.jiWuxing = resultObj.jiWuxing.concat(
      "土",
      getKeDayGanWuxing(DayWuxing.charAt(0))
    );
    resultObj.reason = "日主五行合化成土,十神也都会变,请手动排盘看喜忌!!!!!!";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  if (resultArray.length === 0) {
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // return resultObj;
  return resultArray;
};

//对应的化格自然也就有五种：  化格 化土格 化金格  化水格 化木格  化火格

export const getSpecFuGuiGeJu = (eightChar: any) => {
  interface ResultType {
    result: string;
    xiShiShen: string[]; // 假设数组中存放的是字符串
    jishiShen: string[]; // 同上
    xiWuxing: string[]; // 同上
    jiWuxing: string[]; // 同上
    reason: string; // 原因或描述，假设为字符串
  }

  let resultObj: ResultType = {
    result: "非富贵格",
    xiShiShen: [],
    jishiShen: [],
    xiWuxing: [],
    jiWuxing: [],
    reason:
      "富贵格局一般有： 三奇贵人格 | 禄元互换格 | 天元一气格 | 身杀两停格 | 食神制杀格 | 杀印相生格 | 伤官生财格 | 伤官泄秀格 | 伤官配印格 | 日贵格 | 三庚格 | 伤官见官格 | 枭神夺食格 |  庚辛得幸格 | 青龙伏形格 |  朱雀乘风格 | 玄武当权格 | 勾陈得位格 |白虎持势格 | 子午双包格 |  天干顺生格  | 六乙鼠贵格 |  两神成象格(木火通明格、火土成慈格、土金毓秀格、金白水清格、水灵木秀格、金木栋梁格、木土疏通格、土水池沼格、水火既济格、火金器皿格)|",
  };
  let resultArray = [];

  //得到身强身弱
  let shenqiangruo = getShenQiangShenRuo(eightChar).result;
  //得到十神的数量
  let ShiShenSum = getEightSumInfo(eightChar).ShiShenSum;
  //得到十神的数量
  let ShiShenSumBase = getEightSumInfo(eightChar).ShiShenSum;
  //得到五行的数量
  let WuXingSum = getEightSumInfo(eightChar).WuXingSum;
  //得到五行的数量
  let WuXingSumBase = getEightSumInfo(eightChar).WuXingSumBase;
  //得到十神对应的五行
  let ShiShenWuxing = getEightSumInfo(eightChar).ShiShenWuXingList;
  //得到十神对应的元素
  let ShiShenGanZhi = getEightSumInfo(eightChar).ShiShenEleList;

  const YearGan = eightChar.getYearGan();
  const YearZhi = eightChar.getYearZhi();
  const MonthGan = eightChar.getMonthGan();
  const MonthZhi = eightChar.getMonthZhi();
  const DayGan = eightChar.getDayGan();
  const DayZhi = eightChar.getDayZhi();
  const TimeGan = eightChar.getTimeGan();
  const TimeZhi = eightChar.getTimeZhi();

  let MonthGanShiShen = eightChar.getMonthShiShenGan();
  let MonthZhiShiShen = eightChar.getMonthShiShenZhi();
  let YearGanShiShen = eightChar.getYearShiShenGan();
  let YearZhiShiShen = eightChar.getYearShiShenZhi();
  let TimeGanShiShen = eightChar.getTimeShiShenGan();
  let TimeZhiShiShen = eightChar.getTimeShiShenZhi();
  let DayZhiShiShen = eightChar.getDayShiShenZhi();

  let YearWuxing = eightChar.getYearWuXing();
  let MonthWuxing = eightChar.getMonthWuXing();
  let DayWuxing = eightChar.getDayWuXing();
  let TimeWuxing = eightChar.getTimeWuXing();

  let YearGanZhi = YearGan + YearZhi;
  let MonthGanZhi = MonthGan + MonthZhi;
  let DayGanZhi = DayGan + DayZhi;
  let TimeGanZhi = TimeGan + TimeZhi;

  let touchuShiShen: string[] = []; //得到透出的十神
  touchuShiShen = touchuShiShen.concat(
    eightChar.getYearShiShenGan(),
    eightChar.getMonthShiShenGan(),
    eightChar.getTimeShiShenGan()
  );

  //四柱天干顺序同时出现
  let shenShaGanGan: { [key: string]: string[] } = {
    天三奇: ["甲戊庚", "庚戊甲"],
    地三奇: ["乙丙丁", "丁丙乙"],
    人三奇: ["壬癸辛", "辛癸壬"],
  };

  let shenShaTemp: any = {};
  for (let i in shenShaGanGan) {
    let gzs = shenShaGanGan[i];
    for (let j = 0, k = gzs.length; j < k; j++) {
      let gz = gzs[j];
      if (
        gz ==
        eightChar.getYearGan() +
        eightChar.getMonthGan() +
        eightChar.getDayGan() ||
        gz ==
        eightChar.getMonthGan() +
        eightChar.getDayGan() +
        eightChar.getTimeGan()
      ) {
        shenShaTemp[i] = true;
      }
    }
  }
  // 乙丙丁为天上三奇，甲戊庚为地上三奇，辛壬癸为人间三奇 四柱天干同时出现这三大类，就是贵人格

  if (Object.keys(shenShaTemp).length > 0) {
    resultObj.result = "三奇贵人格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "三奇贵人格是命格最好格局之一,万中无一!乙丙丁为天上三奇，甲戊庚为地上三奇，辛壬癸为人间三奇,地上三奇甲戊庚格局最高，必是国家栋梁";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //禄元互换格    中年成大事，大富大贵的格局
  //戊申日见乙卯时  ,  丁酉日见壬寅时 ,  丙子日见癸巳时, 庚子日见丁亥时
  //行运喜财旺之乡，或临官旺地，忌七煞、伤官，怕禄星逢冲。

  if (
    ["戊申乙卯", "丁酉壬寅", "丙子癸巳", "庚子丁亥"].includes(
      DayGanZhi + TimeGanZhi
    )
  ) {
    resultObj.result = "禄元互换格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "禄元互换格，属于非富即贵之命。此格局只有四天四时，即戊申日见乙卯时；丁酉日见壬寅时；丙子日见癸巳时；庚子日见丁亥时";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //天元一气格
  if (
    DayGanZhi === TimeGanZhi &&
    TimeGanZhi === YearGanZhi &&
    YearGanZhi === MonthGanZhi
  ) {
    resultObj.result = "天元一气格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "天元一气格也出过很多皇帝，大人物年柱月柱日柱时柱都是一样的，命运较为奇特,成吉思汗,隋炀帝,杨贵妃,唐太宗";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //在所有成格之七杀格中，尤为上上等富贵者，当属身杀两停格  入格者定为人中龙凤，富贵双全，风云翘楚人物，大富大贵之名  为什么身杀两停会富呢？一个人最好的状态是均衡偏强一点
  //1日元与七杀的能量差不多
  //如果命主的强弱和七杀的强弱大致相当，那么就可以初步判断为身杀两停格。此外，如果命中有食神、印绶、阳刃三者其中之一，那么这个格局就会更加稳定
  //  1、命主与七杀旺度基本共同。 2、若八字中再会食神、印绶、阳刃三者其中之一，尤为贵气。 3、杀稍重者，岁运喜见食神；身稍重者，岁运喜见印绶。
  let compareFlag =
    ShiShenSum["七杀"] - (ShiShenSum["比肩"] + ShiShenSum["劫财"]) === 1;

  if (ShiShenSum["七杀"] >= 2 && compareFlag && shenqiangruo === "身强") {
    resultObj.result = "身杀两停格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "七杀格中，尤为上上等富贵者，当属身杀两停格  入格者定为人中龙凤，富贵双全，风云翘楚人物，大富大贵之名";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //

  // 杀印相生格  八字最高格局，王者格局   古书讲：杀生印，印生身，富贵双全，杀不离印，印不离杀，杀印相生，功名显达。
  // 1日元必须身弱
  // 2本命局有七杀，有正印
  // 3本命局不要有刑冲破害
  // 4印与杀得比例成正比（一个正印可以化解一个七杀，化解两个优点费力，
  // 三个七杀一个正印，这个正印就吃力了）
  // 5男命乾造需要阴日干，女名坤造需要阳日干，有利于发挥才干否则福利消
  // 减
  // 6遇到大运流年有强财来坏印，七杀无制易出灾祸
  // 7日元地支需要有跟，微根都行，无根易短寿
  // 8多柱都有正印最好

  const DiZhiRela: string[] =
    getDiZhiRela(eightChar).length > 0
      ? getDiZhiRela(eightChar)
      : ["无合化关系"];

  let ChongEleHeFlag = DiZhiRela.some((elementA) => {
    return (
      elementA.includes("沖") ||
      elementA.includes("破") ||
      elementA.includes("刑") ||
      elementA.includes("害")
    );
  });

  if (
    getifExistGen(eightChar, DayGan) &&
    ShiShenSum["七杀"] >= 1 &&
    ShiShenSum["正印"] >= 1 &&
    Math.abs(ShiShenSum["正印"] - ShiShenSum["七杀"]) === 1 &&
    shenqiangruo === "身弱" &&
    !ChongEleHeFlag
  ) {
    resultObj.result = "杀印相生格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "八字最高格局，王者格局   古书讲：杀生印，印生身，富贵双全，杀不离印，印不离杀，杀印相生，功名显达名";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // 食神制杀格的前提就是日主要身旺,身旺方能借食为福,假杀为权,担财为富;否则,伤残加临,官非不断,贫贱无疑，食神制杀成格者，文武兼备，无论从政还是经商，都能取得成功
  //在《子平真诠》中说，食神制杀格是大格，它说这个大格的成立是有条件的，
  // 一是身旺、二是杀旺，三是食旺，才能成格。在柱中不能见财，运中也不能见财，见财就破格。
  // 因为财能引通食神之气，形成食神生财，财生杀的形式，将食神之气转向生财又生杀，使食伤不能制杀，杀无制而克身，就会使破格
  if (
    shenqiangruo === "身强" &&
    getifExistGen(eightChar, ShiShenGanZhi["七杀"]) &&
    getifExistGen(eightChar, ShiShenGanZhi["食神"]) &&
    touchuShiShen.includes("食神") &&
    touchuShiShen.includes("七杀") &&
    Math.abs(ShiShenSum["七杀"] - ShiShenSum["食神"]) === 1 &&
    ShiShenSum["正财"] + ShiShenSum["偏财"] === 0
  ) {
    resultObj.result = "食神制杀格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "食神制杀格一是身旺、二是杀旺，三是食旺，才能成格。在柱中不能见财，运中也不能见财，见财就破格 食神制杀是大富大贵的命格";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //伤官生财格
  // 聪明不过伤官伶俐不过七杀。伤官代表聪明，代表上进心，不服输的精神。八字日元身强，伤官旺，财旺，必是富贵之人。
  // 伤官配印主贵。伤官生财主富。
  // 伤官生财格的条件
  // 天干上要不露正官星 , 既财是否成格，既天透地藏。

  if (
    shenqiangruo === "身强" &&
    getifExistGen(eightChar, ShiShenGanZhi["正财"]) &&
    touchuShiShen.includes("伤官") &&
    (touchuShiShen.includes("正财") || touchuShiShen.includes("偏财")) &&
    ShiShenSum["伤官"] >= 1 &&
    ShiShenSum["正财"] >= 1 &&
    Math.abs(ShiShenSum["伤官"] - ShiShenSum["正财"]) === 1 &&
    !touchuShiShen.includes("正官")
  ) {
    resultObj.result = "伤官生财格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "八字最高格局，王者格局   古书讲：杀生印，印生身，富贵双全，杀不离印，印不离杀，杀印相生，功名显达名";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  // 伤官见官格
  // 此格局为凶格，只做介绍，不建议采用。伤官见官为祸百端
  // 伤官代表好胜逞强，不服管制，自命不凡，对谁都看不上眼，高傲清高。官代表上级部门，国家法律法规，是对个人的一种限制行为。
  // 伤官旺，一见到官，会出现丢职、受领导批评、工作受制、下岗，或者官灾诉讼，女同志与丈夫不和等事情。
  // 伤官见官格分析4.
  // 1.日元身强，官为喜用，此时伤官见官，以凶论，容易出上述灾祸。两个喜用打架，容易出现灾祸。
  // 2.日元身弱，官为忌凶，此时伤官见官，不以凶论。两个忌凶打架，是好事。
  // 3.伤官见杀不以伤官见官论。
  // 4.伤官伤尽。日元身强，本命局伤官旺，不见正官，或者余气有个小正官，
  // 为伤官伤尽。四柱中伤官伤尽，岁运逢官星点利，么边伤官见言为祸百端，是指原四柱八字中伤官不尽,岁运又逢官,身又强.自然生出灾

  if (
    shenqiangruo === "身强" &&
    touchuShiShen.includes("伤官") &&
    touchuShiShen.includes("正官")
  ) {
    resultObj.result = "伤官见官格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason = "此格局为凶格,伤官见官为祸百端";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  // 伤官泄秀格
  // 日元身强情况下，全盘只有比劫印枭和伤官,伤官得用，可以把自身的能力发挥出来，也是贵格之一。必为聪明绝顶之人，才华横溢，多为艺术表演和文人学术之人。
  // 伤官泄秀格与伤官配印格的成格条件基本相同唯一不同的是一个身强一个身弱。身弱伤官配印格主贵身强伤官泄秀格主艺术
  // 代表了聪明绝顶。才华横溢

  if (
    shenqiangruo === "身强" &&
    ShiShenSum["七杀"] + ShiShenSum["正官"] + ShiShenSum["食神"] === 0
  ) {
    resultObj.result = "伤官泄秀格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "伤官泄秀格,也是贵格之一。必为聪明绝顶之人，才华横溢，多为艺术表演和文人学术之人。";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  // 伤官配印格  条件日元身弱，伤官为忌凶，印为喜用，以印制伤，才能成格(日元身强，伤官为喜用，就不雪要制服了)
  //2 伤官配印格，  忌见财星，大运流年财星坏印，伤官无制，易出口舌官司。
  //3.伤与印的距离要得当，离得太远，印制不住伤，隔柱能量就变小。
  // 4.偏印也能制服伤官，但是没有正印能量纯粹日元有根，不能太弱，否则短寿。
  // 本命局有刑冲破害，贵气受损
  if (
    shenqiangruo === "身弱" &&
    ShiShenSum["七杀"] + ShiShenSum["正官"] + ShiShenSum["食神"] === 0
  ) {
    resultObj.result = "伤官配印格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason = "伤官配印格,也是贵格之一,身弱伤官配印格主贵。";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  //枭神夺食   当一个人的八字，枭神和食神同时在天干中出现。就构成了枭神夺食的格局，这种格局的人，十之八九都会受到抑郁的困扰。
  if (
    (YearGanShiShen == "偏印" &&
      (MonthGanShiShen === "食神" || MonthZhiShiShen.includes("食神"))) ||
    (MonthGanShiShen == "偏印" &&
      (YearGanShiShen === "食神" ||
        YearZhiShiShen.includes("食神") ||
        DayZhiShiShen.includes("食神"))) ||
    (TimeGanShiShen == "偏印" && DayZhiShiShen.includes("食神"))
  ) {
    resultObj.result = "枭神夺食格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason = "这种格局的人，十之八九都会受到抑郁的困扰";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // 日贵格总共有六天丁酉 丁亥庚午 庚寅癸巳 癸卯

  if (["丁酉", "丁亥", "癸巳", "癸卯"].includes(DayGanZhi)) {
    resultObj.result = "日贵格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "日贵格是日柱天乙贵人星,总共有六天【丁酉,丁亥,庚午,庚寅,癸巳,癸卯】.出身好,具有高尚的情操和过人的智慧，他们对人宽容，有权威性.他们的人生中会有贵人相助，逢凶化吉,有慈悲心，富贵多福，不恃才傲物，与人和睦相处,长得好看，贵人财旺运，大忌刑冲破害和空亡，如行运犯忌，游行太岁也犯忌，遇见魁罡星，主人一定贫困早夭、";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //三庚格 三庚格，就是天干三个庚。这个格局容易成就很大的事业三庚相连必成大器
  if ((eightChar.toString().match(new RegExp("庚", "g")) || []).length >= 3) {
    resultObj.result = "三庚格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason = "三庚格这个格局容易成就很大的事业,三庚相连必成大器";

    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //还有其它格局,在https://www.qiazhijie.com/view/89440.html 这里,可以继续写进去~~~
  //     贵命格:
  //  4、庚辛得幸格日干为庚辛金，坐支则都是财、官、印贵神，所以称之为得势。此格只六日，即庚午、庚寅、庚戌、辛巳、辛卯、辛未，坐财神者必富。

  if (["庚午", "庚寅", "庚戌", "辛巳", "辛卯", "辛未"].includes(DayGanZhi)) {
    resultObj.result = "庚辛得幸格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "庚辛得幸格日干为庚辛金，坐支则都是财、官、印贵神，所以称之为得势。此格只六日，即庚午、庚寅、庚戌、辛巳、辛卯、辛未，坐财神者必富。";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //   六兽奇异格是为青龙伏形格、朱雀乘风格、 勾陈得位格、螣蛇御风格、白虎持势格、玄武当权格等六格的统称，并非一个格局。
  //  5、青龙伏形格此格日干必须是甲乙木，日支必须属金，木伏金上，便叫做青龙伏形。
  //    柱中的官星通根要多，且四柱不见伤官透干为好；四柱中金和木的力量相当，金木相停为好。
  //    此格专指甲申、甲戌、乙巳、乙酉、乙丑，这五日生人坐下即有财有官，日支必须属金，木伏金上，青龙伏形格 戌中藏辛、巳中藏庚、丑中藏辛，分别为金的余气、都要月令通气有助托，使官星得地，不见伤官，金与木的力量相当，这种格则命贵。如逢库相助，财官双美，更是不寻常的好命。

  let ChongHaiFlag = DiZhiRela.some((elementA) => {
    return (
      (elementA.includes("沖") ||
        elementA.includes("破") ||
        elementA.includes("刑") ||
        elementA.includes("害")) &&
      elementA.includes(DayZhi)
    );
  });

  if (
    ["甲申", "甲戌", "乙巳", "乙酉", "乙丑"].includes(DayGanZhi) &&
    !touchuShiShen.includes("伤官") &&
    !ChongHaiFlag &&
    WuXingSum["金"] === WuXingSum["木"] &&
    (eightChar.getMonthWuXing().charAt(1) === "水" ||
      eightChar.getMonthWuXing().charAt(1) === "木")
  ) {
    resultObj.result = "青龙伏形格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "青龙伏形格此格专指甲申、甲戌、乙巳、乙酉、乙丑，日支木伏金上，戌中藏辛、巳中藏庚、丑中藏辛。月令通气，不见伤官，青龙伏形格都是贵命。如逢库相助，财官双美，更是不寻常的好命.乙巳日出生的人叫“青龙伏藏”，最忌饮酒，切记切记";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  //  6、朱雀乘风格指日干为丙丁火，坐支得金水之乡，便是乘风得势，即金为财而水为官，身旺有助托者富贵。例如丙子、丁亥二日，为水火既济之贵若得申子辰会成水局，也属于水火既济。
  //朱雀乘风格 1、丙申、丙子、丙辰、丁酉、丁丑、丁亥六日所生； 2 、日元要有根。 3 忌见伤官劫财透干无制化，而克伤财官；及刑冲破害财官，而破格，岁运皆同。
  //   但水火既济要水火力量相当，不致偏枯。又如丙申、丙辰、丁酉、丁丑，日主身得助托，有生气相扶，财星官星旺相，都是贵命。但有以日柱时柱为丁未者不吉，这叫朱雀折足。

  if (
    ["丙申", "丙子", "丙辰", "丁酉", "丁丑", "丁亥"].includes(DayGanZhi) &&
    !touchuShiShen.includes("伤官") &&
    !touchuShiShen.includes("劫财") &&
    !ChongHaiFlag &&
    WuXingSum["水"] === WuXingSum["火"] &&
    (eightChar.getMonthWuXing().charAt(1) === "水" ||
      eightChar.getMonthWuXing().charAt(1) === "火")
  ) {
    resultObj.result = "朱雀乘风格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "雀乘风格指日干为丙丁火，坐支得金水之乡，便是乘风得势，即金为财而水为官，身旺有助托者富贵,属于水火既济,入此格者，主雄辩滔滔、礼仪非凡，富贵之命也";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //  7、玄武当权格此格是指日干为壬癸水，坐支得财、官印，当权即得势之意。主要有壬寅、壬午、壬戌、壬辰、癸巳、癸丑、癸未七日，此七日坐下或官或财或印，若日主身旺有依托，官星月令通气都属贵命。

  if (
    ["壬寅", "壬午", "壬戌", "壬辰", "癸巳", "癸丑", "癸未"].includes(
      DayGanZhi
    ) &&
    !touchuShiShen.includes("伤官") &&
    !touchuShiShen.includes("劫财") &&
    !ChongHaiFlag &&
    (eightChar.getMonthWuXing().charAt(1) === "水" ||
      eightChar.getMonthWuXing().charAt(1) === "金")
  ) {
    resultObj.result = "玄武当权格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "玄武当权格此格是指日干为壬癸水，坐支得财、官印，当权即得势之意。主要有壬寅、壬午、壬戌、壬辰、癸巳、癸丑、癸未七日，此七日坐下或官或财或印，若日主身旺有依托，官星月令通气都属贵命,玄武当权格.主人性格温和，有智慧有礼貌，面带赤星，威而不猛";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //  7、勾陈得位格   戊申、戊子、戊辰、戊寅、己亥、己卯、己未七日生；   日元有根； 。

  if (
    ["戊申", "戊子", "戊辰", "戊寅", "己亥", "己卯", "己未"].includes(
      DayGanZhi
    ) &&
    !touchuShiShen.includes("伤官") &&
    !touchuShiShen.includes("劫财") &&
    !ChongHaiFlag &&
    (eightChar.getMonthWuXing().charAt(1) === "土" ||
      eightChar.getMonthWuXing().charAt(1) === "火")
  ) {
    resultObj.result = "勾陈得位格 ";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "勾陈得位格   戊申、戊子、戊辰、戊寅、己亥、己卯、己未七日生；日元有根, 官星月令通气都属贵命,身杀两停，名利双辉。鼎甲出身，仕至极品";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //  8 、白虎持势格  / 入格条件如下：     1、庚寅、庚午、庚戌、辛卯、辛巳、辛未六日生；    2、日元有根；    / 3、忌伤官、劫财透干无制化，而克伤财官；及刑冲破害财官，而破格，岁运皆同。
  // 其中，辛卯日时为“犯白虎”，命运不通，多有眼睛之疾，重犯者尤忌之。
  // 辛卯日，纳音五行松柏木：阴阳差错日，恐夫妻不睦。坐偏财，桃花，男命喜欢女色，女命稍好，但漂亮难禁风流（因既漂亮，又浪漫，对异性富吸引力）。
  // 生于子时，入六阴朝阳格。
  //  日柱为此六日之一即是入格，日主要有助托，受有生气，或官星强旺得时而有生助，若年月时柱中不见财神官星，日坐官星者必贵，坐财神者必富。岁运喜忌相同

  if (
    ["庚寅", "庚午", "庚戌", "辛卯", "辛巳", "辛未"].includes(DayGanZhi) &&
    !touchuShiShen.includes("伤官") &&
    !touchuShiShen.includes("劫财") &&
    !ChongHaiFlag &&
    (eightChar.getMonthWuXing().charAt(1) === "土" ||
      eightChar.getMonthWuXing().charAt(1) === "金")
  ) {
    resultObj.result = "白虎持势格 ";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "白虎持势格 庚寅、庚午、庚戌、辛卯、辛巳、辛未六日生；日元有根, 官星月令通气都属贵命, 但辛卯日时为“犯白虎”，命运不通，多有眼睛之疾，夫妻不睦。坐偏财，桃花，男命喜欢女色，女命稍好，但漂亮难禁风.";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  //  8、还魂借气格五行处在寄生十二宫中的死、绝宫位，这本属无气不吉，但若有救而生还者便属于还魂借气了。逢此还魂借气者最吉，有福神相助者次之。

  //  9、子午双包格四柱地支是两午两子，或两子包一午，或两午包一子，逢命入此格者，都是贵命。
  const dizhiList = [YearZhi, MonthZhi, DayZhi, TimeZhi];
  const ziCount = dizhiList.filter((item) => item === "子").length;
  const wuCount = dizhiList.filter((item) => item === "午").length;
  if (
    YearZhi + MonthZhi + DayZhi === "午子午" ||
    YearZhi + MonthZhi + DayZhi === "子午子" ||
    MonthZhi + DayZhi + TimeZhi === "午子午" ||
    MonthZhi + DayZhi + TimeZhi === "子午子" ||
    YearZhi + DayZhi + TimeZhi === "午子午" ||
    YearZhi + DayZhi + TimeZhi === "子午子" ||
    YearZhi + MonthZhi + TimeZhi === "午子午" ||
    YearZhi + MonthZhi + TimeZhi === "子午子" ||
    (ziCount === 2 && wuCount === 2)
  ) {
    resultObj.result = "子午双包格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "午双包格四柱地支是两午两子，或两子包一午，或两午包一子，逢命入此格者，都是贵命。";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //  上等命格
  //      1、两神成象格是柱中五行干支各占两干两支的入格为用的好八字。如八字癸酉，庚申，壬子，辛亥。此命从旺无疑，但因构成两神成象格，会比一般的从旺格局的八字更好一些。
  // 就是一个命局里面，只有两种五行之气，其中天干各有两个，地支各有两个，构成一种五行之气，这种气势格局，其实是一种特殊的命局，名字是“两神成象格”或者“两气成形格”。
  //  水木、木火、火土、土金、金水  +  木金、金火、火水、水土、土木  只有五行之气的天干地支各半，气势也能够达到平衡，才算“成象”
  //  木火通明格、火土成慈格、土金毓秀格、金白水清格、水灵木秀格、金木栋梁格、木土疏通格、土水池沼格、水火既济格、火金器皿格十种

  let GansArray: string[] = [];
  GansArray = GansArray.concat(
    eightChar.getYearGan(),
    eightChar.getMonthGan(),
    eightChar.getDayGan(),
    eightChar.getTimeGan()
  );
  const GansWuxing = countElements(GansArray);

  if (
    (WuXingSum["水"] === 4 &&
      WuXingSum["木"] === 4 &&
      GansWuxing["水"] === 2) ||
    (WuXingSum["火"] === 4 &&
      WuXingSum["木"] === 4 &&
      GansWuxing["火"] === 2) ||
    (WuXingSum["火"] === 4 &&
      WuXingSum["土"] === 4 &&
      GansWuxing["土"] === 2) ||
    (WuXingSum["土"] === 4 &&
      WuXingSum["金"] === 4 &&
      GansWuxing["金"] === 2) ||
    (WuXingSum["金"] === 4 &&
      WuXingSum["水"] === 4 &&
      GansWuxing["水"] === 2) ||
    (WuXingSum["金"] === 4 &&
      WuXingSum["木"] === 4 &&
      GansWuxing["金"] === 2) ||
    (WuXingSum["木"] === 4 &&
      WuXingSum["土"] === 4 &&
      GansWuxing["土"] === 2) ||
    (WuXingSum["土"] === 4 &&
      WuXingSum["水"] === 4 &&
      GansWuxing["水"] === 2) ||
    (WuXingSum["水"] === 4 &&
      WuXingSum["火"] === 4 &&
      GansWuxing["水"] === 2) ||
    (WuXingSum["火"] === 4 && WuXingSum["金"] === 4 && GansWuxing["金"] === 2)
  ) {
    resultObj.result = "两神成象格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "两神成象格是 只有两种五行之气，其中天干各有两个，地支各有两个， 一个命局里面，只有两种五行之气，逢命入此格者，都是贵命。木火通明格、火土成慈格、土金毓秀格、金白水清格、水灵木秀格、金木栋梁格、木土疏通格、土水池沼格、水火既济格、火金器皿格十种";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  //      2、天干顺生格指年干生月干，月干生日干，日干生时干的顺生八字。这类八字若入格为用，是福寿绵长的稀缺八字。

  if (
    getWuXingRelation(MonthWuxing.charAt(0), YearWuxing.charAt(0)) === "生" &&
    getWuXingRelation(DayWuxing.charAt(0), MonthWuxing.charAt(0)) === "生" &&
    getWuXingRelation(TimeWuxing.charAt(0), DayWuxing.charAt(0)) === "生"
  ) {
    resultObj.result = "天干顺生格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "天干顺生格指年干生月干，月干生日干，日干生时干的顺生八字。这类八字若入格为用，是福寿绵长的稀缺八字。 ";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }
  //      3、三奇格  天上三奇甲戊庚，地下三奇壬癸辛，人中三奇乙丙丁，这就是说甲年生的人，月干，日干中间同时挨次出现戊，庚或甲月生人，日干，时干中挨次出现戊，庚，就算是应了“天上三奇”。

  //      其它类推。逢三奇的八字只要入格为用，是富贵八字。
  //     4、天地德合格是时柱和日柱天合地合或日柱和月柱天合地合的八字。（如某人的八字日柱为己卯，时柱为甲戌）。这类八字若入格为用，会有很好的人缘，由于得民心者得天下，古书上把这类八字格局列入了贵格。
  //     5、日贵格是日柱为丁酉，丁亥，癸巳或癸卯的入格为用的富贵八字。是为日干坐于天乙贵人的缘故，天乙贵人是一种吉星也 [上面写了]。

  // 特殊命格有哪些
  //     1、六乙鼠贵格六乙鼠贵格，指的是一个人在六乙日里出世，且出生时辰为刚好是子时，八字中入格为用，这种八字格局十分特殊，是国学学中所说的六乙鼠贵格，都是非常好的八字格局。
  //        一般而言，这种八字格局的人，命中一定可以富贵非凡，一辈子中的运程也会相当好，是一个命运、运程、财运、福气、事业好得了不得的人！
  // 六乙鼠贵格是一种传统的国学学概念，它指的是出生日元为乙木的人，在特定的出生时辰（即子时）下，形成的一种特殊的八字格局。这种格局的特点是：
  // 日元为乙木：乙木代表的是柔顺、温和、有生机的特质。
  // 出生时辰为子时：子时在中国传统时辰划分中，代表着新的开始和生机勃勃的时刻。
  // 八字中无官煞星：官煞星通常代表压力和束缚，而六乙鼠贵格中不喜见官煞星。
  // 地支中无午火逢冲：午火与子水相冲，冲则不稳定，不利于格局的稳定和贵气的发挥。
  // 天乙贵人在子：乙木见子为天乙贵人，天乙贵人是众多神煞中非常重要的贵人，因此称之为“六乙鼠贵”。

  if (
    DayGan + TimeZhi === "乙子" &&
    ShiShenSum["七杀"] === 0 &&
    !eightChar.toString().includes("午")
  ) {
    resultObj.result = "六乙鼠贵格";
    resultObj.xiShiShen = resultObj.xiShiShen.concat("");
    resultObj.xiWuxing = resultObj.xiWuxing.concat("");
    resultObj.jishiShen = resultObj.jishiShen.concat("");
    resultObj.jiWuxing = resultObj.jiWuxing.concat("");
    resultObj.reason =
      "天乙贵人在子：乙木见子为天乙贵人，因此称之为“六乙鼠贵,命中一定可以富贵非凡，一辈子中的运程也会相当好，是一个命运、运程、财运、福气、事业好得了不得的人！”。 ";
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  if (resultArray.length === 0) {
    resultArray.push({
      result: resultObj.result,
      xiShiShen: resultObj.xiShiShen,
      xiWuxing: resultObj.xiWuxing,
      jishiShen: resultObj.jishiShen,
      jiWuxing: resultObj.jiWuxing,
      reason: resultObj.reason,
    });
  }

  // return resultObj;
  return resultArray;
};
