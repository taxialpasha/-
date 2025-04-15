/**
 * إصلاح مشكلة اختفاء المستثمرين في نظام التنبيهات
 * هذا الملف يحتوي على تعديلات وإصلاحات لمشكلة عدم ظهور المستثمرين بعد إضافة نظام التنبيهات
 */

// تنفيذ الإصلاح عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('تطبيق إصلاح مشكلة اختفاء المستثمرين...');
    
    // إصلاح دوال نظام التنبيهات
    fixNotificationsSystem();
    
    // إصلاح دوال عرض المستثمرين
    fixInvestorsRendering();
    
    // إعادة تهيئة نظام التنبيهات بعد التأكد من تحميل جميع البيانات
    setTimeout(() => {
        if (window.notificationsSystem && typeof window.notificationsSystem.init === 'function') {
            window.notificationsSystem.init();
        }
    }, 1000);
});

/**
 * إصلاح نظام التنبيهات لتجنب تعارضه مع عرض المستثمرين
 */
function fixNotificationsSystem() {
    // التأكد من وجود كائن نظام التنبيهات
    if (!window.notificationsSystem) {
        console.error('نظام التنبيهات غير متوفر');
        return;
    }
    
    // حفظ نسخة من الدالة الأصلية لتحديث التنبيهات
    const originalUpdateNotifications = window.notificationsSystem.update;
    
    // استبدال دالة تحديث التنبيهات بنسخة آمنة
    window.notificationsSystem.update = function() {
        try {
            // تنفيذ الدالة الأصلية في محاولة/خطأ لتجنب تأثيرها على باقي التطبيق
            originalUpdateNotifications.apply(this, arguments);
        } catch (error) {
            console.error('خطأ في تحديث التنبيهات:', error);
        }
        
        // التأكد من إعادة عرض المستثمرين بعد تحديث التنبيهات
        safeRenderInvestorsTable();
    };
    
    // تعديل طريقة الحصول على المستثمرين المستحقين للربح
    if (window.notificationsSystem.getDueInvestors) {
        const originalGetDueInvestors = window.notificationsSystem.getDueInvestors;
        
        window.notificationsSystem._getDueInvestors = function() {
            try {
                // استخدام نسخة من مصفوفة المستثمرين لتجنب تعديلها
                const investorsCopy = window.investors ? [...window.investors] : [];
                
                // العمل على النسخة بدلاً من الأصل
                window._tempInvestors = investorsCopy;
                
                // استدعاء الدالة الأصلية ولكن مع تعديل مؤقت للكائن window.investors
                const originalInvestors = window.investors;
                window.investors = investorsCopy;
                
                const result = originalGetDueInvestors.apply(this, arguments);
                
                // إعادة الكائن الأصلي
                window.investors = originalInvestors;
                
                return result;
            } catch (error) {
                console.error('خطأ في الحصول على المستثمرين المستحقين للربح:', error);
                return [];
            }
        };
    }
}

/**
 * إصلاح عرض المستثمرين في الجدول
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
                    return;
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

// تطبيق إصلاحات إضافية بعد تحميل الصفحة بالكامل
window.addEventListener('load', function() {
    // تأخير لضمان تحميل جميع البيانات
    setTimeout(() => {
        // إعادة عرض صفحة المستثمرين إذا كانت نشطة
        const investorsPage = document.getElementById('investors-page');
        if (investorsPage && investorsPage.classList.contains('active')) {
            safeRenderInvestorsTable();
        }
        
        // إضافة مستمع حدث للتنقل بين الصفحات
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                const pageId = this.getAttribute('data-page');
                if (pageId === 'investors') {
                    // تأخير قصير قبل عرض المستثمرين
                    setTimeout(safeRenderInvestorsTable, 200);
                }
            });
        });
    }, 500);
});

/**
 * تعديل وظيفة نظام التنبيهات للعمل بشكل آمن
 */
function safePatchNotificationsSystem() {
    // التحقق من وجود نظام التنبيهات
    if (!window.notificationsSystem) {
        return;
    }
    
    // الدوال الأساسية التي نحتاج إلى تعديلها
    const functionsToSafePatch = [
        'init',
        'update',
        'add',
        'addSystemNotification',
        'markAllNotificationsAsRead'
    ];
    
    // تطبيق التعديل على كل دالة
    functionsToSafePatch.forEach(funcName => {
        if (typeof window.notificationsSystem[funcName] === 'function') {
            const originalFunc = window.notificationsSystem[funcName];
            
            // استبدال الدالة بنسخة آمنة
            window.notificationsSystem[funcName] = function() {
                try {
                    return originalFunc.apply(this, arguments);
                } catch (error) {
                    console.error(`خطأ في تنفيذ ${funcName}:`, error);
                    return null;
                }
            };
        }
    });
}

// تنفيذ التعديل الآمن لنظام التنبيهات
document.addEventListener('DOMContentLoaded', safePatchNotificationsSystem);