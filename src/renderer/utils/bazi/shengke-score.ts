/**
 * 生克评分引擎  从 utils.ts 拆分
 * 包含生克数量计算、格局评分、五行克制关系分析
 */
import { LunarUtil } from 'lunar-typescript';
import {
  getWuxing,
  getWuXingRelation,
  getGanShiShen,
} from './zytransform';

//得到克木主的五行，得到忌
export const getKeDayGanWuxing = (str: string) => {
  let result: string = "";

  switch (str) {
    case "木":
      result = "金";
      break;
    case "火":
      result = "水";
      break;
    case "土":
      result = "木";
      break;
    case "金":
      result = "火";
      break;
    case "水":
      result = "土";
      break;

    default:
      break;
  }

  return result;
};

//得到本命局生克八字的基本关系
// 换算成分值来

export const getShengKeScore = (eightChar: any) => {
  let eightWuxing: string[] = [];
  eightWuxing = eightWuxing.concat(
    ...eightChar.getYearWuXing(),
    ...eightChar.getMonthWuXing(),
    ...eightChar.getDayWuXing(),
    ...eightChar.getTimeWuXing()
  );

  // 生克等分成4等，根据步数距离来，步数为1，能量100%， 步数为2，能量为75%，步数为3，能量为50，步数为4 25%
  // 也就是  100分， 邻克100分  隔克 75分， 隔隔50分  隔隔克 25分
  // 克和同是100分，反生和反克都不会死，只会自己降低能量，所以为【50】为基数

  const findPosition = (number: number): { row: number; col: number } => {
    // 确定行：偶数在第一排，奇数在第二排
    const row = number % 2 === 0 ? 0 : 1;
    // 确定列：使用给定编号除以每排的元素数量（4）
    const col = Math.floor((number % 8) / 4);

    return { row, col };
  };

  //开始循环

  const baseScore = [];

  for (const key in eightWuxing) {
    const mainKey: number = parseInt(key) as number;
    const mainPos = findPosition(mainKey);
    let tmpScore = 0;

    for (const subkey in eightWuxing) {
      const mainSubKey: number = parseInt(subkey) as number;
      const subPos = findPosition(mainSubKey);

      // 自身不做比较
      if (mainSubKey === mainKey) {
        continue;
      }

      //得到步数距离
      let steps =
        Math.abs(subPos.row - mainPos.row) + Math.abs(subPos.col - mainPos.col);
      let rela = getWuXingRelation(eightWuxing[key], eightWuxing[subkey]);

      //得到生助加分  如果是月令，则得到3倍的能量。

      if (rela === "生" || rela == "同") {
        tmpScore =
          tmpScore +
          ((125 - 25 * steps) / 100) * (mainSubKey === 3 ? 300 : 100);
      }

      //得到生助加分  如果是月令，则加分更多。

      if (rela === "克") {
        tmpScore =
          tmpScore -
          ((125 - 25 * steps) / 100) * (mainSubKey === 3 ? 300 : 100);
      }

      if (rela === "反生" || rela == "反克") {
        tmpScore = tmpScore - ((125 - 25 * steps) / 100) * 60;
      }
    }

    baseScore.push(tmpScore);
  }
  return baseScore;
};

//得到克和生的数量对比，知道格局高低
// 用法解释:总的就是数克的个数有多少。
// 1、在原局，先看同柱的，看看有没有盖头截脚的，而后看天干地支，
// 天干和天干论，地支和地支论，这可以看原局的层次高低;
// 2、看大运、流年、流月时，先看运、年、月本柱，看看是否盖头截脚，
// 然后也是天干和天干论，地支和地支论，
// 但大运要和原局的每个字论，
// 流年要和原局、大运的每个字论，流月也同样论法，但都是天干和地支分开论，
// 当克数大于生数时应凶，越多越凶。
// 有一五行时，0个克就是专旺格，有两个五行时，3个克就是从格了

//https://www.docin.com/p-32256710.html 来自这里
export const getShenKeAllNum = (eightChar: any) => {
  let eightWuxingGan: string[] = [],
    eightWuxingZhi: string[] = [],
    eightWuxing = [];
  let elementCounts = {
    YearGan: { 生助: 0, 克泄耗: 0 },
    YearZhi: { 生助: 0, 克泄耗: 0 },
    MonthGan: { 生助: 0, 克泄耗: 0 },
    MonthZhi: { 生助: 0, 克泄耗: 0 },
    DayGan: { 生助: 0, 克泄耗: 0 },
    DayZhi: { 生助: 0, 克泄耗: 0 },
    TimeGan: { 生助: 0, 克泄耗: 0 },
    TimeZhi: { 生助: 0, 克泄耗: 0 },
  };

  eightWuxing = eightWuxingGan.concat(
    ...eightChar.getYearWuXing(),
    ...eightChar.getMonthWuXing(),
    ...eightChar.getDayWuXing(),
    ...eightChar.getTimeWuXing()
  );

  //先看同柱
  for (const item of eightWuxing) {
    let rela;

    //年干
    rela = getWuXingRelation(eightChar.getYearWuXing()[0], item);
    if (rela === "生" || rela == "同") {
      elementCounts.YearGan.生助++;
    } else {
      elementCounts.YearGan.克泄耗++;
    }
    //年支
    rela = getWuXingRelation(eightChar.getYearWuXing()[1], item);
    if (rela === "生" || rela == "同") {
      elementCounts.YearZhi.生助++;
    } else {
      elementCounts.YearZhi.克泄耗++;
    }

    //月干
    rela = getWuXingRelation(eightChar.getMonthWuXing()[0], item);
    if (rela === "生" || rela == "同") {
      elementCounts.MonthGan.生助++;
    } else {
      elementCounts.MonthGan.克泄耗++;
    }
    //月支
    rela = getWuXingRelation(eightChar.getMonthWuXing()[1], item);
    if (rela === "生" || rela == "同") {
      elementCounts.MonthZhi.生助++;
    } else {
      elementCounts.MonthZhi.克泄耗++;
    }

    //日干
    rela = getWuXingRelation(eightChar.getDayWuXing()[0], item);
    if (rela === "生" || rela == "同") {
      elementCounts.DayGan.生助++;
    } else {
      elementCounts.DayGan.克泄耗++;
    }
    //日支
    rela = getWuXingRelation(eightChar.getDayWuXing()[1], item);
    if (rela === "生" || rela == "同") {
      elementCounts.DayZhi.生助++;
    } else {
      elementCounts.DayZhi.克泄耗++;
    }

    //时干
    rela = getWuXingRelation(eightChar.getTimeWuXing()[0], item);
    if (rela === "生" || rela == "同") {
      elementCounts.TimeGan.生助++;
    } else {
      elementCounts.TimeGan.克泄耗++;
    }
    //时支
    rela = getWuXingRelation(eightChar.getTimeWuXing()[1], item);
    if (rela === "生" || rela == "同") {
      elementCounts.TimeZhi.生助++;
    } else {
      elementCounts.TimeZhi.克泄耗++;
    }
  }
  //生助都减到1，因为自身做比较没有意义

  elementCounts.YearGan.生助--;
  elementCounts.YearZhi.生助--;
  elementCounts.MonthGan.生助--;
  elementCounts.MonthZhi.生助--;
  elementCounts.DayGan.生助--;
  elementCounts.DayZhi.生助--;
  elementCounts.TimeGan.生助--;
  elementCounts.TimeZhi.生助--;

  return elementCounts;
};

// 得到八个字的生克数量
// 判断是不是偶数
export function isEven(num: number): boolean { return num % 2 === 0; }

// 得到每一个宫位和整体的生克力度 

export const getBaZiShengKeNum = (eightChar: any) => {
  // 得到八字的数组 12 34 56 78的组合方式
  const baziArr = eightChar
    .toString()
    .split(" ")
    .join("")
    .split("")
    .slice(0, 8);

  //得到五行数组 
  const baziWuXingArr: string[] = baziArr.map((str: string) => getWuxing(str));

  // 依次得到值

  const result = [];
  const result_All = { sheng: 0, ke: 0 }
  const result_Power = { sheng: 0, ke: 0 }


  // 取得每一个字的生克数量 

  let shengCount_Power = 0;
  let keCount_Power = 0;

  for (let i = 0; i < baziWuXingArr.length; i++) {
    let shengCount = 0;
    let keCount = 0;

    // 循环得出来生克数据
    for (let j = 0; j < baziWuXingArr.length; j++) {

      if (i !== j) {
        if ((isEven(i) && (isEven(j) || j - i === 1)) || (!isEven(i) && (!isEven(j) || i - j === 1))) {
          if (getWuXingRelation(baziWuXingArr[i], baziWuXingArr[j]) === "生") {
            shengCount++;
            shengCount_Power++;
          }
          if (getWuXingRelation(baziWuXingArr[i], baziWuXingArr[j]) === "克") {
            keCount++;
            keCount_Power++;
          }
        }

      }


    }
    result.push({ sheng: shengCount, ke: keCount });
  }

  // 赋值给生克力量 
  result_Power.sheng = shengCount_Power
  result_Power.ke = keCount_Power

  // 取得总生克的数量
  for (let i = 0; i < baziWuXingArr.length; i++) {
    let hasKe = false;
    let hasSheng = false;

    // 循环得出来生克数据
    for (let j = 0; j < baziWuXingArr.length; j++) {
      if (i !== j) {

        if ((isEven(i) && (isEven(j) || j - i === 1)) || (!isEven(i) && (!isEven(j) || i - j === 1))) {
          if (getWuXingRelation(baziWuXingArr[i], baziWuXingArr[j]) === "生") {
            hasSheng = true;
          }
        }

      }
      if (hasSheng) {
        result_All.sheng += 1;
        break;
      }
    }

    // 循环得出来生克数据
    for (let m = 0; m < baziWuXingArr.length; m++) {
      if (i !== m) {
        if ((isEven(i) && (isEven(m) || m - i === 1)) || (!isEven(i) && (!isEven(m) || i - m === 1))) {
          if (getWuXingRelation(baziWuXingArr[i], baziWuXingArr[m]) === "克") {
            hasKe = true;
          }
        }
      }
      if (hasKe) {
        result_All.ke += 1;
        break;
      }
    }


  }


  return {
    result: result,   //数组 里面有8个对象 
    result_All: result_All,   //只有一个对象
    result_Power: result_Power   //只有一个对象 
  }
};

// https://www.sohu.com/a/535724525_121332520
//得到克和生的数量对比，知道格局高低
// 用法解释:总的就是数克的个数有多少。
// 1、在原局，先看同柱的，看看有没有盖头截脚的，而后看天干地支，天干和天干论，地支和地支论，
// 这可以看原局的层次高低;
// 2、看大运、流年、流月时，先看运、年、月本柱，
// 看看是否盖头截脚，然后也是天干和天干论，地支和地支论，但大运要和原局的每个字论，流年要和原局、大运的每个字论，流月也同样论法，但都是天干和地支分开论，当克数大于生数时应凶，越多越凶。
// 、有一五行时，0个克就是专旺格，有两个五行时，3个克就是从格了
//https://www.docin.com/p-32256710.html 来自这里
export const getShenKeNum = (eightChar: any) => {
  let eightWuxingGan: string[] = [],
    eightWuxingZhi: string[] = [],
    eightWuxing = [];
  let elementCounts = { 生: 0, 克: 0, 五行数量: 0 };

  eightWuxing = eightWuxingGan.concat(
    ...eightChar.getYearWuXing(),
    ...eightChar.getMonthWuXing(),
    ...eightChar.getDayWuXing(),
    ...eightChar.getTimeWuXing()
  );

  eightWuxingGan = eightWuxingGan.concat(
    eightChar.getYearWuXing()[0],
    eightChar.getMonthWuXing()[0],
    eightChar.getDayWuXing()[0],
    eightChar.getTimeWuXing()[0]
  );
  eightWuxingZhi = eightWuxingZhi.concat(
    eightChar.getYearWuXing()[1],
    eightChar.getMonthWuXing()[1],
    eightChar.getDayWuXing()[1],
    eightChar.getTimeWuXing()[1]
  );

  //先看同柱
  const kesheng = (
    str1: string,
    str2: string,
    elementCounts: { 克: number; 生: number }
  ) => {
    const relation1 = getWuXingRelation(str1, str2);
    const relation2 = getWuXingRelation(str2, str1);

    if (relation1 === "克" || relation2 === "克") {
      elementCounts.克++;
    }

    if (relation1 === "生" || relation2 === "生") {
      elementCounts.生++;
    }
  };
  kesheng(
    eightChar.getYearWuXing()[0],
    eightChar.getYearWuXing()[1],
    elementCounts
  );
  kesheng(
    eightChar.getMonthWuXing()[0],
    eightChar.getMonthWuXing()[1],
    elementCounts
  );
  kesheng(
    eightChar.getDayWuXing()[0],
    eightChar.getDayWuXing()[1],
    elementCounts
  );
  kesheng(
    eightChar.getTimeWuXing()[0],
    eightChar.getTimeWuXing()[1],
    elementCounts
  );

  //得到天干与天干的比较

  for (let i = 0; i < eightWuxingGan.length; i++) {
    for (let j = 0; j < eightWuxingGan.length; j++) {
      let a = eightWuxingGan[i];
      let b = eightWuxingGan[j];

      if (getWuXingRelation(b, a) === "克") {
        elementCounts.克++;
      }
      if (getWuXingRelation(b, a) === "生") {
        elementCounts.生++;
      }
    }
  }

  //得到地支与地支的比较

  for (let i = 0; i < eightWuxingZhi.length; i++) {
    for (let j = 0; j < eightWuxingZhi.length; j++) {
      let a = eightWuxingZhi[i];
      let b = eightWuxingZhi[j];

      if (getWuXingRelation(b, a) === "克") {
        elementCounts.克++;
      }
      if (getWuXingRelation(b, a) === "生") {
        elementCounts.生++;
      }
    }
  }

  elementCounts.五行数量 = new Set(eightWuxing).size;

  return elementCounts;
};

// 获取普通格局 (正官、七杀、印绶...建禄、月刃)
export const getNormalGeJu = (eightChar: any) => {
  const gans = [eightChar.getYearGan(), eightChar.getMonthGan(), eightChar.getTimeGan()];
  const monthHideGan = eightChar.getMonthHideGan(); // [本气, 中气, 余气] (lunar-typescript 默认顺序)

  // 1. 查找透干 (优先取本气)
  let patternGan = '';

  // Lunar的HideGan通常顺序是 [本气, ..., 余气] 或 [余气, ..., 本气]?
  // 若不确定，我们通常优先取"透出且气最旺"者
  // 但简单逻辑：依次检查 本气 -> 中气 -> 余气 是否透干。
  // 注意：monthHideGan的顺序需要确认。通常lunar库返回的是标准顺序。
  // 我们假设 monthHideGan[0] 是本气 (如果不是，逻辑可能偏颇，但通常由MonthZhi决定)

  // 修正：lunar-typescript的getHideGan()返回的数组顺序可能不固定? 检查源码得知 zydict 通常固定。
  // 按照子平法，"有杀先论杀"等逻辑较复杂。
  // 这里实现简化版"月令透干取格"：

  // 检查透干
  for (const h of monthHideGan) {
    if (gans.includes(h)) {
      patternGan = h;
      break; // 找到即止? 还是找最旺? 通常先由本气找起，如果列表顺序是本气在前，则break正确。
    }
  }

  // 若均未透，取本气
  if (!patternGan) patternGan = monthHideGan[0];

  // 2. 只有建禄和月刃看地支本身与日主关系，但其实通过十神也能判断：
  // 比肩(本气) -> 建禄; 劫财(本气) -> 月刃

  const shishen = getGanShiShen(eightChar.getDayGan(), patternGan);

  // 修正名称
  if (shishen === '比肩') return '建禄格';
  if (shishen === '劫财') return '月刃格';
  if (shishen === '正印') return '正印格';
  if (shishen === '偏印') return '偏印格'; // 也有称枭神格
  if (shishen === '正官') return '正官格';
  if (shishen === '七杀') return '七杀格'; // 偏官格
  if (shishen === '正财') return '正财格';
  if (shishen === '偏财') return '偏财格';
  if (shishen === '食神') return '食神格';
  if (shishen === '伤官') return '伤官格';

  return shishen + '格';
};
