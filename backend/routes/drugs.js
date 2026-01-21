/**
 * Routes للبحث عن الأدوية
 */

const express = require('express');
const router = express.Router();
const openfdaService = require('../services/openfdaService');
const rxnormService = require('../services/rxnormService');

/**
 * GET /api/drugs/search
 * البحث عن أدوية بالاسم
 */
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'يجب تحديد اسم الدواء للبحث'
            });
        }

        // البحث في كلا المصدرين بالتوازي
        const [fdaResults, rxnormResults] = await Promise.all([
            openfdaService.searchDrugLabels(q, parseInt(limit)),
            rxnormService.approximateSearch(q, parseInt(limit))
        ]);

        // دمج وتنسيق النتائج
        const drugs = [];
        const addedNames = new Set();

        // إضافة نتائج openFDA
        if (fdaResults.data) {
            fdaResults.data.forEach(drug => {
                const brandName = drug.openfda?.brand_name?.[0];
                const genericName = drug.openfda?.generic_name?.[0];
                const name = brandName || genericName || 'غير معروف';

                if (!addedNames.has(name.toLowerCase())) {
                    addedNames.add(name.toLowerCase());
                    drugs.push({
                        id: drug.id || generateId(name),
                        brandName: brandName || 'غير متوفر',
                        genericName: genericName || 'غير متوفر',
                        manufacturer: drug.openfda?.manufacturer_name?.[0] || 'غير متوفر',
                        productType: drug.openfda?.product_type?.[0] || 'غير متوفر',
                        route: drug.openfda?.route?.[0] || 'غير متوفر',
                        source: 'openFDA'
                    });
                }
            });
        }

        // إضافة نتائج RxNorm إذا لم تكن موجودة
        if (rxnormResults.data) {
            rxnormResults.data.forEach(drug => {
                if (!addedNames.has(drug.name.toLowerCase())) {
                    addedNames.add(drug.name.toLowerCase());
                    drugs.push({
                        id: drug.rxcui,
                        brandName: drug.name,
                        genericName: drug.name,
                        manufacturer: 'غير متوفر',
                        productType: drug.type || 'غير متوفر',
                        route: 'غير متوفر',
                        source: 'RxNorm',
                        rxcui: drug.rxcui
                    });
                }
            });
        }

        res.json({
            success: true,
            data: drugs,
            totalResults: drugs.length,
            query: q
        });
    } catch (error) {
        console.error('Drug Search Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/details/:name
 * الحصول على تفاصيل دواء محدد
 */
router.get('/details/:name', async (req, res) => {
    try {
        const { name } = req.params;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'يجب تحديد اسم الدواء'
            });
        }

        const result = await openfdaService.getDrugDetails(name);
        res.json(result);
    } catch (error) {
        console.error('Drug Details Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/adverse-events/:name
 * الحصول على الأعراض الجانبية لدواء محدد
 */
router.get('/adverse-events/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { limit = 10 } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'يجب تحديد اسم الدواء'
            });
        }

        const result = await openfdaService.getAdverseEvents(name, parseInt(limit));
        res.json(result);
    } catch (error) {
        console.error('Adverse Events Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/recalls
 * الحصول على حالات سحب الأدوية
 */
router.get('/recalls', async (req, res) => {
    try {
        const { q = '', limit = 10 } = req.query;

        const result = await openfdaService.getDrugRecalls(q, parseInt(limit));
        res.json(result);
    } catch (error) {
        console.error('Drug Recalls Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/suggestions
 * اقتراحات الإكمال التلقائي
 */
router.get('/suggestions', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        const result = await rxnormService.getSpellingSuggestions(q);
        res.json(result);
    } catch (error) {
        console.error('Suggestions Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/rxnorm/:rxcui
 * الحصول على معلومات من RxNorm
 */
router.get('/rxnorm/:rxcui', async (req, res) => {
    try {
        const { rxcui } = req.params;

        const [drugInfo, brandNames, relatedNames] = await Promise.all([
            rxnormService.getDrugInfo(rxcui),
            rxnormService.getBrandNames(rxcui),
            rxnormService.getRelatedNames(rxcui)
        ]);

        res.json({
            success: true,
            data: {
                info: drugInfo.data,
                brandNames: brandNames.data,
                relatedNames: relatedNames.data
            }
        });
    } catch (error) {
        console.error('RxNorm Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/search/brand
 * البحث عن أدوية بالاسم التجاري فقط
 */
router.get('/search/brand', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'يجب تحديد الاسم التجاري للبحث'
            });
        }

        const result = await openfdaService.searchByBrandName(q, parseInt(limit));
        res.json(result);
    } catch (error) {
        console.error('Brand Search Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/dangerous
 * الحصول على الأدوية الأكثر خطورة
 */
router.get('/dangerous', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const result = await openfdaService.getDangerousDrugs(parseInt(limit));
        res.json(result);
    } catch (error) {
        console.error('Dangerous Drugs Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/recalls/recent
 * الحصول على أحدث حالات سحب الأدوية
 */
router.get('/recalls/recent', async (req, res) => {
    try {
        const { limit = 20, classification = '', status = '' } = req.query;

        const result = await openfdaService.getRecentRecalls({
            limit: parseInt(limit),
            classification,
            status
        });
        res.json(result);
    } catch (error) {
        console.error('Recent Recalls Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/recalls/search/:drugName
 * البحث عن حالات سحب لدواء معين
 */
router.get('/recalls/search/:drugName', async (req, res) => {
    try {
        const { drugName } = req.params;
        const { limit = 10 } = req.query;

        if (!drugName) {
            return res.status(400).json({
                success: false,
                error: 'يجب تحديد اسم الدواء'
            });
        }

        const result = await openfdaService.searchRecallsByDrug(drugName, parseInt(limit));
        res.json(result);
    } catch (error) {
        console.error('Recall Search Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/drugs/adverse-stats/:name
 * الحصول على إحصائيات الأعراض الجانبية لدواء
 */
router.get('/adverse-stats/:name', async (req, res) => {
    try {
        const { name } = req.params;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'يجب تحديد اسم الدواء'
            });
        }

        const result = await openfdaService.getAdverseEventStats(name);
        res.json(result);
    } catch (error) {
        console.error('Adverse Stats Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * توليد معرف فريد
 */
function generateId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

module.exports = router;
