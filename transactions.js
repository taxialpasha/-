/**
 * نظام الاستثمار المتكامل - مدير العمليات
 * يتعامل مع إدارة عمليات الإيداع والسحب وعرضها في واجهة المستخدم
 */

class TransactionsManager {
    constructor() {
        // تهيئة المدير
        this.initialize();
    }
    
    // تهيئة المدير
    initialize() {
        // ربط نماذج العمليات
        this.bindForms();
        
        // إضافة مستمعي الأحداث
        this.setupEventListeners();
        
        // عرض جدول العمليات
        this.renderTransactionsTable();
        
        // عرض آخر العمليات في لوحة التحكم
        this.renderRecentTransactions();
        
        console.log('تم تهيئة مدير العمليات');
    }
    
    // ربط نماذج العمليات
    bindForms() {
        // نموذج الإيداع
        this.depositForm = document.getElementById('add-deposit-form');
        this.depositInvestorSelect = document.getElementById('deposit-investor');
        this.depositAmountInput = document.getElementById('deposit-amount');
        this.depositDateInput = document.getElementById('deposit-date');
        this.depositNotesInput = document.getElementById('deposit-notes');
        this.saveDepositBtn = document.getElementById('save-deposit-btn');
        
        // نموذج السحب
        this.withdrawForm = document.getElementById('add-withdraw-form');
        this.withdrawInvestorSelect = document.getElementById('withdraw-investor');
        this.withdrawAmountInput = document.getElementById('withdraw-amount');
        this.withdrawDateInput = document.getElementById('withdraw-date');
        this.withdrawNotesInput = document.getElementById('withdraw-notes');
        this.withdrawBalanceInfo = document.getElementById('withdraw-balance-info');
        this.saveWithdrawBtn = document.getElementById('save-withdraw-btn');
    }
    
    // إضافة مستمعي الأحداث
    setupEventListeners() {
        // إضافة مستمعي الأحداث لأزرار الإيداع والسحب
        if (this.saveDepositBtn) {
            this.saveDepositBtn.addEventListener('click', () => this.addDeposit());
        }
        
        if (this.saveWithdrawBtn) {
            this.saveWithdrawBtn.addEventListener('click', () => this.withdrawAmount());
        }
        
        // مستمع لتغيير اختيار المستثمر في نموذج السحب
        if (this.withdrawInvestorSelect) {
            this.withdrawInvestorSelect.addEventListener('change', () => this.showInvestorBalance());
        }
        
        // مستمع حدث تحديث البيانات
        document.addEventListener('data:updated', () => {
            this.renderTransactionsTable();
            this.renderRecentTransactions();
            this.populateInvestorSelects();
        });
        
        // إضافة مستمعي الأحداث لأزرار فتح النوافذ المنبثقة
        const addDepositBtn = document.getElementById('add-deposit-btn');
        const addWithdrawBtn = document.getElementById('add-withdraw-btn');
        
        if (addDepositBtn) {
            addDepositBtn.addEventListener('click', () => this.openDepositModal());
        }
        
        if (addWithdrawBtn) {
            addWithdrawBtn.addEventListener('click', () => this.openWithdrawModal());
        }
    }
    
    // فتح نافذة الإيداع
    openDepositModal() {
        const modal = document.getElementById('add-deposit-modal');
        if (modal) {
            // إعادة تعيين النموذج
            if (this.depositForm) {
                this.depositForm.reset();
            }
            
            // تعيين تاريخ اليوم
            if (this.depositDateInput) {
                this.depositDateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // تحديث قوائم المستثمرين
            this.populateInvestorSelects();
            
            // فتح النافذة
            modal.classList.add('active');
        }
    }
    
    // فتح نافذة السحب
    openWithdrawModal() {
        const modal = document.getElementById('add-withdraw-modal');
        if (modal) {
            // إعادة تعيين النموذج
            if (this.withdrawForm) {
                this.withdrawForm.reset();
            }
            
            // تعيين تاريخ اليوم
            if (this.withdrawDateInput) {
                this.withdrawDateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // تحديث قوائم المستثمرين
            this.populateInvestorSelects();
            
            // مسح معلومات الرصيد
            if (this.withdrawBalanceInfo) {
                this.withdrawBalanceInfo.innerHTML = '';
            }
            
            // فتح النافذة
            modal.classList.add('active');
        }
    }
    
    // ملء قوائم اختيار المستثمرين
    populateInvestorSelects() {
        // الحصول على المستثمرين
        const investors = db.getAllInvestors();
        
        // ترتيب المستثمرين أبجديًا
        const sortedInvestors = [...investors].sort((a, b) => a.name.localeCompare(b.name));
        
        // ملء قائمة الإيداع
        if (this.depositInvestorSelect) {
            this.depositInvestorSelect.innerHTML = '<option value="">اختر المستثمر</option>';
            
            sortedInvestors.forEach(investor => {
                const option = document.createElement('option');
                option.value = investor.id;
                option.textContent = `${investor.name} (${investor.phone})`;
                this.depositInvestorSelect.appendChild(option);
            });
        }
        
        // ملء قائمة السحب
        if (this.withdrawInvestorSelect) {
            this.withdrawInvestorSelect.innerHTML = '<option value="">اختر المستثمر</option>';
            
            sortedInvestors.forEach(investor => {
                const option = document.createElement('option');
                option.value = investor.id;
                option.textContent = `${investor.name} (${investor.phone})`;
                this.withdrawInvestorSelect.appendChild(option);
            });
        }
    }
    
    // عرض رصيد المستثمر في نموذج السحب
    showInvestorBalance() {
        if (!this.withdrawInvestorSelect || !this.withdrawBalanceInfo) return;
        
        const investorId = this.withdrawInvestorSelect.value;
        
        if (!investorId) {
            this.withdrawBalanceInfo.innerHTML = '';
            return;
        }
        
        // الحصول على المستثمر
        const investor = db.getInvestor(investorId);
        
        if (!investor) {
            this.withdrawBalanceInfo.innerHTML = '';
            return;
        }
        
        // عرض رصيد المستثمر
        const totalInvestment = investor.amount || 0;
        
        this.withdrawBalanceInfo.innerHTML = `
            <label class="form-label">الرصيد المتاح</label>
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color); margin-bottom: 1rem;">
                ${formatCurrency(totalInvestment)} ${SYSTEM_CONFIG.currency}
            </div>
        `;
    }
    
    // إضافة إيداع جديد
    addDeposit() {
        // التحقق من وجود الحقول المطلوبة
        if (!this.depositInvestorSelect || !this.depositAmountInput || !this.depositDateInput) {
            showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
            return;
        }
        
        // قراءة قيم الحقول
        const investorId = this.depositInvestorSelect.value;
        const amount = parseFloat(this.depositAmountInput.value);
        const depositDate = this.depositDateInput.value;
        const notes = this.depositNotesInput ? this.depositNotesInput.value : '';
        
        // التحقق من صحة البيانات
        if (!investorId || isNaN(amount) || amount <= 0 || !depositDate) {
            showNotification('يرجى إدخال جميع البيانات المطلوبة بشكل صحيح', 'error');
            return;
        }
        
        // الحصول على المستثمر
        const investor = db.getInvestor(investorId);
        
        if (!investor) {
            showNotification('لم يتم العثور على بيانات المستثمر', 'error');
            return;
        }
        
        // إضافة العملية
        const transaction = db.addTransaction({
            investorId,
            type: TRANSACTION_TYPES.DEPOSIT,
            amount,
            date: depositDate,
            notes
        });
        
        if (transaction) {
            // إغلاق النافذة المنبثقة
            const modal = document.getElementById('add-deposit-modal');
            if (modal) {
                modal.classList.remove('active');
            }
            
            // تحديث الواجهة
            this.renderTransactionsTable();
            this.renderRecentTransactions();
            
            // تحديث بيانات الواجهة الأخرى
            if (window.app) {
                window.app.updateDashboard();
            }
            
            // عرض إشعار النجاح
            showNotification(`تم إضافة إيداع جديد بمبلغ ${formatCurrency(amount)} ${SYSTEM_CONFIG.currency} للمستثمر ${investor.name} بنجاح!`, 'success');
        } else {
            showNotification('حدث خطأ أثناء إضافة الإيداع', 'error');
        }
    }
    
    // سحب مبلغ
    withdrawAmount() {
        // التحقق من وجود الحقول المطلوبة
        if (!this.withdrawInvestorSelect || !this.withdrawAmountInput || !this.withdrawDateInput) {
            showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
            return;
        }
        
        // قراءة قيم الحقول
        const investorId = this.withdrawInvestorSelect.value;
        const amount = parseFloat(this.withdrawAmountInput.value);
        const withdrawDate = this.withdrawDateInput.value;
        const notes = this.withdrawNotesInput ? this.withdrawNotesInput.value : '';
        
        // التحقق من صحة البيانات
        if (!investorId || isNaN(amount) || amount <= 0 || !withdrawDate) {
            showNotification('يرجى إدخال جميع البيانات المطلوبة بشكل صحيح', 'error');
            return;
        }
        
        // الحصول على المستثمر
        const investor = db.getInvestor(investorId);
        
        if (!investor) {
            showNotification('لم يتم العثور على بيانات المستثمر', 'error');
            return;
        }
        
        // التحقق من كفاية الرصيد
        if (amount > (investor.amount || 0)) {
            showNotification('مبلغ السحب أكبر من الرصيد المتاح', 'error');
            return;
        }
        
        // إضافة العملية
        const transaction = db.addTransaction({
            investorId,
            type: TRANSACTION_TYPES.WITHDRAW,
            amount,
            date: withdrawDate,
            notes
        });
        
        if (transaction) {
            // إغلاق النافذة المنبثقة
            const modal = document.getElementById('add-withdraw-modal');
            if (modal) {
                modal.classList.remove('active');
            }
            
            // تحديث الواجهة
            this.renderTransactionsTable();
            this.renderRecentTransactions();
            
            // تحديث بيانات الواجهة الأخرى
            if (window.app) {
                window.app.updateDashboard();
            }
            
            // عرض إشعار النجاح
            showNotification(`تم سحب مبلغ ${formatCurrency(amount)} ${SYSTEM_CONFIG.currency} من حساب المستثمر ${investor.name} بنجاح!`, 'success');
        } else {
            showNotification('حدث خطأ أثناء إجراء السحب', 'error');
        }
    }
    
    // عرض جدول العمليات
    renderTransactionsTable() {
        const tableBody = document.querySelector('#transactions-table tbody');
        if (!tableBody) return;
        
        // الحصول على العمليات من قاعدة البيانات
        const transactions = db.getAllTransactions();
        
        // ترتيب العمليات حسب التاريخ (الأحدث أولاً)
        const sortedTransactions = [...transactions].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        // تفريغ الجدول
        tableBody.innerHTML = '';
        
        // عرض العمليات
        if (sortedTransactions.length > 0) {
            sortedTransactions.forEach(transaction => {
                // تحديد نوع العملية وأيقونتها
                let typeClass = '';
                let typeIcon = '';
                
                switch(transaction.type) {
                    case TRANSACTION_TYPES.DEPOSIT:
                        typeClass = 'success';
                        typeIcon = '<i class="fas fa-arrow-up"></i>';
                        break;
                    case TRANSACTION_TYPES.WITHDRAW:
                        typeClass = 'danger';
                        typeIcon = '<i class="fas fa-arrow-down"></i>';
                        break;
                    case TRANSACTION_TYPES.PROFIT:
                        typeClass = 'info';
                        typeIcon = '<i class="fas fa-hand-holding-usd"></i>';
                        break;
                    default:
                        typeClass = 'primary';
                        typeIcon = '<i class="fas fa-exchange-alt"></i>';
                }
                
                // إنشاء الصف
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${transaction.id}</td>
                    <td>${transaction.investorName}</td>
                    <td>
                        <span class="badge badge-${typeClass}">${typeIcon} ${transaction.type}</span>
                    </td>
                    <td>${formatDate(transaction.date)}</td>
                    <td>${formatCurrency(transaction.amount)} ${SYSTEM_CONFIG.currency}</td>
                    <td>${transaction.balanceAfter !== undefined ? formatCurrency(transaction.balanceAfter) + ' ' + SYSTEM_CONFIG.currency : '-'}</td>
                    <td>
                        <button class="btn btn-outline btn-sm view-transaction" data-id="${transaction.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        } else {
            // عرض رسالة فارغة
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="7" class="text-center">لا يوجد عمليات</td>';
            tableBody.appendChild(emptyRow);
        }
    }
    
    // عرض آخر العمليات في لوحة التحكم
    renderRecentTransactions() {
        const tableBody = document.querySelector('#recent-transactions tbody');
        if (!tableBody) return;
        
        // الحصول على العمليات من قاعدة البيانات
        const transactions = db.getAllTransactions();
        
        // ترتيب العمليات حسب التاريخ (الأحدث أولاً) وأخذ أحدث 5 عمليات
        const recentTransactions = [...transactions]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        // تفريغ الجدول
        tableBody.innerHTML = '';
        
        // عرض العمليات
        if (recentTransactions.length > 0) {
            recentTransactions.forEach(transaction => {
                // تحديد حالة العملية
                let statusClass = 'active';
                
                switch(transaction.type) {
                    case TRANSACTION_TYPES.DEPOSIT:
                        statusClass = 'success';
                        break;
                    case TRANSACTION_TYPES.WITHDRAW:
                        statusClass = 'warning';
                        break;
                    case TRANSACTION_TYPES.PROFIT:
                        statusClass = 'info';
                        break;
                }
                
                // إنشاء الصف
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${transaction.id}</td>
                    <td>${transaction.investorName}</td>
                    <td>${transaction.type}</td>
                    <td>${formatDate(transaction.date)}</td>
                    <td>${formatCurrency(transaction.amount)} ${SYSTEM_CONFIG.currency}</td>
                    <td><span class="status status-${statusClass}">مكتمل</span></td>
                    <td>
                        <button class="btn btn-outline btn-sm view-transaction" data-id="${transaction.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        } else {
            // عرض رسالة فارغة
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="7" class="text-center">لا يوجد عمليات حديثة</td>';
            tableBody.appendChild(emptyRow);
        }
    }
}

// إنشاء مدير العمليات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.transactionsManager = new TransactionsManager();
});