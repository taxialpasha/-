/**
 * نظام الاستثمار المتكامل - مدير المستثمرين
 * يتعامل مع إدارة المستثمرين وعرضهم في واجهة المستخدم
 */

class InvestorsManager {
    constructor() {
        // تهيئة المدير
        this.initialize();
    }
    
    // تهيئة المدير
    initialize() {
        // ربط نماذج المستثمرين
        this.bindForms();
        
        // إضافة مستمعي الأحداث
        this.setupEventListeners();
        
        // عرض قائمة المستثمرين
        this.renderInvestorsTable();
        
        console.log('تم تهيئة مدير المستثمرين');
    }
    
    // ربط نماذج المستثمرين
    bindForms() {
        // نموذج إضافة مستثمر
        this.addInvestorForm = document.getElementById('add-investor-form');
        this.saveInvestorBtn = document.getElementById('save-investor-btn');
        
        // حقول نموذج إضافة مستثمر
        this.investorNameInput = document.getElementById('investor-name');
        this.investorPhoneInput = document.getElementById('investor-phone');
        this.investorAddressInput = document.getElementById('investor-address');
        this.investorCardInput = document.getElementById('investor-card');
        this.investorDepositDateInput = document.getElementById('investor-deposit-date');
        this.investorAmountInput = document.getElementById('investor-amount');
    }
    
    // إضافة مستمعي الأحداث
    setupEventListeners() {
        // إضافة مستمعي الأحداث لزر حفظ المستثمر
        if (this.saveInvestorBtn) {
            this.saveInvestorBtn.addEventListener('click', () => this.addNewInvestor());
        }
        
        // مستمع حدث تحديث البيانات
        document.addEventListener('data:updated', () => {
            this.renderInvestorsTable();
        });
        
        // إضافة مستمعي الأحداث لأزرار عرض وتعديل وحذف المستثمرين
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.view-investor, .edit-investor, .delete-investor');
            
            if (target) {
                const investorId = target.getAttribute('data-id');
                
                if (target.classList.contains('view-investor')) {
                    this.viewInvestor(investorId);
                } else if (target.classList.contains('edit-investor')) {
                    this.editInvestor(investorId);
                } else if (target.classList.contains('delete-investor')) {
                    this.deleteInvestor(investorId);
                }
            }
        });
        
        // إضافة مستمع لزر إضافة مستثمر
        const addInvestorBtn = document.getElementById('add-investor-btn');
        if (addInvestorBtn) {
            addInvestorBtn.addEventListener('click', () => this.openAddInvestorModal());
        }
    }
    
    // فتح نافذة إضافة مستثمر
    openAddInvestorModal() {
        const modal = document.getElementById('add-investor-modal');
        if (modal) {
            // إعادة تعيين النموذج
            if (this.addInvestorForm) {
                this.addInvestorForm.reset();
            }
            
            // تعيين تاريخ اليوم
            if (this.investorDepositDateInput) {
                this.investorDepositDateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // فتح النافذة
            modal.classList.add('active');
        }
    }
    
    // إضافة مستثمر جديد
    addNewInvestor() {
        // التحقق من وجود الحقول المطلوبة
        if (!this.investorNameInput || !this.investorPhoneInput || !this.investorAddressInput || 
            !this.investorCardInput || !this.investorDepositDateInput || !this.investorAmountInput) {
            showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
            return;
        }
        
        // قراءة قيم الحقول
        const name = this.investorNameInput.value;
        const phone = this.investorPhoneInput.value;
        const address = this.investorAddressInput.value;
        const cardNumber = this.investorCardInput.value;
        const depositDate = this.investorDepositDateInput.value;
        const amount = parseFloat(this.investorAmountInput.value);
        
        // التحقق من صحة البيانات
        if (!name || !phone || !address || !cardNumber || !depositDate || isNaN(amount) || amount <= 0) {
            showNotification('يرجى إدخال جميع البيانات المطلوبة بشكل صحيح', 'error');
            return;
        }
        
        // إنشاء كائن بيانات المستثمر
        const investorData = {
            name,
            phone,
            address,
            card: cardNumber,
            depositDate,
            amount
        };
        
        // إضافة المستثمر إلى قاعدة البيانات
        const newInvestor = db.addInvestor(investorData);
        
        if (newInvestor) {
            // إغلاق النافذة المنبثقة
            const modal = document.getElementById('add-investor-modal');
            if (modal) {
                modal.classList.remove('active');
            }
            
            // تحديث جدول المستثمرين
            this.renderInvestorsTable();
            
            // تحديث بيانات الواجهة الأخرى
            if (window.app) {
                window.app.updateDashboard();
            }
            
            // عرض إشعار النجاح
            showNotification(`تمت إضافة المستثمر ${name} بنجاح!`, 'success');
        } else {
            showNotification('حدث خطأ أثناء إضافة المستثمر', 'error');
        }
    }
    
    // عرض تفاصيل مستثمر
    viewInvestor(investorId) {
        // الحصول على بيانات المستثمر
        const investor = db.getInvestor(investorId);
        
        if (!investor) {
            showNotification('لم يتم العثور على بيانات المستثمر', 'error');
            return;
        }
        
        // الحصول على عمليات المستثمر
        const transactions = db.getInvestorTransactions(investorId);
        
        // عرض تفاصيل المستثمر في نافذة منبثقة
        const modal = document.getElementById('investor-details-modal');
        const contentContainer = document.getElementById('investor-details-content');
        
        if (modal && contentContainer) {
            // حساب إجمالي الاستثمارات
            const totalInvestment = investor.amount || 0;
            
            // حساب الربح الشهري
            const monthlyProfit = investor.investments.reduce((total, inv) => {
                return total + calculateProfit(inv.amount, 30);
            }, 0);
            
            // تنسيق تاريخ الانضمام
            const joinDate = formatDate(investor.joinDate || investor.createdAt);
            
            // إنشاء محتوى التفاصيل
            let content = `
                <div class="investor-profile">
                    <div class="investor-avatar large">${investor.name.charAt(0)}</div>
                    <div class="investor-details">
                        <h2>${investor.name}</h2>
                        <div class="investor-meta">
                            <div><i class="fas fa-phone"></i> ${investor.phone}</div>
                            <div><i class="fas fa-map-marker-alt"></i> ${investor.address}</div>
                            <div><i class="fas fa-id-card"></i> ${investor.cardNumber}</div>
                            <div><i class="fas fa-calendar"></i> تاريخ الانضمام: ${joinDate}</div>
                        </div>
                    </div>
                </div>
                
                <div class="grid-cols-2">
                    <div class="stat-card">
                        <div class="stat-title">إجمالي الاستثمارات</div>
                        <div class="stat-value">${formatCurrency(totalInvestment)} ${SYSTEM_CONFIG.currency}</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-title">الربح الشهري</div>
                        <div class="stat-value">${formatCurrency(monthlyProfit)} ${SYSTEM_CONFIG.currency}</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">الاستثمارات</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>المبلغ</th>
                                    <th>الربح الشهري</th>
                                    <th>ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // إضافة الاستثمارات
            if (investor.investments && investor.investments.length > 0) {
                investor.investments.forEach(inv => {
                    content += `
                        <tr>
                            <td>${formatDate(inv.date)}</td>
                            <td>${formatCurrency(inv.amount)} ${SYSTEM_CONFIG.currency}</td>
                            <td>${formatCurrency(calculateProfit(inv.amount, 30))} ${SYSTEM_CONFIG.currency}</td>
                            <td>${inv.notes || '-'}</td>
                        </tr>
                    `;
                });
            } else {
                content += `<tr><td colspan="4" class="text-center">لا توجد استثمارات</td></tr>`;
            }
            
            content += `
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">عمليات السحب</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>المبلغ</th>
                                    <th>ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // إضافة عمليات السحب
            if (investor.withdrawals && investor.withdrawals.length > 0) {
                investor.withdrawals.forEach(withdrawal => {
                    content += `
                        <tr>
                            <td>${formatDate(withdrawal.date)}</td>
                            <td>${formatCurrency(withdrawal.amount)} ${SYSTEM_CONFIG.currency}</td>
                            <td>${withdrawal.notes || '-'}</td>
                        </tr>
                    `;
                });
            } else {
                content += `<tr><td colspan="3" class="text-center">لا توجد عمليات سحب</td></tr>`;
            }
            
            content += `
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="section">
                    <h3 class="section-title">الأرباح المدفوعة</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>المبلغ</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            // إضافة الأرباح المدفوعة
            if (investor.profits && investor.profits.length > 0) {
                investor.profits.forEach(profit => {
                    content += `
                        <tr>
                            <td>${formatDate(profit.date)}</td>
                            <td>${formatCurrency(profit.amount)} ${SYSTEM_CONFIG.currency}</td>
                        </tr>
                    `;
                });
            } else {
                content += `<tr><td colspan="2" class="text-center">لا توجد أرباح مدفوعة</td></tr>`;
            }
            
            content += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            // تعيين المحتوى
            contentContainer.innerHTML = content;
            
            // تعيين معرف المستثمر للأزرار
            const editBtn = document.getElementById('edit-investor-btn');
            const profitBtn = document.getElementById('investor-profit-btn');
            const deleteBtn = document.getElementById('delete-investor-btn');
            
            if (editBtn) {
                editBtn.setAttribute('data-id', investorId);
                editBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    this.editInvestor(investorId);
                });
            }
            
            if (profitBtn) {
                profitBtn.setAttribute('data-id', investorId);
                profitBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    
                    // فتح نافذة دفع الأرباح
                    const profitModal = document.getElementById('pay-profit-modal');
                    const profitInvestorSelect = document.getElementById('profit-investor');
                    
                    if (profitModal && profitInvestorSelect) {
                        profitInvestorSelect.value = investorId;
                        
                        // حساب الأرباح للمستثمر
                        if (window.profitsManager) {
                            window.profitsManager.calculateProfitForInvestor();
                        } else {
                            calculateProfitForInvestor();
                        }
                        
                        profitModal.classList.add('active');
                    }
                });
            }
            
            if (deleteBtn) {
                deleteBtn.setAttribute('data-id', investorId);
                deleteBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    this.deleteInvestor(investorId);
                });
            }
            
            // فتح النافذة
            modal.classList.add('active');
        }
    }
    
    // تعديل بيانات مستثمر
    editInvestor(investorId) {
        // سيتم تنفيذها لاحقًا
        alert('سيتم تفعيل هذه الخاصية قريبًا');
    }
    
    // حذف مستثمر
    deleteInvestor(investorId) {
        if (confirm('هل أنت متأكد من حذف هذا المستثمر؟ لا يمكن التراجع عن هذه العملية.')) {
            // حذف المستثمر من قاعدة البيانات
            const result = db.deleteInvestor(investorId);
            
            if (result) {
                // تحديث جدول المستثمرين
                this.renderInvestorsTable();
                
                // تحديث بيانات الواجهة الأخرى
                if (window.app) {
                    window.app.updateDashboard();
                }
                
                // عرض إشعار النجاح
                showNotification('تم حذف المستثمر بنجاح', 'success');
            } else {
                showNotification('حدث خطأ أثناء حذف المستثمر', 'error');
            }
        }
    }
    
    // عرض جدول المستثمرين
    renderInvestorsTable() {
        const tableBody = document.querySelector('#investors-table tbody');
        if (!tableBody) return;
        
        // الحصول على المستثمرين من قاعدة البيانات
        const investors = db.getAllInvestors();
        
        // ترتيب المستثمرين حسب تاريخ الإضافة (الأحدث أولاً)
        const sortedInvestors = [...investors].sort((a, b) => {
            return new Date(b.createdAt || b.joinDate) - new Date(a.createdAt || a.joinDate);
        });
        
        // تفريغ الجدول
        tableBody.innerHTML = '';
        
        // عرض المستثمرين
        if (sortedInvestors.length > 0) {
            sortedInvestors.forEach(investor => {
                // حساب الربح الشهري
                const monthlyProfit = investor.investments.reduce((total, inv) => {
                    return total + calculateProfit(inv.amount, 30);
                }, 0);
                
                // تنسيق تاريخ الانضمام
                const joinDate = formatDate(investor.joinDate || investor.createdAt);
                
                // إنشاء الصف
                const row = document.createElement('tr');
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
                    <td>${formatCurrency(investor.amount || 0)} ${SYSTEM_CONFIG.currency}</td>
                    <td>${formatCurrency(monthlyProfit)} ${SYSTEM_CONFIG.currency}</td>
                    <td>${joinDate}</td>
                    <td><span class="badge badge-success">${investor.status}</span></td>
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
        } else {
            // عرض رسالة فارغة
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="8" class="text-center">لا يوجد مستثمرين</td>';
            tableBody.appendChild(emptyRow);
        }
    }
}

// إنشاء مدير المستثمرين عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.investorsManager = new InvestorsManager();
});