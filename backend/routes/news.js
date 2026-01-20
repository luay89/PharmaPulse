/**
 * Routes للأخبار الصيدلانية
 */

const express = require('express');
const router = express.Router();
const newsService = require('../services/newsService');

/**
 * GET /api/news
 * جلب أحدث الأخبار الصيدلانية
 */
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, language = 'en' } = req.query;
        
        const result = await newsService.getPharmaceuticalNews({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            language
        });

        res.json(result);
    } catch (error) {
        console.error('News Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/news/search
 * البحث عن أخبار بكلمات مفتاحية
 */
router.get('/search', async (req, res) => {
    try {
        const { q, page = 1, pageSize = 20, language = 'en', sortBy = 'relevancy' } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'يجب تحديد كلمات البحث'
            });
        }

        const result = await newsService.searchNews(q, {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            language,
            sortBy
        });

        res.json(result);
    } catch (error) {
        console.error('News Search Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/news/headlines
 * جلب العناوين الرئيسية للصحة
 */
router.get('/headlines', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, country = 'us' } = req.query;

        const result = await newsService.getHealthHeadlines({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            country
        });

        res.json(result);
    } catch (error) {
        console.error('Headlines Route Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
