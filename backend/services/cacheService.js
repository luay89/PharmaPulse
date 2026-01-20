/**
 * خدمة التخزين المؤقت (Caching)
 * تستخدم node-cache لتخزين البيانات مؤقتاً وتحسين الأداء
 */

const NodeCache = require('node-cache');

// إنشاء instance للتخزين المؤقت
const cache = new NodeCache({
    stdTTL: 1800, // 30 دقيقة افتراضياً
    checkperiod: 120, // فحص كل دقيقتين
    useClones: false
});

/**
 * الحصول على قيمة من الـ Cache
 * @param {string} key - مفتاح البيانات
 * @returns {any} البيانات المخزنة أو undefined
 */
const get = (key) => {
    return cache.get(key);
};

/**
 * تخزين قيمة في الـ Cache
 * @param {string} key - مفتاح البيانات
 * @param {any} value - القيمة المراد تخزينها
 * @param {number} ttl - مدة الصلاحية بالثواني (اختياري)
 * @returns {boolean} نجاح العملية
 */
const set = (key, value, ttl = null) => {
    if (ttl) {
        return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
};

/**
 * حذف قيمة من الـ Cache
 * @param {string} key - مفتاح البيانات
 * @returns {number} عدد المفاتيح المحذوفة
 */
const del = (key) => {
    return cache.del(key);
};

/**
 * مسح كل الـ Cache
 */
const flush = () => {
    cache.flushAll();
};

/**
 * الحصول على إحصائيات الـ Cache
 * @returns {object} إحصائيات الاستخدام
 */
const stats = () => {
    return cache.getStats();
};

/**
 * التحقق من وجود مفتاح
 * @param {string} key - مفتاح البيانات
 * @returns {boolean}
 */
const has = (key) => {
    return cache.has(key);
};

module.exports = {
    get,
    set,
    del,
    flush,
    stats,
    has
};
