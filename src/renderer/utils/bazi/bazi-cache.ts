/**
 * 八字/阴历计算结果缓存
 * 用于避免在长列表中重复计算相同的出生日期
 */

export const baziCache = new Map<string, any>();

export const getCachedBaziData = (cacheKey: string, calcFn: () => any) => {
    if (baziCache.has(cacheKey)) {
        const value = baziCache.get(cacheKey);
        // 实现 LRU: 先删再设，将其移到 Map 的末尾（最新访问）
        baziCache.delete(cacheKey);
        baziCache.set(cacheKey, value);
        return value;
    }
    const result = calcFn();
    baziCache.set(cacheKey, result);
    return result;
};

// 限制缓存大小以防内存泄漏 (改进的批量清理 LRU 策略)
export const clearOldCache = () => {
    const MAX_SIZE = 500;
    const PURGE_SIZE = 50; // 达到阈值时一次性清理 50 个，避免频繁操作

    if (baziCache.size > MAX_SIZE) {
        let count = 0;
        for (const key of baziCache.keys()) {
            baziCache.delete(key);
            count++;
            if (count >= PURGE_SIZE) break;
        }
    }
};
