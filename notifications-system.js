/**
 * دمج نظام التنبيهات مع التطبيق الأساسي
 * يحتوي هذا الملف على التعديلات اللازمة لربط نظام التنبيهات مع وظائف التطبيق الأساسية
 */

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة نظام التنبيهات
    if (window.notificationsSystem && typeof window.notificationsSystem.init === 'function') {
        window.notificationsSystem.init();
    } else {
        console.error('نظام التنبيهات غير متوفر');
    }
    
    // تعديل دوال التطبيق الأساسية لإضافة تنبيهات النظام
    extendAppFunctions();
});

/**
 * تعديل دوال التطبيق الأساسية لإضافة تنبيهات النظام
 */
function extendAppFunctions() {
    console.log('تعديل دوال التطبيق لدمج نظام التنبيهات...');
    
    // تعديل دالة إضافة مستثمر جديد
    if (window.addNewInvestor) {
        const originalAddNewInvestor = window.addNewInvestor;
        window.addNewInvestor = function() {
            // استدعاء الدالة الأصلية
            const result = originalAddNewInvestor.apply(this, arguments);
            
            // إضافة تنبيه للنظام إذا تمت العملية بنجاح
            if (result !== false) {
                // الحصول على معلومات المستثمر الجديد
                const latestInvestor = window.investors[window.investors.length - 1];
                
                // إضافة تنبيه
                if (window.notificationsSystem && latestInvestor) {
                    window.notificationsSystem.addSystemNotification('new-investor', {
                        investorId: latestInvestor.id,
                        investorName: latestInvestor.name
                    });
                }
            }
            
            return result;
        };
    }
    
    // تعديل دالة إضافة إيداع
    if (window.addDeposit) {
        const originalAddDeposit = window.addDeposit;
        window.addDeposit = function() {
            // استدعاء الدالة الأصلية
            const result = originalAddDeposit.apply(this, arguments);
            
            // إضافة تنبيه للنظام إذا تمت العملية بنجاح
            if (result !== false) {
                // الحصول على معلومات الإيداع الجديد
                const depositInvestorSelect = document.getElementById('deposit-investor');
                const depositAmountInput = document.getElementById('deposit-amount');
                
                if (depositInvestorSelect && depositAmountInput) {
                    const investorId = depositInvestorSelect.value;
                    const amount = parseFloat(depositAmountInput.value);
                    
                    // العثور على المستثمر
                    const investor = window.investors.find(inv => inv.id === investorId);
                    
                    // إضافة تنبيه
                    if (window.notificationsSystem && investor) {
                        window.notificationsSystem.addSystemNotification('deposit', {
                            investorId: investor.id,
                            investorName: investor.name,
                            amount: amount
                        });
                    }
                }
            }
            
            return result;
        };
    }
    
    // تعديل دالة سحب مبلغ
    if (window.withdrawAmount) {
        const originalWithdrawAmount = window.withdrawAmount;
        window.withdrawAmount = function() {
            // استدعاء الدالة الأصلية
            const result = originalWithdrawAmount.apply(this, arguments);
            
            // إضافة تنبيه للنظام إذا تمت العملية بنجاح
            if (result !== false) {
                // الحصول على معلومات السحب
                const withdrawInvestorSelect = document.getElementById('withdraw-investor');
                const withdrawAmountInput = document.getElementById('withdraw-amount');
                
                if (withdrawInvestorSelect && withdrawAmountInput) {
                    const investorId = withdrawInvestorSelect.value;
                    const amount = parseFloat(withdrawAmountInput.value);
                    
                    // العثور على المستثمر
                    const investor = window.investors.find(inv => inv.id === investorId);
                    
                    // إضافة تنبيه
                    if (window.notificationsSystem && investor) {
                        window.notificationsSystem.addSystemNotification('withdrawal', {
                            investorId: investor.id,
                            investorName: investor.name,
                            amount: amount
                        });
                    }
                }
            }
            
            return result;
        };
    }
    
    // تعديل دالة دفع الأرباح
    if (window.payProfit) {
        const originalPayProfit = window.payProfit;
        window.payProfit = function() {
            // استدعاء الدالة الأصلية
            const result = originalPayProfit.apply(this, arguments);
            
            // إضافة تنبيه للنظام إذا تمت العملية بنجاح
            if (result !== false) {
                // الحصول على معلومات دفع الأرباح
                const profitInvestorSelect = document.getElementById('profit-investor');
                
                if (profitInvestorSelect) {
                    const investorId = profitInvestorSelect.value;
                    
                    // العثور على المستثمر
                    const investor = window.investors.find(inv => inv.id === investorId);
                    
                    // حساب الربح المدفوع (استخدام آخر عملية)
                    const latestTransaction = window.transactions
                        .filter(tr => tr.investorId === investorId && tr.type === 'دفع أرباح')
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                    
                    // إضافة تنبيه
                    if (window.notificationsSystem && investor && latestTransaction) {
                        window.notificationsSystem.addSystemNotification('profit-payment', {
                            investorId: investor.id,
                            investorName: investor.name,
                            amount: latestTransaction.amount
                        });
                        
                        // تحديث نظام التنبيهات بعد دفع الأرباح
                        window.notificationsSystem.update();
                    }
                }
            }
            
            return result;
        };
    }
    
    // تعديل دالة تحديث لوحة التحكم
    if (window.updateDashboard) {
        const originalUpdateDashboard = window.updateDashboard;
        window.updateDashboard = function() {
            // استدعاء الدالة الأصلية
            const result = originalUpdateDashboard.apply(this, arguments);
            
            // تحديث نظام التنبيهات
            if (window.notificationsSystem) {
                window.notificationsSystem.update();
            }
            
            return result;
        };
    }
    
    console.log('تم تعديل دوال التطبيق لدمج نظام التنبيهات بنجاح');
}

/**
 * ربط شاشة الأرباح المستحقة بنظام التنبيهات
 */
function connectProfitsPageWithNotifications() {
    // تعديل دالة عرض جدول الأرباح
    if (window.renderProfitsTable) {
        const originalRenderProfitsTable = window.renderProfitsTable;
        window.renderProfitsTable = function() {
            // استدعاء الدالة الأصلية
            const result = originalRenderProfitsTable.apply(this, arguments);
            
            // تحديث نظام التنبيهات
            if (window.notificationsSystem) {
                window.notificationsSystem.update();
            }
            
            return result;
        };
    }
}

/**
 * إضافة وظيفة فتح شاشة الأرباح المستحقة من التنبيهات
 */
function openDueProfitsPage() {
    // الانتقال إلى صفحة الأرباح
    if (typeof window.showPage === 'function') {
        window.showPage('profits');
    }
    
    // إغلاق نافذة التنبيهات
    if (typeof window.closeModal === 'function') {
        window.closeModal('notifications-modal');
    }
}

// ربط وظائف نظام التنبيهات مع وظائف النظام الأساسي
document.addEventListener('DOMContentLoaded', function() {
    // ربط شاشة الأرباح المستحقة بنظام التنبيهات
    connectProfitsPageWithNotifications();
    
    // إضافة وظيفة فتح شاشة الأرباح المستحقة من التنبيهات
    window.openDueProfitsPage = openDueProfitsPage;
});