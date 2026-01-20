/**
 * PharmaPulse API Service
 * خدمة الاتصال بالواجهة الخلفية
 */

const API = {
    /**
     * إجراء طلب HTTP
     * @param {string} endpoint - نقطة النهاية
     * @param {Object} options - خيارات الطلب
     * @returns {Promise<Object>}
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const fetchOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, fetchOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error.message);
            throw error;
        }
    },
    
    // ==================== News API ====================
    
    /**
     * جلب الأخبار الصيدلانية
     * @param {Object} params - معاملات البحث
     * @returns {Promise<Object>}
     */
    async getNews(params = {}) {
        const { page = 1, pageSize = CONFIG.NEWS.PAGE_SIZE, language = 'en' } = params;
        const queryString = new URLSearchParams({ page, pageSize, language }).toString();
        return this.request(`/news?${queryString}`);
    },
    
    /**
     * البحث في الأخبار
     * @param {string} query - كلمات البحث
     * @param {Object} params - معاملات إضافية
     * @returns {Promise<Object>}
     */
    async searchNews(query, params = {}) {
        const { page = 1, pageSize = CONFIG.NEWS.PAGE_SIZE, sortBy = 'relevancy' } = params;
        const queryString = new URLSearchParams({ q: query, page, pageSize, sortBy }).toString();
        return this.request(`/news/search?${queryString}`);
    },
    
    /**
     * جلب العناوين الرئيسية
     * @param {Object} params - معاملات البحث
     * @returns {Promise<Object>}
     */
    async getHeadlines(params = {}) {
        const { page = 1, pageSize = CONFIG.NEWS.PAGE_SIZE, country = 'us' } = params;
        const queryString = new URLSearchParams({ page, pageSize, country }).toString();
        return this.request(`/news/headlines?${queryString}`);
    },
    
    // ==================== Drugs API ====================
    
    /**
     * البحث عن أدوية
     * @param {string} query - اسم الدواء
     * @param {number} limit - عدد النتائج
     * @returns {Promise<Object>}
     */
    async searchDrugs(query, limit = CONFIG.DRUGS.SEARCH_LIMIT) {
        const queryString = new URLSearchParams({ q: query, limit }).toString();
        return this.request(`/drugs/search?${queryString}`);
    },
    
    /**
     * الحصول على تفاصيل دواء
     * @param {string} drugName - اسم الدواء
     * @returns {Promise<Object>}
     */
    async getDrugDetails(drugName) {
        return this.request(`/drugs/details/${encodeURIComponent(drugName)}`);
    },
    
    /**
     * الحصول على الأعراض الجانبية
     * @param {string} drugName - اسم الدواء
     * @param {number} limit - عدد النتائج
     * @returns {Promise<Object>}
     */
    async getAdverseEvents(drugName, limit = 10) {
        const queryString = new URLSearchParams({ limit }).toString();
        return this.request(`/drugs/adverse-events/${encodeURIComponent(drugName)}?${queryString}`);
    },
    
    /**
     * الحصول على اقتراحات البحث
     * @param {string} term - جزء من اسم الدواء
     * @returns {Promise<Object>}
     */
    async getDrugSuggestions(term) {
        const queryString = new URLSearchParams({ q: term }).toString();
        return this.request(`/drugs/suggestions?${queryString}`);
    },
    
    /**
     * الحصول على معلومات RxNorm
     * @param {string} rxcui - معرف RxNorm
     * @returns {Promise<Object>}
     */
    async getRxNormInfo(rxcui) {
        return this.request(`/drugs/rxnorm/${rxcui}`);
    },
    
    // ==================== Recalls API ====================
    
    /**
     * الحصول على حالات سحب الأدوية
     * @param {string} query - كلمة البحث (اختياري)
     * @param {number} limit - عدد النتائج
     * @returns {Promise<Object>}
     */
    async getRecalls(query = '', limit = 20) {
        const queryString = new URLSearchParams({ q: query, limit }).toString();
        return this.request(`/drugs/recalls?${queryString}`);
    },
    
    // ==================== Health Check ====================
    
    /**
     * فحص حالة الخادم
     * @returns {Promise<Object>}
     */
    async healthCheck() {
        return this.request('/health');
    }
};

// تجميد الكائن لمنع التعديل
Object.freeze(API);
