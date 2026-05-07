// @ts-nocheck

export const getShenSha = (lunara:any, solara:any, gender:number, currentYun?: any) => {
  const solar = solara; //Solar.fromYmdHms(2012, 12, 21, 22, 15, 0);
  const lunar = lunara; //Lunar.fromYmdHms(2012, 12, 21, 22, 15, 0)  

  interface SheShaList {
    shenShaYear: string[];
    shenShaMonth: string[];
    shenShaDay: string[];
    shenShaTime: string[];
    shenShadaYun: string[];
    shenShaliuNian: string[];
    shenShaliuYue: string[];
    shenShaliuRi: string[];
    shenShaliuShi: string[];
}

const sheShaList: SheShaList = {
    shenShaYear: [],
    shenShaMonth: [],
    shenShaDay: [],
    shenShaTime: [],
    shenShadaYun: [],
    shenShaliuNian: [],
    shenShaliuYue: [],
    shenShaliuRi: [],
    shenShaliuShi: []
};

  // 年柱神煞
  const shenShaYear = [];
  // 月柱神煞
  const shenShaMonth = [];
  // 日柱神煞
  var shenShaDay = [];
  // 时柱神煞
  var shenShaTime = [];
  // 大运神煞
  var shenShadaYun = [];
  // 流年神煞
  var shenShaliuNian = [];
  // 流月神煞
  var shenShaliuYue = [];
  // 流日神煞
  var shenShaliuRi = [];
  // 流时神煞
  var shenShaliuShi = [];

  //四柱天干顺序同时出现
  var shenShaGanGan = {
    '天三奇': ['甲戊庚', '庚戊甲'],
    '地三奇': ['乙丙丁', '丁丙乙'],
    '人三奇': ['壬癸辛', '辛癸壬']
  };

  //四柱地支顺序同时出现
  var shenShaZhiZhi = {
    '三台': ['寅辰申', '卯巳午', '亥子酉']
  };


  // 年日天干查地支
  var shenShaYearDayGanZhi = {
    '天乙贵人': ['甲丑', '甲未', '乙子', '乙申', '丙亥', '丙酉', '丁亥', '丁酉', '戊丑', '戊未', '己子', '己申', '庚丑', '庚未', '辛午', '辛寅', '壬卯', '壬巳', '癸卯', '癸巳'],
    '太极贵人': ['甲子', '甲午', '乙子', '乙午', '丙卯', '丙酉', '丁卯', '丁酉', '戊辰', '戊戌', '戊丑', '戊未', '己辰', '己戌', '己丑', '己未', '庚亥', '庚寅', '辛亥', '辛寅', '壬申', '壬巳', '癸申', '癸巳'],
    '天印贵人': ['甲寅', '乙亥', '丙戌', '丁酉', '戊申', '己未', '庚午', '辛巳', '壬辰', '癸卯'],
    '天厨贵人': ['甲巳', '乙午', '丙巳', '丁午', '戊申', '己酉', '庚亥', '辛子', '壬寅', '癸卯'],
    '天官贵人': ['甲未', '乙辰', '丙巳', '丁酉', '丁寅', '戊戌', '戊丑', '己卯', '己戌', '庚丑', '庚亥', '辛申', '壬寅', '壬酉', '癸午'],
    '文昌贵人': ['甲巳', '乙午', '丙申', '丁酉', '戊申', '己酉', '庚亥', '辛子', '壬寅', '癸卯'],
    '国印贵人': ['甲戌', '甲亥', '甲酉', '乙亥', '乙子', '乙戌', '丙丑', '丙子', '丙寅', '丁寅', '丁丑', '丁卯', '戊丑', '戊子', '戊寅', '己寅', '己丑', '己卯', '庚辰', '庚卯', '庚巳', '辛巳', '辛辰', '辛午', '壬未', '壬午', '壬申', '癸申', '癸未', '癸酉'],
    '福星贵人': ['甲寅', '甲子', '乙卯', '乙丑', '丙寅', '丙子', '丁亥', '丁酉', '戊申', '己未', '庚午', '辛巳', '壬辰', '癸卯', '癸丑'],
    '金舆': ['甲辰', '乙巳', '丙未', '丁申', '戊未', '己申', '庚戌', '辛亥', '壬丑', '癸寅'],
    '穷煞': ['甲巳', '乙寅', '丙子', '丁戌', '戊申', '己午', '庚卯', '辛丑', '壬亥', '癸酉'],
    '破祖': ['甲午', '乙午', '丙申', '丁申', '戊戌', '己戌', '庚子', '辛子', '壬寅', '癸寅']
  };

  // 年日天干查干支
  var shenShaYearGanDayGanGanZhi = {
    '学堂': ['甲己亥', '乙壬午', '丙丙寅', '丁丁酉', '戊戊申', '己己酉', '庚辛巳', '辛甲子', '壬甲申', '癸乙卯'],
    '词馆': ['甲庚寅', '乙辛卯', '丙乙巳', '丁戊午', '戊丁巳', '己庚午', '庚壬申', '辛癸酉', '壬癸亥', '癸壬戌']
  };

  //年柱纳音查地支
  var shenShaYearNaYinDiZhi = {
    '学堂': ['海中金巳', '剑锋金巳', '白蜡金巳', '沙中金巳', '金箔金巳', '钗钏金巳', '大林木亥', '杨柳木亥', '松柏木亥', '平地木亥', '桑柘木亥', '石榴木亥', '涧下水申', '泉中水申', '长流水申', '天河水申', '大溪水申', '大海水申', '霹雳火寅', '山下火寅', '覆灯火寅', '炉中火寅', '山头火寅', '天上火寅', '壁上土申', '大驿土申', '沙中土申', '路旁土申', '城头土申', '屋上土申'],
    '词馆': ['海中金申', '剑锋金申', '白蜡金申', '沙中金申', '金箔金申', '钗钏金申', '大林木寅', '杨柳木寅', '松柏木寅', '平地木寅', '桑柘木寅', '石榴木寅', '涧下水亥', '泉中水亥', '长流水亥', '天河水亥', '大溪水亥', '大海水亥', '霹雳火巳', '山下火巳', '覆灯火巳', '炉中火巳', '山头火巳', '天上火巳', '壁上土亥', '大驿土亥', '沙中土亥', '路旁土亥', '城头土亥', '屋上土亥']
  };

  //年柱纳音查干支
  var shenShaYearNaYinGanZhi = {
    '正学堂': ['海中金辛巳', '剑锋金辛巳', '白蜡金辛巳', '沙中金辛巳', '金箔金辛巳', '钗钏金辛巳', '大林木己亥', '杨柳木己亥', '松柏木己亥', '平地木己亥', '桑柘木己亥', '石榴木己亥', '涧下水甲申', '泉中水甲申', '长流水甲申', '天河水甲申', '大溪水甲申', '大海水甲申', '霹雳火丙寅', '山下火丙寅', '覆灯火丙寅', '炉中火丙寅', '山头火丙寅', '天上火丙寅', '壁上土戊申', '大驿土戊申', '沙中土戊申', '路旁土戊申', '城头土戊申', '屋上土戊申'],
    '正词馆': ['海中金壬申', '剑锋金壬申', '白蜡金壬申', '沙中金壬申', '金箔金壬申', '钗钏金壬申', '大林木庚寅', '杨柳木庚寅', '松柏木庚寅', '平地木庚寅', '桑柘木庚寅', '石榴木庚寅', '涧下水癸亥', '泉中水癸亥', '长流水癸亥', '天河水癸亥', '大溪水癸亥', '大海水癸亥', '霹雳火乙巳', '山下火乙巳', '覆灯火乙巳', '炉中火乙巳', '山头火乙巳', '天上火乙巳', '壁上土丁亥', '大驿土丁亥', '沙中土丁亥', '路旁土丁亥', '城头土丁亥', '屋上土丁亥']
  };

  // 年日地支查地支
  var shenShaYearDayZhiZhi = {
    '六厄': ['子卯', '丑子', '寅酉', '卯午', '辰卯', '巳子', '午酉', '未午', '申卯', '酉子', '戌酉', '亥午'],
    '孤辰': ['子寅', '丑寅', '寅巳', '卯巳', '辰巳', '巳申', '午申', '未申', '申亥', '酉亥', '戌亥', '亥寅'],
    '寡宿': ['子戌', '丑戌', '寅丑', '卯丑', '辰丑', '巳辰', '午辰', '未辰', '申未', '酉未', '戌未', '亥戌'],
    '桃花': ['子酉', '丑午', '寅卯', '卯子', '辰酉', '巳午', '午卯', '未子', '申酉', '酉午', '戌卯', '亥子'],
    '亡神': ['子亥', '丑申', '寅巳', '卯寅', '辰亥', '巳申', '午巳', '未寅', '申亥', '酉申', '戌巳', '亥寅'],
    '劫煞': ['子巳', '丑寅', '寅亥', '卯申', '辰巳', '巳寅', '午亥', '未申', '申巳', '酉寅', '戌亥', '亥申'],
    '灾煞': ['子午', '丑卯', '寅子', '卯酉', '辰午', '巳卯', '午子', '未酉', '申午', '酉卯', '戌子', '亥酉'],
    '驿马': ['子寅', '丑亥', '寅申', '卯巳', '辰寅', '巳亥', '午申', '未巳', '申寅', '酉亥', '戌申', '亥巳'],
    '华盖': ['子辰', '丑丑', '寅戌', '卯未', '辰辰', '巳丑', '午戌', '未未', '申辰', '酉丑', '戌戌', '亥未'],
    '墓杀': ['子辰', '丑丑', '寅戌', '卯未', '辰辰', '巳丑', '午戌', '未未', '申辰', '酉丑', '戌戌', '亥未'],
    '将星': ['子子', '丑酉', '寅午', '卯卯', '辰子', '巳酉', '午午', '未卯', '申子', '酉酉', '戌午', '亥卯'],
    '天罗': ['戌亥', '亥戌'],
    '地网': ['辰巳', '巳辰'],
    '吟呻': ['子巳', '午巳', '卯巳', '酉巳'],
    '破碎': ['寅酉', '申酉', '巳酉', '亥酉'],
    '白衣': ['辰丑', '戌丑', '丑丑', '未丑']
  };

  //天罗地网(年柱纳音查地支)
  var shenShaYearNaYinYearDiZhi = {
    '天罗': ['霹雳火戌', '山下火戌', '覆灯火戌', '炉中火戌', '山头火戌', '天上火戌', '霹雳火亥', '山下火亥', '覆灯火亥', '炉中火亥', '山头火亥', '天上火亥'],
    '地网': ['涧下水辰', '泉中水辰', '长流水辰', '天河水辰', '大溪水辰', '大海水辰', '涧下水巳', '泉中水巳', '长流水巳', '天河水巳', '大溪水巳', '大海水巳', '壁上土辰', '大驿土辰', '沙中土辰', '路旁土辰', '城头土辰', '屋上土辰', '壁上土巳', '大驿土巳', '沙中土巳', '路旁土巳', '城头土巳', '屋上土巳']
  };
  //年日纳音查纳音
  var shenShaYearNaYinDayNaYin = {
    '四大空': ['海中金涧下水', '海中金泉中水', '海中金长流水', '海中金天河水', '海中金大溪水', '海中金大海水', '炉中火涧下水', '炉中火泉中水', '炉中火长流水', '炉中火天河水', '炉中火大溪水', '炉中火大海水', '大林木涧下水', '大林木泉中水', '大林木长流水', '大林木天河水', '大林木大溪水', '大林木大海水', '路旁土涧下水', '路旁土泉中水', '路旁土长流水', '路旁土天河水', '路旁土大溪水', '路旁土大海水', '剑锋金涧下水', '剑锋金泉中水', '剑锋金长流水', '剑锋金天河水', '剑锋金大溪水', '剑锋金大海水', '沙中金涧下水', '沙中金泉中水', '沙中金长流水', '沙中金天河水', '沙中金大溪水', '沙中金大海水', '山下火涧下水', '山下火泉中水', '山下火长流水', '山下火天河水', '山下火大溪水', '山下火大海水', '平地木涧下水', '平地木泉中水', '平地木长流水', '平地木天河水', '平地木大溪水', '平地木大海水', '壁上土涧下水', '壁上土泉中水', '壁上土长流水', '壁上土天河水', '壁上土大溪水', '壁上土大海水', '金箔金涧下水', '金箔金泉中水', '金箔金长流水', '金箔金天河水', '金箔金大溪水', '金箔金大海水', '泉中水海中金', '泉中水剑锋金', '泉中水白蜡金', '泉中水沙中金', '泉中水金箔金', '泉中水钗钏金', '屋上土海中金', '屋上土剑锋金', '屋上土白蜡金', '屋上土沙中金', '屋上土金箔金', '屋上土钗钏金', '霹雳火海中金', '霹雳火剑锋金', '霹雳火白蜡金', '霹雳火沙中金', '霹雳火金箔金', '霹雳火钗钏金', '松柏木海中金', '松柏木剑锋金', '松柏木白蜡金', '松柏木沙中金', '松柏木金箔金', '松柏木钗钏金', '长流水海中金', '长流水剑锋金', '长流水白蜡金', '长流水沙中金', '长流水金箔金', '长流水钗钏金', '大溪水海中金', '大溪水剑锋金', '大溪水白蜡金', '大溪水沙中金', '大溪水金箔金', '大溪水钗钏金', '沙中土海中金', '沙中土剑锋金', '沙中土白蜡金', '沙中土沙中金', '沙中土金箔金', '沙中土钗钏金', '天上火海中金', '天上火剑锋金', '天上火白蜡金', '天上火沙中金', '天上火金箔金', '天上火钗钏金', '石榴木海中金', '石榴木剑锋金', '石榴木白蜡金', '石榴木沙中金', '石榴木金箔金', '石榴木钗钏金', '大海水海中金', '大海水剑锋金', '大海水白蜡金', '大海水沙中金', '大海水金箔金', '大海水钗钏金']
  };

  // 年支查大运流年地支
  var shenShaYearZhidaYunliuNianZhi = {
    '丧门': ['子寅', '丑卯', '寅辰', '卯巳', '辰午', '巳未', '午申', '未酉', '申戌', '酉亥', '戌子', '亥丑'],
    '吊客': ['子戌', '丑亥', '寅子', '卯丑', '辰寅', '巳卯', '午辰', '未巳', '申午', '酉未', '戌申', '亥酉']
  };

  // 年日地支查大运流年地支
  var shenShaYearZhiDayZhidaYunliuNianZhi = {
    '披麻': ['子酉', '丑戌', '寅亥', '卯子', '辰丑', '巳寅', '午卯', '未辰', '申巳', '酉午', '戌未', '亥申']
  };

  //年支查地支
  var shenShaYearZhiDiZhi = {
    '红鸾': ['子卯', '丑寅', '寅丑', '卯子', '辰亥', '巳戌', '午酉', '未申', '申未', '酉午', '戌巳', '亥辰'],
    '天喜': ['子酉', '丑申', '寅未', '卯午', '辰巳', '巳辰', '午卯', '未寅', '申丑', '酉子', '戌亥', '亥戌'],
    '自缢煞': ['子酉', '丑午', '寅未', '卯申', '辰亥', '巳戌', '午丑', '未寅', '申卯', '酉子', '戌巳', '亥辰'],
    '埋儿杀': ['子丑', '丑卯', '寅申', '卯丑', '辰卯', '巳申', '午丑', '未卯', '申申', '酉丑', '戌卯', '亥申'],
    '兼刃': ['寅戌', '卯亥', '申辰', '酉巳'],
    '病符': ['子亥', '丑子', '寅丑', '卯寅', '辰卯', '巳辰', '午巳', '未午', '申未', '酉申', '戌酉', '亥戌'],
    '吞陷煞': ['子戌', '丑丑', '丑寅', '卯巳', '卯戌', '辰辰', '巳申', '午寅', '未寅', '申巳', '申戌', '酉戌', '戌寅', '戌酉', '亥寅'],
    '攀鞍': ['子丑', '丑戌', '寅未', '卯辰', '辰丑', '巳戌', '午未', '未辰', '申丑', '酉戌', '戌未', '亥辰'],
    '大耗': ['子巳', '丑午', '寅未', '卯申', '辰酉', '巳戌', '午亥', '未子', '申丑', '酉寅', '戌卯', '亥辰'],
    '小耗': ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥', '午子', '未丑', '申寅', '酉卯', '戌辰', '亥巳']
  };

  //年支查干支
  var shenShaYearZhiGanZhi = {
    '兼刃': ['子壬申', '丑癸酉', '辰壬子', '巳癸丑', '午丙寅', '未己卯', '未丁卯', '戌丙午', '亥己未', '亥丁未']
  };

  // 月支查天干或地支
  var shenShaMonthZhiGanZhi = {
    '天德贵人': ['寅丁', '卯申', '辰壬', '巳辛', '午亥', '未甲', '申癸', '酉寅', '戌丙', '亥乙', '子巳', '丑庚'],
    '天德合': ['寅壬', '卯巳', '辰丁', '巳丙', '午寅', '未己', '申戊', '酉亥', '戌辛', '亥庚', '子申', '丑乙'],
    '月德贵人': ['寅丙', '卯甲', '辰壬', '巳庚', '午丙', '未甲', '申壬', '酉庚', '戌丙', '亥甲', '子壬', '丑庚'],
    '月德合': ['寅辛', '卯巳', '辰丁', '巳乙', '午辛', '未己', '申丁', '酉乙', '戌辛', '亥己', '子丁', '丑乙'],
    '[德]秀贵人': ['寅丙', '寅丁', '卯甲', '卯乙', '辰壬', '辰癸', '辰戊', '辰己', '巳庚', '巳辛', '午丙', '午丁', '未甲', '未乙', '申壬', '申癸', '申戊', '申己', '酉庚', '酉辛', '戌丙', '戌丁', '亥甲', '亥乙', '子壬', '子癸', '子戊', '子己', '丑庚', '丑辛'],
    '德[秀]贵人': ['寅戊', '寅癸', '卯丁', '卯壬', '辰丙', '辰辛', '辰甲', '辰己', '巳乙', '巳庚', '午戊', '午癸', '未丁', '未壬', '申丙', '申辛', '申甲', '申己', '戌戊', '戌癸', '亥丁', '亥壬', '子丙', '子辛', '子甲', '子己', '丑乙', '丑庚'],
    '注受': ['寅子', '卯亥', '辰戌', '巳酉', '午戌', '未亥', '申子', '酉丑', '戌寅', '亥卯', '子寅', '丑丑'],
    '五鬼': ['寅午', '卯未', '辰申', '巳酉', '午戌', '未亥', '申子', '酉丑', '戌寅', '亥卯', '子辰', '丑巳'],
    '月破': ['寅申', '卯酉', '辰戌', '巳亥', '午子', '未丑', '申寅', '酉卯', '戌辰', '亥巳', '子午', '丑未'],
    '天医': ['寅丑', '卯寅', '辰卯', '巳辰', '午巳', '未午', '申未', '酉申', '戌酉', '亥戌', '子亥', '丑子'],
    '戟锋煞': ['寅甲', '卯乙', '辰戊', '巳丙', '午丁', '未己', '申庚', '酉辛', '戌戊', '亥壬', '子癸', '丑巳']
  };

  //月支查日干支
  var shenShaMonthZhiDayGanZhi = {
    '四废日': ['寅庚申', '卯庚申', '辰庚申', '寅辛酉', '卯辛酉', '辰辛酉', '巳壬子', '午壬子', '未壬子', '巳癸亥', '午癸亥', '未癸亥', '申甲寅', '酉甲寅', '戌甲寅', '申乙卯', '酉乙卯', '戌乙卯', '亥丙午', '子丙午', '丑丙午', '亥丁巳', '子丁巳', '丑丁巳'],
    '天赦日': ['寅戊寅', '卯戊寅', '辰戊寅', '巳甲午', '午甲午', '未甲午', '申戊申', '酉戊申', '戌戊申', '亥甲子', '子甲子', '丑甲子']
  };

  //查日时干支    
  var shenShaDayTimeGanZhi = {
    '孤鸾煞': ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '戊午', '丙午', '壬子'],
    '金神': ['乙丑', '己巳', '癸酉']
  };

  //只查日干支
  var shenShaDayDayGanZhi = {
    '阴差阳错': ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'],
    '十恶大败': ['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥'],
    '六秀日': ['丙午', '丁未', '戊子', '戊午', '己丑', '己未'],
    '日德': ['甲寅', '丙辰', '戊辰', '庚辰', '壬戌'],
    '日贵': ['丁酉', '丁亥', '癸卯', '癸巳'],
    '进神': ['甲子', '甲午', '乙卯', '乙酉'],
    '退神': ['丁丑', '丁未', '壬辰', '壬戌'],
    '魁罡': ['壬辰', '庚辰', '庚戌', '戊戌'],
    '阴阳煞': ['丙子', '戊午'],
    '八专': ['甲寅', '乙卯', '戊戌', '己未', '丁未', '庚申', '辛酉', '癸丑'],
    '九丑': ['戊子', '戊午', '壬子', '壬午', '乙卯', '己卯', '辛卯', '己酉', '辛卯']
  };

  //日干查地支    
  var shenShaDayGanDiZhi = {
    '羊刃': ['甲卯', '乙寅', '丙午', '丁巳', '戊午', '己巳', '庚酉', '辛申', '壬子', '癸亥'],
    '飞刃': ['甲酉', '乙申', '丙子', '丁亥', '戊子', '己亥', '庚卯', '辛寅', '壬午', '癸巳'],
    '红艳': ['甲午', '乙申', '丙寅', '丁未', '戊辰', '己辰', '庚戌', '辛酉', '壬子', '癸申'],
    '流霞': ['甲酉', '乙戌', '丙未', '丁申', '戊巳', '己午', '庚辰', '辛卯', '壬亥', '癸寅'],
    '沐浴': ['甲子', '乙巳', '丙卯', '丁申', '戊卯', '己申', '庚午', '辛亥', '壬酉', '癸寅'],
    '墓库': ['甲未', '乙戌', '丙戌', '丁丑', '戊戌', '己丑', '庚丑', '辛辰', '壬辰', '癸未'],
    '禄神': ['甲寅', '乙卯', '丙巳', '丁午', '戊巳', '己午', '庚申', '辛酉', '壬亥', '癸子'],
    '水溺煞': ['丙子', '癸未', '癸丑']
  };

  //日干查时支    
  var shenShaDayGanTimeZhi = {
    '截路': ['甲申', '甲酉', '乙申', '乙酉', '丙辰', '丙巳', '辛辰', '辛巳', '丁寅', '丁卯', '壬寅', '壬卯', '戊子', '戊丑', '癸子', '癸丑']
  };

  //日支查地支    
  var shenShaDayZhiDiZhi = {
    '日破': ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥', '午子', '未丑', '申寅', '酉卯', '戌辰', '亥巳']
  };

  //日支查时支    
  var shenShaDayZhiTimeZhi = {
    '隔角煞': ['子寅', '丑卯', '寅辰', '卯巳', '辰午', '巳未', '午申', '未酉', '申戌', '酉亥', '戌子', '亥丑']
  };

  //查日柱时柱
  var shenShaDayGanZhiTimeGanZhi = {
    '拱子禄': ['癸亥癸丑', '癸丑癸亥'],
    '拱午禄': ['丁巳丁未', '己未己巳'],
    '拱巳禄': ['戊辰戊午']
  };

  //童子(月支查日支时支)
  var shenShaMonthZhiDayZhiTimeZhi = {
    '童子': ['寅寅', '卯寅', '辰寅', '申寅', '酉寅', '戌寅', '寅子', '卯子', '辰子', '申子', '酉子', '戌子', '巳卯', '午卯', '未卯', '亥卯', '子卯', '丑卯', '巳未', '午未', '未未', '亥未', '子未', '丑未', '巳辰', '午辰', '未辰', '亥辰', '子辰', '丑辰']
  };
  //童子(年柱纳音查日支和时支)
  var shenShaYearNaYinDayZhiTimeZhi = {
    '童子': ['海中金午', '剑锋金午', '白蜡金午', '沙中金午', '金箔金午', '钗钏金午', '大林木午', '杨柳木午', '松柏木午', '平地木午', '桑柘木午', '石榴木午', '海中金卯', '剑锋金卯', '白蜡金卯', '沙中金卯', '金箔金卯', '钗钏金卯', '大林木卯', '杨柳木卯', '松柏木卯', '平地木卯', '桑柘木卯', '石榴木卯', '涧下水戌', '泉中水戌', '长流水戌', '天河水戌', '大溪水戌', '大海水戌', '涧下水酉', '泉中水酉', '长流水酉', '天河水酉', '大溪水酉', '大海水酉', '霹雳火戌', '山下火戌', '覆灯火戌', '炉中火戌', '山头火戌', '天上火戌', '霹雳火酉', '山下火酉', '覆灯火酉', '炉中火酉', '山头火酉', '天上火酉', '壁上土辰', '大驿土辰', '沙中土辰', '路旁土辰', '城头土辰', '屋上土辰', '壁上土巳', '大驿土巳', '沙中土巳', '路旁土巳', '城头土巳', '屋上土巳']
  };

  // 年支查地支，男女分别看（阳男阴女）
  var shenShaYearZhiZhiYangNanYinNv = {
    '勾煞': ['子卯', '丑辰', '寅巳', '卯午', '辰未', '巳申', '午酉', '未戌', '申亥', '酉子', '戌丑', '亥寅'],
    '绞煞': ['子酉', '丑戌', '寅亥', '卯子', '辰丑', '巳寅', '午卯', '未辰', '申巳', '酉午', '戌未', '亥申'],
    '元辰': ['子未', '丑申', '寅酉', '卯戌', '辰亥', '巳子', '午丑', '未寅', '申卯', '酉辰', '戌巳', '亥午']
  };

  // 年支查地支，男女分别看（阴男阳女）    
  var shenShaYearZhiZhiYinNanYangNv = {
    '勾煞': ['子酉', '丑戌', '寅亥', '卯子', '辰丑', '巳寅', '午卯', '未辰', '申巳', '酉午', '戌未', '亥申'],
    '绞煞': ['子卯', '丑辰', '寅巳', '卯午', '辰未', '巳申', '午酉', '未戌', '申亥', '酉子', '戌丑', '亥寅'],
    '元辰': ['子巳', '丑午', '寅未', '卯申', '辰酉', '巳戌', '午亥', '未子', '申丑', '酉寅', '戌卯', '亥辰']
  };

  // 阳
  var yang = (0 == lunar.getYearGanIndexExact() % 2);
  // 男
  var man = (1 == gender);
  //var man = (1 == 1);
  // 阳男阴女
  var yangManOrYinWoman = (yang && man) || (!yang && !man);
  // 根据阳男阴女或阴男阳女选择不同的关系
  var shenShaYearZhiZhiNN = yangManOrYinWoman ? shenShaYearZhiZhiYangNanYinNv : shenShaYearZhiZhiYinNanYangNv;

  // 年柱神煞开始
  // 每柱神煞开始才加这一行
  const bazi = lunar.getEightChar();
  // bazi.setSect(1)


  var shenShaTemp = {};

  for (var i in shenShaGanGan) {
    var gzs = shenShaGanGan[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getMonthGan() + bazi.getDayGan() || gz == bazi.getMonthGan() + bazi.getDayGan() + bazi.getTimeGan()) {
        shenShaTemp[i] = true;
      }
    }
  }


  for (var i in shenShaZhiZhi) {
    var gzs = shenShaZhiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getMonthZhi() + bazi.getDayZhi() || gz == bazi.getYearZhi() + bazi.getMonthZhi() + bazi.getTimeZhi() || gz == bazi.getYearZhi() + bazi.getDayZhi() + bazi.getTimeZhi() || gz == bazi.getMonthZhi() + bazi.getDayZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearDayGanZhi) {
    var gzs = shenShaYearDayGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getYearZhi() || gz == bazi.getDayGan() + bazi.getYearZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearDayZhiZhi) {
    var gzs = shenShaYearDayZhiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayZhi() + bazi.getYearZhi()) {
        // if (gz == bazi.getDayZhi() + bazi.getYearZhi() || gz == bazi.getYearZhi() + bazi.getYearZhi()) { modify by wyq 
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinYearDiZhi) {
    var gzs = shenShaYearNaYinYearDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getYearZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaMonthZhiGanZhi) {
    var gzs = shenShaMonthZhiGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getMonthZhi() + bazi.getYearGan() || gz == bazi.getMonthZhi() + bazi.getYearZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayGanDiZhi) {
    var gzs = shenShaDayGanDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayGan() + bazi.getYearZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearGanDayGanGanZhi) {
    var gzs = shenShaYearGanDayGanGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayGan() + bazi.getYear()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDiZhi) {
    var gzs = shenShaYearNaYinDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getYearZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinGanZhi) {
    var gzs = shenShaYearNaYinGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getYear()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDayNaYin) {
    var gzs = shenShaYearNaYinDayNaYin[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayNaYin() + bazi.getYearNaYin()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayZhiDiZhi) {
    var gzs = shenShaDayZhiDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayZhi() + bazi.getYearZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  // 神煞结束才调用这段
  for (var i in shenShaTemp) {
    shenShaYear.push(i);
  }

  // 年柱神煞结束


  // 月柱神煞开始
  shenShaTemp = {};
  for (var i in shenShaYearDayGanZhi) {
    var gzs = shenShaYearDayGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getMonthZhi() || gz == bazi.getDayGan() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearDayZhiZhi) {
    var gzs = shenShaYearDayZhiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getMonthZhi() || gz == bazi.getDayZhi() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinYearDiZhi) {
    var gzs = shenShaYearNaYinYearDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaMonthZhiGanZhi) {
    var gzs = shenShaMonthZhiGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getMonthZhi() + bazi.getMonthGan()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayGanDiZhi) {
    var gzs = shenShaDayGanDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayGan() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiDiZhi) {
    var gzs = shenShaYearZhiDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiGanZhi) {
    var gzs = shenShaYearZhiGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getMonth()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearGanDayGanGanZhi) {
    var gzs = shenShaYearGanDayGanGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getMonth() || gz == bazi.getDayGan() + bazi.getMonth()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDiZhi) {
    var gzs = shenShaYearNaYinDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinGanZhi) {
    var gzs = shenShaYearNaYinGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getMonth()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiZhiNN) {
    var gzs = shenShaYearZhiZhiNN[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDayNaYin) {
    var gzs = shenShaYearNaYinDayNaYin[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getMonthNaYin() || gz == bazi.getDayNaYin() + bazi.getMonthNaYin()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayZhiDiZhi) {
    var gzs = shenShaDayZhiDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayZhi() + bazi.getMonthZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaTemp) {
    shenShaMonth.push(i);
  }
  // 月柱神煞结束


  // 日柱神煞开始      
  shenShaTemp = {};
  for (var i in shenShaYearDayGanZhi) {
    var gzs = shenShaYearDayGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getDayZhi() || gz == bazi.getDayGan() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearDayZhiZhi) {
    var gzs = shenShaYearDayZhiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getDayZhi()) {
     //   if (gz == bazi.getYearZhi() + bazi.getDayZhi() || gz == bazi.getDayZhi() + bazi.getDayZhi()) {
         
        shenShaTemp[i] = true;
      
      }
    }
  }

  for (var i in shenShaYearNaYinYearDiZhi) {
    var gzs = shenShaYearNaYinYearDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaMonthZhiGanZhi) {
    var gzs = shenShaMonthZhiGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getMonthZhi() + bazi.getDayGan() || gz == bazi.getMonthZhi() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayTimeGanZhi) {
    var gzs = shenShaDayTimeGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDay()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayDayGanZhi) {
    var gzs = shenShaDayDayGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDay()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayGanDiZhi) {
    var gzs = shenShaDayGanDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDay()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiDiZhi) {
    var gzs = shenShaYearZhiDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiGanZhi) {
    var gzs = shenShaYearZhiGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getDay()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaMonthZhiDayZhiTimeZhi) {
    var gzs = shenShaMonthZhiDayZhiTimeZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getMonthZhi() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDayZhiTimeZhi) {
    var gzs = shenShaYearNaYinDayZhiTimeZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearGanDayGanGanZhi) {
    var gzs = shenShaYearGanDayGanGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getDay() || gz == bazi.getDayGan() + bazi.getDay()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaMonthZhiDayGanZhi) {
    var gzs = shenShaMonthZhiDayGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getMonthZhi() + bazi.getDay()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiZhiNN) {
    var gzs = shenShaYearZhiZhiNN[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDiZhi) {
    var gzs = shenShaYearNaYinDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getDayZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinGanZhi) {
    var gzs = shenShaYearNaYinGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getDay()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDayNaYin) {
    var gzs = shenShaYearNaYinDayNaYin[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getDayNaYin()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaTemp) {
    shenShaDay.push(i);
  }
  // 日柱神煞结束

  // 时柱神煞开始 
  shenShaTemp = {};
  for (var i in shenShaYearDayGanZhi) {
    var gzs = shenShaYearDayGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getTimeZhi() || gz == bazi.getDayGan() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearDayZhiZhi) {
    var gzs = shenShaYearDayZhiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getTimeZhi() || gz == bazi.getDayZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinYearDiZhi) {
    var gzs = shenShaYearNaYinYearDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaMonthZhiGanZhi) {
    var gzs = shenShaMonthZhiGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getMonthZhi() + bazi.getTimeGan() || gz == bazi.getMonthZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayTimeGanZhi) {
    var gzs = shenShaDayTimeGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getTime()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayGanDiZhi) {
    var gzs = shenShaDayGanDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayGan() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiDiZhi) {
    var gzs = shenShaYearZhiDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiGanZhi) {
    var gzs = shenShaYearZhiGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getTime()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearGanDayGanGanZhi) {
    var gzs = shenShaYearGanDayGanGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearGan() + bazi.getTime() || gz == bazi.getDayGan() + bazi.getTime()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearZhiZhiNN) {
    var gzs = shenShaYearZhiZhiNN[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDiZhi) {
    var gzs = shenShaYearNaYinDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinGanZhi) {
    var gzs = shenShaYearNaYinGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getTime()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayGanTimeZhi) {
    var gzs = shenShaDayGanTimeZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayGan() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayZhiTimeZhi) {
    var gzs = shenShaDayZhiTimeZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaDayGanZhiTimeGanZhi) {
    var gzs = shenShaDayGanZhiTimeGanZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDay() + bazi.getTime()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaMonthZhiDayZhiTimeZhi) {
    var gzs = shenShaMonthZhiDayZhiTimeZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getMonthZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDayZhiTimeZhi) {
    var gzs = shenShaYearNaYinDayZhiTimeZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaYearNaYinDayNaYin) {
    var gzs = shenShaYearNaYinDayNaYin[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getYearNaYin() + bazi.getTimeNaYin() || gz == bazi.getDayNaYin() + bazi.getTimeNaYin()) {
        shenShaTemp[i] = true;
      }
    }
  }


  for (var i in shenShaDayZhiDiZhi) {
    var gzs = shenShaDayZhiDiZhi[i];
    for (var j = 0, k = gzs.length; j < k; j++) {
      var gz = gzs[j];
      if (gz == bazi.getDayZhi() + bazi.getTimeZhi()) {
        shenShaTemp[i] = true;
      }
    }
  }

  for (var i in shenShaTemp) {
    shenShaTime.push(i);
  }
  // 时柱神煞结束

  // 大运神煞开始
  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayGanZhi) {
        var gzs = shenShaYearDayGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.daYunGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayZhiZhi) {
        var gzs = shenShaYearDayZhiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.daYunGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinYearDiZhi) {
        var gzs = shenShaYearNaYinYearDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaMonthZhiGanZhi) {
        var gzs = shenShaMonthZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getMonthZhi() + currentYun.daYunGanZhi.substr(0, 1) || gz == bazi.getMonthZhi() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayGanDiZhi) {
        var gzs = shenShaDayGanDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayGan() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDiZhi) {
        var gzs = shenShaYearZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiGanZhi) {
        var gzs = shenShaYearZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.daYunGanZhi.substr(0, 1) + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearGanDayGanGanZhi) {
        var gzs = shenShaYearGanDayGanGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.daYunGanZhi.substr(0, 1) + currentYun.daYunGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.daYunGanZhi.substr(0, 1) + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDayZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhiDayZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.daYunGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiZhiNN) {
        var gzs = shenShaYearZhiZhiNN[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDiZhi) {
        var gzs = shenShaYearNaYinDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinGanZhi) {
        var gzs = shenShaYearNaYinGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.daYunGanZhi.substr(0, 1) + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDayNaYin) {
        var gzs = shenShaYearNaYinDayNaYin[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.daYunNaYin || gz == bazi.getDayNaYin() + currentYun.daYunNaYin) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayZhiDiZhi) {
        var gzs = shenShaDayZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayZhi() + currentYun.daYunGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShadaYun.push(i);
      }
    }
  }

  // 大运神煞结束



  // 流年神煞开始
  if (currentYun) {

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayGanZhi) {
        var gzs = shenShaYearDayGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuNianGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayZhiZhi) {
        var gzs = shenShaYearDayZhiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuNianGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinYearDiZhi) {
        var gzs = shenShaYearNaYinYearDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaMonthZhiGanZhi) {
        var gzs = shenShaMonthZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getMonthZhi() + currentYun.liuNianGanZhi.substr(0, 1) || gz == bazi.getMonthZhi() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayGanDiZhi) {
        var gzs = shenShaDayGanDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayGan() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDiZhi) {
        var gzs = shenShaYearZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiGanZhi) {
        var gzs = shenShaYearZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuNianGanZhi.substr(0, 1) + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearGanDayGanGanZhi) {
        var gzs = shenShaYearGanDayGanGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuNianGanZhi.substr(0, 1) + currentYun.liuNianGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuNianGanZhi.substr(0, 1) + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDayZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhiDayZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuNianGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiZhiNN) {
        var gzs = shenShaYearZhiZhiNN[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDiZhi) {
        var gzs = shenShaYearNaYinDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinGanZhi) {
        var gzs = shenShaYearNaYinGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuNianGanZhi.substr(0, 1) + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDayNaYin) {
        var gzs = shenShaYearNaYinDayNaYin[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuNianNaYin || gz == bazi.getDayNaYin() + currentYun.liuNianNaYin) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    }

    if (currentYun.liuNianGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayZhiDiZhi) {
        var gzs = shenShaDayZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayZhi() + currentYun.liuNianGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuNian.push(i);
      }
    } 

    // 流年神煞结束

    // 流月神煞开始	  
    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayGanZhi) {
        var gzs = shenShaYearDayGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuYueGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayZhiZhi) {
        var gzs = shenShaYearDayZhiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuYueGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinYearDiZhi) {
        var gzs = shenShaYearNaYinYearDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaMonthZhiGanZhi) {
        var gzs = shenShaMonthZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getMonthZhi() + currentYun.liuYueGanZhi.substr(0, 1) || gz == bazi.getMonthZhi() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayGanDiZhi) {
        var gzs = shenShaDayGanDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayGan() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDiZhi) {
        var gzs = shenShaYearZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDayZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhiDayZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuYueGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiGanZhi) {
        var gzs = shenShaYearZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuYueGanZhi.substr(0, 1) + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearGanDayGanGanZhi) {
        var gzs = shenShaYearGanDayGanGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuYueGanZhi.substr(0, 1) + currentYun.liuYueGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuYueGanZhi.substr(0, 1) + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiZhiNN) {
        var gzs = shenShaYearZhiZhiNN[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDiZhi) {
        var gzs = shenShaYearNaYinDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinGanZhi) {
        var gzs = shenShaYearNaYinGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuYueGanZhi.substr(0, 1) + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDayNaYin) {
        var gzs = shenShaYearNaYinDayNaYin[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuYueNaYin || gz == bazi.getDayNaYin() + currentYun.liuYueNaYin) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    if (currentYun.liuYueGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayZhiDiZhi) {
        var gzs = shenShaDayZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayZhi() + currentYun.liuYueGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuYue.push(i);
      }
    }

    // 流月神煞结束

    // 流日神煞开始	  
    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayGanZhi) {
        var gzs = shenShaYearDayGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuRiGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinYearDiZhi) {
        var gzs = shenShaYearNaYinYearDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaMonthZhiGanZhi) {
        var gzs = shenShaMonthZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getMonthZhi() + currentYun.liuRiGanZhi.substr(0, 1) || gz == bazi.getMonthZhi() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayGanDiZhi) {
        var gzs = shenShaDayGanDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayGan() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDiZhi) {
        var gzs = shenShaYearZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDayZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhiDayZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuRiGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiGanZhi) {
        var gzs = shenShaYearZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuRiGanZhi.substr(0, 1) + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearGanDayGanGanZhi) {
        var gzs = shenShaYearGanDayGanGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuRiGanZhi.substr(0, 1) + currentYun.liuRiGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuRiGanZhi.substr(0, 1) + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiZhiNN) {
        var gzs = shenShaYearZhiZhiNN[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayZhiZhi) {
        var gzs = shenShaYearDayZhiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuRiGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDiZhi) {
        var gzs = shenShaYearNaYinDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinGanZhi) {
        var gzs = shenShaYearNaYinGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuRiGanZhi.substr(0, 1) + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDayNaYin) {
        var gzs = shenShaYearNaYinDayNaYin[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuRiNaYin || gz == bazi.getDayNaYin() + currentYun.liuRiNaYin) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    if (currentYun.liuRiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayZhiDiZhi) {
        var gzs = shenShaDayZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayZhi() + currentYun.liuRiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuRi.push(i);
      }
    }

    // 流日神煞结束

    // 流时神煞开始	  
    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayGanZhi) {
        var gzs = shenShaYearDayGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuShiGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinYearDiZhi) {
        var gzs = shenShaYearNaYinYearDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaMonthZhiGanZhi) {
        var gzs = shenShaMonthZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getMonthZhi() + currentYun.liuShiGanZhi.substr(0, 1) || gz == bazi.getMonthZhi() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayGanDiZhi) {
        var gzs = shenShaDayGanDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayGan() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDiZhi) {
        var gzs = shenShaYearZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiDayZhidaYunliuNianZhi) {
        var gzs = shenShaYearZhiDayZhidaYunliuNianZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuShiGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiGanZhi) {
        var gzs = shenShaYearZhiGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuShiGanZhi.substr(0, 1) + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearGanDayGanGanZhi) {
        var gzs = shenShaYearGanDayGanGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearGan() + currentYun.liuShiGanZhi.substr(0, 1) + currentYun.liuShiGanZhi.substr(1) || gz == bazi.getDayGan() + currentYun.liuShiGanZhi.substr(0, 1) + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearZhiZhiNN) {
        var gzs = shenShaYearZhiZhiNN[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearDayZhiZhi) {
        var gzs = shenShaYearDayZhiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearZhi() + currentYun.liuShiGanZhi.substr(1) || gz == bazi.getDayZhi() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDiZhi) {
        var gzs = shenShaYearNaYinDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinGanZhi) {
        var gzs = shenShaYearNaYinGanZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuShiGanZhi.substr(0, 1) + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaYearNaYinDayNaYin) {
        var gzs = shenShaYearNaYinDayNaYin[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getYearNaYin() + currentYun.liuShiNaYin || gz == bazi.getDayNaYin() + currentYun.liuShiNaYin) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }

    if (currentYun.liuShiGanZhi) {
      shenShaTemp = {};
      for (var i in shenShaDayZhiDiZhi) {
        var gzs = shenShaDayZhiDiZhi[i];
        for (var j = 0, k = gzs.length; j < k; j++) {
          var gz = gzs[j];
          if (gz == bazi.getDayZhi() + currentYun.liuShiGanZhi.substr(1)) {
            shenShaTemp[i] = true;
          }
        }
      }
      for (var i in shenShaTemp) {
        shenShaliuShi.push(i);
      }
    }
  }
  // 流时神煞结束

  //日柱空亡
  var rzkw = bazi.getDayXunKong();
  //年支
  var yearZhi = bazi.getYearZhi();
  //月支
  var monthZhi = bazi.getMonthZhi();
  //日支
  var dayZhi = bazi.getDayZhi();
  //时支
  var timeZhi = bazi.getTimeZhi();
  //大运支
  var daYunZhi;
  var liuNianZhi;
  var liuYueZhi;
  var liuRiZhi;
  var liuShiZhi;
  if (currentYun) {
    if (currentYun.daYunGanZhi) {
      daYunZhi = currentYun.daYunGanZhi.substr(1);
    }
    //流年支
    if (currentYun.liuNianGanZhi) {
      liuNianZhi = currentYun.liuNianGanZhi.substr(1);
    }
    //流月支
    if (currentYun.liuYueGanZhi) {
      liuYueZhi = currentYun.liuYueGanZhi.substr(1);
    }
    //流日支
    if (currentYun.liuRiGanZhi) {
      liuRiZhi = currentYun.liuRiGanZhi.substr(1);
    }
    //流时支
    if (currentYun.liuShiGanZhi) {
      liuShiZhi = currentYun.liuShiGanZhi.substr(1);
    }
  }

  if (rzkw.indexOf(yearZhi) != -1) {
    shenShaYear.push("空亡");
  }
  if (rzkw.indexOf(monthZhi) != -1) {
    shenShaMonth.push("空亡");
  }
  if (rzkw.indexOf(dayZhi) != -1) {
    shenShaDay.push("空亡");
  }
  if (rzkw.indexOf(timeZhi) != -1) {
    shenShaTime.push("空亡");
  }
  if (rzkw.indexOf(daYunZhi) != -1) {
    shenShadaYun.push("空亡");
  }
  if (rzkw.indexOf(liuNianZhi) != -1) {
    shenShaliuNian.push("空亡");
  }
  if (rzkw.indexOf(liuYueZhi) != -1) {
    shenShaliuYue.push("空亡");
  }
  if (rzkw.indexOf(liuRiZhi) != -1) {
    shenShaliuRi.push("空亡");
  }
  if (rzkw.indexOf(liuShiZhi) != -1) {
    shenShaliuShi.push("空亡");
  }


  sheShaList.shenShaYear = shenShaYear
  sheShaList.shenShaMonth = shenShaMonth
  sheShaList.shenShaDay = shenShaDay
  sheShaList.shenShaTime = shenShaTime
  sheShaList.shenShadaYun = shenShadaYun
  sheShaList.shenShaliuNian = shenShaliuNian
  sheShaList.shenShaliuYue = shenShaliuYue
  sheShaList.shenShaliuRi = shenShaliuRi
  sheShaList.shenShaliuShi = shenShaliuShi

  return sheShaList;
}

