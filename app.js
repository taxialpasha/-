/**
 * نظام الاستثمار المتكامل - تطبيق الواجهة الرئيسية
 * الملف الرئيسي للتطبيق (تمت معالجة الأخطاء)
 */

// الملف الرئيسي للتطبيق - النسخة المصححة
class App {
    constructor() {
        // تهيئة التطبيق
        this.initialize();
    }
    
    // تهيئة التطبيق
    initialize() {
        // تحميل البيانات
        this.loadInitialData();
        
        // تهيئة المخططات البيانية
        this.initCharts();
        
        // تحديث لوحة التحكم
        this.updateDashboard();
        
        console.log('تم تهيئة التطبيق بنجاح');
    }
    
    // تحميل البيانات الأولية
    loadInitialData() {
        // التأكد من وجود بيانات أولية
        this.createDemoDataIfEmpty();
    }
    
    // إنشاء بيانات تجريبية إذا كانت قاعدة البيانات فارغة
    createDemoDataIfEmpty() {
        const investors = db.getAllInvestors();
        
        if (investors.length === 0 && !localStorage.getItem('demoDataLoaded')) {
            // إنشاء بيانات المستثمرين التجريبية
            const demoInvestors = [
                {
                    name: 'محمد أحمد',
                    phone: '0501234567',
                    address: 'الرياض، حي النخيل',
                    card: 'ID12345678',
                    amount: 1000000,
                    depositDate: new Date(new Date().setDate(new Date().getDate() - 45)).toISOString()
                },
                {
                    name: 'سارة علي',
                    phone: '0557654321',
                    address: 'جدة، حي الشاطئ',
                    card: 'ID87654321',
                    amount: 2000000,
                    depositDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()
                },
                {
                    name: 'خالد محمد',
                    phone: '0509876543',
                    address: 'الدمام، حي الفيصلية',
                    card: 'ID56789012',
                    amount: 5000000,
                    depositDate: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString()
                }
            ];
            
            // إضافة المستثمرين التجريبيين
            demoInvestors.forEach(investor => {
                db.addInvestor(investor);
            });
            
            // تعيين علم البيانات التجريبية
            localStorage.setItem('demoDataLoaded', 'true');
            
            console.log('تم إنشاء بيانات تجريبية');
        }
    }
    
    // تهيئة المخططات البيانية
    initCharts() {
        // رسم بياني للاستثمارات
        const investmentChart = document.getElementById('investment-chart');
        if (investmentChart && window.Chart) {
            this.investmentChart = new Chart(investmentChart.getContext('2d'), {
                type: 'line',
                data: {
                    labels: this.getLast6Months(),
                    datasets: [{
                        label: 'إجمالي الاستثمارات',
                        data: this.getMonthlyInvestmentData(),
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
            this.investorsChart = new Chart(investorsChart.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['نشط', 'قيد المراجعة', 'غير نشط'],
                    datasets: [{
                        data: [db.getAllInvestors().length, 0, 0],
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
    
    // تحديث المخططات البيانية
    updateCharts() {
        // تحديث رسم بياني الاستثمارات
        if (this.investmentChart) {
            this.investmentChart.data.datasets[0].data = this.getMonthlyInvestmentData();
            this.investmentChart.update();
        }
        
        // تحديث رسم بياني المستثمرين
        if (this.investorsChart) {
            this.investorsChart.data.datasets[0].data = [db.getAllInvestors().length, 0, 0];
            this.investorsChart.update();
        }
    }
    
    // الحصول على أسماء الأشهر الستة الأخيرة
    getLast6Months() {
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
    getMonthlyInvestmentData() {
        const data = [0, 0, 0, 0, 0, 0]; // 6 أشهر
        const now = new Date();
        const transactions = db.getAllTransactions();
        
        transactions.forEach(transaction => {
            if (transaction.type !== TRANSACTION_TYPES.DEPOSIT) return;
            
            const transDate = new Date(transaction.date || transaction.createdAt);
            const monthsAgo = (now.getFullYear() - transDate.getFullYear()) * 12 + now.getMonth() - transDate.getMonth();
            
            if (monthsAgo >= 0 && monthsAgo < 6) {
                data[5 - monthsAgo] += transaction.amount;
            }
        });
        
        return data;
    }
    
    // تحديث لوحة التحكم الرئيسية
    updateDashboard() {
        // تحديث إجمالي الاستثمارات
        const totalInvestments = db.getAllInvestors().reduce((sum, investor) => sum + (investor.amount || 0), 0);
        const totalInvestmentsElement = document.getElementById('total-investments');
        if (totalInvestmentsElement) {
            totalInvestmentsElement.textContent = `${formatCurrency(totalInvestments)} ${SYSTEM_CONFIG.currency}`;
        }
        
        // تحديث الأرباح الشهرية
        const monthlyProfits = this.calculateMonthlyProfits();
        const monthlyProfitsElement = document.getElementById('monthly-profits');
        if (monthlyProfitsElement) {
            monthlyProfitsElement.textContent = `${formatCurrency(monthlyProfits)} ${SYSTEM_CONFIG.currency}`;
        }
        
        // تحديث عدد المستثمرين
        const investorsCountElement = document.getElementById('investors-count');
        if (investorsCountElement) {
            investorsCountElement.textContent = db.getAllInvestors().length;
        }
        
        // تحديث نسبة العائد
        const interestRateElement = document.getElementById('interest-rate');
        if (interestRateElement) {
            interestRateElement.textContent = `${SYSTEM_CONFIG.interestRate}%`;
        }
        
        // تحديث المخططات البيانية
        this.updateCharts();
        
        // تحديث آخر العمليات
        if (window.transactionsManager) {
            window.transactionsManager.renderRecentTransactions();
        }
    }
    
    // حساب الأرباح الشهرية
    calculateMonthlyProfits() {
        const investors = db.getAllInvestors();
        
        return investors.reduce((sum, investor) => {
            const monthlyProfit = investor.investments.reduce((total, investment) => {
                return total + calculateProfit(investment.amount, 30);
            }, 0);
            return sum + monthlyProfit;
        }, 0);
    }
}

// إنشاء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});