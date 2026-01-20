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

module.exports = {
    searchDrugLabels,
    getDrugDetails,
    getDrugRecalls,
    getAdverseEvents
};
