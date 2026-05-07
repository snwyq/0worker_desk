// @ts-nocheck
/**
 * 喜忌用神分析  从 utils.ts 拆分
 * 包含身强身弱高级判断、五行强弱评分、喜忌用神推导
 */
import { LunarUtil } from 'lunar-typescript';
import {
  getWuxing,
  getWuxingByGanZhi,
  getWuXingRelation,
  getWuxingShiShen,
  getShiShenXing,
  getWuXingByShiShen,
} from './zytransform';
import {
  wuxingcolorList,
} from './zydict';
import { getShenQiangShenRuo } from './utils';
import * as GejuEngine from './geju-engine';
import { getNormalGeJu } from './shengke-score';

//得到喜用神
export const getLoveHate = (eightChar: any, userData?: any) => {
  let reuslttmp = {};
  // let result = [
  //    { xiShiShen: [],
  //     jiShiShen:[],
  //     xiWuxing: [],
  //     jiWuxing: [],
  //     xianWuxing: [],
  //     xianShiShen: [],
  //     remark: ``,
  // }
  // ]
  let result = [];

  let MonthZhi = eightChar.getMonthZhi();
  let DayWuXing = eightChar.getDayWuXing();
  let DayWuxingGan = DayWuXing.charAt(0);

  //得到身强身弱
  let shenqiangruo = getShenQiangShenRuo(eightChar).result;

  //首先得到五行特殊格局，特殊格局的喜忌特殊，以格局为准否则以五行强弱来进行判断
  let SpecGeJu = GejuEngine.getSpecGeJu(eightChar);
  let SpecGeJuHuaQi = GejuEngine.getSpecHuaQiGeJu(eightChar); // 非从化格

  let xianWuxing = ["无"];
  let xianShiShen = ["无"];

  if (SpecGeJu.length > 0) {
    if (SpecGeJu[0].result != "非从化格") {
      let { xiShiShen, jishiShen, xiWuxing, jiWuxing } = SpecGeJu[0];
      reuslttmp = {
        xiShiShen,
        jishiShen,
        xiWuxing,
        jiWuxing,
        remark: `来自于特殊格局(从化格的喜忌):` + SpecGeJu[0].result,
        xianWuxing: xianWuxing,
        xianShiShen: xianShiShen,
      };
      result.push(reuslttmp);
    }
  }

  if (SpecGeJuHuaQi.length > 0) {
    if (SpecGeJuHuaQi[0].result != "非化气格") {
      let { xiShiShen, jishiShen, xiWuxing, jiWuxing } = SpecGeJuHuaQi[0];
      reuslttmp = {
        xiShiShen,
        jishiShen,
        xiWuxing,
        jiWuxing,
        xianWuxing: xianWuxing,
        xianShiShen: xianShiShen,
        remark: `来自于特殊格局(化气格的喜忌):` + SpecGeJuHuaQi[0].result,
      };
      result.push(reuslttmp);
    }
  }

  //不是特殊格局，正常以五行强弱来判断

  if (Object.keys(result).length === 0) {
    let wuxingQiangRuo = getWuxingQiangRuo(eightChar);

    //先判断调侯这个特殊的  巳午未为夏天
    //金生冬季 并全局无火 ，则需要火来生寒
    if (
      DayWuxingGan === "金" &&
      ["亥", "子", "丑"].includes(MonthZhi) &&
      wuxingQiangRuo["金"].score >= 90 &&
      wuxingQiangRuo["水"].score >= 90 &&
      wuxingQiangRuo["火"].score === 0
    ) {
      reuslttmp = {
        xiShiShen: ["官杀", "财才"],
        jishiShen: ["食伤", "比劫"],
        xiWuxing: ["火", "木"],
        jiWuxing: ["水", "金"],
        xianWuxing: xianWuxing,
        xianShiShen: xianShiShen,
        remark: `在亥子丑三冬出生的人，四柱中亥子水旺，或丑辰土多，又不见火来暖之，这样的八字谓之寒。`,
        result: getNormalGeJu(eightChar)
      };
      result.push(reuslttmp);
    }

    if (
      DayWuxingGan === "木" &&
      ["巳", "午", "未"].includes(MonthZhi) &&
      wuxingQiangRuo["木"].score >= 90 &&
      wuxingQiangRuo["火"].score >= 90 &&
      wuxingQiangRuo["水"].score === 0
    ) {
      reuslttmp = {
        xiShiShen: ["印枭", "官杀"],
        jishiShen: ["食伤", "比劫"],
        xiWuxing: ["水", "金"],
        jiWuxing: ["火", "木"],
        xianWuxing: xianWuxing,
        xianShiShen: xianShiShen,
        remark: `调侯用神：在巳午未出生的人，四柱中已午火多，或未戌土多，又不见水来调度，这种八字谓之“热”。热性的八字`,
        result: getNormalGeJu(eightChar)
      };

      result.push(reuslttmp);
    }

    if (Object.keys(result).length === 0) {
      //把闲神取出来
      // if (DayWuxingGan === "木") xianWuxing = ["金"];
      // if (DayWuxingGan === "火") xianWuxing = ["水"];
      // if (DayWuxingGan === "土") xianWuxing = ["木"];
      // if (DayWuxingGan === "金") xianWuxing = ["火"];
      // if (DayWuxingGan === "水") xianWuxing = ["土"];

      //计算印比和克泄之比根据差比来进行看五行的喜弱
      let yinbiScore = 0,
        kexiehaoScore = 0;
      let yinbiWuxing: string[] = [],
        kexiehaoWuxing: string[] = [];
      let yinbiShiShen: string[] = [],
        kexiehaoShiShen: string[] = [];

      for (const key in wuxingQiangRuo) {
        if (
          wuxingQiangRuo[key].shishen === "印枭" ||
          wuxingQiangRuo[key].shishen === "比劫"
        ) {
          yinbiScore += wuxingQiangRuo[key].score;
          yinbiWuxing.push(key);
          yinbiShiShen.push(wuxingQiangRuo[key].shishen);
        } else {
          kexiehaoScore += wuxingQiangRuo[key].score;
          kexiehaoWuxing.push(key);
          kexiehaoShiShen.push(wuxingQiangRuo[key].shishen);
        }
      }
      //比果差距比较大，则直接扶弱抑强
      let ChaJu = yinbiScore - kexiehaoScore;
      //印枭远大于克泄耗 ， 则忌为印枭 喜神人克泄耗
      if (shenqiangruo === "身强") {
        reuslttmp = {
          xiShiShen: kexiehaoShiShen,
          jishiShen: yinbiShiShen,
          xiWuxing: kexiehaoWuxing,
          jiWuxing: yinbiWuxing,
          xianWuxing: xianWuxing,
          xianShiShen: xianShiShen,
          remark:
            "印比远大于克泄耗,差距：" +
            ChaJu +
            "喜克泄耗，忌印比.但本命无某中克泄耗，则不易为喜，也视为闲神。",
          result: getNormalGeJu(eightChar)
        };
      } else {
        reuslttmp = {
          xiShiShen: yinbiShiShen,
          jishiShen: kexiehaoShiShen,
          xiWuxing: yinbiWuxing,
          jiWuxing: kexiehaoWuxing,
          xianWuxing: xianWuxing,
          xianShiShen: xianShiShen,
          remark: "克泄耗远大于印比,差距：" + ChaJu + "忌克泄耗，喜印比",
          result: getNormalGeJu(eightChar)
        };
      }

      result.push(reuslttmp);
    }
  }

  //如果没有得到值

  if (Object.keys(result).length === 0) {
    reuslttmp = {
      xiShiShen: ["无"],
      jishiShen: ["无"],
      xiWuxing: ["无"],
      jiWuxing: ["无"],
      xianShiShen: ["无"],
      xianWuxing: ["无"],
      remark: "没有喜用神,这个不应该,此处应该有bug.查一上喜用神",
      result: getNormalGeJu(eightChar)
    };
    result.push(reuslttmp);
  }

  // 如果local存在了自定义的，则会取自定义的
  if (userData && userData.realname) {
    const xijiWuxingKey =
      "xiji-" +
      userData.realname +
      userData.gender +
      Date.parse(userData.timestamp);
    // storage.set(xijiWuxingKey,{xiWuxing:xiWuxingList.value,jiWuxing:jiWuxingList.value})
    let cacheData = uni.getStorageSync(xijiWuxingKey);

    if (
      cacheData != undefined &&
      cacheData != "" &&
      JSON.stringify(cacheData) != "{}"
    ) {
      if (
        (cacheData.xiWuxing && cacheData.xiWuxing.length > 0) ||
        (cacheData.jiWuxing && cacheData.jiWuxing.length > 0)
      ) {
        result[0].xiWuxing = cacheData.xiWuxing;
        result[0].jiWuxing = cacheData.jiWuxing;
      }
    }
  }

  return result;
};



// 计分法：以上方法为分析法，但是要学八字一段时间才能分析准确，初学者不易掌握，因此可用计分法作为初学者入门之用。
// 计分原理：
// 1. 天干每个字为5分，月支本气100分，时支本气75分，日支本气50分，年支本气25分。
// 2. 支藏人元占本支分数的五分之一，如月支是戍，则戊土100分，辛金和丁火分别为20分，如年支是辰，则戊土25分，辛金和丁火分别为5分。
// 3．生自己的五行如果在本气位置则加三分之一的分，如天干有戊土，年支有戌土（如果是寅木里的土则不算），戊土5分加年支戊土25分共30分，则有三分之一的分数即10分加到金上。（能加到金上的前提是四柱有明金，即天干的金和地支本气的金，即有庚辛申酉之一）
// http://www.360doc.com/content/23/0713/07/29880059_1088357566.shtml
//五行强弱分界
//20分——极弱，如果日元加上印只有20分以下，则日元可能弱不堪扶，古代可能定义为从格或者化格。
//20分至50分——弱
//50分至80分——不弱
//80分至150分——旺
//150分以上——极旺
// 八字共有六大用神，即：调候用神、格局用神、病药用神、专旺用神、通关用神、扶抑用神。
// const  GetWuxingQiangRuo =(eightChar: any)=>
// {
//     let riGan = eightChar.getDayGan();
//     let riGanWuxing = LunarUtil.WU_XING_GAN[riGan];

// }

// http://www.360doc.com/content/23/0713/07/29880059_1088357566.shtml
//  test http://localhost/#/zy/result/%E9%99%88%E7%81%AB%E7%81%AB/0/2006/5/4/4/26/0/1
//http://www.360doc.com/content/15/0312/11/21159244_454514184.shtml 五行強弱判斷順序
//  计分原理：
// 1. 天干每个字为5分，月支本气100分，时支本气75分，日支本气50分，年支本气25分。
// 2. 支藏人元占本支分数的五分之一，如月支是戍，则戊土100分，辛金和丁火分别为20分，如年支是辰，则戊土25分，辛金和丁火分别为5分。
// 3．生自己的五行如果在本气位置则加三分之一的分，如天干有戊土，年支有戌土（如果是寅木里的土则不算），戊土5分加年支戊土25分共30分，
//    则有三分之一的分数即10分加到金上。（能加到金上的前提是四柱有明金，即天干的金和地支本气的金，即有庚辛申酉之一）

//  20分以及下——极弱，如果日元加上印只有20分以下，则日元可能弱不堪扶，古代可能定义为从格或者化格。
//  20分至50分——弱
//  50分至80分——均衡
//  80分至150分——旺
//  150分以上 ——极旺
//分值分布干 :  5  , 5 ,  5 ,  5
//       支 :  25 , 100, 50,  75
//       藏 :  5  ,  20, 10,  15

export const getWuxingQiangRuo = (eightChar: any) => {
  interface Shishen {
    score: number;
    no: number;
    status: string;
    shishen: string;
    isrizhu: number;
  }

  interface Inter {
    [key: string]: Shishen;
  }

  let score: Inter = {
    木: {
      score: 0,
      no: 0,
      status: "均衡",
      shishen: "",
      isrizhu: 0,
    },
    火: {
      score: 0,
      no: 0,
      status: "均衡",
      shishen: "",
      isrizhu: 0,
    },
    土: {
      score: 0,
      no: 0,
      status: "均衡",
      shishen: "",
      isrizhu: 0,
    },
    金: {
      score: 0,
      no: 0,
      status: "均衡",
      shishen: "",
      isrizhu: 0,
    },
    水: {
      score: 0,
      no: 0,
      status: "均衡",
      shishen: "",
      isrizhu: 0,
    },
  };

  //分数代码

  interface scoreMother {
    base: number;
    withHide: number;
    add: number;
    count: number;
  }

  interface scoreInter {
    [key: string]: scoreMother;
  }

  const scoreTmp: scoreInter = {
    木: {
      base: 0,
      withHide: 0,
      add: 0,
      count: 0,
    },
    火: {
      base: 0,
      withHide: 0,
      add: 0,
      count: 0,
    },
    土: {
      base: 0,
      withHide: 0,
      add: 0,
      count: 0,
    },
    金: {
      base: 0,
      withHide: 0,
      add: 0,
      count: 0,
    },
    水: {
      base: 0,
      withHide: 0,
      add: 0,
      count: 0,
    },
  };

  const YearGan = eightChar.getYearGan();
  const YearZhi = eightChar.getYearZhi();
  const MonthGan = eightChar.getMonthGan();
  const MonthZhi = eightChar.getMonthZhi();
  const DayGan = eightChar.getDayGan();
  const DayZhi = eightChar.getDayZhi();
  const TimeGan = eightChar.getTimeGan();
  const TimeZhi = eightChar.getTimeZhi();

  let YearWuxingGan = eightChar.getYearWuXing().charAt(0);
  let YearWuxingZhi = eightChar.getYearWuXing().charAt(1);
  let MonthWuxingGan = eightChar.getMonthWuXing().charAt(0);
  let MonthWuxingZhi = eightChar.getMonthWuXing().charAt(1);
  let DayWuxingGan = eightChar.getDayWuXing().charAt(0);
  let DayWuxingZhi = eightChar.getDayWuXing().charAt(1);
  let TimeWuxingGan = eightChar.getTimeWuXing().charAt(0);
  let TimeWuxingZhi = eightChar.getTimeWuXing().charAt(1);

  let YearHideGan = eightChar.getYearHideGan();
  let MonthHideGan = eightChar.getMonthHideGan();
  let DayHideGan = eightChar.getDayHideGan();
  let TimeHideGan = eightChar.getTimeHideGan();

  scoreTmp[YearWuxingGan].base += 5;
  scoreTmp[YearWuxingGan].withHide += 5;

  scoreTmp[YearWuxingZhi].base += 25;
  scoreTmp[YearWuxingZhi].withHide += 25;

  scoreTmp[MonthWuxingGan].base += 5;
  scoreTmp[MonthWuxingGan].withHide += 5;

  scoreTmp[MonthWuxingZhi].base += 100;
  scoreTmp[MonthWuxingZhi].withHide += 100;

  scoreTmp[DayWuxingGan].base += 5;
  scoreTmp[DayWuxingGan].withHide += 5;

  scoreTmp[DayWuxingZhi].base += 50;
  scoreTmp[DayWuxingZhi].withHide += 50;

  scoreTmp[TimeWuxingGan].base += 5;
  scoreTmp[TimeWuxingGan].withHide += 5;

  scoreTmp[TimeWuxingZhi].base += 75;
  scoreTmp[TimeWuxingZhi].withHide += 75;

  //得到隐藏干的中分值
  YearHideGan.slice(1, 3).forEach((gan: string | number) => {
    if (gan) {
      scoreTmp[LunarUtil.WU_XING_GAN[gan]].withHide += 5;
    }
  });

  MonthHideGan.slice(1, 3).forEach((gan: string | number) => {
    if (gan) {
      scoreTmp[LunarUtil.WU_XING_GAN[gan]].withHide += 20;
    }
  });

  DayHideGan.slice(1, 3).forEach((gan: string | number) => {
    if (gan) {
      scoreTmp[LunarUtil.WU_XING_GAN[gan]].withHide += 10;
    }
  });

  TimeHideGan.slice(1, 3).forEach((gan: string | number) => {
    if (gan) {
      scoreTmp[LunarUtil.WU_XING_GAN[gan]].withHide += 15;
    }
  });

  //得到印中的附加分
  if (scoreTmp.木.base != 0) {
    scoreTmp.木.add = Math.round(scoreTmp.水.base * 0.33);
  }
  if (scoreTmp.火.base != 0) {
    scoreTmp.火.add = Math.round(scoreTmp.木.base * 0.33);
  }
  if (scoreTmp.土.base != 0) {
    scoreTmp.土.add = Math.round(scoreTmp.火.base * 0.33);
  }
  if (scoreTmp.金.base != 0) {
    scoreTmp.金.add = Math.round(scoreTmp.土.base * 0.33);
  }
  if (scoreTmp.水.base != 0) {
    scoreTmp.水.add = Math.round(scoreTmp.金.base * 0.33);
  }

  //给score赋值
  score.木.score = scoreTmp.木.withHide + scoreTmp.木.add;
  score.火.score = scoreTmp.火.withHide + scoreTmp.火.add;
  score.土.score = scoreTmp.土.withHide + scoreTmp.土.add;
  score.金.score = scoreTmp.金.withHide + scoreTmp.金.add;
  score.水.score = scoreTmp.水.withHide + scoreTmp.水.add;

  //进行排序

  let scores = Object.keys(score)
    .sort((a, b) => score[b].score - score[a].score)
    .reduce((acc, key, index) => {
      const currentScore = score[key].score;
      let status = "";
      if (currentScore < 20) {
        status = "极弱";
      } else if (currentScore >= 20 && currentScore < 50) {
        status = "弱";
      } else if (currentScore >= 50 && currentScore < 80) {
        status = "均衡";
      } else if (currentScore >= 80 && currentScore < 150) {
        status = "旺";
      } else {
        status = "极旺";
      }
      acc[key] = {
        ...score[key],
        no: index + 1,
        status: status,
        shishen: getWuxingShiShen(DayWuxingGan, key),
        isrizhu: DayWuxingGan === key,
      };
      return acc;
    }, {} as Record<string, any>); // 使用类型断言指定为对象类型

  return scores;
  //  LunarUtil.WU_XING_GAN[''])
};
