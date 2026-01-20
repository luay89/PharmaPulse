/**
 * PharmaPulse Backend Server
 * خادم Node.js/Express للتكامل مع APIs الخارجية
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// استيراد الـ Routes
const newsRoutes = require('./routes/news');
const drugsRoutes = require('./routes/drugs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware للأمان والأداء
app.use(helmet({
    contentSecurityPolicy: false // للسماح بتحميل الموارد الخارجية
}));
app.use(compression());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// تقديم الملفات الثابتة من مجلد frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/news', newsRoutes);
app.use('/api/drugs', drugsRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'حدث خطأ في الخادم',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// معالجة المسارات غير الموجودة
app.use((req, res) => {
    res.status(404).json({
        error: 'المسار غير موجود',
        path: req.path
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════╗
    ║     PharmaPulse Server Started             ║
    ║────────────────────────────────────────────║
    ║  🚀 Server running on port ${PORT}            ║
    ║  📡 API: http://localhost:${PORT}/api        ║
    ║  🌐 Web: http://localhost:${PORT}            ║
    ╚════════════════════════════════════════════╝
    `);
});

module.exports = app;
