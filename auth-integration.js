/**
 * ملف دمج نظام المصادقة مع التطبيق الرئيسي
 * نظام الاستثمار المتكامل
 */

// استدعاء الملفات الأساسية لنظام المصادقة
document.addEventListener('DOMContentLoaded', function() {
    // إضافة ملفات CSS
    addStylesheet('auth-system-styles.css');
    
    // إضافة ملفات JavaScript
    loadScript('auth-system.js', function() {
        // بعد تحميل نظام المصادقة بنجاح
        console.log('تم تحميل نظام المصادقة بنجاح');
        
        // تعديل التطبيق ليعمل مع نظام المصادقة
        setupAppWithAuth();
    });
});

/**
 * إضافة ملف CSS للصفحة
 * @param {string} href - مسار ملف CSS
 */
function addStylesheet(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

/**
 * تحميل ملف JavaScript
 * @param {string} src - مسار ملف JavaScript
 * @param {Function} callback - دالة تنفذ بعد تحميل الملف
 */
function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = function() {
        console.error(`فشل تحميل الملف: ${src}`);
    };
    document.body.appendChild(script);
}

/**
 * إعداد التطبيق للعمل مع نظام المصادقة
 */
function setupAppWithAuth() {
    // الحصول على حالة المصادقة الحالية
    AuthSystem.initialize()
        .then(initialized => {
            if (initialized) {
                // التحقق من وجود مستخدم حالي
                const currentUser = AuthSystem.getCurrentUser();
                
                if (currentUser) {
                    console.log(`المستخدم الحالي: ${currentUser.displayName || currentUser.email}`);
                    
                    // إضافة معلومات المستخدم إلى الواجهة
                    updateUserInterface(currentUser);
                    
                    // إعداد تسجيل الأحداث لجميع العمليات
                    setupOperationsLogging();
                } else {
                    console.log('لم يتم تسجيل الدخول');
                    
                    // عرض شاشة تسجيل الدخول
                    showLoginScreen();
                }
            } else {
                console.error('فشل في تهيئة نظام المصادقة');
            }
        })
        .catch(error => {
            console.error('خطأ في تهيئة نظام المصادقة:', error);
        });
}

/**
 * تحديث واجهة المستخدم بمعلومات المستخدم
 * @param {Object} user - معلومات المستخدم
 */
function updateUserInterface(user) {
    // إضافة معلومات المستخدم إلى الشريط العلوي
    addUserInfoToHeader(user);
    
    // تحديث وصول العناصر حسب صلاحيات المستخدم
    updateElementsBasedOnPermissions(user);
    
    // إضافة صفحات إضافية حسب نوع المستخدم
    if (AuthSystem.isAdmin()) {
        // إضافة صفحات خاصة بالمسؤول
        addAdminPages();
    }
}

/**
 * إضافة معلومات المستخدم إلى الشريط العلوي
 * @param {Object} user - معلومات المستخدم
 */
function addUserInfoToHeader(user) {
    // البحث عن عنصر شريط العنوان
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    
    // إنشاء عنصر معلومات المستخدم
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info dropdown';
    
    userInfo.innerHTML = `
        <button class="dropdown-toggle">
            <div class="user-avatar">${(user.displayName || user.email).charAt(0).toUpperCase()}</div>
            <div>
                <div class="user-name">${user.displayName || user.email}</div>
                <div class="user-type">${getUserTypeLabel(user.type)}</div>
            </div>
            <i class="fas fa-chevron-down"></i>
        </button>
        <div class="dropdown-menu">
            <a href="#" class="dropdown-item" id="profile-btn">
                <i class="fas fa-user"></i>
                <span>الملف الشخصي</span>
            </a>
            <a href="#" class="dropdown-item" id="change-password-btn">
                <i class="fas fa-key"></i>
                <span>تغيير كلمة المرور</span>
            </a>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item" id="logout-btn">
                <i class="fas fa-sign-out-alt"></i>
                <span>تسجيل الخروج</span>
            </a>
        </div>
    `;
    
    // إضافة عنصر معلومات المستخدم إلى الشريط العلوي
    headerActions.appendChild(userInfo);
    
    // إضافة مستمعي الأحداث
    setupUserMenuListeners();
}

/**
 * إضافة مستمعي الأحداث لقائمة المستخدم
 */
function setupUserMenuListeners() {
    // تبديل القائمة المنسدلة
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    if (dropdownToggle) {
        dropdownToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.dropdown');
            if (dropdown) {
                dropdown.classList.toggle('active');
            }
        });
    }
    
    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            const activeDropdowns = document.querySelectorAll('.dropdown.active');
            activeDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
    
    // الملف الشخصي
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showProfileModal();
        });
    }
    
    // تغيير كلمة المرور
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showChangePasswordModal();
        });
    }
    
    // تسجيل الخروج
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // تأكيد تسجيل الخروج
            if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
                AuthSystem.logout()
                    .then(() => {
                        // عرض شاشة تسجيل الدخول
                        showLoginScreen();
                        
                        showNotification('تم تسجيل الخروج بنجاح', 'success');
                    })
                    .catch(error => {
                        console.error('خطأ في تسجيل الخروج:', error);
                        showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
                    });
            }
        });
    }
}

/**
 * تحديث وصول العناصر حسب صلاحيات المستخدم
 * @param {Object} user - معلومات المستخدم
 */
function updateElementsBasedOnPermissions(user) {
    // إضافة فئة نوع المستخدم للجسم
    document.body.setAttribute('data-user-type', user.type);
    
    // عناصر حذف المستثمرين
    const deleteInvestorsElements = document.querySelectorAll('.delete-investor');
    deleteInvestorsElements.forEach(element => {
        if (user.permissions.canDeleteInvestors) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    
    // عناصر إدارة الإعدادات
    const settingsManagementElements = document.querySelectorAll('.settings-management');
    settingsManagementElements.forEach(element => {
        if (user.permissions.canManageSettings) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });

    // عناصر تصدير البيانات
    const exportDataElements = document.querySelectorAll('.export-data');
    exportDataElements.forEach(element => {
        if (user.permissions.canExportData) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });

    // عناصر استيراد البيانات
    const importDataElements = document.querySelectorAll('.import-data');
    importDataElements.forEach(element => {
        if (user.permissions.canImportData) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });

    // عناصر إنشاء النسخ الاحتياطية
    const createBackupElements = document.querySelectorAll('.create-backup');
    createBackupElements.forEach(element => {
        if (user.permissions.canCreateBackup) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });

    // عناصر استعادة النسخ الاحتياطية
    const restoreBackupElements = document.querySelectorAll('.restore-backup');
    restoreBackupElements.forEach(element => {
        if (user.permissions.canRestoreBackup) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}
