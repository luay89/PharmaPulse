/**
 * PharmaPulse Main Application
 * التطبيق الرئيسي
 */

// ==================== State Management ====================
const AppState = {
    currentSection: 'newsSection',
    news: {
        data: [],
        page: 1,
        isLoading: false,
        hasMore: true,
        currentFilter: 'all'
    },
    drugs: {
        searchResults: [],
        isLoading: false,
        selectedDrug: null
    },
    recalls: {
        data: [],
        isLoading: false
    }
};

// ==================== DOM Elements ====================
const DOM = {
    // Sections
    newsSection: document.getElementById('newsSection'),
    drugSection: document.getElementById('drugSection'),
    recallsSection: document.getElementById('recallsSection'),
    
    // News
    newsGrid: document.getElementById('newsGrid'),
    newsSearchInput: document.getElementById('newsSearchInput'),
    newsSearchBtn: document.getElementById('newsSearchBtn'),
    newsLoading: document.getElementById('newsLoading'),
    loadMoreNews: document.getElementById('loadMoreNews'),
    
    // Drugs
    drugSearchInput: document.getElementById('drugSearchInput'),
    drugSearchBtn: document.getElementById('drugSearchBtn'),
    drugResults: document.getElementById('drugResults'),
    drugLoading: document.getElementById('drugLoading'),
    drugInitialState: document.getElementById('drugInitialState'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    
    // Recalls
    recallsList: document.getElementById('recallsList'),
    recallsLoading: document.getElementById('recallsLoading'),
    
    // Modals
    drugModal: document.getElementById('drugModal'),
    modalDrugName: document.getElementById('modalDrugName'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModal'),
    
    newsModal: document.getElementById('newsModal'),
    newsModalTitle: document.getElementById('newsModalTitle'),
    newsModalBody: document.getElementById('newsModalBody'),
    closeNewsModal: document.getElementById('closeNewsModal'),
    
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    quickTags: document.querySelectorAll('.quick-tag'),
    
    // Toast
    toast: document.getElementById('toast')
};

// ==================== Utility Functions ====================

/**
 * عرض إشعار Toast
 * @param {string} message - الرسالة
 * @param {string} type - نوع الإشعار (success, error, warning)
 */
function showToast(message, type = 'info') {
    DOM.toast.textContent = message;
    DOM.toast.className = `toast ${type} active`;
    
    setTimeout(() => {
        DOM.toast.classList.remove('active');
    }, CONFIG.UI.TOAST_DURATION);
}

/**
 * تنسيق النص الطويل
 * @param {string} text - النص
 * @param {number} maxLength - الحد الأقصى
 * @returns {string}
 */
function truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Debounce function للتأخير
 * @param {Function} func - الدالة
 * @param {number} wait - وقت الانتظار
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * صورة افتراضية للأخبار
 * @returns {string}
 */
function getDefaultNewsImage() {
    return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop';
}

// ==================== News Functions ====================

/**
 * تحميل الأخبار
 * @param {boolean} append - إضافة للقائمة أم استبدال
 */
async function loadNews(append = false) {
    if (AppState.news.isLoading) return;
    
    AppState.news.isLoading = true;
    
    if (!append) {
        DOM.newsGrid.innerHTML = '';
        AppState.news.page = 1;
    }
    
    DOM.newsLoading.style.display = 'flex';
    DOM.loadMoreNews.style.display = 'none';
    
    try {
        const filter = CONFIG.NEWS.FILTERS[AppState.news.currentFilter];
        let result;
        
        if (filter) {
            result = await API.searchNews(filter, { page: AppState.news.page });
        } else {
            result = await API.getNews({ page: AppState.news.page });
        }
        
        if (result.success && result.data.length > 0) {
            if (append) {
                AppState.news.data = [...AppState.news.data, ...result.data];
            } else {
                AppState.news.data = result.data;
            }
            
            renderNewsCards(result.data, append);
            AppState.news.hasMore = result.data.length >= CONFIG.NEWS.PAGE_SIZE;
            
            if (AppState.news.hasMore) {
                DOM.loadMoreNews.style.display = 'block';
            }
        } else if (!append) {
            DOM.newsGrid.innerHTML = `
                <div class="initial-state" style="grid-column: 1 / -1;">
                    <div class="initial-icon">📰</div>
                    <h3>لا توجد أخبار متاحة</h3>
                    <p>جرب تغيير الفلتر أو حاول مرة أخرى لاحقاً</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showToast(CONFIG.MESSAGES.ERROR_NETWORK, 'error');
        
        if (!append) {
            DOM.newsGrid.innerHTML = `
                <div class="initial-state" style="grid-column: 1 / -1;">
                    <div class="initial-icon">⚠️</div>
                    <h3>تعذر تحميل الأخبار</h3>
                    <p>تحقق من اتصالك بالإنترنت وحاول مرة أخرى</p>
                </div>
            `;
        }
    } finally {
        AppState.news.isLoading = false;
        DOM.newsLoading.style.display = 'none';
    }
}

/**
 * عرض بطاقات الأخبار
 * @param {Array} news - مصفوفة الأخبار
 * @param {boolean} append - إضافة للقائمة
 */
function renderNewsCards(news, append = false) {
    const fragment = document.createDocumentFragment();
    
    news.forEach(article => {
        const card = document.createElement('article');
        card.className = 'news-card';
        card.innerHTML = `
            <img 
                src="${article.imageUrl || getDefaultNewsImage()}" 
                alt="${article.title}" 
                class="news-card-image"
                loading="lazy"
                onerror="this.src='${getDefaultNewsImage()}'"
            >
            <div class="news-card-content">
                <div class="news-card-source">
                    <span class="news-source-name">${article.source?.name || 'مصدر غير معروف'}</span>
                    <span class="news-card-date">${article.formattedDate || ''}</span>
                </div>
                <h3 class="news-card-title">${article.title}</h3>
                <p class="news-card-description">${truncateText(article.description, 120)}</p>
            </div>
        `;
        
        card.addEventListener('click', () => openNewsModal(article));
        fragment.appendChild(card);
    });
    
    if (append) {
        DOM.newsGrid.appendChild(fragment);
    } else {
        DOM.newsGrid.innerHTML = '';
        DOM.newsGrid.appendChild(fragment);
    }
}

/**
 * فتح نافذة تفاصيل الخبر
 * @param {Object} article - الخبر
 */
function openNewsModal(article) {
    DOM.newsModalTitle.textContent = article.title;
    DOM.newsModalBody.innerHTML = `
        ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${article.title}" class="news-modal-image" onerror="this.style.display='none'">` : ''}
        <div class="news-modal-meta">
            <span>📰 ${article.source?.name || 'مصدر غير معروف'}</span>
            <span>✍️ ${article.author || 'غير معروف'}</span>
            <span>📅 ${article.formattedDate || ''}</span>
        </div>
        <div class="news-modal-content-text">
            ${article.description || ''}
            ${article.content ? `<br><br>${article.content}` : ''}
        </div>
        ${article.url ? `<a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-modal-link">قراءة المقال الكامل ↗</a>` : ''}
    `;
    DOM.newsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * البحث في الأخبار
 */
async function searchNews() {
    const query = DOM.newsSearchInput.value.trim();
    
    if (!query) {
        loadNews();
        return;
    }
    
    AppState.news.isLoading = true;
    DOM.newsGrid.innerHTML = '';
    DOM.newsLoading.style.display = 'flex';
    DOM.loadMoreNews.style.display = 'none';
    
    try {
        const result = await API.searchNews(query);
        
        if (result.success && result.data.length > 0) {
            AppState.news.data = result.data;
            renderNewsCards(result.data);
        } else {
            DOM.newsGrid.innerHTML = `
                <div class="initial-state" style="grid-column: 1 / -1;">
                    <div class="initial-icon">🔍</div>
                    <h3>لم يتم العثور على نتائج</h3>
                    <p>جرب كلمات بحث مختلفة</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching news:', error);
        showToast(CONFIG.MESSAGES.ERROR_NETWORK, 'error');
    } finally {
        AppState.news.isLoading = false;
        DOM.newsLoading.style.display = 'none';
    }
}

// ==================== Drug Functions ====================

/**
 * البحث عن أدوية
 */
async function searchDrugs() {
    const query = DOM.drugSearchInput.value.trim();
    
    if (query.length < CONFIG.DRUGS.MIN_SEARCH_LENGTH) {
        showToast('يرجى إدخال حرفين على الأقل للبحث', 'warning');
        return;
    }
    
    AppState.drugs.isLoading = true;
    DOM.drugResults.innerHTML = '';
    DOM.drugInitialState.style.display = 'none';
    DOM.drugLoading.style.display = 'flex';
    DOM.searchSuggestions.classList.remove('active');
    
    try {
        const result = await API.searchDrugs(query);
        
        if (result.success && result.data.length > 0) {
            AppState.drugs.searchResults = result.data;
            renderDrugCards(result.data);
        } else {
            DOM.drugResults.innerHTML = `
                <div class="initial-state">
                    <div class="initial-icon">💊</div>
                    <h3>لم يتم العثور على نتائج</h3>
                    <p>جرب البحث باسم مختلف (علمي أو تجاري)</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching drugs:', error);
        showToast(CONFIG.MESSAGES.ERROR_NETWORK, 'error');
        DOM.drugInitialState.style.display = 'block';
    } finally {
        AppState.drugs.isLoading = false;
        DOM.drugLoading.style.display = 'none';
    }
}

/**
 * عرض بطاقات الأدوية
 * @param {Array} drugs - مصفوفة الأدوية
 */
function renderDrugCards(drugs) {
    const fragment = document.createDocumentFragment();
    
    drugs.forEach(drug => {
        const card = document.createElement('article');
        card.className = 'drug-card';
        card.innerHTML = `
            <div class="drug-card-header">
                <div class="drug-card-names">
                    <div class="drug-brand-name">${drug.brandName || 'غير متوفر'}</div>
                    <div class="drug-generic-name">${drug.genericName || ''}</div>
                </div>
                <span class="drug-card-badge">${drug.source || 'FDA'}</span>
            </div>
            <div class="drug-card-info">
                <div class="drug-info-item">
                    <span class="drug-info-label">الشركة المصنعة:</span>
                    <span class="drug-info-value">${truncateText(drug.manufacturer, 30) || 'غير متوفر'}</span>
                </div>
                <div class="drug-info-item">
                    <span class="drug-info-label">طريقة الاستخدام:</span>
                    <span class="drug-info-value">${drug.route || 'غير متوفر'}</span>
                </div>
                <div class="drug-info-item">
                    <span class="drug-info-label">النوع:</span>
                    <span class="drug-info-value">${drug.productType || 'غير متوفر'}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => openDrugModal(drug.brandName || drug.genericName));
        fragment.appendChild(card);
    });
    
    DOM.drugResults.appendChild(fragment);
}

/**
 * فتح نافذة تفاصيل الدواء
 * @param {string} drugName - اسم الدواء
 */
async function openDrugModal(drugName) {
    DOM.modalDrugName.textContent = drugName;
    DOM.modalBody.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>جاري تحميل المعلومات...</p>
        </div>
    `;
    DOM.drugModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    try {
        const result = await API.getDrugDetails(drugName);
        
        if (result.success && result.data) {
            renderDrugDetails(result.data);
        } else {
            DOM.modalBody.innerHTML = `
                <div class="initial-state">
                    <div class="initial-icon">⚠️</div>
                    <h3>لم يتم العثور على تفاصيل</h3>
                    <p>جرب البحث بالاسم العلمي للدواء</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching drug details:', error);
        DOM.modalBody.innerHTML = `
            <div class="initial-state">
                <div class="initial-icon">⚠️</div>
                <h3>تعذر تحميل المعلومات</h3>
                <p>حاول مرة أخرى لاحقاً</p>
            </div>
        `;
    }
}

/**
 * عرض تفاصيل الدواء
 * @param {Object} data - بيانات الدواء
 */
function renderDrugDetails(data) {
    const sections = [
        { icon: '📋', title: 'المعلومات الأساسية', content: renderBasicInfo(data.basicInfo) },
        { icon: '💊', title: 'الاستخدامات', content: data.indications },
        { icon: '📏', title: 'الجرعات', content: data.dosage },
        { icon: '⚠️', title: 'التحذيرات', content: data.warnings },
        { icon: '🚫', title: 'موانع الاستعمال', content: data.contraindications },
        { icon: '😷', title: 'الأعراض الجانبية', content: data.adverseReactions },
        { icon: '🔄', title: 'التفاعلات الدوائية', content: data.drugInteractions },
        { icon: '🤰', title: 'الحمل والرضاعة', content: data.pregnancy },
        { icon: '🏪', title: 'التخزين', content: data.storage }
    ];
    
    let html = '';
    
    sections.forEach(section => {
        if (section.content && section.content !== 'غير متوفر') {
            html += `
                <div class="drug-detail-section">
                    <h3 class="drug-detail-title">
                        <span>${section.icon}</span>
                        ${section.title}
                    </h3>
                    <div class="drug-detail-content">${section.content}</div>
                </div>
            `;
        }
    });
    
    if (!html) {
        html = `
            <div class="initial-state">
                <div class="initial-icon">📋</div>
                <h3>معلومات محدودة</h3>
                <p>لا تتوفر معلومات تفصيلية لهذا الدواء حالياً</p>
            </div>
        `;
    }
    
    DOM.modalBody.innerHTML = html;
}

/**
 * عرض المعلومات الأساسية
 * @param {Object} info - المعلومات الأساسية
 * @returns {string}
 */
function renderBasicInfo(info) {
    if (!info) return 'غير متوفر';
    
    return `
        <div style="display: grid; gap: 8px;">
            <div><strong>الاسم التجاري:</strong> ${info.brandName || 'غير متوفر'}</div>
            <div><strong>الاسم العلمي:</strong> ${info.genericName || 'غير متوفر'}</div>
            <div><strong>المادة الفعالة:</strong> ${info.substanceName || 'غير متوفر'}</div>
            <div><strong>الشركة المصنعة:</strong> ${info.manufacturer || 'غير متوفر'}</div>
            <div><strong>طريقة الاستخدام:</strong> ${info.route || 'غير متوفر'}</div>
            <div><strong>نوع المنتج:</strong> ${info.productType || 'غير متوفر'}</div>
        </div>
    `;
}

/**
 * تحميل اقتراحات البحث
 */
const loadSuggestions = debounce(async (term) => {
    if (term.length < 2) {
        DOM.searchSuggestions.classList.remove('active');
        return;
    }
    
    try {
        const result = await API.getDrugSuggestions(term);
        
        if (result.success && result.data.length > 0) {
            const suggestionsHtml = result.data.slice(0, 8).map(suggestion => 
                `<div class="suggestion-item" data-value="${suggestion}">${suggestion}</div>`
            ).join('');
            
            DOM.searchSuggestions.innerHTML = suggestionsHtml;
            DOM.searchSuggestions.classList.add('active');
            
            // إضافة أحداث النقر
            DOM.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    DOM.drugSearchInput.value = item.dataset.value;
                    DOM.searchSuggestions.classList.remove('active');
                    searchDrugs();
                });
            });
        } else {
            DOM.searchSuggestions.classList.remove('active');
        }
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}, CONFIG.DRUGS.SUGGESTION_DELAY);

// ==================== Recalls Functions ====================

/**
 * تحميل حالات السحب
 */
async function loadRecalls() {
    if (AppState.recalls.isLoading) return;
    
    AppState.recalls.isLoading = true;
    DOM.recallsList.innerHTML = '';
    DOM.recallsLoading.style.display = 'flex';
    
    try {
        const result = await API.getRecalls();
        
        if (result.success && result.data.length > 0) {
            AppState.recalls.data = result.data;
            renderRecalls(result.data);
        } else {
            DOM.recallsList.innerHTML = `
                <div class="initial-state">
                    <div class="initial-icon">✅</div>
                    <h3>لا توجد حالات سحب حالياً</h3>
                    <p>سيتم تحديث هذه الصفحة تلقائياً عند وجود حالات جديدة</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recalls:', error);
        showToast(CONFIG.MESSAGES.ERROR_NETWORK, 'error');
    } finally {
        AppState.recalls.isLoading = false;
        DOM.recallsLoading.style.display = 'none';
    }
}

/**
 * عرض حالات السحب
 * @param {Array} recalls - مصفوفة حالات السحب
 */
function renderRecalls(recalls) {
    const fragment = document.createDocumentFragment();
    
    recalls.forEach(recall => {
        const card = document.createElement('article');
        card.className = 'recall-card';
        
        let classificationClass = 'class-iii';
        if (recall.classification === 'Class I') classificationClass = 'class-i';
        else if (recall.classification === 'Class II') classificationClass = 'class-ii';
        
        card.innerHTML = `
            <div class="recall-header">
                <span class="recall-classification ${classificationClass}">${recall.classification || 'غير محدد'}</span>
                <span style="font-size: 12px; color: #6c757d;">#${recall.recallNumber || 'N/A'}</span>
            </div>
            <h3 class="recall-product">${truncateText(recall.productDescription, 100) || 'منتج غير معروف'}</h3>
            <p class="recall-reason">${truncateText(recall.reason, 200) || 'السبب غير محدد'}</p>
            <div class="recall-details">
                <span>📅 ${recall.recallInitiationDate || 'تاريخ غير معروف'}</span>
                <span>📍 ${recall.city || ''} ${recall.state || ''} ${recall.country || ''}</span>
                <span>📊 ${recall.status || 'غير محدد'}</span>
            </div>
        `;
        
        fragment.appendChild(card);
    });
    
    DOM.recallsList.appendChild(fragment);
}

// ==================== Navigation Functions ====================

/**
 * التنقل بين الأقسام
 * @param {string} sectionId - معرف القسم
 */
function navigateToSection(sectionId) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // إظهار القسم المطلوب
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // تحديث التنقل السفلي
    DOM.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    AppState.currentSection = sectionId;
    
    // تحميل البيانات إذا لزم الأمر
    if (sectionId === 'recallsSection' && AppState.recalls.data.length === 0) {
        loadRecalls();
    }
}

// ==================== Event Listeners ====================

function initEventListeners() {
    // التنقل السفلي
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => {
            navigateToSection(item.dataset.section);
        });
    });
    
    // فلاتر الأخبار
    DOM.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            AppState.news.currentFilter = tab.dataset.filter;
            loadNews();
        });
    });
    
    // بحث الأخبار
    DOM.newsSearchBtn.addEventListener('click', searchNews);
    DOM.newsSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchNews();
    });
    
    // تحميل المزيد من الأخبار
    DOM.loadMoreNews.querySelector('.load-more-btn').addEventListener('click', () => {
        AppState.news.page++;
        loadNews(true);
    });
    
    // بحث الأدوية
    DOM.drugSearchBtn.addEventListener('click', searchDrugs);
    DOM.drugSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchDrugs();
    });
    DOM.drugSearchInput.addEventListener('input', (e) => {
        loadSuggestions(e.target.value);
    });
    
    // إغلاق اقتراحات البحث عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (!DOM.searchSuggestions.contains(e.target) && e.target !== DOM.drugSearchInput) {
            DOM.searchSuggestions.classList.remove('active');
        }
    });
    
    // أزرار البحث السريع
    DOM.quickTags.forEach(tag => {
        tag.addEventListener('click', () => {
            DOM.drugSearchInput.value = tag.dataset.drug;
            searchDrugs();
        });
    });
    
    // إغلاق النوافذ المنبثقة
    DOM.closeModal.addEventListener('click', closeDrugModal);
    DOM.closeNewsModal.addEventListener('click', closeNewsModal);
    
    DOM.drugModal.addEventListener('click', (e) => {
        if (e.target === DOM.drugModal) closeDrugModal();
    });
    
    DOM.newsModal.addEventListener('click', (e) => {
        if (e.target === DOM.newsModal) closeNewsModal();
    });
    
    // إغلاق بالضغط على Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDrugModal();
            closeNewsModal();
        }
    });
}

/**
 * إغلاق نافذة الدواء
 */
function closeDrugModal() {
    DOM.drugModal.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * إغلاق نافذة الخبر
 */
function closeNewsModal() {
    DOM.newsModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== Initialize App ====================

async function initApp() {
    console.log('🚀 PharmaPulse Initializing...');
    
    // تهيئة الأحداث
    initEventListeners();
    
    // تحميل الأخبار
    loadNews();
    
    // التحقق من صحة الخادم
    try {
        await API.healthCheck();
        console.log('✅ Server connection successful');
    } catch (error) {
        console.warn('⚠️ Server might be offline, using cached/mock data');
    }
    
    console.log('✅ PharmaPulse Ready!');
}

// تشغيل التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);
