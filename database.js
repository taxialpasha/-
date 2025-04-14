/**
 * نظام الاستثمار المتكامل - ملف قاعدة البيانات
 * يتعامل مع تخزين واسترجاع بيانات النظام
 */

class Database {
    constructor() {
        this.investors = [];
        this.transactions = [];
        this.profits = [];
        
        // تحميل البيانات من التخزين المحلي
        this.loadData();
    }
    
    // تحميل البيانات من التخزين المحلي
    loadData() {
        try {
            const savedInvestors = localStorage.getItem('investors');
            if (savedInvestors) {
                this.investors = JSON.parse(savedInvestors);
            }
            
            const savedTransactions = localStorage.getItem('transactions');
            if (savedTransactions) {
                this.transactions = JSON.parse(savedTransactions);
            }
            
            const savedProfits = localStorage.getItem('profits');
            if (savedProfits) {
                this.profits = JSON.parse(savedProfits);
            }
            
            console.log('تم تحميل البيانات بنجاح');
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
        }
    }
    
    // حفظ البيانات في التخزين المحلي
    saveData() {
        try {
            localStorage.setItem('investors', JSON.stringify(this.investors));
            localStorage.setItem('transactions', JSON.stringify(this.transactions));
            localStorage.setItem('profits', JSON.stringify(this.profits));
            
            // إطلاق حدث لتحديث واجهة المستخدم
            document.dispatchEvent(new CustomEvent('data:updated'));
            
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            return false;
        }
    }
    
    // الحصول على جميع المستثمرين
    getAllInvestors() {
        return [...this.investors];
    }
    
    // الحصول على مستثمر معين
    getInvestor(id) {
        return this.investors.find(investor => investor.id === id);
    }
    
    // إضافة مستثمر جديد
    addInvestor(investorData) {
        // إنشاء معرف فريد للمستثمر إذا لم يكن موجودًا
        const id = investorData.id || generateId('inv-');
        const createdAt = new Date().toISOString();
        
        // إنشاء المستثمر
        const investor = {
            id,
            name: investorData.name,
            phone: investorData.phone,
            address: investorData.address,
            cardNumber: investorData.card || investorData.cardNumber,
            joinDate: investorData.depositDate || investorData.joinDate || createdAt,
            createdAt,
            status: investorData.status || INVESTOR_STATUS.ACTIVE,
            amount: parseFloat(investorData.amount) || 0,
            investments: investorData.investments || [
                {
                    amount: parseFloat(investorData.amount) || 0,
                    date: investorData.depositDate || investorData.joinDate || createdAt,
                    interest: calculateProfit(parseFloat(investorData.amount) || 0, 30)
                }
            ],
            profits: investorData.profits || [],
            withdrawals: investorData.withdrawals || []
        };
        
        // إضافة المستثمر إلى المصفوفة
        this.investors.push(investor);
        
        // إضافة عملية إيداع أولية
        if (!investorData.skipInitialDeposit) {
            this.addTransaction({
                investorId: id,
                investorName: investor.name,
                type: TRANSACTION_TYPES.DEPOSIT,
                amount: parseFloat(investorData.amount) || 0,
                date: investorData.depositDate || investorData.joinDate || createdAt,
                status: TRANSACTION_STATUS.COMPLETED
            });
        }
        
        // حفظ البيانات
        this.saveData();
        
        return investor;
    }
    
    // تحديث بيانات مستثمر
    updateInvestor(id, investorData) {
        const index = this.investors.findIndex(investor => investor.id === id);
        
        if (index === -1) {
            return false;
        }
        
        // تحديث بيانات المستثمر
        this.investors[index] = {
            ...this.investors[index],
            name: investorData.name || this.investors[index].name,
            phone: investorData.phone || this.investors[index].phone,
            address: investorData.address || this.investors[index].address,
            cardNumber: investorData.cardNumber || this.investors[index].cardNumber,
            status: investorData.status || this.investors[index].status,
            // لا نقوم بتحديث المبلغ مباشرة، بل من خلال الإيداعات والسحوبات
            // كما لا نقوم بتحديث تاريخ الانضمام
        };
        
        // حفظ البيانات
        this.saveData();
        
        return this.investors[index];
    }
    
    // حذف مستثمر
    deleteInvestor(id) {
        const index = this.investors.findIndex(investor => investor.id === id);
        
        if (index === -1) {
            return false;
        }
        
        // حذف المستثمر من المصفوفة
        this.investors.splice(index, 1);
        
        // حفظ البيانات
        this.saveData();
        
        return true;
    }
    
    // الحصول على جميع العمليات
    getAllTransactions() {
        return [...this.transactions];
    }
    
    // الحصول على عمليات مستثمر معين
    getInvestorTransactions(investorId) {
        return this.transactions.filter(transaction => transaction.investorId === investorId);
    }
    
    // إضافة عملية جديدة
    addTransaction(transactionData) {
        // إنشاء معرف فريد للعملية
        const id = transactionData.id || generateId('tr-');
        const createdAt = new Date().toISOString();
        
        // الحصول على المستثمر
        const investor = this.getInvestor(transactionData.investorId);
        
        if (!investor && transactionData.type !== 'system') {
            return false;
        }
        
        // حساب الرصيد بعد العملية
        let balanceAfter = investor ? investor.amount : 0;
        
        if (transactionData.type === TRANSACTION_TYPES.DEPOSIT) {
            // في حالة الإيداع، نضيف المبلغ إلى رصيد المستثمر
            if (investor) {
                investor.amount = (investor.amount || 0) + parseFloat(transactionData.amount);
                
                // إضافة استثمار جديد
                investor.investments.push({
                    amount: parseFloat(transactionData.amount),
                    date: transactionData.date || createdAt,
                    interest: calculateProfit(parseFloat(transactionData.amount), 30),
                    notes: transactionData.notes || ''
                });
                
                balanceAfter = investor.amount;
            }
        } else if (transactionData.type === TRANSACTION_TYPES.WITHDRAW) {
            // في حالة السحب، نخصم المبلغ من رصيد المستثمر
            if (investor) {
                investor.amount = (investor.amount || 0) - parseFloat(transactionData.amount);
                
                // تسجيل السحب
                investor.withdrawals.push({
                    amount: parseFloat(transactionData.amount),
                    date: transactionData.date || createdAt,
                    notes: transactionData.notes || ''
                });
                
                // تحديث الاستثمارات (تخفيض المبالغ بدءًا من الأقدم)
                let remainingWithdrawal = parseFloat(transactionData.amount);
                
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
                    investor.investments[i].interest = calculateProfit(investor.investments[i].amount, 30);
                }
                
                // إزالة الاستثمارات ذات المبلغ الصفري
                investor.investments = investor.investments.filter(inv => inv.amount > 0);
                
                balanceAfter = investor.amount;
            }
        } else if (transactionData.type === TRANSACTION_TYPES.PROFIT) {
            // في حالة الأرباح، لا نقوم بتحديث الرصيد الأساسي
            balanceAfter = investor ? investor.amount : 0;
        }
        
        // إنشاء العملية
        const transaction = {
            id,
            investorId: transactionData.investorId,
            investorName: investor ? investor.name : transactionData.investorName || 'غير معروف',
            type: transactionData.type,
            amount: parseFloat(transactionData.amount),
            date: transactionData.date || createdAt,
            createdAt,
            notes: transactionData.notes || '',
            status: transactionData.status || TRANSACTION_STATUS.COMPLETED,
            balanceAfter
        };
        
        // إضافة العملية إلى المصفوفة
        this.transactions.push(transaction);
        
        // حفظ البيانات
        this.saveData();
        
        return transaction;
    }
    
    // الحصول على جميع الأرباح
    getAllProfits() {
        return [...this.profits];
    }
    
    // الحصول على أرباح مستثمر معين
    getInvestorProfits(investorId) {
        return this.profits.filter(profit => profit.investorId === investorId);
    }
    
    // إضافة ربح جديد
    addProfit(profitData) {
        // إنشاء معرف فريد للربح
        const id = profitData.id || generateId('prf-');
        const createdAt = new Date().toISOString();
        
        // الحصول على المستثمر
        const investor = this.getInvestor(profitData.investorId);
        
        if (!investor) {
            return false;
        }
        
        // إنشاء الربح
        const profit = {
            id,
            investorId: profitData.investorId,
            investorName: investor.name,
            amount: parseFloat(profitData.amount),
            startDate: profitData.startDate,
            endDate: profitData.endDate || createdAt,
            dueDate: profitData.dueDate,
            investmentAmount: parseFloat(profitData.investmentAmount) || investor.amount,
            days: profitData.days || 30,
            status: profitData.status || PROFIT_STATUS.PENDING,
            createdAt,
            paidAt: null,
            notes: profitData.notes || ''
        };
        
        // إضافة الربح إلى المصفوفة
        this.profits.push(profit);
        
        // حفظ البيانات
        this.saveData();
        
        return profit;
    }
    
    // تحديث حالة الربح
    updateProfitStatus(id, status) {
        const index = this.profits.findIndex(profit => profit.id === id);
        
        if (index === -1) {
            return false;
        }
        
        // تحديث حالة الربح
        this.profits[index].status = status;
        
        // إذا كانت الحالة "مدفوعة"، فنسجل وقت الدفع
        if (status === PROFIT_STATUS.PAID) {
            this.profits[index].paidAt = new Date().toISOString();
            
            // إضافة عملية دفع ربح
            this.addTransaction({
                investorId: this.profits[index].investorId,
                type: TRANSACTION_TYPES.PROFIT,
                amount: this.profits[index].amount,
                date: this.profits[index].paidAt,
                notes: `دفع ربح عن الفترة من ${formatDate(this.profits[index].startDate)} إلى ${formatDate(this.profits[index].endDate)}`
            });
            
            // تسجيل الربح في سجل المستثمر
            const investor = this.getInvestor(this.profits[index].investorId);
            if (investor) {
                investor.profits.push({
                    date: this.profits[index].paidAt,
                    amount: this.profits[index].amount
                });
            }
        }
        
        // حفظ البيانات
        this.saveData();
        
        return this.profits[index];
    }
}

// إنشاء نسخة واحدة من قاعدة البيانات
const db = new Database();