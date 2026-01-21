/**
 * خدمة openFDA API
 * للحصول على معلومات الأدوية، الأعراض الجانبية، وحالات السحب
 */

const axios = require('axios');
const cache = require('./cacheService');

const OPENFDA_BASE_URL = 'https://api.fda.gov';
const CACHE_TTL = parseInt(process.env.CACHE_TTL_DRUGS) || 3600;

/**
 * البحث عن معلومات الدواء من ملصقات الأدوية
 * @param {string} query - اسم الدواء للبحث
 * @param {number} limit - عدد النتائج
 * @returns {Promise<Object>}
 */
const searchDrugLabels = async (query, limit = 10) => {
    const cacheKey = `drug_label_${query}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Drug labels from cache:', query);
        return cached;
    }

    try {
        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/label.json`, {
            params: {
                search: `openfda.brand_name:"${query}" OR openfda.generic_name:"${query}" OR openfda.substance_name:"${query}"`,
                limit: limit
            },
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.results || [],
            meta: response.data.meta || {}
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: [], meta: {} };
        }
        console.error('OpenFDA Drug Labels Error:', error.message);
        throw new Error('فشل في جلب معلومات الدواء');
    }
};

/**
 * الحصول على تفاصيل دواء محدد
 * @param {string} drugName - اسم الدواء
 * @returns {Promise<Object>}
 */
const getDrugDetails = async (drugName) => {
    const cacheKey = `drug_details_${drugName}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Drug details from cache:', drugName);
        return cached;
    }

    try {
        // جلب معلومات الملصق
        const labelResponse = await axios.get(`${OPENFDA_BASE_URL}/drug/label.json`, {
            params: {
                search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
                limit: 1
            },
            timeout: 15000
        });

        const labelData = labelResponse.data.results?.[0] || null;

        // جلب الأعراض الجانبية
        let adverseEvents = [];
        try {
            const adverseResponse = await axios.get(`${OPENFDA_BASE_URL}/drug/event.json`, {
                params: {
                    search: `patient.drug.medicinalproduct:"${drugName}"`,
                    limit: 5
                },
                timeout: 10000
            });
            adverseEvents = adverseResponse.data.results || [];
        } catch (e) {
            console.log('No adverse events found for:', drugName);
        }

        // تنسيق البيانات
        const result = {
            success: true,
            data: {
                basicInfo: labelData ? {
                    brandName: labelData.openfda?.brand_name?.[0] || 'غير متوفر',
                    genericName: labelData.openfda?.generic_name?.[0] || 'غير متوفر',
                    manufacturer: labelData.openfda?.manufacturer_name?.[0] || 'غير متوفر',
                    productType: labelData.openfda?.product_type?.[0] || 'غير متوفر',
                    route: labelData.openfda?.route?.[0] || 'غير متوفر',
                    substanceName: labelData.openfda?.substance_name?.[0] || 'غير متوفر'
                } : null,
                indications: labelData?.indications_and_usage?.[0] || 'غير متوفر',
                dosage: labelData?.dosage_and_administration?.[0] || 'غير متوفر',
                warnings: labelData?.warnings?.[0] || labelData?.warnings_and_cautions?.[0] || 'غير متوفر',
                contraindications: labelData?.contraindications?.[0] || 'غير متوفر',
                adverseReactions: labelData?.adverse_reactions?.[0] || 'غير متوفر',
                drugInteractions: labelData?.drug_interactions?.[0] || 'غير متوفر',
                pregnancy: labelData?.pregnancy?.[0] || labelData?.pregnancy_or_breast_feeding?.[0] || 'غير متوفر',
                storage: labelData?.storage_and_handling?.[0] || 'غير متوفر',
                adverseEvents: adverseEvents.map(event => ({
                    reactions: event.patient?.reaction?.map(r => r.reactionmeddrapt) || [],
                    serious: event.serious,
                    receiveDate: event.receivedate
                }))
            }
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: null };
        }
        console.error('OpenFDA Drug Details Error:', error.message);
        throw new Error('فشل في جلب تفاصيل الدواء');
    }
};

/**
 * البحث عن حالات سحب الأدوية
 * @param {string} query - كلمة البحث (اختياري)
 * @param {number} limit - عدد النتائج
 * @returns {Promise<Object>}
 */
const getDrugRecalls = async (query = '', limit = 10) => {
    const cacheKey = `drug_recalls_${query}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Drug recalls from cache');
        return cached;
    }

    try {
        const params = { limit };
        if (query) {
            params.search = `product_description:"${query}" OR reason_for_recall:"${query}"`;
        }

        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/enforcement.json`, {
            params,
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.results?.map(recall => ({
                recallNumber: recall.recall_number,
                productDescription: recall.product_description,
                reason: recall.reason_for_recall,
                classification: recall.classification,
                status: recall.status,
                recallInitiationDate: recall.recall_initiation_date,
                city: recall.city,
                state: recall.state,
                country: recall.country
            })) || [],
            meta: response.data.meta || {}
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: [], meta: {} };
        }
        console.error('OpenFDA Recalls Error:', error.message);
        throw new Error('فشل في جلب حالات السحب');
    }
};

/**
 * الحصول على الأعراض الجانبية لدواء معين
 * @param {string} drugName - اسم الدواء
 * @param {number} limit - عدد النتائج
 * @returns {Promise<Object>}
 */
const getAdverseEvents = async (drugName, limit = 10) => {
    const cacheKey = `adverse_events_${drugName}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Adverse events from cache:', drugName);
        return cached;
    }

    try {
        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/event.json`, {
            params: {
                search: `patient.drug.medicinalproduct:"${drugName}"`,
                limit: limit
            },
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.results?.map(event => ({
                safetyReportId: event.safetyreportid,
                receiveDate: event.receivedate,
                serious: event.serious,
                seriousnessDescription: {
                    death: event.seriousnessdeath,
                    lifeThreatening: event.seriousnesslifethreatening,
                    hospitalization: event.seriousnesshospitalization,
                    disability: event.seriousnessdisabling
                },
                reactions: event.patient?.reaction?.map(r => ({
                    name: r.reactionmeddrapt,
                    outcome: r.reactionoutcome
                })) || [],
                drugs: event.patient?.drug?.map(d => ({
                    name: d.medicinalproduct,
                    indication: d.drugindication,
                    role: d.drugcharacterization
                })) || []
            })) || [],
            meta: response.data.meta || {}
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: [], meta: {} };
        }
        console.error('OpenFDA Adverse Events Error:', error.message);
        throw new Error('فشل في جلب الأعراض الجانبية');
    }
};

/**
 * البحث عن الأدوية بالاسم التجاري فقط
 * @param {string} brandName - الاسم التجاري
 * @param {number} limit - عدد النتائج
 * @returns {Promise<Object>}
 */
const searchByBrandName = async (brandName, limit = 10) => {
    const cacheKey = `brand_search_${brandName}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Brand name search from cache:', brandName);
        return cached;
    }

    try {
        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/label.json`, {
            params: {
                search: `openfda.brand_name:"${brandName}"`,
                limit: limit
            },
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.results?.map(drug => ({
                id: drug.id || Math.random().toString(36).substr(2, 9),
                brandName: drug.openfda?.brand_name?.[0] || 'غير متوفر',
                genericName: drug.openfda?.generic_name?.[0] || 'غير متوفر',
                manufacturer: drug.openfda?.manufacturer_name?.[0] || 'غير متوفر',
                productType: drug.openfda?.product_type?.[0] || 'غير متوفر',
                route: drug.openfda?.route?.[0] || 'غير متوفر',
                substanceName: drug.openfda?.substance_name?.[0] || 'غير متوفر',
                dosageForm: drug.openfda?.dosage_form?.[0] || 'غير متوفر'
            })) || [],
            meta: response.data.meta || {}
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: [], meta: {} };
        }
        console.error('OpenFDA Brand Search Error:', error.message);
        throw new Error('فشل في البحث بالاسم التجاري');
    }
};

/**
 * الحصول على الأدوية ذات الأعراض الجانبية الخطيرة
 * @param {number} limit - عدد النتائج
 * @returns {Promise<Object>}
 */
const getDangerousDrugs = async (limit = 20) => {
    const cacheKey = `dangerous_drugs_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Dangerous drugs from cache');
        return cached;
    }

    try {
        // البحث عن الأحداث الجانبية الخطيرة (الوفاة أو التهديد للحياة)
        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/event.json`, {
            params: {
                search: 'serious:1 AND (seriousnessdeath:1 OR seriousnesslifethreatening:1)',
                count: 'patient.drug.medicinalproduct.exact',
                limit: limit
            },
            timeout: 20000
        });

        const result = {
            success: true,
            data: response.data.results?.map(item => ({
                drugName: item.term,
                reportCount: item.count,
                riskLevel: item.count > 1000 ? 'عالي الخطورة' : item.count > 500 ? 'متوسط الخطورة' : 'منخفض الخطورة'
            })) || [],
            meta: response.data.meta || {}
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: [], meta: {} };
        }
        console.error('OpenFDA Dangerous Drugs Error:', error.message);
        throw new Error('فشل في جلب الأدوية الخطرة');
    }
};

/**
 * الحصول على أحدث حالات سحب الأدوية مع فلاتر متقدمة
 * @param {Object} options - خيارات البحث
 * @returns {Promise<Object>}
 */
const getRecentRecalls = async (options = {}) => {
    const { limit = 20, classification = '', status = 'Ongoing' } = options;
    const cacheKey = `recent_recalls_${limit}_${classification}_${status}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Recent recalls from cache');
        return cached;
    }

    try {
        let searchQuery = '';
        const searchParams = [];
        
        if (status) {
            searchParams.push(`status:"${status}"`);
        }
        if (classification) {
            searchParams.push(`classification:"${classification}"`);
        }
        
        if (searchParams.length > 0) {
            searchQuery = searchParams.join(' AND ');
        }

        const params = { limit, sort: 'recall_initiation_date:desc' };
        if (searchQuery) {
            params.search = searchQuery;
        }

        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/enforcement.json`, {
            params,
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.results?.map(recall => ({
                recallNumber: recall.recall_number,
                productDescription: recall.product_description,
                reason: recall.reason_for_recall,
                classification: recall.classification,
                classificationDescription: getClassificationDescription(recall.classification),
                status: recall.status,
                recallInitiationDate: recall.recall_initiation_date,
                terminationDate: recall.termination_date,
                voluntaryMandated: recall.voluntary_mandated,
                distributionPattern: recall.distribution_pattern,
                city: recall.city,
                state: recall.state,
                country: recall.country,
                recallingFirm: recall.recalling_firm,
                productQuantity: recall.product_quantity
            })) || [],
            meta: response.data.meta || {}
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: [], meta: {} };
        }
        console.error('OpenFDA Recent Recalls Error:', error.message);
        throw new Error('فشل في جلب حالات السحب الأخيرة');
    }
};

/**
 * البحث في حالات السحب باسم الدواء
 * @param {string} drugName - اسم الدواء
 * @param {number} limit - عدد النتائج
 * @returns {Promise<Object>}
 */
const searchRecallsByDrug = async (drugName, limit = 10) => {
    const cacheKey = `recall_search_${drugName}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Recall search from cache:', drugName);
        return cached;
    }

    try {
        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/enforcement.json`, {
            params: {
                search: `product_description:"${drugName}" OR openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
                limit: limit,
                sort: 'recall_initiation_date:desc'
            },
            timeout: 15000
        });

        const result = {
            success: true,
            data: response.data.results?.map(recall => ({
                recallNumber: recall.recall_number,
                productDescription: recall.product_description,
                reason: recall.reason_for_recall,
                classification: recall.classification,
                classificationDescription: getClassificationDescription(recall.classification),
                status: recall.status,
                recallInitiationDate: recall.recall_initiation_date,
                recallingFirm: recall.recalling_firm,
                city: recall.city,
                state: recall.state,
                country: recall.country
            })) || [],
            meta: response.data.meta || {}
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: [], meta: {} };
        }
        console.error('OpenFDA Recall Search Error:', error.message);
        throw new Error('فشل في البحث عن حالات السحب');
    }
};

/**
 * الحصول على وصف تصنيف السحب
 * @param {string} classification - التصنيف
 * @returns {string}
 */
function getClassificationDescription(classification) {
    const descriptions = {
        'Class I': 'خطير: قد يسبب مشاكل صحية خطيرة أو الوفاة',
        'Class II': 'متوسط: قد يسبب مشاكل صحية مؤقتة أو قابلة للعلاج',
        'Class III': 'منخفض: من غير المحتمل أن يسبب مشاكل صحية'
    };
    return descriptions[classification] || 'غير محدد';
}

/**
 * الحصول على إحصائيات الأعراض الجانبية لدواء معين
 * @param {string} drugName - اسم الدواء
 * @returns {Promise<Object>}
 */
const getAdverseEventStats = async (drugName) => {
    const cacheKey = `adverse_stats_${drugName}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Adverse event stats from cache:', drugName);
        return cached;
    }

    try {
        // الحصول على أكثر الأعراض شيوعاً
        const response = await axios.get(`${OPENFDA_BASE_URL}/drug/event.json`, {
            params: {
                search: `patient.drug.medicinalproduct:"${drugName}"`,
                count: 'patient.reaction.reactionmeddrapt.exact'
            },
            timeout: 15000
        });

        // الحصول على عدد الحالات الخطيرة
        let seriousCount = 0;
        try {
            const seriousResponse = await axios.get(`${OPENFDA_BASE_URL}/drug/event.json`, {
                params: {
                    search: `patient.drug.medicinalproduct:"${drugName}" AND serious:1`,
                    limit: 1
                },
                timeout: 10000
            });
            seriousCount = seriousResponse.data.meta?.results?.total || 0;
        } catch (e) {
            console.log('Could not get serious count for:', drugName);
        }

        const result = {
            success: true,
            data: {
                topReactions: response.data.results?.slice(0, 10).map(r => ({
                    reaction: r.term,
                    count: r.count
                })) || [],
                totalReports: response.data.meta?.results?.total || 0,
                seriousReports: seriousCount
            }
        };

        cache.set(cacheKey, result, CACHE_TTL);
        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            return { success: true, data: { topReactions: [], totalReports: 0, seriousReports: 0 } };
        }
        console.error('OpenFDA Adverse Stats Error:', error.message);
        throw new Error('فشل في جلب إحصائيات الأعراض الجانبية');
    }
};

module.exports = {
    searchDrugLabels,
    getDrugDetails,
    getDrugRecalls,
    getAdverseEvents,
    searchByBrandName,
    getDangerousDrugs,
    getRecentRecalls,
    searchRecallsByDrug,
    getAdverseEventStats
};
