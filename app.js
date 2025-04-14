/**
 * نظام الاستثمار المتكامل - تطبيق الواجهة الرئيسية
 * الملف الرئيسي للتطبيق
 */

// نموذج البيانات
let investors = [];
let transactions = [];
let settings = {
    interestRate: 17.5,
    reminderDays: 3,
    currency: 'دينار',
    language: 'ar',
    systemName: 'نظام الاستثمار المتكامل',
    profitCalculation: 'daily',
    profitCycle: 30,
    autoBackup: true,
    backupFrequency: 'weekly'
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initNavigation();
    initEventListeners();
    updateDashboard();
    populateInvestorSelects();
    setCurrentDateAsDefault();
    setupSpeechRecognition();
    startReminders();
    initCharts();
});

// تحميل البيانات من التخزين المحلي
function loadData() {
    const savedInvestors = localStorage.getItem('investors');
    if (savedInvestors) {
        investors = JSON.parse(savedInvestors);
    }

    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }

    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        
        // التحقق من وجود العناصر قبل تعيين القيم
        const interestRateSetting = document.getElementById('interest-rate-setting');
        const reminderDays = document.getElementById('reminder-days');
        const interestRate = document.getElementById('interest-rate');
        
        if (interestRateSetting) interestRateSetting.value = settings.interestRate;
        if (reminderDays) reminderDays.value = settings.reminderDays;
        if (interestRate) interestRate.textContent = `${settings.interestRate}%`;
    }

    renderInvestorsTable();
    renderTransactionsTable();
    renderProfitsTable();
    renderRecentTransactions();
}

// حفظ البيانات في التخزين المحلي
function saveData() {
    localStorage.setItem('investors', JSON.stringify(investors));
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('settings', JSON.stringify(settings));
}

// تهيئة التنقل بين الصفحات
function initNavigation() {
    // التنقل بين الصفحات
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // إزالة الكلاس النشط من جميع الروابط
            navLinks.forEach(l => l.classList.remove('active'));
            
            // إضافة الكلاس النشط للرابط المحدد
            this.classList.add('active');
            
            // إظهار الصفحة المقابلة
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // التبديل بين التبويبات
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const tabContent = document.getElementById(`${tabId}-tab`);
            
            // إزالة الكلاس النشط من جميع الأزرار والمحتويات
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // إضافة الكلاس النشط للزر والمحتوى المحدد
            this.classList.add('active');
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });

    // أزرار فتح وإغلاق القائمة الجانبية
    document.querySelectorAll('.toggle-sidebar').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    });
}

// إظهار صفحة محددة
function showPage(pageId) {
    // إخفاء جميع الصفحات
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // إظهار الصفحة المطلوبة
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// تهيئة مستمعي الأحداث
function initEventListeners() {
    // فتح النوافذ المنبثقة
    const addInvestorBtn = document.getElementById('add-investor-btn');
    const addDepositBtn = document.getElementById('add-deposit-btn');
    const addWithdrawBtn = document.getElementById('add-withdraw-btn');
    const payProfitsBtn = document.getElementById('pay-profits-btn');
    const addNewFab = document.getElementById('add-new-fab');

    if (addInvestorBtn) addInvestorBtn.addEventListener('click', () => openModal('add-investor-modal'));
    if (addDepositBtn) addDepositBtn.addEventListener('click', () => openModal('add-deposit-modal'));
    if (addWithdrawBtn) addWithdrawBtn.addEventListener('click', () => openModal('add-withdraw-modal'));
    if (payProfitsBtn) payProfitsBtn.addEventListener('click', () => openModal('pay-profit-modal'));
    if (addNewFab) addNewFab.addEventListener('click', () => openModal('add-investor-modal'));
    
    // إغلاق النوافذ المنبثقة
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // حفظ البيانات
    const saveInvestorBtn = document.getElementById('save-investor-btn');
    const saveDepositBtn = document.getElementById('save-deposit-btn');
    const saveWithdrawBtn = document.getElementById('save-withdraw-btn');
    const confirmPayProfit = document.getElementById('confirm-pay-profit');

    if (saveInvestorBtn) saveInvestorBtn.addEventListener('click', addNewInvestor);
    if (saveDepositBtn) saveDepositBtn.addEventListener('click', addDeposit);
    if (saveWithdrawBtn) saveWithdrawBtn.addEventListener('click', withdrawAmount);
    if (confirmPayProfit) confirmPayProfit.addEventListener('click', payProfit);
    
    // نماذج الإعدادات
    const generalSettingsForm = document.getElementById('general-settings-form');
    const profitsSettingsForm = document.getElementById('profits-settings-form');
    const notificationsSettingsForm = document.getElementById('notifications-settings-form');
    
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveGeneralSettings();
        });
    }
    
    if (profitsSettingsForm) {
        profitsSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfitsSettings();
        });
    }
    
    if (notificationsSettingsForm) {
        notificationsSettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNotificationsSettings();
        });
    }
    
    // اختيار المستثمر للأرباح
    const profitInvestor = document.getElementById('profit-investor');
    const withdrawInvestor = document.getElementById('withdraw-investor');
    
    if (profitInvestor) profitInvestor.addEventListener('change', calculateProfitForInvestor);
    if (withdrawInvestor) withdrawInvestor.addEventListener('change', showInvestorBalance);
    
    // إغلاق الإشعارات
    const notificationClose = document.querySelector('.notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', function() {
            const notification = this.closest('.notification');
            if (notification) {
                notification.classList.remove('show');
            }
        });
    }
}

// فتح نافذة منبثقة
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('active');
    
    // إعادة تعيين النموذج إذا كان موجودًا
    const form = modal.querySelector('form');
    if (form) form.reset();
    
    // تحديث تاريخ اليوم إذا كان هناك حقل تاريخ
    const dateInputs = modal.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.value = new Date().toISOString().split('T')[0];
    });
    
    // تحديث قوائم المستثمرين
    populateInvestorSelects();
}

// إغلاق نافذة منبثقة
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// تعيين التاريخ الحالي كقيمة افتراضية لحقول التاريخ
function setCurrentDateAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.value = today;
    });
}

// إضافة مستثمر جديد
function addNewInvestor() {
    const nameInput = document.getElementById('investor-name');
    const phoneInput = document.getElementById('investor-phone');
    const addressInput = document.getElementById('investor-address');
    const cardInput = document.getElementById('investor-card');
    const depositDateInput = document.getElementById('investor-deposit-date');
    const amountInput = document.getElementById('investor-amount');

    if (!nameInput || !phoneInput || !addressInput || !cardInput || !depositDateInput || !amountInput) {
        showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
        return;
    }

    const name = nameInput.value;
    const phone = phoneInput.value;
    const address = addressInput.value;
    const cardNumber = cardInput.value;
    const depositDate = depositDateInput.value;
    const amount = parseFloat(amountInput.value);

    if (!name || !phone || !address || !cardNumber || !depositDate || isNaN(amount) || amount <= 0) {
        showNotification('يرجى إدخال جميع البيانات المطلوبة بشكل صحيح', 'error');
        return;
    }

    const newInvestor = {
        id: Date.now().toString(),
        name,
        phone,
        address,
        cardNumber,
        joinDate: depositDate,
        createdAt: new Date().toISOString(),
        status: 'نشط',
        investments: [
            {
                amount,
                date: depositDate,
                interest: calculateInterest(amount, depositDate)
            }
        ],
        profits: [],
        withdrawals: [],
        // إضافة خاصية المبلغ الإجمالي لتسهيل الوصول
        amount: amount
    };

    investors.push(newInvestor);

    // إضافة عملية جديدة
    addTransaction('إيداع', newInvestor.id, amount);

    // تحديث واجهة المستخدم
    saveData();
    updateDashboard();
    renderInvestorsTable();
    renderTransactionsTable();
    renderProfitsTable();
    renderRecentTransactions();
    populateInvestorSelects();
    updateCharts();

    // إغلاق النافذة المنبثقة
    closeModal('add-investor-modal');
    
    // عرض إشعار النجاح
    showNotification(`تمت إضافة المستثمر ${name} بنجاح!`, 'success');
}

// حساب الفائدة
function calculateInterest(amount, startDate, endDate = null) {
    const rate = settings.interestRate / 100;
    
    // استخدام تاريخ نهاية محدد أو نهاية الشهر الحالي
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 0);
    
    // حساب عدد الأيام
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // عدد الأيام في الشهر (أو الدورة)
    const daysInCycle = settings.profitCycle;
    
    // حساب الفائدة حسب طريقة الحساب
    let interest = 0;
    
    if (settings.profitCalculation === 'daily') {
        // حساب الفائدة النسبية بالأيام
        interest = (amount * rate * days) / daysInCycle;
    } else {
        // حساب الفائدة الشهرية كاملة
        interest = amount * rate;
    }
    
    return interest;
}

// الحصول على إجمالي الاستثمارات للمستثمر
function getTotalInvestmentForInvestor(investorId) {
    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) return 0;
    
    return investor.investments.reduce((total, inv) => total + inv.amount, 0);
}

// الحصول على إجمالي الأرباح للمستثمر
function getTotalProfitForInvestor(investorId) {
    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) return 0;
    
    return investor.investments.reduce((total, inv) => total + inv.interest, 0);
}

// حساب الأرباح لمستثمر محدد
function calculateProfitForInvestor() {
    const investorSelect = document.getElementById('profit-investor');
    if (!investorSelect) return;
    
    const investorId = investorSelect.value;
    const profitDetails = document.getElementById('profit-details');
    
    if (!investorId || !profitDetails) {
        if (profitDetails) profitDetails.innerHTML = '';
        return;
    }
    
    const investor = investors.find(inv => inv.id === investorId);
    
    if (investor) {
        let totalProfit = 0;
        let profitBreakdown = `
            <div class="section">
                <h3 class="section-title">تفاصيل الأرباح</h3>
                <table>
                    <thead>
                        <tr>
                            <th>المبلغ</th>
                            <th>تاريخ الإيداع</th>
                            <th>أيام الاستثمار</th>
                            <th>الربح</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        investor.investments.forEach(inv => {
            const start = new Date(inv.date);
            const today = new Date();
            const days = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
            const profit = calculateInterest(inv.amount, inv.date, today.toISOString().split('T')[0]);
            
            totalProfit += profit;
            profitBreakdown += `
                <tr>
                    <td>${inv.amount.toLocaleString()} ${settings.currency}</td>
                    <td>${inv.date}</td>
                    <td>${days} يوم</td>
                    <td>${profit.toLocaleString()} ${settings.currency}</td>
                </tr>
            `;
        });
        
        profitBreakdown += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3"><strong>إجمالي الربح</strong></td>
                            <td><strong>${totalProfit.toLocaleString()} ${settings.currency}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        profitDetails.innerHTML = profitBreakdown;
    } else {
        profitDetails.innerHTML = '<p>لم يتم العثور على بيانات المستثمر</p>';
    }
}

// إضافة عملية جديدة
function addTransaction(type, investorId, amount) {
    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) return;
    
    // تحديد رصيد المستثمر بعد العملية
    let balanceAfter = 0;
    if (type === 'إيداع') {
        // تحديث رصيد المستثمر
        investor.amount = (investor.amount || 0) + amount;
        balanceAfter = investor.amount;
    } else if (type === 'سحب') {
        // تحديث رصيد المستثمر
        investor.amount = (investor.amount || 0) - amount;
        balanceAfter = investor.amount;
    } else {
        // في حالة الأرباح، لا نضيف للرصيد الأساسي
        balanceAfter = investor.amount || 0;
    }
    
    const newTransaction = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        type,
        investorId,
        investorName: investor ? investor.name : 'غير معروف',
        amount,
        balanceAfter
    };
    
    transactions.push(newTransaction);
    saveData();
    renderTransactionsTable();
    renderRecentTransactions();
    updateCharts();
}

// دفع الأرباح
function payProfit() {
    const profitInvestorSelect = document.getElementById('profit-investor');
    if (!profitInvestorSelect) {
        showNotification('خطأ في النموذج: لم يتم العثور على عنصر اختيار المستثمر', 'error');
        return;
    }
    
    const investorId = profitInvestorSelect.value;
    if (!investorId) {
        showNotification('الرجاء اختيار مستثمر', 'error');
        return;
    }
    
    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) {
        showNotification('لم يتم العثور على بيانات المستثمر', 'error');
        return;
    }
    
    let totalProfit = 0;
    investor.investments.forEach(inv => {
        const start = new Date(inv.date);
        const today = new Date();
        const profit = calculateInterest(inv.amount, inv.date, today.toISOString().split('T')[0]);
        totalProfit += profit;
    });
    
    // تسجيل عملية دفع الأرباح
    investor.profits.push({
        date: new Date().toISOString().split('T')[0],
        amount: totalProfit
    });
    
    // إضافة عملية جديدة
    addTransaction('دفع أرباح', investorId, totalProfit);
    
    saveData();
    updateDashboard();
    renderProfitsTable();
    
    // إغلاق النافذة المنبثقة
    closeModal('pay-profit-modal');
    
    showNotification(`تم دفع الأرباح بمبلغ ${totalProfit.toLocaleString()} ${settings.currency} للمستثمر ${investor.name} بنجاح!`, 'success');
}

// إضافة إيداع جديد
function addDeposit() {
    const depositInvestorSelect = document.getElementById('deposit-investor');
    const depositAmountInput = document.getElementById('deposit-amount');
    const depositDateInput = document.getElementById('deposit-date');
    const depositNotesInput = document.getElementById('deposit-notes');
    
    if (!depositInvestorSelect || !depositAmountInput || !depositDateInput) {
        showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
        return;
    }
    
    const investorId = depositInvestorSelect.value;
    const amount = parseFloat(depositAmountInput.value);
    const depositDate = depositDateInput.value;
    const notes = depositNotesInput ? depositNotesInput.value || '' : '';
    
    if (!investorId || isNaN(amount) || amount <= 0 || !depositDate) {
        showNotification('الرجاء إدخال جميع البيانات المطلوبة بشكل صحيح', 'error');
        return;
    }
    
    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) {
        showNotification('لم يتم العثور على بيانات المستثمر', 'error');
        return;
    }
    
    // إضافة الاستثمار الجديد
    investor.investments.push({
        amount,
        date: depositDate,
        interest: calculateInterest(amount, depositDate),
        notes
    });
    
    // إضافة عملية جديدة
    addTransaction('إيداع', investorId, amount);
    
    saveData();
    updateDashboard();
    renderInvestorsTable();
    renderProfitsTable();
    
    // إغلاق النافذة المنبثقة
    closeModal('add-deposit-modal');
    
    showNotification(`تم إضافة إيداع جديد بمبلغ ${amount.toLocaleString()} ${settings.currency} للمستثمر ${investor.name} بنجاح!`, 'success');
}

// سحب مبلغ
function withdrawAmount() {
    const withdrawInvestorSelect = document.getElementById('withdraw-investor');
    const withdrawAmountInput = document.getElementById('withdraw-amount');
    const withdrawDateInput = document.getElementById('withdraw-date');
    const withdrawNotesInput = document.getElementById('withdraw-notes');
    
    if (!withdrawInvestorSelect || !withdrawAmountInput || !withdrawDateInput) {
        showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
        return;
    }
    
    const investorId = withdrawInvestorSelect.value;
    const amount = parseFloat(withdrawAmountInput.value);
    const withdrawDate = withdrawDateInput.value;
    const notes = withdrawNotesInput ? withdrawNotesInput.value || '' : '';
    
    if (!investorId || isNaN(amount) || amount <= 0 || !withdrawDate) {
        showNotification('الرجاء إدخال جميع البيانات المطلوبة بشكل صحيح', 'error');
        return;
    }
    
    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) {
        showNotification('لم يتم العثور على بيانات المستثمر', 'error');
        return;
    }
    
    const totalInvestment = getTotalInvestmentForInvestor(investorId);
    if (amount > totalInvestment) {
        showNotification('مبلغ السحب أكبر من الرصيد المتاح', 'error');
        return;
    }
    
    // إضافة السحب
    investor.withdrawals.push({
        date: withdrawDate,
        amount,
        notes
    });
    
    // تحديث الاستثمارات (تخفيض المبالغ بدءًا من الأقدم)
    let remainingWithdrawal = amount;
    for (let i = 0; i < investor.investments.length; i++) {
        if (remainingWithdrawal <= 0) break;
        
        if (investor.investments[i].amount <= remainingWithdrawal) {
            remainingWithdrawal -= investor.investments[i].amount;
            investor.investments[i].amount = 0;
        } else {
            investor.investments[i].amount -= remainingWithdrawal;
            remainingWithdrawal = 0;
        }
        
        // إعادة حساب الفائدة
        investor.investments[i].interest = calculateInterest(
            investor.investments[i].amount,
            investor.investments[i].date
        );
    }
    
    // إزالة الاستثمارات ذات المبلغ الصفري
    investor.investments = investor.investments.filter(inv => inv.amount > 0);
    
    // تحديث رصيد المستثمر الإجمالي
    investor.amount = (investor.amount || 0) - amount;
    
    // إضافة عملية جديدة
    addTransaction('سحب', investorId, amount);
    
    saveData();
    updateDashboard();
    renderInvestorsTable();
    renderProfitsTable();
    
    // إغلاق النافذة المنبثقة
    closeModal('add-withdraw-modal');
    
    showNotification(`تم سحب مبلغ ${amount.toLocaleString()} ${settings.currency} من حساب المستثمر ${investor.name} بنجاح!`, 'success');
}

// عرض رصيد المستثمر
function showInvestorBalance() {
    const withdrawInvestorSelect = document.getElementById('withdraw-investor');
    const balanceInfo = document.getElementById('withdraw-balance-info');
    
    if (!withdrawInvestorSelect || !balanceInfo) return;
    
    const investorId = withdrawInvestorSelect.value;
    
    if (!investorId) {
        balanceInfo.innerHTML = '';
        return;
    }
    
    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) {
        balanceInfo.innerHTML = '';
        return;
    }
    
    const totalInvestment = investor.amount || getTotalInvestmentForInvestor(investorId);
    balanceInfo.innerHTML = `
        <label class="form-label">الرصيد المتاح</label>
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color); margin-bottom: 1rem;">
            ${totalInvestment.toLocaleString()} ${settings.currency}
        </div>
    `;
}

// حفظ الإعدادات العامة
function saveGeneralSettings() {
    const systemNameInput = document.querySelector('#general-settings-form input[type="text"]');
    const currencySelect = document.querySelector('#general-settings-form select:nth-of-type(1)');
    const languageSelect = document.querySelector('#general-settings-form select:nth-of-type(2)');
    
    if (!systemNameInput || !currencySelect || !languageSelect) {
        showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
        return;
    }
    
    settings.systemName = systemNameInput.value;
    settings.currency = currencySelect.value;
    settings.language = languageSelect.value;
    saveData();
    
    showNotification('تم حفظ الإعدادات العامة بنجاح', 'success');
} 

// حفظ إعدادات الأرباح
function saveProfitsSettings() {
    const interestRateInput = document.getElementById('interest-rate-setting');
    const profitCalculationSelect = document.querySelector('#profits-settings-form select:nth-of-type(1)');
    const profitCycleSelect = document.querySelector('#profits-settings-form select:nth-of-type(2)');
    
    if (!interestRateInput || !profitCalculationSelect || !profitCycleSelect) {
        showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
        return;
    }
    
    settings.interestRate = parseFloat(interestRateInput.value);
    settings.profitCalculation = profitCalculationSelect.value;
    settings.profitCycle = parseInt(profitCycleSelect.value);
    saveData();
    
    // تحديث عرض نسبة الفائدة في لوحة التحكم
    const interestRateEl = document.getElementById('interest-rate');
    if (interestRateEl) {
        interestRateEl.textContent = `${settings.interestRate}%`;
    }
    
    showNotification('تم حفظ إعدادات الأرباح بنجاح', 'success');
}

// حفظ إعدادات الإشعارات
function saveNotificationsSettings() {
    const reminderDaysInput = document.getElementById('reminder-days');
    const emailNewInvestorCheck = document.getElementById('email-new-investor');
    const emailProfitPaymentCheck = document.getElementById('email-profit-payment');
    const emailWithdrawalCheck = document.getElementById('email-withdrawal');
    
    if (!reminderDaysInput || !emailNewInvestorCheck || !emailProfitPaymentCheck || !emailWithdrawalCheck) {
        showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
        return;
    }
    
    settings.reminderDays = parseInt(reminderDaysInput.value);
    settings.emailNotifications = {
        newInvestor: emailNewInvestorCheck.checked,
        profitPayment: emailProfitPaymentCheck.checked,
        withdrawal: emailWithdrawalCheck.checked
    };
    saveData();
    
    showNotification('تم حفظ إعدادات الإشعارات بنجاح', 'success');
}

// تحديث لوحة التحكم الرئيسية
function updateDashboard() {
    // تحديث إجمالي الاستثمارات
    const totalInvestments = investors.reduce((sum, investor) => sum + (investor.amount || 0), 0);
    const totalInvestmentsElement = document.getElementById('total-investments');
    if (totalInvestmentsElement) {
        totalInvestmentsElement.textContent = `${totalInvestments.toLocaleString()} ${settings.currency}`;
    }
    
    // تحديث الأرباح الشهرية
    const monthlyProfits = calculateMonthlyProfits();
    const monthlyProfitsElement = document.getElementById('monthly-profits');
    if (monthlyProfitsElement) {
        monthlyProfitsElement.textContent = `${monthlyProfits.toLocaleString()} ${settings.currency}`;
    }
    
    // تحديث عدد المستثمرين
    const investorsCountElement = document.getElementById('investors-count');
    if (investorsCountElement) {
        investorsCountElement.textContent = investors.length;
    }
    
    // تحديث نسبة العائد
    const interestRateElement = document.getElementById('interest-rate');
    if (interestRateElement) {
        interestRateElement.textContent = `${settings.interestRate}%`;
    }
}

// حساب الأرباح الشهرية
function calculateMonthlyProfits() {
    return investors.reduce((sum, investor) => {
        const monthlyProfit = investor.investments.reduce((total, investment) => {
            return total + calculateInterest(investment.amount, investment.date);
        }, 0);
        return sum + monthlyProfit;
    }, 0);
}

// ملء قوائم اختيار المستثمرين
function populateInvestorSelects() {
    const depositInvestorSelect = document.getElementById('deposit-investor');
    const withdrawInvestorSelect = document.getElementById('withdraw-investor');
    const profitInvestorSelect = document.getElementById('profit-investor');
    
    // تجهيز قائمة المستثمرين مرتبة أبجديًا
    const sortedInvestors = [...investors].sort((a, b) => a.name.localeCompare(b.name));
    
    // ملء قائمة الإيداع
    if (depositInvestorSelect) {
        depositInvestorSelect.innerHTML = '<option value="">اختر المستثمر</option>';
        sortedInvestors.forEach(investor => {
            const option = document.createElement('option');
            option.value = investor.id;
            option.textContent = `${investor.name} (${investor.phone})`;
            depositInvestorSelect.appendChild(option);
        });
    }
    
    // ملء قائمة السحب
    if (withdrawInvestorSelect) {
        withdrawInvestorSelect.innerHTML = '<option value="">اختر المستثمر</option>';
        sortedInvestors.forEach(investor => {
            const option = document.createElement('option');
            option.value = investor.id;
            option.textContent = `${investor.name} (${investor.phone})`;
            withdrawInvestorSelect.appendChild(option);
        });
    }
    
    // ملء قائمة الأرباح
    if (profitInvestorSelect) {
        profitInvestorSelect.innerHTML = '<option value="">اختر المستثمر</option>';
        sortedInvestors.forEach(investor => {
            const option = document.createElement('option');
            option.value = investor.id;
            option.textContent = `${investor.name} (${investor.phone})`;
            profitInvestorSelect.appendChild(option);
        });
    }
}

// عرض جدول المستثمرين
function renderInvestorsTable() {
    const tableBody = document.querySelector('#investors-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // ترتيب المستثمرين حسب تاريخ الإضافة (الأحدث أولاً)
    const sortedInvestors = [...investors].sort((a, b) => {
        return new Date(b.createdAt || b.joinDate) - new Date(a.createdAt || a.joinDate);
    });
    
    sortedInvestors.forEach(investor => {
        const row = document.createElement('tr');
        
        // حساب الربح الشهري
        const monthlyProfit = investor.investments && investor.investments.length > 0 
            ? investor.investments.reduce((total, inv) => {
                return total + calculateInterest(inv.amount, inv.date);
            }, 0)
            : 0;
        
        // تنسيق تاريخ الانضمام
        const joinDate = investor.joinDate || investor.createdAt || '';
        
        row.innerHTML = `
            <td>${investor.id}</td>
            <td>
                <div class="investor-info">
                    <div class="investor-avatar">${investor.name.charAt(0)}</div>
                    <div>
                        <div class="investor-name">${investor.name}</div>
                        <div class="investor-phone">${investor.phone}</div>
                    </div>
                </div>
            </td>
            <td>${investor.phone}</td>
            <td>${(investor.amount || 0).toLocaleString()} ${settings.currency}</td>
            <td>${monthlyProfit.toLocaleString()} ${settings.currency}</td>
            <td>${joinDate}</td>
            <td><span class="badge badge-success">نشط</span></td>
            <td>
                <div class="investor-actions">
                    <button class="investor-action-btn view-investor" data-id="${investor.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="investor-action-btn edit edit-investor" data-id="${investor.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="investor-action-btn delete delete-investor" data-id="${investor.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    if (sortedInvestors.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="8" class="text-center">لا يوجد مستثمرين</td>';
        tableBody.appendChild(emptyRow);
    }
}

// عرض جدول العمليات
function renderTransactionsTable() {
    const tableBody = document.querySelector('#transactions-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // ترتيب العمليات حسب التاريخ (الأحدث أولاً)
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });
    
    sortedTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // تحديد نوع العملية وأيقونتها
        let typeClass = '';
        let typeIcon = '';
        
        switch(transaction.type) {
            case 'إيداع':
                typeClass = 'success';
                typeIcon = '<i class="fas fa-arrow-up"></i>';
                break;
            case 'سحب':
                typeClass = 'danger';
                typeIcon = '<i class="fas fa-arrow-down"></i>';
                break;
            case 'دفع أرباح':
                typeClass = 'info';
                typeIcon = '<i class="fas fa-hand-holding-usd"></i>';
                break;
            default:
                typeClass = 'primary';
                typeIcon = '<i class="fas fa-exchange-alt"></i>';
        }
        
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.investorName}</td>
            <td>
                <span class="badge badge-${typeClass}">${typeIcon} ${transaction.type}</span>
            </td>
            <td>${transaction.date}</td>
            <td>${transaction.amount.toLocaleString()} ${settings.currency}</td>
            <td>${transaction.balanceAfter ? transaction.balanceAfter.toLocaleString() + ' ' + settings.currency : '-'}</td>
            <td>
                <button class="btn btn-outline btn-sm">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    if (sortedTransactions.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center">لا يوجد عمليات</td>';
        tableBody.appendChild(emptyRow);
    }
}

// عرض جدول الأرباح
function renderProfitsTable() {
    const tableBody = document.querySelector('#profits-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // إعداد قائمة الأرباح المستحقة لكل مستثمر
    const profitsList = [];
    
    investors.forEach(investor => {
        if (!investor.investments || investor.investments.length === 0) return;
        
        const totalInvestment = investor.amount || investor.investments.reduce((sum, inv) => sum + inv.amount, 0);
        if (totalInvestment <= 0) return;
        
        // اختيار أقدم تاريخ استثمار
        const oldestInvestment = investor.investments.reduce((oldest, current) => {
            const oldestDate = oldest ? new Date(oldest.date) : new Date();
            const currentDate = new Date(current.date);
            return currentDate < oldestDate ? current : oldest;
        }, null);
        
        if (!oldestInvestment) return;
        
        const investmentDate = oldestInvestment.date;
        const today = new Date();
        const investmentStartDate = new Date(investmentDate);
        
        // حساب عدد أيام الاستثمار
        const days = Math.floor((today - investmentStartDate) / (1000 * 60 * 60 * 24));
        
        // حساب الربح المستحق
        const profit = investor.investments.reduce((total, inv) => {
            return total + calculateInterest(inv.amount, inv.date);
        }, 0);
        
        // تقدير تاريخ الاستحقاق (بعد 30 يوم من تاريخ الاستثمار)
        const dueDate = new Date(investmentStartDate);
        dueDate.setDate(dueDate.getDate() + settings.profitCycle);
        
        profitsList.push({
            investor: investor,
            investmentAmount: totalInvestment,
            investmentDate: investmentDate,
            days: days,
            profit: profit,
            dueDate: dueDate
        });
    });
    
    // ترتيب الأرباح حسب تاريخ الاستحقاق (الأقرب أولاً)
    profitsList.sort((a, b) => a.dueDate - b.dueDate);
    
    // عرض الأرباح في الجدول
    profitsList.forEach(item => {
        const row = document.createElement('tr');
        
        // تحديد حالة استحقاق الربح
        const today = new Date();
        const isDue = item.dueDate <= today;
        const daysToMaturity = Math.floor((item.dueDate - today) / (1000 * 60 * 60 * 24));
        
        let dueBadge = '';
        if (isDue) {
            dueBadge = '<span class="badge badge-danger">مستحق الآن</span>';
        } else if (daysToMaturity <= settings.reminderDays) {
            dueBadge = `<span class="badge badge-warning">بعد ${daysToMaturity} يوم</span>`;
        }
        
        row.innerHTML = `
            <td>
                <div class="investor-info">
                    <div class="investor-avatar">${item.investor.name.charAt(0)}</div>
                    <div>
                        <div class="investor-name">${item.investor.name}</div>
                        <div class="investor-id">${item.investor.phone}</div>
                    </div>
                </div>
            </td>
            <td>${item.investmentAmount.toLocaleString()} ${settings.currency}</td>
            <td>${item.investmentDate}</td>
            <td>${item.days} يوم</td>
            <td>${item.profit.toLocaleString()} ${settings.currency}</td>
            <td>${item.dueDate.toISOString().split('T')[0]} ${dueBadge}</td>
            <td>
                <button class="btn btn-success btn-sm pay-profit-btn" data-id="${item.investor.id}">
                    <i class="fas fa-coins"></i>
                    <span>دفع الأرباح</span>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    if (profitsList.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center">لا يوجد أرباح مستحقة</td>';
        tableBody.appendChild(emptyRow);
    }
    
    // إضافة مستمعي الأحداث لأزرار دفع الأرباح
    document.querySelectorAll('.pay-profit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const investorId = this.getAttribute('data-id');
            const profitInvestorSelect = document.getElementById('profit-investor');
            if (profitInvestorSelect) {
                profitInvestorSelect.value = investorId;
                calculateProfitForInvestor();
                openModal('pay-profit-modal');
            }
        });
    });
}

// عرض آخر العمليات في لوحة التحكم
function renderRecentTransactions() {
    const tableBody = document.querySelector('#recent-transactions tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    // عرض أحدث 5 عمليات فقط
    const recent = [...transactions].sort((a, b) => {
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    }).slice(0, 5);

    recent.forEach(tr => {
        // تحديد نوع العملية وأيقونتها
        let statusClass = 'active';
        
        switch(tr.type) {
            case 'إيداع':
                statusClass = 'success';
                break;
            case 'سحب':
                statusClass = 'warning';
                break;
            case 'دفع أرباح':
                statusClass = 'info';
                break;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tr.id}</td>
            <td>${tr.investorName}</td>
            <td>${tr.type}</td>
            <td>${tr.date}</td>
            <td>${tr.amount.toLocaleString()} ${settings.currency}</td>
            <td><span class="status status-${statusClass}">مكتمل</span></td>
            <td>
                <button class="btn btn-outline btn-sm">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    if (recent.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" class="text-center">لا يوجد عمليات حديثة</td>';
        tableBody.appendChild(emptyRow);
    }
}

// تهيئة الرسوم البيانية
function initCharts() {
    // رسم بياني للاستثمارات
    const investmentChart = document.getElementById('investment-chart');
    if (investmentChart && window.Chart) {
        new Chart(investmentChart.getContext('2d'), {
            type: 'line',
            data: {
                labels: getLast6Months(),
                datasets: [{
                    label: 'إجمالي الاستثمارات',
                    data: getMonthlyInvestmentData(),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // رسم بياني للمستثمرين
    const investorsChart = document.getElementById('investors-chart');
    if (investorsChart && window.Chart) {
        new Chart(investorsChart.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['نشط', 'قيد المراجعة', 'غير نشط'],
                datasets: [{
                    data: [investors.length, 0, 0],
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// الحصول على أسماء الأشهر الستة الأخيرة
function getLast6Months() {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = month.toLocaleDateString('ar-EG', { month: 'short' });
        months.push(monthName);
    }
    
    return months;
}

// الحصول على بيانات الاستثمارات الشهرية
function getMonthlyInvestmentData() {
    const data = [0, 0, 0, 0, 0, 0]; // 6 أشهر
    const now = new Date();
    
    transactions.forEach(transaction => {
        if (transaction.type !== 'إيداع') return;
        
        const transDate = new Date(transaction.date || transaction.createdAt);
        const monthsAgo = (now.getFullYear() - transDate.getFullYear()) * 12 + now.getMonth() - transDate.getMonth();
        
        if (monthsAgo >= 0 && monthsAgo < 6) {
            data[5 - monthsAgo] += transaction.amount;
        }
    });
    
    return data;
}

// تحديث الرسوم البيانية
function updateCharts() {
    // يمكن استدعاء هذه الدالة بعد إضافة بيانات جديدة
    // في التطبيق الفعلي، يجب إعادة تهيئة الرسوم البيانية أو تحديثها
    // يمكن تنفيذ ذلك بإعادة استدعاء initCharts أو تنفيذ تحديث مباشر للرسوم
}

// إعداد التعرف على الصوت
function setupSpeechRecognition() {
    // يمكن تنفيذ هذه الدالة لإضافة ميزة التعرف على الصوت
    // في حال توفرها ودعم المتصفح لها
}

// بدء نظام التذكير
function startReminders() {
    // يمكن تنفيذ هذه الدالة لإعداد نظام التذكير بالأرباح المستحقة
}

// عرض إشعار للمستخدم
function showNotification(message, type = 'success') {
    const notification = document.getElementById('success-notification');
    if (!notification) return;
    
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationTitle = notification.querySelector('.notification-title');
    const notificationMessage = notification.querySelector('.notification-message');
    
    if (!notificationIcon || !notificationTitle || !notificationMessage) return;
    
    // تعيين نوع الإشعار
    notificationIcon.className = 'notification-icon';
    notificationIcon.classList.add(type);
    
    // تعيين العنوان حسب النوع
    let title = 'إشعار';
    switch(type) {
        case 'success':
            title = 'تمت العملية بنجاح';
            notificationIcon.innerHTML = '<i class="fas fa-check"></i>';
            break;
        case 'error':
            title = 'خطأ';
            notificationIcon.innerHTML = '<i class="fas fa-times"></i>';
            break;
        case 'warning':
            title = 'تنبيه';
            notificationIcon.innerHTML = '<i class="fas fa-exclamation"></i>';
            break;
        case 'info':
            title = 'معلومات';
            notificationIcon.innerHTML = '<i class="fas fa-info"></i>';
            break;
    }
    
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    // عرض الإشعار
    notification.classList.add('show');
    
    // إخفاء الإشعار بعد فترة
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}