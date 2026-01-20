/**
 * خدمة NewsAPI
 * لجلب الأخبار الصيدلانية والطبية من مصادر عالمية
 */

const axios = require('axios');
const cache = require('./cacheService');

const NEWS_API_URL = 'https://newsapi.org/v2';
const API_KEY = process.env.NEWS_API_KEY;
const CACHE_TTL = parseInt(process.env.CACHE_TTL_NEWS) || 1800;

// الكلمات المفتاحية للأخبار الصيدلانية
const PHARMA_KEYWORDS = [
    'pharmaceutical',
    'FDA approval',
    'clinical trial',
    'drug discovery',
    'biotech',
    'medicine research',
    'vaccine',
    'drug recall',
    'pharmacy'
];

/**
 * جلب أحدث الأخبار الصيدلانية
 * @param {Object} options - خيارات البحث
 * @returns {Promise<Object>}
 */
const getPharmaceuticalNews = async (options = {}) => {
    const {
        page = 1,
        pageSize = 20,
        language = 'en',
        sortBy = 'publishedAt'
    } = options;

    const cacheKey = `news_pharma_${page}_${pageSize}_${language}_${sortBy}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Pharma news from cache');
        return cached;
    }

    try {
        // إذا لم يكن هناك مفتاح API، نستخدم بيانات تجريبية
        if (!API_KEY || API_KEY === 'your_newsapi_key_here') {
            console.log('⚠️ NewsAPI key not configured, using mock data');
            return getMockNews();
        }

        const query = PHARMA_KEYWORDS.join(' OR ');
        
        const response = await axios.get(`${NEWS_API_URL}/everything`, {
            params: {
                q: query,
                language,
                sortBy,
                page,
                pageSize,
                apiKey: API_KEY
            },
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.articles?.map(formatArticle) || [],
            totalResults: response.data.totalResults || 0,
            page,
            pageSize
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('NewsAPI Error:', error.response?.data?.message || error.message);
        
        // في حالة الخطأ، نعيد بيانات تجريبية
        if (error.response?.status === 401 || error.response?.status === 426) {
            return getMockNews();
        }
        
        throw new Error('فشل في جلب الأخبار');
    }
};

/**
 * البحث عن أخبار بكلمات مفتاحية محددة
 * @param {string} query - كلمات البحث
 * @param {Object} options - خيارات البحث
 * @returns {Promise<Object>}
 */
const searchNews = async (query, options = {}) => {
    const {
        page = 1,
        pageSize = 20,
        language = 'en',
        sortBy = 'relevancy'
    } = options;

    const cacheKey = `news_search_${query}_${page}_${pageSize}_${language}_${sortBy}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 News search from cache:', query);
        return cached;
    }

    try {
        if (!API_KEY || API_KEY === 'your_newsapi_key_here') {
            console.log('⚠️ NewsAPI key not configured, using mock data');
            return getMockNews(query);
        }

        // إضافة كلمات صيدلانية للبحث
        const enhancedQuery = `${query} AND (pharmaceutical OR medicine OR drug OR FDA)`;

        const response = await axios.get(`${NEWS_API_URL}/everything`, {
            params: {
                q: enhancedQuery,
                language,
                sortBy,
                page,
                pageSize,
                apiKey: API_KEY
            },
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.articles?.map(formatArticle) || [],
            totalResults: response.data.totalResults || 0,
            page,
            pageSize,
            query
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('NewsAPI Search Error:', error.response?.data?.message || error.message);
        
        if (error.response?.status === 401 || error.response?.status === 426) {
            return getMockNews(query);
        }
        
        throw new Error('فشل في البحث عن الأخبار');
    }
};

/**
 * جلب العناوين الرئيسية للصحة
 * @param {Object} options - خيارات البحث
 * @returns {Promise<Object>}
 */
const getHealthHeadlines = async (options = {}) => {
    const {
        page = 1,
        pageSize = 20,
        country = 'us'
    } = options;

    const cacheKey = `news_headlines_${country}_${page}_${pageSize}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Health headlines from cache');
        return cached;
    }

    try {
        if (!API_KEY || API_KEY === 'your_newsapi_key_here') {
            return getMockNews();
        }

        const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
            params: {
                category: 'health',
                country,
                page,
                pageSize,
                apiKey: API_KEY
            },
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.articles?.map(formatArticle) || [],
            totalResults: response.data.totalResults || 0,
            page,
            pageSize
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('NewsAPI Headlines Error:', error.response?.data?.message || error.message);
        
        if (error.response?.status === 401 || error.response?.status === 426) {
            return getMockNews();
        }
        
        throw new Error('فشل في جلب العناوين');
    }
};

/**
 * تنسيق مقالة الخبر
 * @param {Object} article - المقالة الخام
 * @returns {Object}
 */
const formatArticle = (article) => ({
    id: generateId(article),
    title: article.title || 'بدون عنوان',
    description: article.description || 'لا يوجد وصف متاح',
    content: article.content || '',
    author: article.author || 'غير معروف',
    source: {
        id: article.source?.id,
        name: article.source?.name || 'مصدر غير معروف'
    },
    url: article.url,
    imageUrl: article.urlToImage,
    publishedAt: article.publishedAt,
    formattedDate: formatDate(article.publishedAt)
});

/**
 * توليد معرف فريد للمقالة
 * @param {Object} article - المقالة
 * @returns {string}
 */
const generateId = (article) => {
    const str = `${article.title}-${article.publishedAt}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
};

/**
 * تنسيق التاريخ
 * @param {string} dateStr - سلسلة التاريخ
 * @returns {string}
 */
const formatDate = (dateStr) => {
    if (!dateStr) return 'غير معروف';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
        return `منذ ${diffMinutes} دقيقة`;
    } else if (diffHours < 24) {
        return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
        return `منذ ${diffDays} يوم`;
    } else {
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

/**
 * بيانات تجريبية عند عدم توفر API
 * @param {string} searchQuery - كلمة البحث (اختياري)
 * @returns {Object}
 */
const getMockNews = (searchQuery = '') => {
    const mockArticles = [
        {
            id: 'mock1',
            title: 'FDA Approves New Cancer Treatment Drug',
            description: 'The FDA has approved a groundbreaking new cancer treatment that shows promising results in clinical trials.',
            content: 'The U.S. Food and Drug Administration announced today the approval of a new targeted therapy for advanced cancer patients...',
            author: 'Medical News Team',
            source: { id: 'medical-news', name: 'Medical News Today' },
            url: 'https://example.com/fda-cancer-drug',
            imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            formattedDate: 'منذ ساعتين'
        },
        {
            id: 'mock2',
            title: 'New Clinical Trial Shows Promise for Alzheimer\'s Treatment',
            description: 'Researchers announce positive results from Phase 3 clinical trials of a new Alzheimer\'s drug.',
            content: 'A major pharmaceutical company has released data showing significant cognitive improvements in patients...',
            author: 'Health Reporter',
            source: { id: 'pharma-times', name: 'Pharma Times' },
            url: 'https://example.com/alzheimers-trial',
            imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
            publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            formattedDate: 'منذ 5 ساعات'
        },
        {
            id: 'mock3',
            title: 'Breakthrough in Antibiotic Resistance Research',
            description: 'Scientists develop new compound that can overcome antibiotic-resistant bacteria.',
            content: 'In a major breakthrough, researchers have discovered a novel compound that effectively targets...',
            author: 'Science Desk',
            source: { id: 'science-daily', name: 'Science Daily' },
            url: 'https://example.com/antibiotic-research',
            imageUrl: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400',
            publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            formattedDate: 'منذ 8 ساعات'
        },
        {
            id: 'mock4',
            title: 'Global Vaccine Distribution Update',
            description: 'WHO reports significant progress in global vaccine distribution efforts.',
            content: 'The World Health Organization has announced that global vaccine distribution has reached...',
            author: 'Global Health Team',
            source: { id: 'who-news', name: 'WHO News' },
            url: 'https://example.com/vaccine-update',
            imageUrl: 'https://images.unsplash.com/photo-1615631648086-325025c9e51e?w=400',
            publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            formattedDate: 'منذ 12 ساعة'
        },
        {
            id: 'mock5',
            title: 'Pharmaceutical Industry Embraces AI for Drug Discovery',
            description: 'Major pharmaceutical companies are investing heavily in AI-driven drug discovery platforms.',
            content: 'The pharmaceutical industry is undergoing a transformation as artificial intelligence...',
            author: 'Tech Health Writer',
            source: { id: 'tech-health', name: 'Tech Health News' },
            url: 'https://example.com/ai-drug-discovery',
            imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            formattedDate: 'منذ يوم'
        },
        {
            id: 'mock6',
            title: 'New Guidelines for Diabetes Medication Released',
            description: 'Medical associations update treatment guidelines for Type 2 diabetes management.',
            content: 'Healthcare organizations have released updated guidelines for the management of Type 2 diabetes...',
            author: 'Clinical Editor',
            source: { id: 'diabetes-care', name: 'Diabetes Care Journal' },
            url: 'https://example.com/diabetes-guidelines',
            imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400',
            publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            formattedDate: 'منذ يومين'
        }
    ];

    // فلترة النتائج إذا كان هناك بحث
    let filteredArticles = mockArticles;
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredArticles = mockArticles.filter(article =>
            article.title.toLowerCase().includes(query) ||
            article.description.toLowerCase().includes(query)
        );
    }

    return {
        success: true,
        data: filteredArticles,
        totalResults: filteredArticles.length,
        page: 1,
        pageSize: 20,
        isMock: true
    };
};

module.exports = {
    getPharmaceuticalNews,
    searchNews,
    getHealthHeadlines
};
