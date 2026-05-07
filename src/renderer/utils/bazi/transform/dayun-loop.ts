// @ts-nocheck
﻿/**
 * 大运流年循环计算模块
 * 从 zytransform.ts 提取的 getDaYunLiuNianLoopData 函数
 * 包含大运流年的各种事件判断（婚灾/手术/伤官见官/禄神受伤等）
 */
import { LunarUtil } from 'lunar-typescript';
import { getPersonInfo } from '../zypersonInfo';
import { getShenSha } from '../zyshensha';
import {
	getGanShiShen,
	getHideGanShiShen,
	getHideGan,
	getWuxingByGanZhi,
	getWuxing,
	getTianGanRela,
	getDiZhiRela,
	isShengZhuByWuxing,
	getCaiXingWuXing,
	getYinXingWuXing,
	getShiShangXingWuXing,
	getGuanXingWuXing,
	getMuKuByWuXing,
	getWuxingShengKeEle,
	isDiZhiChong,
	isDiZhiHai,
	isDiZhiJue,
	isDiZhiLiuHe,
	isDiZhiPo,
	isDiZhiXing,
	isTaoHua,
	isYiMa,
	getLuByGan,
	getYangRen,
	getTianKeDiChong,
	getTianheDipo,
	getTianheDihe,
	isTianGanChong,
	getWuXingRelation,
	get12ShenSha,
	getTianTongDiTong,
	getLushen,
	isLuShen,
	getTianheDiXing,
	getTianheDiHai,
	getTianheDiChong,
	getTianheDiJue,
	getSolarMonthDate,
	getGanZhiHe,
	dizhiList,
} from '../zytransform';
// 使用方法 
// const LoopData =  getDaYunLiuNianLoopData(this.eightChar,userData).BadMonthList 
// if (LoopData.length > 0) {
//   for (const item of LoopData) {
//       let flag = (item.slice(0, 4) === currentYear.toString() ? '[今年]' : (item.slice(0, 4) < currentYear.toString() ? '[过去]' : '[将来]'))
//       tmpData.result += flag + item + '\n'
//   }

// }
export const getDaYunLiuNianLoopData = (eightChar: any, userData: any) => {

	let BadMonthList = []   //得到倒霉三个月的数组 
	let hurtYearList = []   //得到自己会动手术的年份
	let motherHurtYearList = []   //得到母亲会动手术的年份 
	let fatherHurtYearList = []   //得到父亲会动手术的年份 
	let shiShangHurtYearList = []   //得到子女会动手术的年份 
	let GuanHurtYearList = []   //得到子女会动手术的年份 --男人的孩子 女的老公 
	let DayBiJianHurtList = []    //得到日柱做下是比肩，比肩受伤的年份

	let shiShenChgYear = []     // 本命局十神已经有三个了，再增加超过三次变化的年份
	let biJieLiuNianYear = []     // 比劫财年 再增加超过三次变化的年份
	let JieCaiLiuNianYear = []     // 劫财年
	let CaiLiuNianYear = []     // 劫财年

	let shiShenNumChgObj = {}    //十神变化的年份


	let LiuNianKeyData: any[] = [] //流年关键数据 
	let LiuNianKeyDataTmp = {
		LiuNianGanZhi: '',
		LiuNianYearNum: '',
		LiuNianAgeNum: '',
		DaYun: [],
		tags: []
	};



	// 1、七十三、八十四岁遇空亡。
	// 2、岁运并临遇空亡。
	// 3、天克地冲遇空亡。　
	// 4、身旺羊刃重重遇空亡。
	// 5、刑冲克害遇空亡。
	// 6、身旺会合生身遇代亡。
	// 7、身弱生身太过遇空亡。
	// 8、身弱七杀重重遇代亡。
	// A，以流年干配流月日支查空亡。
	// B、以流年大运查空亡。
	// C、流年流月流日查空亡。
	// D、凡空亡（流年大运四柱全是空亡者）必死无疑。

	let dieYearDateList = []         //死期之年 
	let dieDaYunDateList = []         //死期之年 



	let marrayDaYunList = []    //结婚的大运   --出现配偶星的年份 
	let marrayYearList = []    //结婚的年份   --出现配偶星的年份 
	let marraySexYearList = []    //有感情或夫妻之实的年份


	let shangguanjianguanYearList = []  //伤官见官的年份
	let luShenHurtList = []    //禄神被伤年份
	let YiMaHurtluShenYearList = []    //禄神被伤年份
	let HuiZaiYearList = []    //婚灾的年份 
	// 同宫财官不喜合 劫财一合婚姻破 指的是八字中同日主坐下的财星或官星不喜被劫财合， 
	// 劫财合婚姻宫的流年或大运代表婚姻出问题或离婚的时间到了.
	let selfCaiKuFaCaiYearList = []  //自坐财库的人发财的年份 
	let tianganhediPoYearList = []     //天干合地支破的年份 
	let tianganhediPoDaYunList = []    //天干合地支破的大运

	// 
	let noGoodYearList = []     //天干合地支破的年份 




	const selfCaiKu = ['丁丑', '王戌', '辛未', '戊辰']


	// 干支虚透升天堂，虚干落地下地府    光明师口诀解密：指的是八字中地支不透的怕变成天干虚透，地支中实的支变成虚透的干的流年大运，此地 支所代表的人事物就容易出大事故；虚透的天干怕落地变实，成为实的地支，天干中虚的干变成实的地支， 此天干所代表的人事物就容易出大事故。简单来说，就是虚怕实，实怕虚
	// 干实透：此天干在本柱干支组合的地支中，得生助或者通根有气。
	// 天干虚透：此天干在本柱干支组合的地支中，得不到生助，无根又无气。

	let DieGateYearList = []   //干支虚透升天堂，虚干落地下地府年份 



	let currentYear = new Date().getFullYear();
	const yun = eightChar.getYun(userData.gender);
	const daYunArr = yun.getDaYun();
	const Person = getPersonInfo(userData)


	const baziString = eightChar.toString();
	let MonthGanShiShen = eightChar.getMonthShiShenGan()
	let MonthZhiShiShen = eightChar.getMonthShiShenZhi()
	let YearGanShiShen = eightChar.getYearShiShenGan()
	let YearZhiShiShen = eightChar.getYearShiShenZhi()
	let TimeGanShiShen = eightChar.getTimeShiShenGan()
	let TimeZhiShiShen = eightChar.getTimeShiShenZhi()
	let DayZhiShiShen = eightChar.getDayShiShenZhi()
	let MonthGan = eightChar.getMonthGan()
	let MonthZhi = eightChar.getMonthZhi()
	let DayNaYin = eightChar.getDayNaYin()

	let YearGan = eightChar.getYearGan()
	let YearZhi = eightChar.getYearZhi()
	let DayGan = eightChar.getDayGan()
	let DayZhi = eightChar.getDayZhi()
	let TimeGan = eightChar.getTimeGan()
	let TimeZhi = eightChar.getTimeZhi()
	let YearWuxing = eightChar.getYearWuXing()
	let MonthWuxing = eightChar.getMonthWuXing()
	let DayWuxing = eightChar.getDayWuXing()
	let TimeWuxing = eightChar.getTimeWuXing()
	let DayKongWang = eightChar.getDayXunKong()
	let MonthKongWang = eightChar.getMonthXunKong()
	let YearGanZhi = eightChar.getYear()
	let MonthGanZhi = eightChar.getMonth()
	let DayGanZhi = eightChar.getDay()
	let TimeGanZhi = eightChar.getTime()


	let diShiList = [eightChar.getYearDiShi(), eightChar.getMonthDiShi(), eightChar.getDayDiShi(), eightChar.getTimeDiShi()]

	const eightInfo = Person.eightCharSumInfo   // getEightSumInfo(this.eightChar)
	const wuxingQiangRuo = Person.wuxingQiangRuo

	const WuXingNum = eightInfo.WuXingSum;
	const WuXingNumBase = eightInfo.WuXingSumBase;
	const ShiShenNum = eightInfo.ShiShenSum;
	const ShiShenNumBase = eightInfo.ShiShenSumBase;


	const caiWuxing = getCaiXingWuXing(DayWuxing[0])
	const yinWuxing = getYinXingWuXing(DayWuxing[0])
	const shishangWuxing = getShiShangXingWuXing(DayWuxing[0])
	const GuanWuxing = getGuanXingWuXing(DayWuxing[0])



	const muKuArray = ['辰', '戌', '丑', '未'];
	//得到配偶星的墓 


	const CaiMuEls = getMuKuByWuXing(caiWuxing)
	const YinMuEls = getMuKuByWuXing(yinWuxing)
	const ShiShangMuEls = getMuKuByWuXing(shishangWuxing)
	const GuanMuEls = getMuKuByWuXing(GuanWuxing)

	//得到天干地支关系
	let gans: string[] = [], zhis: string[] = [], ganZhis: string[] = [];
	gans = gans.concat(YearGan, MonthGan, DayGan, TimeGan)
	zhis = zhis.concat(YearZhi, MonthZhi, DayZhi, TimeZhi)
	ganZhis = ganZhis.concat(YearGan, YearZhi, MonthGan, MonthZhi, DayGan, DayZhi, TimeGan, TimeZhi)
	let siZhuArray = [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()]
	let siZhuPos = ['长辈及父母', '父母及平辈', '配偶', '孩子']


	// GuanHurtYearList



	for (let i = 1; i < daYunArr.length; i++) {

		let d = daYunArr[i];
		let DaYunGanZhi = d.getGanZhi()
		let DaYunGan = DaYunGanZhi.charAt(0)
		let DaYunZhi = DaYunGanZhi.charAt(1)



		let DaYunShiShenGan = getGanShiShen(DayGan, DaYunGan)
		let DaYunShiShenZhi = getHideGanShiShen(DayGan, DaYunZhi)


		let DaYunWuXing = getWuxingByGanZhi(DaYunGanZhi)     //getWuxingByGanZhi(DaYunGanZhi)
		let DaYunStarYear = d.getStartYear()
		let DaYunEndYear = d.getEndYear()
		let DaYunStarAge = d.getStartAge() - 1
		let DaYunEndAge = d.getEndAge() - 1
		let DaYunKongWang = d.getXunKong()
		let DaYunIndex = d.getIndex()

		//得到流年数组
		let liuNian = d.getLiuNian()

		//得到天干地支关系
		let gansDaYun: string[] = [], zhisDaYun: string[] = []
		gansDaYun = gansDaYun.concat(DaYunGan, YearGan, MonthGan, DayGan, TimeGan)
		zhisDaYun = zhisDaYun.concat(DaYunZhi, YearZhi, MonthZhi, DayZhi, TimeZhi)

		// for (let k = 0; k < 2; k++) {
		for (let k = 0; k < liuNian.length; k++) {

			let LiuNianGanZhi = liuNian[k].getGanZhi()
			let LiuNianYearNum = liuNian[k].getYear()


			let LiuNianAgeNum = liuNian[k].getAge()
			let LiuNianGan = LiuNianGanZhi.charAt(0)
			let LiuNianZhi = LiuNianGanZhi.charAt(1)
			let LiuNianWuXing = getWuxingByGanZhi(LiuNianGanZhi)

			let LiuNianShiShenGan = getGanShiShen(DayGan, LiuNianGan)
			let LiuNianShiShenZhi = getHideGanShiShen(DayGan, LiuNianZhi)


			let DaYunLiuNianShiShen: string[] = []
			DaYunLiuNianShiShen = DaYunLiuNianShiShen.concat(LiuNianShiShenGan, LiuNianShiShenZhi[0], DaYunShiShenGan, DaYunShiShenZhi[0])

			//得到流年的天干地支关系  
			let gansLiuNian: string[] = [], zhisLiuNian: string[] = []
			gansLiuNian = gansLiuNian.concat(LiuNianGan, DaYunGan, YearGan, MonthGan, DayGan, TimeGan)
			zhisLiuNian = gansLiuNian.concat(LiuNianZhi, DaYunZhi, YearZhi, MonthZhi, DayZhi, TimeZhi)

			// 生成一个对象,赋值给天干关系的参数  
			let currentYun: { daYunZhi: any, liuNianZhi: any, daYunGanZhi: any, liuNianGanZhi: any } = {
				daYunZhi: DaYunZhi,
				liuNianZhi: LiuNianZhi,
				daYunGanZhi: DaYunGanZhi,
				liuNianGanZhi: LiuNianGanZhi
			};

			const GanRelaLiuNian: string[] = (getTianGanRela(gansLiuNian).length > 0 ? getTianGanRela(gansLiuNian) : ['无合化关系']);
			const DiZhiRelaLiuNian: string[] = (getDiZhiRela(eightChar, currentYun).length > 0 ? getDiZhiRela(eightChar, currentYun) : ['无合化关系']);
			const DiZhiRela: string[] = (getDiZhiRela(eightChar).length > 0 ? getDiZhiRela(eightChar) : ['无关系']);


			const ShenSha = getShenSha(Person.lunar, Person.solar, userData.gender, currentYun);
			let shenShayear = ShenSha.shenShaYear;
			let shenShamonth = ShenSha.shenShaMonth;
			let shenShaday = ShenSha.shenShaDay;
			let shenShatime = ShenSha.shenShaTime;
			let shenShaDayun = ShenSha.shenShadaYun;
			let shenShaLiuNian = ShenSha.shenShaliuNian;
			let shenShaAll: string[] = [...shenShaLiuNian, ...shenShaDayun, ...shenShayear, ...shenShamonth, ...shenShaday, ...shenShatime];
			let shenShaAllBase: string[] = [...shenShayear, ...shenShamonth, ...shenShaday, ...shenShatime];


			// if (LiuNianYearNum < currentYear - 5 || LiuNianYearNum > currentYear + 5) continue;
			// 初始化流年数据
			let LiuNianKeyDataTmp = {
				LiuNianGanZhi: LiuNianGanZhi,
				LiuNianYearNum: LiuNianYearNum,
				LiuNianAgeNum: LiuNianAgeNum,
				DaYun: [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge],
				tags: []
			};

			let liuYue = liuNian[k].getLiuYue()

			// 得到十神的变化
			if (ShiShenNumBase[LiuNianShiShenGan] >= 3 && isShengZhuByWuxing(LiuNianWuXing[0], LiuNianWuXing[1])) {
				if (!shiShenNumChgObj[LiuNianShiShenGan]) {
					shiShenNumChgObj[LiuNianShiShenGan] = [LiuNianYearNum]; // 如果键不存在，添加它并初始化为一个空数组
				} else {
					// 如果键已存在，你可以在这里修改其值。例如，向数组中添加新元素
					shiShenNumChgObj[LiuNianShiShenGan].push(LiuNianYearNum); // 假设你想要向所有已存在的键的数组中添加2024
				}

			}

			if (ShiShenNumBase[LiuNianShiShenZhi[0]] >= 3 && LiuNianShiShenZhi[0] != LiuNianShiShenGan && isShengZhuByWuxing(LiuNianWuXing[1], LiuNianWuXing[0])) {
				if (!shiShenNumChgObj[LiuNianShiShenZhi[0]]) {
					shiShenNumChgObj[LiuNianShiShenZhi[0]] = [LiuNianYearNum]; // 如果键不存在，添加它并初始化为一个空数组
				} else {
					// 如果键已存在，你可以在这里修改其值。例如，向数组中添加新元素
					shiShenNumChgObj[LiuNianShiShenZhi[0]].push(LiuNianYearNum); // 假设你想要向所有已存在的键的数组中添加2024
				}
			}


			// 得到死期  
			//  郑民生盲派八字 
			// 盲派生死关 
			//  有关生死问题有三个判断原则：
			//  第一是反吟论生死。
			//    一个原则就是少年运反吟到年柱，
			//    青年运反 吟到月柱，
			//    中年运反吟到日柱上，晚年运反吟到时柱上，
			//    大运反吟到相应年龄段的限运柱上，主本人在此十年大运中有性命之忧，
			//  这是第 一步初定，此人在哪步大运内有性命之忧。
			//  一般都在流年与大运或命局伏吟之年或逢日墓之 年应凶。
			// 
			// 有些人逢生死之灾并没有死，但总有九死一生的味道，定有生死千钧一发 的时刻。
			// 第二个原则是伏吟(相同):伏吟论生死其范围不限与同一个时空段的大 运冲到同一时空段的四柱，只要看大运与命局有伏吟现象，
			// 表明此段大运有死人 倒寿之象。此种方法看生死有时并非是本人有死亡之灾，很可能是近亲有生死之 灾。
			// 主要是看用神，用神被克那是自己，否则是六亲看何柱，何十神受冲，受克 无生，便是哪个六亲。
			// 确定在哪步大运有生死之灾时再推流年，一般是在伏吟流年应灾，古书有：
			//  “逢岁运并临，不死自己则死他人。”虽然并不是个个如此，但也是断生死应期一 个标准和方法。
			// 上面正是岁运并临的使用原则。伏吟包括岁运并临。还有一点有 时并非是在伏吟年死。
			//  往往是在伏吟逢合恰恰合后之五行又同属于伏吟之五行也 是应期。
			// 第三个原则是胎养生与死墓绝，这个原则比较着重于冲合会，要命中岁运 一定有感应，如何感应呢?
			//  就是一定要日元或十神所代表的亲人之胎养生或死墓 绝被冲出本命，或从外面冲入本命，或者在原命中被运程冲掉。或者被合入本命
			//  第二是伏吟论生死；
			//  第三是胎养生与死墓绝。 
			// 第三个原则是胎养生与死墓绝，这个原则比较着重于冲合会，

			// 1、七十三、八十四岁遇空亡。
			// 2、岁运并临遇空亡。
			// 3、天克地冲遇空亡。　
			// 4、身旺羊刃重重遇空亡。
			// 5、刑冲克害遇空亡。
			// 6、身旺会合生身遇代亡。
			// 7、身弱生身太过遇空亡。
			// 8、身弱七杀重重遇代亡。
			// A，以流年干配流月日支查空亡。
			// B、以流年大运查空亡。
			// C、流年流月流日查空亡。
			// D、凡空亡（流年大运四柱全是空亡者）必死无疑。

			const dieProcess = () => {
				let sanheList = DiZhiRelaLiuNian.filter(str => (str.includes(DaYunZhi) && (str.includes('三合') || str.includes('三会'))))

				if (sanheList.length > 0) {
					let hehuaWuxing = ''
					for (const item of sanheList) {
						hehuaWuxing = item.slice(-1)

						// 看地支中有没有被克的五行，并且还是长生  自己还正好被冲 
						let beikeWuxingBase = getWuxingShengKeEle(hehuaWuxing, '克')
						//依次判断年月日时是否是 -- 年
						if (YearWuxing[1] === beikeWuxingBase) {
							//是否本身就存在冲
							let chongExist = DiZhiRela.filter(str => str.includes(YearZhi) && str.includes('冲')).length > 0
							let changeSheng = ['长生', '胎', '养'].includes(diShiList[0])

							let tmpDayunData = ['大运', DaYunGanZhi, DaYunStarYear + '-' + DaYunEndYear, '合会冲克身大运']
							let tmpDataYear = ['年份', LiuNianYearNum, LiuNianAgeNum, '年支被克冲【自己或家人有劫关】', `年支${diShiList[0]}受冲 + 大运三会合${hehuaWuxing}克`]

							if ((LiuNianZhi === getMuKuByWuXing(beikeWuxingBase) || LiuNianWuXing[1] === hehuaWuxing) && chongExist && changeSheng && !dieYearDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDataYear))) {


								dieYearDateList.push(tmpDataYear)
								if (!dieDaYunDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDayunData))) {
									dieDaYunDateList.push(tmpDayunData)
								}

							}
						}
						//依次判断年月日时是否是 -- 月
						if (MonthWuxing[1] === beikeWuxingBase) {
							//是否本身就存在冲
							let chongExist = DiZhiRelaLiuNian.filter(str => str.includes(MonthZhi) && str.includes('冲')).length > 0
							let changeSheng = ['长生', '胎', '养'].includes(diShiList[1])

							let tmpDayunData = ['大运', DaYunGanZhi, DaYunStarYear + '-' + DaYunEndYear, '合会冲克身大运']
							let tmpDataYear = ['年份', LiuNianYearNum, LiuNianAgeNum, '月支被克冲【自己或家人有劫关】', `月支${diShiList[1]}受冲 + 大运三会合${hehuaWuxing}克`]


							if ((LiuNianZhi === getMuKuByWuXing(beikeWuxingBase) || LiuNianWuXing[1] === hehuaWuxing) && chongExist && changeSheng && !dieYearDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDataYear))) {
								dieYearDateList.push(tmpDataYear)
								if (!dieDaYunDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDayunData))) {
									dieDaYunDateList.push(tmpDayunData)
								}

							}

						}
						//依次判断年月日时是否是 -- 月
						if (DayWuxing[1] === beikeWuxingBase) {
							//是否本身就存在冲
							let chongExist = DiZhiRelaLiuNian.filter(str => str.includes(DayZhi) && str.includes('冲')).length > 0
							let changeSheng = ['长生', '胎', '养'].includes(diShiList[2])

							// let tmpData = ['大运', DaYunStarYear + '-' + DaYunEndYear, '', '本十年间会有生死劫', `日支${diShiList[2]}受冲加大运三会合${hehuaWuxing}克`]

							let tmpDayunData = ['大运', DaYunGanZhi, DaYunStarYear + '-' + DaYunEndYear, '合会冲克身大运']
							let tmpDataYear = ['年份', LiuNianYearNum, LiuNianAgeNum, '日支被克冲【自己或家人有劫关】', `日支${diShiList[2]}受冲 + 大运三会合${hehuaWuxing}克`]



							if ((LiuNianZhi === getMuKuByWuXing(beikeWuxingBase) || LiuNianWuXing[1] === hehuaWuxing) && chongExist && changeSheng && !dieYearDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDataYear))) {
								dieYearDateList.push(tmpDataYear)
								if (!dieDaYunDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDayunData))) {
									dieDaYunDateList.push(tmpDayunData)
								}
							}

						}
						//依次判断年月日时是否是 -- 月
						if (TimeWuxing[1] === beikeWuxingBase) {
							//是否本身就存在冲
							let chongExist = DiZhiRelaLiuNian.filter(str => str.includes(TimeZhi) && str.includes('冲')).length > 0
							let changeSheng = ['长生', '胎', '养'].includes(diShiList[3])

							let tmpDayunData = ['大运', DaYunGanZhi, DaYunStarYear + '-' + DaYunEndYear, '合会冲克身大运']
							let tmpDataYear = ['年份', LiuNianYearNum, LiuNianAgeNum, '时支被克冲【自己或家人有劫关】', `时支${diShiList[3]}受冲 + 大运三会合${hehuaWuxing}克`]



							if ((LiuNianZhi === getMuKuByWuXing(beikeWuxingBase) || LiuNianWuXing[1] === hehuaWuxing) && chongExist && changeSheng && !dieYearDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDataYear))) {
								dieYearDateList.push(tmpDataYear)
								if (!dieDaYunDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDayunData))) {
									dieDaYunDateList.push(tmpDayunData)
								}
							}
						}

					}
				}




			}
			// 克身年
			dieProcess();
			// 反吟
			if (getTianKeDiChong(DaYunGanZhi, siZhuArray[0]) || getTianKeDiChong(DaYunGanZhi, siZhuArray[1]) || getTianKeDiChong(DaYunGanZhi, siZhuArray[2]) || getTianKeDiChong(DaYunGanZhi, siZhuArray[3])) {

				let whichZhu = getTianKeDiChong(DaYunGanZhi, siZhuArray[0]) ? '年柱' + siZhuArray[0] : '' + getTianKeDiChong(DaYunGanZhi, siZhuArray[1]) ? '月柱' + siZhuArray[1] : '' + getTianKeDiChong(DaYunGanZhi, siZhuArray[2]) ? '日柱' + siZhuArray[2] : '' + getTianKeDiChong(DaYunGanZhi, siZhuArray[3]) ? '时柱' + siZhuArray[3] : ''

				let tmpDayunData = ['大运', DaYunGanZhi, DaYunStarYear + '-' + DaYunEndYear, '反吟大运']
				if (!dieDaYunDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDayunData))) {
					dieDaYunDateList.push(tmpDayunData)
				}

				let whichZhuArray = []
				// 大运反伏哪个柱
				if (getTianKeDiChong(DaYunGanZhi, siZhuArray[0])) whichZhuArray.push(0);
				if (getTianKeDiChong(DaYunGanZhi, siZhuArray[1])) whichZhuArray.push(1);
				if (getTianKeDiChong(DaYunGanZhi, siZhuArray[2])) whichZhuArray.push(2);
				if (getTianKeDiChong(DaYunGanZhi, siZhuArray[3])) whichZhuArray.push(3);

				// 流年： 一般都在流年与大运或命局伏吟之年或逢日墓之年应凶。
				if (LiuNianGanZhi === DaYunGanZhi || siZhuArray.includes(LiuNianGanZhi) || LiuNianZhi === getMuKuByWuXing(DayWuxing[0])) {
					let isDangerDesp = '【反吟大运+伏吟流年或日干入墓】'
					if (whichZhuArray.includes(0) && LiuNianAgeNum <= 18) { isDangerDesp = '【18岁前反吟年柱自己有死劫】' }
					if (whichZhuArray.includes(1) && LiuNianAgeNum > 18 && LiuNianAgeNum <= 36) { isDangerDesp = '【36岁前反吟月柱自己有死劫】'; }
					if (whichZhuArray.includes(2) && LiuNianAgeNum > 36 && LiuNianAgeNum <= 54) { isDangerDesp = '【54岁前反吟日柱自己有死劫】'; }
					if (whichZhuArray.includes(3) && LiuNianAgeNum > 54) { isDangerDesp = '【54岁后反吟时柱自己生死劫】 ' }

					let tmpData = ['年份', LiuNianYearNum, LiuNianAgeNum, isDangerDesp, DaYunGanZhi + `大运反吟${whichZhu} +  流年` + LiuNianGanZhi + (LiuNianZhi === getMuKuByWuXing(DayWuxing[0]) ? '日主入墓' : '伏吟')]

					dieYearDateList.push(tmpData)
				}
			}

			// 伏吟 
			if (siZhuArray.includes(DaYunGanZhi)) {

				// 大运伏吟将大运数组放入值 
				let tmpDayunData = ['大运', DaYunGanZhi, DaYunStarYear + '-' + DaYunEndYear, '伏吟大运']
				if (!dieDaYunDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDayunData))) {
					dieDaYunDateList.push(tmpDayunData)
				}
			}


			// 伏吟年岁运并临 不死自己死家人
			if (LiuNianGanZhi === DaYunGanZhi) {
				if (!shenShaLiuNian.includes('天乙贵人') && !shenShaLiuNian.includes('天德贵人') && !shenShaLiuNian.includes('月德贵人')) {
					let isDangerDesp = `【岁运并临,自己有生死劫】`
					let tmpData = ['年份', LiuNianYearNum, LiuNianAgeNum, isDangerDesp, '大运' + DaYunGanZhi + '流年' + LiuNianGanZhi + '' + isDangerDesp]
					dieYearDateList.push(tmpData)
				}
				else {
					let isDangerDesp = `【岁运并临,家人有生死劫】`
					let tmpData = ['年份', LiuNianYearNum, LiuNianAgeNum, isDangerDesp, '大运' + DaYunGanZhi + '流年' + LiuNianGanZhi + '' + isDangerDesp]
					dieYearDateList.push(tmpData)
				}

				// 流年： 一般都在流年与大运或命局伏吟之年或逢日墓之年应凶 。 
				// 往往是在伏吟逢合恰恰合后之五行又同属于伏吟之五行也 是应期。

				let heList = DiZhiRelaLiuNian.filter(str => (str.includes(LiuNianZhi) && (str.includes('六合') || str.includes('三合'))))
				// 
				let hehuaWuxing = ''
				if (heList.length > 0) {
					hehuaWuxing = heList[0].slice(-1)
				}

				// if (LiuNianGanZhi === DaYunGanZhi || siZhuArray.includes(LiuNianGanZhi) || LiuNianWuXing[1] === getMuKuByWuXing(DayWuxing[0]) || hehuaWuxing === DaYunWuXing[1]) {
				if (siZhuArray.includes(LiuNianGanZhi) || LiuNianWuXing[1] === getMuKuByWuXing(DayWuxing[0]) || hehuaWuxing === LiuNianWuXing[1]) {
					let isDangerDesp = `【大运${LiuNianGanZhi === DaYunGanZhi ? '流年共' : ''}伏吟${LiuNianWuXing[1] === getMuKuByWuXing(DayWuxing[0]) ? '流年入墓' : ''}${hehuaWuxing === DaYunWuXing[1] ? '合化出伏吟五行' : ''} 自己有生死劫】`
					let tmpData = ['年份', LiuNianYearNum, LiuNianAgeNum, isDangerDesp, '大运' + DaYunGanZhi + '流年' + LiuNianGanZhi + '' + isDangerDesp]
					dieYearDateList.push(tmpData)
				}

			}





			// 1、七十三、八十四岁遇空亡。
			// 2、岁运并临遇空亡。
			// 3、天克地冲遇空亡。　
			// 4、身旺羊刃重重遇空亡。
			// 5、刑冲克害遇空亡。
			// 6、身旺会合生身遇代亡。
			// 7、身弱生身太过遇空亡。
			// 8、身弱七杀重重遇代亡。
			// A，以流年干配流月日支查空亡。
			// B、以流年大运查空亡。
			// C、流年流月流日查空亡。
			// D、凡空亡（流年大运四柱全是空亡者）必死无疑。

			// 1、七十三、八十四岁遇空亡。
			if (LiuNianAgeNum === 73 || LiuNianAgeNum === 84) {
				let isDangerDesp = `${LiuNianAgeNum === 73 ? '【自己73岁的关口】' : '【自己84岁的关口】'}`
				let tmpData = ['年份', LiuNianYearNum, LiuNianAgeNum, isDangerDesp, '大运' + DaYunGanZhi + '流年' + LiuNianGanZhi + '' + isDangerDesp]
				dieYearDateList.push(tmpData)
			}





			//  劫财流年 
			// JieCaiLiuNianYear
			if (LiuNianShiShenGan === '劫财' || LiuNianShiShenZhi[0] === '劫财') {

				JieCaiLiuNianYear.push(LiuNianYearNum)
			}
			// CaiLiuNianYear财流年 
			if (LiuNianShiShenGan === '正财' || LiuNianShiShenZhi[0] === '偏财') {
				CaiLiuNianYear.push(LiuNianYearNum)
			}

			if (LiuNianShiShenGan === '劫财' || LiuNianShiShenZhi[0] === '劫财') {
				//如果本命局已经比劫大于3 
				if (ShiShenNumBase['比肩'] + ShiShenNumBase['劫财'] >= 3 && ShiShenNumBase['劫财'] >= 1) {
					biJieLiuNianYear.push(LiuNianYearNum)
				}
				else {
					if (ShiShenNumBase['劫财'] + (DaYunShiShenGan === '劫财' ? 1 : 0) + (LiuNianShiShenGan === '劫财' ? 1 : 0) + (LiuNianShiShenZhi[0] === '劫财' ? 1 : 0) + (DaYunShiShenZhi[0] === '劫财' ? 1 : 0) >= 4) {
						if (ShiShenNumBase['正财'] + (DaYunShiShenGan === '正财' ? 1 : 0) + (LiuNianShiShenGan === '正财' ? 1 : 0) + (LiuNianShiShenZhi[0] === '正财' ? 1 : 0) + (DaYunShiShenZhi[0] === '正财' ? 1 : 0) <= 2) {
							biJieLiuNianYear.push(LiuNianYearNum)
						}

					}

				}

			}
			//禄神被冲害的年份 
			const lushen = getLuByGan(DayGan)
			let LiuNianKongWang = liuNian[k].getXunKong()


			if (zhis.includes(lushen) || DaYunZhi === lushen) {

				if (isDiZhiHai(lushen, LiuNianZhi) || isDiZhiChong(lushen, LiuNianZhi) || isDiZhiPo(lushen, LiuNianZhi) || isDiZhiXing(lushen, LiuNianZhi) || LiuNianKongWang.includes(lushen)) {
					//禄神受伤和空亡的年份
					if (!shenShaLiuNian.includes('天乙贵人')) {
						luShenHurtList.push(LiuNianYearNum)
					}
					// 禄神被驿马伤的年份
					if (isYiMa(YearZhi, LiuNianZhi) || isYiMa(DayZhi, LiuNianZhi)) {
						YiMaHurtluShenYearList.push(LiuNianYearNum)
					}
				}
			}


			// 得到日主坐下为比肩的受伤年份 

			if (DayZhiShiShen[0] === '比肩') {
				let dataArray = DiZhiRelaLiuNian.filter(str => (str.includes('刑') || str.includes('冲') || str.includes('害') || str.includes('破')) && str.includes(LiuNianZhi) && str.includes(DayZhi))
				if (dataArray.length > 0) {
					DayBiJianHurtList.push(LiuNianYearNum)
				}
			}


			// 得到动手术的年份就是日主为独立五行，入墓年无生扶就为动手术 


			if (WuXingNumBase[DayWuxing[0]] === 1) {
				if (!isShengZhuByWuxing(DayWuxing[0], LiuNianWuXing[0]) && !isShengZhuByWuxing(DayWuxing[0], DaYunWuXing[0]) && !isShengZhuByWuxing(DayWuxing[0], DaYunWuXing[1])) {
					if (getMuKuByWuXing(DayWuxing[0]) === LiuNianZhi) {
						hurtYearList.push(LiuNianYearNum)
					}
				}
			}

			//妈妈受伤  

			if (ShiShenNumBase['正印'] + ShiShenNumBase['偏印'] === 1) {
				if (!isShengZhuByWuxing(yinWuxing, LiuNianWuXing[0]) && !isShengZhuByWuxing(yinWuxing, DaYunWuXing[0]) && !isShengZhuByWuxing(yinWuxing, DaYunWuXing[1])) {
					if (getMuKuByWuXing(yinWuxing) === LiuNianZhi) {
						motherHurtYearList.push(LiuNianYearNum)
					}
				}

			}
			// 爸爸受伤年份  

			if (ShiShenNumBase['偏财'] + ShiShenNumBase['正财'] === 1) {
				if (!isShengZhuByWuxing(caiWuxing, LiuNianWuXing[0]) && !isShengZhuByWuxing(caiWuxing, DaYunWuXing[0]) && !isShengZhuByWuxing(caiWuxing, DaYunWuXing[1])) {
					if (getMuKuByWuXing(caiWuxing) === LiuNianZhi) {
						fatherHurtYearList.push(LiuNianYearNum)
					}
				}

			}

			// 子女受伤五行 

			if (ShiShenNumBase['食神'] + ShiShenNumBase['伤官'] === 1) {
				if (!isShengZhuByWuxing(shishangWuxing, LiuNianWuXing[0]) && !isShengZhuByWuxing(shishangWuxing, DaYunWuXing[0]) && !isShengZhuByWuxing(shishangWuxing, DaYunWuXing[1])) {
					if (getMuKuByWuXing(shishangWuxing) === LiuNianZhi) {
						shiShangHurtYearList.push(LiuNianYearNum)
					}
				}
			}


			// 官星受伤年份--男的是子女女人的老公五行 

			if (ShiShenNumBase['正官'] + ShiShenNumBase['偏官'] === 1) {
				if (!isShengZhuByWuxing(GuanWuxing, LiuNianWuXing[0]) && !isShengZhuByWuxing(GuanWuxing, DaYunWuXing[0]) && !isShengZhuByWuxing(GuanWuxing, DaYunWuXing[1])) {
					if (getMuKuByWuXing(GuanWuxing) === LiuNianZhi) {
						GuanHurtYearList.push(LiuNianYearNum)
					}
				}
			}


			// 得到结婚的年 -- 配偶星出现的年份 还有就是配偶宫坐下的第一干出现的年份

			// hideGan = LunarUtil.ZHI_HIDE_GAN[zhi];

			const peiouShiShen = userData.gender === 1 ? ['正财'] : ['正官']

			if (LiuNianAgeNum >= 20 && LiuNianAgeNum <= 60) {

				// let num = DiZhiRelaLiuNian.filter(str => str.includes(LiuNianZhi) && str.includes(DayZhi) && (str.includes('三合') || str.includes('三会'))).length

				// let peiouzhihe = DiZhiRelaLiuNian.filter(str => str.includes(LiuNianZhi) && (str.includes('六合') || str.includes('三会') || str.includes('三合'))).length
				// let peiouganhe = GanRelaLiuNian.filter(str => str.includes('合')).length
				// 1 、 配偶出现合为婚妻
				// 2 、 出现了三合三会（不含六合）包括了夫妻宫与流年支 为婚期
				// 3、  流年干是夫妻宫坐下的第一个藏支也为婚期
				// 4、  LiuNianZhi + DayZhi === '戌亥' || LiuNianZhi + DayZhi === '亥戌'
				// 5、  郑民生：逢冲合为结婚应期
				//  孙国圣 
				// 1 流年大运都有配偶星
				// 2 大运逢桃花，流年又见桃花，局中与岁运有合，当主有结婚或恋爱。
				// 3 流年干支与四柱干支天合地合，或大运与四柱流年干支见天合地合，尤其是与日柱相合更验，即使无财官相见了也主婚姻动 
				// 4 命局财入库需大运冲开，大运有财官之库，遇流年冲开，也是婚姻信号。
				// 5 岁运命三者地支构成三合、三会，则该年有结婚或同居的信息。


				//金镖门的结婚，日时干家的财或官，只要大运出现，流年也出现就是会结婚。 




				// if (muKuArray.includes(DayZhi) && (getMuKuByWuXing(DaYunWuXing[0]) === DayZhi || getMuKuByWuXing(DaYunWuXing[1]) === DayZhi) && getHideGan(DayZhi).includes(LiuNianGan) && (LiuNianWuXing[0] === GuanWuxing || LiuNianWuXing[0] === caiWuxing)) {
				// if (((LiuNianWuXing[0] === GuanWuxing || LiuNianWuXing[0] === caiWuxing) && (getHideGan(DayZhi).includes(LiuNianGan) || getHideGan(TimeZhi).includes(LiuNianGan))
				//   && (getMuKuByWuXing(DayWuxing[0]) === DaYunZhi || getMuKuByWuXing(DayWuxing[1]) === DaYunZhi || getMuKuByWuXing(DaYunWuXing[0]) === DayZhi || getMuKuByWuXing(DaYunWuXing[1]) === DayZhi || LiuNianZhi === DayZhi)
				// ) ||
				//   ((DaYunZhi === lushen || getLushen(DaYunGan) === DayZhi || DaYunZhi === getMuKuByWuXing(DayWuxing[0]) || DaYunZhi === getMuKuByWuXing(DayWuxing[1]) || getHideGan(DayZhi).includes(DaYunGan)) && (LiuNianZhi === getMuKuByWuXing(DayWuxing[1]) || LiuNianZhi === getMuKuByWuXing(DayWuxing[0]) || getMuKuByWuXing(LiuNianZhi) === DayZhi))

				// )

				if (((getHideGan(DayZhi).includes(DaYunGan) || DaYunZhi === DayZhi) && [yinWuxing, caiWuxing, GuanWuxing].includes(DaYunWuXing[0]) && getHideGan(DayZhi).includes(LiuNianGan) && [caiWuxing, GuanWuxing].includes(LiuNianWuXing[0]))
					|| ((DaYunZhi === lushen || getHideGan(DayZhi).includes(DaYunGan)) && (DiZhiRelaLiuNian.filter(str => (str.includes(DayZhi) && LiuNianZhi != DayZhi && str.includes(LiuNianZhi) && (str.includes('三合') || str.includes('三合')))).length > 0 || LiuNianZhi === getMuKuByWuXing(DayWuxing[1])))

				) {

					// //插入到变量中
					// let tmpData = [LiuNianGanZhi, '【准】家中财官星年运双出', LiuNianYearNum, LiuNianAgeNum, '【准】家中财官星年运双出']
					// tianganhediPoYearList.push(tmpData)
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['坐下财官星年运双透出', '日支或时支的财官星年运双透出']
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--【准】家中财官星年运双出')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--【准】家中财官星年运双出')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--【准】家中财官星年运双出')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--【准】家中财官星年运双出')
					}
				}
				// 流年有桃花 并且引动正官星 

				if (shenShaLiuNian.includes('桃花') && (
					(isDiZhiPo(LiuNianZhi, DayZhi) && DayZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiLiuHe(LiuNianZhi, DayZhi) && DayZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiChong(LiuNianZhi, DayZhi) && DayZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiPo(LiuNianZhi, TimeZhi) && TimeZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiLiuHe(LiuNianZhi, TimeZhi) && TimeZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiChong(LiuNianZhi, TimeZhi) && TimeZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiPo(LiuNianZhi, YearZhi) && YearZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiLiuHe(LiuNianZhi, YearZhi) && YearZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiChong(LiuNianZhi, YearZhi) && YearZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiPo(LiuNianZhi, MonthZhi) && MonthZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiLiuHe(LiuNianZhi, MonthZhi) && MonthZhiShiShen[0] === peiouShiShen[0]) ||
					(isDiZhiChong(LiuNianZhi, MonthZhi) && MonthZhiShiShen[0] === peiouShiShen[0]) ||
					((shenShaDayun.includes('天喜') || shenShaDayun.includes('桃花')))
				)) {
					//插入到变量中

					// let tmpData = [LiuNianGanZhi, '流年桃花引动配偶星', LiuNianYearNum, LiuNianAgeNum, '流年桃花引动配偶星']
					// tianganhediPoYearList.push(tmpData)
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['流年桃花引动配偶星', '流年桃花引动配偶星']
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年桃花引动配偶星')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年桃花引动配偶星')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年桃花引动配偶星')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年桃花引动配偶星')
					}
				}

				// 很绝看结婚应期的方法，原局无财库，大运有财库，流年一冲为结婚应期,


				if (!zhis.includes(getMuKuByWuXing(userData.gender === 0 ? GuanWuxing : caiWuxing)) && DaYunZhi === getMuKuByWuXing(userData.gender === 0 ? GuanWuxing : caiWuxing) && isDiZhiChong(LiuNianZhi, DaYunZhi)) {

					// //插入到变量中
					// let tmpData = [LiuNianGanZhi, '流年冲大运配偶库', LiuNianYearNum, LiuNianAgeNum, '流年冲大运配偶库']
					// tianganhediPoYearList.push(tmpData)
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['流年冲大运配偶库', '流年冲大运配偶库']
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲大运配偶库')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲大运配偶库')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲大运配偶库')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲大运配偶库')
					}
				}

				// 1 流年+大运 见财官 多为结婚年

				if ((LiuNianShiShenGan === peiouShiShen[0] || LiuNianShiShenZhi[0] === peiouShiShen[0]) && (DaYunShiShenGan === peiouShiShen[0] || DaYunShiShenZhi[0] === peiouShiShen[0])) {


					// //插入到变量中
					// let tmpData = [LiuNianGanZhi, '流运双配偶', LiuNianYearNum, LiuNianAgeNum, '大运流年双配偶']
					// tianganhediPoYearList.push(tmpData)
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['流运双配偶', '大运流年双配偶']
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--大运流年双配偶星')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--大运流年双配偶星')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--大运流年双配偶星')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--大运流年双配偶星')
					}
				}

				//  2 大运逢桃花，流年又见桃花，局中与岁运有合，当主有结婚或恋爱。

				if (shenShaDayun.includes('桃花') && shenShaLiuNian.includes('桃花') && DiZhiRelaLiuNian.filter(str => str.includes('合') && str.includes(LiuNianZhi)).length > 0 && DiZhiRelaLiuNian.filter(str => str.includes('合') && str.includes(DaYunZhi)).length > 0) {
					//插入到变量中
					// let tmpData = [LiuNianGanZhi, '流运双桃花且合命局', LiuNianYearNum, LiuNianAgeNum, '流运双桃花且合命局']
					// tianganhediPoYearList.push(tmpData)
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['流运双桃花且合命局', '流运双桃花且合命局']
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运双桃花且合命局')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运双桃花且合命局')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运双桃花且合命局')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运双桃花且合命局')
					}
				}

				// 3 流年干支与四柱干支天合地合，或大运与四柱流年干支见天合地合，尤其是与日柱相合更验，即使无财官相见了也主婚姻动 
				if (getTianheDihe(LiuNianGanZhi, DaYunGanZhi) || getTianheDihe(LiuNianGanZhi, DayGanZhi)) {

					//插入到变量中
					// let tmpData = [LiuNianGanZhi, '流运天合地合日支', LiuNianYearNum, LiuNianAgeNum, '流运天合地合日支']
					// tianganhediPoYearList.push(tmpData)
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['流运天合地合日支', '流运天合地合日支']
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运天合地合日支')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运天合地合日支')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运天合地合日支')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运天合地合日支')
					}
				}

				// 4 本命局财入库需大运冲开，大运有财官之库，遇流年冲开，也是婚姻信号。


				if ((userData.gender === 1 && WuXingNumBase[caiWuxing] > 0 &&
					(zhis.includes(getMuKuByWuXing(caiWuxing)) || DaYunZhi === getMuKuByWuXing(caiWuxing)) &&
					DiZhiRelaLiuNian.filter(str => str.includes(LiuNianZhi) && str.includes(getMuKuByWuXing(caiWuxing))
						&& str.includes('冲')).length > 0)
					|| (userData.gender === 0 && WuXingNumBase[GuanWuxing] > 0 &&
						(zhis.includes(getMuKuByWuXing(GuanWuxing)) || DaYunZhi === getMuKuByWuXing(GuanWuxing)) && DiZhiRelaLiuNian.filter(str => str.includes(LiuNianZhi) && str.includes(getMuKuByWuXing(GuanWuxing)) && str.includes('冲')).length > 0)) {
					//插入到变量中
					// let tmpData = [LiuNianGanZhi, '本命配偶入库逢冲开', LiuNianYearNum, LiuNianAgeNum, '本命配偶入库逢冲开']
					// tianganhediPoYearList.push(tmpData)
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['本命配偶入库逢冲开', '本命配偶入库逢冲开']
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲开配偶墓')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲开配偶墓')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)") + '--流年冲开配偶墓') {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲开配偶墓')
					}
				}

				// 5  //岁运命三者地支构成三合、三会，则该年有结婚或同居的信息。尤其是男命会合成财局，女命会成官局更验  
				const sanhesanhuiArra = DiZhiRelaLiuNian.filter(str => (str.includes('三会') || str.includes('三合') && str.includes(LiuNianZhi) && str.includes(DaYunZhi)))
				if (sanhesanhuiArra.length > 0) {
					for (const item of sanhesanhuiArra) {
						let hehuaWuxing = item.slice(-1)
						if ((hehuaWuxing === GuanWuxing && userData.gender === 0) || (hehuaWuxing === caiWuxing && userData.gender === 1)) {

							//插入到变量中
							// let tmpData = [LiuNianGanZhi, '流运会合出配偶星', LiuNianYearNum, LiuNianAgeNum, '流运会合出配偶星']
							// tianganhediPoYearList.push(tmpData)
							// 加入到LiuNianKeyDataTmp.tags数组中
							let TagsTmpData = ['流运会合出配偶星', '流运会合出配偶星']
							LiuNianKeyDataTmp.tags.push(TagsTmpData)

							//结婚的年份 如果不存在就增加
							if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运会合出配偶星')) {
								marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运会合出配偶星')
							}
							//婚恋的年份 
							if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运会合出配偶星')) {
								marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运会合出配偶星')
							}

							break;
						}

					}
				}


				if (LiuNianZhi + DayZhi === '戌亥' || LiuNianZhi + DayZhi === '亥戌') {

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年日支戌亥见')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年日支戌亥见')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年日支戌亥见')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年日支戌亥见')
					}

				}

				// 流年伏吟日柱也是结婚的年份  =--小红书2013年结婚
				if (LiuNianGanZhi === DayGanZhi) {

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年伏吟日柱')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年伏吟日柱')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年伏吟日柱')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年伏吟日柱')
					}

				}


				// 东北 男女婚前看月令，遇合遇冲动感情。流年六合来串宫，也主当年婚姻动。
				if (get12ShenSha(LiuNianZhi, MonthZhi) === '六合') {
					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '----月令串宫逢六合')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--月令串宫逢六合')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--月令串宫逢六合')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--月令串宫逢六合')
					}

				}

				// 流运四伤官正官伤尽 --- 湖南辛欣的特点 

				if (LiuNianWuXing[0] === shishangWuxing && LiuNianWuXing[0] === LiuNianWuXing[1] && DaYunWuXing[0] === DaYunWuXing[1] && DaYunWuXing[0] === shishangWuxing && userData.gender === 0) {

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四食伤正官伤尽')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四食伤正官伤尽')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四食伤正官伤尽')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四食伤正官伤尽')
					}

				}
				// 伤官入墓官星得救也是结婚         

				if (LiuNianWuXing[0] === shishangWuxing && LiuNianZhi === getMuKuByWuXing(shishangWuxing) && DaYunWuXing[0] === DaYunWuXing[1] && DaYunWuXing[0] === shishangWuxing && userData.gender === 0) {

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--伤官入墓正官得救')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--伤官入墓正官得救')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--伤官入墓正官得救')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--伤官入墓正官得救')
					}

				}

				//男的全是劫财 物极必反
				if (LiuNianWuXing[0] === DayWuxing[0] && LiuNianWuXing[0] === LiuNianWuXing[1] && DaYunWuXing[0] === DaYunWuXing[1] && DaYunWuXing[0] === DayWuxing[0] && userData.gender === 1) {

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四比劫正财伤尽')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四比劫正财伤尽')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四比劫正财伤尽')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流运四比劫正财伤尽')
					}

				}

				// 男的劫财入墓财星得救也是结婚 
				// marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + DayWuxing[0] + getMuKuByWuXing(caiwuxing) + )

				if (LiuNianWuXing[0] === DayWuxing[0] && LiuNianZhi === getMuKuByWuXing(DayWuxing[0]) && DaYunWuXing[0] === DaYunWuXing[1] && DaYunWuXing[0] === DayWuxing[0] && userData.gender === 1) {

					//结婚的年份 如果不存在就增加
					if (!marrayYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--劫财入墓正财得救')) {
						marrayYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--劫财入墓正财得救')
					}
					//婚恋的年份 
					if (!marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--劫财入墓正财得救')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--劫财入墓正财得救')
					}

				}







				let fuqigongchongNum = DiZhiRelaLiuNian.filter(str => str.includes(LiuNianZhi) && str.includes(DayZhi) && (str.includes('冲') || str.includes('会') || str.includes('六合'))).length

				// 在适龄年龄段，流支与年支或日支有冲会合或戌见亥易结婚之年，不婚亦有外遇或夫妻之实，国学上是成婚之年。
				if (fuqigongchongNum > 0 || LiuNianGan === getHideGan(DayZhi)[0] || LiuNianZhi === DayZhi) {
					if (LiuNianZhi != DayZhi && !marraySexYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '---流日冲合会|日支及藏干复现')) {
						marraySexYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '---流日冲合会|日支及藏干复现')
					}
				}
			}

			// ------------------婚期结束------------------------
			// ------------------不吉利的年份------------------------
			// 犯太岁，（1）逢本命年（2）流年支与生年支相同
			// 冲太岁，即流年支与生年支相冲，犯太岁冲太岁，诸事不顺，远行外出宜小心，凡事以守为佳。
			// 5 真太岁，为人之 61 岁之流年，又名转趾煞，遇大运，日主，流年有冲克其年凶，相生其年吉。
			// 6、征太岁，日干支与流年干支或大运干支与流年干支天克地冲，灾重，忧心劳力烦恼多。命局干支与之合、会者，可解。
			// 7、日犯岁君：日干克流年干，灾厄或破财，日主坐天月德贵人或流年年干有合，或四柱、大
			// 运有官杀克制日主，可解。
			// 8、岁伤日干：流年干克日干，祸轻。
			// 9、岁运并临：流年干支与所行大运干支相同者，逢财官印吉，遇羊刃七杀则凶。
			// 10、犯旺：月支为官杀或食神，坐羊刃，逢流年支冲者，日主死绝无气用神无力：凶险，刑
			// 伤，横祸，伤亡。
			// 11、流年六亲刑克：(1)官星入墓男克子，女克夫。(2)正财入墓男克妻，偏财入墓克父。(3)
			// 食神入墓女克子。(4)正财破印克母。(5)金水土入墓困顿无险。(6)木火入墓非死即入牢笼。
			// (7)用神入墓如虎卧荒丘。(8)酉辰冲戌祸非浅。


			// 12、局中独刃被冲穿刑，独刃空亡被绝，岁运遇冲合，难过此关。伤官坐刃易受刀伤。
			// 伤灾：(1)金木相战主血光，木土相战主车祸。(2)日时卯酉相冲无合者伤。(3)胎元遇穿绝伤
			// 残。(4)枭神食神相战有伤残。(5)命局金锁铁蛇关伤残。

			// 犯太岁，（1）逢本命年（2）流年支与生年支相同
			if (LiuNianZhi === YearZhi) {
				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['犯太岁', '本命年犯太岁']
				LiuNianKeyDataTmp.tags.push(TagsTmpData)

				//结婚的年份 如果不存在就增加
				if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--犯太岁本命年')) {
					noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--犯太岁本命年')
				}
			}
			// 冲太岁，即流年支与生年支相冲，犯太岁冲太岁，诸事不顺，远行外出宜小心，凡事以守为佳。
			if (isDiZhiChong(LiuNianZhi, YearZhi)) {
				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['冲太岁', `流年支年支${LiuNianZhi + YearZhi + '相冲'}`]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)

				//结婚的年份 如果不存在就增加
				if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--冲太岁${LiuNianZhi + YearZhi + '相冲'}`)) {
					noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--冲太岁${LiuNianZhi + YearZhi + '相冲'}`)
				}
			}

			// 真太岁， 为人之 61岁之流年，又名转趾煞，遇大运与流年顺生 有冲克年凶，相生其年吉。
			if (LiuNianGanZhi === YearGanZhi || LiuNianGanZhi === DayGanZhi) {
				let flag = '主凶'
				if (isDiZhiLiuHe(DaYunGan, LiuNianZhi) || getWuXingRelation(LiuNianWuXing[1], DaYunWuXing[1]) === '生') {
					flag = '有吉事'
				}

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['真太岁年', '转趾煞年日柱与流柱相同' + flag]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)

				//结婚的年份 如果不存在就增加
				if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--真太岁年日伏吟流年柱' + flag)) {
					noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--真太岁年日伏吟流年柱' + flag)
				}

			}
			// 6、征太岁，日干支与流年干支或大运干支与流年干支天克地冲，灾重，忧心劳力烦恼多。命局干支与之合、会者，可解。        
			if ((getTianKeDiChong(LiuNianGanZhi, DaYunGanZhi) && getWuXingRelation(LiuNianWuXing[0], DaYunWuXing[0]) === '克') || getTianKeDiChong(LiuNianGanZhi, DayGanZhi)) {
				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['征太岁', '运或日柱天克地冲流年']
				LiuNianKeyDataTmp.tags.push(TagsTmpData)

				//结婚的年份 如果不存在就增加
				if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--征太岁天克地冲流年')) {
					noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--征太岁天克地冲流年')
				}
			}

			// 7、日犯岁君：日干克流年干，灾厄或破财，日主坐天月德贵人或流年年干有合，或四柱、大运有官杀克制日主，可解。

			if (getWuXingRelation(LiuNianWuXing[0], DayWuxing[0]) === '克' && ShiShenNumBase['正官'] + ShiShenNumBase['七杀'] === 0 && !shenShaday.includes('天德贵人') && !shenShaday.includes('月德贵人') && GanRelaLiuNian.filter(str => (str.includes(LiuNianGan) && str.includes('合'))).length === 0) {
				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['日犯岁君', '日干克流年干且无制']
				LiuNianKeyDataTmp.tags.push(TagsTmpData)

				//结婚的年份 如果不存在就增加
				if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--日犯岁君且无制')) {
					noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--日犯岁君且无制')
				}
			}
			// 8、岁伤日干：流年干克日干，祸轻。---没必要写
			// 9、岁运并临：流年干支与所行大运干支相同者，逢财官印吉，遇羊刃七杀则凶。
			if (LiuNianGanZhi === DaYunGanZhi) {
				let flag = '主凶'
				if (!shenShaLiuNian.includes('羊刃') && LiuNianShiShenGan != '七杀' && !LiuNianShiShenZhi.includes('七杀')) {
					flag = '有吉事'
				}

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['岁运并临', '岁运并临' + flag]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)

				//结婚的年份 如果不存在就增加
				if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--岁运并临' + flag)) {
					noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--岁运并临' + flag)
				}

			}

			// 10、犯旺：月支为官杀或食神，坐羊刃，逢流年支冲者，日主死绝无气用神无力：凶险，刑伤，横祸，伤亡。
			if (shenShamonth.includes('羊刃') && isDiZhiChong(LiuNianZhi, MonthZhi) && (MonthWuxing[0] === GuanWuxing || MonthZhiShiShen[0] === '食神')) {
				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['流年犯旺羊刃', '流年冲犯月令羊刃官杀或食伤[凶]']
				LiuNianKeyDataTmp.tags.push(TagsTmpData)

				//结婚的年份 如果不存在就增加
				if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲犯月令羊刃官杀食[凶]')) {
					noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + '--流年冲犯月令羊刃官杀食[凶]')
				}
			}

			// 11、流年六亲刑克：(1)官星入墓男克子，女克夫。(2)正财入墓男克妻，偏财入墓克父。(3)
			// 食神入墓女克子。(4)正财破印克母。
			// (5)金水土入墓困顿无险。(6)木火入墓非死即入牢笼。
			// (7)用神入墓如虎卧荒丘。(8)酉辰冲戌祸非浅。


			if (muKuArray.includes(LiuNianZhi)) {

				if (LiuNianZhi === GuanMuEls) {
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['官星入墓年', `${userData.gender === 0 ? (LiuNianAgeNum > 20 ? '克夫年' : '官星入墓') : (LiuNianAgeNum > 22 ? '克子年' : '官星入墓')}`]
					LiuNianKeyDataTmp.tags.push(TagsTmpData)


					//结婚的年份 如果不存在就增加
					if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--官星入墓${userData.gender === 0 ? (LiuNianAgeNum > 20 ? '克夫年' : '官星入墓') : (LiuNianAgeNum > 22 ? '克子年' : '官星入墓')}`)) {
						noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--官星入墓${userData.gender === 0 ? (LiuNianAgeNum > 20 ? '克夫年' : '官星入墓') : (LiuNianAgeNum > 22 ? '克子年' : '官星入墓')}`)
					}
				}

				if (LiuNianZhi === CaiMuEls) {
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['财星入墓年', `${userData.gender === 0 ? '克父年' : (LiuNianAgeNum > 20 ? '克父克妻年' : '克父年')}`]
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--财星入墓${userData.gender === 0 ? '克父年' : (LiuNianAgeNum > 20 ? '克父克妻年' : '克父年')}`)) {
						noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--财星入墓${userData.gender === 0 ? '克父年' : (LiuNianAgeNum > 20 ? '克父克妻年' : '克父年')}`)
					}
				}

				if (LiuNianZhi === ShiShangMuEls) {
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['食伤星入墓年', `${userData.gender === 0 ? (LiuNianAgeNum > 20 ? '克子年' : '财源波动年') : '财源波动年'}`]
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--食伤星入墓${userData.gender === 0 ? (LiuNianAgeNum > 20 ? '克子年' : '财源波动年') : '财源变化年'}`)) {
						noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--食伤星入墓${userData.gender === 0 ? (LiuNianAgeNum > 20 ? '克子年' : '财源波动年') : '财源波动年'}`)
					}
				}

				if (LiuNianZhi === YinMuEls) {
					// 加入到LiuNianKeyDataTmp.tags数组中
					let TagsTmpData = ['印星入墓年', `${userData.gender === 0 ? '克母年' : '克母年'}`]
					LiuNianKeyDataTmp.tags.push(TagsTmpData)

					//结婚的年份 如果不存在就增加
					if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--印星入墓${userData.gender === 0 ? '克母年' : '克母年'} `)) {
						noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--印星入墓${userData.gender === 0 ? '克母年' : '克母年'}`)
					}
				}
			}

			// 12、局中独刃被冲穿刑，独刃空亡被绝，岁运遇冲合，难过此关。伤官坐刃易受刀伤。
			// 伤灾：(1)金木相战主血光，木土相战主车祸。(2)日时卯酉相冲无合者伤。(3)胎元遇穿绝伤
			// 残。(4)枭神食神相战有伤残。(5)命局金锁铁蛇关伤残。
			let YangRen = getYangRen(DayGan)
			if (zhis.filter(str => str === YangRen).length === 1) {
				if (DiZhiRela.filter(str => str.includes(YangRen) && (str.includes('冲') || str.includes('刑') || str.includes('害'))).length > 0 || DayKongWang.includes(YangRen)) {
					if (isDiZhiChong(LiuNianZhi, YangRen) || isDiZhiLiuHe(LiuNianZhi, YangRen)) {
						// 加入到LiuNianKeyDataTmp.tags数组中
						let TagsTmpData = ['独刃被冲合', `独刃[${YangRen}]被冲合`]
						LiuNianKeyDataTmp.tags.push(TagsTmpData)

						//结婚的年份 如果不存在就增加
						if (!noGoodYearList.includes(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + `--独刃被冲合`)) {
							noGoodYearList.push(LiuNianYearNum + '(' + LiuNianAgeNum + "岁)" + + `--独刃被冲合`)
						}
					}
				}
			}













			//得到伤官见官的年份  伤官大于七杀加正官，官化印必出事 

			let shangGuanNumbase = ShiShenNumBase['伤官'] || 0, zhengGuanNum = (ShiShenNumBase['正官'] + ShiShenNumBase['七杀']) || 0;
			if (DaYunLiuNianShiShen.filter(item => item.includes("伤官")).length + shangGuanNumbase > DaYunLiuNianShiShen.filter(item => item.includes("七杀")).length + DaYunLiuNianShiShen.filter(item => item.includes("正官")).length + zhengGuanNum) {
				if (LiuNianShiShenGan === '伤官' || LiuNianShiShenZhi[0] === '伤官') {
					shangguanjianguanYearList.push(LiuNianYearNum)
				}

			}
			// HuiZaiYearList 婚灾的年份 财被日支合劫财 年
			if (LiuNianShiShenZhi[0] === '劫财' && userData.gender === 1) {
				let HeArray = DiZhiRelaLiuNian.filter(str => (str.includes(LiuNianZhi) && str.includes(DayZhi) && str.includes('合')))
				if (HeArray.length > 0) {
					HuiZaiYearList.push(LiuNianYearNum)
				}
			}
			//HuiZaiYearList 婚灾的年份 财被日支合劫财年 
			if (LiuNianShiShenZhi[0] === '伤官' && userData.gender === 0) {
				let HeArray = DiZhiRelaLiuNian.filter(str => (str.includes(LiuNianZhi) && str.includes(DayZhi) && str.includes('合')))
				if (HeArray.length > 0) {
					HuiZaiYearList.push(LiuNianYearNum)
				}
			}
			// 38岁前的流年支与命局的年支， 日坐支刑冲害吟为离婚年。

			if (isDiZhiXing(LiuNianZhi, DayZhi) || isDiZhiChong(LiuNianZhi, DayZhi) || isDiZhiHai(LiuNianZhi, DayZhi) || getTianTongDiTong(LiuNianGanZhi, DayGan + DayZhi) || getTianKeDiChong(LiuNianGanZhi, DayGan + DayZhi)) {
				// let HeArray = DiZhiRelaLiuNian.filter(str => (str.includes(LiuNianZhi) && str.includes(DayZhi) && str.includes('合')))        
				if (!HuiZaiYearList.includes(LiuNianYearNum)) {
					HuiZaiYearList.push(LiuNianYearNum)
				}
			}



			// 得到自坐财库的人发财的年份 selfCaiKuFaCaiYearList 
			if (selfCaiKu.includes(DayGan + DayZhi)) {
				if (isDiZhiChong(LiuNianZhi, DayZhi) || DiZhiRelaLiuNian.filter(str => (str.includes(LiuNianZhi) && str.includes(DayZhi) && str.includes('刑')))) {
					selfCaiKuFaCaiYearList.push(LiuNianYearNum)
				}
			}

			// tianganhediPoDaYunList   大运 天干合地支破 
			// if (!dieDaYunDateList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpDayunData)))
			if (getTianheDipo(DaYunGanZhi, YearGanZhi) || getTianheDipo(DaYunGanZhi, MonthGanZhi) || getTianheDipo(DaYunGanZhi, DayGanZhi) || getTianheDipo(DaYunGanZhi, TimeGanZhi)) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge]
				if (!tianganhediPoDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					tianganhediPoDaYunList.push(tmpData)
				}

			}

			// 结婚的大运 
			// 1、大运与日柱与月柱互为空亡,为空亡的字，以日柱或月柱定空亡时，大运地支为空亡的，叫做互为空亡。
			if (MonthKongWang.includes(DaYunZhi) && DaYunKongWang.includes(MonthZhi) && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运月柱互为空亡']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}

			if (DayKongWang.includes(DaYunZhi) && DaYunKongWang.includes(DayZhi) && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运日柱互为空亡']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}
			// 2.女命大运与日柱互为官杀。日干是运干的官杀，运支是日支的官杀，叫做互为官杀。
			// 11.男命大运与月柱互为财星，女命大运与月柱互为官杀;
			if (getWuXingRelation(DaYunWuXing[0], DayWuxing[0]) === '克' && getWuXingRelation(DayWuxing[1], DaYunWuXing[1]) === '克' && userData.gender === 0 && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运日柱互为官杀']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}

			if (getWuXingRelation(DaYunWuXing[0], MonthWuxing[0]) === '克' && getWuXingRelation(DayWuxing[1], MonthWuxing[1]) === '克' && userData.gender === 0 && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运月柱互为官杀']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}

			// 男命大运与日柱互为财星。日千是运干的财星，运支是日支的财星，叫做互为财星。
			if (getWuXingRelation(DaYunWuXing[1], DayWuxing[1]) === '克' && getWuXingRelation(DayWuxing[0], DaYunWuXing[0]) === '克' && userData.gender === 1 && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运日柱互为财星']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}

			if (getWuXingRelation(DaYunWuXing[1], MonthWuxing[1]) === '克' && getWuXingRelation(MonthWuxing[0], DaYunWuXing[0]) === '克' && userData.gender === 1 && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运月柱互为财星']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}
			// 4.大运地支为日支桃花(真桃花，即申子辰见酉，寅午戌见卯，亥卯未见子，已西丑见午。并非只要见到子午卯西就是):
			if (isTaoHua(DayZhi, DaYunZhi) && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运为日支桃花']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}
			// 5.大运地支被日支合入(不仅仅相合，是被合入日支，比如子丑合子被合入丑中);
			// 子丑合：子水与丑土相合，可以转化为土的属性。寅亥合：寅木与亥水相合，可以转化为木的属性。卯戌合：卯木与戌土相合，可以转化为火的属性。
			if (isDiZhiLiuHe(DaYunZhi, DayZhi, true) && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运地支被日支合入']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}
			// 6.男命以日干起太岁，大运干支有一个落六合;女命以日干起太岁大运干支有一个落六合或官符;
			if ((userData.gender === 1 && (get12ShenSha(DayGan, DaYunGan) === '六合' || get12ShenSha(DayGan, DaYunZhi) === '六合')) ||
				(userData.gender === 0 && (get12ShenSha(DayGan, DaYunGan) === '六合' || get12ShenSha(DayGan, DaYunZhi) === '六合') || get12ShenSha(DayGan, DaYunGan) === '官符' || get12ShenSha(DayGan, DaYunZhi) === '官符')) {
				if (DaYunEndAge >= 20) {
					let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '日干太岁大运逢六合或官符']
					if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
						marrayDaYunList.push(tmpData)
					}
				}

			}
			// 7.大运地支与月支相合;
			if (isDiZhiLiuHe(DaYunZhi, MonthZhi) && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '大运地支合月支']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}
			// 8.以大运地支起太岁，男月支落六合，女月支落官符和六合;(六合也代表桃花，官符为女的桃花)

			if ((userData.gender === 1 && get12ShenSha(DaYunZhi, MonthZhi) === '六合') || (userData.gender === 1 && (get12ShenSha(DaYunZhi, MonthZhi) === '六合' || get12ShenSha(DaYunZhi, MonthZhi) === '管符')) && DaYunEndAge >= 20) {
				// 格式  【大运干支， 大运开始年 ，大运结束年】
				let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '岁支太岁月支逢六合或官符']
				if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
					marrayDaYunList.push(tmpData)
				}
			}
			// 9.大运地支与四柱中的桃花相合(只要是子午卯酉即可)
			// 10.运支冲四柱中的桃花(只要是四柱中子午卯酉即可):
			const taohuaArr = ['子', '午', '卯', '酉']
			if (zhis.some(element => taohuaArr.includes(element)) && DaYunEndAge >= 20) {
				if (
					((isDiZhiLiuHe(DaYunZhi, YearZhi) || isDiZhiChong(DaYunZhi, YearZhi)) && taohuaArr.includes(YearZhi)) ||
					((isDiZhiLiuHe(DaYunZhi, MonthZhi) || isDiZhiChong(DaYunZhi, MonthZhi)) && taohuaArr.includes(MonthZhi)) ||
					((isDiZhiLiuHe(DaYunZhi, DayZhi) || isDiZhiChong(DaYunZhi, DayZhi)) && taohuaArr.includes(DayZhi)) ||
					((isDiZhiLiuHe(DaYunZhi, TimeZhi) || isDiZhiChong(DaYunZhi, MonthZhi)) && taohuaArr.includes(TimeZhi))) {
					// 格式  【大运干支， 大运开始年 ，大运结束年】
					let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '岁支冲合本命桃花']
					if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
						marrayDaYunList.push(tmpData)
					}
				}
			}
			//  12.男命大运地支与月支冲飞合飞拱飞出的财星六合;
			// 13.女命大运地支与月支冲飞合飞拱飞出官星六合官符:
			// 14.以日柱纳音起长生，二三部大运，男落沐浴(代表桃花)，女落沐浴 临官
			// 日柱纳音起长生诀:水申 木亥长生位，金音在辰定不差。火卯长生永不更，土命午上起长生。 
			// 长生后面3位是临官 第1位是沐浴 
			// 日柱纳音在行大运“生旺死绝“十二运的断运诀:木见绝字实可哀，金怕临官又怕衰。水病绝来自主灾。火见沐浴必生焚。土见养病身不利)

			if ((DaYunIndex === 2 || DaYunIndex === 3) && DaYunEndAge >= 20) {
				let changShengEls = ''
				if (DayNaYin[3] === '水') changShengEls = '申';
				if (DayNaYin[3] === '木') changShengEls = '亥';
				if (DayNaYin[3] === '金') changShengEls = '辰';
				if (DayNaYin[3] === '火') changShengEls = '卯';
				if (DayNaYin[3] === '土') changShengEls = '午';

				// 沐浴
				let MuYv = dizhiList[(dizhiList.indexOf(changShengEls) === 11 ? 0 : dizhiList.indexOf(changShengEls)) + 1]
				// 临管
				let LinGuan = dizhiList[(dizhiList.indexOf(changShengEls) + 3) > 11 ? ((dizhiList.indexOf(changShengEls) + 3) - 12) : (dizhiList.indexOf(changShengEls) + 3)]


				if ((userData.gender === 1 && DaYunZhi === MuYv) || (userData.gender === 0 && (DaYunZhi === MuYv || DaYunZhi === LinGuan))) {
					// 格式  【大运干支， 大运开始年 ，大运结束年】
					let tmpData = [DaYunGanZhi, DaYunStarYear, DaYunEndYear, DaYunStarAge, DaYunEndAge, '日纳算长生运落沐浴或临官']

					if (!marrayDaYunList.some(subArray => JSON.stringify(subArray) === JSON.stringify(tmpData))) {
						marrayDaYunList.push(tmpData)
					}
				}

			}


			// 浴或临官(代表桃花);



			// 流年伤害其它支的情况 
			for (const index in zhisDaYun) {
				// 加入到LiuNianKeyDataTmp.tags数组中
				let zhuNameArray = ['大运', '年支', '月支', '日支', '时支']
				let els = zhisDaYun[index]
				let ganEls = gansDaYun[index]
				let zhuName = zhuNameArray[index]
				let lushenFlag = (getLushen(DayGan) === els)
				let LiNianlushenFlag = (getLushen(DayGan) === LiuNianZhi)
				// 插入到数组当中

				let tags = (isDiZhiXing(LiuNianZhi, els) ? ' 流年刑' + zhuName : '') + (isDiZhiChong(LiuNianZhi, els) ? ' 流年冲' + zhuName : '') + (isDiZhiPo(LiuNianZhi, els) ? ' 流年破' + zhuName : '') + (isDiZhiHai(LiuNianZhi, els) ? ' 流年害' + zhuName : '') + (isDiZhiJue(LiuNianZhi, els) ? ' 流年绝' + zhuName : '') + (getTianTongDiTong(LiuNianGanZhi, ganEls + els) ? ' 流年伏吟' + zhuName : '')
				if (tags.length > 2) {
					let TagsTmpData = [zhuName + '受伤', tags + (lushenFlag ? ' 元局禄神受伤' : '') + (LiNianlushenFlag ? ' 流年禄神受伤' : '')]
					LiuNianKeyDataTmp.tags.push(TagsTmpData)
				}
			}

			//流年三合三会六合情况 
			let heHuiArray = DiZhiRelaLiuNian.filter(str => str.includes(LiuNianZhi) && (str.includes('六合') || str.includes('三会') || str.includes('三合')))
			if (heHuiArray.length > 0) {
				for (const item of heHuiArray) {
					if (item.includes('三会')) {
						let TagsTmpData = ['流年三会', item]
						LiuNianKeyDataTmp.tags.push(TagsTmpData)
					}
					if (item.includes('六合')) {

						let selfMuEls = getMuKuByWuXing(DayWuxing[0])

						let TagsTmpData = ['流年六合', item, item.includes(selfMuEls) ? '合了自己墓库' : '']
						LiuNianKeyDataTmp.tags.push(TagsTmpData)


					}
					if (item.includes('三合')) {
						let TagsTmpData = ['流年三合', item]
						LiuNianKeyDataTmp.tags.push(TagsTmpData)
					}

				}

			}


			// tianganhediPoYearList
			// 1 流年 天干合地支破
			if (getTianheDipo(LiuNianGanZhi, DaYunGanZhi) || getTianheDipo(LiuNianGanZhi, YearGanZhi) || getTianheDipo(LiuNianGanZhi, MonthGanZhi) || getTianheDipo(LiuNianGanZhi, DayGanZhi) || getTianheDipo(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianheDipo(LiuNianGanZhi, DaYunGanZhi) ? '流年天合地破大运 ' + ((isLuShen(DayGan, DaYunZhi) ? '破大运禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '破流年禄' : '')) : '') +
					(getTianheDipo(LiuNianGanZhi, YearGanZhi) ? '流年天合地破年柱 ' + ((isLuShen(DayGan, YearZhi) ? '破元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '破流年禄' : '')) : '') +
					(getTianheDipo(LiuNianGanZhi, MonthGanZhi) ? '流年天合地破月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '破元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '破流年禄' : '')) : '') +
					(getTianheDipo(LiuNianGanZhi, DayGanZhi) ? '流年天合地破日柱 ' + ((isLuShen(DayGan, DayZhi) ? '破元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '破流年禄' : '')) : '') +
					(getTianheDipo(LiuNianGanZhi, TimeGanZhi) ? '流年天合地破时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '破元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '破流年禄' : '')) : '')
				//插入到变量中
				let tmpData = [LiuNianGanZhi, '天合地破', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天合地破', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}


			// 2 流年 天干合地支刑
			if (getTianheDiXing(LiuNianGanZhi, DaYunGanZhi) || getTianheDiXing(LiuNianGanZhi, YearGanZhi) || getTianheDiXing(LiuNianGanZhi, MonthGanZhi) || getTianheDiXing(LiuNianGanZhi, DayGanZhi) || getTianheDiXing(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianheDiXing(LiuNianGanZhi, DaYunGanZhi) ? '流年天合地刑大运 ' + ((isLuShen(DayGan, DaYunZhi) ? '刑大运禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '刑流年禄' : '')) : '') +
					(getTianheDiXing(LiuNianGanZhi, YearGanZhi) ? '流年天合地刑年柱 ' + ((isLuShen(DayGan, YearZhi) ? '刑元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '刑流年禄' : '')) : '') +
					(getTianheDiXing(LiuNianGanZhi, MonthGanZhi) ? '流年天合地刑月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '刑元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '刑流年禄' : '')) : '') +
					(getTianheDiXing(LiuNianGanZhi, DayGanZhi) ? '流年天合地刑日柱 ' + ((isLuShen(DayGan, DayZhi) ? '刑元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '刑流年禄' : '')) : '') +
					(getTianheDiXing(LiuNianGanZhi, TimeGanZhi) ? '流年天合地刑时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '刑元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '刑流年禄' : '')) : '')
				//插入到变量中
				let tmpData = [LiuNianGanZhi, '天合地刑', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天合地刑', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}

			// 3 流年 天干合地支害
			if (getTianheDiHai(LiuNianGanZhi, DaYunGanZhi) || getTianheDiHai(LiuNianGanZhi, YearGanZhi) || getTianheDiHai(LiuNianGanZhi, MonthGanZhi) || getTianheDiHai(LiuNianGanZhi, DayGanZhi) || getTianheDiHai(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianheDiHai(LiuNianGanZhi, DaYunGanZhi) ? '流年天合地害大运 ' + ((isLuShen(DayGan, DaYunZhi) ? '害大运禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '害流年禄' : '')) : '') +
					(getTianheDiHai(LiuNianGanZhi, YearGanZhi) ? '流年天合地害年柱 ' + ((isLuShen(DayGan, YearZhi) ? '害元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '害流年禄' : '')) : '') +
					(getTianheDiHai(LiuNianGanZhi, MonthGanZhi) ? '流年天合地害月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '害元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '害流年禄' : '')) : '') +
					(getTianheDiHai(LiuNianGanZhi, DayGanZhi) ? '流年天合地害日柱 ' + ((isLuShen(DayGan, DayZhi) ? '害元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '害流年禄' : '')) : '') +
					(getTianheDiHai(LiuNianGanZhi, TimeGanZhi) ? '流年天合地害时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '害元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '害流年禄' : '')) : '')
				//插入到变量中
				let tmpData = [LiuNianGanZhi, '天合地害', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天合地害', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}

			// 4 流年 天干合地支冲
			if (getTianheDiChong(LiuNianGanZhi, DaYunGanZhi) || getTianheDiChong(LiuNianGanZhi, YearGanZhi) || getTianheDiChong(LiuNianGanZhi, MonthGanZhi) || getTianheDiChong(LiuNianGanZhi, DayGanZhi) || getTianheDiChong(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianheDiChong(LiuNianGanZhi, DaYunGanZhi) ? '流年天合地冲大运 ' + ((isLuShen(DayGan, DaYunZhi) ? '冲大运禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '') +
					(getTianheDiChong(LiuNianGanZhi, YearGanZhi) ? '流年天合地冲年柱 ' + ((isLuShen(DayGan, YearZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '') +
					(getTianheDiChong(LiuNianGanZhi, MonthGanZhi) ? '流年天合地冲月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '') +
					(getTianheDiChong(LiuNianGanZhi, DayGanZhi) ? '流年天合地冲日柱 ' + ((isLuShen(DayGan, DayZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '') +
					(getTianheDiChong(LiuNianGanZhi, TimeGanZhi) ? '流年天合地冲时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '')
				//插入到变量中
				let tmpData = [LiuNianGanZhi, '天合地冲', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天合地冲', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}



			// 5 流年 天干合地支绝
			if (getTianheDiJue(LiuNianGanZhi, DaYunGanZhi) || getTianheDiJue(LiuNianGanZhi, YearGanZhi) || getTianheDiJue(LiuNianGanZhi, MonthGanZhi) || getTianheDiJue(LiuNianGanZhi, DayGanZhi) || getTianheDiJue(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianheDiJue(LiuNianGanZhi, DaYunGanZhi) ? '流年天合地绝大运 ' + ((isLuShen(DayGan, DaYunZhi) ? '绝大运禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '绝流年禄' : '')) : '') +
					(getTianheDiJue(LiuNianGanZhi, YearGanZhi) ? '流年天合地绝年柱 ' + ((isLuShen(DayGan, YearZhi) ? '绝元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '绝流年禄' : '')) : '') +
					(getTianheDiJue(LiuNianGanZhi, MonthGanZhi) ? '流年天合地绝月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '绝元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '绝流年禄' : '')) : '') +
					(getTianheDiJue(LiuNianGanZhi, DayGanZhi) ? '流年天合地绝日柱 ' + ((isLuShen(DayGan, DayZhi) ? '绝元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '绝流年禄' : '')) : '') +
					(getTianheDiJue(LiuNianGanZhi, TimeGanZhi) ? '流年天合地绝时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '绝元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '绝流年禄' : '')) : '')
				//插入到变量中
				let tmpData = [LiuNianGanZhi, '天合地绝', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天合地绝', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}




			//6 流年 天干克地支冲(反吟)
			if (getTianKeDiChong(LiuNianGanZhi, DaYunGanZhi) || getTianKeDiChong(LiuNianGanZhi, YearGanZhi) || getTianKeDiChong(LiuNianGanZhi, MonthGanZhi) || getTianKeDiChong(LiuNianGanZhi, DayGanZhi) || getTianKeDiChong(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianKeDiChong(LiuNianGanZhi, DaYunGanZhi) ? ('流年天克地冲大运' + ((isLuShen(DayGan, DaYunZhi) ? '冲大运禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : ''))) : '') +
					(getTianKeDiChong(LiuNianGanZhi, YearGanZhi) ? ('流年天克地冲年柱 ' + ((isLuShen(DayGan, YearZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : ''))) : '') +
					(getTianKeDiChong(LiuNianGanZhi, MonthGanZhi) ? '流年天克地冲月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '') +
					(getTianKeDiChong(LiuNianGanZhi, DayGanZhi) ? '流年天克地冲日柱 ' + ((isLuShen(DayGan, DayZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '') +
					(getTianKeDiChong(LiuNianGanZhi, TimeGanZhi) ? '流年天克地冲时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '冲元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '冲流年禄' : '')) : '')

				let tmpData = [LiuNianGanZhi, '天克地冲(反吟)', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天克地冲', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}

			//7 流年 天干合地支合
			if (getTianTongDiTong(LiuNianGanZhi, DaYunGanZhi) || getTianTongDiTong(LiuNianGanZhi, YearGanZhi) || getTianTongDiTong(LiuNianGanZhi, MonthGanZhi) || getTianTongDiTong(LiuNianGanZhi, DayGanZhi) || getTianTongDiTong(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianTongDiTong(LiuNianGanZhi, DaYunGanZhi) ? '流年伏吟大运 ' + ((isLuShen(DayGan, DaYunZhi) ? '伏吟大运禄神' : '')) : '') +
					(getTianTongDiTong(LiuNianGanZhi, YearGanZhi) ? '流年伏吟年柱 ' + ((isLuShen(DayGan, YearZhi) ? '伏吟元局禄神' : '')) : '') +
					(getTianTongDiTong(LiuNianGanZhi, MonthGanZhi) ? '流年伏吟月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '伏吟元局禄神' : '')) : '') +
					(getTianTongDiTong(LiuNianGanZhi, DayGanZhi) ? '流年伏吟日柱 ' + ((isLuShen(DayGan, DayZhi) ? '伏吟元局禄神' : '')) : '') +
					(getTianTongDiTong(LiuNianGanZhi, TimeGanZhi) ? '流年伏吟时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '伏吟元局禄神' : '')) : '')
				//插入到变量中
				let tmpData = [LiuNianGanZhi, '天同地同(伏吟)', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天同地同(伏吟)', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}




			//8 流年 天干合地支合
			if (getTianheDihe(LiuNianGanZhi, DaYunGanZhi) || getTianheDihe(LiuNianGanZhi, YearGanZhi) || getTianheDihe(LiuNianGanZhi, MonthGanZhi) || getTianheDihe(LiuNianGanZhi, DayGanZhi) || getTianheDihe(LiuNianGanZhi, TimeGanZhi)) {
				// 格式  【流年干支， 年份 ，年龄】
				let tags = (getTianheDihe(LiuNianGanZhi, DaYunGanZhi) ? '流年天合地合大运 ' + ((isLuShen(DayGan, DaYunZhi) ? '合大运禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '合流年禄' : '')) : '') +
					(getTianheDihe(LiuNianGanZhi, YearGanZhi) ? '流年天合地合年柱 ' + ((isLuShen(DayGan, YearZhi) ? '合元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '合流年禄' : '')) : '') +
					(getTianheDihe(LiuNianGanZhi, MonthGanZhi) ? '流年天合地合月柱 ' + ((isLuShen(DayGan, MonthZhi) ? '合元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '合流年禄' : '')) : '') +
					(getTianheDihe(LiuNianGanZhi, DayGanZhi) ? '流年天合地合日柱 ' + ((isLuShen(DayGan, DayZhi) ? '合元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '合流年禄' : '')) : '') +
					(getTianheDihe(LiuNianGanZhi, TimeGanZhi) ? '流年天合地合时柱 ' + ((isLuShen(DayGan, TimeZhi) ? '合元局禄神' : '') + (isLuShen(DayGan, LiuNianZhi) ? '合流年禄' : '')) : '')
				//插入到变量中
				let tmpData = [LiuNianGanZhi, '天合地合', LiuNianYearNum, LiuNianAgeNum, tags]
				tianganhediPoYearList.push(tmpData)

				// 加入到LiuNianKeyDataTmp.tags数组中
				let TagsTmpData = ['天合地合', tags]
				LiuNianKeyDataTmp.tags.push(TagsTmpData)
			}


			// 得到流月数据

			for (let y = 0; y < liuYue.length; y++) {

				//得到月的基本变量 
				let LiuYueGanZhi = liuYue[y].getGanZhi()
				let LiuYueMonthChn = liuYue[y].getMonthInChinese()
				let LiuYueMonthNum = liuYue[y].getIndex() + 1
				let liuYueSolarDate = getSolarMonthDate(LiuNianYearNum, LiuYueMonthNum)
				let LiuYueGan = LiuYueGanZhi.charAt(0)
				let LiuYueZhi = LiuYueGanZhi.charAt(1)

				if (getGanZhiHe(LiuYueGan + DaYunGan) && getGanZhiHe(LiuYueZhi + DaYunZhi)) {
					BadMonthList.push(liuYueSolarDate['start'] + ' 到 ' + liuYueSolarDate['end'] + `，月运双合 `)
				}

				if (getTianKeDiChong(LiuYueGan + LiuYueZhi, DaYunGanZhi)) {

					BadMonthList.push(liuYueSolarDate['start'] + ' 到 ' + liuYueSolarDate['end'] + `，月运双冲  `)
				}

				if (LiuYueGanZhi === DaYunGanZhi) {
					BadMonthList.push(liuYueSolarDate['start'] + ' 到 ' + liuYueSolarDate['end'] + `，月运伏吟  `)
				}

			}

			LiuNianKeyData.push(LiuNianKeyDataTmp)

		}

	}
	// BadMonthList  五年当中倒霉月份的日期 

	shiShenChgYear.push(shiShenNumChgObj)

	return { BadMonthList, hurtYearList, motherHurtYearList, fatherHurtYearList, marrayDaYunList, shiShangHurtYearList, GuanHurtYearList, shiShenChgYear, marrayYearList, marraySexYearList, shangguanjianguanYearList, biJieLiuNianYear, luShenHurtList, YiMaHurtluShenYearList, JieCaiLiuNianYear, CaiLiuNianYear, HuiZaiYearList, DayBiJianHurtList, selfCaiKuFaCaiYearList, dieYearDateList, dieDaYunDateList, tianganhediPoDaYunList, tianganhediPoYearList, LiuNianKeyData, noGoodYearList }

}
