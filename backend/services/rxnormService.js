/**
 * خدمة RxNorm API
 * لتحسين البحث عن الأدوية وربط الأسماء التجارية والعلمية
 */

const axios = require('axios');
const cache = require('./cacheService');

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
const CACHE_TTL = parseInt(process.env.CACHE_TTL_DRUGS) || 3600;

/**
 * البحث عن دواء بالاسم للحصول على معرفات RxNorm
 * @param {string} drugName - اسم الدواء
 * @returns {Promise<Object>}
 */
const searchDrug = async (drugName) => {
    const cacheKey = `rxnorm_search_${drugName}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 RxNorm search from cache:', drugName);
        return cached;
    }

    try {
        const response = await axios.get(`${RXNORM_BASE_URL}/drugs.json`, {
            params: { name: drugName },
            timeout: 10000
        });

        const conceptGroup = response.data.drugGroup?.conceptGroup || [];
        const drugs = [];

        conceptGroup.forEach(group => {
            if (group.conceptProperties) {
                group.conceptProperties.forEach(drug => {
                    drugs.push({
                        rxcui: drug.rxcui,
                        name: drug.name,
                        synonym: drug.synonym,
                        type: group.tty
                    });
                });
            }
        });

        const result = {
            success: true,
            data: drugs
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('RxNorm Search Error:', error.message);
        return { success: true, data: [] };
    }
};

/**
 * الحصول على جميع الأسماء المتعلقة بدواء معين
 * @param {string} rxcui - معرف RxNorm
 * @returns {Promise<Object>}
 */
const getRelatedNames = async (rxcui) => {
    const cacheKey = `rxnorm_related_${rxcui}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 RxNorm related names from cache:', rxcui);
        return cached;
    }

    try {
        const response = await axios.get(`${RXNORM_BASE_URL}/rxcui/${rxcui}/allrelated.json`, {
            timeout: 10000
        });

        const conceptGroups = response.data.allRelatedGroup?.conceptGroup || [];
        const relatedNames = {};

        conceptGroups.forEach(group => {
            if (group.conceptProperties) {
                relatedNames[group.tty] = group.conceptProperties.map(prop => ({
                    rxcui: prop.rxcui,
                    name: prop.name
                }));
            }
        });

        const result = {
            success: true,
            data: relatedNames
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('RxNorm Related Names Error:', error.message);
        return { success: true, data: {} };
    }
};

/**
 * الحصول على الأسماء التجارية لدواء معين
 * @param {string} rxcui - معرف RxNorm
 * @returns {Promise<Object>}
 */
const getBrandNames = async (rxcui) => {
    const cacheKey = `rxnorm_brands_${rxcui}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 RxNorm brand names from cache:', rxcui);
        return cached;
    }

    try {
        const response = await axios.get(`${RXNORM_BASE_URL}/rxcui/${rxcui}/related.json`, {
            params: { tty: 'BN' },
            timeout: 10000
        });

        const conceptGroup = response.data.relatedGroup?.conceptGroup || [];
        const brandNames = [];

        conceptGroup.forEach(group => {
            if (group.conceptProperties) {
                group.conceptProperties.forEach(prop => {
                    brandNames.push({
                        rxcui: prop.rxcui,
                        name: prop.name
                    });
                });
            }
        });

        const result = {
            success: true,
            data: brandNames
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('RxNorm Brand Names Error:', error.message);
        return { success: true, data: [] };
    }
};

/**
 * الحصول على معلومات الدواء بما في ذلك المكونات
 * @param {string} rxcui - معرف RxNorm
 * @returns {Promise<Object>}
 */
const getDrugInfo = async (rxcui) => {
    const cacheKey = `rxnorm_info_${rxcui}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 RxNorm drug info from cache:', rxcui);
        return cached;
    }

    try {
        // الحصول على الخصائص الأساسية
        const propertiesResponse = await axios.get(`${RXNORM_BASE_URL}/rxcui/${rxcui}/properties.json`, {
            timeout: 10000
        });

        const properties = propertiesResponse.data.properties || {};

        // الحصول على المكونات النشطة
        let ingredients = [];
        try {
            const ingredientsResponse = await axios.get(`${RXNORM_BASE_URL}/rxcui/${rxcui}/related.json`, {
                params: { tty: 'IN' },
                timeout: 10000
            });
            const conceptGroup = ingredientsResponse.data.relatedGroup?.conceptGroup || [];
            conceptGroup.forEach(group => {
                if (group.conceptProperties) {
                    ingredients = group.conceptProperties.map(prop => prop.name);
                }
            });
        } catch (e) {
            console.log('No ingredients found for:', rxcui);
        }

        const result = {
            success: true,
            data: {
                rxcui: properties.rxcui,
                name: properties.name,
                synonym: properties.synonym,
                type: properties.tty,
                ingredients: ingredients
            }
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('RxNorm Drug Info Error:', error.message);
        return { success: true, data: null };
    }
};

/**
 * اقتراحات الإكمال التلقائي للبحث
 * @param {string} term - جزء من اسم الدواء
 * @returns {Promise<Object>}
 */
const getSpellingSuggestions = async (term) => {
    const cacheKey = `rxnorm_suggest_${term}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 RxNorm suggestions from cache:', term);
        return cached;
    }

    try {
        const response = await axios.get(`${RXNORM_BASE_URL}/spellingsuggestions.json`, {
            params: { name: term },
            timeout: 5000
        });

        const suggestions = response.data.suggestionGroup?.suggestionList?.suggestion || [];

        const result = {
            success: true,
            data: suggestions
        };

        cache.set(cacheKey, result, 300); // 5 دقائق فقط للاقتراحات
        return result;
    } catch (error) {
        console.error('RxNorm Suggestions Error:', error.message);
        return { success: true, data: [] };
    }
};

/**
 * البحث المحسن باستخدام approximate matching
 * @param {string} term - اسم الدواء
 * @param {number} maxEntries - الحد الأقصى للنتائج
 * @returns {Promise<Object>}
 */
const approximateSearch = async (term, maxEntries = 10) => {
    const cacheKey = `rxnorm_approx_${term}_${maxEntries}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 RxNorm approximate search from cache:', term);
        return cached;
    }

    try {
        const response = await axios.get(`${RXNORM_BASE_URL}/approximateTerm.json`, {
            params: { term, maxEntries },
            timeout: 10000
        });

        const candidates = response.data.approximateGroup?.candidate || [];
        const drugs = candidates.map(c => ({
            rxcui: c.rxcui,
            name: c.name || 'غير معروف',
            score: c.score,
            rank: c.rank
        }));

        const result = {
            success: true,
            data: drugs
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        console.error('RxNorm Approximate Search Error:', error.message);
        return { success: true, data: [] };
    }
};

module.exports = {
    searchDrug,
    getRelatedNames,
    getBrandNames,
    getDrugInfo,
    getSpellingSuggestions,
    approximateSearch
};
