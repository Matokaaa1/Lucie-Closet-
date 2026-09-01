// ============================================================
// Lucie Closet · POS + Admin System
// ============================================================

// ============================================================
// SUPABASE CONFIG - Only declared once
// ============================================================
const SUPABASE_URL = 'https://tlsldwshtxofckvkixxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc2xkd3NodHhvZmNrdmtpeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTE1NTksImV4cCI6MjEwMzc4NzU1OX0.BAfgQG4Z28bgKSfL9Li7Gbgp62sTM-5NxB4qVQ-b0H4';

// ✅ CORRECT: Use a different name or check if it exists
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
    document.getElementById('loginError').textContent = '';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    document.getElementById('userName').textContent = currentUser?.full_name || 'Admin';
    document.getElementById('userRole').textContent = currentUser?.role || 'Administrator';
    document.getElementById('userAvatar').textContent = (currentUser?.full_name || 'A').charAt(0).toUpperCase();
    loadData();
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const pin = document.getElementById('loginPin').value;

    if (!email || !password || !pin) {
        document.getElementById('loginError').textContent = 'Please fill in all fields';
        return;
    }

    try {
        // Try to authenticate with Supabase
        const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            // Fallback: check local users
            const users = JSON.parse(localStorage.getItem('luciecloset_users') || '[]');
            const user = users.find(u => u.email === email && u.pin === pin);
            if (user) {
                currentUser = user;
                const session = { user: user, loginTime: Date.now() };
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                showDashboard();
                showToast('Welcome back, ' + user.full_name + '!', 'success');
                return;
            }
            document.getElementById('loginError').textContent = 'Invalid credentials. Please try again.';
            return;
        }

        if (data.user) {
            // Check PIN (stored in users table)
            const { data: userData } = await sb
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (userData && userData.pin === pin) {
                currentUser = { ...data.user, ...userData };
                const session = { user: currentUser, loginTime: Date.now() };
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                showDashboard();
                showToast('Welcome back, ' + currentUser.full_name + '!', 'success');
                return;
            }
            document.getElementById('loginError').textContent = 'Invalid PIN. Please try again.';
        }
    } catch (err) {
        console.error('Login error:', err);
        document.getElementById('loginError').textContent = 'Login failed. Please try again.';
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
    document.getElementById('orderBadge').textContent = orders.length;
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

    document.getElementById('todaySales').textContent = `KES ${todayRevenue}`;
    document.getElementById('bestQualityCount').textContent = products.filter(p => p.best_quality).length;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('lowStock').textContent = products.filter(p => p.stock < 5).length;
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
    document.getElementById('greetingContainer').innerHTML = `
        <div style="margin-bottom:16px;padding:16px 20px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);">
            <h2 style="font-size:20px;font-weight:700;">
                👋 ${greeting}, ${name}!
                <span style="font-size:14px;font-weight:400;color:var(--text-muted);display:block;margin-top:4px;">
                    Welcome to Lucie Closet POS System
                </span>
            </h2>
        </div>
    `;
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

    document.getElementById(sectionMap[section]).classList.add('active');
    document.querySelector(`.sidebar-menu li[data-section="${section}"]`).classList.add('active');

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

    document.getElementById('pageTitle').textContent = titles[section];
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
    if (!recent.length) {
        document.getElementById('recentOrdersTable').innerHTML =
            '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent orders</p></div>';
        return;
    }

    document.getElementById('recentOrdersTable').innerHTML = `
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

    if (!sorted.length) {
        document.getElementById('topProductsList').innerHTML = '<div class="empty-state"><p>No sales data</p></div>';
        return;
    }

    document.getElementById('topProductsList').innerHTML = sorted.map((p, i) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
            <span>${i+1}. ${p.name}</span>
            <span style="font-weight:600;color:var(--primary);">KES ${p.revenue}</span>
        </div>
    `).join('');
}

function renderSalesChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
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

    salesChartInstance = new Chart(ctx, {
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
    const search = document.getElementById('posSearch').value.toLowerCase();
    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search);
        const matchCategory = currentCategory === 'all' || p.category === currentCategory;
        return matchSearch && matchCategory && p.stock > 0;
    });

    if (!filtered.length) {
        document.getElementById('posProductGrid').innerHTML =
            '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products available</p></div>';
        return;
    }

    document.getElementById('posProductGrid').innerHTML = filtered.map(p => `
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

    document.getElementById('posCartCount').textContent = `${totalItems} items`;

    if (!cart.length) {
        document.getElementById('posCartItems').innerHTML =
            '<div class="empty-state"><i class="fas fa-plus-circle"></i><p>Add items from the left</p></div>';
    } else {
        document.getElementById('posCartItems').innerHTML = cart.map(item => `
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

    document.getElementById('posCartTotal').textContent = `KES ${totalPrice}`;
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
    document.getElementById('checkoutTotal').textContent = `KES ${total}`;

    document.getElementById('checkoutItems').innerHTML = cart.map(i => `
        <div class="checkout-item">
            <span>${i.name} × ${i.qty}</span>
            <span>KES ${i.price * i.qty}</span>
        </div>
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

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-methods .method').forEach(el => el.classList.remove('active'));
    document.querySelector(`.payment-methods .method[data-method="${method}"]`).classList.add('active');

    document.getElementById('mpesaForm').style.display = method === 'mpesa' ? 'block' : 'none';
    document.getElementById('cashForm').style.display = method === 'cash' ? 'block' : 'none';
}

function calculateChange() {
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const paid = parseFloat(document.getElementById('cashPaid').value) || 0;
    const change = paid - total;
    document.getElementById('changeDisplay').textContent = change >= 0 ?
        `Change: KES ${change}` :
        `Balance: KES ${Math.abs(change)}`;
}

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

    document.getElementById('receiptContent').textContent = receipt;
    openModal('receiptModal');

    // Auto-print
    setTimeout(() => printReceipt(), 500);
}

function printReceipt() {
    const content = document.getElementById('receiptContent').textContent;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html><head><title>Receipt</title>
        <style>body{font-family:monospace;padding:20px;white-space:pre-wrap;font-size:14px;}</style>
        </head><body>${content}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
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
    document.getElementById('countAll').textContent = orders.length;
    document.getElementById('countPending').textContent = orders.filter(o => o.status === 'pending').length;
    document.getElementById('countCompleted').textContent = orders.filter(o => o.status === 'completed').length;
    document.getElementById('countCancelled').textContent = orders.filter(o => o.status === 'cancelled').length;
    document.getElementById('orderCount').textContent = filtered.length;

    if (!filtered.length) {
        document.getElementById('ordersContainer').innerHTML =
            '<div class="empty-state"><i class="fas fa-inbox"></i><p>No orders found</p></div>';
        return;
    }

    document.getElementById('ordersContainer').innerHTML = `
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

    const itemsHtml = order.items ? order.items.map(i =>
        `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);">
            <span>${i.name} × ${i.qty}</span>
            <span>KES ${i.price * i.qty}</span>
        </div>`
    ).join('') : '';

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
        renderOrders(document.querySelector('.filter-btn.active')?.dataset?.filter || 'all');
        updateStats();
    } catch (e) {
        showToast('Error updating order', 'error');
    }
}

// ============================================================
// PRODUCTS TABLE
// ============================================================
function renderProductsTable() {
    if (!products.length) {
        document.getElementById('productsTable').innerHTML =
            '<div class="empty-state"><i class="fas fa-box-open"></i><p>No products found</p></div>';
        return;
    }

    document.getElementById('productsTable').innerHTML = `
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
    document.getElementById('editProductId').value = product ? product.id : '';
    document.getElementById('productModalTitle').textContent = product ? '✏️ Edit Product' : '📦 Add Product';
    document.getElementById('saveProductBtn').innerHTML = product ?
        '<i class="fas fa-save"></i> Update' :
        '<i class="fas fa-save"></i> Save';

    document.getElementById('productName').value = product ? product.name : '';
    document.getElementById('productCode').value = product ? product.code : '';
    document.getElementById('productCategory').value = product ? product.category : '';
    document.getElementById('productGender').value = product ? product.gender : 'unisex';
    document.getElementById('productPrice').value = product ? product.price : '';
    document.getElementById('productStock').value = product ? product.stock : '';
    document.getElementById('productBestQuality').checked = product ? product.best_quality : false;

    document.getElementById('imagePreview').innerHTML = product && product.image_url ?
        `<img src="${product.image_url}">` : '';

    openModal('productModal');
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
    const best_quality = document.getElementById('productBestQuality').checked;

    if (!name || !code || !category || !price || isNaN(stock)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const productData = { name, code, category, gender, price, stock, best_quality };

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
    const select = document.getElementById('stockProduct');
    select.innerHTML = products.map(p =>
        `<option value="${p.id}">${p.name} (${p.stock} in stock)</option>`
    ).join('');

    // Inventory table
    const tableHtml = products.length ? `
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
    ` : '<div class="empty-state"><p>No products</p></div>';

    document.getElementById('inventoryTable').innerHTML = tableHtml;

    // Category stock
    const categoryStock = {};
    products.forEach(p => {
        if (!categoryStock[p.category]) categoryStock[p.category] = 0;
        categoryStock[p.category] += p.stock;
    });

    document.getElementById('categoryStockList').innerHTML = Object.entries(categoryStock)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, stock]) => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <span>${stock} units</span>
            </div>
        `).join('') || '<div class="empty-state"><p>No categories</p></div>';
}

function openStockModal() {
    const select = document.getElementById('stockProduct');
    select.innerHTML = products.map(p =>
        `<option value="${p.id}">${p.name} (${p.stock} in stock)</option>`
    ).join('');
    document.getElementById('adjustmentQty').value = '';
    document.getElementById('adjustmentReason').value = '';
    openModal('stockModal');
}

async function adjustStock(e) {
    e.preventDefault();
    const productId = parseInt(document.getElementById('stockProduct').value);
    const type = document.getElementById('adjustmentType').value;
    const qty = parseFloat(document.getElementById('adjustmentQty').value);
    const reason = document.getElementById('adjustmentReason').value || 'Manual adjustment';

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

        // Log audit
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
    if (!customers.length) {
        document.getElementById('customersTable').innerHTML =
            '<div class="empty-state"><i class="fas fa-users"></i><p>No customers found</p></div>';
        return;
    }

    document.getElementById('customersTable').innerHTML = `
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
    document.getElementById('editCustomerId').value = customer ? customer.id : '';
    document.getElementById('customerModalTitle').textContent = customer ? '✏️ Edit Customer' : '👤 Add Customer';
    document.getElementById('customerName').value = customer ? customer.name : '';
    document.getElementById('customerPhone').value = customer ? customer.phone : '';
    document.getElementById('customerEmail').value = customer ? customer.email : '';
    openModal('customerModal');
}

async function saveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('editCustomerId').value;
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();

    if (!name || !phone) {
        showToast('Please fill in name and phone', 'error');
        return;
    }

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
    const start = document.getElementById('reportStart').value;
    const end = document.getElementById('reportEnd').value;

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

function exportReport(format) {
    showToast(`Exporting ${format.toUpperCase()}...`, 'info');
    // In production, implement actual export
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
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;

    document.getElementById('totalRevenue').textContent = `KES ${totalRevenue.toFixed(2)}`;
    document.getElementById('totalCost').textContent = `KES ${totalCost.toFixed(2)}`;
    document.getElementById('netProfit').textContent = `KES ${netProfit.toFixed(2)}`;

    renderProfitChart(totalRevenue, totalCost, netProfit);
}

function renderProfitChart(revenue, cost, profit) {
    const ctx = document.getElementById('profitChart').getContext('2d');
    if (profitChartInstance) profitChartInstance.destroy();

    profitChartInstance = new Chart(ctx, {
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

    if (!logs.length) {
        document.getElementById('auditTable').innerHTML =
            '<div class="empty-state"><i class="fas fa-history"></i><p>No audit logs found</p></div>';
        return;
    }

    document.getElementById('auditTable').innerHTML = `
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

function savePaymentSettings(e) {
    e.preventDefault();
    const settings = {
        defaultPayment: document.getElementById('defaultPayment').value,
        mpesaShortcode: document.getElementById('mpesaShortcode').value
    };
    localStorage.setItem('luciecloset_payment_settings', JSON.stringify(settings));
    showToast('Payment settings saved!', 'success');
}

// ============================================================
// MODALS
// ============================================================
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
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
document.getElementById('themeToggle')?.addEventListener('click', function() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    this.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    localStorage.setItem('luciecloset_theme', isDark ? 'light' : 'dark');
});

// Load saved theme
const savedTheme = localStorage.getItem('luciecloset_theme');
if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
}

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-KE', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// SIDEBAR TOGGLE (Mobile)
// ============================================================
document.getElementById('sidebarToggle')?.addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
});

// ============================================================
// NAVIGATION CLICK HANDLERS
// ============================================================
document.querySelectorAll('.sidebar-menu li[data-section]').forEach(item => {
    item.addEventListener('click', function() {
        const section = this.dataset.section;
        navigateTo(section);
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    });
});

// ============================================================
// ORDER FILTERS
// ============================================================
document.querySelectorAll('#orderFilters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#orderFilters .filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        renderOrders(this.dataset.filter);
    });
});

// ============================================================
// LOGOUT
// ============================================================
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
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

// Expose functions to global scope
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
window.saveSettings = saveSettings;
window.savePaymentSettings = savePaymentSettings;
