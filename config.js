/**
 * نظام الاستثمار المتكامل - ملف الإعدادات المصحح
 * يحتوي على الثوابت والإعدادات الأساسية للنظام وتعديل آلية احتساب الأرباح
 */

// إعدادات النظام
const SYSTEM_CONFIG = {
    // إعدادات عامة
    systemName: "نظام الاستثمار المتكامل",
    currency: "دينار",
    language: "ar",
    
    // إعدادات الأرباح
    interestRate: 17.5, // نسبة الربح الشهري (17.5 دينار لكل 1000 دينار)
    profitCalculation: "daily", // طريقة حساب الأرباح (daily, monthly)
    profitCycle: 30, // دورة دفع الأرباح بالأيام
    
    // إعدادات الإشعارات
    reminderDays: 3, // التذكير قبل استحقاق الأرباح (أيام)
    emailNotifications: {
        newInvestor: true,
        profitPayment: true,
        withdrawal: true
    },
    
    // إعدادات النسخ الاحتياطي
    backup: {
        enabled: true,
        frequency: "weekly" // daily, weekly, monthly
    }
};

// حالات المستثمرين
const INVESTOR_STATUS = {
    ACTIVE: "نشط",
    PENDING: "قيد المراجعة",
    INACTIVE: "غير نشط"
};

// أنواع العمليات
const TRANSACTION_TYPES = {
    DEPOSIT: "إيداع",
    WITHDRAW: "سحب",
    PROFIT: "دفع أرباح"
};

// حالات العمليات
const TRANSACTION_STATUS = {
    COMPLETED: "مكتملة",
    PENDING: "قيد التنفيذ",
    FAILED: "فشلت"
};

// حالات الأرباح
const PROFIT_STATUS = {
    PENDING: "قيد الانتظار",
    PAID: "مدفوعة"
};

// وظيفة التنسيق المالي (لعرض المبالغ)
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-EG', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(amount);
}

// وظيفة تنسيق التاريخ
function formatDate(date) {
    // التحقق من وجود التاريخ أولاً
    if (!date) {
        return 'غير محدد';
    }
    
    // محاولة إنشاء كائن تاريخ صالح
    let validDate;
    try {
        validDate = new Date(date);
        // التحقق من صحة التاريخ
        if (isNaN(validDate.getTime())) {
            return 'تاريخ غير صالح';
        }
    } catch (error) {
        return 'تاريخ غير صالح';
    }
    
    // تنسيق التاريخ
    try {
        return validDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    } catch (error) {
        // استخدام تنسيق بديل في حالة فشل التنسيق
        return `${validDate.getFullYear()}-${(validDate.getMonth() + 1).toString().padStart(2, '0')}-${validDate.getDate().toString().padStart(2, '0')}`;
    }
}

// وظيفة تنسيق التاريخ مع الوقت
function formatDateTime(date) {
    // التحقق من وجود التاريخ أولاً
    if (!date) {
        return 'غير محدد';
    }
    
    // محاولة إنشاء كائن تاريخ صالح
    let validDate;
    try {
        validDate = new Date(date);
        // التحقق من صحة التاريخ
        if (isNaN(validDate.getTime())) {
            return 'تاريخ غير صالح';
        }
    } catch (error) {
        return 'تاريخ غير صالح';
    }
    
    // تنسيق التاريخ والوقت
    try {
        return validDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
    } catch (error) {
        // استخدام تنسيق بديل في حالة فشل التنسيق
        return `${validDate.getFullYear()}-${(validDate.getMonth() + 1).toString().padStart(2, '0')}-${validDate.getDate().toString().padStart(2, '0')} ${validDate.getHours().toString().padStart(2, '0')}:${validDate.getMinutes().toString().padStart(2, '0')}`;
    }
}

/**
 * وظيفة حساب الربح المعدلة
 * تحسب الربح بناءً على المعادلة الجديدة: 17,000 دينار لكل مليون دينار
 * أي ما يعادل 1.7% شهرياً (أو 17.5 دينار لكل 1000 دينار)
 * 
 * @param {number} amount - المبلغ المستثمر
 * @param {number} days - عدد أيام الاستثمار
 * @returns {number} - مبلغ الربح
 */
function calculateProfit(amount, days) {
    // التحقق من البيانات المدخلة
    if (!amount || isNaN(amount) || amount <= 0) {
        return 0;
    }
    
    if (!days || isNaN(days) || days <= 0) {
        days = 30; // استخدام القيمة الافتراضية إذا كانت غير صالحة
    }
    
    // القيمة الثابتة: 17.5 دينار لكل 1000 دينار شهرياً
    const monthlyRatePerThousand = SYSTEM_CONFIG.interestRate;
    
    // حساب الربح الشهري
    let monthlyProfit = (amount / 1000) * monthlyRatePerThousand;
    
    // حساب الربح اليومي
    if (SYSTEM_CONFIG.profitCalculation === 'daily') {
        // حساب الربح حسب عدد الأيام (جزء من الشهر)
        return (monthlyProfit / 30) * days;
    } else {
        // حساب الربح الشهري كاملاً بغض النظر عن عدد الأيام
        return monthlyProfit;
    }
}

// وظيفة لإنشاء معرف فريد
function generateId(prefix = "") {
    return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

// وظيفة حساب الفرق بين تاريخين بالأيام
function daysBetween(startDate, endDate) {
    // التحقق من وجود التاريخين
    if (!startDate || !endDate) {
        return 0;
    }
    
    // محاولة إنشاء كائنات تاريخ صالحة
    let validStartDate, validEndDate;
    try {
        validStartDate = new Date(startDate);
        validEndDate = new Date(endDate);
        
        // التحقق من صحة التواريخ
        if (isNaN(validStartDate.getTime()) || isNaN(validEndDate.getTime())) {
            return 0;
        }
    } catch (error) {
        return 0;
    }
    
    // تحويل الفرق من ميلي ثانية إلى أيام
    const differenceMs = Math.abs(validEndDate - validStartDate);
    return Math.floor(differenceMs / (1000 * 60 * 60 * 24));
}

// تحميل الإعدادات من التخزين المحلي إذا وجدت
function loadSystemConfig() {
    const savedConfig = localStorage.getItem('systemConfig');
    if (savedConfig) {
        try {
            const parsedConfig = JSON.parse(savedConfig);
            Object.assign(SYSTEM_CONFIG, parsedConfig);
        } catch (error) {
            console.error("خطأ في تحميل الإعدادات:", error);
        }
    }
}

// حفظ الإعدادات في التخزين المحلي
function saveSystemConfig() {
    try {
        localStorage.setItem('systemConfig', JSON.stringify(SYSTEM_CONFIG));
        return true;
    } catch (error) {
        console.error("خطأ في حفظ الإعدادات:", error);
        return false;
    }
}

// تحميل الإعدادات عند بدء التشغيل
loadSystemConfig();