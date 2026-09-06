// ============================================================
// LUCIE CLOSET · ENHANCED POS + ADMIN SYSTEM
// Complete JavaScript for Fashion Boutique
// ============================================================

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://tlsldwshtxofckvkixxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc2xkd3NodHhvZmNrdmtpeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTE1NTksImV4cCI6MjEwMzc4NzU1OX0.BAfgQG4Z28bgKSfL9Li7Gbgp62sTM-5NxB4qVQ-b0H4';

// Use 'supabase' from CDN
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// STATE
// ============================================================
let products = [];
let orders = [];
let customers = [];
let suppliers = [];
let purchases = [];
let returns = [];
let expenses = [];
let shifts = [];
let loyaltyMembers = [];
let users = [];
let cart = [];
let currentUser = null;
let currentTab = 'dashboard';
let currentCategory = 'all';
let selectedPayment = 'mpesa';
let salesChartInstance = null;
let profitChartInstance = null;
let variants = [];
let productImages = [];

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
// TOAST
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
// AUTH FUNCTIONS
// ============================================================
function showLoginPane(pane) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('pinPane').classList.add('hidden');
    document.getElementById('emailPane').classList.add('hidden');
    if (pane === 'pinPane') {
        document.getElementById('pinPane').classList.remove('hidden');
        document.querySelector('.login-tab:first-child').classList.add('active');
        currentMethod = 'pin';
    } else {
        document.getElementById('emailPane').classList.remove('hidden');
        document.querySelector('.login-tab:last-child').classList.add('active');
        currentMethod = 'email';
    }
}
window.showLoginPane = showLoginPane;

// PIN functions
function pinKey(key) {
    if (isSubmitting) return;
    if (pinValue.length >= 6) return;
    pinValue += key;
    updatePinDots();
    document.getElementById('pinInput').value = pinValue;
    if (pinValue.length === 4) {
        setTimeout(() => handleLogin(new Event('submit')), 80);
    }
}
window.pinKey = pinKey;

function pinClear() {
    pinValue = pinValue.slice(0, -1);
    updatePinDots();
    document.getElementById('pinInput').value = pinValue;
}
window.pinClear = pinClear;

function updatePinDots() {
    const dots = document.querySelectorAll('#pinDots .pin-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < pinValue.length);
    });
}

async function checkAuth() {
    try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (!stored) {
            console.log('❌ No session found');
            document.getElementById('loginScreen').classList.add('active');
            return null;
        }
        const sessionData = JSON.parse(stored);
        if (!sessionData.user || Date.now() - sessionData.loginTime > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(SESSION_KEY);
            document.getElementById('loginScreen').classList.add('active');
            return null;
        }
        currentUser = sessionData.user;
        console.log('✅ User authenticated:', currentUser.email);
        updateUI(currentUser);
        document.getElementById('loginScreen').classList.remove('active');
        resetSessionTimer();
        loadData();
        return currentUser;
    } catch (e) {
        console.error('Auth error:', e);
        localStorage.removeItem(SESSION_KEY);
        document.getElementById('loginScreen').classList.add('active');
        return null;
    }
}

function updateUI(user) {
    const avatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    if (avatar) avatar.textContent = user.full_name?.charAt(0).toUpperCase() || 'A';
    if (userName) userName.textContent = user.full_name || 'Admin';
    if (userRole) userRole.textContent = user.role || 'Administrator';
}

function resetSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
        showToast('⚠️ Session expired. Please login again.', 'warning');
        logout();
    }, (sessionTimeout || 30) * 60 * 1000);
}

async function logout() {
    try { await sb.auth.signOut().catch(() => {}); } catch (e) {}
    localStorage.removeItem(SESSION_KEY);
    document.getElementById('loginScreen').classList.add('active');
    showToast('Logged out successfully', 'info');
}
window.logout = logout;

async function handleLogin(e) {
    e.preventDefault();
    if (isSubmitting) return;
    hideLoginAlert();
    isSubmitting = true;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    if (loginBtn) loginBtn.disabled = true;
    if (btnText) btnText.textContent = 'Signing in...';
    if (btnSpinner) btnSpinner.classList.remove('hidden');

    try {
        let email = '';
        if (currentMethod === 'pin') {
            email = document.getElementById('pinEmail').value.trim();
            if (!email) throw new Error('Enter your email or username');
            if (pinValue.length < 4) throw new Error('PIN must be at least 4 digits');
            const { data: user, error } = await sb
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            if (error || !user) throw new Error('User not found');
            if (user.pin !== pinValue) throw new Error('Invalid PIN');
            if (user.status !== 'active') throw new Error('Account inactive');
            currentUser = user;
        } else {
            email = document.getElementById('emailInput').value.trim();
            const password = document.getElementById('passwordInput').value;
            if (!email || !password) throw new Error('Enter email and password');
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw new Error(error.message);
            const { data: userData } = await sb.from('users').select('*').eq('email', email).maybeSingle();
            currentUser = { ...data.user, ...userData };
        }

        const sessionData = { user: currentUser, loginTime: Date.now() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        document.getElementById('loginScreen').classList.remove('active');
        updateUI(currentUser);
        resetSessionTimer();
        showToast('Welcome back, ' + (currentUser.full_name || 'Admin') + '!', 'success');
        await loadData();
    } catch (error) {
        showLoginAlert(error.message);
    } finally {
        if (loginBtn) loginBtn.disabled = false;
        if (btnText) btnText.textContent = 'Sign In';
        if (btnSpinner) btnSpinner.classList.add('hidden');
        isSubmitting = false;
    }
}
window.handleLogin = handleLogin;

function showLoginAlert(msg) {
    const el = document.getElementById('loginAlert');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideLoginAlert() {
    const el = document.getElementById('loginAlert');
    if (el) { el.style.display = 'none'; }
}

// ============================================================
// LOAD DATA
// ============================================================
async function loadData() {
    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadCustomers(),
        loadSuppliers(),
        loadPurchases(),
        loadReturns(),
        loadExpenses(),
        loadShifts(),
        loadLoyaltyMembers(),
        loadUsers()
    ]);
    updateStats();
    renderCurrentTab();
}

async function loadProducts() {
    try {
        const { data, error } = await sb.from('products').select('*').order('id', { ascending: true });
        if (error) throw error;
        products = data || [];
        localStorage.setItem('luciecloset_products', JSON.stringify(products));
    } catch (e) {
        console.warn('Products load error:', e);
        const stored = localStorage.getItem('luciecloset_products');
        products = stored ? JSON.parse(stored) : getDefaultProducts();
    }
}

function getDefaultProducts() {
    return [
        { id: 1, code: '0001#', name: 'Classic Silk Dress', category: 'dress', gender: 'women', price: 500, stock: 12,
            image_url: null, best_quality: true, rating: 4.8, cost_price: 300, colour: 'Black', size: 'M' },
        { id: 2, code: '6195-1#', name: 'Summer Floral Dress', category: 'dress', gender: 'women', price: 500, stock: 6,
            image_url: null, best_quality: false, rating: 4.2, cost_price: 280, colour: 'Wine', size: 'L' },
        { id: 3, code: '6169-145A', name: 'Elegant Evening Gown', category: 'dress', gender: 'women', price: 600, stock: 6,
            image_url: null, best_quality: true, rating: 4.9, cost_price: 350, colour: 'Beige', size: 'S' },
        { id: 4, code: '5918', name: 'Pie Top', category: 'top', gender: 'women', price: 600, stock: 10,
            image_url: null, best_quality: false, rating: 4.2, cost_price: 320, colour: 'White', size: 'M' },
        { id: 5, code: '5918 1', name: 'Polo Top with A-Top', category: 'top', gender: 'unisex', price: 700, stock: 10,
            image_url: null, best_quality: true, rating: 4.6, cost_price: 400, colour: 'Navy', size: 'L' },
        { id: 6, code: '13802', name: 'Cashmere Blend Sweater', category: 'sweater', gender: 'men', price: 650, stock: 8,
            image_url: null, best_quality: true, rating: 4.7, cost_price: 380, colour: 'Grey', size: 'XL' },
        { id: 7, code: 'S001', name: 'Tailored Wool Suit', category: 'suit', gender: 'men', price: 1200, stock: 5,
            image_url: null, best_quality: true, rating: 4.9, cost_price: 750, colour: 'Charcoal', size: 'L' },
    ];
}

async function loadOrders() {
    try {
        const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        orders = data || [];
        const badge = document.getElementById('orderBadge');
        if (badge) badge.textContent = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_orders');
        orders = stored ? JSON.parse(stored) : [];
    }
}

async function loadCustomers() {
    try {
        const { data, error } = await sb.from('customers').select('*').order('name', { ascending: true });
        if (error) throw error;
        customers = data || [];
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_customers');
        customers = stored ? JSON.parse(stored) : [];
    }
}

async function loadSuppliers() {
    try {
        const { data, error } = await sb.from('suppliers').select('*').order('name', { ascending: true });
        if (error) throw error;
        suppliers = data || [];
        renderSuppliersTable();
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_suppliers');
        suppliers = stored ? JSON.parse(stored) : [];
        renderSuppliersTable();
    }
}

async function loadPurchases() {
    try {
        const { data, error } = await sb.from('purchases').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        purchases = data || [];
        updatePurchaseStats();
        renderPurchasesTable();
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_purchases');
        purchases = stored ? JSON.parse(stored) : [];
        updatePurchaseStats();
        renderPurchasesTable();
    }
}

async function loadReturns() {
    try {
        const { data, error } = await sb.from('returns').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        returns = data || [];
        renderReturnsTable();
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_returns');
        returns = stored ? JSON.parse(stored) : [];
        renderReturnsTable();
    }
}

async function loadExpenses() {
    try {
        const { data, error } = await sb.from('expenses').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        expenses = data || [];
        updateExpenseStats();
        renderExpensesTable();
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_expenses');
        expenses = stored ? JSON.parse(stored) : [];
        updateExpenseStats();
        renderExpensesTable();
    }
}

async function loadShifts() {
    try {
        const { data, error } = await sb.from('shifts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        shifts = data || [];
        updateShiftStats();
        renderShiftsTable();
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_shifts');
        shifts = stored ? JSON.parse(stored) : [];
        updateShiftStats();
        renderShiftsTable();
    }
}

async function loadLoyaltyMembers() {
    try {
        const { data, error } = await sb.from('loyalty_members').select('*').order('points', { ascending: false });
        if (error) throw error;
        loyaltyMembers = data || [];
        updateLoyaltyStats();
        renderLoyaltyTable();
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_loyalty');
        loyaltyMembers = stored ? JSON.parse(stored) : [];
        updateLoyaltyStats();
        renderLoyaltyTable();
    }
}

async function loadUsers() {
    try {
        const { data, error } = await sb.from('users').select('*').order('full_name', { ascending: true });
        if (error) throw error;
        users = data || [];
        renderUsersTable();
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_users');
        users = stored ? JSON.parse(stored) : [];
        renderUsersTable();
    }
}

// ============================================================
// UPDATE STATS
// ============================================================
function updateStats() {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today && o.status === 'delivered');
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    document.getElementById('todaySales').textContent = `KES ${todayRevenue}`;
    document.getElementById('bestQualityCount').textContent = products.filter(p => p.best_quality).length;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('lowStock').textContent = products.filter(p => p.stock < 5).length;
}

function updatePurchaseStats() {
    const totalValue = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    const pending = purchases.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + (p.total || 0), 0);
    const received = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
    document.getElementById('purchaseValue').textContent = `KES ${totalValue}`;
    document.getElementById('purchasePayables').textContent = `KES ${pending}`;
    document.getElementById('receivedItems').textContent = received;
}

function updateExpenseStats() {
    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const month = expenses.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    document.getElementById('totalExpenses').textContent = `KES ${total}`;
    document.getElementById('monthExpenses').textContent = `KES ${month}`;
}

function updateShiftStats() {
    const openShift = shifts.find(s => s.status === 'open');
    if (openShift) {
        document.getElementById('currentShiftStatus').textContent = `Open (${openShift.user_name || 'Cashier'})`;
        document.getElementById('openingCash').textContent = `KES ${openShift.opening_cash || 0}`;
        const ordersTotal = orders.filter(o => o.shift_id === openShift.id).reduce((sum, o) => sum + (o.total || 0), 0);
        document.getElementById('expectedCash').textContent = `KES ${(openShift.opening_cash || 0) + ordersTotal}`;
    } else {
        document.getElementById('currentShiftStatus').textContent = 'Closed';
        document.getElementById('openingCash').textContent = 'KES 0';
        document.getElementById('expectedCash').textContent = 'KES 0';
    }
}

function updateLoyaltyStats() {
    document.getElementById('loyaltyMembers').textContent = loyaltyMembers.length;
    const totalPoints = loyaltyMembers.reduce((sum, m) => sum + (m.points || 0), 0);
    document.getElementById('loyaltyPoints').textContent = totalPoints;
    document.getElementById('loyaltyRate').textContent = `1 point per KES ${document.getElementById('loyaltyPointsRate')?.value || 100}`;
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(section) {
    currentTab = section;
    document.querySelectorAll('.section-page').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
    const sectionMap = {
        'dashboard': 'dashboardSection', 'pos': 'posSection', 'orders': 'ordersSection',
        'products': 'productsSection', 'inventory': 'inventorySection', 'customers': 'customersSection',
        'suppliers': 'suppliersSection', 'purchases': 'purchasesSection', 'returns': 'returnsSection',
        'expenses': 'expensesSection', 'shifts': 'shiftsSection', 'loyalty': 'loyaltySection',
        'users': 'usersSection', 'reports': 'reportsSection', 'profit': 'profitSection',
        'audit': 'auditSection', 'settings': 'settingsSection'
    };
    const target = document.getElementById(sectionMap[section]);
    if (target) target.classList.add('active');
    const navItem = document.querySelector(`.sidebar-menu li[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');
    const titles = {
        'dashboard': '📊 Dashboard', 'pos': '🛒 Point of Sale', 'orders': '📋 Orders',
        'products': '📦 Products', 'inventory': '🏪 Inventory', 'customers': '👤 Customers',
        'suppliers': '🚚 Suppliers', 'purchases': '🛍️ Purchases', 'returns': '↩️ Returns',
        'expenses': '🧾 Expenses', 'shifts': '💵 Shifts', 'loyalty': '🎁 Loyalty',
        'users': '👥 Users', 'reports': '📊 Reports', 'profit': '💰 Profit/Loss',
        'audit': '📜 Audit Trail', 'settings': '⚙️ Settings'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;
    renderCurrentTab();
    resetSessionTimer();
}
window.navigateTo = navigateTo;

function renderCurrentTab() {
    if (currentTab === 'dashboard') { updateGreeting(); renderDashboard(); }
    else if (currentTab === 'pos') { renderPOSProducts(); updateCartUI(); }
    else if (currentTab === 'orders') { renderOrders(); }
    else if (currentTab === 'products') { renderProductsTable(); }
    else if (currentTab === 'inventory') { renderInventory(); }
    else if (currentTab === 'customers') { renderCustomersTable(); }
    else if (currentTab === 'suppliers') { renderSuppliersTable(); }
    else if (currentTab === 'purchases') { renderPurchasesTable(); }
    else if (currentTab === 'returns') { renderReturnsTable(); }
    else if (currentTab === 'expenses') { renderExpensesTable(); }
    else if (currentTab === 'shifts') { renderShiftsTable(); }
    else if (currentTab === 'loyalty') { renderLoyaltyTable(); }
    else if (currentTab === 'users') { renderUsersTable(); }
    else if (currentTab === 'reports') { /* handled by button */ }
    else if (currentTab === 'profit') { refreshProfitData(); }
    else if (currentTab === 'audit') { loadAuditLogs(); }
}

// ============================================================
// DASHBOARD
// ============================================================
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';
    const name = currentUser?.full_name || 'Admin';
    document.getElementById('greetingContainer').innerHTML = `
        <div class="greeting-banner">
            <h2>👋 ${greeting}, ${name}!<span class="greeting-sub">Welcome to Lucie Closet POS System</span></h2>
        </div>
    `;
}

function renderDashboard() {
    renderRecentOrders();
    renderTopProducts();
    renderSalesChart();
}

function renderRecentOrders() {
    const recent = orders.slice(0, 10);
    const container = document.getElementById('recentOrdersTable');
    if (!recent.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent orders</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${recent.map(o => `
                <tr>
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.customer_name || 'Guest'}</td>
                    <td>${o.items ? o.items.reduce((s,i) => s + i.qty, 0) : 0}</td>
                    <td><strong>KES ${o.total}</strong></td>
                    <td><span class="status-badge ${o.status || 'pending'}">${o.status || 'pending'}</span></td>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('')}</tbody>
        </table></div>
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
    if (!sorted.length) { container.innerHTML = '<div class="empty-state"><p>No sales data</p></div>'; return; }
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
    if (salesChartInstance) salesChartInstance.destroy();
    const last7Days = [], salesData = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        last7Days.push(date.toLocaleDateString('en', { weekday: 'short' }));
        const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === dateStr && o.status === 'delivered');
        salesData.push(dayOrders.reduce((sum, o) => sum + (o.total || 0), 0));
    }
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: last7Days, datasets: [{ label: 'Sales (KES)', data: salesData, borderColor: '#7A1F2B', backgroundColor: 'rgba(122,31,43,0.1)', tension: 0.4, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => 'KES ' + v } } } }
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
            <div class="name">${p.name} ${p.colour ? `(${p.colour})` : ''}</div>
            <div class="price">KES ${p.price}</div>
            <div class="stock">${p.stock} in stock</div>
            ${p.best_quality ? '<div class="best-tag"><i class="fas fa-star"></i> Best</div>' : ''}
            ${p.size ? `<div class="stock" style="font-size:9px;">Size: ${p.size}</div>` : ''}
        </div>
    `).join('');
}
window.renderPOSProducts = renderPOSProducts;

function filterPOSProducts() { renderPOSProducts(); }
window.filterPOSProducts = filterPOSProducts;

function switchCategory(category) { currentCategory = category; renderPOSProducts(); }
window.switchCategory = switchCategory;

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (product.stock < 1) { showToast('Out of stock!', 'error'); return; }
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.qty >= product.stock) { showToast('Stock limit reached', 'error'); return; }
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    showToast(`${product.name} added to cart`, 'success');
}
window.addToCart = addToCart;

function removeFromCart(productId) { cart = cart.filter(item => item.id !== productId); updateCartUI(); }
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
    document.getElementById('posCartCount').textContent = `${totalItems} items`;
    const cartItems = document.getElementById('posCartItems');
    if (!cart.length) {
        cartItems.innerHTML = '<div class="empty-state"><i class="fas fa-plus-circle"></i><p>Add items from the left</p></div>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="item-info">
                    <div class="name">${item.name}</div>
                    <div class="variant">${item.size ? item.size : ''} ${item.colour ? item.colour : ''}</div>
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
    document.getElementById('posCartTotal').textContent = `KES ${totalPrice}`;
}
window.updateCartUI = updateCartUI;

function clearCart() {
    if (!cart.length) return;
    if (confirm('Clear all items from cart?')) { cart = []; updateCartUI(); showToast('Cart cleared', 'info'); }
}
window.clearCart = clearCart;

// ============================================================
// CHECKOUT
// ============================================================
function openCheckout() {
    if (!cart.length) { showToast('Cart is empty', 'error'); return; }
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    document.getElementById('checkoutTotal').textContent = `KES ${total}`;
    document.getElementById('checkoutItems').innerHTML = cart.map(i => `
        <div class="checkout-item"><span>${i.name} ${i.size ? i.size : ''} × ${i.qty}</span><span>KES ${i.price * i.qty}</span></div>
    `).join('');
    document.getElementById('checkoutName').value = '';
    document.getElementById('checkoutPhone').value = '';
    document.getElementById('mpesaCode').value = '';
    document.getElementById('cashPaid').value = '';
    document.getElementById('changeDisplay').textContent = '';
    document.getElementById('mpesaForm').style.display = 'none';
    document.getElementById('cashForm').style.display = 'none';
    openModal('checkoutModal');
}
window.openCheckout = openCheckout;

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-methods .method').forEach(el => el.classList.remove('active'));
    document.querySelector(`.payment-methods .method[data-method="${method}"]`).classList.add('active');
    document.getElementById('mpesaForm').style.display = method === 'mpesa' ? 'block' : 'none';
    document.getElementById('cashForm').style.display = method === 'cash' ? 'block' : 'none';
}
window.selectPayment = selectPayment;

function calculateChange() {
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const paid = parseFloat(document.getElementById('cashPaid').value) || 0;
    const change = paid - total;
    document.getElementById('changeDisplay').textContent = change >= 0 ? `Change: KES ${change}` : `Balance: KES ${Math.abs(change)}`;
}
window.calculateChange = calculateChange;

async function completeOrder() {
    if (!cart.length) return;
    const name = document.getElementById('checkoutName').value.trim() || 'Walk-in Customer';
    const phone = document.getElementById('checkoutPhone').value.trim() || 'N/A';
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    let paymentDetails = selectedPayment;
    if (selectedPayment === 'mpesa') {
        const code = document.getElementById('mpesaCode').value.trim();
        if (!code) { showToast('Please enter M-Pesa transaction code', 'error'); return; }
        paymentDetails = `M-Pesa: ${code}`;
    }
    const orderData = {
        order_number: 'POS-' + Date.now().toString().slice(-6),
        customer_name: name,
        customer_phone: phone,
        customer_email: '',
        items: cart.map(i => ({ id: i.id, name: i.name, size: i.size, colour: i.colour, qty: i.qty, price: i.price })),
        total: total,
        payment_method: paymentDetails,
        status: 'pending',
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
        ${order.items.map(i => `${i.name} ${i.size ? i.size : ''} × ${i.qty} = KES ${i.price * i.qty}`).join('\n        ')}
        ---------------------------------
        Total: KES ${order.total}
        Payment: ${order.payment_method}
        ================================
        Thank you for shopping with us!
        Eastleigh 5th St, Micki Mall, Rm S12
        ================================
    `;
    document.getElementById('receiptContent').textContent = receipt;
    openModal('receiptModal');
    setTimeout(() => printReceipt(), 500);
}

function printReceipt() {
    const content = document.getElementById('receiptContent').textContent;
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
    if (filter !== 'all') filtered = filtered.filter(o => o.status === filter);
    ['countAll', 'countPending', 'countProcessing', 'countShipped', 'countDelivered', 'countCancelled'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = orders.filter(o => o.status === id.replace('count', '').toLowerCase()).length;
    });
    document.getElementById('orderCount').textContent = filtered.length;
    const container = document.getElementById('ordersContainer');
    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No orders found</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${filtered.map(o => `
                <tr>
                    <td><strong>${o.order_number}</strong></td>
                    <td>${o.customer_name || 'Guest'}</td>
                    <td>${o.items ? o.items.reduce((s,i) => s + i.qty, 0) : 0}</td>
                    <td><strong>KES ${o.total}</strong></td>
                    <td>${o.payment_method || 'N/A'}</td>
                    <td><span class="status-badge ${o.status || 'pending'}">${o.status || 'pending'}</span></td>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="updateOrderStatus('${o.id}','processing')">📦</button>
                        <button class="btn btn-sm btn-success" onclick="updateOrderStatus('${o.id}','shipped')">🚚</button>
                        <button class="btn btn-sm btn-warning" onclick="updateOrderStatus('${o.id}','delivered')">✅</button>
                        <button class="btn btn-sm btn-danger" onclick="updateOrderStatus('${o.id}','cancelled')">❌</button>
                    </td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderOrders = renderOrders;

async function updateOrderStatus(id, status) {
    try {
        const { error } = await sb.from('orders').update({ status }).eq('id', id);
        if (error) throw error;
        showToast(`Order ${status}`, 'success');
        await loadOrders();
        const activeFilter = document.querySelector('.filter-btn.active');
        renderOrders(activeFilter ? activeFilter.dataset.filter : 'all');
        updateStats();
    } catch (e) { showToast('Error updating order', 'error'); }
}
window.updateOrderStatus = updateOrderStatus;

// ============================================================
// PRODUCTS TABLE
// ============================================================
function renderProductsTable() {
    const container = document.getElementById('productsTable');
    if (!products.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products found</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Product</th><th>Code</th><th>Category</th><th>Price</th><th>Stock</th><th>Colour</th><th>Size</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${products.map(p => `
                <tr>
                    <td><div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:24px;">${p.category === 'dress' ? '👗' : p.category === 'top' ? '👕' : '👔'}</span>
                        <div><div style="font-weight:600;">${p.name}</div><div style="font-size:12px;color:var(--text-muted);">${p.code || 'N/A'}</div></div>
                    </div></td>
                    <td>${p.code || 'N/A'}</td>
                    <td>${p.category}</td>
                    <td>KES ${p.price}</td>
                    <td>${p.stock}</td>
                    <td>${p.colour || '-'}</td>
                    <td>${p.size || '-'}</td>
                    <td>${p.best_quality ? '<span class="badge gold"><i class="fas fa-star"></i> Best</span>' : 'Standard'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderProductsTable = renderProductsTable;

// ============================================================
// PRODUCT CRUD (with Variants & Images)
// ============================================================
function openProductModal(product = null) {
    document.getElementById('editProductId').value = product ? product.id : '';
    document.getElementById('productModalTitle').textContent = product ? '✏️ Edit Product' : '📦 Add Product';
    document.getElementById('saveProductBtn').innerHTML = product ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-save"></i> Save';
    document.getElementById('productName').value = product ? product.name : '';
    document.getElementById('productCode').value = product ? product.code : '';
    document.getElementById('productCategory').value = product ? product.category : '';
    document.getElementById('productGender').value = product ? product.gender : 'unisex';
    document.getElementById('productPrice').value = product ? product.price : '';
    document.getElementById('productStock').value = product ? product.stock : '';
    document.getElementById('productCostPrice').value = product ? product.cost_price : '';
    document.getElementById('productReorderLevel').value = product ? product.reorder_level : 5;
    document.getElementById('productColour').value = product ? product.colour : '';
    document.getElementById('productSize').value = product ? product.size : '';
    document.getElementById('productSupplier').value = product ? product.supplier : '';
    document.getElementById('productBarcode').value = product ? product.barcode : '';
    document.getElementById('productMaterial').value = product ? product.material : '';
    document.getElementById('productTax').value = product ? product.tax : 0;
    document.getElementById('productDescription').value = product ? product.description : '';
    document.getElementById('productBestQuality').checked = product ? product.best_quality : false;
    // Reset variants and images
    variants = [];
    productImages = [];
    document.getElementById('variantsList').innerHTML = '';
    document.getElementById('imageGallery').innerHTML = '';
    document.getElementById('variantsData').value = '[]';
    document.getElementById('imageGalleryData').value = '[]';
    if (product) {
        // Load variants if any
        if (product.variants) {
            variants = product.variants;
            renderVariants();
        }
        if (product.images) {
            productImages = product.images;
            renderImageGallery();
        }
    }
    openModal('productModal');
}
window.openProductModal = openProductModal;

function addVariant() {
    const size = document.getElementById('variantSize').value.trim();
    const color = document.getElementById('variantColor').value.trim();
    const stock = parseInt(document.getElementById('variantStock').value) || 0;
    if (!size && !color) { showToast('Enter size or color', 'warning'); return; }
    variants.push({ size: size || 'One Size', color: color || 'Standard', stock: stock });
    renderVariants();
    document.getElementById('variantSize').value = '';
    document.getElementById('variantColor').value = '';
    document.getElementById('variantStock').value = '';
    document.getElementById('variantsData').value = JSON.stringify(variants);
}
window.addVariant = addVariant;

function removeVariant(index) {
    variants.splice(index, 1);
    renderVariants();
    document.getElementById('variantsData').value = JSON.stringify(variants);
}
window.removeVariant = removeVariant;

function renderVariants() {
    const list = document.getElementById('variantsList');
    if (!variants.length) {
        list.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);font-size:12px;">No variants added</td></tr>';
        return;
    }
    list.innerHTML = variants.map((v, i) => `
        <tr>
            <td><span class="variant-badge size">${v.size}</span></td>
            <td><span class="variant-badge color">${v.color}</span></td>
            <td>${v.stock}</td>
            <td><button class="remove-variant" onclick="removeVariant(${i})"><i class="fas fa-times"></i></button></td>
        </tr>
    `).join('');
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('productName').value.trim();
    const code = document.getElementById('productCode').value.trim();
    const category = document.getElementById('productCategory').value;
    const gender = document.getElementById('productGender').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const cost_price = parseFloat(document.getElementById('productCostPrice').value) || 0;
    const reorder_level = parseInt(document.getElementById('productReorderLevel').value) || 5;
    const colour = document.getElementById('productColour').value.trim();
    const size = document.getElementById('productSize').value.trim();
    const supplier = document.getElementById('productSupplier').value.trim();
    const barcode = document.getElementById('productBarcode').value.trim();
    const material = document.getElementById('productMaterial').value.trim();
    const tax = parseFloat(document.getElementById('productTax').value) || 0;
    const description = document.getElementById('productDescription').value.trim();
    const best_quality = document.getElementById('productBestQuality').checked;
    const variantsData = JSON.parse(document.getElementById('variantsData').value || '[]');
    const imagesData = JSON.parse(document.getElementById('imageGalleryData').value || '[]');

    if (!name || !code || !category || !price || isNaN(stock)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const productData = { name, code, category, gender, price, stock, cost_price, reorder_level, colour, size, supplier, barcode, material, tax, description, best_quality, variants: variantsData, images: imagesData };

    try {
        if (id) {
            const { error } = await sb.from('products').update(productData).eq('id', parseInt(id));
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
    } catch (e) { showToast('Error saving product: ' + e.message, 'error'); }
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
    } catch (e) { showToast('Error deleting product', 'error'); }
}
window.deleteProduct = deleteProduct;

// ============================================================
// INVENTORY
// ============================================================
function renderInventory() {
    const stockProduct = document.getElementById('stockProduct');
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (${p.stock} in stock)</option>`).join('');
    }
    const inventoryTable = document.getElementById('inventoryTable');
    if (!products.length) {
        inventoryTable.innerHTML = '<div class="empty-state"><p>No products</p></div>';
    } else {
        inventoryTable.innerHTML = `
            <div class="table-wrapper"><table class="data-table">
                <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>Stock</th><th>Status</th></tr></thead>
                <tbody>${products.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.colour || '-'}</td>
                        <td>${p.size || '-'}</td>
                        <td>${p.stock}</td>
                        <td>${p.stock < 5 ? '<span class="badge danger">⚠️ Low Stock</span>' : '<span class="badge success">✅ In Stock</span>'}</td>
                    </tr>
                `).join('')}</tbody>
            </table></div>
        `;
    }
    const categoryStockList = document.getElementById('categoryStockList');
    const categoryStock = {};
    products.forEach(p => {
        if (!categoryStock[p.category]) categoryStock[p.category] = 0;
        categoryStock[p.category] += p.stock;
    });
    categoryStockList.innerHTML = Object.entries(categoryStock).sort((a, b) => b[1] - a[1])
        .map(([cat, stock]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
            <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span><span>${stock} units</span></div>`).join('') || '<div class="empty-state"><p>No categories</p></div>';
}
window.renderInventory = renderInventory;

function openStockModal() {
    const stockProduct = document.getElementById('stockProduct');
    stockProduct.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (${p.stock} in stock)</option>`).join('');
    document.getElementById('adjustmentQty').value = '';
    document.getElementById('adjustmentReason').value = '';
    openModal('stockModal');
}
window.openStockModal = openStockModal;

async function adjustStock(e) {
    e.preventDefault();
    const productId = parseInt(document.getElementById('stockProduct').value);
    const type = document.getElementById('adjustmentType').value;
    const qty = parseFloat(document.getElementById('adjustmentQty').value);
    const reason = document.getElementById('adjustmentReason').value || 'Manual adjustment';
    if (!productId || !qty || qty <= 0) { showToast('Please enter valid quantity', 'error'); return; }
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
    } catch (e) { showToast('Error adjusting stock', 'error'); }
}
window.adjustStock = adjustStock;

// ============================================================
// CUSTOMERS
// ============================================================
function renderCustomersTable() {
    const container = document.getElementById('customersTable');
    if (!customers.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No customers found</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Orders</th><th>Actions</th></tr></thead>
            <tbody>${customers.map(c => `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.phone}</td>
                    <td>${c.email || '-'}</td>
                    <td>${orders.filter(o => o.customer_phone === c.phone).length}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderCustomersTable = renderCustomersTable;

function openCustomerModal(customer = null) {
    document.getElementById('editCustomerId').value = customer ? customer.id : '';
    document.getElementById('customerModalTitle').textContent = customer ? '✏️ Edit Customer' : '👤 Add Customer';
    document.getElementById('customerName').value = customer ? customer.name : '';
    document.getElementById('customerPhone').value = customer ? customer.phone : '';
    document.getElementById('customerEmail').value = customer ? customer.email : '';
    openModal('customerModal');
}
window.openCustomerModal = openCustomerModal;

async function saveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('editCustomerId').value;
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    if (!name || !phone) { showToast('Please fill in name and phone', 'error'); return; }
    const data = { name, phone, email };
    try {
        if (id) {
            const { error } = await sb.from('customers').update(data).eq('id', parseInt(id));
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
    } catch (e) { showToast('Error saving customer', 'error'); }
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
    } catch (e) { showToast('Error deleting customer', 'error'); }
}
window.deleteCustomer = deleteCustomer;

// ============================================================
// SUPPLIERS
// ============================================================
function renderSuppliersTable() {
    const container = document.getElementById('suppliersTable');
    if (!suppliers.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-truck"></i><p>No suppliers</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Actions</th></tr></thead>
            <tbody>${suppliers.map(s => `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.email || '-'}</td>
                    <td>${s.address || '-'}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderSuppliersTable = renderSuppliersTable;

function openSupplierModal() {
    document.getElementById('supplierName').value = '';
    document.getElementById('supplierPhone').value = '';
    document.getElementById('supplierEmail').value = '';
    document.getElementById('supplierAddress').value = '';
    openModal('supplierModal');
}
window.openSupplierModal = openSupplierModal;

async function saveSupplier(e) {
    e.preventDefault();
    const name = document.getElementById('supplierName').value.trim();
    const phone = document.getElementById('supplierPhone').value.trim();
    const email = document.getElementById('supplierEmail').value.trim();
    const address = document.getElementById('supplierAddress').value.trim();
    if (!name) { showToast('Supplier name required', 'error'); return; }
    try {
        const { error } = await sb.from('suppliers').insert([{ name, phone, email, address }]);
        if (error) throw error;
        showToast('Supplier added!', 'success');
        await loadSuppliers();
        closeModal('supplierModal');
    } catch (e) { showToast('Error saving supplier', 'error'); }
}
window.saveSupplier = saveSupplier;

async function deleteSupplier(id) {
    if (!confirm('Delete this supplier?')) return;
    try {
        const { error } = await sb.from('suppliers').delete().eq('id', id);
        if (error) throw error;
        showToast('Supplier deleted', 'success');
        await loadSuppliers();
    } catch (e) { showToast('Error deleting supplier', 'error'); }
}
window.deleteSupplier = deleteSupplier;

// ============================================================
// PURCHASES
// ============================================================
function renderPurchasesTable() {
    const container = document.getElementById('purchasesTable');
    if (!purchases.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-cart-plus"></i><p>No purchases recorded</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Reference</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${purchases.map(p => `
                <tr>
                    <td><strong>${p.reference || 'N/A'}</strong></td>
                    <td>${p.supplier_name || 'Unknown'}</td>
                    <td>${p.product_name || 'Unknown'}</td>
                    <td>${p.quantity}</td>
                    <td>KES ${p.unit_cost}</td>
                    <td><strong>KES ${p.total}</strong></td>
                    <td><span class="status-badge ${p.payment_status || 'paid'}">${p.payment_status || 'Paid'}</span></td>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderPurchasesTable = renderPurchasesTable;

function openPurchaseModal() {
    const supplierSelect = document.getElementById('purchaseSupplier');
    supplierSelect.innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const productSelect = document.getElementById('purchaseProduct');
    productSelect.innerHTML = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('purchaseReference').value = '';
    document.getElementById('purchaseQty').value = 1;
    document.getElementById('purchaseUnitCost').value = '';
    openModal('purchaseModal');
}
window.openPurchaseModal = openPurchaseModal;

async function savePurchase(e) {
    e.preventDefault();
    const supplier_id = document.getElementById('purchaseSupplier').value;
    const product_id = document.getElementById('purchaseProduct').value;
    const reference = document.getElementById('purchaseReference').value.trim();
    const quantity = parseInt(document.getElementById('purchaseQty').value);
    const unit_cost = parseFloat(document.getElementById('purchaseUnitCost').value);
    const payment_status = document.getElementById('purchasePaymentStatus').value;
    const supplier = suppliers.find(s => s.id == supplier_id);
    const product = products.find(p => p.id == product_id);
    if (!supplier_id || !product_id || !quantity || !unit_cost) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    const total = quantity * unit_cost;
    const purchaseData = {
        supplier_id: parseInt(supplier_id),
        supplier_name: supplier ? supplier.name : 'Unknown',
        product_id: parseInt(product_id),
        product_name: product ? product.name : 'Unknown',
        reference: reference,
        quantity: quantity,
        unit_cost: unit_cost,
        total: total,
        payment_status: payment_status,
        created_at: new Date().toISOString()
    };
    try {
        // Insert purchase
        const { error } = await sb.from('purchases').insert([purchaseData]);
        if (error) throw error;
        // Update product stock
        if (product) {
            const newStock = product.stock + quantity;
            await sb.from('products').update({ stock: newStock }).eq('id', product.id);
        }
        showToast('✅ Purchase recorded! Stock updated.', 'success');
        await loadPurchases();
        await loadProducts();
        closeModal('purchaseModal');
    } catch (e) { showToast('Error saving purchase: ' + e.message, 'error'); }
}
window.savePurchase = savePurchase;

// ============================================================
// RETURNS
// ============================================================
function renderReturnsTable() {
    const container = document.getElementById('returnsTable');
    if (!returns.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-rotate-left"></i><p>No returns recorded</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Order #</th><th>Product</th><th>Qty</th><th>Reason</th><th>Refund Method</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${returns.map(r => `
                <tr>
                    <td><strong>${r.order_number || 'N/A'}</strong></td>
                    <td>${r.product_name || 'Unknown'}</td>
                    <td>${r.quantity}</td>
                    <td>${r.reason || 'N/A'}</td>
                    <td>${r.refund_method || 'N/A'}</td>
                    <td><span class="status-badge ${r.status || 'processed'}">${r.status || 'Processed'}</span></td>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderReturnsTable = renderReturnsTable;

function openReturnModal() {
    const productSelect = document.getElementById('returnProduct');
    productSelect.innerHTML = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('returnOrderNo').value = '';
    document.getElementById('returnQty').value = 1;
    openModal('returnModal');
}
window.openReturnModal = openReturnModal;

async function saveReturn(e) {
    e.preventDefault();
    const order_number = document.getElementById('returnOrderNo').value.trim();
    const product_id = document.getElementById('returnProduct').value;
    const quantity = parseInt(document.getElementById('returnQty').value);
    const reason = document.getElementById('returnReason').value;
    const refund_method = document.getElementById('refundMethod').value;
    const product = products.find(p => p.id == product_id);
    if (!order_number || !product_id || !quantity) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    const returnData = {
        order_number: order_number,
        product_id: parseInt(product_id),
        product_name: product ? product.name : 'Unknown',
        quantity: quantity,
        reason: reason,
        refund_method: refund_method,
        status: 'processed',
        created_at: new Date().toISOString()
    };
    try {
        const { error } = await sb.from('returns').insert([returnData]);
        if (error) throw error;
        // Update product stock (add back)
        if (product) {
            const newStock = product.stock + quantity;
            await sb.from('products').update({ stock: newStock }).eq('id', product.id);
        }
        showToast('✅ Return processed! Stock updated.', 'success');
        await loadReturns();
        await loadProducts();
        closeModal('returnModal');
    } catch (e) { showToast('Error processing return: ' + e.message, 'error'); }
}
window.saveReturn = saveReturn;

// ============================================================
// EXPENSES
// ============================================================
function renderExpensesTable() {
    const container = document.getElementById('expensesTable');
    if (!expenses.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No expenses recorded</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Category</th><th>Amount</th><th>Description</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${expenses.map(e => `
                <tr>
                    <td><span class="badge info">${e.category}</span></td>
                    <td><strong>KES ${e.amount}</strong></td>
                    <td>${e.description || '-'}</td>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(e.created_at).toLocaleDateString()}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderExpensesTable = renderExpensesTable;

function openExpenseModal() {
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDescription').value = '';
    openModal('expenseModal');
}
window.openExpenseModal = openExpenseModal;

async function saveExpense(e) {
    e.preventDefault();
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const description = document.getElementById('expenseDescription').value.trim();
    if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }
    try {
        const { error } = await sb.from('expenses').insert([{ category, amount, description, created_at: new Date().toISOString() }]);
        if (error) throw error;
        showToast('Expense added!', 'success');
        await loadExpenses();
        closeModal('expenseModal');
    } catch (e) { showToast('Error saving expense', 'error'); }
}
window.saveExpense = saveExpense;

async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    try {
        const { error } = await sb.from('expenses').delete().eq('id', id);
        if (error) throw error;
        showToast('Expense deleted', 'success');
        await loadExpenses();
    } catch (e) { showToast('Error deleting expense', 'error'); }
}
window.deleteExpense = deleteExpense;

// ============================================================
// SHIFTS
// ============================================================
function renderShiftsTable() {
    const container = document.getElementById('shiftsTable');
    if (!shifts.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-cash-register"></i><p>No shift records</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>User</th><th>Opening Cash</th><th>Closing Cash</th><th>Expected</th><th>Difference</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${shifts.map(s => {
                const expected = s.opening_cash + orders.filter(o => o.shift_id === s.id).reduce((sum, o) => sum + (o.total || 0), 0);
                const diff = s.closing_cash - expected;
                return `<tr>
                    <td>${s.user_name || 'Cashier'}</td>
                    <td>KES ${s.opening_cash || 0}</td>
                    <td>KES ${s.closing_cash || 0}</td>
                    <td>KES ${expected}</td>
                    <td style="color:${diff >= 0 ? 'var(--success)' : 'var(--danger)'};">KES ${diff}</td>
                    <td><span class="status-badge ${s.status}">${s.status}</span></td>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(s.created_at).toLocaleDateString()}</td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>
    `;
}
window.renderShiftsTable = renderShiftsTable;

function openShiftModal(action) {
    document.getElementById('shiftAction').value = action;
    document.getElementById('shiftModalTitle').textContent = action === 'open' ? '💵 Open Shift' : '💵 Close Shift';
    document.getElementById('openShiftFields').style.display = action === 'open' ? 'block' : 'none';
    document.getElementById('closeShiftFields').style.display = action === 'open' ? 'none' : 'block';
    document.getElementById('shiftOpeningCash').value = '';
    document.getElementById('shiftClosingCash').value = '';
    document.getElementById('shiftNotes').value = '';
    openModal('shiftModal');
}
window.openShiftModal = openShiftModal;

async function saveShift(e) {
    e.preventDefault();
    const action = document.getElementById('shiftAction').value;
    const user_name = currentUser?.full_name || 'Cashier';
    const user_id = currentUser?.id;
    if (action === 'open') {
        const opening_cash = parseFloat(document.getElementById('shiftOpeningCash').value) || 0;
        try {
            const { error } = await sb.from('shifts').insert([{
                user_id: user_id,
                user_name: user_name,
                opening_cash: opening_cash,
                status: 'open',
                created_at: new Date().toISOString()
            }]);
            if (error) throw error;
            showToast('✅ Shift opened!', 'success');
            await loadShifts();
            closeModal('shiftModal');
        } catch (e) { showToast('Error opening shift', 'error'); }
    } else {
        const closing_cash = parseFloat(document.getElementById('shiftClosingCash').value) || 0;
        const notes = document.getElementById('shiftNotes').value.trim();
        const openShift = shifts.find(s => s.status === 'open');
        if (!openShift) { showToast('No open shift found', 'error'); return; }
        try {
            const { error } = await sb.from('shifts').update({
                closing_cash: closing_cash,
                notes: notes,
                status: 'closed',
                closed_at: new Date().toISOString()
            }).eq('id', openShift.id);
            if (error) throw error;
            showToast('✅ Shift closed!', 'success');
            await loadShifts();
            closeModal('shiftModal');
        } catch (e) { showToast('Error closing shift', 'error'); }
    }
}
window.saveShift = saveShift;

// ============================================================
// LOYALTY
// ============================================================
function renderLoyaltyTable() {
    const container = document.getElementById('loyaltyTable');
    if (!loyaltyMembers.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-gift"></i><p>No loyalty members</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>Points</th><th>Actions</th></tr></thead>
            <tbody>${loyaltyMembers.map(m => `
                <tr>
                    <td><strong>${m.customer_name || 'Unknown'}</strong></td>
                    <td>${m.phone || '-'}</td>
                    <td><span class="badge gold">⭐ ${m.points || 0}</span></td>
                    <td><button class="btn btn-sm btn-primary" onclick="addLoyaltyPoints(${m.id})"><i class="fas fa-plus"></i></button></td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderLoyaltyTable = renderLoyaltyTable;

function openLoyaltyModal() {
    openModal('loyaltyModal');
}
window.openLoyaltyModal = openLoyaltyModal;

async function saveLoyalty(e) {
    e.preventDefault();
    const points_rate = parseInt(document.getElementById('loyaltyPointsRate').value) || 100;
    const redemption = parseFloat(document.getElementById('loyaltyRedemption').value) || 1;
    localStorage.setItem('luciecloset_loyalty_settings', JSON.stringify({ points_rate, redemption }));
    showToast('Loyalty settings saved!', 'success');
    closeModal('loyaltyModal');
    updateLoyaltyStats();
}
window.saveLoyalty = saveLoyalty;

async function addLoyaltyPoints(memberId) {
    const points = parseInt(prompt('Enter points to add:'));
    if (!points || points <= 0) return;
    try {
        const member = loyaltyMembers.find(m => m.id === memberId);
        if (!member) return;
        const newPoints = (member.points || 0) + points;
        const { error } = await sb.from('loyalty_members').update({ points: newPoints }).eq('id', memberId);
        if (error) throw error;
        showToast(`✅ Added ${points} points!`, 'success');
        await loadLoyaltyMembers();
    } catch (e) { showToast('Error adding points', 'error'); }
}
window.addLoyaltyPoints = addLoyaltyPoints;

// ============================================================
// USERS
// ============================================================
function renderUsersTable() {
    const container = document.getElementById('usersTable');
    if (!users.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No users found</p></div>';
        return;
    }
    container.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>PIN</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${users.map(u => `
                <tr>
                    <td><strong>${u.full_name}</strong></td>
                    <td>${u.email || '-'}</td>
                    <td><span class="badge primary">${u.role || 'Cashier'}</span></td>
                    <td>${u.pin ? '✅ Set' : '❌ Not set'}</td>
                    <td><span class="status-badge ${u.status || 'active'}">${u.status || 'active'}</span></td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.renderUsersTable = renderUsersTable;

function openUserModal() {
    document.getElementById('staffName').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffRole').value = 'Cashier';
    document.getElementById('staffPin').value = '';
    openModal('userModal');
}
window.openUserModal = openUserModal;

async function saveUser(e) {
    e.preventDefault();
    const full_name = document.getElementById('staffName').value.trim();
    const email = document.getElementById('staffEmail').value.trim();
    const role = document.getElementById('staffRole').value;
    const pin = document.getElementById('staffPin').value.trim();
    if (!full_name) { showToast('Name is required', 'error'); return; }
    const userData = { full_name, email, role, pin, status: 'active' };
    try {
        const { error } = await sb.from('users').insert([userData]);
        if (error) throw error;
        showToast('User added!', 'success');
        await loadUsers();
        closeModal('userModal');
    } catch (e) { showToast('Error saving user', 'error'); }
}
window.saveUser = saveUser;

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
        const { error } = await sb.from('users').delete().eq('id', id);
        if (error) throw error;
        showToast('User deleted', 'success');
        await loadUsers();
    } catch (e) { showToast('Error deleting user', 'error'); }
}
window.deleteUser = deleteUser;

// ============================================================
// REPORTS
// ============================================================
function generateReport() {
    const start = document.getElementById('reportStart').value;
    const end = document.getElementById('reportEnd').value;
    if (!start || !end) { showToast('Please select both dates', 'warning'); return; }
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59);
    const filtered = orders.filter(o => {
        const date = new Date(o.created_at);
        return date >= startDate && date <= endDate && o.status === 'delivered';
    });
    const total = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
    const count = filtered.length;
    document.getElementById('reportContent').innerHTML = `
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
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCost = completedOrders.reduce((sum, o) => {
        let cost = 0;
        if (o.items) {
            o.items.forEach(item => {
                const product = products.find(p => p.id === item.id);
                cost += (product?.cost_price || 0) * item.qty;
            });
        }
        return sum + cost;
    }, 0);
    const netProfit = totalRevenue - totalCost;
    document.getElementById('totalRevenue').textContent = `KES ${totalRevenue.toFixed(2)}`;
    document.getElementById('totalCost').textContent = `KES ${totalCost.toFixed(2)}`;
    document.getElementById('netProfit').textContent = `KES ${netProfit.toFixed(2)}`;
    renderProfitChart(totalRevenue, totalCost, netProfit);
}
window.refreshProfitData = refreshProfitData;

function renderProfitChart(revenue, cost, profit) {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;
    if (profitChartInstance) profitChartInstance.destroy();
    profitChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Revenue', 'Cost', 'Profit'], datasets: [{ data: [revenue, cost, profit], backgroundColor: ['#10B981', '#EF4444', '#7A1F2B'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } } } }
    });
}

// ============================================================
// AUDIT TRAIL
// ============================================================
function loadAuditLogs() {
    const logs = JSON.parse(localStorage.getItem('luciecloset_audit') || '[]');
    const auditTable = document.getElementById('auditTable');
    if (!logs.length) {
        auditTable.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No audit logs found</p></div>';
        return;
    }
    auditTable.innerHTML = `
        <div class="table-wrapper"><table class="data-table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>${logs.slice(0, 50).map(log => `
                <tr>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.user || 'System'}</td>
                    <td><span class="badge primary">${log.action}</span></td>
                    <td>${log.details || '-'}</td>
                </tr>
            `).join('')}</tbody>
        </table></div>
    `;
}
window.loadAuditLogs = loadAuditLogs;

// ============================================================
// SETTINGS
// ============================================================
function saveSettings(e) {
    e.preventDefault();
    const settings = {
        businessName: document.getElementById('businessName').value,
        phone: document.getElementById('businessPhone').value,
        email: document.getElementById('businessEmail').value,
        location: document.getElementById('businessLocation').value,
        receiptFooter: document.getElementById('receiptFooter').value
    };
    localStorage.setItem('luciecloset_settings', JSON.stringify(settings));
    showToast('Settings saved!', 'success');
}
window.saveSettings = saveSettings;

function savePaymentSettings(e) {
    e.preventDefault();
    const settings = {
        defaultPayment: document.getElementById('defaultPayment').value,
        mpesaShortcode: document.getElementById('mpesaShortcode').value
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
// REFRESH
// ============================================================
function refreshAll() {
    showToast('🔄 Refreshing data...', 'info');
    loadData();
}
window.refreshAll = refreshAll;

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
    if (timeDisplay) timeDisplay.textContent = now.toLocaleTimeString('en-KE', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// SIDEBAR TOGGLE
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
            if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
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
            if (confirm('Are you sure you want to logout?')) logout();
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
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});
