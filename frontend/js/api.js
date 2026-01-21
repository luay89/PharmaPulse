/**
 * PharmaPulse API Service - GitHub Pages Version
 * الاتصال المباشر بـ APIs بدون خادم وسيط
 */

const API = {
    // OpenFDA API - لا يحتاج مفتاح
    OPENFDA_URL: 'https://api.fda.gov',
    
    // RxNorm API - لا يحتاج مفتاح
    RXNORM_URL: 'https://rxnav.nlm.nih.gov/REST',

    /**
     * البحث عن أدوية من openFDA
     */
    async searchDrugs(query, limit = 20) {
        try {
            const response = await fetch(
                `${this.OPENFDA_URL}/drug/label.json?search=openfda.brand_name:"${query}"+OR+openfda.generic_name:"${query}"&limit=${limit}`
            );
            
            if (!response.ok) {
                if (response.status === 404) return { success: true, data: [] };
                throw new Error('فشل البحث');
            }
            
            const data = await response.json();
            const drugs = (data.results || []).map(drug => ({
                id: drug.id || Math.random().toString(36).substr(2, 9),
                brandName: drug.openfda?.brand_name?.[0] || 'غير متوفر',
                genericName: drug.openfda?.generic_name?.[0] || 'غير متوفر',
                manufacturer: drug.openfda?.manufacturer_name?.[0] || 'غير متوفر',
                productType: drug.openfda?.product_type?.[0] || 'غير متوفر',
                route: drug.openfda?.route?.[0] || 'غير متوفر',
                source: 'openFDA'
            }));
            
            return { success: true, data: drugs, totalResults: drugs.length };
        } catch (error) {
            console.error('Search Error:', error);
            return { success: true, data: [] };
        }
    },

    /**
     * الحصول على تفاصيل دواء
     */
    async getDrugDetails(drugName) {
        try {
            const response = await fetch(
                `${this.OPENFDA_URL}/drug/label.json?search=openfda.brand_name:"${drugName}"+OR+openfda.generic_name:"${drugName}"&limit=1`
            );
            
            if (!response.ok) {
                return { success: true, data: null };
            }
            
            const data = await response.json();
            const drug = data.results?.[0];
            
            if (!drug) return { success: true, data: null };
            
            return {
                success: true,
                data: {
                    basicInfo: {
                        brandName: drug.openfda?.brand_name?.[0] || 'غير متوفر',
                        genericName: drug.openfda?.generic_name?.[0] || 'غير متوفر',
                        manufacturer: drug.openfda?.manufacturer_name?.[0] || 'غير متوفر',
                        productType: drug.openfda?.product_type?.[0] || 'غير متوفر',
                        route: drug.openfda?.route?.[0] || 'غير متوفر',
                        substanceName: drug.openfda?.substance_name?.[0] || 'غير متوفر'
                    },
                    indications: drug.indications_and_usage?.[0] || 'غير متوفر',
                    dosage: drug.dosage_and_administration?.[0] || 'غير متوفر',
                    warnings: drug.warnings?.[0] || drug.warnings_and_cautions?.[0] || 'غير متوفر',
                    contraindications: drug.contraindications?.[0] || 'غير متوفر',
                    adverseReactions: drug.adverse_reactions?.[0] || 'غير متوفر',
                    drugInteractions: drug.drug_interactions?.[0] || 'غير متوفر',
                    pregnancy: drug.pregnancy?.[0] || 'غير متوفر',
                    storage: drug.storage_and_handling?.[0] || 'غير متوفر'
                }
            };
        } catch (error) {
            console.error('Details Error:', error);
            return { success: true, data: null };
        }
    },

    /**
     * اقتراحات البحث من RxNorm
     */
    async getDrugSuggestions(term) {
        try {
            const response = await fetch(
                `${this.RXNORM_URL}/spellingsuggestions.json?name=${encodeURIComponent(term)}`
            );
            
            if (!response.ok) return { success: true, data: [] };
            
            const data = await response.json();
            const suggestions = data.suggestionGroup?.suggestionList?.suggestion || [];
            
            return { success: true, data: suggestions.slice(0, 8) };
        } catch (error) {
            return { success: true, data: [] };
        }
    },

    /**
     * حالات سحب الأدوية
     */
    async getRecalls(limit = 20) {
        try {
            const response = await fetch(
                `${this.OPENFDA_URL}/drug/enforcement.json?limit=${limit}`
            );
            
            if (!response.ok) return { success: true, data: [] };
            
            const data = await response.json();
            const recalls = (data.results || []).map(recall => ({
                recallNumber: recall.recall_number,
                productDescription: recall.product_description,
                reason: recall.reason_for_recall,
                classification: recall.classification,
                status: recall.status,
                recallInitiationDate: recall.recall_initiation_date,
                city: recall.city,
                state: recall.state,
                country: recall.country
            }));
            
            return { success: true, data: recalls };
        } catch (error) {
            console.error('Recalls Error:', error);
            return { success: true, data: [] };
        }
    },

    /**
     * جلب الأخبار الصيدلانية
     */
    async getNews() {
        const mockNews = [
            {
                id: '1',
                title: 'FDA Approves New Breakthrough Cancer Treatment',
                description: 'The FDA has granted approval for a revolutionary new immunotherapy drug that shows remarkable results in treating advanced melanoma.',
                content: 'This groundbreaking treatment represents a major advancement in cancer care...',
                author: 'Medical News Team',
                source: { name: 'FDA News' },
                url: 'https://www.fda.gov/news-events',
                imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
                publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                formattedDate: 'منذ ساعتين'
            },
            {
                id: '2',
                title: 'New Alzheimer\'s Drug Shows Promise in Phase 3 Trials',
                description: 'Clinical trials reveal significant cognitive improvements in patients with early-stage Alzheimer\'s disease.',
                content: 'Researchers are optimistic about the potential of this new treatment approach...',
                author: 'Health Reporter',
                source: { name: 'Pharma Times' },
                url: 'https://www.pharmatimes.com',
                imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400',
                publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                formattedDate: 'منذ 5 ساعات'
            },
            {
                id: '3',
                title: 'Breakthrough in Antibiotic Resistance Research',
                description: 'Scientists develop a novel compound effective against drug-resistant bacteria, offering hope in the fight against superbugs.',
                content: 'This discovery could revolutionize how we treat bacterial infections...',
                author: 'Science Desk',
                source: { name: 'Science Daily' },
                url: 'https://www.sciencedaily.com',
                imageUrl: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400',
                publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                formattedDate: 'منذ 8 ساعات'
            },
            {
                id: '4',
                title: 'Global Vaccine Distribution Reaches New Milestone',
                description: 'WHO reports that over 10 billion vaccine doses have been administered worldwide.',
                content: 'The global vaccination effort continues to gain momentum...',
                author: 'Global Health Team',
                source: { name: 'WHO News' },
                url: 'https://www.who.int/news',
                imageUrl: 'https://images.unsplash.com/photo-1615631648086-325025c9e51e?w=400',
                publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                formattedDate: 'منذ 12 ساعة'
            },
            {
                id: '5',
                title: 'AI Revolution in Drug Discovery Accelerates',
                description: 'Pharmaceutical companies report 50% faster drug development timelines using artificial intelligence.',
                content: 'The integration of AI into pharmaceutical research is transforming the industry...',
                author: 'Tech Health Writer',
                source: { name: 'BioPharma Dive' },
                url: 'https://www.biopharmadive.com',
                imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
                publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                formattedDate: 'منذ يوم'
            },
            {
                id: '6',
                title: 'New Guidelines Released for Diabetes Treatment',
                description: 'American Diabetes Association updates treatment recommendations with focus on personalized medicine.',
                content: 'The updated guidelines emphasize patient-centered care...',
                author: 'Clinical Editor',
                source: { name: 'Diabetes Care' },
                url: 'https://diabetesjournals.org',
                imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400',
                publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                formattedDate: 'منذ يومين'
            }
        ];
        
        return { success: true, data: mockNews, totalResults: mockNews.length };
    },

    /**
     * البحث في الأخبار
     */
    async searchNews(query) {
        const allNews = await this.getNews();
        const filtered = allNews.data.filter(article =>
            article.title.toLowerCase().includes(query.toLowerCase()) ||
            article.description.toLowerCase().includes(query.toLowerCase())
        );
        return { success: true, data: filtered, totalResults: filtered.length };
    },

    /**
     * البحث عن أدوية بالاسم التجاري فقط
     */
    async searchByBrandName(brandName, limit = 20) {
        try {
            const response = await fetch(
                `${this.OPENFDA_URL}/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(brandName)}"&limit=${limit}`
            );
            
            if (!response.ok) {
                if (response.status === 404) return { success: true, data: [] };
                throw new Error('فشل البحث');
            }
            
            const data = await response.json();
            const drugs = (data.results || []).map(drug => ({
                id: drug.id || Math.random().toString(36).substr(2, 9),
                brandName: drug.openfda?.brand_name?.[0] || 'غير متوفر',
                genericName: drug.openfda?.generic_name?.[0] || 'غير متوفر',
                manufacturer: drug.openfda?.manufacturer_name?.[0] || 'غير متوفر',
                productType: drug.openfda?.product_type?.[0] || 'غير متوفر',
                route: drug.openfda?.route?.[0] || 'غير متوفر',
                substanceName: drug.openfda?.substance_name?.[0] || 'غير متوفر',
                dosageForm: drug.openfda?.dosage_form?.[0] || 'غير متوفر',
                source: 'openFDA'
            }));
            
            return { success: true, data: drugs, totalResults: drugs.length };
        } catch (error) {
            console.error('Brand Search Error:', error);
            return { success: true, data: [] };
        }
    },

    /**
     * الحصول على الأدوية الخطرة (ذات أعراض جانبية خطيرة)
     */
    async getDangerousDrugs(limit = 20) {
        try {
            const response = await fetch(
                `${this.OPENFDA_URL}/drug/event.json?search=serious:1+AND+(seriousnessdeath:1+OR+seriousnesslifethreatening:1)&count=patient.drug.medicinalproduct.exact&limit=${limit}`
            );
            
            if (!response.ok) {
                if (response.status === 404) return { success: true, data: [] };
                throw new Error('فشل في جلب البيانات');
            }
            
            const data = await response.json();
            const drugs = (data.results || []).map(item => ({
                drugName: item.term,
                reportCount: item.count,
                riskLevel: item.count > 1000 ? 'عالي الخطورة' : item.count > 500 ? 'متوسط الخطورة' : 'منخفض الخطورة'
            }));
            
            return { success: true, data: drugs };
        } catch (error) {
            console.error('Dangerous Drugs Error:', error);
            return { success: true, data: [] };
        }
    },

    /**
     * الحصول على أحدث حالات سحب الأدوية
     */
    async getRecentRecalls(options = {}) {
        const { limit = 20, classification = '', status = '' } = options;
        
        try {
            let url = `${this.OPENFDA_URL}/drug/enforcement.json?limit=${limit}&sort=recall_initiation_date:desc`;
            
            const searchParams = [];
            if (status) searchParams.push(`status:"${status}"`);
            if (classification) searchParams.push(`classification:"${classification}"`);
            
            if (searchParams.length > 0) {
                url += `&search=${searchParams.join('+AND+')}`;
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) return { success: true, data: [] };
                throw new Error('فشل في جلب البيانات');
            }
            
            const data = await response.json();
            const recalls = (data.results || []).map(recall => ({
                recallNumber: recall.recall_number,
                productDescription: recall.product_description,
                reason: recall.reason_for_recall,
                classification: recall.classification,
                classificationDescription: this.getClassificationDescription(recall.classification),
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
            }));
            
            return { success: true, data: recalls };
        } catch (error) {
            console.error('Recent Recalls Error:', error);
            return { success: true, data: [] };
        }
    },

    /**
     * البحث عن حالات سحب لدواء معين
     */
    async searchRecallsByDrug(drugName, limit = 10) {
        try {
            const response = await fetch(
                `${this.OPENFDA_URL}/drug/enforcement.json?search=product_description:"${encodeURIComponent(drugName)}"+OR+openfda.brand_name:"${encodeURIComponent(drugName)}"+OR+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=${limit}&sort=recall_initiation_date:desc`
            );
            
            if (!response.ok) {
                if (response.status === 404) return { success: true, data: [] };
                throw new Error('فشل في جلب البيانات');
            }
            
            const data = await response.json();
            const recalls = (data.results || []).map(recall => ({
                recallNumber: recall.recall_number,
                productDescription: recall.product_description,
                reason: recall.reason_for_recall,
                classification: recall.classification,
                classificationDescription: this.getClassificationDescription(recall.classification),
                status: recall.status,
                recallInitiationDate: recall.recall_initiation_date,
                recallingFirm: recall.recalling_firm,
                city: recall.city,
                state: recall.state,
                country: recall.country
            }));
            
            return { success: true, data: recalls };
        } catch (error) {
            console.error('Recall Search Error:', error);
            return { success: true, data: [] };
        }
    },

    /**
     * الحصول على إحصائيات الأعراض الجانبية لدواء
     */
    async getAdverseEventStats(drugName) {
        try {
            const response = await fetch(
                `${this.OPENFDA_URL}/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&count=patient.reaction.reactionmeddrapt.exact`
            );
            
            if (!response.ok) {
                if (response.status === 404) return { success: true, data: { topReactions: [], totalReports: 0 } };
                throw new Error('فشل في جلب البيانات');
            }
            
            const data = await response.json();
            
            return {
                success: true,
                data: {
                    topReactions: (data.results || []).slice(0, 10).map(r => ({
                        reaction: r.term,
                        count: r.count
                    })),
                    totalReports: data.meta?.results?.total || 0
                }
            };
        } catch (error) {
            console.error('Adverse Stats Error:', error);
            return { success: true, data: { topReactions: [], totalReports: 0 } };
        }
    },

    /**
     * وصف تصنيف السحب
     */
    getClassificationDescription(classification) {
        const descriptions = {
            'Class I': 'خطير: قد يسبب مشاكل صحية خطيرة أو الوفاة',
            'Class II': 'متوسط: قد يسبب مشاكل صحية مؤقتة أو قابلة للعلاج',
            'Class III': 'منخفض: من غير المحتمل أن يسبب مشاكل صحية'
        };
        return descriptions[classification] || 'غير محدد';
    }
};

Object.freeze(API);
