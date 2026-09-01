// ============================================================
// LUCIE CLOSET · POS + ADMIN SYSTEM - COMPLETE FIXED
// ============================================================

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://tlsldwshtxofckvkixxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc2xkd3NodHhvZmNrdmtpeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTE1NTksImV4cCI6MjEwMzc4NzU1OX0.BAfgQG4Z28bgKSfL9Li7Gbgp62sTM-5NxB4qVQ-b0H4';

// ✅ Create Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
// ✅ LOAD DATA FUNCTIONS - MOVED TO TOP
// ============================================================

// Get default products
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

// LOAD PRODUCTS
async function loadProducts() {
    try {
        const { data, error } = await supabaseClient.from('products').select('*').order('id', { ascending: true });
        if (error) throw error;
        if (data && data.length) {
            products = data;
        } else {
            products = getDefaultProducts();
            for (const p of products) {
                await supabaseClient.from('products').insert([p]);
            }
        }
        localStorage.setItem('luciecloset_products', JSON.stringify(products));
    } catch (e) {
        console.warn('Supabase fallback → localStorage', e);
        const stored = localStorage.getItem('luciecloset_products');
        products = stored ? JSON.parse(stored) : getDefaultProducts();
    }
}

// LOAD ORDERS
async function loadOrders() {
    try {
        const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
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

// LOAD CUSTOMERS
async function loadCustomers() {
    try {
        const { data, error } = await supabaseClient.from('customers').select('*').order('name', { ascending: true });
        if (error) throw error;
        customers = data || [];
        localStorage.setItem('luciecloset_customers', JSON.stringify(customers));
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_customers');
        customers = stored ? JSON.parse(stored) : [];
    }
}

// ENSURE ADMIN USER EXISTS
async function ensureAdminUser() {
    try {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('id')
            .limit(1);
            
        if (error) throw error;
        
        if (!users || users.length === 0) {
            console.log('👤 No users found, creating admin...');
            const { error: insertError } = await supabaseClient
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
        }
    } catch (error) {
        console.warn('Could not ensure admin user:', error);
    }
}

// ✅ LOAD DATA - MAIN FUNCTION
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
// AUTH FUNCTIONS
// ============================================================
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
        if (supabaseClient.auth) {
            await supabaseClient.auth.signOut().catch(() => {});
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
    
    // ✅ Now loadData is defined
    loadData();
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

            const { data: user, error } = await supabaseClient
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
                const { data: roleData } = await supabaseClient
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
                await supabaseClient
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

            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email, password
            });

            if (authError) throw new Error(authError.message || 'Authentication failed.');

            const { data: userData, error: userError } = await supabaseClient
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
// ============================================================
// ALL OTHER FUNCTIONS (POS, ORDERS, PRODUCTS, INVENTORY, ETC.)
// ============================================================
// ============================================================

// [INSERT ALL YOUR EXISTING FUNCTIONS HERE]
// - renderPOSProducts()
// - addToCart()
// - removeFromCart()
// - updateQty()
// - updateCartUI()
// - clearCart()
// - openCheckout()
// - selectPayment()
// - calculateChange()
// - completeOrder()
// - generateReceipt()
// - printReceipt()
// - renderOrders()
// - viewOrder()
// - updateOrderStatus()
// - renderProductsTable()
// - openProductModal()
// - saveProduct()
// - editProduct()
// - deleteProduct()
// - renderInventory()
// - openStockModal()
// - adjustStock()
// - renderCustomersTable()
// - openCustomerModal()
// - saveCustomer()
// - deleteCustomer()
// - generateReport()
// - exportReport()
// - refreshProfitData()
// - renderProfitChart()
// - loadAuditLogs()
// - saveSettings()
// - savePaymentSettings()
// - openModal()
// - closeModal()
// - showToast()
// - refreshAll()

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
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================
window.navigateTo = navigateTo;
window.refreshAll = refreshAll;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.clearCart = clearCart;
window.openCheckout = openCheckout;
window.selectPayment = selectPayment;
window.calculateChange = calculateChange;
window.completeOrder = completeOrder;
window.printReceipt = printReceipt;
window.openProductModal = openProductModal;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openStockModal = openStockModal;
window.adjustStock = adjustStock;
window.openCustomerModal = openCustomerModal;
window.saveCustomer = saveCustomer;
window.deleteCustomer = deleteCustomer;
window.generateReport = generateReport;
window.exportReport = exportReport;
window.refreshProfitData = refreshProfitData;
window.loadAuditLogs = loadAuditLogs;
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.filterPOSProducts = filterPOSProducts;
window.switchCategory = switchCategory;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.handleLogin = handleLogin;
window.logout = logout;
window.pinPress = pinPress;
window.pinBackspace = pinBackspace;
window.submitPin = submitPin;
window.switchMethod = switchMethod;
window.saveSettings = saveSettings;
window.savePaymentSettings = savePaymentSettings;
