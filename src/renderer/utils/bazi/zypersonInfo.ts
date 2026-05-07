import { EightChar, Lunar, LunarUtil, Solar } from "lunar-typescript";
import {
  countElements,
  countElementsYinYang,
  countElementsYinYang2,
  getShiShenSum,
  getWuXingRelation,
  getShiShenXing,
  getifExistGen,
  getDiZhiRela,
  getTianGanRela,
  getWuxingShiShen,
} from "./zytransform";
import {
  getShenQiangShenRuo,
} from "./utils";
// 直接从源模块导入，避免通过 utils.ts 中转产生循环依赖
import { getCommonGeJu, getSpecGeJu, getSpecHuaQiGeJu, getSpecFuGuiGeJu } from "./geju-engine";
import { getLoveHate, getWuxingQiangRuo } from "./lovehate";
import { getShengKeScore, getShenKeAllNum, getShenKeNum } from "./shengke-score";

interface userDataObj {
  realname: string;
  gender: number;
  timestamp: string; //阳历生日
}

export const getPersonInfo = (userData: userDataObj) => {
  const solar = Solar.fromDate(new Date(userData.timestamp));
  const lunar = solar.getLunar();

  let eightCharObj = lunar.getEightChar();
  eightCharObj.setSect(1);

  //建立一个返回的对象
  let PersonInfoList = {
    lunar: lunar, //阴历
    solar: solar, //阳历
    eightChar: eightCharObj, //八字
    eightCharSumInfo: getEightSumInfo(eightCharObj),
    shenqiangruo: getShenQiangShenRuo(eightCharObj),
    commonGeJu: getCommonGeJu(eightCharObj),
    specGeJu: getSpecGeJu(eightCharObj),
    specGeJuHuaQi: getSpecHuaQiGeJu(eightCharObj),

    specGeJuFuGuiGe: getSpecFuGuiGeJu(eightCharObj),

    wuxingQiangRuo: getWuxingQiangRuo(eightCharObj),
    wuxingXiJi: getLoveHate(eightCharObj, userData),
    // wuxingXiJiCustom: getLoveHate(eightCharObj,userData),//自定义的喜忌
    shengKeNum: getShenKeNum(eightCharObj),
    shengKeNumBase: getShenKeAllNum(eightCharObj),
    shengKeScoreBase: getShengKeScore(eightCharObj),

    userData: userData,
  };

  PersonInfoList.userData = userData;
  return PersonInfoList;
};

//得到八字的基本信息
const getEightSumInfo = (eightChar: any) => {
  //得到不包含或者包含藏干的八字
  let eightCharHideArray: string[] = [];
  let eightCharArray = eightChar
    .toString()
    .split("")
    .filter((item: string) => item !== " ");
  eightCharHideArray = eightCharHideArray.concat(
    eightChar.getYearGan(),
    eightChar.getYearZhi(),
    eightChar.getYearHideGan(),
    eightChar.getMonthGan(),
    eightChar.getMonthZhi(),
    eightChar.getMonthHideGan(),
    eightChar.getDayGan(),
    eightChar.getDayZhi(),
    eightChar.getDayHideGan(),
    eightChar.getTimeGan(),
    eightChar.getTimeZhi(),
    eightChar.getTimeHideGan()
  );

  let shiShenArray: string[] = [];
  shiShenArray = shiShenArray.concat(
    eightChar.getYearShiShenGan(),
    eightChar.getYearShiShenZhi(),
    eightChar.getMonthShiShenGan(),
    eightChar.getMonthShiShenZhi(),
    eightChar.getDayShiShenZhi(),
    eightChar.getTimeShiShenGan(),
    eightChar.getTimeShiShenZhi()
  );
  let shiShenArrayZhuQi: string[] = [];
  shiShenArrayZhuQi = shiShenArrayZhuQi.concat(
    eightChar.getYearShiShenGan(),
    eightChar.getYearShiShenZhi()[0],
    eightChar.getMonthShiShenGan(),
    eightChar.getMonthShiShenZhi()[0],
    eightChar.getDayShiShenZhi()[0],
    eightChar.getTimeShiShenGan(),
    eightChar.getTimeShiShenZhi()[0]
  );

  //命名规则 : WuXingSum  + BASE(Base代表仅统计八个字,不带base则是全部)
  return {
    WuXingSumBase: countElements(eightCharArray),
    WuXingSum: countElements(eightCharHideArray),
    YinYangSumBase: countElementsYinYang(eightCharArray),
    YinYangSum: countElementsYinYang(eightCharHideArray),
    GuYinYangSumBase: countElementsYinYang2(eightCharArray),
    GuYinYangSum: countElementsYinYang2(eightCharHideArray),
    ShiShenSumBase: getShiShenSum(shiShenArrayZhuQi),
    ShiShenSum: getShiShenSum(shiShenArray),
    //十神清单
    ShiShenWuXingList: getShiShenXing(eightChar.getDayGan(), "wuxing"),
    ShiShenEleList: getShiShenXing(eightChar.getDayGan(), "ele"),
  };
};

//得到十神是啥
const getGanShiShen = (eightChar: any, gan: string) => {
  return LunarUtil.SHI_SHEN[eightChar.getDayGan() + gan];
};

const getWuxingGan = (str: string): string => {
  const Wuxing = LunarUtil.WU_XING_GAN[str];
  return Wuxing ? Wuxing : "无";
};
