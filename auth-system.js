/**
 * auth-system.js
 * نظام المصادقة والأمان لتطبيق نظام الاستثمار المتكامل
 * يوفر وظائف إدارة المستخدمين، تسجيل الدخول، والتحكم بالصلاحيات
 */

if (typeof ADMIN_CODE === 'undefined') {
    const ADMIN_CODE = "admin1234";
}

// ثوابت لأنواع المستخدمين وصلاحياتهم
const USER_TYPES = {
    ADMIN: 'admin',    // مسؤول كامل الصلاحيات
    MANAGER: 'manager', // مدير بصلاحيات محدودة
    USER: 'user'       // مستخدم عادي
};

// الصلاحيات لكل نوع مستخدم
const PERMISSIONS = {
    [USER_TYPES.ADMIN]: {
        canCreateUsers: true,
        canDeleteUsers: true,
        canManageSettings: true,
        canDeleteInvestors: true,
        canViewAllData: true,
        canExportData: true,
        canImportData: true,
        canCreateBackup: true,
        canRestoreBackup: true
    },
    [USER_TYPES.MANAGER]: {
        canCreateUsers: false,
        canDeleteUsers: false,
        canManageSettings: true,
        canDeleteInvestors: true,
        canViewAllData: true,
        canExportData: true,
        canImportData: true,
        canCreateBackup: true,
        canRestoreBackup: false
    },
    [USER_TYPES.USER]: {
        canCreateUsers: false,
        canDeleteUsers: false,
        canManageSettings: false,
        canDeleteInvestors: false,
        canViewAllData: true,
        canExportData: true,
        canImportData: false,
        canCreateBackup: false,
        canRestoreBackup: false
    }
};

// كائن إدارة المصادقة

    // المتغيرات الخاصة
    let currentUser = null;
    let isInitialized = false;
    let authStateListeners = [];
    let databaseRef = null;
    let storageRef = null;
    
    /**
     * تهيئة نظام المصادقة
     * @returns {Promise} وعد يشير إلى نجاح أو فشل التهيئة
     */
    function initialize() {
        return new Promise((resolve, reject) => {
            if (isInitialized) {
                resolve(true);
                return;
            }

            try {
                // التحقق من تهيئة Firebase مسبقاً
                if (!firebase.apps.length) {
                    // التكوين يجب أن يكون موجوداً بالفعل في الصفحة
                    if (typeof firebaseConfig === 'undefined') {
                        reject(new Error('لم يتم العثور على تكوين Firebase'));
                        return;
                    }
                    
                    firebase.initializeApp(firebaseConfig);
                }
                
                // إنشاء الإشارة إلى قاعدة البيانات
                databaseRef = firebase.database();
                storageRef = firebase.storage();
                
                // التحقق من حالة المصادقة الحالية
                firebase.auth().onAuthStateChanged(user => {
                    if (user) {
                        // الحصول على بيانات المستخدم من قاعدة البيانات
                        getUserData(user.uid)
                            .then(userData => {
                                currentUser = {
                                    uid: user.uid,
                                    email: user.email,
                                    displayName: user.displayName || userData.fullName,
                                    photoURL: user.photoURL,
                                    type: userData.type || USER_TYPES.USER,
                                    permissions: PERMISSIONS[userData.type || USER_TYPES.USER],
                                    metadata: userData
                                };
                                
                                // تحديث واجهة المستخدم
                                updateUIForUser();
                                
                                // إخطار المستمعين بتغيير حالة المصادقة
                                notifyAuthStateListeners(currentUser);
                                
                                console.log(`تم تسجيل الدخول كـ ${currentUser.displayName || currentUser.email}`);
                            })
                            .catch(error => {
                                console.error('خطأ في الحصول على بيانات المستخدم:', error);
                                // تعيين معلومات المستخدم الأساسية
                                currentUser = {
                                    uid: user.uid,
                                    email: user.email,
                                    displayName: user.displayName || user.email,
                                    photoURL: user.photoURL,
                                    type: USER_TYPES.USER,
                                    permissions: PERMISSIONS[USER_TYPES.USER]
                                };
                                
                                // تحديث واجهة المستخدم
                                updateUIForUser();
                                
                                // إخطار المستمعين بتغيير حالة المصادقة
                                notifyAuthStateListeners(currentUser);
                            });
                    } else {
                        currentUser = null;
                        
                        // تحديث واجهة المستخدم
                        updateUIForUser();
                        
                        // إخطار المستمعين بتغيير حالة المصادقة
                        notifyAuthStateListeners(null);
                        
                        console.log('لم يتم تسجيل الدخول');
                    }
                });
                
                isInitialized = true;
                resolve(true);
            } catch (error) {
                console.error('خطأ في تهيئة نظام المصادقة:', error);
                reject(error);
            }
        });
    }

    /**
     * إنشاء حساب جديد
     * @param {string} email - البريد الإلكتروني
     * @param {string} password - كلمة المرور
     * @param {string} fullName - الاسم الكامل
     * @param {string} adminCode - رمز المسؤول (مطلوب للإنشاء الأولي أو حسابات المسؤولين)
     * @param {string} userType - نوع المستخدم (مسؤول، مدير، مستخدم)
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function signup(email, password, fullName, adminCode, userType = USER_TYPES.USER) {
        return new Promise((resolve, reject) => {
            // التحقق من وجود مستخدمين
            checkIfFirstUser()
                .then(isFirstUser => {
                    // التحقق من رمز المسؤول إذا لم يكن المستخدم الأول أو إذا طلب صلاحيات مسؤول
                    if ((!isFirstUser || userType === USER_TYPES.ADMIN) && adminCode !== ADMIN_CODE) {
                        reject(new Error('رمز المسؤول غير صحيح'));
                        return;
                    }
                    
                    // إذا كان المستخدم الأول، فسيكون مسؤولاً بغض النظر عن النوع المطلوب
                    if (isFirstUser) {
                        userType = USER_TYPES.ADMIN;
                    }
                    
                    // التحقق من صلاحية إنشاء المستخدم إذا لم يكن المستخدم الأول
                    if (!isFirstUser && currentUser) {
                        // التحقق من صلاحية إنشاء المستخدمين
                        if (!currentUser.permissions.canCreateUsers) {
                            reject(new Error('ليس لديك صلاحية إنشاء مستخدمين جدد'));
                            return;
                        }
                        
                        // التحقق من صلاحية إنشاء مسؤولين
                        if (userType === USER_TYPES.ADMIN && currentUser.type !== USER_TYPES.ADMIN) {
                            reject(new Error('ليس لديك صلاحية إنشاء مستخدمين بصلاحيات مسؤول'));
                            return;
                        }
                    }
                    
                    // إنشاء المستخدم في خدمة المصادقة
                    firebase.auth().createUserWithEmailAndPassword(email, password)
                        .then(userCredential => {
                            const user = userCredential.user;
                            
                            // تحديث اسم المستخدم
                            return user.updateProfile({
                                displayName: fullName
                            }).then(() => user);
                        })
                        .then(user => {
                            // حفظ بيانات المستخدم في قاعدة البيانات
                            const userData = {
                                uid: user.uid,
                                email: email,
                                fullName: fullName,
                                type: userType,
                                createdAt: new Date().toISOString(),
                                lastLogin: new Date().toISOString()
                            };
                            
                            return databaseRef.ref(`users/${user.uid}/profile`).set(userData)
                                .then(() => {
                                    // إنشاء سجل بإنشاء المستخدم
                                    const logEntry = {
                                        action: 'user_created',
                                        timestamp: new Date().toISOString(),
                                        userId: user.uid,
                                        userEmail: email,
                                        userType: userType,
                                        createdBy: currentUser ? currentUser.uid : 'self_registration'
                                    };
                                    
                                    // إضافة السجل إلى تاريخ الأحداث
                                    return databaseRef.ref('system_logs/users').push(logEntry)
                                        .then(() => {
                                            resolve({
                                                user: user,
                                                userData: userData
                                            });
                                        });
                                });
                        })
                        .catch(error => {
                            console.error('خطأ في إنشاء المستخدم:', error);
                            reject(error);
                        });
                })
                .catch(error => {
                    console.error('خطأ في التحقق من وجود مستخدمين:', error);
                    reject(error);
                });
        });
    }

    /**
     * تسجيل الدخول إلى الحساب
     * @param {string} email - البريد الإلكتروني
     * @param {string} password - كلمة المرور
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function login(email, password) {
        return firebase.auth().signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                
                // تحديث وقت آخر تسجيل دخول
                databaseRef.ref(`users/${user.uid}/profile/lastLogin`).set(new Date().toISOString());
                
                // إنشاء سجل بتسجيل الدخول
                const logEntry = {
                    action: 'user_login',
                    timestamp: new Date().toISOString(),
                    userId: user.uid,
                    userEmail: email,
                    ip: window.userIP || 'unknown', // يمكن تنفيذ خدمة للحصول على عنوان IP
                    userAgent: navigator.userAgent
                };
                
                // إضافة السجل إلى تاريخ الأحداث
                return databaseRef.ref('system_logs/authentication').push(logEntry)
                    .then(() => user);
            });
    }

    /**
     * تسجيل الخروج من الحساب
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function logout() {
        // تسجيل حدث تسجيل الخروج قبل التنفيذ الفعلي
        if (currentUser) {
            const logEntry = {
                action: 'user_logout',
                timestamp: new Date().toISOString(),
                userId: currentUser.uid,
                userEmail: currentUser.email
            };
            
            // إضافة السجل إلى تاريخ الأحداث
            databaseRef.ref('system_logs/authentication').push(logEntry);
        }
        
        return firebase.auth().signOut();
    }

    /**
     * التحقق من وجود مستخدمين في النظام
     * @returns {Promise<boolean>} وعد يحتوي على قيمة بولية تشير إلى ما إذا كان هذا هو المستخدم الأول
     */
    function checkIfFirstUser() {
        return databaseRef.ref('users').once('value')
            .then(snapshot => {
                return !snapshot.exists();
            });
    }

    /**
     * الحصول على بيانات المستخدم من قاعدة البيانات
     * @param {string} userId - معرف المستخدم
     * @returns {Promise<Object>} وعد يحتوي على بيانات المستخدم
     */
    function getUserData(userId) {
        return databaseRef.ref(`users/${userId}/profile`).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (!userData) {
                    throw new Error('لم يتم العثور على بيانات المستخدم');
                }
                return userData;
            });
    }

    /**
     * تحديث معلومات المستخدم
     * @param {string} userId - معرف المستخدم
     * @param {Object} userData - البيانات المراد تحديثها
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function updateUserData(userId, userData) {
        // التحقق من الصلاحيات
        if (currentUser.uid !== userId && !currentUser.permissions.canCreateUsers) {
            return Promise.reject(new Error('ليس لديك صلاحية تعديل بيانات المستخدمين'));
        }
        
        // منع المستخدم من تغيير نوعه إلى مسؤول إلا إذا كان مسؤولاً بالفعل
        if (userData.type === USER_TYPES.ADMIN && currentUser.type !== USER_TYPES.ADMIN) {
            return Promise.reject(new Error('ليس لديك صلاحية تعيين المستخدمين كمسؤولين'));
        }
        
        return databaseRef.ref(`users/${userId}/profile`).update(userData)
            .then(() => {
                // إنشاء سجل بتحديث بيانات المستخدم
                const logEntry = {
                    action: 'user_updated',
                    timestamp: new Date().toISOString(),
                    userId: userId,
                    updatedBy: currentUser.uid,
                    updatedFields: Object.keys(userData)
                };
                
                // إضافة السجل إلى تاريخ الأحداث
                return databaseRef.ref('system_logs/users').push(logEntry);
            });
    }

    /**
     * حذف مستخدم
     * @param {string} userId - معرف المستخدم
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function deleteUser(userId) {
        // التحقق من الصلاحيات
        if (!currentUser.permissions.canDeleteUsers) {
            return Promise.reject(new Error('ليس لديك صلاحية حذف المستخدمين'));
        }
        
        // الحصول على بيانات المستخدم قبل الحذف
        return getUserData(userId)
            .then(userData => {
                // منع حذف المستخدمين المسؤولين إلا من قبل مسؤول آخر
                if (userData.type === USER_TYPES.ADMIN && currentUser.type !== USER_TYPES.ADMIN) {
                    return Promise.reject(new Error('ليس لديك صلاحية حذف المستخدمين المسؤولين'));
                }
                
                // حذف المستخدم من قاعدة البيانات
                return databaseRef.ref(`users/${userId}`).remove()
                    .then(() => {
                        // إنشاء سجل بحذف المستخدم
                        const logEntry = {
                            action: 'user_deleted',
                            timestamp: new Date().toISOString(),
                            deletedUserId: userId,
                            deletedUserEmail: userData.email,
                            deletedUserType: userData.type,
                            deletedBy: currentUser.uid
                        };
                        
                        // إضافة السجل إلى تاريخ الأحداث
                        return databaseRef.ref('system_logs/users').push(logEntry);
                    });
            });
    }

    /**
     * الحصول على قائمة المستخدمين
     * @returns {Promise<Array>} وعد يحتوي على قائمة المستخدمين
     */
    function getUsers() {
        // التحقق من الصلاحيات
        if (!currentUser.permissions.canCreateUsers && !currentUser.permissions.canDeleteUsers) {
            return Promise.reject(new Error('ليس لديك صلاحية عرض قائمة المستخدمين'));
        }
        
        return databaseRef.ref('users').once('value')
            .then(snapshot => {
                const usersData = snapshot.val();
                if (!usersData) {
                    return [];
                }
                
                const usersList = [];
                Object.keys(usersData).forEach(userId => {
                    const user = usersData[userId].profile;
                    if (user) {
                        usersList.push({
                            uid: userId,
                            ...user
                        });
                    }
                });
                
                return usersList;
            });
    }

    /**
     * تغيير كلمة المرور
     * @param {string} currentPassword - كلمة المرور الحالية
     * @param {string} newPassword - كلمة المرور الجديدة
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function changePassword(currentPassword, newPassword) {
        const user = firebase.auth().currentUser;
        if (!user) {
            return Promise.reject(new Error('لم يتم تسجيل الدخول'));
        }
        
        // إعادة المصادقة قبل تغيير كلمة المرور
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        return user.reauthenticateWithCredential(credential)
            .then(() => {
                return user.updatePassword(newPassword);
            })
            .then(() => {
                // إنشاء سجل بتغيير كلمة المرور
                const logEntry = {
                    action: 'password_changed',
                    timestamp: new Date().toISOString(),
                    userId: user.uid,
                    userEmail: user.email
                };
                
                // إضافة السجل إلى تاريخ الأحداث
                return databaseRef.ref('system_logs/authentication').push(logEntry);
            });
    }

    /**
     * إرسال رسالة إعادة تعيين كلمة المرور
     * @param {string} email - البريد الإلكتروني
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function resetPassword(email) {
        return firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                // إنشاء سجل بطلب إعادة تعيين كلمة المرور
                const logEntry = {
                    action: 'password_reset_requested',
                    timestamp: new Date().toISOString(),
                    userEmail: email,
                    requestedBy: currentUser ? currentUser.uid : 'self'
                };
                
                // إضافة السجل إلى تاريخ الأحداث
                return databaseRef.ref('system_logs/authentication').push(logEntry);
            });
    }

    /**
     * تغيير رمز المسؤول
     * @param {string} currentAdminCode - رمز المسؤول الحالي
     * @param {string} newAdminCode - رمز المسؤول الجديد
     * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
     */
    function changeAdminCode(currentAdminCode, newAdminCode) {
        // التحقق من الصلاحيات
        if (currentUser.type !== USER_TYPES.ADMIN) {
            return Promise.reject(new Error('ليس لديك صلاحية تغيير رمز المسؤول'));
        }
        
        // التحقق من صحة رمز المسؤول الحالي
        if (currentAdminCode !== ADMIN_CODE) {
            return Promise.reject(new Error('رمز المسؤول الحالي غير صحيح'));
        }
        
        // تحديث رمز المسؤول في الإعدادات
        return databaseRef.ref('system_settings/admin_code').set({
            code: newAdminCode,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
        })
        .then(() => {
            // تحديث المتغير المحلي
            ADMIN_CODE = newAdminCode;
            
            // إنشاء سجل بتغيير رمز المسؤول
            const logEntry = {
                action: 'admin_code_changed',
                timestamp: new Date().toISOString(),
                updatedBy: currentUser.uid,
                userEmail: currentUser.email
            };
            
            // إضافة السجل إلى تاريخ الأحداث
            return databaseRef.ref('system_logs/system').push(logEntry);
        });
    }

    /**
     * إضافة مستمع لحالة المصادقة
     * @param {Function} listener - دالة الاستماع
     */
    function addAuthStateListener(listener) {
        if (typeof listener === 'function' && !authStateListeners.includes(listener)) {
            authStateListeners.push(listener);
        }
    }

    /**
     * إزالة مستمع لحالة المصادقة
     * @param {Function} listener - دالة الاستماع
     */
    function removeAuthStateListener(listener) {
        const index = authStateListeners.indexOf(listener);
        if (index !== -1) {
            authStateListeners.splice(index, 1);
        }
    }

    /**
     * إخطار جميع مستمعي حالة المصادقة
     * @param {Object|null} user - معلومات المستخدم
     */
    function notifyAuthStateListeners(user) {
        authStateListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error) {
                console.error('خطأ في مستمع حالة المصادقة:', error);
            }
        });
    }

    /**
     * تحديث واجهة المستخدم بناءً على حالة المصادقة
     */
    function updateUIForUser() {
        if (currentUser) {
            // إخفاء شاشة تسجيل الدخول
            hideLoginScreen();
            
            // عرض اسم المستخدم ونوعه في الواجهة
            updateUserInfo();
            
            // تحديث وصول العناصر بناءً على الصلاحيات
            updateElementsAccess();
        } else {
            // عرض شاشة تسجيل الدخول
            showLoginScreen();
        }
    }

    /**
     * عرض شاشة تسجيل الدخول
     */
    function showLoginScreen() {
        const loginScreen = document.getElementById('auth-login-screen');
        if (!loginScreen) {
            // إنشاء شاشة تسجيل الدخول إذا لم تكن موجودة
            createLoginScreen();
        } else {
            loginScreen.style.display = 'flex';
        }
        
        // إخفاء المحتوى الرئيسي
        const appContent = document.querySelector('.layout');
        if (appContent) {
            appContent.style.display = 'none';
        }
    }

    /**
     * إخفاء شاشة تسجيل الدخول
     */
    function hideLoginScreen() {
        const loginScreen = document.getElementById('auth-login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
        
        // إظهار المحتوى الرئيسي
        const appContent = document.querySelector('.layout');
        if (appContent) {
            appContent.style.display = 'flex';
        }
    }
    /**
     * إنشاء شاشة تسجيل الدخول
     */
    function createLoginScreen() {
        // إنشاء عنصر الشاشة
        const loginScreen = document.createElement('div');
        loginScreen.id = 'auth-login-screen';
        loginScreen.className = 'auth-screen';
        
        // إضافة محتوى الشاشة
        loginScreen.innerHTML = `
            <div class="auth-container">
                <div class="auth-logo">
                    <i class="fas fa-chart-line"></i>
                    <span>نظام الاستثمار المتكامل</span>
                </div>
                
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">تسجيل الدخول</button>
                    <button class="auth-tab" data-tab="register">إنشاء حساب</button>
                </div>
                
               
                    
                    <div class="auth-tab-content" id="register-tab-content">
                        <form id="register-form">
                            <div class="form-group">
                                <label class="form-label">الاسم الكامل</label>
                                <input type="text" class="form-input" id="register-name" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">البريد الإلكتروني</label>
                                <input type="email" class="form-input" id="register-email" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">كلمة المرور</label>
                                <div class="password-input-container">
                                    <input type="password" class="form-input" id="register-password" required>
                                    <button type="button" class="toggle-password">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">تأكيد كلمة المرور</label>
                                <div class="password-input-container">
                                    <input type="password" class="form-input" id="register-confirm-password" required>
                                    <button type="button" class="toggle-password">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">رمز المسؤول</label>
                                <div class="password-input-container">
                                    <input type="password" class="form-input" id="register-admin-code" placeholder="مطلوب للمستخدم الأول أو للمسؤول">
                                    <button type="button" class="toggle-password">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">نوع المستخدم</label>
                                <select class="form-select" id="register-user-type">
                                    <option value="user">مستخدم عادي</option>
                                    <option value="manager">مدير</option>
                                    <option value="admin">مسؤول</option>
                                </select>
                            </div>
                            
                            <div class="form-group form-actions">
                                <button type="submit" class="btn btn-primary btn-block">إنشاء حساب</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="auth-footer">
                    <p>نظام الاستثمار المتكامل &copy; ${new Date().getFullYear()}</p>
                </div>
            </div>
        `;
        
        // إضافة عنصر الشاشة إلى الصفحة
        document.body.appendChild(loginScreen);
        
        // إضافة مستمعي الأحداث لشاشة تسجيل الدخول
        setupLoginScreenListeners();

        // تعديل مستمع تسجيل الدخول لإعادة التوجيه إلى الصفحة الرئيسية
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const emailInput = document.getElementById('login-email');
                const passwordInput = document.getElementById('login-password');
                
                if (!emailInput || !passwordInput) {
                    showAuthNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
                    return;
                }
                
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                
                if (!email || !password) {
                    showAuthNotification('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
                    return;
                }
                
                // تغيير حالة الزر
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
                submitButton.disabled = true;
                
                login(email, password)
                .then(user => {
                    showAuthNotification('تم تسجيل الدخول بنجاح', 'success');
                    updateUIForUser(); // يكفي هذا بدون إعادة التوجيه
                })
              
                    .catch(error => {
                        console.error('خطأ في تسجيل الدخول:', error);
                        
                        let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
                        
                        if (error.code === 'auth/wrong-password') {
                            errorMessage = 'كلمة المرور غير صحيحة';
                        } else if (error.code === 'auth/user-not-found') {
                            errorMessage = 'البريد الإلكتروني غير مسجل';
                        } else if (error.code === 'auth/invalid-email') {
                            errorMessage = 'البريد الإلكتروني غير صالح';
                        } else if (error.code === 'auth/too-many-requests') {
                            errorMessage = 'تم تجاوز عدد المحاولات، يرجى المحاولة لاحقاً';
                        }
                        
                        showAuthNotification(errorMessage, 'error');
                    })
                    .finally(() => {
                        // إعادة حالة الزر
                        submitButton.textContent = originalText;
                        submitButton.disabled = false;
                    });
            });
        }
    }

    /**
     * إضافة مستمعي الأحداث لشاشة تسجيل الدخول
     */
    function setupLoginScreenListeners() {
        // التبديل بين تبويبات تسجيل الدخول والتسجيل
        const authTabs = document.querySelectorAll('.auth-tab');
        authTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // إزالة الفئة النشطة من جميع التبويبات
                authTabs.forEach(t => t.classList.remove('active'));
                
                // إضافة الفئة النشطة للتبويب المحدد
                this.classList.add('active');
                
                // إخفاء جميع محتويات التبويبات
                const tabContents = document.querySelectorAll('.auth-tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                
                // إظهار محتوى التبويب المحدد
                const tabName = this.getAttribute('data-tab');
                const selectedTabContent = document.getElementById(`${tabName}-tab-content`);
                if (selectedTabContent) {
                    selectedTabContent.classList.add('active');
                }
            });
        });
        
        // إظهار/إخفاء كلمة المرور
        const togglePasswordButtons = document.querySelectorAll('.toggle-password');
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', function() {
                const passwordInput = this.parentElement.querySelector('input');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.querySelector('i').classList.remove('fa-eye');
                    this.querySelector('i').classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    this.querySelector('i').classList.remove('fa-eye-slash');
                    this.querySelector('i').classList.add('fa-eye');
                }
            });
        });
        
        // نموذج تسجيل الدخول
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            
            if (!emailInput || !passwordInput) {
                showAuthNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
                return;
            }
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (!email || !password) {
                showAuthNotification('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
                return;
            }
            
            // تغيير حالة الزر
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
            submitButton.disabled = true;
            
            // تسجيل الدخول
            login(email, password)
                .then(user => {
                showAuthNotification('تم تسجيل الدخول بنجاح', 'success');
                updateUIForUser(); // ✅ تحديث واجهة المستخدم بعد تسجيل الدخول
                })
                .catch(error => {
                console.error('خطأ في تسجيل الدخول:', error);
                
                let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
                
                if (error.code === 'auth/wrong-password') {
                    errorMessage = 'كلمة المرور غير صحيحة';
                } else if (error.code === 'auth/user-not-found') {
                    errorMessage = 'البريد الإلكتروني غير مسجل';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'البريد الإلكتروني غير صالح';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'تم تجاوز عدد المحاولات، يرجى المحاولة لاحقاً';
                }
                
                showAuthNotification(errorMessage, 'error');
                })
                .finally(() => {
                // إعادة حالة الزر
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                });
            });
        }
        
        // نموذج إنشاء حساب
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const nameInput = document.getElementById('register-name');
                const emailInput = document.getElementById('register-email');
                const passwordInput = document.getElementById('register-password');
                const confirmPasswordInput = document.getElementById('register-confirm-password');
                const adminCodeInput = document.getElementById('register-admin-code');
                const userTypeSelect = document.getElementById('register-user-type');
                
                if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput || !userTypeSelect) {
                    showAuthNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
                    return;
                }
                
                const fullName = nameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                const adminCode = adminCodeInput.value;
                const userType = userTypeSelect.value;
                
                if (!fullName || !email || !password || !confirmPassword) {
                    showAuthNotification('يرجى إدخال جميع البيانات المطلوبة', 'error');
                    return;
                }
                
                if (password.length < 6) {
                    showAuthNotification('يجب أن تكون كلمة المرور 6 أحرف على الأقل', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    showAuthNotification('كلمة المرور وتأكيدها غير متطابقين', 'error');
                    return;
                }
                
                // تغيير حالة الزر
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إنشاء الحساب...';
                submitButton.disabled = true;
                
                // إنشاء الحساب
                signup(email, password, fullName, adminCode, userType)
                    .then(result => {
                        showAuthNotification('تم إنشاء الحساب بنجاح', 'success');
                        
                        // التبديل إلى تبويب تسجيل الدخول
                        const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
                        if (loginTab) {
                            loginTab.click();
                        }
                        
                        // مسح النموذج
                        registerForm.reset();
                    })
                    .catch(error => {
                        console.error('خطأ في إنشاء الحساب:', error);
                        
                        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
                        
                        if (error.code === 'auth/email-already-in-use') {
                            errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                        } else if (error.code === 'auth/invalid-email') {
                            errorMessage = 'البريد الإلكتروني غير صالح';
                        } else if (error.code === 'auth/weak-password') {
                            errorMessage = 'كلمة المرور ضعيفة جداً';
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        
                        showAuthNotification(errorMessage, 'error');
                    })
                    .finally(() => {
                        // إعادة حالة الزر
                        submitButton.textContent = originalText;
                        submitButton.disabled = false;
                    });
            });
        }
        
        // نسيت كلمة المرور
        const forgotPasswordBtn = document.getElementById('forgot-password-btn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', function() {
                const email = prompt('أدخل البريد الإلكتروني لإعادة تعيين كلمة المرور:');
                
                if (!email) return;
                
                // إرسال رسالة إعادة تعيين كلمة المرور
                resetPassword(email)
                    .then(() => {
                        showAuthNotification('تم إرسال رسالة إعادة تعيين كلمة المرور. يرجى التحقق من بريدك الإلكتروني.', 'success');
                    })
                    .catch(error => {
                        console.error('خطأ في إرسال رسالة إعادة تعيين كلمة المرور:', error);
                        
                        let errorMessage = 'حدث خطأ أثناء إرسال رسالة إعادة تعيين كلمة المرور';
                        
                        if (error.code === 'auth/user-not-found') {
                            errorMessage = 'البريد الإلكتروني غير مسجل';
                        } else if (error.code === 'auth/invalid-email') {
                            errorMessage = 'البريد الإلكتروني غير صالح';
                        }
                        
                        showAuthNotification(errorMessage, 'error');
                    });
            });
        }
    }

    /**
     * تحديث معلومات المستخدم في الواجهة
     */
    function updateUserInfo() {
        if (!currentUser) return;
        
        // تحديث معلومات المستخدم في الشريط العلوي
        const userInfoElement = document.querySelector('.user-info');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <span class="user-name">${currentUser.displayName || currentUser.email}</span>
                <span class="user-type">${getUserTypeLabel(currentUser.type)}</span>
            `;
        } else {
            // إنشاء عنصر معلومات المستخدم إذا لم يكن موجوداً
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                const userInfo = document.createElement('div');
                userInfo.className = 'user-info dropdown';
                userInfo.innerHTML = `
                    <button class="dropdown-toggle">
                        <span class="user-avatar">${(currentUser.displayName || currentUser.email).charAt(0)}</span>
                        <span class="user-name">${currentUser.displayName || currentUser.email}</span>
                        <span class="user-type">${getUserTypeLabel(currentUser.type)}</span>
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
                
                headerActions.appendChild(userInfo);
                
                // إضافة مستمعي الأحداث
                setupUserMenuListeners();
            }
        }
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
                const dropdown = this.closest('.dropdown');
                dropdown.classList.toggle('active');
            });
        }
        
        // إغلاق القائمة عند النقر خارجها
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.dropdown')) {
                const activeDropdowns = document.querySelectorAll('.dropdown.active');
                activeDropdowns.forEach(dropdown => dropdown.classList.remove('active'));
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
                    logout()
                        .then(() => {
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
     * عرض نافذة الملف الشخصي
     */
    function showProfileModal() {
        if (!currentUser) return;
        
        // إنشاء عنصر النافذة
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">الملف الشخصي</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="profile-avatar">
                    <div class="avatar-circle">
                        ${currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="profile-info">
                        <h3>${currentUser.displayName || 'المستخدم'}</h3>
                        <p class="user-type-badge ${currentUser.type}">${getUserTypeLabel(currentUser.type)}</p>
                    </div>
                </div>
                
                <form id="profile-form">
                    <div class="form-group">
                        <label class="form-label">البريد الإلكتروني</label>
                        <input type="email" class="form-input" value="${currentUser.email}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">الاسم الكامل</label>
                        <input type="text" class="form-input" id="profile-fullname" value="${currentUser.displayName || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">آخر تسجيل دخول</label>
                        <input type="text" class="form-input" value="${new Date(currentUser.metadata?.lastLogin || Date.now()).toLocaleString()}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">تاريخ إنشاء الحساب</label>
                        <input type="text" class="form-input" value="${new Date(currentUser.metadata?.createdAt || Date.now()).toLocaleString()}" readonly>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline modal-close-btn">إلغاء</button>
                <button class="btn btn-primary" id="save-profile-btn">حفظ التغييرات</button>
            </div>
        `;
        
        showModal('profile-modal', modalContent, function(modal) {
            // مستمع حدث حفظ الملف الشخصي
            const saveProfileBtn = modal.querySelector('#save-profile-btn');
            if (saveProfileBtn) {
                saveProfileBtn.addEventListener('click', function() {
                    const fullNameInput = document.getElementById('profile-fullname');
                    
                    if (!fullNameInput) {
                        showNotification('خطأ في النموذج: حقل الاسم غير موجود', 'error');
                        return;
                    }
                    
                    const fullName = fullNameInput.value.trim();
                    
                    if (!fullName) {
                        showNotification('يرجى إدخال الاسم الكامل', 'error');
                        return;
                    }
                    
                    // تغيير حالة الزر
                    const originalText = this.textContent;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
                    this.disabled = true;
                    
                    // تحديث بيانات المستخدم
                    updateUserData(currentUser.uid, { fullName })
                        .then(() => {
                            // تحديث اسم العرض
                            return firebase.auth().currentUser.updateProfile({
                                displayName: fullName
                            });
                        })
                        .then(() => {
                            // تحديث المتغير المحلي
                            currentUser.displayName = fullName;
                            
                            // تحديث واجهة المستخدم
                            updateUserInfo();
                            
                            showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
                            
                            // إغلاق النافذة
                            closeModal('profile-modal');
                        })
                        .catch(error => {
                            console.error('خطأ في تحديث الملف الشخصي:', error);
                            showNotification('حدث خطأ أثناء تحديث الملف الشخصي', 'error');
                        })
                        .finally(() => {
                            // إعادة حالة الزر
                            this.textContent = originalText;
                            this.disabled = false;
                        });
                });
            }
        });
    }

    /**
     * عرض نافذة تغيير كلمة المرور
     */
    function showChangePasswordModal() {
        if (!currentUser) return;
        
        // إنشاء عنصر النافذة
        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">تغيير كلمة المرور</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="change-password-form">
                    <div class="form-group">
                        <label class="form-label">كلمة المرور الحالية</label>
                        <div class="password-input-container">
                            <input type="password" class="form-input" id="current-password" required>
                            <button type="button" class="toggle-password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">كلمة المرور الجديدة</label>
                        <div class="password-input-container">
                            <input type="password" class="form-input" id="new-password" required>
                            <button type="button" class="toggle-password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">تأكيد كلمة المرور الجديدة</label>
                        <div class="password-input-container">
                            <input type="password" class="form-input" id="confirm-new-password" required>
                            <button type="button" class="toggle-password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline modal-close-btn">إلغاء</button>
                <button class="btn btn-primary" id="save-password-btn">تغيير كلمة المرور</button>
            </div>
        `;
        
        showModal('change-password-modal', modalContent, function(modal) {
            // إضافة مستمعي أحداث لأزرار إظهار/إخفاء كلمة المرور
            const togglePasswordButtons = modal.querySelectorAll('.toggle-password');
            togglePasswordButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const passwordInput = this.parentElement.querySelector('input');
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        this.querySelector('i').classList.remove('fa-eye');
                        this.querySelector('i').classList.add('fa-eye-slash');
                    } else {
                        passwordInput.type = 'password';
                        this.querySelector('i').classList.remove('fa-eye-slash');
                        this.querySelector('i').classList.add('fa-eye');
                    }
                });
            });
            
            // مستمع حدث حفظ كلمة المرور
            const savePasswordBtn = modal.querySelector('#save-password-btn');
            if (savePasswordBtn) {
                savePasswordBtn.addEventListener('click', function() {
                    const currentPasswordInput = document.getElementById('current-password');
                    const newPasswordInput = document.getElementById('new-password');
                    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
                    
                    if (!currentPasswordInput || !newPasswordInput || !confirmNewPasswordInput) {
                        showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
                        return;
                    }
                    
                    const currentPassword = currentPasswordInput.value;
                    const newPassword = newPasswordInput.value;
                    const confirmNewPassword = confirmNewPasswordInput.value;
                    
                    if (!currentPassword || !newPassword || !confirmNewPassword) {
                        showNotification('يرجى إدخال جميع البيانات المطلوبة', 'error');
                        return;
                    }
                    
                    if (newPassword.length < 6) {
                        showNotification('يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل', 'error');
                        return;
                    }
                    
                    if (newPassword !== confirmNewPassword) {
                        showNotification('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
                        return;
                    }
                    
                    // تغيير حالة الزر
                    const originalText = this.textContent;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تغيير كلمة المرور...';
                    this.disabled = true;
                    
                    // تغيير كلمة المرور
                    changePassword(currentPassword, newPassword)
                        .then(() => {
                            showNotification('تم تغيير كلمة المرور بنجاح', 'success');
                            
                            // إغلاق النافذة
                            closeModal('change-password-modal');
                        })
                        .catch(error => {
                            console.error('خطأ في تغيير كلمة المرور:', error);
                            
                            let errorMessage = 'حدث خطأ أثناء تغيير كلمة المرور';
                            
                            if (error.code === 'auth/wrong-password') {
                                errorMessage = 'كلمة المرور الحالية غير صحيحة';
                            } else if (error.code === 'auth/weak-password') {
                                errorMessage = 'كلمة المرور الجديدة ضعيفة جداً';
                            }
                            
                            showNotification(errorMessage, 'error');
                        })
                        .finally(() => {
                            // إعادة حالة الزر
                            this.textContent = originalText;
                            this.disabled = false;
                        });
                });
            }
        });
    }

   
 function updateElementsAccess() {
    if (!currentUser) return;
    
    // إخفاء العناصر التي لا يملك المستخدم صلاحية الوصول إليها
    
    // إدارة المستخدمين
    const userManagementElements = document.querySelectorAll('.user-management, [data-permission="canCreateUsers"]');
    userManagementElements.forEach(element => {
        if (currentUser.permissions.canCreateUsers) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    // إدارة الإعدادات
    const settingsElements = document.querySelectorAll('.settings-management, [data-permission="canManageSettings"]');
    settingsElements.forEach(element => {
        if (currentUser.permissions.canManageSettings) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    // حذف المستثمرين
    const deleteInvestorsElements = document.querySelectorAll('.delete-investor, [data-permission="canDeleteInvestors"]');
    deleteInvestorsElements.forEach(element => {
        if (currentUser.permissions.canDeleteInvestors) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    // تصدير البيانات
    const exportDataElements = document.querySelectorAll('.export-data, [data-permission="canExportData"]');
    exportDataElements.forEach(element => {
        if (currentUser.permissions.canExportData) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    // استيراد البيانات
    const importDataElements = document.querySelectorAll('.import-data, [data-permission="canImportData"]');
    importDataElements.forEach(element => {
        if (currentUser.permissions.canImportData) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    // إنشاء نسخة احتياطية
    const createBackupElements = document.querySelectorAll('.create-backup, [data-permission="canCreateBackup"]');
    createBackupElements.forEach(element => {
        if (currentUser.permissions.canCreateBackup) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    // استعادة نسخة احتياطية
    const restoreBackupElements = document.querySelectorAll('.restore-backup, [data-permission="canRestoreBackup"]');
    restoreBackupElements.forEach(element => {
        if (currentUser.permissions.canRestoreBackup) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
    
    // إضافة فئة المستخدم لعنصر الجسم
    document.body.setAttribute('data-user-type', currentUser.type);
    
    // تطبيق الأنماط CSS الديناميكية
    applyDynamicStyles();
}

/**
 * تطبيق الأنماط CSS الديناميكية
 */
function applyDynamicStyles() {
    // التحقق من وجود عنصر النمط
    let styleElement = document.getElementById('auth-dynamic-styles');
    
    // إنشاء عنصر النمط إذا لم يكن موجوداً
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'auth-dynamic-styles';
        document.head.appendChild(styleElement);
    }
    
    // تحديد الأنماط بناءً على نوع المستخدم
    styleElement.textContent = `
        /* إخفاء العناصر للمستخدمين غير المصرح لهم */
        .hidden {
            display: none !important;
        }
        
        /* أنماط خاصة بنوع المستخدم */
        body[data-user-type="${USER_TYPES.USER}"] .admin-only,
        body[data-user-type="${USER_TYPES.USER}"] .manager-only {
            display: none !important;
        }
        
        body[data-user-type="${USER_TYPES.MANAGER}"] .admin-only {
            display: none !important;
        }
        
        /* أيقونة تغير لون بناءً على نوع المستخدم */
        .user-avatar {
            background-color: var(--primary-color);
        }
        
        body[data-user-type="${USER_TYPES.ADMIN}"] .user-avatar {
            background-color: var(--danger-color);
        }
        
        body[data-user-type="${USER_TYPES.MANAGER}"] .user-avatar {
            background-color: var(--warning-color);
        }
        
        /* تطبيق فلاتر لتقييد الوصول */
        body:not([data-user-type="${USER_TYPES.ADMIN}"]) .admin-access-table tr td:last-child .delete-action {
            opacity: 0.5;
            pointer-events: none;
            cursor: not-allowed;
        }
        
        body:not([data-user-type="${USER_TYPES.ADMIN}"]):not([data-user-type="${USER_TYPES.MANAGER}"]) .manager-access-table tr td:last-child .edit-action {
            opacity: 0.5;
            pointer-events: none;
            cursor: not-allowed;
        }
    `;
}

/**
 * الحصول على تسمية نوع المستخدم
 * @param {string} userType - نوع المستخدم
 * @returns {string} - تسمية نوع المستخدم
 */
function getUserTypeLabel(userType) {
    switch (userType) {
        case USER_TYPES.ADMIN:
            return 'مسؤول النظام';
        case USER_TYPES.MANAGER:
            return 'مدير';
        case USER_TYPES.USER:
            return 'مستخدم';
        default:
            return 'غير معروف';
    }
}

/**
 * عرض نافذة منبثقة
 * @param {string} id - معرف النافذة
 * @param {string} content - محتوى النافذة
 * @param {Function} onRendered - دالة تنفذ بعد إضافة النافذة للصفحة
 */
function showModal(id, content, onRendered) {
    // التحقق من وجود النافذة مسبقاً
    let modalElement = document.getElementById(id);
    
    if (modalElement) {
        // إذا كانت النافذة موجودة، نحدث المحتوى فقط
        modalElement.querySelector('.modal').innerHTML = content;
    } else {
        // إنشاء عنصر النافذة
        modalElement = document.createElement('div');
        modalElement.id = id;
        modalElement.className = 'modal-overlay';
        
        // إضافة المحتوى
        const modalContent = document.createElement('div');
        modalContent.className = 'modal animate__animated animate__fadeInUp';
        modalContent.innerHTML = content;
        
        modalElement.appendChild(modalContent);
        
        // إضافة النافذة للصفحة
        document.body.appendChild(modalElement);
        
        // إضافة مستمعي الأحداث للأزرار
        setupModalListeners(modalElement);
    }
    
    // إظهار النافذة
    modalElement.classList.add('active');
    
    // تنفيذ الدالة بعد إضافة النافذة
    if (typeof onRendered === 'function') {
        onRendered(modalElement);
    }
    
    return modalElement;
}

/**
 * إضافة مستمعي الأحداث للنافذة
 * @param {HTMLElement} modalElement - عنصر النافذة
 */
function setupModalListeners(modalElement) {
    // أزرار الإغلاق
    const closeButtons = modalElement.querySelectorAll('.modal-close, .modal-close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeModal(modalElement.id);
        });
    });
    
    // إغلاق النافذة عند النقر خارجها
    modalElement.addEventListener('click', function(e) {
        if (e.target === modalElement) {
            closeModal(modalElement.id);
        }
    });
}

/**
 * إغلاق نافذة منبثقة
 * @param {string} id - معرف النافذة
 */
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * عرض إشعار في شاشة تسجيل الدخول
 * @param {string} message - نص الإشعار
 * @param {string} type - نوع الإشعار (success, error, warning, info)
 */
function showAuthNotification(message, type = 'info') {
    // التحقق من وجود عنصر الإشعار
    let notificationElement = document.querySelector('.auth-notification');
    
    // إنشاء عنصر الإشعار إذا لم يكن موجوداً
    if (!notificationElement) {
        notificationElement = document.createElement('div');
        notificationElement.className = 'auth-notification';
        document.querySelector('.auth-container').appendChild(notificationElement);
    }
    
    // تحديد الفئة حسب نوع الإشعار
    notificationElement.className = `auth-notification ${type}`;
    
    // إضافة المحتوى
    notificationElement.innerHTML = `
        <div class="auth-notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="auth-notification-close">&times;</button>
    `;
    
    // إظهار الإشعار
    notificationElement.classList.add('show');
    
    // إغلاق الإشعار بعد فترة
    const timeout = setTimeout(() => {
        notificationElement.classList.remove('show');
    }, 5000);
    
    // إضافة مستمع حدث زر الإغلاق
    const closeButton = notificationElement.querySelector('.auth-notification-close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            clearTimeout(timeout);
            notificationElement.classList.remove('show');
        });
    }
}

/**
 * الحصول على أيقونة الإشعار
 * @param {string} type - نوع الإشعار
 * @returns {string} - فئة الأيقونة
 */
function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-times-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        case 'info':
        default:
            return 'fa-info-circle';
    }
}

/**
 * عرض إشعار عام في التطبيق
 * @param {string} message - نص الإشعار
 * @param {string} type - نوع الإشعار (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // منع الاستدعاء المتكرر
    if (window._isShowingNotification) return;
    window._isShowingNotification = true;

    // استخدام دالة عرض الإشعارات الموجودة في التطبيق إذا كانت متاحة
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        window.showNotification(message, type);
        window._isShowingNotification = false;
        return;
    }

    // التحقق من وجود عنصر الإشعار
    let notificationElement = document.getElementById('notification');

    // إنشاء عنصر الإشعار إذا لم يكن موجوداً
    if (!notificationElement) {
        notificationElement = document.createElement('div');
        notificationElement.id = 'notification';
        notificationElement.className = 'notification';
        document.body.appendChild(notificationElement);
    }

    // تحديد الفئة حسب نوع الإشعار
    notificationElement.className = `notification ${type}`;

    // إضافة المحتوى
    notificationElement.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${getNotificationIcon(type)}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${getNotificationTitle(type)}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">&times;</button>
    `;

    // إظهار الإشعار
    notificationElement.classList.add('show');

    // إغلاق الإشعار بعد فترة
    const timeout = setTimeout(() => {
        notificationElement.classList.remove('show');
        window._isShowingNotification = false;
    }, 5000);

    // إضافة مستمع حدث زر الإغلاق
    const closeButton = notificationElement.querySelector('.notification-close');
    if (closeButton) {
        closeButton.addEventListener('click', function () {
            clearTimeout(timeout);
            notificationElement.classList.remove('show');
            window._isShowingNotification = false;
        });
    }
}

/**
 * الحصول على عنوان الإشعار
 * @param {string} type - نوع الإشعار
 * @returns {string} - عنوان الإشعار
 */
function getNotificationTitle(type) {
    switch (type) {
        case 'success':
            return 'تمت العملية بنجاح';
        case 'error':
            return 'خطأ';
        case 'warning':
            return 'تنبيه';
        case 'info':
        default:
            return 'معلومات';
    }
}

/**
 * إضافة أنماط CSS لنظام المصادقة
 */
function addAuthStyles() {
    // التحقق من وجود الأنماط مسبقاً
    if (document.getElementById('auth-styles')) {
        return;
    }
    
    // إنشاء عنصر النمط
    const styleElement = document.createElement('style');
    styleElement.id = 'auth-styles';
    
    // إضافة أنماط CSS
    styleElement.textContent = `
        /* شاشة تسجيل الدخول */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, var(--bg-color), var(--primary-color-dark));
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            direction: rtl;
        }
        
        .auth-container {
            width: 100%;
            max-width: 450px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            position: relative;
            overflow: hidden;
        }
        
        .auth-logo {
            text-align: center;
            margin-bottom: 2rem;
            color: var(--primary-color);
        }
        
        .auth-logo i {
            font-size: 3rem;
            margin-bottom: 0.5rem;
        }
        
        .auth-logo span {
            display: block;
            font-size: 1.5rem;
            font-weight: 700;
        }
        
        .auth-tabs {
            display: flex;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid #eee;
        }
        
        .auth-tab {
            flex: 1;
            padding: 0.75rem;
            text-align: center;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            color: #666;
            transition: all 0.3s ease;
        }
        
        .auth-tab.active {
            color: var(--primary-color);
            border-bottom: 2px solid var(--primary-color);
        }
        
        .auth-tab-content {
            display: none;
        }
        
        .auth-tab-content.active {
            display: block;
            animation: fadeIn 0.5s ease;
        }
        
        .auth-footer {
            text-align: center;
            margin-top: 2rem;
            color: #666;
            font-size: 0.9rem;
        }
        
        /* نموذج تسجيل الدخول */
        .form-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1.5rem;
        }
        
        .password-input-container {
            position: relative;
        }
        
        .toggle-password {
            position: absolute;
            top: 0.625rem;
            left: 0.625rem;
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
        }
        
        /* الإشعارات */
        .auth-notification {
            position: absolute;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 400px;
            padding: 1rem;
            border-radius: 8px;
            background-color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: top 0.5s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 1000;
        }
        
        .auth-notification.show {
            top: 20px;
        }
        
        .auth-notification.success {
            background-color: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
        }
        
        .auth-notification.error {
            background-color: #f8d7da;
            color: #721c24;
            border-left: 4px solid #dc3545;
        }
        
        .auth-notification.warning {
            background-color: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffc107;
        }
        
        .auth-notification.info {
            background-color: #d1ecf1;
            color: #0c5460;
            border-left: 4px solid #17a2b8;
        }
        
        .auth-notification-content {
            display: flex;
            align-items: center;
        }
        
        .auth-notification-content i {
            margin-left: 0.75rem;
            font-size: 1.25rem;
        }
        
        .auth-notification-close {
            background: none;
            border: none;
            font-size: 1.25rem;
            cursor: pointer;
            color: inherit;
            opacity: 0.7;
        }
        
        .auth-notification-close:hover {
            opacity: 1;
        }
        
        /* النافذة المنبثقة */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            direction: rtl;
        }
        
        .modal-overlay.active {
            display: flex;
        }
        
        .modal {
            width: 90%;
            max-width: 500px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .modal-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
        }
        
        /* قائمة المستخدم */
        .user-info {
            display: flex;
            align-items: center;
            margin-right: 1rem;
            position: relative;
        }
        
        .dropdown-toggle {
            display: flex;
            align-items: center;
            background: none;
            border: none;
            cursor: pointer;
            color: inherit;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            transition: background-color 0.3s ease;
        }
        
        .dropdown-toggle:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        
        .user-avatar {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            background-color: var(--primary-color);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            margin-left: 0.5rem;
        }
        
        .user-name {
            font-weight: 500;
            margin-left: 0.25rem;
        }
        
        .user-type {
            color: #666;
            font-size: 0.8rem;
            margin-left: 0.5rem;
        }
        
        .dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            width: 200px;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            padding: 0.5rem 0;
            display: none;
            z-index: 100;
        }
        
        .dropdown.active .dropdown-menu {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        .dropdown-item {
            display: flex;
            align-items: center;
            padding: 0.625rem 1rem;
            color: inherit;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }
        
        .dropdown-item:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        
        .dropdown-item i {
            margin-left: 0.75rem;
            width: 1rem;
            text-align: center;
        }
        
        .dropdown-divider {
            height: 1px;
            background-color: #eee;
            margin: 0.5rem 0;
        }
        
        /* الملف الشخصي */
        .profile-avatar {
            display: flex;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .avatar-circle {
            width: 4rem;
            height: 4rem;
            border-radius: 50%;
            background-color: var(--primary-color);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: 600;
            margin-left: 1rem;
        }
        
        .profile-info {
            flex: 1;
        }
        
        .profile-info h3 {
            margin: 0 0 0.5rem 0;
        }
        
        .user-type-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .user-type-badge.admin {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .user-type-badge.manager {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .user-type-badge.user {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        
        /* الرسوم المتحركة */
        @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
        }
    `;
    
    // إضافة عنصر النمط إلى الصفحة
    document.head.appendChild(styleElement);
    console.log('تم إضافة أنماط CSS لنظام المصادقة');
}

/**
 * تسجيل العمليات في قاعدة البيانات
 * @param {string} action - نوع العملية
 * @param {string} entityType - نوع الكيان (مستثمر، عملية، إلخ)
 * @param {string} entityId - معرف الكيان
 * @param {Object} details - تفاصيل العملية
 * @returns {Promise} وعد يشير إلى نجاح أو فشل العملية
 */
function logAction(action, entityType, entityId, details = {}) {
    if (!currentUser || !databaseRef) {
        return Promise.reject(new Error('غير مصرح بتسجيل العمليات'));
    }
    
    const logEntry = {
        action,
        entityType,
        entityId,
        timestamp: new Date().toISOString(),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        userType: currentUser.type,
        details
    };
    
    return databaseRef.ref(`system_logs/${entityType}`).push(logEntry);
}

/**
 * الربط بين العمليات والمستخدم الحالي
 * يتم استدعاء هذه الدالة عند إضافة/تعديل/حذف المستثمرين أو العمليات
 * @param {Object} data - البيانات المراد ربطها بالمستخدم
 * @returns {Object} - البيانات بعد إضافة معلومات المستخدم
 */
function attachUserInfo(data) {
    if (!currentUser) {
        return data;
    }
    
    // إضافة معلومات المستخدم إلى البيانات
    return {
        ...data,
        createdBy: {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email,
            type: currentUser.type,
            timestamp: new Date().toISOString()
        }
    };
}

function modifySystemFunctions() {
    // حفظ الدوال الأصلية
    if (!window._originalAddNewInvestor && window.addNewInvestor) {
        window._originalAddNewInvestor = window.addNewInvestor;
    }
    
    if (!window._originalAddTransaction && window.addTransaction) {
        window._originalAddTransaction = window.addTransaction;
    }
    
    if (!window._originalAddDeposit && window.addDeposit) {
        window._originalAddDeposit = window.addDeposit;
    }
    
    if (!window._originalWithdrawAmount && window.withdrawAmount) {
        window._originalWithdrawAmount = window.withdrawAmount;
    }
    
    if (!window._originalDeleteInvestor && window.deleteInvestor) {
        window._originalDeleteInvestor = window.deleteInvestor;
    }
    
    // تعديل دالة إضافة مستثمر جديد
    if (window._originalAddNewInvestor) {
        window.addNewInvestor = function() {
            // التحقق من تسجيل الدخول
            if (!currentUser) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return;
            }
            
            // استدعاء الدالة الأصلية
            const result = window._originalAddNewInvestor.apply(this, arguments);
            
            // إذا تمت العملية بنجاح
            if (result && investors && investors.length > 0) {
                // البحث عن المستثمر الجديد
                const newInvestor = investors[investors.length - 1];
                
                // إضافة معلومات المستخدم
                newInvestor.createdBy = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || currentUser.email,
                    type: currentUser.type,
                    timestamp: new Date().toISOString()
                };
                
                // تسجيل العملية
                logAction('investor_created', 'investors', newInvestor.id, {
                    investorName: newInvestor.name,
                    amount: newInvestor.amount
                });
                
                // تحديث البيانات في Firebase
                if (databaseRef) {
                    const investorData = {...newInvestor};
                    
                    databaseRef.ref(`data/${currentUser.uid}/investors/${newInvestor.id}`).set(investorData)
                        .catch(error => {
                            console.error('خطأ في حفظ بيانات المستثمر في Firebase:', error);
                        });
                }
                
                // تحديث البيانات المحلية
                saveData();
            }
            
            return result;
        };
    }
    
    // تعديل دالة إضافة عملية جديدة
    if (window._originalAddTransaction) {
        window.addTransaction = function(type, investorId, amount, notes = '', isInitialDeposit = false) {
            // التحقق من تسجيل الدخول
            if (!currentUser) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return null;
            }
            
            // استدعاء الدالة الأصلية
            const newTransaction = window._originalAddTransaction.apply(this, arguments);
            
            // إذا تمت العملية بنجاح
            if (newTransaction) {
                // إضافة معلومات المستخدم
                newTransaction.createdBy = {
                    uid: currentUser.uid,
                    name: currentUser.displayName || currentUser.email,
                    type: currentUser.type,
                    timestamp: new Date().toISOString()
                };
                
                // تسجيل العملية
                logAction('transaction_created', 'transactions', newTransaction.id, {
                    transactionType: type,
                    investorId: investorId,
                    amount: amount,
                    notes: notes
                });
                
                // تحديث البيانات في Firebase
                if (databaseRef) {
                    const transactionData = {...newTransaction};
                    
                    databaseRef.ref(`data/${currentUser.uid}/transactions/${newTransaction.id}`).set(transactionData)
                        .catch(error => {
                            console.error('خطأ في حفظ بيانات العملية في Firebase:', error);
                        });
                }
                
                // تحديث البيانات المحلية
                saveData();
            }
            
            return newTransaction;
        };
    }
    
    // تعديل دالة إضافة إيداع جديد
    if (window._originalAddDeposit) {
        window.addDeposit = function() {
            // التحقق من تسجيل الدخول
            if (!currentUser) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return;
            }
            
            // استدعاء الدالة الأصلية
            const result = window._originalAddDeposit.apply(this, arguments);
            
            // تسجيل العملية
            const depositInvestorSelect = document.getElementById('deposit-investor');
            const depositAmountInput = document.getElementById('deposit-amount');
            
            if (depositInvestorSelect && depositAmountInput) {
                const investorId = depositInvestorSelect.value;
                const amount = parseFloat(depositAmountInput.value);
                
                if (investorId && !isNaN(amount)) {
                    // البحث عن المستثمر
                    const investor = investors.find(inv => inv.id === investorId);
                    
                    if (investor) {
                        logAction('deposit_added', 'deposits', Date.now().toString(), {
                            investorId: investorId,
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
    if (window._originalWithdrawAmount) {
        window.withdrawAmount = function() {
            // التحقق من تسجيل الدخول
            if (!currentUser) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return;
            }
            
            // استدعاء الدالة الأصلية
            const result = window._originalWithdrawAmount.apply(this, arguments);
            
            // تسجيل العملية
            const withdrawInvestorSelect = document.getElementById('withdraw-investor');
            const withdrawAmountInput = document.getElementById('withdraw-amount');
            
            if (withdrawInvestorSelect && withdrawAmountInput) {
                const investorId = withdrawInvestorSelect.value;
                const amount = parseFloat(withdrawAmountInput.value);
                
                if (investorId && !isNaN(amount)) {
                    // البحث عن المستثمر
                    const investor = investors.find(inv => inv.id === investorId);
                    
                    if (investor) {
                        logAction('withdrawal_added', 'withdrawals', Date.now().toString(), {
                            investorId: investorId,
                            investorName: investor.name,
                            amount: amount
                        });
                    }
                }
            }
            
            return result;
        };
    }
    
    // تعديل دالة حذف مستثمر
    if (window._originalDeleteInvestor) {
        window.deleteInvestor = function(investorId) {
            // التحقق من تسجيل الدخول
            if (!currentUser) {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
                return false;
            }
            
            // التحقق من الصلاحيات
            if (!currentUser.permissions.canDeleteInvestors) {
                showNotification('ليس لديك صلاحية حذف المستثمرين', 'error');
                return false;
            }
            
            // الحصول على بيانات المستثمر قبل الحذف
            const investor = investors.find(inv => inv.id === investorId);
            
            if (!investor) {
                showNotification('لم يتم العثور على المستثمر', 'error');
                return false;
            }
            
            // استدعاء الدالة الأصلية
            const result = window._originalDeleteInvestor.apply(this, arguments);
            
            // إذا تمت العملية بنجاح
            if (result) {
                // تسجيل العملية
                logAction('investor_deleted', 'investors', investorId, {
                    investorName: investor.name,
                    investorPhone: investor.phone,
                    investorAmount: investor.amount
                });
                
                // حذف البيانات من Firebase
                if (databaseRef) {
                    databaseRef.ref(`data/${currentUser.uid}/investors/${investorId}`).remove()
                        .catch(error => {
                            console.error('خطأ في حذف بيانات المستثمر من Firebase:', error);
                        });
                }
            }
            
            return result;
        };
    }
    
    // تعديل دالة حفظ البيانات
    if (!window._originalSaveData && window.saveData) {
        window._originalSaveData = window.saveData;
        
        window.saveData = function() {
            // التحقق من تسجيل الدخول
            if (!currentUser) {
                console.warn('محاولة حفظ البيانات دون تسجيل الدخول');
                return window._originalSaveData.apply(this, arguments);
            }
            
            // استدعاء الدالة الأصلية
            const result = window._originalSaveData.apply(this, arguments);
            
            // مزامنة البيانات مع Firebase
            if (result && databaseRef && syncEnabled) {
                const data = {
                    investors: investors || [],
                    transactions: transactions || [],
                    settings: settings || {},
                    lastUpdated: new Date().toISOString(),
                    updatedBy: {
                        uid: currentUser.uid,
                        name: currentUser.displayName || currentUser.email
                    }
                };
                
                databaseRef.ref(`data/${currentUser.uid}`).update(data)
                    .catch(error => {
                        console.error('خطأ في مزامنة البيانات مع Firebase:', error);
                    });
            }
            
            return result;
        };
    }
}

/**
 * تعديل دالة تحميل البيانات لتحميل بيانات المستخدم الحالي
 */
function modifyLoadDataFunction() {
    if (!window._originalLoadData && window.loadData) {
        window._originalLoadData = window.loadData;
        
        window.loadData = function() {
            // التحقق من تسجيل الدخول
            if (!currentUser) {
                console.warn('محاولة تحميل البيانات دون تسجيل الدخول');
                return window._originalLoadData.apply(this, arguments);
            }
            
            // محاولة تحميل البيانات من Firebase أولاً
            if (databaseRef && syncEnabled) {
                return databaseRef.ref(`data/${currentUser.uid}`).once('value')
                    .then(snapshot => {
                        const firebaseData = snapshot.val();
                        
                        if (firebaseData) {
                            // تحميل البيانات من Firebase
                            if (firebaseData.investors) {
                                window.investors = firebaseData.investors;
                                localStorage.setItem('investors', JSON.stringify(firebaseData.investors));
                            }
                            
                            if (firebaseData.transactions) {
                                window.transactions = firebaseData.transactions;
                                localStorage.setItem('transactions', JSON.stringify(firebaseData.transactions));
                            }
                            
                            if (firebaseData.settings) {
                                window.settings = firebaseData.settings;
                                localStorage.setItem('settings', JSON.stringify(firebaseData.settings));
                            }
                            
                            console.log('تم تحميل البيانات من Firebase');
                            
                            // تحديث الواجهة بعد تحميل البيانات
                            if (window.renderInvestorsTable) {
                                window.renderInvestorsTable();
                            }
                            
                            if (window.renderTransactionsTable) {
                                window.renderTransactionsTable();
                            }
                            
                            if (window.updateDashboard) {
                                window.updateDashboard();
                            }
                            
                            return true;
                        } else {
                            // إذا لم تكن هناك بيانات في Firebase، نستخدم البيانات المحلية
                            return window._originalLoadData.apply(this, arguments);
                        }
                    })
                    .catch(error => {
                        console.error('خطأ في تحميل البيانات من Firebase:', error);
                        
                        // استخدام البيانات المحلية في حالة الخطأ
                        return window._originalLoadData.apply(this, arguments);
                    });
            } else {
                // استخدام البيانات المحلية إذا لم يكن هناك اتصال بـ Firebase
                return window._originalLoadData.apply(this, arguments);
            }
        };
    }
}

/**
 * إنشاء صفحة إدارة المستخدمين
 */
function createUserManagementPage() {
    // التحقق من وجود صفحة إدارة المستخدمين
    if (document.getElementById('users-page')) {
        return;
    }
    
    // إنشاء صفحة إدارة المستخدمين
    const usersPage = document.createElement('div');
    usersPage.id = 'users-page';
    usersPage.className = 'page admin-only';
    
    usersPage.innerHTML = `
        <div class="header">
            <button class="toggle-sidebar">
                <i class="fas fa-bars"></i>
            </button>
            <h1 class="page-title">إدارة المستخدمين</h1>
            <div class="header-actions">
                <div class="search-box">
                    <input class="search-input" placeholder="بحث عن مستخدم..." type="text" />
                    <i class="fas fa-search search-icon"></i>
                </div>
                <button class="btn btn-primary" id="add-user-btn">
                    <i class="fas fa-plus"></i>
                    <span>إضافة مستخدم</span>
                </button>
            </div>
        </div>
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">قائمة المستخدمين</h2>
                <div class="section-actions">
                    <div class="btn-group">
                        <button class="btn btn-outline btn-sm active" data-filter="all">الكل</button>
                        <button class="btn btn-outline btn-sm" data-filter="admin">المسؤولين</button>
                        <button class="btn btn-outline btn-sm" data-filter="manager">المديرين</button>
                        <button class="btn btn-outline btn-sm" data-filter="user">المستخدمين</button>
                    </div>
                </div>
            </div>
            <div class="table-container">
                <table id="users-table">
                    <thead>
                        <tr>
                            <th>المعرف</th>
                            <th>المستخدم</th>
                            <th>البريد الإلكتروني</th>
                            <th>نوع المستخدم</th>
                            <th>تاريخ الإنشاء</th>
                            <th>آخر تسجيل دخول</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- سيتم ملؤها ديناميكيًا -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // إضافة الصفحة للمحتوى الرئيسي
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.appendChild(usersPage);
    }
    
    // إضافة مستمعي الأحداث للصفحة
    setupUserManagementListeners();
    
    // إضافة رابط الصفحة إلى القائمة الجانبية
    addUserManagementNavLink();
}

/**
 * إضافة رابط إدارة المستخدمين إلى القائمة الجانبية
 */
function addUserManagementNavLink() {
    // التحقق من وجود رابط إدارة المستخدمين
    if (document.querySelector('a[data-page="users"]')) {
        return;
    }
    
    // البحث عن قائمة الروابط
    const navList = document.querySelector('.nav-list');
    if (!navList) {
        return;
    }
    
    // إنشاء عنصر الرابط
    const navItem = document.createElement('li');
    navItem.className = 'nav-item user-management';
    
    navItem.innerHTML = `
        <a class="nav-link" data-page="users" href="#">
            <div class="nav-icon">
                <i class="fas fa-user-shield"></i>
            </div>
            <span>المستخدمين</span>
        </a>
    `;
    
    // إضافة الرابط قبل رابط الإعدادات
    const settingsNavItem = document.querySelector('a[data-page="settings"]').parentNode;
    if (settingsNavItem) {
        navList.insertBefore(navItem, settingsNavItem);
    } else {
        navList.appendChild(navItem);
    }
    
    // إضافة مستمع حدث للرابط
    const navLink = navItem.querySelector('.nav-link');
    if (navLink) {
        navLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // إزالة الكلاس النشط من جميع الروابط
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            
            // إضافة الكلاس النشط للرابط المحدد
            this.classList.add('active');
            
            // إظهار صفحة إدارة المستخدمين
            showPage('users');
        });
    }
}

/**
 * إضافة مستمعي الأحداث لصفحة إدارة المستخدمين
 */
function setupUserManagementListeners() {
    // زر إضافة مستخدم
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            showAddUserModal();
        });
    }
    
    // أزرار التصفية
    const filterButtons = document.querySelectorAll('#users-page .btn-group .btn');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // تحديث الزر النشط
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // تصفية المستخدمين
                const filterType = this.getAttribute('data-filter');
                filterUsers(filterType);
            });
        });
    }
    
    // البحث في المستخدمين
    const searchInput = document.querySelector('#users-page .search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchUsers(this.value);
        });
    }
}

/**
 * عرض نافذة إضافة مستخدم
 */
function showAddUserModal() {
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">إضافة مستخدم جديد</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <form id="add-user-form">
                <div class="form-group">
                    <label class="form-label">الاسم الكامل</label>
                    <input type="text" class="form-input" id="user-fullname" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">البريد الإلكتروني</label>
                    <input type="email" class="form-input" id="user-email" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">كلمة المرور</label>
                    <div class="password-input-container">
                        <input type="password" class="form-input" id="user-password" required>
                        <button type="button" class="toggle-password">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">تأكيد كلمة المرور</label>
                    <div class="password-input-container">
                        <input type="password" class="form-input" id="user-confirm-password" required>
                        <button type="button" class="toggle-password">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">نوع المستخدم</label>
                    <select class="form-select" id="user-type">
                        <option value="user">مستخدم عادي</option>
                        <option value="manager">مدير</option>
                        <option value="admin">مسؤول</option>
                    </select>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline modal-close-btn">إلغاء</button>
            <button class="btn btn-primary" id="save-user-btn">إضافة</button>
        </div>
    `;
    
    showModal('add-user-modal', modalContent, function(modal) {
        // إضافة مستمعي أحداث لأزرار إظهار/إخفاء كلمة المرور
        const togglePasswordButtons = modal.querySelectorAll('.toggle-password');
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', function() {
                const passwordInput = this.parentElement.querySelector('input');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.querySelector('i').classList.remove('fa-eye');
                    this.querySelector('i').classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    this.querySelector('i').classList.remove('fa-eye-slash');
                    this.querySelector('i').classList.add('fa-eye');
                }
            });
        });
        
        // مستمع حدث حفظ المستخدم
        const saveUserBtn = modal.querySelector('#save-user-btn');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', function() {
                const fullnameInput = document.getElementById('user-fullname');
                const emailInput = document.getElementById('user-email');
                const passwordInput = document.getElementById('user-password');
                const confirmPasswordInput = document.getElementById('user-confirm-password');
                const userTypeSelect = document.getElementById('user-type');
                
                if (!fullnameInput || !emailInput || !passwordInput || !confirmPasswordInput || !userTypeSelect) {
                    showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
                    return;
                }
                
                const fullName = fullnameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                const userType = userTypeSelect.value;
                
                if (!fullName || !email || !password || !confirmPassword) {
                    showNotification('يرجى إدخال جميع البيانات المطلوبة', 'error');
                    return;
                }
                
                if (password.length < 6) {
                    showNotification('يجب أن تكون كلمة المرور 6 أحرف على الأقل', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    showNotification('كلمة المرور وتأكيدها غير متطابقين', 'error');
                    return;
                }
                
                // التحقق من صلاحية إنشاء مسؤول
                if (userType === USER_TYPES.ADMIN && currentUser.type !== USER_TYPES.ADMIN) {
                    showNotification('ليس لديك صلاحية إنشاء مستخدمين بصلاحيات مسؤول', 'error');
                    return;
                }
                
                // تغيير حالة الزر
                const originalText = this.textContent;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';
                this.disabled = true;
                
                // إنشاء المستخدم
                signup(email, password, fullName, ADMIN_CODE, userType)
                    .then(result => {
                        showNotification(`تم إضافة المستخدم ${fullName} بنجاح`, 'success');
                        
                        // تحديث قائمة المستخدمين
                        refreshUsersList();
                        
                        // إغلاق النافذة
                        closeModal('add-user-modal');
                    })
                    .catch(error => {
                        console.error('خطأ في إضافة المستخدم:', error);
                        
                        let errorMessage = 'حدث خطأ أثناء إضافة المستخدم';
                        
                        if (error.code === 'auth/email-already-in-use') {
                            errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                        } else if (error.code === 'auth/invalid-email') {
                            errorMessage = 'البريد الإلكتروني غير صالح';
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        
                        showNotification(errorMessage, 'error');
                    })
                    .finally(() => {
                        // إعادة حالة الزر
                        this.textContent = originalText;
                        this.disabled = false;
                    });
            });
        }
    });
}

/**
 * تحديث قائمة المستخدمين
 */
function refreshUsersList() {
    // الحصول على قائمة المستخدمين
    getUsers()
        .then(users => {
            // تحديث جدول المستخدمين
            renderUsersTable(users);
        })
        .catch(error => {
            console.error('خطأ في تحديث قائمة المستخدمين:', error);
            showNotification('حدث خطأ أثناء تحديث قائمة المستخدمين', 'error');
        });
}

/**
 * عرض جدول المستخدمين
 * @param {Array} users - قائمة المستخدمين
 */
function renderUsersTable(users) {
    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;
    
    // مسح محتوى الجدول
    tableBody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">لا يوجد مستخدمين</td></tr>';
        return;
    }
    
    // ترتيب المستخدمين حسب تاريخ الإنشاء (الأحدث أولاً)
    const sortedUsers = [...users].sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    
    // إنشاء صفوف الجدول
    sortedUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // تحديد لون الخلفية حسب نوع المستخدم
        if (user.type === USER_TYPES.ADMIN) {
            row.classList.add('admin-row');
        } else if (user.type === USER_TYPES.MANAGER) {
            row.classList.add('manager-row');
        }
        
      
 // تنسيق التواريخ
 const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : '-';
 const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-';
 
 row.innerHTML = `
     <td>${user.uid.substring(0, this.username)}: 10}</td>
     <td>
         <div class="user-info-cell">
             <div class="user-avatar small">${user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</div>
             <div>
                 <div class="user-name">${user.fullName || 'مستخدم'}</div>
                 <div class="user-role">${getUserTypeLabel(user.type)}</div>
             </div>
         </div>
     </td>
     <td>${user.email}</td>
     <td><span class="badge badge-${getUserTypeBadgeClass(user.type)}">${getUserTypeLabel(user.type)}</span></td>
     <td>${createdAt}</td>
     <td>${lastLogin}</td>
     <td>
         <div class="actions-cell">
             <button class="btn btn-sm btn-outline edit-user-btn" data-id="${user.uid}" title="تعديل">
                 <i class="fas fa-edit"></i>
             </button>
             <button class="btn btn-sm btn-outline reset-password-btn" data-id="${user.uid}" data-email="${user.email}" title="إعادة تعيين كلمة المرور">
                 <i class="fas fa-key"></i>
             </button>
             ${user.uid !== currentUser.uid ? `
                 <button class="btn btn-sm btn-outline danger delete-user-btn" data-id="${user.uid}" title="حذف">
                     <i class="fas fa-trash"></i>
                 </button>
             ` : ''}
         </div>
     </td>
 `;
 
 tableBody.appendChild(row);
});

// إضافة مستمعي الأحداث للأزرار
setupUserTableActions();
}

/**
* إضافة مستمعي الأحداث لأزرار جدول المستخدمين
*/
function setupUserTableActions() {
// أزرار تعديل المستخدم
const editButtons = document.querySelectorAll('.edit-user-btn');
editButtons.forEach(button => {
 button.addEventListener('click', function() {
     const userId = this.getAttribute('data-id');
     showEditUserModal(userId);
 });
});

// أزرار إعادة تعيين كلمة المرور
const resetPasswordButtons = document.querySelectorAll('.reset-password-btn');
resetPasswordButtons.forEach(button => {
 button.addEventListener('click', function() {
     const userId = this.getAttribute('data-id');
     const userEmail = this.getAttribute('data-email');
     
     if (confirm(`هل أنت متأكد من رغبتك في إعادة تعيين كلمة المرور للمستخدم ${userEmail}؟\nسيتم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني.`)) {
         resetPassword(userEmail)
             .then(() => {
                 showNotification(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${userEmail}`, 'success');
             })
             .catch(error => {
                 console.error('خطأ في إعادة تعيين كلمة المرور:', error);
                 
                 let errorMessage = 'حدث خطأ أثناء إعادة تعيين كلمة المرور';
                 
                 if (error.code === 'auth/user-not-found') {
                     errorMessage = 'البريد الإلكتروني غير مسجل';
                 } else if (error.code === 'auth/invalid-email') {
                     errorMessage = 'البريد الإلكتروني غير صالح';
                 }
                 
                 showNotification(errorMessage, 'error');
             });
     }
 });
});

// أزرار حذف المستخدم
const deleteButtons = document.querySelectorAll('.delete-user-btn');
deleteButtons.forEach(button => {
 button.addEventListener('click', function() {
     const userId = this.getAttribute('data-id');
     
     if (confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم؟')) {
         deleteUser(userId)
             .then(() => {
                 showNotification('تم حذف المستخدم بنجاح', 'success');
                 
                 // تحديث قائمة المستخدمين
                 refreshUsersList();
             })
             .catch(error => {
                 console.error('خطأ في حذف المستخدم:', error);
                 
                 let errorMessage = 'حدث خطأ أثناء حذف المستخدم';
                 
                 if (error.message) {
                     errorMessage = error.message;
                 }
                 
                 showNotification(errorMessage, 'error');
             });
     }
 });
});
}

/**
* عرض نافذة تعديل المستخدم
* @param {string} userId - معرف المستخدم
*/
function showEditUserModal(userId) {
// الحصول على بيانات المستخدم
getUserData(userId)
 .then(userData => {
     const modalContent = `
         <div class="modal-header">
             <h3 class="modal-title">تعديل المستخدم</h3>
             <button class="modal-close">&times;</button>
         </div>
         <div class="modal-body">
             <form id="edit-user-form">
                 <input type="hidden" id="edit-user-id" value="${userId}">
                 
                 <div class="form-group">
                     <label class="form-label">الاسم الكامل</label>
                     <input type="text" class="form-input" id="edit-user-fullname" value="${userData.fullName || ''}" required>
                 </div>
                 
                 <div class="form-group">
                     <label class="form-label">البريد الإلكتروني</label>
                     <input type="email" class="form-input" value="${userData.email}" readonly>
                 </div>
                 
                 <div class="form-group">
                     <label class="form-label">نوع المستخدم</label>
                     <select class="form-select" id="edit-user-type" ${currentUser.type !== USER_TYPES.ADMIN && userData.type === USER_TYPES.ADMIN ? 'disabled' : ''}>
                         <option value="user" ${userData.type === USER_TYPES.USER ? 'selected' : ''}>مستخدم عادي</option>
                         <option value="manager" ${userData.type === USER_TYPES.MANAGER ? 'selected' : ''}>مدير</option>
                         <option value="admin" ${userData.type === USER_TYPES.ADMIN ? 'selected' : ''}>مسؤول</option>
                     </select>
                     ${currentUser.type !== USER_TYPES.ADMIN && userData.type === USER_TYPES.ADMIN ? '<small class="text-danger">لا يمكنك تغيير نوع المستخدم المسؤول</small>' : ''}
                 </div>
             </form>
         </div>
         <div class="modal-footer">
             <button class="btn btn-outline modal-close-btn">إلغاء</button>
             <button class="btn btn-primary" id="update-user-btn">حفظ التغييرات</button>
         </div>
     `;
     
     showModal('edit-user-modal', modalContent, function(modal) {
         // مستمع حدث تحديث المستخدم
         const updateUserBtn = modal.querySelector('#update-user-btn');
         if (updateUserBtn) {
             updateUserBtn.addEventListener('click', function() {
                 const fullnameInput = document.getElementById('edit-user-fullname');
                 const userTypeSelect = document.getElementById('edit-user-type');
                 
                 if (!fullnameInput || !userTypeSelect) {
                     showNotification('خطأ في النموذج: بعض الحقول المطلوبة غير موجودة', 'error');
                     return;
                 }
                 
                 const fullName = fullnameInput.value.trim();
                 const userType = userTypeSelect.value;
                 
                 if (!fullName) {
                     showNotification('يرجى إدخال الاسم الكامل', 'error');
                     return;
                 }
                 
                 // تغيير حالة الزر
                 const originalText = this.textContent;
                 this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
                 this.disabled = true;
                 
                 // تحديث بيانات المستخدم
                 const updatedData = {
                     fullName: fullName,
                     type: userType
                 };
                 
                 updateUserData(userId, updatedData)
                     .then(() => {
                         showNotification('تم تحديث بيانات المستخدم بنجاح', 'success');
                         
                         // تحديث قائمة المستخدمين
                         refreshUsersList();
                         
                         // إغلاق النافذة
                         closeModal('edit-user-modal');
                     })
                     .catch(error => {
                         console.error('خطأ في تحديث بيانات المستخدم:', error);
                         
                         let errorMessage = 'حدث خطأ أثناء تحديث بيانات المستخدم';
                         
                         if (error.message) {
                             errorMessage = error.message;
                         }
                         
                         showNotification(errorMessage, 'error');
                     })
                     .finally(() => {
                         // إعادة حالة الزر
                         this.textContent = originalText;
                         this.disabled = false;
                     });
             });
         }
     });
 })
 .catch(error => {
     console.error('خطأ في الحصول على بيانات المستخدم:', error);
     showNotification('حدث خطأ أثناء الحصول على بيانات المستخدم', 'error');
 });
}

/**
* تصفية المستخدمين حسب النوع
* @param {string} filterType - نوع التصفية
*/
function filterUsers(filterType) {
const tableRows = document.querySelectorAll('#users-table tbody tr');

tableRows.forEach(row => {
 const userTypeCell = row.querySelector('td:nth-child(4) .badge');
 
 if (!userTypeCell) return;
 
 if (filterType === 'all') {
     row.style.display = '';
 } else {
     const userType = userTypeCell.textContent.trim();
     
     if (filterType === 'admin' && getUserTypeLabel(USER_TYPES.ADMIN) === userType) {
         row.style.display = '';
     } else if (filterType === 'manager' && getUserTypeLabel(USER_TYPES.MANAGER) === userType) {
         row.style.display = '';
     } else if (filterType === 'user' && getUserTypeLabel(USER_TYPES.USER) === userType) {
         row.style.display = '';
     } else {
         row.style.display = 'none';
     }
 }
});
}

/**
* البحث في المستخدمين
* @param {string} query - نص البحث
*/
function searchUsers(query) {
query = query.trim().toLowerCase();

if (!query) {
 // إذا كان البحث فارغًا، نعيد تحديث التصفية
 const activeFilter = document.querySelector('#users-page .btn-group .btn.active');
 if (activeFilter) {
     const filterType = activeFilter.getAttribute('data-filter');
     filterUsers(filterType);
 } else {
     filterUsers('all');
 }
 return;
}

const tableRows = document.querySelectorAll('#users-table tbody tr');

tableRows.forEach(row => {
 const fullNameCell = row.querySelector('td:nth-child(2) .user-name');
 const emailCell = row.querySelector('td:nth-child(3)');
 
 if (!fullNameCell || !emailCell) return;
 
 const fullName = fullNameCell.textContent.trim().toLowerCase();
 const email = emailCell.textContent.trim().toLowerCase();
 
 if (fullName.includes(query) || email.includes(query)) {
     row.style.display = '';
 } else {
     row.style.display = 'none';
 }
});
}

/**
* الحصول على فئة شارة نوع المستخدم
* @param {string} userType - نوع المستخدم
* @returns {string} - فئة الشارة
*/
function getUserTypeBadgeClass(userType) {
switch (userType) {
 case USER_TYPES.ADMIN:
     return 'danger';
 case USER_TYPES.MANAGER:
     return 'warning';
 case USER_TYPES.USER:
     return 'info';
 default:
     return 'secondary';
}
}

/**
* إضافة مستمع حدث للتحقق من تسجيل الدخول قبل تنفيذ أي عملية
*/
function setupAuthCheckInterceptor() {
// إضافة مستمع حدث لكل النقرات
document.addEventListener('click', function(e) {
 // إذا كان المستخدم مسجل الدخول، نسمح بالعملية
 if (currentUser) return;
 
 // التحقق مما إذا كان النقر على عنصر فعال
 const actionElement = e.target.closest('button:not(.auth-related), a:not(.auth-related), .clickable:not(.auth-related)');
 
 if (!actionElement) return;
 
 // التحقق مما إذا كان العنصر داخل شاشة تسجيل الدخول
 if (e.target.closest('#auth-login-screen')) return;
 
 // منع السلوك الافتراضي
 e.preventDefault();
 e.stopPropagation();
 
 // عرض رسالة تنبيه
 showNotification('يجب تسجيل الدخول أولاً', 'warning');
 
 // عرض شاشة تسجيل الدخول
 showLoginScreen();
}, true);
}

/**
* إضافة طبقة أمان للتحقق من تسجيل الدخول على مستوى الصفحة
*/
function addSecurityLayer() {
// التحقق من تسجيل الدخول عند تحميل الصفحة
window.addEventListener('load', function() {
 initialize().then(() => {
     // التحقق من وجود مستخدم حالي
     if (!currentUser) {
         // عرض شاشة تسجيل الدخول
         showLoginScreen();
     }
 });
});

// إضافة مستمع حدث لإعادة التحقق من تسجيل الدخول عند استعادة نشاط الصفحة
document.addEventListener('visibilitychange', function() {
 if (document.visibilityState === 'visible') {
     // إعادة التحقق من تسجيل الدخول
     if (firebase.auth().currentUser) {
         // المستخدم مازال مسجل الدخول
     } else {
         // المستخدم غير مسجل الدخول، نعرض شاشة تسجيل الدخول
         showLoginScreen();
     }
 }
});
}

/**
* تفعيل القفل التلقائي بعد فترة خمول
* @param {number} idleTime - فترة الخمول بالدقائق
*/
function setupAutoLock(idleTime = 30) {
let idleTimer;
const idleTimeoutMs = idleTime * 60 * 1000; // تحويل الدقائق إلى مللي ثانية

// إعادة تعيين عداد الخمول
function resetIdleTimer() {
 clearTimeout(idleTimer);
 idleTimer = setTimeout(lockScreen, idleTimeoutMs);
}

// قفل الشاشة
function lockScreen() {
 // التحقق من تسجيل الدخول
 if (currentUser) {
     // عرض شاشة قفل الشاشة
     showLockScreen();
 }
}

// إضافة مستمعي الأحداث لإعادة تعيين عداد الخمول
['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
 document.addEventListener(event, resetIdleTimer);
});

// تشغيل عداد الخمول
resetIdleTimer();
}


/**
* إضافة مستمعي الأحداث لشاشة القفل
* @param {HTMLElement} lockScreen - عنصر شاشة القفل
*/
function setupLockScreenListeners(lockScreen) {
// مستمع حدث إلغاء القفل
const unlockForm = lockScreen.querySelector('#unlock-form');
if (unlockForm) {
 unlockForm.addEventListener('submit', function(e) {
     e.preventDefault();
     
     const passwordInput = document.getElementById('unlock-password');
     
     if (!passwordInput) {
         showAuthNotification('خطأ في النموذج: حقل كلمة المرور غير موجود', 'error');
         return;
     }
     
     const password = passwordInput.value;
     
     if (!password) {
         showAuthNotification('يرجى إدخال كلمة المرور', 'error');
         return;
     }
     
     // تغيير حالة الزر
     const submitButton = this.querySelector('button[type="submit"]');
     const originalText = submitButton.textContent;
     submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
     submitButton.disabled = true;
     
     // إعادة المصادقة
     const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
     firebase.auth().currentUser.reauthenticateWithCredential(credential)
         .then(() => {
             // إخفاء شاشة القفل
             lockScreen.style.display = 'none';
             
             // إظهار المحتوى الرئيسي
             const appContent = document.querySelector('.layout');
             if (appContent) {
                 appContent.style.display = 'flex';
             }
             
             // مسح حقل كلمة المرور
             passwordInput.value = '';
         })
         .catch(error => {
             console.error('خطأ في إلغاء القفل:', error);
             
             let errorMessage = 'كلمة المرور غير صحيحة';
             
             if (error.code === 'auth/wrong-password') {
                 errorMessage = 'كلمة المرور غير صحيحة';
             } else if (error.code === 'auth/too-many-requests') {
                 errorMessage = 'تم تجاوز عدد المحاولات، يرجى المحاولة لاحقاً';
             }
             
             showAuthNotification(errorMessage, 'error');
         })
         .finally(() => {
             // إعادة حالة الزر
             submitButton.textContent = originalText;
             submitButton.disabled = false;
         });
 });
}

// مستمع حدث تسجيل الخروج
const logoutBtn = lockScreen.querySelector('#logout-from-lock');
if (logoutBtn) {
 logoutBtn.addEventListener('click', function() {
     logout()
         .then(() => {
             showNotification('تم تسجيل الخروج بنجاح', 'success');
         })
         .catch(error => {
             console.error('خطأ في تسجيل الخروج:', error);
             showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
         });
 });
}

// مستمع حدث لزر إظهار/إخفاء كلمة المرور
const togglePasswordBtn = lockScreen.querySelector('.toggle-password');
if (togglePasswordBtn) {
 togglePasswordBtn.addEventListener('click', function() {
     const passwordInput = this.parentElement.querySelector('input');
     if (passwordInput.type === 'password') {
         passwordInput.type = 'text';
         this.querySelector('i').classList.remove('fa-eye');
         this.querySelector('i').classList.add('fa-eye-slash');
     } else {
         passwordInput.type = 'password';
         this.querySelector('i').classList.remove('fa-eye-slash');
         this.querySelector('i').classList.add('fa-eye');
     }
 });
}
}

/**
* إنشاء صفحة سجل الأحداث
*/
function createActivityLogPage() {
// التحقق من وجود صفحة سجل الأحداث
if (document.getElementById('logs-page')) {
 return;
}

// إنشاء صفحة سجل الأحداث
const logsPage = document.createElement('div');
logsPage.id = 'logs-page';
logsPage.className = 'page admin-only';

logsPage.innerHTML = `
 <div class="header">
     <button class="toggle-sidebar">
         <i class="fas fa-bars"></i>
     </button>
     <h1 class="page-title">سجل الأحداث</h1>
     <div class="header-actions">
         <div class="search-box">
             <input class="search-input" placeholder="بحث في السجل..." type="text" />
             <i class="fas fa-search search-icon"></i>
         </div>
         <div class="btn-group">
             <button class="btn btn-outline active" data-filter="all">الكل</button>
             <button class="btn btn-outline" data-filter="auth">المصادقة</button>
             <button class="btn btn-outline" data-filter="investors">المستثمرين</button>
             <button class="btn btn-outline" data-filter="transactions">العمليات</button>
             <button class="btn btn-outline" data-filter="users">المستخدمين</button>
         </div>
     </div>
 </div>
 <div class="section">
     <div class="table-container">
         <table id="logs-table">
             <thead>
                 <tr>
                     <th>التاريخ والوقت</th>
                     <th>المستخدم</th>
                     <th>الحدث</th>
                     <th>النوع</th>
                     <th>التفاصيل</th>
                 </tr>
             </thead>
             <tbody>
                 <!-- سيتم ملؤها ديناميكيًا -->
             </tbody>
         </table>
     </div>
     <div class="pagination">
         <button class="btn btn-sm btn-outline prev-page-btn" disabled>
             <i class="fas fa-chevron-right"></i>
             <span>السابق</span>
         </button>
         <div class="page-info">
             الصفحة <span id="current-page">1</span> من <span id="total-pages">1</span>
         </div>
         <button class="btn btn-sm btn-outline next-page-btn" disabled>
             <span>التالي</span>
             <i class="fas fa-chevron-left"></i>
         </button>
     </div>
 </div>
`;

// إضافة الصفحة للمحتوى الرئيسي
const mainContent = document.querySelector('.main-content');
if (mainContent) {
 mainContent.appendChild(logsPage);
}

// إضافة مستمعي الأحداث للصفحة
setupActivityLogListeners();

// إضافة رابط الصفحة إلى القائمة الجانبية
addActivityLogNavLink();
}

/**
* إضافة رابط سجل الأحداث إلى القائمة الجانبية
*/
function addActivityLogNavLink() {
// التحقق من وجود رابط سجل الأحداث
if (document.querySelector('a[data-page="logs"]')) {
 return;
}

// البحث عن قائمة الروابط
const navList = document.querySelector('.nav-list');
if (!navList) {
 return;
}

// إنشاء عنصر الرابط
const navItem = document.createElement('li');
navItem.className = 'nav-item admin-only';

navItem.innerHTML = `
 <a class="nav-link" data-page="logs" href="#">
     <div class="nav-icon">
         <i class="fas fa-history"></i>
     </div>
     <span>سجل الأحداث</span>
 </a>
`;

// إضافة الرابط قبل رابط الإعدادات
const settingsNavItem = document.querySelector('a[data-page="settings"]').parentNode;
if (settingsNavItem) {
 navList.insertBefore(navItem, settingsNavItem);
} else {
 navList.appendChild(navItem);
}


// إضافة مستمع حدث للرابط
const navLink = navItem.querySelector('.nav-link');
if (navLink) {
    navLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // إزالة الكلاس النشط من جميع الروابط
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        // إضافة الكلاس النشط للرابط المحدد
        this.classList.add('active');
        
        // إظهار صفحة سجل الأحداث
        showPage('logs');
        
        // تحميل سجل الأحداث
        loadActivityLogs();
    });
}
}

/**
 * إضافة مستمعي الأحداث لصفحة سجل الأحداث
 */
function setupActivityLogListeners() {
    // أزرار التصفية
    const filterButtons = document.querySelectorAll('#logs-page .btn-group .btn');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // تحديث الزر النشط
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // تصفية السجلات
                const filterType = this.getAttribute('data-filter');
                filterLogs(filterType);
            });
        });
    }
    
    // البحث في السجلات
    const searchInput = document.querySelector('#logs-page .search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchLogs(this.value);
        });
    }
    
    // أزرار الصفحات
    const prevPageBtn = document.querySelector('#logs-page .prev-page-btn');
    const nextPageBtn = document.querySelector('#logs-page .next-page-btn');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (this.disabled) return;
            currentLogsPage--;
            loadActivityLogs(currentLogsPage);
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            if (this.disabled) return;
            currentLogsPage++;
            loadActivityLogs(currentLogsPage);
        });
    }
}

// متغيرات صفحات سجل الأحداث
let currentLogsPage = 1;
let logsPerPage = 20;
let totalLogsPages = 1;
let logsCache = {};

/**
 * تحميل سجل الأحداث
 * @param {number} page - رقم الصفحة
 */
function loadActivityLogs(page = 1) {
    // التحقق من الصلاحيات
    if (!currentUser || currentUser.type !== USER_TYPES.ADMIN) {
        showNotification('ليس لديك صلاحية عرض سجل الأحداث', 'error');
        return;
    }
    
    // تحديث عنصر عرض الصفحة الحالية
    const currentPageElement = document.getElementById('current-page');
    if (currentPageElement) {
        currentPageElement.textContent = page;
    }
    
    // تحديث حالة أزرار الانتقال بين الصفحات
    updatePaginationButtons(page);
    
    // جلب السجلات من ذاكرة التخزين المؤقت إذا كانت متاحة
    if (logsCache[page]) {
        renderLogs(logsCache[page]);
        return;
    }
    
    // عرض شاشة التحميل
    const tableBody = document.querySelector('#logs-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="loader"></div></td></tr>';
    }
    
    // تحميل السجلات من Firebase
    Promise.all([
        databaseRef.ref('system_logs/authentication').orderByChild('timestamp').limitToLast(logsPerPage * page).once('value'),
        databaseRef.ref('system_logs/investors').orderByChild('timestamp').limitToLast(logsPerPage * page).once('value'),
        databaseRef.ref('system_logs/transactions').orderByChild('timestamp').limitToLast(logsPerPage * page).once('value'),
        databaseRef.ref('system_logs/users').orderByChild('timestamp').limitToLast(logsPerPage * page).once('value'),
        databaseRef.ref('system_logs/system').orderByChild('timestamp').limitToLast(logsPerPage * page).once('value')
    ])
    .then(([authSnapshot, investorsSnapshot, transactionsSnapshot, usersSnapshot, systemSnapshot]) => {
        // تجميع السجلات من جميع الأنواع
        const logs = [];
        
        // إضافة السجلات مع تحديد النوع
        addLogsFromSnapshot(logs, authSnapshot, 'auth');
        addLogsFromSnapshot(logs, investorsSnapshot, 'investors');
        addLogsFromSnapshot(logs, transactionsSnapshot, 'transactions');
        addLogsFromSnapshot(logs, usersSnapshot, 'users');
        addLogsFromSnapshot(logs, systemSnapshot, 'system');
        
        // ترتيب السجلات حسب التاريخ (الأحدث أولاً)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // تقسيم السجلات إلى صفحات
        const totalLogs = logs.length;
        totalLogsPages = Math.ceil(totalLogs / logsPerPage);
        
        // تحديث عنصر عرض إجمالي الصفحات
        const totalPagesElement = document.getElementById('total-pages');
        if (totalPagesElement) {
            totalPagesElement.textContent = totalLogsPages;
        }
        
        // تحديث حالة أزرار الانتقال بين الصفحات
        updatePaginationButtons(page);
        
        // تحديد السجلات للصفحة الحالية
        const startIndex = (page - 1) * logsPerPage;
        const endIndex = Math.min(startIndex + logsPerPage, totalLogs);
        const pageLogs = logs.slice(startIndex, endIndex);
        
        // تخزين السجلات في ذاكرة التخزين المؤقت
        logsCache[page] = pageLogs;
        
        // عرض السجلات
        renderLogs(pageLogs);
    })
    .catch(error => {
        console.error('خطأ في تحميل سجل الأحداث:', error);
        
        const tableBody = document.querySelector('#logs-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">حدث خطأ أثناء تحميل السجلات</td></tr>';
        }
    });
}

/**
 * إضافة السجلات من Snapshot إلى المصفوفة
 * @param {Array} logs - مصفوفة السجلات
 * @param {Object} snapshot - الـ Snapshot من Firebase
 * @param {string} type - نوع السجلات
 */
function addLogsFromSnapshot(logs, snapshot, type) {
    if (!snapshot.exists()) return;
    
    snapshot.forEach(childSnapshot => {
        const log = childSnapshot.val();
        log.id = childSnapshot.key;
        log.logType = type;
        logs.push(log);
    });
}

/**
 * تحديث حالة أزرار الانتقال بين الصفحات
 * @param {number} currentPage - الصفحة الحالية
 */
function updatePaginationButtons(currentPage) {
    const prevPageBtn = document.querySelector('#logs-page .prev-page-btn');
    const nextPageBtn = document.querySelector('#logs-page .next-page-btn');
    
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 1;
    }
    
    if (nextPageBtn) {
        nextPageBtn.disabled = currentPage >= totalLogsPages;
    }
}

/**
 * عرض السجلات في الجدول
 * @param {Array} logs - قائمة السجلات
 */
function renderLogs(logs) {
    const tableBody = document.querySelector('#logs-table tbody');
    if (!tableBody) return;
    
    // مسح محتوى الجدول
    tableBody.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد سجلات</td></tr>';
        return;
    }
    
    // إنشاء صفوف الجدول
    logs.forEach(log => {
        const row = document.createElement('tr');
        
        // تنسيق التاريخ
        const timestamp = new Date(log.timestamp).toLocaleString();
        
        // تحديد نوع الحدث وتسميته
        const eventType = getEventType(log.action);
        const logTypeLabel = getLogTypeLabel(log.logType);
        
        // تحديد اسم المستخدم
        const userName = log.userName || log.userEmail || 'مستخدم غير معروف';
        
        row.innerHTML = `
            <td>${timestamp}</td>
            <td>
                <div class="user-info-cell">
                    <div class="user-avatar small">${userName.charAt(0).toUpperCase()}</div>
                    <span>${userName}</span>
                </div>
            </td>
            <td>${eventType}</td>
            <td><span class="badge badge-${getLogTypeBadgeClass(log.logType)}">${logTypeLabel}</span></td>
            <td>
                <button class="btn btn-sm btn-outline view-log-details" data-id="${log.id}" data-type="${log.logType}">
                    <i class="fas fa-info-circle"></i>
                    <span>التفاصيل</span>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // إضافة مستمعي الأحداث لأزرار عرض التفاصيل
    setupLogDetailsButtons();
}

/**
 * إضافة مستمعي الأحداث لأزرار عرض تفاصيل السجل
 */
function setupLogDetailsButtons() {
    const detailButtons = document.querySelectorAll('.view-log-details');
    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const logId = this.getAttribute('data-id');
            const logType = this.getAttribute('data-type');
            
            showLogDetailsModal(logId, logType);
        });
    });
}

/**
 * عرض نافذة تفاصيل السجل
 * @param {string} logId - معرف السجل
 * @param {string} logType - نوع السجل
 */
function showLogDetailsModal(logId, logType) {
    // جلب تفاصيل السجل من Firebase
    databaseRef.ref(`system_logs/${logType}/${logId}`).once('value')
        .then(snapshot => {
            const log = snapshot.val();
            
            if (!log) {
                showNotification('لم يتم العثور على تفاصيل السجل', 'error');
                return;
            }
            
            // تنسيق التاريخ
            const timestamp = new Date(log.timestamp).toLocaleString();
            
            // تحديد نوع الحدث وتسميته
            const eventType = getEventType(log.action);
            const logTypeLabel = getLogTypeLabel(log.logType || logType);
            
            // تحديد اسم المستخدم
            const userName = log.userName || log.userEmail || 'مستخدم غير معروف';
            
            // تحديد تفاصيل إضافية
            let additionalDetails = '';
            
            if (log.details) {
                additionalDetails = `
                    <div class="log-details-section">
                        <h4>تفاصيل إضافية</h4>
                        <pre>${JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                `;
            }
            
            // إنشاء محتوى النافذة
            const modalContent = `
                <div class="modal-header">
                    <h3 class="modal-title">تفاصيل السجل</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="log-details">
                        <div class="log-header">
                            <div class="log-badge ${getLogTypeBadgeClass(logType)}">${logTypeLabel}</div>
                            <div class="log-timestamp">${timestamp}</div>
                        </div>
                        
                        <div class="log-details-section">
                            <h4>المستخدم</h4>
                            <div class="user-info-detail">
                                <div class="user-avatar medium">${userName.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div class="user-name">${userName}</div>
                                    <div class="user-email">${log.userEmail || ''}</div>
                                    <div class="user-type">${getUserTypeLabel(log.userType || '')}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="log-details-section">
                            <h4>الحدث</h4>
                            <p>${eventType}</p>
                            ${log.entityId ? `<p>المعرف: ${log.entityId}</p>` : ''}
                            ${log.entityType ? `<p>النوع: ${log.entityType}</p>` : ''}
                        </div>
                        
                        ${additionalDetails}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline modal-close-btn">إغلاق</button>
                </div>
            `;
            
            showModal('log-details-modal', modalContent);
        })
        .catch(error => {
            console.error('خطأ في جلب تفاصيل السجل:', error);
            showNotification('حدث خطأ أثناء جلب تفاصيل السجل', 'error');
        });
}

/**
 * تصفية السجلات حسب النوع
 * @param {string} filterType - نوع التصفية
 */
function filterLogs(filterType) {
    const tableRows = document.querySelectorAll('#logs-table tbody tr');
    
    tableRows.forEach(row => {
        const logTypeCell = row.querySelector('td:nth-child(4) .badge');
        
        if (!logTypeCell) return;
        
        if (filterType === 'all') {
            row.style.display = '';
        } else {
            const logType = getLogTypeFromLabel(logTypeCell.textContent.trim());
            
            if (logType === filterType) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

/**
 * البحث في السجلات
 * @param {string} query - نص البحث
 */
function searchLogs(query) {
    query = query.trim().toLowerCase();
    
    if (!query) {
        // إذا كان البحث فارغًا، نعيد تحديث التصفية
        const activeFilter = document.querySelector('#logs-page .btn-group .btn.active');
        if (activeFilter) {
            const filterType = activeFilter.getAttribute('data-filter');
            filterLogs(filterType);
        } else {
            filterLogs('all');
        }
        return;
    }
    
    const tableRows = document.querySelectorAll('#logs-table tbody tr');
    
    tableRows.forEach(row => {
        const timestamp = row.querySelector('td:nth-child(1)').textContent.trim().toLowerCase();
        const userName = row.querySelector('td:nth-child(2)').textContent.trim().toLowerCase();
        const eventType = row.querySelector('td:nth-child(3)').textContent.trim().toLowerCase();
        const logType = row.querySelector('td:nth-child(4)').textContent.trim().toLowerCase();
        
        if (timestamp.includes(query) || userName.includes(query) || eventType.includes(query) || logType.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * الحصول على تسمية نوع الحدث
 * @param {string} action - نوع الحدث
 * @returns {string} - تسمية نوع الحدث
 */
function getEventType(action) {
    switch (action) {
        // أحداث المصادقة
        case 'user_login':
            return 'تسجيل دخول';
        case 'user_logout':
            return 'تسجيل خروج';
        case 'password_changed':
            return 'تغيير كلمة المرور';
        case 'password_reset_requested':
            return 'طلب إعادة تعيين كلمة المرور';
            
        // أحداث المستخدمين
        case 'user_created':
            return 'إنشاء مستخدم جديد';
        case 'user_updated':
            return 'تحديث بيانات مستخدم';
        case 'user_deleted':
            return 'حذف مستخدم';
            
        // أحداث المستثمرين
        case 'investor_created':
            return 'إضافة مستثمر جديد';
        case 'investor_updated':
            return 'تحديث بيانات مستثمر';
        case 'investor_deleted':
            return 'حذف مستثمر';
            
        // أحداث العمليات
        case 'transaction_created':
            return 'إضافة عملية جديدة';
        case 'deposit_added':
            return 'إضافة إيداع';
        case 'withdrawal_added':
            return 'إضافة سحب';
        case 'profit_paid':
            return 'دفع أرباح';
            
        // أحداث النظام
        case 'admin_code_changed':
            return 'تغيير رمز المسؤول';
        case 'settings_updated':
            return 'تحديث إعدادات النظام';
        case 'backup_created':
            return 'إنشاء نسخة احتياطية';
        case 'backup_restored':
            return 'استعادة نسخة احتياطية';
            
        default:
            return action || 'حدث غير معروف';
    }
}

/**
 * الحصول على تسمية نوع السجل
 * @param {string} logType - نوع السجل
 * @returns {string} - تسمية نوع السجل
 */
function getLogTypeLabel(logType) {
    switch (logType) {
        case 'auth':
            return 'المصادقة';
        case 'investors':
            return 'المستثمرين';
        case 'transactions':
            return 'العمليات';
        case 'users':
            return 'المستخدمين';
        case 'system':
            return 'النظام';
        default:
            return 'غير معروف';
    }
}

/**
 * الحصول على نوع السجل من التسمية
 * @param {string} label - تسمية نوع السجل
 * @returns {string} - نوع السجل
 */
function getLogTypeFromLabel(label) {
    switch (label) {
        case 'المصادقة':
            return 'auth';
        case 'المستثمرين':
            return 'investors';
        case 'العمليات':
            return 'transactions';
        case 'المستخدمين':
            return 'users';
        case 'النظام':
            return 'system';
        default:
            return '';
    }
}

/**
 * الحصول على فئة شارة نوع السجل
 * @param {string} logType - نوع السجل
 * @returns {string} - فئة الشارة
 */
function getLogTypeBadgeClass(logType) {
    switch (logType) {
        case 'auth':
            return 'info';
        case 'investors':
            return 'success';
        case 'transactions':
            return 'primary';
        case 'users':
            return 'warning';
        case 'system':
            return 'danger';
        default:
            return 'secondary';
    }
}

/**
 * إعداد المصادقة والأمان للنظام
 */
function setupSecuritySystem() {
    // تهيئة نظام المصادقة
    initialize()
        .then(initialized => {
            console.log('تهيئة نظام المصادقة:', initialized ? 'تمت بنجاح' : 'لم تكتمل');
            
            if (initialized) {
                // إضافة أنماط CSS
                addAuthStyles();
                
                // إنشاء صفحة إدارة المستخدمين
                createUserManagementPage();
                
                // إنشاء صفحة سجل الأحداث
                createActivityLogPage();
                
                // تعديل دوال النظام
                modifySystemFunctions();
                
                // تعديل دالة تحميل البيانات
                modifyLoadDataFunction();
                
                // إضافة طبقة أمان
                addSecurityLayer();
                
                // تفعيل القفل التلقائي
                setupAutoLock();
                
                // إضافة مستمع حدث للتحقق من تسجيل الدخول
                setupAuthCheckInterceptor();
                
                console.log('تم إعداد نظام الأمان بنجاح');
            }
        })
        .catch(error => {
            console.error('خطأ في إعداد نظام الأمان:', error);
        });
}


// تصدير واجهة برمجة التطبيق
const AuthSystem = {
    initialize,
    login,
    signup,
    logout,
    getUserData,
    updateUserData,
    deleteUser,
    getUsers,
    changePassword,
    resetPassword,
    checkIfFirstUser,
    logAction,
    attachUserInfo,
    getCurrentUser: () => currentUser,
    getPermissions: () => currentUser ? currentUser.permissions : null,
    isAdmin: () => currentUser && currentUser.type === USER_TYPES.ADMIN,
    isManager: () => currentUser && (currentUser.type === USER_TYPES.ADMIN || currentUser.type === USER_TYPES.MANAGER),
    hasPermission: (permission) => currentUser && currentUser.permissions && currentUser.permissions[permission],
    USER_TYPES,
    PERMISSIONS
};

// إعداد النظام تلقائيًا عند تحميل الصفحة
window.addEventListener('load', setupSecuritySystem);


