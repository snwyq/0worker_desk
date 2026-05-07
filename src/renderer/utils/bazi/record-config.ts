/**
 * 档案页面分组静态配置
 * 用于优化数据源加载性能，减少首屏对云函数的依赖
 */

// 历史案例背景来源 (静态化，避免聚合查询耗时)
export const HISTORY_GROUPS = [
    { _id: '千里命稿', name: '千里命稿' },
    { _id: '滴天髓', name: '滴天髓' },
    { _id: '子平真诠', name: '子平真诠' },
    { _id: '穷通宝鉴', name: '穷通宝鉴' },
    { _id: '三命通会', name: '三命通会' },
    { _id: '渊海子平', name: '渊海子平' },
    { _id: '国学探原', name: '国学探原' },
    { _id: '神峰通考', name: '神峰通考' },
    { _id: '巾箱秘术', name: '巾箱秘术' },
    { _id: '造化元钥', name: '造化元钥' },
    { _id: '现代案例', name: '现代案例' },
];

// 个人档案默认建议分组 (当用户没有自定义分组时的默认显示)
export const DEFAULT_RECORD_GROUPS = [
    { _id: 'family', name: '家人' },
    { _id: 'friend', name: '朋友' },
    { _id: 'client', name: '客户' },
    { _id: 'celeb', name: '名人' },
    { _id: 'study', name: '研究' },
];
