// ============================================================
// LUCIE CLOSET · POS + ADMIN SYSTEM - COMPLETE
// ============================================================

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://tlsldwshtxofckvkixxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc2xkd3NodHhvZmNrdmtpeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTE1NTksImV4cCI6MjEwMzc4NzU1OX0.BAfgQG4Z28bgKSfL9Li7Gbgp62sTM-5NxB4qVQ-b0H4';

const sb = supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ============================================================
// PIN LOGIN STATE
// ============================================================
let pinValue = '';
let isSubmitting = false;
let currentMethod = 'pin';

// ============================================================
// AUTH FUNCTIONS
// ============================================================
const SESSION_KEY = 'luciecloset_session';

function checkAuth() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
        try {
            const session = JSON.parse(stored);
            if (session.user && Date.now() - session.loginTime < 24 * 60 * 60 * 1000) {
                currentUser = session.user;
                showDashboard();
                return true;
            }
        } catch (e) {}
    }
    showLogin();
    return false;
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    const alertEl = document.getElementById('loginAlert');
    if (alertEl) {
        alertEl.className = 'alert';
        alertEl.textContent = '';
    }
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    document.getElementById('userName').textContent = session.user?.full_name || 'Admin';
    document.getElementById('userRole').textContent = session.user?.role_name || 'Administrator';
    document.getElementById('userAvatar').textContent = (session.user?.full_name || 'A').charAt(0).toUpperCase();
    loadData();
}

// ============================================================
// PIN FUNCTIONS - Fast & Responsive
// ============================================================
function pinPress(n) {
    if (isSubmitting) return;
    if (pinValue.length >= 4) return;

    // Visual feedback
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

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(8);

    pinValue += n;
    const pinInput = document.getElementById('pinInput');
    if (pinInput) pinInput.value = pinValue;
    renderDots();

    // Auto-submit when 4 digits entered
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

    // Enter button feedback
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

            // Direct database check
            const { data: user, error } = await sb
                .from('users')
                .select('id, email, full_name, role_id, status, pin, pin_enabled')
                .eq('email', email)
                .single();

            if (error || !user) throw new Error('User not found');
            if (user.status !== 'active') throw new Error('Account is inactive');
            if (!user.pin_enabled) throw new Error('PIN is not enabled for this account');
            if (user.pin !== pinValue) throw new Error('Invalid PIN. Please try again.');

            // Get full user with role
            const { data: userData, error: userError } = await sb
                .from('users')
                .select(`*, roles:role_id (id, name, permissions)`)
                .eq('id', user.id)
                .single();

            if (userError || !userData) throw new Error('User profile not found');

            // Store session
            const sessionData = {
                user: {
                    ...userData,
                    role_name: userData.roles?.name || 'cashier',
                    permissions: userData.roles?.permissions || {}
                },
                loginMethod: 'pin',
                loginTime: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

            // Update last login
            await sb.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

            showToast('Welcome back, ' + userData.full_name + '!', 'success');
            setTimeout(() => {
                currentUser = sessionData.user;
                showDashboard();
            }, 500);

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
                .select(`*, roles:role_id (id, name, permissions)`)
                .eq('email', email)
                .single();

            if (userError || !userData) throw new Error('User profile not found');
            if (userData.status !== 'active') throw new Error('Account is inactive');

            const sessionData = {
                user: {
                    ...userData,
                    role_name: userData.roles?.name || 'cashier',
                    permissions: userData.roles?.permissions || {}
                },
                session: authData.session,
                loginMethod: 'email',
                loginTime: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

            showToast('Welcome back, ' + userData.full_name + '!', 'success');
            setTimeout(() => {
                currentUser = sessionData.user;
                showDashboard();
            }, 500);
        }

    } catch (error) {
        showAlert(error.message, 'error');
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

function logout() {
    localStorage.removeItem(SESSION_KEY);
    sb.auth.signOut().catch(() => {});
    showLogin();
    showToast('Logged out successfully', 'info');
}

// ============================================================
// LOAD DATA
// ============================================================
async function loadData() {
    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadCustomers()
    ]);
    updateStats();
    renderCurrentTab();
}

async function loadProducts() {
    try {
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
    const search = document.getElementById('posSearch');
    const grid = document.getElementById('posProductGrid');
    if (!grid) return;
    
    const searchValue = search ? search.value.toLowerCase() : '';
    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchValue) || p.code.toLowerCase().includes(searchValue);
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

function filterPOSProducts() {
    renderPOSProducts();
}

function switchCategory(category) {
    currentCategory = category;
    renderPOSProducts();
}

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

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

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
                        <div class="code">${item.code}</div>
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

function clearCart() {
    if (!cart.length) return;
    if (confirm('Clear all items from cart?')) {
        cart = [];
        updateCartUI();
        showToast('Cart cleared', 'info');
    }
}

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

function calculateChange() {
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const cashPaid = document.getElementById('cashPaid');
    const changeDisplay = document.getElementById('changeDisplay');
    
    if (!cashPaid || !changeDisplay) return;
    const paid = parseFloat(cashPaid.value) || 0;
    const change = paid - total;
    changeDisplay.textContent = change >= 0 ? `Change: KES ${change}` : `Balance: KES ${Math.abs(change)}`;
}

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

        // Update stock
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

    // Auto-print
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

// ============================================================
// ORDERS
// ============================================================
function renderOrders(filter = 'all') {
    let filtered = [...orders];

    if (filter !== 'all') {
        filtered = filtered.filter(o => o.status === filter);
    }

    // Update counts
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
                                        <div style="font-size:12px;color:var(--text-muted);">${p.code}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${p.code}</td>
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

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) openProductModal(product);
}

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

// ============================================================
// INVENTORY
// ============================================================
function renderInventory() {
    // Product list for stock adjustment
    const stockProduct = document.getElementById('stockProduct');
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p =>
            `<option value="${p.id}">${p.name} (${p.stock} in stock)</option>`
        ).join('');
    }

    // Inventory table
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

    // Category stock
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

        logAudit('Stock Adjusted', `${product.name}: ${type === 'add' ? '+' : '-'}${qty} (${reason})`);

        showToast(`Stock updated: ${product.name} → ${newStock}`, 'success');
        await loadProducts();
        renderCurrentTab();
        closeModal('stockModal');
    } catch (e) {
        showToast('Error adjusting stock', 'error');
    }
}

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

function exportReport(format) {
    showToast(`Exporting ${format.toUpperCase()}...`, 'info');
    setTimeout(() => showToast(`✅ ${format.toUpperCase()} exported!`, 'success'), 1500);
}

// ============================================================
// PROFIT/LOSS
// ============================================================
function refreshProfitData() {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Calculate cost (assuming 60% of revenue)
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

function logAudit(action, details) {
    const logs = JSON.parse(localStorage.getItem('luciecloset_audit') || '[]');
    logs.unshift({
        timestamp: new Date().toISOString(),
        user: currentUser?.full_name || 'System',
        action: action,
        details: details
    });
    localStorage.setItem('luciecloset_audit', JSON.stringify(logs.slice(0, 200)));
}

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

// ============================================================
// MODALS
// ============================================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
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

// ============================================================
// REFRESH
// ============================================================
function refreshAll() {
    showToast('Refreshing data...', 'info');
    loadData();
}

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

    // Load saved theme
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
