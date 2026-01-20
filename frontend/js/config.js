/**
 * PharmaPulse Configuration
 * إعدادات التطبيق الأساسية
 */

const CONFIG = {
    // API Base URL - يتغير في الإنتاج
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : '/api',
    
    // إعدادات الأخبار
    NEWS: {
        PAGE_SIZE: 12,
        REFRESH_INTERVAL: 5 * 60 * 1000, // 5 دقائق
        FILTERS: {
            all: '',
            fda: 'FDA',
            trials: 'clinical trial',
            biotech: 'biotech'
        }
    },
    
    // إعدادات البحث عن الأدوية
    DRUGS: {
        SEARCH_LIMIT: 20,
        SUGGESTION_DELAY: 300, // ملي ثانية
        MIN_SEARCH_LENGTH: 2
    },
    
    // إعدادات التخزين المحلي
    STORAGE: {
        NEWS_CACHE_KEY: 'pharmapulse_news_cache',
        DRUG_CACHE_KEY: 'pharmapulse_drug_cache',
        FAVORITES_KEY: 'pharmapulse_favorites',
        SETTINGS_KEY: 'pharmapulse_settings'
    },
    
    // إعدادات واجهة المستخدم
    UI: {
        TOAST_DURATION: 3000,
        ANIMATION_DURATION: 300
    },
    
    // رسائل الخطأ
    MESSAGES: {
        LOADING: 'جاري التحميل...',
        ERROR_GENERIC: 'حدث خطأ غير متوقع',
        ERROR_NETWORK: 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
        ERROR_NOT_FOUND: 'لم يتم العثور على نتائج',
        SUCCESS_SAVED: 'تم الحفظ بنجاح',
        NO_NEWS: 'لا توجد أخبار متاحة حالياً',
        NO_DRUGS: 'لم يتم العثور على أدوية مطابقة',
        NO_RECALLS: 'لا توجد حالات سحب حالياً'
    }
};

// تجميد الإعدادات لمنع التعديل
Object.freeze(CONFIG);
Object.freeze(CONFIG.NEWS);
Object.freeze(CONFIG.DRUGS);
Object.freeze(CONFIG.STORAGE);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.MESSAGES);
