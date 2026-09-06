// ============================================================
// LUCIE CLOSET · POS + ADMIN SYSTEM - COMPLETE FIXED
// ============================================================

// ============================================================
// SUPABASE CONFIG - FIXED (no redeclaration)
// ============================================================
const SUPABASE_URL = 'https://tlsldwshtxofckvkixxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc2xkd3NodHhvZmNrdmtpeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTE1NTksImV4cCI6MjEwMzc4NzU1OX0.BAfgQG4Z28bgKSfL9Li7Gbgp62sTM-5NxB4qVQ-b0H4';

// ✅ FIXED: Use 'sb' instead of 'supabase' to avoid redeclaration
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// TOAST - Must be defined first
// ============================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log('Toast:', message, type);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    toast.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
window.showToast = showToast;

// ============================================================
// STATE
// ============================================================
let products = [];
let orders = [];
let customers = [];
let cart = [];
let currentUser = null;
let currentTab = 'dashboard';
let currentCategory = 'all';
let selectedPayment = 'mpesa';
let salesChartInstance = null;
let profitChartInstance = null;
let isInitialized = false;

// ============================================================
// PIN LOGIN STATE
// ============================================================
let pinValue = '';
let isSubmitting = false;
let currentMethod = 'pin';
let sessionTimer = null;
let sessionTimeout = 30;
const SESSION_KEY = 'luciecloset_session';

// ============================================================
// GET DEFAULT PRODUCTS
// ============================================================
function getDefaultProducts() {
    return [
        { id: 1, code: '0001#', name: 'Classic Silk Dress', category: 'dress', gender: 'women', price: 500, stock: 12,
            image_url: null, best_quality: true, rating: 4.8 },
        { id: 2, code: '6195-1#', name: 'Summer Floral Dress', category: 'dress', gender: 'women', price: 500, stock: 6,
            image_url: null, best_quality: false, rating: 4.2 },
        { id: 3, code: '6169-145A', name: 'Elegant Evening Gown', category: 'dress', gender: 'women', price: 600, stock: 6,
            image_url: null, best_quality: true, rating: 4.9 },
        { id: 4, code: '5918', name: 'Pie Top', category: 'top', gender: 'women', price: 600, stock: 10, image_url: null,
            best_quality: false, rating: 4.2 },
        { id: 5, code: '5918 1', name: 'Polo Top with A-Top', category: 'top', gender: 'unisex', price: 700, stock: 10,
            image_url: null, best_quality: true, rating: 4.6 },
        { id: 6, code: '13802', name: 'Cashmere Blend Sweater', category: 'sweater', gender: 'men', price: 650, stock: 8,
            image_url: null, best_quality: true, rating: 4.7 },
        { id: 7, code: 'S001', name: 'Tailored Wool Suit', category: 'suit', gender: 'men', price: 1200, stock: 5,
            image_url: null, best_quality: true, rating: 4.9 },
    ];
}

// ============================================================
// LOAD DATA FUNCTIONS
// ============================================================
async function loadProducts() {
    try {
        // ✅ Use 'sb' instead of 'supabase'
        const { data, error } = await sb.from('products').select('*').order('id', { ascending: true });
        if (error) throw error;
        if (data && data.length) {
            products = data;
        } else {
            products = getDefaultProducts();
            for (const p of products) {
                await sb.from('products').insert([p]);
            }
        }
        localStorage.setItem('luciecloset_products', JSON.stringify(products));
    } catch (e) {
        console.warn('Supabase fallback → localStorage', e);
        const stored = localStorage.getItem('luciecloset_products');
        products = stored ? JSON.parse(stored) : getDefaultProducts();
    }
}

async function loadOrders() {
    try {
        const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        orders = data || [];
        localStorage.setItem('luciecloset_orders', JSON.stringify(orders));
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_orders');
        orders = stored ? JSON.parse(stored) : [];
    }
    const badge = document.getElementById('orderBadge');
    if (badge) badge.textContent = orders.length;
}

async function loadCustomers() {
    try {
        const { data, error } = await sb.from('customers').select('*').order('name', { ascending: true });
        if (error) throw error;
        customers = data || [];
        localStorage.setItem('luciecloset_customers', JSON.stringify(customers));
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_customers');
        customers = stored ? JSON.parse(stored) : [];
    }
}

async function ensureAdminUser() {
    try {
        const { data: users, error } = await sb
            .from('users')
            .select('id')
            .limit(1);
            
        if (error) throw error;
        
        if (!users || users.length === 0) {
            console.log('👤 No users found, creating admin...');
            const { error: insertError } = await sb
                .from('users')
                .insert([{
                    email: 'admin@luciecloset.co.ke',
                    full_name: 'System Administrator',
                    role_id: 1,
                    status: 'active',
                    pin: '1234',
                    pin_enabled: true,
                    phone: '+254 700 000 000'
                }]);
            if (insertError) throw insertError;
            console.log('✅ Admin user created! Email: admin@luciecloset.co.ke, PIN: 1234');
            showToast('✅ Admin user created! Email: admin@luciecloset.co.ke, PIN: 1234', 'success');
        }
    } catch (error) {
        console.warn('Could not ensure admin user:', error);
    }
}

async function loadData() {
    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadCustomers()
    ]);
    await ensureAdminUser();
    updateStats();
    renderCurrentTab();
}

// ============================================================
// UPDATE STATS
// ============================================================
function updateStats() {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today && o.status === 'completed');
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const todaySales = document.getElementById('todaySales');
    const bestQualityCount = document.getElementById('bestQualityCount');
    const totalOrders = document.getElementById('totalOrders');
    const lowStock = document.getElementById('lowStock');
    
    if (todaySales) todaySales.textContent = `KES ${todayRevenue}`;
    if (bestQualityCount) bestQualityCount.textContent = products.filter(p => p.best_quality).length;
    if (totalOrders) totalOrders.textContent = orders.length;
    if (lowStock) lowStock.textContent = products.filter(p => p.stock < 5).length;
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================
function resetSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    const timeout = (sessionTimeout || 30) * 60 * 1000;
    sessionTimer = setTimeout(() => {
        showToast('⚠️ Session expired. Please login again.', 'warning');
        logout();
    }, timeout);
}

async function logout() {
    try {
        if (sb.auth) {
            await sb.auth.signOut().catch(() => {});
        }
    } catch (e) {}
    localStorage.removeItem(SESSION_KEY);
    showLogin();
    showToast('Logged out successfully', 'info');
}
window.logout = logout;

// ============================================================
// LOGIN SCREEN FUNCTIONS
// ============================================================
function showLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboardScreen) dashboardScreen.style.display = 'none';
    const alertEl = document.getElementById('loginAlert');
    if (alertEl) {
        alertEl.className = 'alert';
        alertEl.textContent = '';
    }
}

function showDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboardScreen) dashboardScreen.style.display = 'block';
    
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = session.user?.full_name || 'Admin';
    if (userRole) userRole.textContent = session.user?.role_name || 'Administrator';
    if (userAvatar) userAvatar.textContent = (session.user?.full_name || 'A').charAt(0).toUpperCase();
    
    loadData();
}

async function checkAuth() {
    try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (!stored) {
            console.log('❌ No session found');
            showLogin();
            return null;
        }

        let sessionData;
        try {
            sessionData = JSON.parse(stored);
        } catch (e) {
            localStorage.removeItem(SESSION_KEY);
            showLogin();
            return null;
        }

        const { user, loginTime } = sessionData;

        if (!user) {
            localStorage.removeItem(SESSION_KEY);
            showLogin();
            return null;
        }

        const maxAge = 24 * 60 * 60 * 1000;
        if (loginTime && Date.now() - loginTime > maxAge) {
            localStorage.removeItem(SESSION_KEY);
            showLogin();
            return null;
        }

        console.log('✅ User authenticated:', user.email);
        currentUser = user;
        updateUI(user);
        resetSessionTimer();
        showDashboard();
        return currentUser;

    } catch (error) {
        console.error('❌ Auth error:', error);
        localStorage.removeItem(SESSION_KEY);
        showLogin();
        return null;
    }
}

function updateUI(user) {
    const avatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    
    if (avatar) avatar.textContent = user.full_name?.charAt(0).toUpperCase() || 'A';
    if (userName) userName.textContent = user.full_name || 'User';
    if (userRole) userRole.textContent = user.role_name || 'Administrator';
}

// ============================================================
// PIN FUNCTIONS
// ============================================================
function pinPress(n) {
    if (isSubmitting) return;
    if (pinValue.length >= 4) return;

    const keys = document.querySelectorAll('.key:not(.action):not(.enter)');
    const order = ['1','2','3','4','5','6','7','8','9','0'];
    const idx = order.indexOf(n);
    if (idx >= 0 && keys[idx]) {
        keys[idx].style.transform = 'scale(0.85)';
        keys[idx].style.background = 'rgba(255,255,255,0.2)';
        setTimeout(() => {
            keys[idx].style.transform = '';
            keys[idx].style.background = '';
        }, 150);
    }

    if (navigator.vibrate) navigator.vibrate(8);

    pinValue += n;
    const pinInput = document.getElementById('pinInput');
    if (pinInput) pinInput.value = pinValue;
    renderDots();

    if (pinValue.length === 4) {
        setTimeout(() => submitPin(), 80);
    }
}
window.pinPress = pinPress;

function pinBackspace() {
    if (isSubmitting) return;
    if (pinValue.length === 0) return;

    const backspaceBtn = document.querySelector('.key.action');
    if (backspaceBtn) {
        backspaceBtn.style.transform = 'scale(0.85)';
        setTimeout(() => backspaceBtn.style.transform = '', 150);
    }

    if (navigator.vibrate) navigator.vibrate(5);

    pinValue = pinValue.slice(0, -1);
    const pinInput = document.getElementById('pinInput');
    if (pinInput) pinInput.value = pinValue;
    renderDots();
}
window.pinBackspace = pinBackspace;

function renderDots() {
    const dots = document.querySelectorAll('#pinDots .pin-dot');
    dots.forEach((dot, i) => {
        if (i < pinValue.length) {
            dot.classList.add('filled');
            if (i === pinValue.length - 1) {
                dot.style.animation = 'pulse 0.2s ease';
                setTimeout(() => dot.style.animation = '', 300);
            }
        } else {
            dot.classList.remove('filled');
        }
    });
}

function shakePinDots() {
    const dots = document.querySelectorAll('#pinDots .pin-dot');
    dots.forEach((dot, i) => {
        dot.style.animation = `shake 0.3s ease ${i * 0.05}s`;
        dot.style.borderColor = '#EF4444';
        setTimeout(() => {
            dot.style.animation = '';
            dot.style.borderColor = '';
        }, 500);
    });
}

function submitPin() {
    if (isSubmitting) return;
    if (pinValue.length < 4) {
        showAlert('Please enter 4 digits.', 'error');
        shakePinDots();
        return;
    }

    const enterBtn = document.getElementById('pinEnter');
    if (enterBtn) {
        enterBtn.style.transform = 'scale(0.85)';
        setTimeout(() => enterBtn.style.transform = '', 200);
    }

    const form = document.getElementById('loginForm');
    if (form) form.dispatchEvent(new Event('submit'));
}
window.submitPin = submitPin;

// ============================================================
// SWITCH LOGIN METHOD
// ============================================================
function switchMethod(method) {
    if (isSubmitting) return;
    currentMethod = method;

    if (method === 'pin') {
        const pinPane = document.getElementById('pinPane');
        const emailPane = document.getElementById('emailPane');
        const pinTab = document.getElementById('pinTab');
        const emailTab = document.getElementById('emailTab');
        const authSub = document.getElementById('authSub');
        
        if (pinPane) pinPane.classList.remove('hidden');
        if (emailPane) emailPane.classList.add('hidden');
        if (pinTab) pinTab.classList.add('active');
        if (emailTab) emailTab.classList.remove('active');
        if (authSub) authSub.textContent = 'Enter your email and PIN to sign in';
        
        hideAlert();
        pinValue = '';
        const pinInput = document.getElementById('pinInput');
        if (pinInput) pinInput.value = '';
        renderDots();
        setTimeout(() => {
            const pinEmail = document.getElementById('pinEmail');
            if (pinEmail) pinEmail.focus();
        }, 100);
    } else {
        const pinPane = document.getElementById('pinPane');
        const emailPane = document.getElementById('emailPane');
        const pinTab = document.getElementById('pinTab');
        const emailTab = document.getElementById('emailTab');
        const authSub = document.getElementById('authSub');
        
        if (emailPane) emailPane.classList.remove('hidden');
        if (pinPane) pinPane.classList.add('hidden');
        if (emailTab) emailTab.classList.add('active');
        if (pinTab) pinTab.classList.remove('active');
        if (authSub) authSub.textContent = 'Enter your credentials to continue';
        
        hideAlert();
        setTimeout(() => {
            const emailInput = document.getElementById('emailInput');
            if (emailInput) emailInput.focus();
        }, 100);
    }
}
window.switchMethod = switchMethod;

// ============================================================
// ALERT SYSTEM
// ============================================================
function showAlert(message, type = 'error') {
    const alertEl = document.getElementById('loginAlert');
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = 'alert ' + type;
    alertEl.setAttribute('role', 'alert');
}

function hideAlert() {
    const alertEl = document.getElementById('loginAlert');
    if (!alertEl) return;
    alertEl.className = 'alert';
    alertEl.textContent = '';
    alertEl.removeAttribute('role');
}

// ============================================================
// KEYBOARD SUPPORT
// ============================================================
document.addEventListener('keydown', function(e) {
    if (currentMethod !== 'pin') return;
    if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pinPress(e.key);
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        pinBackspace();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        submitPin();
    }
});

// ============================================================
// LOGIN HANDLER
// ============================================================
async function handleLogin(e) {
    e.preventDefault();
    if (isSubmitting) return;
    hideAlert();

    isSubmitting = true;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    
    if (loginBtn) loginBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';

    try {
        let email = '';

        if (currentMethod === 'pin') {
            const pinEmail = document.getElementById('pinEmail');
            if (!pinEmail) throw new Error('Email field not found');
            email = pinEmail.value.trim();
            
            if (!email) throw new Error('Please enter your email address.');
            if (!email.includes('@')) throw new Error('Please enter a valid email address.');
            if (pinValue.length < 4) throw new Error('PIN must be 4 digits.');

            console.log('🔍 Looking for user:', email);

            // ✅ Use 'sb' instead of 'supabase'
            const { data: user, error } = await sb
                .from('users')
                .select('id, email, full_name, role_id, status, pin, pin_enabled')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.error('❌ Database error:', error);
                throw new Error('Database error: ' + error.message);
            }

            if (!user) {
                console.log('❌ User not found:', email);
                throw new Error('User not found. Please check your email.');
            }

            console.log('✅ User found:', user.email);
            console.log('🔐 PIN in DB:', user.pin);
            console.log('🔑 PIN entered:', pinValue);

            if (user.status !== 'active') {
                throw new Error('Account is inactive. Please contact admin.');
            }

            if (!user.pin_enabled) {
                throw new Error('PIN is not enabled for this account. Please use email login.');
            }

            if (user.pin !== pinValue) {
                console.log('❌ PIN mismatch');
                throw new Error('Invalid PIN. Please try again.');
            }

            console.log('✅ PIN verified successfully!');

            let userData = { ...user, role_name: 'Admin' };
            try {
                const { data: roleData } = await sb
                    .from('roles')
                    .select('name')
                    .eq('id', user.role_id)
                    .maybeSingle();
                
                if (roleData) {
                    userData.role_name = roleData.name;
                }
            } catch (e) {
                console.log('⚠️ Could not fetch role, using default');
            }

            const sessionData = {
                user: {
                    ...userData,
                    role_name: userData.role_name || 'Admin'
                },
                loginMethod: 'pin',
                loginTime: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

            try {
                await sb
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', user.id);
            } catch (e) {
                console.log('⚠️ Could not update last login');
            }

            currentUser = sessionData.user;
            showToast('Welcome back, ' + user.full_name + '!', 'success');
            showDashboard();

        } else {
            // Email login
            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');
            
            if (!emailInput || !passwordInput) throw new Error('Form fields not found');
            
            email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) throw new Error('Please enter both email and password.');
            if (!email.includes('@')) throw new Error('Please enter a valid email address.');

            const { data: authData, error: authError } = await sb.auth.signInWithPassword({
                email, password
            });

            if (authError) throw new Error(authError.message || 'Authentication failed.');

            const { data: userData, error: userError } = await sb
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (userError || !userData) throw new Error('User profile not found');
            if (userData.status !== 'active') throw new Error('Account is inactive');

            const sessionData = {
                user: {
                    ...userData,
                    role_name: 'Admin'
                },
                session: authData.session,
                loginMethod: 'email',
                loginTime: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

            currentUser = sessionData.user;
            showToast('Welcome back, ' + userData.full_name + '!', 'success');
            showDashboard();
        }

    } catch (error) {
        showAlert(error.message, 'error');
        console.error('Login error:', error);
        
        if (currentMethod === 'pin') {
            pinValue = '';
            const pinInput = document.getElementById('pinInput');
            if (pinInput) pinInput.value = '';
            renderDots();
            shakePinDots();
        }
        
        const loginBtn = document.getElementById('loginBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');
        if (loginBtn) loginBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnSpinner) btnSpinner.style.display = 'none';
        isSubmitting = false;
    }
}
window.handleLogin = handleLogin;

// ============================================================
// REFRESH ALL FUNCTION
// ============================================================
function refreshAll() {
    showToast('🔄 Refreshing data...', 'info');
    loadData();
}
window.refreshAll = refreshAll;

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(section) {
    currentTab = section;
    document.querySelectorAll('.section-page').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));

    const sectionMap = {
        'dashboard': 'dashboardSection',
        'pos': 'posSection',
        'orders': 'ordersSection',
        'products': 'productsSection',
        'inventory': 'inventorySection',
        'customers': 'customersSection',
        'reports': 'reportsSection',
        'profit': 'profitSection',
        'audit': 'auditSection',
        'settings': 'settingsSection'
    };

    const target = document.getElementById(sectionMap[section]);
    if (target) target.classList.add('active');
    
    const navItem = document.querySelector(`.sidebar-menu li[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');

    const titles = {
        'dashboard': '📊 Dashboard',
        'pos': '🛒 Point of Sale',
        'orders': '📋 Orders',
        'products': '📦 Products',
        'inventory': '🏪 Inventory',
        'customers': '👤 Customers',
        'reports': '📊 Reports',
        'profit': '💰 Profit/Loss',
        'audit': '📜 Audit Trail',
        'settings': '⚙️ Settings'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = titles[section] || section;
    
    renderCurrentTab();
    resetSessionTimer();
}
window.navigateTo = navigateTo;

function renderCurrentTab() {
    if (currentTab === 'dashboard') {
        updateGreeting();
        renderDashboard();
    } else if (currentTab === 'pos') {
        renderPOSProducts();
        updateCartUI();
    } else if (currentTab === 'orders') {
        renderOrders();
    } else if (currentTab === 'products') {
        renderProductsTable();
    } else if (currentTab === 'inventory') {
        renderInventory();
    } else if (currentTab === 'customers') {
        renderCustomersTable();
    } else if (currentTab === 'reports') {
        // handled by button
    } else if (currentTab === 'profit') {
        refreshProfitData();
    } else if (currentTab === 'audit') {
        loadAuditLogs();
    }
}

// ============================================================
// GREETING
// ============================================================
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';

    const name = currentUser?.full_name || 'Admin';
    const container = document.getElementById('greetingContainer');
    if (container) {
        container.innerHTML = `
            <div class="greeting-banner">
                <h2>👋 ${greeting}, ${name}!
                    <span class="greeting-sub">Welcome to Lucie Closet POS System</span>
                </h2>
            </div>
        `;
    }
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    renderRecentOrders();
    renderTopProducts();
    renderSalesChart();
}

function renderRecentOrders() {
    const recent = orders.slice(0, 10);
    const container = document.getElementById('recentOrdersTable');
    if (!container) return;

    if (!recent.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent orders</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(o => `
                        <tr>
                            <td><strong>${o.order_number}</strong></td>
                            <td>${o.customer_name || 'Guest'}</td>
                            <td>${o.items ? o.items.reduce((s,i) => s + i.qty, 0) : 0} items</td>
                            <td><strong>KES ${o.total}</strong></td>
                            <td><span class="status-badge ${o.status || 'pending'}">${o.status || 'pending'}</span></td>
                            <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderTopProducts() {
    const productSales = {};
    orders.forEach(o => {
        if (o.items) {
            o.items.forEach(i => {
                if (!productSales[i.id]) productSales[i.id] = { name: i.name, qty: 0, revenue: 0 };
                productSales[i.id].qty += i.qty;
                productSales[i.id].revenue += i.price * i.qty;
            });
        }
    });

    const sorted = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const container = document.getElementById('topProductsList');
    if (!container) return;

    if (!sorted.length) {
        container.innerHTML = '<div class="empty-state"><p>No sales data</p></div>';
        return;
    }

    container.innerHTML = sorted.map((p, i) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
            <span>${i+1}. ${p.name}</span>
            <span style="font-weight:600;color:var(--primary);">KES ${p.revenue}</span>
        </div>
    `).join('');
}

function renderSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (salesChartInstance) salesChartInstance.destroy();

    const last7Days = [];
    const salesData = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        last7Days.push(date.toLocaleDateString('en', { weekday: 'short' }));
        const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === dateStr && o.status === 'completed');
        salesData.push(dayOrders.reduce((sum, o) => sum + (o.total || 0), 0));
    }

    salesChartInstance = new Chart(context, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Sales (KES)',
                data: salesData,
                borderColor: '#C62828',
                backgroundColor: 'rgba(198,40,40,0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return 'KES ' + value; }
                    }
                }
            }
        }
    });
}

// ============================================================
// POS FUNCTIONS
// ============================================================
function renderPOSProducts() {
    const grid = document.getElementById('posProductGrid');
    if (!grid) return;
    
    const search = document.getElementById('posSearch');
    const searchValue = search ? search.value.toLowerCase() : '';
    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchValue) || (p.code && p.code.toLowerCase().includes(searchValue));
        const matchCategory = currentCategory === 'all' || p.category === currentCategory;
        return matchSearch && matchCategory && p.stock > 0;
    });

    if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products available</p></div>';
        return;
    }

    grid.innerHTML = filtered.map(p => `
        <div class="pos-product-item" onclick="addToCart(${p.id})">
            <span class="emoji">${p.category === 'dress' ? '👗' : p.category === 'top' ? '👕' : p.category === 'sweater' ? '🧥' : '👔'}</span>
            <div class="name">${p.name}</div>
            <div class="price">KES ${p.price}</div>
            <div class="stock">${p.stock} in stock</div>
            ${p.best_quality ? '<div class="best-tag"><i class="fas fa-star"></i> Best</div>' : ''}
        </div>
    `).join('');
}
window.renderPOSProducts = renderPOSProducts;

function filterPOSProducts() {
    renderPOSProducts();
}
window.filterPOSProducts = filterPOSProducts;

function switchCategory(category) {
    currentCategory = category;
    renderPOSProducts();
}
window.switchCategory = switchCategory;

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (product.stock < 1) {
        showToast('Out of stock!', 'error');
        return;
    }

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.qty >= product.stock) {
            showToast('Stock limit reached', 'error');
            return;
        }
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    showToast(`${product.name} added to cart`, 'success');
}
window.addToCart = addToCart;

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}
window.removeFromCart = removeFromCart;

function updateQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    const product = products.find(p => p.id === productId);
    const newQty = item.qty + delta;

    if (newQty < 1) { removeFromCart(productId); return; }
    if (product && newQty > product.stock) { showToast('Stock limit reached', 'error'); return; }

    item.qty = newQty;
    updateCartUI();
}
window.updateQty = updateQty;

function updateCartUI() {
    const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
    const totalPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

    const cartCount = document.getElementById('posCartCount');
    const cartItems = document.getElementById('posCartItems');
    const cartTotal = document.getElementById('posCartTotal');
    
    if (cartCount) cartCount.textContent = `${totalItems} items`;

    if (!cart.length) {
        if (cartItems) {
            cartItems.innerHTML = '<div class="empty-state"><i class="fas fa-plus-circle"></i><p>Add items from the left</p></div>';
        }
    } else {
        if (cartItems) {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="item-info">
                        <div class="name">${item.name}</div>
                        <div class="code">${item.code || 'N/A'}</div>
                    </div>
                    <div class="item-qty">
                        <button onclick="updateQty(${item.id},-1)">−</button>
                        <span>${item.qty}</span>
                        <button onclick="updateQty(${item.id},1)">+</button>
                    </div>
                    <div class="item-total">KES ${item.price * item.qty}</div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-times"></i></button>
                </div>
            `).join('');
        }
    }

    if (cartTotal) cartTotal.textContent = `KES ${totalPrice}`;
}
window.updateCartUI = updateCartUI;

function clearCart() {
    if (!cart.length) return;
    if (confirm('Clear all items from cart?')) {
        cart = [];
        updateCartUI();
        showToast('Cart cleared', 'info');
    }
}
window.clearCart = clearCart;

// ============================================================
// CHECKOUT
// ============================================================
function openCheckout() {
    if (!cart.length) {
        showToast('Cart is empty', 'error');
        return;
    }

    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const checkoutTotal = document.getElementById('checkoutTotal');
    const checkoutItems = document.getElementById('checkoutItems');
    
    if (checkoutTotal) checkoutTotal.textContent = `KES ${total}`;
    
    if (checkoutItems) {
        checkoutItems.innerHTML = cart.map(i => `
            <div class="checkout-item">
                <span>${i.name} × ${i.qty}</span>
                <span>KES ${i.price * i.qty}</span>
            </div>
        `).join('');
    }

    const checkoutName = document.getElementById('checkoutName');
    const checkoutPhone = document.getElementById('checkoutPhone');
    const mpesaCode = document.getElementById('mpesaCode');
    const cashPaid = document.getElementById('cashPaid');
    const changeDisplay = document.getElementById('changeDisplay');
    const mpesaForm = document.getElementById('mpesaForm');
    const cashForm = document.getElementById('cashForm');
    
    if (checkoutName) checkoutName.value = '';
    if (checkoutPhone) checkoutPhone.value = '';
    if (mpesaCode) mpesaCode.value = '';
    if (cashPaid) cashPaid.value = '';
    if (changeDisplay) changeDisplay.textContent = '';
    if (mpesaForm) mpesaForm.style.display = 'none';
    if (cashForm) cashForm.style.display = 'none';

    openModal('checkoutModal');
}
window.openCheckout = openCheckout;

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-methods .method').forEach(el => el.classList.remove('active'));
    const activeMethod = document.querySelector(`.payment-methods .method[data-method="${method}"]`);
    if (activeMethod) activeMethod.classList.add('active');

    const mpesaForm = document.getElementById('mpesaForm');
    const cashForm = document.getElementById('cashForm');
    if (mpesaForm) mpesaForm.style.display = method === 'mpesa' ? 'block' : 'none';
    if (cashForm) cashForm.style.display = method === 'cash' ? 'block' : 'none';
}
window.selectPayment = selectPayment;

function calculateChange() {
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const cashPaid = document.getElementById('cashPaid');
    const changeDisplay = document.getElementById('changeDisplay');
    
    if (!cashPaid || !changeDisplay) return;
    const paid = parseFloat(cashPaid.value) || 0;
    const change = paid - total;
    changeDisplay.textContent = change >= 0 ? `Change: KES ${change}` : `Balance: KES ${Math.abs(change)}`;
}
window.calculateChange = calculateChange;

async function completeOrder() {
    if (!cart.length) return;

    const checkoutName = document.getElementById('checkoutName');
    const checkoutPhone = document.getElementById('checkoutPhone');
    const mpesaCode = document.getElementById('mpesaCode');
    
    const name = checkoutName ? checkoutName.value.trim() || 'Walk-in Customer' : 'Walk-in Customer';
    const phone = checkoutPhone ? checkoutPhone.value.trim() || 'N/A' : 'N/A';
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

    let paymentDetails = selectedPayment;
    if (selectedPayment === 'mpesa') {
        const code = mpesaCode ? mpesaCode.value.trim() : '';
        if (!code) { showToast('Please enter M-Pesa transaction code', 'error'); return; }
        paymentDetails = `M-Pesa: ${code}`;
    }

    const orderData = {
        order_number: 'POS-' + Date.now().toString().slice(-6),
        customer_name: name,
        customer_phone: phone,
        customer_email: '',
        items: cart.map(i => ({ id: i.id, name: i.name, code: i.code, qty: i.qty, price: i.price })),
        total: total,
        payment_method: paymentDetails,
        status: 'completed',
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await sb.from('orders').insert([orderData]);
        if (error) throw error;

        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                const newStock = product.stock - item.qty;
                await sb.from('products').update({ stock: newStock }).eq('id', item.id);
                product.stock = newStock;
            }
        }

        showToast(`✅ Order ${orderData.order_number} completed!`, 'success');
        generateReceipt(orderData);

        cart = [];
        updateCartUI();
        closeModal('checkoutModal');
        await loadProducts();
        updateStats();
        renderPOSProducts();

    } catch (e) {
        console.error('Order error:', e);
        showToast('Error processing order', 'error');
    }
}
window.completeOrder = completeOrder;

function generateReceipt(order) {
    const receipt = `
        ================================
           LUCIE CLOSET · RECEIPT
        ================================
        Order: ${order.order_number}
        Date: ${new Date(order.created_at).toLocaleString()}
        Customer: ${order.customer_name}
        Phone: ${order.customer_phone}
        ---------------------------------
        ${order.items.map(i => `${i.name} × ${i.qty} = KES ${i.price * i.qty}`).join('\n        ')}
        ---------------------------------
        Total: KES ${order.total}
        Payment: ${order.payment_method}
        ================================
        Thank you for shopping with us!
        Eastleigh 5th St, Micki Mall, Rm S12
        ================================
    `;

    const receiptContent = document.getElementById('receiptContent');
    if (receiptContent) receiptContent.textContent = receipt;
    openModal('receiptModal');

    setTimeout(() => printReceipt(), 500);
}

function printReceipt() {
    const receiptContent = document.getElementById('receiptContent');
    if (!receiptContent) return;
    
    const content = receiptContent.textContent;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(`
            <html><head><title>Receipt</title>
            <style>body{font-family:monospace;padding:20px;white-space:pre-wrap;font-size:14px;}</style>
            </head><body>${content}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}
window.printReceipt = printReceipt;

// ============================================================
// ORDERS
// ============================================================
function renderOrders(filter = 'all') {
    let filtered = [...orders];

    if (filter !== 'all') {
        filtered = filtered.filter(o => o.status === filter);
    }

    const countAll = document.getElementById('countAll');
    const countPending = document.getElementById('countPending');
    const countCompleted = document.getElementById('countCompleted');
    const countCancelled = document.getElementById('countCancelled');
    const orderCount = document.getElementById('orderCount');
    const ordersContainer = document.getElementById('ordersContainer');
    
    if (countAll) countAll.textContent = orders.length;
    if (countPending) countPending.textContent = orders.filter(o => o.status === 'pending').length;
    if (countCompleted) countCompleted.textContent = orders.filter(o => o.status === 'completed').length;
    if (countCancelled) countCancelled.textContent = orders.filter(o => o.status === 'cancelled').length;
    if (orderCount) orderCount.textContent = filtered.length;

    if (!ordersContainer) return;

    if (!filtered.length) {
        ordersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No orders found</p></div>';
        return;
    }

    ordersContainer.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(o => `
                        <tr>
                            <td><strong>${o.order_number}</strong></td>
                            <td>${o.customer_name || 'Guest'}</td>
                            <td>${o.items ? o.items.reduce((s,i) => s + i.qty, 0) : 0} items</td>
                            <td><strong>KES ${o.total}</strong></td>
                            <td>${o.payment_method || 'N/A'}</td>
                            <td><span class="status-badge ${o.status || 'pending'}">${o.status || 'pending'}</span></td>
                            <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
                                ${o.status !== 'completed' ? `<button class="btn btn-sm btn-success" onclick="updateOrderStatus(${o.id},'completed')"><i class="fas fa-check"></i></button>` : ''}
                                ${o.status !== 'cancelled' && o.status !== 'completed' ? `<button class="btn btn-sm btn-danger" onclick="updateOrderStatus(${o.id},'cancelled')"><i class="fas fa-times"></i></button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
window.renderOrders = renderOrders;

function viewOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    alert(`
        Order: ${order.order_number}
        Customer: ${order.customer_name || 'Guest'}
        Phone: ${order.customer_phone || 'N/A'}
        Payment: ${order.payment_method || 'N/A'}
        Status: ${order.status || 'pending'}
        Total: KES ${order.total}
        Date: ${new Date(order.created_at).toLocaleString()}
        --------------------
        Items:
        ${order.items ? order.items.map(i => `${i.name} × ${i.qty} = KES ${i.price * i.qty}`).join('\n') : ''}
    `);
}
window.viewOrder = viewOrder;

async function updateOrderStatus(id, status) {
    try {
        const { error } = await sb.from('orders').update({ status }).eq('id', id);
        if (error) throw error;
        showToast(`Order ${status}`, 'success');
        await loadOrders();
        const activeFilter = document.querySelector('.filter-btn.active');
        renderOrders(activeFilter ? activeFilter.dataset.filter : 'all');
        updateStats();
    } catch (e) {
        showToast('Error updating order', 'error');
    }
}
window.updateOrderStatus = updateOrderStatus;

// ============================================================
// PRODUCTS TABLE
// ============================================================
function renderProductsTable() {
    const container = document.getElementById('productsTable');
    if (!container) return;

    if (!products.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products found</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Code</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr>
                            <td>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <span style="font-size:24px;">${p.category === 'dress' ? '👗' : p.category === 'top' ? '👕' : '👔'}</span>
                                    <div>
                                        <div style="font-weight:600;">${p.name}</div>
                                        <div style="font-size:12px;color:var(--text-muted);">${p.code || 'N/A'}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${p.code || 'N/A'}</td>
                            <td>${p.category}</td>
                            <td>KES ${p.price}</td>
                            <td>${p.stock}</td>
                            <td>${p.best_quality ? '<span class="badge primary"><i class="fas fa-star"></i> Best</span>' : 'Standard'}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
window.renderProductsTable = renderProductsTable;

function openProductModal(product = null) {
    const editId = document.getElementById('editProductId');
    const modalTitle = document.getElementById('productModalTitle');
    const saveBtn = document.getElementById('saveProductBtn');
    const productName = document.getElementById('productName');
    const productCode = document.getElementById('productCode');
    const productCategory = document.getElementById('productCategory');
    const productGender = document.getElementById('productGender');
    const productPrice = document.getElementById('productPrice');
    const productStock = document.getElementById('productStock');
    const productBestQuality = document.getElementById('productBestQuality');
    const imagePreview = document.getElementById('imagePreview');
    
    if (editId) editId.value = product ? product.id : '';
    if (modalTitle) modalTitle.textContent = product ? '✏️ Edit Product' : '📦 Add Product';
    if (saveBtn) saveBtn.innerHTML = product ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-save"></i> Save';
    if (productName) productName.value = product ? product.name : '';
    if (productCode) productCode.value = product ? product.code : '';
    if (productCategory) productCategory.value = product ? product.category : '';
    if (productGender) productGender.value = product ? product.gender : 'unisex';
    if (productPrice) productPrice.value = product ? product.price : '';
    if (productStock) productStock.value = product ? product.stock : '';
    if (productBestQuality) productBestQuality.checked = product ? product.best_quality : false;
    if (imagePreview) imagePreview.innerHTML = product && product.image_url ? `<img src="${product.image_url}">` : '';

    openModal('productModal');
}
window.openProductModal = openProductModal;

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId');
    const productName = document.getElementById('productName');
    const productCode = document.getElementById('productCode');
    const productCategory = document.getElementById('productCategory');
    const productGender = document.getElementById('productGender');
    const productPrice = document.getElementById('productPrice');
    const productStock = document.getElementById('productStock');
    const productBestQuality = document.getElementById('productBestQuality');

    if (!productName || !productCode || !productCategory || !productPrice || !productStock) return;

    const name = productName.value.trim();
    const code = productCode.value.trim();
    const category = productCategory.value;
    const gender = productGender ? productGender.value : 'unisex';
    const price = parseInt(productPrice.value);
    const stock = parseInt(productStock.value);
    const best_quality = productBestQuality ? productBestQuality.checked : false;

    if (!name || !code || !category || !price || isNaN(stock)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const productData = { name, code, category, gender, price, stock, best_quality };

    try {
        if (id && id.value) {
            const { error } = await sb.from('products').update(productData).eq('id', parseInt(id.value));
            if (error) throw error;
            showToast('Product updated!', 'success');
        } else {
            const { error } = await sb.from('products').insert([productData]);
            if (error) throw error;
            showToast('Product added!', 'success');
        }
        await loadProducts();
        updateStats();
        renderCurrentTab();
        closeModal('productModal');
    } catch (e) {
        showToast('Error saving product', 'error');
    }
}
window.saveProduct = saveProduct;

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) openProductModal(product);
}
window.editProduct = editProduct;

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
        const { error } = await sb.from('products').delete().eq('id', id);
        if (error) throw error;
        showToast('Product deleted', 'success');
        await loadProducts();
        updateStats();
        renderCurrentTab();
    } catch (e) {
        showToast('Error deleting product', 'error');
    }
}
window.deleteProduct = deleteProduct;

// ============================================================
// INVENTORY
// ============================================================
function renderInventory() {
    const stockProduct = document.getElementById('stockProduct');
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p =>
            `<option value="${p.id}">${p.name} (${p.stock} in stock)</option>`
        ).join('');
    }

    const inventoryTable = document.getElementById('inventoryTable');
    if (inventoryTable) {
        if (!products.length) {
            inventoryTable.innerHTML = '<div class="empty-state"><p>No products</p></div>';
        } else {
            inventoryTable.innerHTML = `
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Stock</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => `
                                <tr>
                                    <td>${p.name}</td>
                                    <td>${p.stock}</td>
                                    <td>${p.stock < 5 ? '<span class="badge danger">⚠️ Low Stock</span>' : '<span class="badge success">✅ In Stock</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    const categoryStockList = document.getElementById('categoryStockList');
    if (categoryStockList) {
        const categoryStock = {};
        products.forEach(p => {
            if (!categoryStock[p.category]) categoryStock[p.category] = 0;
            categoryStock[p.category] += p.stock;
        });

        categoryStockList.innerHTML = Object.entries(categoryStock)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, stock]) => `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                    <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    <span>${stock} units</span>
                </div>
            `).join('') || '<div class="empty-state"><p>No categories</p></div>';
    }
}
window.renderInventory = renderInventory;

function openStockModal() {
    const stockProduct = document.getElementById('stockProduct');
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p =>
            `<option value="${p.id}">${p.name} (${p.stock} in stock)</option>`
        ).join('');
    }
    const adjustmentQty = document.getElementById('adjustmentQty');
    const adjustmentReason = document.getElementById('adjustmentReason');
    if (adjustmentQty) adjustmentQty.value = '';
    if (adjustmentReason) adjustmentReason.value = '';
    openModal('stockModal');
}
window.openStockModal = openStockModal;

async function adjustStock(e) {
    e.preventDefault();
    const stockProduct = document.getElementById('stockProduct');
    const adjustmentType = document.getElementById('adjustmentType');
    const adjustmentQty = document.getElementById('adjustmentQty');
    const adjustmentReason = document.getElementById('adjustmentReason');

    if (!stockProduct || !adjustmentType || !adjustmentQty) return;

    const productId = parseInt(stockProduct.value);
    const type = adjustmentType.value;
    const qty = parseFloat(adjustmentQty.value);
    const reason = adjustmentReason ? adjustmentReason.value || 'Manual adjustment' : 'Manual adjustment';

    if (!productId || !qty || qty <= 0) {
        showToast('Please enter valid quantity', 'error');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newStock = type === 'add' ? product.stock + qty : Math.max(0, product.stock - qty);

    try {
        const { error } = await sb.from('products').update({ stock: newStock }).eq('id', productId);
        if (error) throw error;

        showToast(`Stock updated: ${product.name} → ${newStock}`, 'success');
        await loadProducts();
        renderCurrentTab();
        closeModal('stockModal');
    } catch (e) {
        showToast('Error adjusting stock', 'error');
    }
}
window.adjustStock = adjustStock;

// ============================================================
// CUSTOMERS
// ============================================================
function renderCustomersTable() {
    const container = document.getElementById('customersTable');
    if (!container) return;

    if (!customers.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No customers found</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Orders</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.map(c => `
                        <tr>
                            <td><strong>${c.name}</strong></td>
                            <td>${c.phone}</td>
                            <td>${c.email || '-'}</td>
                            <td>${orders.filter(o => o.customer_phone === c.phone).length}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
window.renderCustomersTable = renderCustomersTable;

function openCustomerModal(customer = null) {
    const editId = document.getElementById('editCustomerId');
    const modalTitle = document.getElementById('customerModalTitle');
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const customerEmail = document.getElementById('customerEmail');
    
    if (editId) editId.value = customer ? customer.id : '';
    if (modalTitle) modalTitle.textContent = customer ? '✏️ Edit Customer' : '👤 Add Customer';
    if (customerName) customerName.value = customer ? customer.name : '';
    if (customerPhone) customerPhone.value = customer ? customer.phone : '';
    if (customerEmail) customerEmail.value = customer ? customer.email : '';
    
    openModal('customerModal');
}
window.openCustomerModal = openCustomerModal;

async function saveCustomer(e) {
    e.preventDefault();
    const editId = document.getElementById('editCustomerId');
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const customerEmail = document.getElementById('customerEmail');

    if (!customerName || !customerPhone) return;

    const name = customerName.value.trim();
    const phone = customerPhone.value.trim();
    const email = customerEmail ? customerEmail.value.trim() : '';

    if (!name || !phone) {
        showToast('Please fill in name and phone', 'error');
        return;
    }

    const data = { name, phone, email };

    try {
        if (editId && editId.value) {
            const { error } = await sb.from('customers').update(data).eq('id', parseInt(editId.value));
            if (error) throw error;
            showToast('Customer updated!', 'success');
        } else {
            const { error } = await sb.from('customers').insert([data]);
            if (error) throw error;
            showToast('Customer added!', 'success');
        }
        await loadCustomers();
        renderCurrentTab();
        closeModal('customerModal');
    } catch (e) {
        showToast('Error saving customer', 'error');
    }
}
window.saveCustomer = saveCustomer;

async function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return;
    try {
        const { error } = await sb.from('customers').delete().eq('id', id);
        if (error) throw error;
        showToast('Customer deleted', 'success');
        await loadCustomers();
        renderCurrentTab();
    } catch (e) {
        showToast('Error deleting customer', 'error');
    }
}
window.deleteCustomer = deleteCustomer;

// ============================================================
// REPORTS
// ============================================================
function generateReport() {
    const reportStart = document.getElementById('reportStart');
    const reportEnd = document.getElementById('reportEnd');
    const reportContent = document.getElementById('reportContent');

    if (!reportStart || !reportEnd || !reportContent) return;

    const start = reportStart.value;
    const end = reportEnd.value;

    if (!start || !end) {
        showToast('Please select both dates', 'warning');
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59);

    const filtered = orders.filter(o => {
        const date = new Date(o.created_at);
        return date >= startDate && date <= endDate && o.status === 'completed';
    });

    const total = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
    const count = filtered.length;

    reportContent.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div style="background:var(--bg);padding:16px;border-radius:var(--radius-sm);text-align:center;">
                <div style="font-size:12px;color:var(--text-muted);">Total Sales</div>
                <div style="font-size:24px;font-weight:700;color:var(--primary);">KES ${total}</div>
            </div>
            <div style="background:var(--bg);padding:16px;border-radius:var(--radius-sm);text-align:center;">
                <div style="font-size:12px;color:var(--text-muted);">Orders</div>
                <div style="font-size:24px;font-weight:700;color:var(--success);">${count}</div>
            </div>
        </div>
        <div style="max-height:300px;overflow-y:auto;">
            ${filtered.length ? filtered.map(o => `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
                    <span>${o.order_number}</span>
                    <span>${o.customer_name || 'Guest'}</span>
                    <span><strong>KES ${o.total}</strong></span>
                    <span style="color:var(--text-muted);font-size:12px;">${new Date(o.created_at).toLocaleDateString()}</span>
                </div>
            `).join('') : '<div class="empty-state"><p>No orders in this period</p></div>'}
        </div>
    `;
}
window.generateReport = generateReport;

function exportReport(format) {
    showToast(`Exporting ${format.toUpperCase()}...`, 'info');
    setTimeout(() => showToast(`✅ ${format.toUpperCase()} exported!`, 'success'), 1500);
}
window.exportReport = exportReport;

// ============================================================
// PROFIT/LOSS
// ============================================================
function refreshProfitData() {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const costPercentage = 0.6;
    const totalCost = totalRevenue * costPercentage;
    const netProfit = totalRevenue - totalCost;

    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalCostEl = document.getElementById('totalCost');
    const netProfitEl = document.getElementById('netProfit');
    
    if (totalRevenueEl) totalRevenueEl.textContent = `KES ${totalRevenue.toFixed(2)}`;
    if (totalCostEl) totalCostEl.textContent = `KES ${totalCost.toFixed(2)}`;
    if (netProfitEl) netProfitEl.textContent = `KES ${netProfit.toFixed(2)}`;

    renderProfitChart(totalRevenue, totalCost, netProfit);
}
window.refreshProfitData = refreshProfitData;

function renderProfitChart(revenue, cost, profit) {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (profitChartInstance) profitChartInstance.destroy();

    profitChartInstance = new Chart(context, {
        type: 'doughnut',
        data: {
            labels: ['Revenue', 'Cost', 'Profit'],
            datasets: [{
                data: [revenue, cost, profit],
                backgroundColor: ['#10B981', '#EF4444', '#C62828'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
}

// ============================================================
// AUDIT TRAIL
// ============================================================
function loadAuditLogs() {
    const logs = JSON.parse(localStorage.getItem('luciecloset_audit') || '[]');
    const auditTable = document.getElementById('auditTable');
    if (!auditTable) return;

    if (!logs.length) {
        auditTable.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No audit logs found</p></div>';
        return;
    }

    auditTable.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.slice(0, 50).map(log => `
                        <tr>
                            <td style="font-size:12px;color:var(--text-muted);">${new Date(log.timestamp).toLocaleString()}</td>
                            <td>${log.user || 'System'}</td>
                            <td><span class="badge primary">${log.action}</span></td>
                            <td>${log.details || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
window.loadAuditLogs = loadAuditLogs;

// ============================================================
// SETTINGS
// ============================================================
function saveSettings(e) {
    e.preventDefault();
    const businessName = document.getElementById('businessName');
    const businessPhone = document.getElementById('businessPhone');
    const businessEmail = document.getElementById('businessEmail');
    const businessLocation = document.getElementById('businessLocation');
    const receiptFooter = document.getElementById('receiptFooter');
    
    const settings = {
        businessName: businessName ? businessName.value : 'Lucie Closet',
        phone: businessPhone ? businessPhone.value : '+254 794 789 345',
        email: businessEmail ? businessEmail.value : 'info@luciecloset.co.ke',
        location: businessLocation ? businessLocation.value : 'Eastleigh 5th St, Micki Mall, Rm S12',
        receiptFooter: receiptFooter ? receiptFooter.value : 'Thank you for shopping at Lucie Closet! 👗'
    };
    localStorage.setItem('luciecloset_settings', JSON.stringify(settings));
    showToast('Settings saved!', 'success');
}
window.saveSettings = saveSettings;

function savePaymentSettings(e) {
    e.preventDefault();
    const defaultPayment = document.getElementById('defaultPayment');
    const mpesaShortcode = document.getElementById('mpesaShortcode');
    
    const settings = {
        defaultPayment: defaultPayment ? defaultPayment.value : 'mpesa',
        mpesaShortcode: mpesaShortcode ? mpesaShortcode.value : ''
    };
    localStorage.setItem('luciecloset_payment_settings', JSON.stringify(settings));
    showToast('Payment settings saved!', 'success');
}
window.savePaymentSettings = savePaymentSettings;

// ============================================================
// MODALS
// ============================================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}
window.openModal = openModal;

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}
window.closeModal = closeModal;

// ============================================================
// THEME TOGGLE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            this.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            localStorage.setItem('luciecloset_theme', isDark ? 'light' : 'dark');
        });
    }

    const savedTheme = localStorage.getItem('luciecloset_theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
});

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
    const now = new Date();
    const timeDisplay = document.getElementById('currentTime');
    if (timeDisplay) {
        timeDisplay.textContent = now.toLocaleTimeString('en-KE', { hour12: false });
    }
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// SIDEBAR TOGGLE (Mobile)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }
});

// ============================================================
// NAVIGATION CLICK HANDLERS
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.sidebar-menu li[data-section]').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            navigateTo(section);
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    });
});

// ============================================================
// ORDER FILTERS
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('#orderFilters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#orderFilters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderOrders(this.dataset.filter);
        });
    });
});

// ============================================================
// LOGOUT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
    }
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const search = document.getElementById('posSearch');
        if (search) search.focus();
    }
});

// ============================================================
// LOGIN FORM SUBMIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});
// ============================================================
// LUCIE CLOSET · PRODUCTION HARDENING & BUSINESS UPGRADES
// These overrides preserve the existing HTML/DOM contract while
// strengthening stock control, roles, audit logging, costing,
// reporting, validation and operational safeguards.
// ============================================================

const LC = window.LC || {};
window.LC = LC;

LC.roles = {
    Owner: ['dashboard','pos','orders','products','inventory','customers','reports','profit','audit','settings'],
    Administrator: ['dashboard','pos','orders','products','inventory','customers','reports','profit','audit','settings'],
    Manager: ['dashboard','pos','orders','products','inventory','customers','reports','profit'],
    Accountant: ['dashboard','orders','customers','reports','profit'],
    'Stock Manager': ['dashboard','products','inventory'],
    Cashier: ['dashboard','pos','orders','customers']
};

LC.can = function(action) {
    const role = currentUser?.role_name || 'Cashier';
    const rules = {
        manageUsers: ['Owner','Administrator'],
        manageSettings: ['Owner','Administrator'],
        manageProducts: ['Owner','Administrator','Manager','Stock Manager'],
        adjustStock: ['Owner','Administrator','Manager','Stock Manager'],
        cancelOrders: ['Owner','Administrator','Manager'],
        viewProfit: ['Owner','Administrator','Manager','Accountant'],
        audit: ['Owner','Administrator','Manager']
    };
    return (rules[action] || []).includes(role);
};

LC.escape = function(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    }[c]));
};

LC.money = function(value) {
    return `KES ${Number(value || 0).toLocaleString('en-KE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

LC.number = function(value) {
    return Number(value || 0).toLocaleString('en-KE', {maximumFractionDigits: 2});
};

LC.costOf = function(productOrItem) {
    const value = Number(
        productOrItem?.cost_price ??
        productOrItem?.cost ??
        productOrItem?.unit_cost ??
        0
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
};

LC.reorderLevel = function(product) {
    const value = Number(product?.reorder_level ?? product?.minimum_stock ?? 5);
    return Number.isFinite(value) && value >= 0 ? value : 5;
};

LC.isLowStock = function(product) {
    return Number(product?.stock || 0) <= LC.reorderLevel(product);
};

LC.audit = async function(action, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        user: currentUser?.full_name || currentUser?.email || 'System',
        user_id: currentUser?.id || null,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details)
    };

    try {
        const { error } = await sb.from('audit_logs').insert([entry]);
        if (!error) return;
    } catch (_) {}

    try {
        const logs = JSON.parse(localStorage.getItem('luciecloset_audit') || '[]');
        logs.unshift(entry);
        localStorage.setItem('luciecloset_audit', JSON.stringify(logs.slice(0, 500)));
    } catch (_) {}
};

LC.permissionToast = function(action) {
    if (!LC.can(action)) {
        showToast('You do not have permission to perform this action.', 'error');
        return false;
    }
    return true;
};

// ------------------------------------------------------------
// Stronger statistics: revenue, profit and stock awareness.
// ------------------------------------------------------------
updateStats = function() {
    const today = new Date().toDateString();
    const completed = orders.filter(o => o.status === 'completed');
    const todayOrders = completed.filter(o => new Date(o.created_at).toDateString() === today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    let todayCost = 0;
    todayOrders.forEach(o => (o.items || []).forEach(i => {
        const qty = Number(i.qty || 0);
        const unitCost = LC.costOf(i);
        const product = products.find(p => String(p.id) === String(i.id));
        todayCost += qty * (unitCost || LC.costOf(product));
    }));
    const todayProfit = Math.max(0, todayRevenue - todayCost);

    const values = {
        todaySales: LC.money(todayRevenue),
        todayRevenue: LC.money(todayRevenue),
        todayProfit: LC.money(todayProfit),
        bestQualityCount: products.filter(p => !!p.best_quality).length,
        totalOrders: orders.length,
        lowStock: products.filter(LC.isLowStock).length,
        totalProducts: products.length,
        totalCustomers: customers.length
    };

    Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    const badge = document.getElementById('orderBadge');
    if (badge) badge.textContent = orders.filter(o => o.status === 'pending').length || orders.length;
};
window.updateStats = updateStats;

// ------------------------------------------------------------
// Safer navigation with role-aware visibility.
// ------------------------------------------------------------
const originalNavigateTo = navigateTo;
navigateTo = function(section) {
    const role = currentUser?.role_name || 'Cashier';
    const allowed = LC.roles[role] || LC.roles.Cashier;
    if (!allowed.includes(section)) {
        showToast(`Access denied for ${role}.`, 'error');
        return;
    }
    originalNavigateTo(section);
    document.querySelectorAll('.sidebar-menu li[data-section]').forEach(item => {
        const target = item.dataset.section;
        item.style.display = allowed.includes(target) ? '' : 'none';
    });
};
window.navigateTo = navigateTo;

// ------------------------------------------------------------
// Session/login screen cleanup.
// ------------------------------------------------------------
showLogin = function() {
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboardScreen) dashboardScreen.style.display = 'none';
    const alertEl = document.getElementById('loginAlert');
    if (alertEl) alertEl.textContent = '';
    pinValue = '';
    const pinInput = document.getElementById('pinInput');
    if (pinInput) pinInput.value = '';
    if (typeof renderDots === 'function') renderDots();
};
window.showLogin = showLogin;

// ------------------------------------------------------------
// Product save: supports optional fashion fields when present,
// while falling back safely if the existing DB schema is older.
// ------------------------------------------------------------
openProductModal = function(product = null) {
    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value ?? '';
    };
    const check = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    };

    set('editProductId', product?.id || '');
    set('productName', product?.name || '');
    set('productCode', product?.code || '');
    set('productCategory', product?.category || '');
    set('productGender', product?.gender || 'unisex');
    set('productPrice', product?.price ?? '');
    set('productStock', product?.stock ?? '');
    set('productCostPrice', product?.cost_price ?? product?.cost ?? '');
    set('productSize', product?.size ?? product?.variant ?? '');
    set('productColour', product?.colour ?? product?.color ?? '');
    set('productReorderLevel', product?.reorder_level ?? product?.minimum_stock ?? 5);
    set('productSupplier', product?.supplier ?? '');
    set('productImageUrl', product?.image_url ?? '');
    check('productBestQuality', product?.best_quality);

    const title = document.getElementById('productModalTitle');
    const saveBtn = document.getElementById('saveProductBtn');
    if (title) title.textContent = product ? '✏️ Edit Product' : '📦 Add Product';
    if (saveBtn) saveBtn.innerHTML = product ? '<i class="fas fa-save"></i> Update Product' : '<i class="fas fa-save"></i> Save Product';

    const preview = document.getElementById('imagePreview');
    if (preview) preview.innerHTML = product?.image_url
        ? `<img src="${LC.escape(product.image_url)}" alt="Product image" style="max-width:100%;max-height:180px;object-fit:contain;border-radius:12px;">`
        : '';

    openModal('productModal');
};
window.openProductModal = openProductModal;

saveProduct = async function(e) {
    e.preventDefault();
    if (!LC.permissionToast('manageProducts')) return;

    const get = id => document.getElementById(id);
    const name = get('productName')?.value.trim();
    const code = get('productCode')?.value.trim();
    const category = get('productCategory')?.value;
    const gender = get('productGender')?.value || 'unisex';
    const price = Number(get('productPrice')?.value);
    const stock = Number(get('productStock')?.value);
    const editId = get('editProductId')?.value;
    const best_quality = !!get('productBestQuality')?.checked;

    if (!name || !code || !category || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
        showToast('Enter a valid product name, code, selling price and non-negative whole-number stock.', 'error');
        return;
    }

    const optional = {
        cost_price: Number(get('productCostPrice')?.value || 0),
        size: get('productSize')?.value.trim() || null,
        colour: get('productColour')?.value.trim() || null,
        reorder_level: Number(get('productReorderLevel')?.value || 5),
        supplier: get('productSupplier')?.value.trim() || null,
        image_url: get('productImageUrl')?.value.trim() || null
    };

    const fullData = { name, code, category, gender, price, stock, best_quality, ...optional };
    const baseData = { name, code, category, gender, price, stock, best_quality };

    try {
        let error;
        if (editId) {
            ({ error } = await sb.from('products').update(fullData).eq('id', Number(editId)));
            if (error) {
                ({ error } = await sb.from('products').update(baseData).eq('id', Number(editId)));
            }
            if (error) throw error;
            await LC.audit('PRODUCT_UPDATED', { id: Number(editId), name, code });
            showToast('Product updated successfully.', 'success');
        } else {
            ({ error } = await sb.from('products').insert([fullData]));
            if (error) {
                ({ error } = await sb.from('products').insert([baseData]));
            }
            if (error) throw error;
            await LC.audit('PRODUCT_CREATED', { name, code });
            showToast('Product added successfully.', 'success');
        }
        await loadProducts();
        updateStats();
        renderCurrentTab();
        closeModal('productModal');
    } catch (err) {
        console.error('Product save error:', err);
        showToast(`Could not save product: ${err.message || 'Unknown error'}`, 'error');
    }
};
window.saveProduct = saveProduct;

// ------------------------------------------------------------
// Product deletion guard + audit.
// ------------------------------------------------------------
deleteProduct = async function(id) {
    if (!LC.permissionToast('manageProducts')) return;
    const product = products.find(p => String(p.id) === String(id));
    if (!product) return;
    if (!confirm(`Delete “${product.name}”? This should only be done when the item has no historical dependency.`)) return;

    try {
        const { error } = await sb.from('products').delete().eq('id', id);
        if (error) throw error;
        await LC.audit('PRODUCT_DELETED', { id, name: product.name, code: product.code });
        showToast('Product deleted.', 'success');
        await loadProducts();
        updateStats();
        renderCurrentTab();
    } catch (err) {
        showToast(`Could not delete product: ${err.message || 'Unknown error'}`, 'error');
    }
};
window.deleteProduct = deleteProduct;

// ------------------------------------------------------------
// Safer checkout. Validates stock, records cost snapshots and
// uses conditional stock updates to reduce race conditions.
// ------------------------------------------------------------
completeOrder = async function() {
    if (isSubmitting || !cart.length) return;
    isSubmitting = true;

    try {
        const name = document.getElementById('checkoutName')?.value.trim() || 'Walk-in Customer';
        const phone = document.getElementById('checkoutPhone')?.value.trim() || 'N/A';
        const mpesaCode = document.getElementById('mpesaCode')?.value.trim() || '';
        const cashPaid = Number(document.getElementById('cashPaid')?.value || 0);
        const total = cart.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 0), 0);

        if (!total || total <= 0) throw new Error('Cart total must be greater than zero.');

        if (selectedPayment === 'mpesa' && !mpesaCode) throw new Error('Please enter the M-Pesa transaction code.');
        if (selectedPayment === 'cash' && cashPaid < total) throw new Error(`Insufficient cash. Balance: ${LC.money(total - cashPaid)}`);

        for (const item of cart) {
            const product = products.find(p => String(p.id) === String(item.id));
            if (!product) throw new Error(`Product ${item.name} is no longer available.`);
            if (Number(product.stock || 0) < Number(item.qty || 0)) {
                throw new Error(`Insufficient stock for ${item.name}. Available: ${product.stock}.`);
            }
        }

        const paymentDetails = selectedPayment === 'mpesa' ? `M-Pesa: ${mpesaCode}` : selectedPayment;
        const orderNumber = 'POS-' + Date.now().toString().slice(-8);
        const items = cart.map(i => {
            const product = products.find(p => String(p.id) === String(i.id));
            return {
                id: i.id,
                name: i.name,
                code: i.code,
                qty: Number(i.qty),
                price: Number(i.price),
                cost_price: LC.costOf(product || i),
                size: i.size || product?.size || product?.variant || null,
                colour: i.colour || i.color || product?.colour || product?.color || null
            };
        });

        const orderData = {
            order_number: orderNumber,
            customer_name: name,
            customer_phone: phone,
            customer_email: '',
            items,
            total: Number(total.toFixed(2)),
            payment_method: paymentDetails,
            status: 'completed',
            created_at: new Date().toISOString()
        };

        const { data: inserted, error: orderError } = await sb.from('orders').insert([orderData]).select().maybeSingle();
        if (orderError) throw orderError;

        const changed = [];
        try {
            for (const item of cart) {
                const product = products.find(p => String(p.id) === String(item.id));
                const oldStock = Number(product.stock || 0);
                const newStock = oldStock - Number(item.qty || 0);

                const { data: updatedRows, error: stockError } = await sb
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', item.id)
                    .eq('stock', oldStock)
                    .select('id, stock');

                if (stockError) throw stockError;
                if (!updatedRows || updatedRows.length !== 1) {
                    throw new Error(`Stock changed while processing ${item.name}. Please retry.`);
                }
                changed.push({ id: item.id, oldStock, newStock });
            }
        } catch (stockError) {
            for (const c of changed.reverse()) {
                await sb.from('products').update({ stock: c.oldStock }).eq('id', c.id).eq('stock', c.newStock);
            }
            if (inserted?.id) await sb.from('orders').delete().eq('id', inserted.id);
            throw stockError;
        }

        await LC.audit('SALE_COMPLETED', {
            order_number: orderNumber,
            total,
            payment_method: selectedPayment,
            customer: name,
            items: items.map(i => ({id:i.id, qty:i.qty, total:i.price*i.qty}))
        });

        if (selectedPayment === 'cash') {
            const change = cashPaid - total;
            showToast(`Sale completed. Change: ${LC.money(change)}`, 'success');
        } else {
            showToast(`Sale ${orderNumber} completed successfully.`, 'success');
        }

        generateReceipt(orderData);
        cart = [];
        updateCartUI();
        closeModal('checkoutModal');
        await Promise.all([loadProducts(), loadOrders(), loadCustomers()]);
        updateStats();
        renderCurrentTab();
    } catch (err) {
        console.error('Checkout error:', err);
        showToast(err.message || 'Could not complete the sale.', 'error');
    } finally {
        isSubmitting = false;
    }
};
window.completeOrder = completeOrder;

// ------------------------------------------------------------
// Profit/Loss: use recorded cost snapshots where available.
// Falls back to current product cost; never silently labels the
// result as exact when no cost data exists.
// ------------------------------------------------------------
refreshProfitData = function() {
    const completedOrders = orders.filter(o => o.status === 'completed');
    let totalRevenue = 0;
    let totalCost = 0;
    let costCoverage = 0;

    completedOrders.forEach(order => {
        totalRevenue += Number(order.total || 0);
        (order.items || []).forEach(item => {
            const qty = Number(item.qty || 0);
            const cost = LC.costOf(item) || LC.costOf(products.find(p => String(p.id) === String(item.id)));
            if (cost > 0) costCoverage += qty;
            totalCost += qty * cost;
        });
    });

    const netProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    set('totalRevenue', LC.money(totalRevenue));
    set('totalCost', LC.money(totalCost));
    set('netProfit', LC.money(netProfit));
    set('profitMargin', `${margin.toFixed(1)}%`);

    const coverage = document.getElementById('costCoverage');
    if (coverage) coverage.textContent = costCoverage ? 'Cost data available' : 'Add product cost prices for exact profit';

    renderProfitChart(totalRevenue, totalCost, Math.max(0, netProfit));
};
window.refreshProfitData = refreshProfitData;

// ------------------------------------------------------------
// Inventory: configurable reorder levels + audit-safe adjustment.
// ------------------------------------------------------------
adjustStock = async function(e) {
    e.preventDefault();
    if (!LC.permissionToast('adjustStock')) return;

    const productId = document.getElementById('stockProduct')?.value;
    const type = document.getElementById('adjustmentType')?.value;
    const qty = Number(document.getElementById('adjustmentQty')?.value);
    const reason = document.getElementById('adjustmentReason')?.value.trim() || 'Manual adjustment';
    const product = products.find(p => String(p.id) === String(productId));

    if (!product || !Number.isInteger(qty) || qty <= 0) {
        showToast('Select a product and enter a positive whole-number quantity.', 'error');
        return;
    }

    const oldStock = Number(product.stock || 0);
    const newStock = type === 'remove' ? oldStock - qty : oldStock + qty;
    if (newStock < 0) {
        showToast(`Cannot remove ${qty}. Only ${oldStock} units are available.`, 'error');
        return;
    }

    try {
        const { data, error } = await sb.from('products')
            .update({ stock: newStock })
            .eq('id', product.id)
            .eq('stock', oldStock)
            .select('id, stock');
        if (error) throw error;
        if (!data || data.length !== 1) throw new Error('Stock changed before the adjustment was saved. Please retry.');

        await LC.audit('STOCK_ADJUSTED', {
            product_id: product.id,
            product: product.name,
            type,
            quantity: qty,
            old_stock: oldStock,
            new_stock: newStock,
            reason
        });

        showToast(`Stock updated: ${product.name} → ${newStock}`, 'success');
        closeModal('stockModal');
        await loadProducts();
        updateStats();
        renderCurrentTab();
    } catch (err) {
        showToast(`Could not adjust stock: ${err.message || 'Unknown error'}`, 'error');
    }
};
window.adjustStock = adjustStock;

// ------------------------------------------------------------
// Order status changes with permission and audit.
// ------------------------------------------------------------
const _updateOrderStatus = updateOrderStatus;
updateOrderStatus = async function(id, status) {
    if (status === 'cancelled' && !LC.permissionToast('cancelOrders')) return;
    try {
        const order = orders.find(o => String(o.id) === String(id));
        const previous = order?.status;
        await _updateOrderStatus(id, status);
        await LC.audit('ORDER_STATUS_CHANGED', {
            order_id: id,
            order_number: order?.order_number,
            from: previous,
            to: status
        });
    } catch (err) {
        console.error(err);
    }
};
window.updateOrderStatus = updateOrderStatus;

// ------------------------------------------------------------
// Better inventory rendering override when the improved HTML has
// the optional KPI elements.
// ------------------------------------------------------------
renderInventory = function() {
    const stockProduct = document.getElementById('stockProduct');
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p =>
            `<option value="${LC.escape(p.id)}">${LC.escape(p.name)} (${LC.number(p.stock)} in stock)</option>`
        ).join('');
    }

    const low = products.filter(LC.isLowStock);
    const inventoryValue = products.reduce((sum, p) => sum + LC.costOf(p) * Number(p.stock || 0), 0);
    const set = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=value; };
    set('inventoryUnits', LC.number(products.reduce((s,p)=>s+Number(p.stock||0),0)));
    set('inventoryLowStock', LC.number(low.length));
    set('inventoryValue', LC.money(inventoryValue));

    const table = document.getElementById('inventoryTable');
    if (!table) return;
    if (!products.length) {
        table.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products in inventory.</p></div>';
        return;
    }
    table.innerHTML = `<div class="table-wrapper"><table class="data-table"><thead><tr>
        <th>Product</th><th>SKU</th><th>Stock</th><th>Reorder Level</th><th>Status</th><th>Value</th>
    </tr></thead><tbody>${products.map(p => {
        const status = LC.isLowStock(p);
        return `<tr>
            <td><strong>${LC.escape(p.name)}</strong></td>
            <td>${LC.escape(p.code || 'N/A')}</td>
            <td>${LC.number(p.stock)}</td>
            <td>${LC.number(LC.reorderLevel(p))}</td>
            <td>${status ? '<span class="badge danger">⚠️ Reorder</span>' : '<span class="badge success">✓ Healthy</span>'}</td>
            <td>${LC.money(LC.costOf(p) * Number(p.stock || 0))}</td>
        </tr>`;
    }).join('')}</tbody></table></div>`;

    const list = document.getElementById('categoryStockList');
    if (list) {
        const categoryStock = {};
        products.forEach(p => categoryStock[p.category || 'uncategorized'] = (categoryStock[p.category || 'uncategorized'] || 0) + Number(p.stock || 0));
        list.innerHTML = Object.entries(categoryStock).sort((a,b)=>b[1]-a[1]).map(([cat,stock]) =>
            `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span>${LC.escape(cat)}</span><strong>${LC.number(stock)}</strong></div>`
        ).join('') || '<div class="empty-state"><p>No categories.</p></div>';
    }
};
window.renderInventory = renderInventory;

// ------------------------------------------------------------
// Audit trail: database first, local fallback.
// ------------------------------------------------------------
loadAuditLogs = async function() {
    const table = document.getElementById('auditTable');
    if (!table) return;
    let logs = [];
    try {
        const { data, error } = await sb.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (!error && data) logs = data;
    } catch (_) {}
    if (!logs.length) {
        try { logs = JSON.parse(localStorage.getItem('luciecloset_audit') || '[]'); } catch (_) { logs = []; }
    }
    if (!logs.length) {
        table.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No audit logs found.</p></div>';
        return;
    }
    table.innerHTML = `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>
        ${logs.map(log => `<tr><td>${new Date(log.timestamp || log.created_at).toLocaleString('en-KE')}</td><td>${LC.escape(log.user || log.user_name || 'System')}</td><td><span class="badge primary">${LC.escape(log.action || 'EVENT')}</span></td><td>${LC.escape(log.details || '-')}</td></tr>`).join('')}
    </tbody></table></div>`;
};
window.loadAuditLogs = loadAuditLogs;

// ------------------------------------------------------------
// Real CSV export; PDF/print gets a professional print view.
// ------------------------------------------------------------
exportReport = function(format) {
    const start = document.getElementById('reportStart')?.value;
    const end = document.getElementById('reportEnd')?.value;
    if (!start || !end) {
        showToast('Generate a report date range first.', 'warning');
        return;
    }

    const filtered = orders.filter(o => {
        const d = new Date(o.created_at);
        const s = new Date(start + 'T00:00:00');
        const e = new Date(end + 'T23:59:59');
        return d >= s && d <= e && o.status === 'completed';
    });

    if (format === 'csv' || format === 'excel') {
        const rows = [['Order Number','Date','Customer','Phone','Payment','Total']];
        filtered.forEach(o => rows.push([o.order_number, new Date(o.created_at).toLocaleString('en-KE'), o.customer_name || 'Guest', o.customer_phone || '', o.payment_method || '', Number(o.total || 0).toFixed(2)]));
        const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lucie-closet-sales-${start}-to-${end}.csv`;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        showToast('Report exported as CSV.', 'success');
        return;
    }

    const print = window.open('', '_blank', 'width=1000,height=800');
    if (!print) { showToast('Please allow pop-ups to print the report.', 'warning'); return; }
    const total = filtered.reduce((s,o)=>s+Number(o.total||0),0);
    print.document.write(`<html><head><title>Lucie Closet Sales Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h1{margin-bottom:4px}.muted{color:#666}.summary{margin:20px 0;padding:16px;border:1px solid #ddd;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Lucie Closet</h1><div class="muted">Sales Report · ${start} to ${end}</div><div class="summary"><strong>Total Sales:</strong> KES ${total.toLocaleString('en-KE',{minimumFractionDigits:2})} &nbsp; <strong>Orders:</strong> ${filtered.length}</div><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Total</th></tr></thead><tbody>${filtered.map(o=>`<tr><td>${LC.escape(o.order_number)}</td><td>${new Date(o.created_at).toLocaleString('en-KE')}</td><td>${LC.escape(o.customer_name||'Guest')}</td><td>${LC.escape(o.payment_method||'')}</td><td>KES ${Number(o.total||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td></tr>`).join('')}</tbody></table></body></html>`);
    print.document.close();
    print.focus();
    setTimeout(()=>print.print(),300);
};
window.exportReport = exportReport;

// ------------------------------------------------------------
// Close modal when clicking outside; preserve existing API.
// ------------------------------------------------------------
document.addEventListener('click', function(e) {
    if (e.target.classList?.contains('modal-overlay')) e.target.classList.remove('active');
});

// ------------------------------------------------------------
// Final initialization refresh.
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        try {
            updateStats();
            if (currentUser) navigateTo(currentTab || 'dashboard');
        } catch (e) {
            console.warn('Final Lucie Closet initialization warning:', e);
        }
    }, 250);
});

/* ============================================================
   LUCIE CLOSET COMPLETE BUSINESS MODULES
   Suppliers • Purchases • Returns • Expenses • Shifts
   Loyalty • Users/Roles • Barcode • Advanced Product Fields
   ============================================================ */
(function () {
    'use strict';

    const LCX = window.LC || {};
    window.LCX = LCX;

    const db = window.sb;
    const safe = (id) => document.getElementById(id);
    const val = (id) => safe(id)?.value?.trim() || '';
    const num = (id) => Number(val(id) || 0);
    const esc = (v) => (LCX.escape ? LCX.escape(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])));
    const money = (v) => LCX.money ? LCX.money(v) : `KES ${Number(v || 0).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

    function toast(msg, type='info') {
        if (typeof showToast === 'function') return showToast(msg, type);
        const c = safe('toastContainer'); if (!c) return;
        const el = document.createElement('div'); el.className = `toast ${type}`; el.innerHTML = `<i class="fas fa-info-circle"></i>${esc(msg)}`; c.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }

    async function insert(table, row) {
        if (!db) throw new Error('Supabase is not initialized.');
        const { data, error } = await db.from(table).insert(row).select().single();
        if (error) throw error;
        return data;
    }
    async function select(table, options={}) {
        if (!db) return [];
        let q = db.from(table).select(options.columns || '*');
        if (options.order) q = q.order(options.order, {ascending: options.ascending !== false});
        if (options.limit) q = q.limit(options.limit);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }
    async function update(table, values, filters) {
        let q = db.from(table).update(values);
        Object.entries(filters || {}).forEach(([k,v]) => q = q.eq(k,v));
        const { data, error } = await q.select();
        if (error) throw error;
        return data || [];
    }

    async function audit(action, details={}) {
        try {
            if (typeof LCX.audit === 'function') await LCX.audit(action, details);
        } catch (_) {}
    }

    // ---------- Navigation ----------
    const moduleMeta = {
        suppliers: ['🚚 Suppliers', 'Manage suppliers and supplier contacts'],
        purchases: ['🛍️ Purchases', 'Receive stock and manage supplier purchases'],
        returns: ['↩️ Returns & Refunds', 'Process customer returns and refunds'],
        expenses: ['🧾 Expenses', 'Track operating expenses'],
        shifts: ['💵 Cashier Shifts', 'Open, monitor and close till shifts'],
        loyalty: ['🎁 Loyalty', 'Manage customer rewards and loyalty settings'],
        users: ['👥 Users & Roles', 'Manage staff access and responsibilities']
    };

    function showModuleSection(section) {
        const el = safe(section + 'Section');
        if (!el) return;
        document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        const meta = moduleMeta[section];
        if (meta) {
            if (safe('pageTitle')) safe('pageTitle').textContent = meta[0];
            if (safe('pageSubtitle')) safe('pageSubtitle').textContent = meta[1];
        }
        document.querySelectorAll('.sidebar-menu li[data-section]').forEach(li => li.classList.toggle('active', li.dataset.section === section));
    }

    window.navigateTo = (function(original) {
        return function(section) {
            if (moduleMeta[section]) {
                showModuleSection(section);
                if (section === 'suppliers') loadSuppliers();
                if (section === 'purchases') loadPurchases();
                if (section === 'returns') loadReturns();
                if (section === 'expenses') loadExpenses();
                if (section === 'shifts') loadShifts();
                if (section === 'loyalty') loadLoyalty();
                if (section === 'users') loadUsers();
                return;
            }
            return original ? original(section) : undefined;
        };
    })(window.navigateTo);

    // ---------- Suppliers ----------
    window.openSupplierModal = function () {
        safe('supplierForm')?.reset();
        safe('supplierModal')?.classList.add('active');
    };
    window.saveSupplier = async function(e) {
        e.preventDefault();
        const name = val('supplierName');
        if (!name) return toast('Supplier name is required.', 'error');
        try {
            await insert('suppliers', { name, phone: val('supplierPhone'), email: val('supplierEmail'), address: val('supplierAddress'), status: 'active' });
            closeModal('supplierModal');
            toast('Supplier saved successfully.', 'success');
            await audit('supplier_created', {name});
            loadSuppliers();
        } catch (err) { toast(`Could not save supplier: ${err.message}`, 'error'); }
    };
    window.loadSuppliers = async function() {
        const box = safe('suppliersTable'); if (!box) return;
        try {
            const rows = await select('suppliers', {order:'created_at', ascending:false});
            box.innerHTML = rows.length ? `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Supplier</th><th>Phone</th><th>Email</th><th>Address</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td><strong>${esc(r.name)}</strong></td><td>${esc(r.phone||'')}</td><td>${esc(r.email||'')}</td><td>${esc(r.address||'')}</td><td><span class="badge success">Active</span></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><i class="fas fa-truck"></i><h4>No suppliers</h4><p>Add your first supplier.</p></div>`;
            populateSelect('purchaseSupplier', rows, 'id', 'name');
        } catch (err) { box.innerHTML = `<div class="empty-state"><p>Unable to load suppliers.</p></div>`; console.warn(err); }
    };

    // ---------- Purchases ----------
    window.openPurchaseModal = async function() {
        safe('purchaseForm')?.reset();
        await loadSuppliers();
        populateSelect('purchaseProduct', window.products || [], 'id', 'name');
        safe('purchaseModal')?.classList.add('active');
    };
    window.savePurchase = async function(e) {
        e.preventDefault();
        const supplierId = val('purchaseSupplier'), productId = val('purchaseProduct');
        const qty = num('purchaseQty'), unitCost = num('purchaseUnitCost');
        if (!supplierId || !productId || qty <= 0 || unitCost < 0) return toast('Complete all purchase details.', 'error');
        try {
            const p = (window.products || []).find(x => String(x.id) === String(productId));
            const oldStock = Number(p?.stock || 0), newStock = oldStock + qty;
            await insert('purchases', { supplier_id: supplierId, product_id: productId, reference: val('purchaseReference'), quantity: qty, unit_cost: unitCost, total_cost: qty * unitCost, payment_status: val('purchasePaymentStatus') || 'paid', created_by: window.currentUser?.id || null });
            if (db) {
                const { error } = await db.from('products').update({stock:newStock, cost_price:unitCost}).eq('id', productId).eq('stock', oldStock);
                if (error) throw error;
            }
            closeModal('purchaseModal'); toast('Stock received successfully.', 'success');
            await audit('purchase_received', {productId, quantity:qty, unitCost});
            if (typeof loadProducts === 'function') await loadProducts();
            loadPurchases();
        } catch (err) { toast(`Purchase failed: ${err.message}`, 'error'); }
    };
    window.loadPurchases = async function() {
        const box = safe('purchasesTable'); if (!box) return;
        try {
            const rows = await select('purchases', {order:'created_at', ascending:false, limit:200});
            box.innerHTML = rows.length ? `<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Reference</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td>${new Date(r.created_at).toLocaleString()}</td><td>${esc(r.reference||'')}</td><td>${esc(r.product_id||'')}</td><td>${Number(r.quantity||0)}</td><td>${money(r.unit_cost)}</td><td>${money(r.total_cost)}</td><td><span class="badge ${r.payment_status==='paid'?'success':'warning'}">${esc(r.payment_status||'pending')}</span></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><i class="fas fa-shopping-basket"></i><h4>No purchases</h4><p>Received stock will appear here.</p></div>`;
        } catch (err) { box.innerHTML = `<div class="empty-state"><p>Unable to load purchases.</p></div>`; }
    };

    // ---------- Returns ----------
    window.openReturnModal = async function() {
        safe('returnForm')?.reset();
        populateSelect('returnProduct', window.products || [], 'id', 'name');
        safe('returnModal')?.classList.add('active');
    };
    window.saveReturn = async function(e) {
        e.preventDefault();
        const orderNo=val('returnOrderNo'), productId=val('returnProduct'), qty=num('returnQty');
        if (!orderNo || !productId || qty<=0) return toast('Complete return details.', 'error');
        try {
            const product=(window.products||[]).find(x=>String(x.id)===String(productId));
            if (!product) throw new Error('Product not found.');
            await insert('returns', {order_no:orderNo, product_id:productId, quantity:qty, reason:val('returnReason'), refund_method:val('refundMethod'), amount:Number(product.price||0)*qty, created_by:window.currentUser?.id||null});
            const oldStock=Number(product.stock||0);
            if (db) {
                const {error}=await db.from('products').update({stock:oldStock+qty}).eq('id',productId).eq('stock',oldStock);
                if(error) throw error;
            }
            closeModal('returnModal'); toast('Return processed and stock restored.', 'success'); await audit('return_processed',{orderNo,productId,qty});
            if(typeof loadProducts==='function') await loadProducts(); loadReturns();
        } catch(err){ toast(`Return failed: ${err.message}`,'error'); }
    };
    window.loadReturns = async function(){
        const box=safe('returnsTable'); if(!box)return;
        try{
            const rows=await select('returns',{order:'created_at',ascending:false,limit:200});
            box.innerHTML=rows.length?`<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Order</th><th>Product</th><th>Qty</th><th>Reason</th><th>Refund</th><th>Amount</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${new Date(r.created_at).toLocaleString()}</td><td>${esc(r.order_no||'')}</td><td>${esc(r.product_id||'')}</td><td>${Number(r.quantity||0)}</td><td>${esc(r.reason||'')}</td><td>${esc(r.refund_method||'')}</td><td>${money(r.amount)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><i class="fas fa-undo"></i><h4>No returns</h4><p>Processed returns will appear here.</p></div>`;
        }catch(err){box.innerHTML='<div class="empty-state"><p>Unable to load returns.</p></div>';}
    };

    // ---------- Expenses ----------
    window.openExpenseModal=function(){safe('expenseForm')?.reset();safe('expenseModal')?.classList.add('active');};
    window.saveExpense=async function(e){
        e.preventDefault(); const amount=num('expenseAmount'); if(amount<=0)return toast('Enter a valid expense amount.','error');
        try{await insert('expenses',{category:val('expenseCategory'),amount,description:val('expenseDescription'),created_by:window.currentUser?.id||null});closeModal('expenseModal');toast('Expense saved.','success');await audit('expense_created',{amount,category:val('expenseCategory')});loadExpenses();}
        catch(err){toast(`Could not save expense: ${err.message}`,'error');}
    };
    window.loadExpenses=async function(){
        const box=safe('expensesTable');if(!box)return;
        try{const rows=await select('expenses',{order:'created_at',ascending:false,limit:200});box.innerHTML=rows.length?`<div class="table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${new Date(r.created_at).toLocaleString()}</td><td>${esc(r.category||'')}</td><td>${esc(r.description||'')}</td><td><strong>${money(r.amount)}</strong></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><i class="fas fa-receipt"></i><h4>No expenses</h4><p>Business expenses will appear here.</p></div>`;}catch(err){box.innerHTML='<div class="empty-state"><p>Unable to load expenses.</p></div>';}
    };

    // ---------- Shifts ----------
    window.openShiftModal=function(action){safe('shiftForm')?.reset();safe('shiftAction').value=action;safe('shiftModalTitle').textContent=action==='open'?'💵 Open Cashier Shift':'🔒 Close Cashier Shift';safe('openShiftFields').classList.toggle('hidden',action!=='open');safe('closeShiftFields').classList.toggle('hidden',action!=='close');safe('shiftModal').classList.add('active');};
    window.saveShift=async function(e){
        e.preventDefault();const action=val('shiftAction');
        try{
            if(action==='open'){const opening=num('shiftOpeningCash');if(opening<0)return toast('Opening cash cannot be negative.','error');await insert('cashier_shifts',{cashier_id:window.currentUser?.id||null,opened_at:new Date().toISOString(),opening_cash:opening,status:'open'});}
            else {const closing=num('shiftClosingCash');if(closing<0)return toast('Closing cash cannot be negative.','error');const rows=await select('cashier_shifts',{order:'opened_at',ascending:false,limit:1});const current=rows[0];if(!current)throw new Error('No open shift found.');await update('cashier_shifts',{closed_at:new Date().toISOString(),closing_cash:closing,status:'closed',notes:val('shiftNotes')},{id:current.id});}
            closeModal('shiftModal');toast(action==='open'?'Shift opened.':'Shift closed.','success');await audit(`shift_${action}`,{});loadShifts();
        }catch(err){toast(`Shift operation failed: ${err.message}`,'error');}
    };
    window.loadShifts=async function(){
        const box=safe('shiftsTable');if(!box)return;
        try{const rows=await select('cashier_shifts',{order:'opened_at',ascending:false,limit:100});box.innerHTML=rows.length?`<div class="table-wrapper"><table class="data-table"><thead><tr><th>Opened</th><th>Closed</th><th>Opening</th><th>Closing</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.opened_at?new Date(r.opened_at).toLocaleString():''}</td><td>${r.closed_at?new Date(r.closed_at).toLocaleString():'—'}</td><td>${money(r.opening_cash)}</td><td>${r.closing_cash==null?'—':money(r.closing_cash)}</td><td><span class="badge ${r.status==='open'?'warning':'success'}">${esc(r.status||'')}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><i class="fas fa-cash-register"></i><h4>No shifts</h4><p>Cashier shifts will appear here.</p></div>`;}catch(err){box.innerHTML='<div class="empty-state"><p>Unable to load shifts.</p></div>';}
    };

    // ---------- Loyalty ----------
    window.openLoyaltyModal=function(){safe('loyaltyModal')?.classList.add('active');};
    window.saveLoyalty=async function(e){
        e.preventDefault();const rate=num('loyaltyPointsRate'),red=num('loyaltyRedemption');if(rate<=0||red<0)return toast('Enter valid loyalty settings.','error');
        localStorage.setItem('lucie_loyalty_settings',JSON.stringify({rate,redemption:red}));closeModal('loyaltyModal');toast('Loyalty settings saved.','success');await audit('loyalty_settings_updated',{rate,redemption:red});loadLoyalty();
    };
    window.loadLoyalty=async function(){
        const box=safe('loyaltyTable');if(!box)return;
        const settings=JSON.parse(localStorage.getItem('lucie_loyalty_settings')||'{"rate":100,"redemption":1}');
        if(safe('loyaltyPointsRate'))safe('loyaltyPointsRate').value=settings.rate;if(safe('loyaltyRedemption'))safe('loyaltyRedemption').value=settings.redemption;
        try{const rows=await select('customers',{order:'name',ascending:true});box.innerHTML=rows.length?`<div class="table-wrapper"><table class="data-table"><thead><tr><th>Customer</th><th>Phone</th><th>Points</th><th>Tier</th></tr></thead><tbody>${rows.map(r=>{const pts=Number(r.loyalty_points||0);return `<tr><td>${esc(r.name||'')}</td><td>${esc(r.phone||'')}</td><td>${pts.toLocaleString()}</td><td><span class="badge gold">${pts>=5000?'VIP':pts>=1000?'Gold':'Member'}</span></td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty-state"><p>No loyalty members yet.</p></div>`;}catch(err){box.innerHTML='<div class="empty-state"><p>Unable to load loyalty members.</p></div>';}
    };

    // ---------- Users & Roles ----------
    window.openUserModal=function(){safe('userForm')?.reset();safe('userModal')?.classList.add('active');};
    window.saveUser=async function(e){
        e.preventDefault();const name=val('staffName'),role=val('staffRole');if(!name||!role)return toast('Name and role are required.','error');
        const pin=val('staffPin');if(pin&&!/^\d{4,6}$/.test(pin))return toast('PIN must contain 4 to 6 digits.','error');
        try{await insert('users',{name,email:val('staffEmail'),role,pin:pin||null,status:'active'});closeModal('userModal');toast('User created.','success');await audit('user_created',{name,role});loadUsers();}
        catch(err){toast(`Could not create user: ${err.message}`,'error');}
    };
    window.loadUsers=async function(){
        const box=safe('usersTable');if(!box)return;
        try{const rows=await select('users',{order:'name',ascending:true});box.innerHTML=rows.length?`<div class="table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.name||'')}</strong></td><td>${esc(r.email||'')}</td><td><span class="badge primary">${esc(r.role||'')}</span></td><td><span class="badge success">${esc(r.status||'active')}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><i class="fas fa-users"></i><h4>No staff users</h4><p>Add your first staff account.</p></div>`;}catch(err){box.innerHTML='<div class="empty-state"><p>Unable to load users.</p></div>';}
    };

    // ---------- Helpers ----------
    function populateSelect(id, rows, valueKey, labelKey) {
        const el=safe(id);if(!el)return;
        const current=el.value;
        el.innerHTML='<option value="">Select...</option>'+(rows||[]).map(r=>`<option value="${esc(r[valueKey])}">${esc(r[labelKey]||r.name||r.product_name||r[valueKey])}</option>`).join('');
        if(current)el.value=current;
    }

    // ---------- Product advanced fields ----------
    window.getAdvancedProductFields=function(){
        return {
            barcode:val('productBarcode'), size:val('productSize'), colour:val('productColour'), material:val('productMaterial'),
            description:val('productDescription'), supplier_id:val('productSupplier')||null, cost_price:num('productCostPrice'),
            reorder_level:num('productReorderLevel'), tax_rate:num('productTax')
        };
    };

    // ---------- Barcode scanner ----------
    let barcodeBuffer='', barcodeTimer=null;
    document.addEventListener('keydown',function(e){
        if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && document.activeElement?.id!=='posSearch') return;
        if(e.key==='Enter' && barcodeBuffer.length>=4){
            const code=barcodeBuffer;barcodeBuffer='';clearTimeout(barcodeTimer);
            const p=(window.products||[]).find(x=>String(x.barcode||x.code||'').toLowerCase()===code.toLowerCase());
            if(p && typeof addToCart==='function'){addToCart(p);toast(`${p.name} added to cart.`,'success');}
            else toast(`Barcode ${code} not found.`,'warning');return;
        }
        if(e.key.length===1){barcodeBuffer+=e.key;clearTimeout(barcodeTimer);barcodeTimer=setTimeout(()=>barcodeBuffer='',80);}
    });

    // ---------- Login UX ----------
    window.showLogin = function(){
        safe('loginScreen')?.classList.remove('hidden');
        safe('dashboardScreen')?.classList.add('hidden');
    };

    // ---------- Keyboard shortcuts ----------
    document.addEventListener('keydown',function(e){
        if(e.ctrlKey && e.key.toLowerCase()==='p'){e.preventDefault();window.navigateTo('pos');}
        if(e.ctrlKey && e.key.toLowerCase()==='k'){e.preventDefault();safe('posSearch')?.focus();}
        if(e.key==='Escape')document.querySelectorAll('.modal-overlay.active').forEach(m=>m.classList.remove('active'));
    });

    // ---------- Startup ----------
    document.addEventListener('DOMContentLoaded',function(){
        setTimeout(()=>{
            ['suppliers','purchases','returns','expenses','shifts','loyalty','users'].forEach(s=>{
                const section=safe(s+'Section');
                if(section && !section.classList.contains('section-page')) section.classList.add('section-page');
            });
            // Load module data quietly; missing tables are reported only in console.
            if(safe('suppliersTable')) loadSuppliers();
            if(safe('purchaseSupplier')) loadSuppliers();
        },500);
    });
})();
