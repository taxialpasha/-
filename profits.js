/**
 * نظام الاستثمار المتكامل - مدير الأرباح
 * يتعامل مع إدارة أرباح المستثمرين وعرضها في واجهة المستخدم
 */

class ProfitsManager {
    constructor() {
        // تهيئة المدير
        this.initialize();
    }
    
    // تهيئة المدير
    initialize() {
        // ربط نماذج الأرباح
        this.bindForms();
        
        // إضافة مستمعي الأحداث
        this.setupEventListeners();
        
        // عرض جدول الأرباح
        this.renderProfitsTable();
        
        console.log('تم تهيئة مدير الأرباح');
    }
    
    // ربط نماذج الأرباح
    bindForms() {
        // نموذج دفع الأرباح
        this.profitForm = document.getElementById('pay-profit-form');
        this.profitInvestorSelect = document.getElementById('profit-investor');
        this.profitDetails = document.getElementById('profit-details');
        this.confirmPayProfitBtn = document.getElementById('confirm-pay-profit');
    }
    
    // إضافة مستمعي الأحداث
    setupEventListeners() {
        // إضافة مستمعي الأحداث لنموذج دفع الأرباح
        if (this.profitInvestorSelect) {
            this.profitInvestorSelect.addEventListener('change', () => this.calculateProfitForInvestor());
        }
        
        if (this.confirmPayProfitBtn) {
            this.confirmPayProfitBtn.addEventListener('click', () => this.payProfit());
        }
        
        // مستمع حدث تحديث البيانات
        document.addEventListener('data:updated', () => {
            this.renderProfitsTable();
            this.populateInvestorSelects();
        });
        
        // إضافة مستمعي الأحداث لأزرار فتح النوافذ المنبثقة
        const payProfitsBtn = document.getElementById('pay-profits-btn');
        
        if (payProfitsBtn) {
            payProfitsBtn.addEventListener('click', () => this.openPayProfitModal());
        }
        
        // إضافة مستمع للنقر على أزرار دفع الأرباح في جدول الأرباح
        document.addEventListener('click', (e) => {
            const payProfitBtn = e.target.closest('.pay-profit-btn');
            
            if (payProfitBtn) {
                const investorId = payProfitBtn.getAttribute('data-id');
                
                if (investorId) {
                    this.openPayProfitModalForInvestor(investorId);
                }
            }
        });
    }
    
    // فتح نافذة دفع الأرباح
    openPayProfitModal() {
        const modal = document.getElementById('pay-profit-modal');
        if (modal) {
            // إعادة تعيين النموذج
            if (this.profitForm) {
                this.profitForm.reset();
            }
            
            // تحديث قوائم المستثمرين
            this.populateInvestorSelects();
            
            // مسح تفاصيل الأرباح
            if (this.profitDetails) {
                this.profitDetails.innerHTML = '';
            }
            
            // فتح النافذة
            modal.classList.add('active');
        }
    }
    
    // فتح نافذة دفع الأرباح لمستثمر محدد
    openPayProfitModalForInvestor(investorId) {
        const modal = document.getElementById('pay-profit-modal');
        if (modal && this.profitInvestorSelect) {
            // تعيين المستثمر المحدد
            this.profitInvestorSelect.value = investorId;
            
            // حساب الأرباح للمستثمر
            this.calculateProfitForInvestor();
            
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
        
        // ملء قائمة الأرباح
        if (this.profitInvestorSelect) {
            this.profitInvestorSelect.innerHTML = '<option value="">اختر المستثمر</option>';
            
            sortedInvestors.forEach(investor => {
                const option = document.createElement('option');
                option.value = investor.id;
                option.textContent = `${investor.name} (${investor.phone})`;
                this.profitInvestorSelect.appendChild(option);
            });
        }
    }
    
    // حساب الأرباح لمستثمر محدد
    calculateProfitForInvestor() {
        if (!this.profitInvestorSelect || !this.profitDetails) return;
        
        const investorId = this.profitInvestorSelect.value;
        
        if (!investorId) {
            this.profitDetails.innerHTML = '';
            return;
        }
        
        // الحصول على المستثمر
        const investor = db.getInvestor(investorId);
        
        if (!investor) {
            this.profitDetails.innerHTML = '<p>لم يتم العثور على بيانات المستثمر</p>';
            return;
        }
        
        // حساب الأرباح لكل استثمار
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
            const profit = calculateProfit(inv.amount, days);
            
            totalProfit += profit;
            profitBreakdown += `
                <tr>
                    <td>${formatCurrency(inv.amount)} ${SYSTEM_CONFIG.currency}</td>
                    <td>${formatDate(inv.date)}</td>
                    <td>${days} يوم</td>
                    <td>${formatCurrency(profit)} ${SYSTEM_CONFIG.currency}</td>
                </tr>
            `;
        });
        
        profitBreakdown += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3"><strong>إجمالي الربح</strong></td>
                            <td><strong>${formatCurrency(totalProfit)} ${SYSTEM_CONFIG.currency}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
        
        this.profitDetails.innerHTML = profitBreakdown;
    }
    
    // دفع الأرباح
    payProfit() {
        if (!this.profitInvestorSelect) {
            showNotification('خطأ في النموذج: لم يتم العثور على عنصر اختيار المستثمر', 'error');
            return;
        }
        
        const investorId = this.profitInvestorSelect.value;
        
        if (!investorId) {
            showNotification('الرجاء اختيار مستثمر', 'error');
            return;
        }
        
        // الحصول على المستثمر
        const investor = db.getInvestor(investorId);
        
        if (!investor) {
            showNotification('لم يتم العثور على بيانات المستثمر', 'error');
            return;
        }
        
        // حساب الأرباح لكل استثمار
        let totalProfit = 0;
        investor.investments.forEach(inv => {
            const start = new Date(inv.date);
            const today = new Date();
            const days = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
            const profit = calculateProfit(inv.amount, days);
            totalProfit += profit;
        });
        
        // إضافة ربح جديد
        const profit = db.addProfit({
            investorId,
            amount: totalProfit,
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            investmentAmount: investor.amount,
            days: 30,
            status: PROFIT_STATUS.PENDING
        });
        
        if (profit) {
            // تحديث حالة الربح إلى مدفوعة
            db.updateProfitStatus(profit.id, PROFIT_STATUS.PAID);
            
            // إغلاق النافذة المنبثقة
            const modal = document.getElementById('pay-profit-modal');
            if (modal) {
                modal.classList.remove('active');
            }
            
            // تحديث الواجهة
            this.renderProfitsTable();
            
            // تحديث بيانات الواجهة الأخرى
            if (window.app) {
                window.app.updateDashboard();
            }
            
            // عرض إشعار النجاح
            showNotification(`تم دفع الأرباح بمبلغ ${formatCurrency(totalProfit)} ${SYSTEM_CONFIG.currency} للمستثمر ${investor.name} بنجاح!`, 'success');
        } else {
            showNotification('حدث خطأ أثناء دفع الأرباح', 'error');
        }
    }
    
    // عرض جدول الأرباح
    renderProfitsTable() {
        const tableBody = document.querySelector('#profits-table tbody');
        if (!tableBody) return;
        
        // الحصول على المستثمرين
        const investors = db.getAllInvestors();
        
        // إعداد قائمة الأرباح المستحقة لكل مستثمر
        const profitsList = [];
        
        investors.forEach(investor => {
            if (!investor.investments || investor.investments.length === 0) return;
            
            const totalInvestment = investor.amount || 0;
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
                const invDays = Math.floor((today - new Date(inv.date)) / (1000 * 60 * 60 * 24));
                return total + calculateProfit(inv.amount, invDays);
            }, 0);
            
            // تقدير تاريخ الاستحقاق (بعد 30 يوم من تاريخ الاستثمار)
            const dueDate = new Date(investmentStartDate);
            dueDate.setDate(dueDate.getDate() + SYSTEM_CONFIG.profitCycle);
            
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
        
        // تفريغ الجدول
        tableBody.innerHTML = '';
        
        // عرض الأرباح في الجدول
        if (profitsList.length > 0) {
            profitsList.forEach(item => {
                // تحديد حالة استحقاق الربح
                const today = new Date();
                const isDue = item.dueDate <= today;
                const daysToMaturity = Math.floor((item.dueDate - today) / (1000 * 60 * 60 * 24));
                
                let dueBadge = '';
                if (isDue) {
                    dueBadge = '<span class="badge badge-danger">مستحق الآن</span>';
                } else if (daysToMaturity <= SYSTEM_CONFIG.reminderDays) {
                    dueBadge = `<span class="badge badge-warning">بعد ${daysToMaturity} يوم</span>`;
                }
                
                // إنشاء الصف
                const row = document.createElement('tr');
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
                    <td>${formatCurrency(item.investmentAmount)} ${SYSTEM_CONFIG.currency}</td>
                    <td>${formatDate(item.investmentDate)}</td>
                    <td>${item.days} يوم</td>
                    <td>${formatCurrency(item.profit)} ${SYSTEM_CONFIG.currency}</td>
                    <td>${formatDate(item.dueDate)} ${dueBadge}</td>
                    <td>
                        <button class="btn btn-success btn-sm pay-profit-btn" data-id="${item.investor.id}">
                            <i class="fas fa-coins"></i>
                            <span>دفع الأرباح</span>
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        } else {
            // عرض رسالة فارغة
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="7" class="text-center">لا يوجد أرباح مستحقة</td>';
            tableBody.appendChild(emptyRow);
        }
    }
}

// إنشاء مدير الأرباح عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.profitsManager = new ProfitsManager();
});