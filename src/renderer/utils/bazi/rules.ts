import { liuHePairs, chongPairs } from './constants';

export const hasLiuHe = (a: string, b: string): boolean =>
    liuHePairs.some(([lhA, lhB]) => (a === lhA && b === lhB) || (a === lhB && b === lhA));

export const hasChong = (a: string, b: string): boolean =>
    chongPairs.some(([chA, chB]) => (a === chA && b === chB) || (a === chB && b === chA));

// 其他规则函数...
