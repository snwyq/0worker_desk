// @ts-nocheck
﻿/**
 * 流月五行增强计算模块
 * 从 zytransform.ts 提取的 getLiuYueChgInfo 函数
 * 计算流月五行变化和增强效果
 */
import { ELEMENT, TIANGAN, DIZHI } from '../zymap';
import { getWuXing, getWuXingRelation, TianGanToShiShen } from '../zytransform';

//得到流月五行的基本增强 是否 

export const getLiuYueChgInfo = (Data: any) => {

	//  0 代表 五行分数  1 分数来由的说明  3 喜用还是忌用  4 十神代表什么  

	// ganZhisLiuYue,ShiShenLiuYue,WuXingLiuYue
	const ganZhisLiuYue = Data.ganZhisLiuYue
	const ShiShenLiuYue = Data.ShiShenLiuYue
	const WuXingLiuYue = Data.WuXingLiuYue
	const GanRelaLiuYue = Data.GanRelaLiuYue
	const DiZhiRelaLiuYue = Data.DiZhiRelaLiuYue
	const XiWuXing = Data.XiWuXing
	const DayWuxing = Data.DayWuxing



	let wuxingData = {
		木: [0, '', XiWuXing.includes('木') ? '喜用' : '忌神', TianGanToShiShen(DayWuxing[0], '木')],
		火: [0, '', XiWuXing.includes('火') ? '喜用' : '忌神', TianGanToShiShen(DayWuxing[0], '火')],
		土: [0, '', XiWuXing.includes('土') ? '喜用' : '忌神', TianGanToShiShen(DayWuxing[0], '土')],
		金: [0, '', XiWuXing.includes('金') ? '喜用' : '忌神', TianGanToShiShen(DayWuxing[0], '金')],
		水: [0, '', XiWuXing.includes('水') ? '喜用' : '忌神', TianGanToShiShen(DayWuxing[0], '水')],
	}

	// 返回结果 形式  木: [ 500, '--没用到', '喜用',  '印枭'  ],


	// let wuxingData = {
	//   木: [0, '', XiWuXing.includes('木') ? '喜用' : '忌神', '未知'],
	//   火: [0, '', XiWuXing.includes('火') ? '喜用' : '忌神', '未知'],
	//   土: [0, '', XiWuXing.includes('土') ? '喜用' : '忌神', '未知'],
	//   金: [0, '', XiWuXing.includes('金') ? '喜用' : '忌神', '未知'],
	//   水: [0, '', XiWuXing.includes('水') ? '喜用' : '忌神', '未知'],
	// }



	// 第一步：看天干出生的五行,直接加能量 

	//本月天干能量出现即为增强
	wuxingData[WuXingLiuYue[0]][0] += 100
	wuxingData[WuXingLiuYue[1]][0] += 100

	wuxingData[WuXingLiuYue[0]][1] += ' 月干出现 +100 \n'
	wuxingData[WuXingLiuYue[1]][1] += ' 月支出现 +100 \n'

	//第二步根据生克关系看增量 

	let rela = getWuXingRelation(WuXingLiuYue[0], WuXingLiuYue[1]);

	if (rela === '同') {
		wuxingData[WuXingLiuYue[0]][0] += 0
		wuxingData[WuXingLiuYue[1]][0] += 0

		wuxingData[WuXingLiuYue[0]][1] += ' 月干支相同 +0 \n'
		wuxingData[WuXingLiuYue[1]][1] += ' 月干支相同 +0 \n'
	}
	else if (rela === '克') {
		// 损耗自身30,伤敌90
		wuxingData[WuXingLiuYue[0]][0] += -90
		wuxingData[WuXingLiuYue[1]][0] += -40

		wuxingData[WuXingLiuYue[0]][1] += ' 月干被克能量减少   -90 \n'
		wuxingData[WuXingLiuYue[1]][1] += ' 月支克干能量减少   -40 \n'

	}

	else if (rela === '反克') {

		wuxingData[WuXingLiuYue[0]][0] += -40
		wuxingData[WuXingLiuYue[1]][0] += -90

		wuxingData[WuXingLiuYue[0]][1] += ' 月干克月支自损 -40 \n'
		wuxingData[WuXingLiuYue[1]][1] += ' 月支被月干克  -90 \n'

	}
	else if (rela === '生') {

		wuxingData[WuXingLiuYue[0]][0] += 90
		wuxingData[WuXingLiuYue[1]][0] += -40

		wuxingData[WuXingLiuYue[0]][1] += ' 月干被生能量增加 90 \n'
		wuxingData[WuXingLiuYue[1]][1] += ' 月支生干能量减弱  -40 \n'

	}

	else if (rela === '反生') {

		wuxingData[WuXingLiuYue[0]][0] += -40
		wuxingData[WuXingLiuYue[1]][0] += 90

		wuxingData[WuXingLiuYue[0]][1] += ' 月干生支能量降低 -40 \n'
		wuxingData[WuXingLiuYue[1]][1] += ' 月支被生能量增加  90 \n'

	}

	//第三  步根据生克关系看合化成功没  --天干 

	const HeRelaGan = GanRelaLiuYue.filter((item: string | string[]) => item.includes('合'));

	if (HeRelaGan) {

		for (const item of HeRelaGan) {

			let Els = item.slice(0, 2).split('')

			let hehuaWuxing = item.slice(-1)


			//第一种情况 天干属于流月干合   

			//天干合的是流月的话[1成功 加10倍能量    2不成功 继续相克,成为绊,两者能量都减一半. ]
			if (Els.includes(ganZhisLiuYue[0])) {

				//另外一个合化元素 
				let otherEls = Els[0] === ganZhisLiuYue[0] ? Els[1] : Els[0]
				let otherElsWuxing = WuXingLiuYue[ganZhisLiuYue.indexOf(otherEls)]

				// 因为可能是争合,会有多个,得到另外一个天干元素下面的地支的五行属性, 看是否有根 
				// 使用filter方法找到所有等于target的元素，然后使用map方法得到它们的索引 
				let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === otherEls);
				let DiZhiIndexes = otherElsindexes.map((index: number) => index + 1);
				let DiZhiWuXingList = DiZhiIndexes.map((index: string | number) => WuXingLiuYue[index]);

				//合化成功  

				if (DiZhiWuXingList.includes(hehuaWuxing)) {
					wuxingData[hehuaWuxing][0] += 300
					wuxingData[hehuaWuxing][1] += ` 流月天干合,成功合化${item} +300 \n`
				}
				else {
					wuxingData[WuXingLiuYue[0]][0] += -50
					wuxingData[otherElsWuxing][0] += -50

					wuxingData[WuXingLiuYue[0]][1] += ` [${item}]合而不化,为绊,两者能量降低${item} -50 \n`
					wuxingData[otherElsWuxing][1] += ` [${item}]合而不化,为绊,两者能量降低${item} -50 \n`

				}
			}

			// 流月干没有参与但流月支引化 
			if (WuXingLiuYue[1] === hehuaWuxing) {
				wuxingData[hehuaWuxing][0] += 300
				wuxingData[hehuaWuxing][1] += `${item} 流月支引化天干合化成功 +300 \n`
			}

		}


	}
	//第四步  能量的突然加强  地支六合 半合 拱合  有透出10倍, 无透出5倍 
	// 注意 ，有三合的化，一定要把拱合 半合这些去掉，因为都是同一个。

	// const HeRelaZhi = DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('六合') || item.includes('拱合') || item.includes('半合'));
	const SanHeRelaZhi = DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('三合'));
	const HeRelaZhi = SanHeRelaZhi ? DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('六合')) : DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('六合') || item.includes('拱合') || item.includes('半合'));
	const SanHuiRelaZhi = DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('三会'));
	const SanXingRelaZhi = DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('三刑'));
	const ziXingRelaZhi = DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('自刑'));
	const chongRelaZhi = DiZhiRelaLiuYue.filter((item: string | string[]) => item.includes('丑未相冲') || item.includes('辰戌相冲'));

	//辰戌  丑未相冲

	if (chongRelaZhi) {

		for (const item of chongRelaZhi) {

			let Els = item.slice(0, 2).split('')
			let hehuaWuxing = WuXingLiuYue[1]

			//如果和流月支直接参与合化

			if (Els.includes(ganZhisLiuYue[1])) {
				//另外一个合化元素 
				let otherEls = Els[0] === ganZhisLiuYue[1] ? Els[1] : Els[0]
				let otherElsWuxing = WuXingLiuYue[ganZhisLiuYue.indexOf(otherEls)]

				let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === otherEls);
				let TianGanIndexes = otherElsindexes.map((index: number) => index - 1);
				let TianGanWuXingList = TianGanIndexes.map((index: string | number) => WuXingLiuYue[index]);

				if (TianGanWuXingList.includes(hehuaWuxing) || WuXingLiuYue[0] === hehuaWuxing) {
					wuxingData[hehuaWuxing][0] += 1000
					wuxingData[hehuaWuxing][1] += ` ${item},相冲透出加10倍 +1000 \n`
				}
				else {
					wuxingData[hehuaWuxing][0] += 500
					wuxingData[hehuaWuxing][1] += ` 流月${item},相冲未透出增加5倍 +500 \n`
				}

			}



		}


	}


	// 自刑

	if (ziXingRelaZhi) {

		for (const item of ziXingRelaZhi) {

			let Els = item.slice(0, 2).split('')
			let hehuaWuxing = WuXingLiuYue[1]

			//如果和流月支直接参与合化

			if (Els.includes(ganZhisLiuYue[1])) {
				//另外一个合化元素 
				let otherEls = Els[0] === ganZhisLiuYue[1] ? Els[1] : Els[0]
				let otherElsWuxing = WuXingLiuYue[ganZhisLiuYue.indexOf(otherEls)]

				let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === otherEls);
				let TianGanIndexes = otherElsindexes.map((index: number) => index - 1);
				let TianGanWuXingList = TianGanIndexes.map((index: string | number) => WuXingLiuYue[index]);

				if (TianGanWuXingList.includes(hehuaWuxing) || WuXingLiuYue[0] === hehuaWuxing) {
					wuxingData[hehuaWuxing][0] += 1000
					wuxingData[hehuaWuxing][1] += ` ${item},自刑透出加10倍 +1000 \n`
				}
				else {
					wuxingData[hehuaWuxing][0] += 500
					wuxingData[hehuaWuxing][1] += ` 流月${item},自刑未透出增加5倍 +500 \n`
				}

			}



		}


	}




	// 三刑 
	if (SanXingRelaZhi) {

		for (const item of SanXingRelaZhi) {

			let Els = item.slice(0, 3).split('')
			let hehuaWuxing = ''

			let hehuaSuccessFlag = false

			// 如果是地支流月地支才进行计算

			if (Els.includes(ganZhisLiuYue[1])) {

				if (item === '丑未戌恃势三刑') {
					hehuaWuxing = '土'
					for (let char of Els) {

						let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === char);
						let TianGanIndexes = otherElsindexes.map((index: number) => index - 1);
						let TianGanWuXingList = TianGanIndexes.map((index: string | number) => WuXingLiuYue[index]);

						if (TianGanWuXingList.includes(hehuaWuxing)) {

							hehuaSuccessFlag = true;
						}
						else {
							hehuaSuccessFlag = false
						}

					}
					// 加入土的能量
					// 合化成功与不成功增加值 
					if (hehuaSuccessFlag = true) {
						wuxingData[hehuaWuxing][0] += 1500
						wuxingData[hehuaWuxing][1] += ` 流月${item},成功15倍 +1500 \n`
					}
					else {
						wuxingData[hehuaWuxing][0] += 700
						wuxingData[hehuaWuxing][1] += ` 流月${item},无天干引化只增加7倍 +700 \n`
					}

				}

				if (item === '寅巳申无恩三刑') {

					let tianganWuXingList = []

					for (let char of Els) {

						let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === char);
						let TianGanIndexes = otherElsindexes.map((index: number) => index - 1);
						let TianGanWuXingList = TianGanIndexes.map((index: string | number) => WuXingLiuYue[index]);
						tianganWuXingList.push(...TianGanWuXingList)
					}

					let arrayA = ['金', '火', '木'];

					arrayA.forEach((element: any) => {
						if (tianganWuXingList.includes(element)) {
							wuxingData[element][0] += 1500
							wuxingData[element][1] += ` 流月${item},${element}透出加15倍 +1500   \n`; // 如果元素在数组B中，执行 update 操作
						} else {
							wuxingData[element][0] += 700
							wuxingData[element][1] += ` 流月${item},${element}未透出加7倍 +700   \n`; // 如果元素在数组B中，执行 update 操作

						}
					});


				}

			}


		}
	}

	// 三会
	if (SanHuiRelaZhi) {

		for (const item of SanHuiRelaZhi) {

			let Els = item.slice(0, 3).split('')
			let hehuaWuxing = item.slice(-1)
			let hehuaSuccessFlag = false

			// 如果是地支流月地支才进行计算

			if (Els.includes(ganZhisLiuYue[1])) {
				for (let char of Els) {

					let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === char);
					let TianGanIndexes = otherElsindexes.map((index: number) => index - 1);
					let TianGanWuXingList = TianGanIndexes.map((index: string | number) => WuXingLiuYue[index]);

					if (TianGanWuXingList.includes(hehuaWuxing) || WuXingLiuYue[0] === hehuaWuxing) {

						hehuaSuccessFlag = true;
					}
					else {
						hehuaSuccessFlag = false
					}

				}

				// 合化成功与不成功增加值 
				if (hehuaSuccessFlag = true) {
					wuxingData[hehuaWuxing][0] += 2000
					wuxingData[hehuaWuxing][1] += ` 流月${item},三会成功20倍 +2000 \n`
				}
				else {
					wuxingData[hehuaWuxing][0] += 1000
					wuxingData[hehuaWuxing][1] += ` 流月${item},三合不成功增加10倍 +1000 \n`
				}
			} else {
				if (WuXingLiuYue[0] === hehuaWuxing) {
					wuxingData[hehuaWuxing][0] += 2000
					wuxingData[hehuaWuxing][1] += `${item} 流月天干引化三会成功 +2000 \n`
				}
			}

		}


	}

	// 三合 
	if (SanHeRelaZhi) {

		for (const item of SanHeRelaZhi) {

			let Els = item.slice(0, 3).split('')
			let hehuaWuxing = item.slice(-1)
			let hehuaSuccessFlag = false

			// 如果是地支流月地支才进行计算

			if (Els.includes(ganZhisLiuYue[1])) {
				for (let char of Els) {

					let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === char);
					let TianGanIndexes = otherElsindexes.map((index: number) => index - 1);
					let TianGanWuXingList = TianGanIndexes.map((index: string | number) => WuXingLiuYue[index]);

					if (TianGanWuXingList.includes(hehuaWuxing) || WuXingLiuYue[0] === hehuaWuxing) {

						hehuaSuccessFlag = true;
					}
					else {
						hehuaSuccessFlag = false
					}

				}

				// 合化成功与不成功增加值 
				if (hehuaSuccessFlag = true) {
					wuxingData[hehuaWuxing][0] += 1500
					wuxingData[hehuaWuxing][1] += ` 流月${item}合,三合成功15倍 +1500 \n`
				}
				else {
					wuxingData[hehuaWuxing][0] += 700
					wuxingData[hehuaWuxing][1] += ` 流月${item}合,三合不成功增加7倍 +700 \n`
				}
			} else {
				if (WuXingLiuYue[0] === hehuaWuxing) {
					wuxingData[hehuaWuxing][0] += 1500
					wuxingData[hehuaWuxing][1] += `${item} 流月天干引化三合成功 +1500 \n`
				}
			}

		}


	}



	// 半合六合和拱合 
	if (HeRelaZhi) {

		for (const item of HeRelaZhi) {

			let Els = item.slice(0, 2).split('')
			let hehuaWuxing = item.slice(-1)

			//如果和流月支直接参与合化

			if (Els.includes(ganZhisLiuYue[1])) {
				//另外一个合化元素 
				let otherEls = Els[0] === ganZhisLiuYue[1] ? Els[1] : Els[0]
				let otherElsWuxing = WuXingLiuYue[ganZhisLiuYue.indexOf(otherEls)]

				let otherElsindexes = ganZhisLiuYue.map((item: any, index: any) => index).filter((index: string | number) => ganZhisLiuYue[index] === otherEls);
				let TianGanIndexes = otherElsindexes.map((index: number) => index - 1);
				let TianGanWuXingList = TianGanIndexes.map((index: string | number) => WuXingLiuYue[index]);

				if (TianGanWuXingList.includes(hehuaWuxing) || WuXingLiuYue[0] === hehuaWuxing) {
					wuxingData[hehuaWuxing][0] += 1000
					wuxingData[hehuaWuxing][1] += ` 流月${item},成功合化10倍 +1000 \n`
				}
				else {
					wuxingData[hehuaWuxing][0] += 500
					wuxingData[hehuaWuxing][1] += ` 流月${item},不成功增加5倍 +500 \n`
				}

			}
			else {
				// 流月干没有参与但流月支引化 
				if (WuXingLiuYue[0] === hehuaWuxing) {
					wuxingData[hehuaWuxing][0] += 1000
					wuxingData[hehuaWuxing][1] += `${item} 流月天引化天干合化成功 +300 \n`
				}

			}



		}


	}



	return wuxingData;



}
