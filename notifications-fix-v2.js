/**
 * إصلاح مشاكل نظام التنبيهات - الإصدار 2
 * يعالج هذا الملف المشاكل الرئيسية في نظام التنبيهات:
 * 1. مشكلة عدم العثور على مصفوفة المستثمرين
 * 2. مشكلة Maximum call stack size exceeded في دالة formatCurrency
 * 3. مشكلة اختفاء المستثمرين من الصفحة
 */

(function() {
    // تنفيذ الإصلاح عند تحميل الصفحة
    console.log("تطبيق إصلاح مشاكل نظام التنبيهات - الإصدار 2...");
    
    // التأكد من تحميل الصفحة بالكامل قبل تطبيق الإصلاحات
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFixes);
    } else {
        applyFixes();
    }
    
    /**
     * تطبيق جميع الإصلاحات
     */
    function applyFixes() {
        try {
            // 1. إصلاح مشكلة دالة تنسيق العملة (تكرار لا نهائي)
            fixFormatCurrencyFunction();
            
            // 2. إصلاح مشكلة الوصول إلى مصفوفة المستثمرين
            fixInvestorsArrayAccess();
            
            // 3. إصلاح مشكلة عرض المستثمرين
            fixInvestorsRendering();
            
            // 4. إصلاح مشكلة التحديث التلقائي للتنبيهات
            fixNotificationsUpdate();
            
            console.log("تم تطبيق إصلاحات نظام التنبيهات بنجاح!");
        } catch (error) {
            console.error("حدث خطأ أثناء تطبيق إصلاحات نظام التنبيهات:", error);
        }
    }
    
    /**
     * إصلاح مشكلة دالة تنسيق العملة (تكرار لا نهائي)
     */
    function fixFormatCurrencyFunction() {
        // التحقق من وجود دالة formatCurrency في نظام التنبيهات
        if (window.notificationsSystem) {
            // تعريف دالة تنسيق العملة الآمنة في نظام التنبيهات
            const safeFormatCurrency = function(amount) {
                // التحقق من صحة المبلغ
                if (amount === undefined || amount === null || isNaN(amount)) {
                    return "0";
                }
                
                // استخدام تنسيق بسيط للعملة
                const currency = window.settings && window.settings.currency ? window.settings.currency : 'دينار';
                return amount.toLocaleString() + " " + currency;
            };
            
            // استبدال دالة formatCurrency في نظام التنبيهات
            Object.defineProperty(window, '_originalFormatCurrency', {
                value: window.formatCurrency,
                writable: false,
                configurable: false
            });
            
            // استبدال formatCurrency في window
            window.formatCurrency = function(amount, includeSymbol) {
                // التأكد من أن الدالة تستدعي نفسها مرة واحدة فقط
                if (this._isCallingFormatCurrency) {
                    return safeFormatCurrency(amount);
                }
                
                // تعيين علامة الاستدعاء
                this._isCallingFormatCurrency = true;
                
                try {
                    // استدعاء الدالة الأصلية إذا كانت موجودة
                    if (typeof window._originalFormatCurrency === 'function') {
                        const result = window._originalFormatCurrency(amount, includeSymbol);
                        this._isCallingFormatCurrency = false;
                        return result;
                    } else {
                        // استخدام التنسيق البسيط
                        const result = safeFormatCurrency(amount);
                        this._isCallingFormatCurrency = false;
                        return result;
                    }
                } catch (error) {
                    console.error("خطأ في تنسيق العملة:", error);
                    this._isCallingFormatCurrency = false;
                    return safeFormatCurrency(amount);
                }
            };
            
            console.log("تم إصلاح دالة تنسيق العملة بنجاح!");
        }
    }
    
    /**
     * إصلاح مشكلة الوصول إلى مصفوفة المستثمرين
     */
    function fixInvestorsArrayAccess() {
        // التحقق من وجود نظام التنبيهات
        if (!window.notificationsSystem) {
            console.warn("نظام التنبيهات غير موجود!");
            return;
        }
        
        // تعريف دالة آمنة للحصول على مصفوفة المستثمرين
        const safeGetInvestors = function() {
            // التحقق من وجود مصفوفة المستثمرين في window
            if (window.investors && Array.isArray(window.investors)) {
                return window.investors;
            }
            
            // محاولة استرجاع البيانات من التخزين المحلي
            try {
                const savedInvestors = localStorage.getItem('investors');
                if (savedInvestors) {
                    const parsedInvestors = JSON.parse(savedInvestors);
                    if (Array.isArray(parsedInvestors)) {
                        // تعيين المصفوفة في window للاستخدام مستقبلاً
                        window.investors = parsedInvestors;
                        return parsedInvestors;
                    }
                }
            } catch (error) {
                console.error("خطأ في استرجاع المستثمرين من التخزين المحلي:", error);
            }
            
            // إذا لم يتم العثور على المستثمرين، إرجاع مصفوفة فارغة
            return [];
        };
        
        // استبدال استدعاء window.investors بدالة آمنة في نظام التنبيهات
        const originalGetDueInvestors = window.notificationsSystem.getDueInvestors;
        
        if (typeof originalGetDueInvestors === 'function') {
            window.notificationsSystem.getDueInvestors = function() {
                try {
                    // استخدام دالة آمنة للحصول على المستثمرين
                    const investors = safeGetInvestors();
                    
                    // الاحتفاظ بنسخة مؤقتة للاستخدام في نظام التنبيهات
                    window._tempInvestors = investors;
                    
                    const dueInvestors = [];
                    const today = new Date();
                    
                    investors.forEach(investor => {
                        if (investor.status !== 'نشط' || !investor.investments || investor.investments.length === 0) {
                            return;
                        }
                        
                        const totalInvestment = investor.amount || 0;
                        if (totalInvestment <= 0) {
                            return;
                        }
                        
                        // اختيار أقدم تاريخ استثمار
                        const oldestInvestment = investor.investments.reduce((oldest, current) => {
                            if (!oldest) return current;
                            
                            const oldestDate = new Date(oldest.date);
                            const currentDate = new Date(current.date);
                            return currentDate < oldestDate ? current : oldest;
                        }, null);
                        
                        if (!oldestInvestment) {
                            return;
                        }
                        
                        const investmentDate = new Date(oldestInvestment.date);
                        const daysElapsed = Math.floor((today - investmentDate) / (1000 * 60 * 60 * 24));
                        
                        // الحصول على دورة الأرباح من الإعدادات
                        const profitCycle = window.settings?.profitCycle || 30; // افتراضي: 30 يوم
                        
                        // حساب ما إذا كان المستثمر مستحقًا للربح
                        if (daysElapsed >= profitCycle) {
                            // حساب الربح المستحق
                            let profit = 0;
                            
                            // التأكد من وجود استثمارات
                            if (investor.investments && Array.isArray(investor.investments)) {
                                profit = investor.investments.reduce((total, inv) => {
                                    // استخدام دالة حساب الفائدة إذا كانت موجودة
                                    if (typeof window.calculateInterest === 'function') {
                                        return total + window.calculateInterest(inv.amount, inv.date);
                                    }
                                    
                                    // حساب بسيط للفائدة إذا لم تكن الدالة موجودة
                                    const rate = window.settings?.interestRate || 17.5;
                                    return total + (inv.amount * (rate / 100));
                                }, 0);
                            }
                            
                            // إضافة المستثمر إلى القائمة مع الربح المستحق
                            dueInvestors.push({
                                investor: investor,
                                profit: profit,
                                daysElapsed: daysElapsed,
                                dueDate: new Date(investmentDate.getTime() + (profitCycle * 24 * 60 * 60 * 1000))
                            });
                        }
                    });
                    
                    // ترتيب القائمة حسب أقدمية تاريخ الاستحقاق
                    dueInvestors.sort((a, b) => a.dueDate - b.dueDate);
                    
                    return dueInvestors;
                } catch (error) {
                    console.error("خطأ في الحصول على المستثمرين المستحقين للربح:", error);
                    return [];
                }
            };
        }
        
        console.log("تم إصلاح مشكلة الوصول إلى مصفوفة المستثمرين بنجاح!");
    }
    
    /**
     * إصلاح مشكلة عرض المستثمرين في الجدول
     */
    function fixInvestorsRendering() {
        // حفظ نسخة من دالة renderInvestorsTable الأصلية
        if (window.renderInvestorsTable) {
            const originalRenderInvestorsTable = window.renderInvestorsTable;
            
            // استبدال الدالة بنسخة محسنة
            window.renderInvestorsTable = function() {
                try {
                    console.log('عرض جدول المستثمرين (نسخة محسنة)...');
                    
                    // التأكد من وجود مصفوفة المستثمرين قبل العرض
                    if (!window.investors || !Array.isArray(window.investors)) {
                        console.error('مصفوفة المستثمرين غير موجودة أو غير صحيحة');
                        
                        // محاولة استرجاع المستثمرين من التخزين المحلي
                        try {
                            const savedInvestors = localStorage.getItem('investors');
                            if (savedInvestors) {
                                window.investors = JSON.parse(savedInvestors);
                                console.log(`تم استرجاع ${window.investors.length} مستثمر من التخزين المحلي`);
                            }
                        } catch (storageError) {
                            console.error("خطأ في استرجاع المستثمرين من التخزين المحلي:", storageError);
                        }
                        
                        // إذا ما زالت المصفوفة غير موجودة، نتوقف
                        if (!window.investors || !Array.isArray(window.investors)) {
                            return;
                        }
                    }
                    
                    // التأكد من وجود العنصر المستهدف
                    const tableBody = document.querySelector('#investors-table tbody');
                    if (!tableBody) {
                        console.error('لم يتم العثور على جدول المستثمرين');
                        return;
                    }
                    
                    // حفظ المحتوى الحالي للجدول
                    const currentTableHTML = tableBody.innerHTML;
                    
                    // تجربة تنفيذ الدالة الأصلية
                    originalRenderInvestorsTable.apply(this, arguments);
                    
                    // التحقق مما إذا كان الجدول فارغاً بعد التنفيذ
                    if (tableBody.children.length === 0 || (tableBody.children.length === 1 && tableBody.querySelector('td.text-center'))) {
                        console.warn('تم تفريغ جدول المستثمرين، استعادة المحتوى السابق...');
                        
                        // إعادة المحتوى السابق
                        tableBody.innerHTML = currentTableHTML;
                        
                        // محاولة إعادة إضافة مستمعي الأحداث
                        setupInvestorActionButtons();
                    }
                } catch (error) {
                    console.error('خطأ في عرض جدول المستثمرين:', error);
                }
            };
        }
        
        // إضافة دالة آمنة لعرض جدول المستثمرين
        window.safeRenderInvestorsTable = function() {
            try {
                if (typeof window.renderInvestorsTable === 'function') {
                    window.renderInvestorsTable();
                }
            } catch (error) {
                console.error('خطأ في العرض الآمن لجدول المستثمرين:', error);
            }
        };
        
        console.log("تم إصلاح مشكلة عرض المستثمرين بنجاح!");
    }
    
    /**
     * إصلاح مشكلة التحديث التلقائي للتنبيهات
     */
    function fixNotificationsUpdate() {
        // التأكد من وجود نظام التنبيهات
        if (!window.notificationsSystem) {
            return;
        }
        
        // استبدال دالة تحديث التنبيهات بنسخة آمنة
        const originalUpdateNotifications = window.notificationsSystem.update;
        
        if (typeof originalUpdateNotifications === 'function') {
            window.notificationsSystem.update = function() {
                try {
                    // تنفيذ الدالة الأصلية في محاولة/خطأ لتجنب تأثيرها على باقي التطبيق
                    originalUpdateNotifications.apply(this, arguments);
                } catch (error) {
                    console.error('خطأ في تحديث التنبيهات:', error);
                }
            };
        }
        
        // تعديل طريقة بدء وإيقاف التحديث التلقائي
        if (window.notificationsSystem.setupNotificationsEvents) {
            const originalSetupEvents = window.notificationsSystem.setupNotificationsEvents;
            
            window.notificationsSystem.setupNotificationsEvents = function() {
                try {
                    // إزالة أي مؤقت سابق
                    if (window._notificationsUpdateInterval) {
                        clearInterval(window._notificationsUpdateInterval);
                    }
                    
                    // إنشاء مؤقت جديد لتحديث التنبيهات كل 5 دقائق بدلاً من دقيقة واحدة
                    window._notificationsUpdateInterval = setInterval(() => {
                        try {
                            if (window.notificationsSystem && typeof window.notificationsSystem.update === 'function') {
                                window.notificationsSystem.update();
                            }
                        } catch (error) {
                            console.error('خطأ في تحديث التنبيهات الدوري:', error);
                        }
                    }, 300000); // كل 5 دقائق
                    
                    // استدعاء الدالة الأصلية
                    originalSetupEvents.apply(this, arguments);
                } catch (error) {
                    console.error('خطأ في إعداد مستمعي أحداث التنبيهات:', error);
                }
            };
        }
        
        console.log("تم إصلاح مشكلة التحديث التلقائي للتنبيهات بنجاح!");
    }
    
    /**
     * إعادة إضافة مستمعي الأحداث لأزرار إجراءات المستثمرين
     */
    function setupInvestorActionButtons() {
        // أزرار عرض تفاصيل المستثمر
        const viewButtons = document.querySelectorAll('.view-investor');
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const investorId = this.getAttribute('data-id');
                if (typeof window.showInvestorDetails === 'function') {
                    window.showInvestorDetails(investorId);
                }
            });
        });
        
        // أزرار تعديل المستثمر
        const editButtons = document.querySelectorAll('.edit-investor');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const investorId = this.getAttribute('data-id');
                if (typeof window.editInvestor === 'function') {
                    window.editInvestor(investorId);
                }
            });
        });
        
        // أزرار حذف المستثمر
        const deleteButtons = document.querySelectorAll('.delete-investor');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const investorId = this.getAttribute('data-id');
                if (typeof window.deleteInvestor === 'function') {
                    window.deleteInvestor(investorId);
                }
            });
        });
    }
})();