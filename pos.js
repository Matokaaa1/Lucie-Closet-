// ============================================================
// Lucie Closet · POS System
// ============================================================

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://tlsldwshtxofckvkixxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc2xkd3NodHhvZmNrdmtpeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTE1NTksImV4cCI6MjEwMzc4NzU1OX0.BAfgQG4Z28bgKSfL9Li7Gbgp62sTM-5NxB4qVQ-b0H4';

const supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// STATE
// ============================================================
let products = [];
let orders = [];
let cart = [];
let currentTab = 'pos';
let selectedPayment = 'mpesa';

// ============================================================
// DOM REFS
// ============================================================
const posProductGrid = document.getElementById('posProductGrid');
const posCartItems = document.getElementById('posCartItems');
const posCartTotal = document.getElementById('posCartTotal');
const posCartCount = document.getElementById('posCartCount');
const cartCountBadge = document.getElementById('cartCountBadge');
const checkoutModal = document.getElementById('checkoutModal');
const productModal = document.getElementById('productModal');
const toastContainer = document.getElementById('toastContainer');

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('en-KE', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// LOAD DATA
// ============================================================
async function loadData() {
    await loadProducts();
    await loadOrders();
    updateStats();
    renderCurrentTab();
    renderPOSProducts();
    updateCartUI();
}

async function loadProducts() {
    try {
        const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
        if (error) throw error;
        if (data && data.length) {
            products = data;
        } else {
            products = getDefaultProducts();
            for (const p of products) {
                await supabase.from('products').insert([p]);
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
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        orders = data || [];
        localStorage.setItem('luciecloset_orders', JSON.stringify(orders));
    } catch (e) {
        const stored = localStorage.getItem('luciecloset_orders');
        orders = stored ? JSON.parse(stored) : [];
    }
    document.getElementById('orderCountBadge').textContent = orders.length;
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
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    document.getElementById('todaySales').textContent = `KSh ${todayRevenue}`;
    document.getElementById('todayOrders').textContent = todayOrders.length;
    document.getElementById('totalCustomers').textContent = new Set(todayOrders.map(o => o.customer_phone || 'guest')).size;
    document.getElementById('lowStockItems').textContent = products.filter(p => p.stock < 5).length;
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const tabMap = { pos: 'tabPos', products: 'tabProducts', orders: 'tabOrders', sales: 'tabSales',
        inventory: 'tabInventory' };
    document.getElementById(tabMap[tab]).style.display = 'block';
    document.getElementById(`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');

    const titles = { pos: 'Point of Sale', products: 'Manage Products', orders: 'Order History', sales: 'Sales Report',
        inventory: 'Inventory' };
    document.getElementById('pageTitle').innerHTML =
        `<i class="fas ${tab === 'pos' ? 'fa-cash-register' : tab === 'products' ? 'fa-tshirt' : tab === 'orders' ? 'fa-receipt' : tab === 'sales' ? 'fa-chart-line' : 'fa-boxes'}"></i> ${titles[tab]}`;

    renderCurrentTab();
}

window.switchTab = switchTab;

// ============================================================
// RENDER CURRENT TAB
// ============================================================
function renderCurrentTab() {
    if (currentTab === 'pos') {
        renderPOSProducts();
        updateCartUI();
    } else if (currentTab === 'products') {
        renderProductTable();
    } else if (currentTab === 'orders') {
        renderOrderTable();
    } else if (currentTab === 'sales') {
        loadSalesData('today');
    } else if (currentTab === 'inventory') {
        renderInventory();
    }
}

// ============================================================
// POS: RENDER PRODUCTS
// ============================================================
function renderPOSProducts() {
    const search = document.getElementById('posSearch').value.toLowerCase();
    const category = document.getElementById('posCategoryFilter').value;

    let filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search);
        const matchCategory = category === 'all' || p.category === category;
        return matchSearch && matchCategory;
    });

    if (!filtered.length) {
        posProductGrid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">
                <i class="fas fa-box-open" style="font-size:32px;display:block;margin-bottom:12px;"></i>
                No products found
            </div>
        `;
        return;
    }

    posProductGrid.innerHTML = filtered.map(p => `
        <div class="pos-product-item ${p.stock < 1 ? 'out-of-stock' : ''}" onclick="addToCart(${p.id})">
            <span class="emoji">${p.category === 'dress' ? '👗' : p.category === 'top' ? '👕' : p.category === 'sweater' ? '🧥' : '👔'}</span>
            <div class="name">${p.name}</div>
            <div class="price">KSh ${p.price}</div>
            <div class="stock">${p.stock} in stock</div>
            ${p.best_quality ? '<div class="best-tag"><i class="fas fa-star"></i> Best</div>' : ''}
        </div>
    `).join('');
}

function filterPOSProducts() {
    renderPOSProducts();
}

function showAllProducts() {
    document.getElementById('posSearch').value = '';
    document.getElementById('posCategoryFilter').value = 'all';
    renderPOSProducts();
}

window.filterPOSProducts = filterPOSProducts;
window.showAllProducts = showAllProducts;

// ============================================================
// POS: CART
// ============================================================
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
    showToast(`${product.name} added`, 'success');
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

    posCartCount.textContent = `${totalItems} items`;
    cartCountBadge.textContent = totalItems;

    if (!cart.length) {
        posCartItems.innerHTML = `
            <div style="text-align:center;padding:40px 0;color:var(--text-muted);">
                <i class="fas fa-plus-circle" style="font-size:32px;display:block;margin-bottom:12px;"></i>
                Add items from the left
            </div>
        `;
    } else {
        posCartItems.innerHTML = cart.map(item => `
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
                <div class="item-total">KSh ${item.price * item.qty}</div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    posCartTotal.textContent = `KSh ${totalPrice}`;
}

function clearCart() {
    if (!cart.length) return;
    if (confirm('Clear all items from cart?')) {
        cart = [];
        updateCartUI();
        showToast('Cart cleared', 'info');
    }
}

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
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
    document.getElementById('checkoutTotal').textContent = `KSh ${total}`;

    document.getElementById('checkoutItems').innerHTML = cart.map(i => `
        <div class="checkout-item">
            <span>${i.name} × ${i.qty}</span>
            <span>KSh ${i.price * i.qty}</span>
        </div>
    `).join('');

    // Reset forms
    document.getElementById('checkoutName').value = '';
    document.getElementById('checkoutPhone').value = '';
    document.getElementById('mpesaCode').value = '';
    document.getElementById('cashPaid').value = '';
    document.getElementById('changeDisplay').textContent = '';
    document.getElementById('mpesaForm').style.display = 'none';
    document.getElementById('cashForm').style.display = 'none';

    checkoutModal.classList.add('open');
}

function closeCheckout() {
    checkoutModal.classList.remove('open');
}

window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;

function selectPaymentMethod(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-methods .method').forEach(el => el.classList.remove('active'));
    document.querySelector(`.payment-methods .method[data-method="${method}"]`).classList.add('active');

    document.getElementById('mpesaForm').style.display = method === 'mpesa' ? 'block' : 'none';
    document.getElementById('cashForm').style.display = method === 'cash' ? 'block' : 'none';
}

window.selectPaymentMethod = selectPaymentMethod;

function calculateChange() {
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const paid = parseFloat(document.getElementById('cashPaid').value) || 0;
    const change = paid - total;
    document.getElementById('changeDisplay').textContent = change >= 0 ? `Change: KSh ${change}` : `Balance: KSh ${Math.abs(change)}`;
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
        items: cart.map(i => ({ id: i.id, name: i.name, code: i.code, qty: i.qty, price: i.price })),
        total: total,
        payment_method: paymentDetails,
        status: 'completed',
        created_at: new Date().toISOString()
    };

    try {
        // Save order to Supabase
        const { error } = await supabase.from('orders').insert([orderData]);
        if (error) throw error;

        // Update stock
        for (const item of cart) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                const newStock = product.stock - item.qty;
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                product.stock = newStock;
            }
        }

        showToast(`✅ Order ${orderData.order_number} completed!`, 'success');

        // Print receipt
        printReceipt(orderData);

        cart = [];
        updateCartUI();
        closeCheckout();
        await loadProducts();
        updateStats();
        renderPOSProducts();

    } catch (e) {
        console.error('Order error:', e);
        showToast('Error processing order', 'error');
    }
}

window.completeOrder = completeOrder;

// ============================================================
// PRINT RECEIPT
// ============================================================
function printReceipt(order) {
    const receipt = `
        ================================
           LUCIE CLOSET · RECEIPT
        ================================
        Order: ${order.order_number}
        Date: ${new Date(order.created_at).toLocaleString()}
        Customer: ${order.customer_name}
        Phone: ${order.customer_phone}
        ---------------------------------
        ${order.items.map(i => `${i.name} × ${i.qty} = KSh ${i.price * i.qty}`).join('\n        ')}
        ---------------------------------
        Total: KSh ${order.total}
        Payment: ${order.payment_method}
        ================================
        Thank you for shopping with us!
        Eastleigh 5th St, Micki Mall, Rm S12
        ================================
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html><head><title>Receipt</title>
        <style>body{font-family:monospace;padding:20px;white-space:pre-wrap;font-size:14px;}</style>
        </head><body>${receipt}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ============================================================
// PRODUCT TABLE (Admin)
// ============================================================
function renderProductTable() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    let filtered = products.filter(p => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search));

    if (!filtered.length) {
        document.getElementById('productTableBody').innerHTML =
            `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">No products found</td></tr>`;
        return;
    }

    document.getElementById('productTableBody').innerHTML = filtered.map(p => `
        <tr>
            <td>
                <div class="product-cell">
                    <div class="thumb">${p.image_url ? `<img src="${p.image_url}">` : (p.category === 'dress' ? '👗' : '👕')}</div>
                    <div class="info">
                        <div class="name">${p.name}</div>
                        <div class="code">${p.code}</div>
                    </div>
                </div>
            </td>
            <td>${p.code}</td>
            <td>${p.category}</td>
            <td>KSh ${p.price}</td>
            <td>${p.stock}</td>
            <td>${p.best_quality ? '<span class="best-badge"><i class="fas fa-crown"></i> Best</span>' : 'Standard'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-primary small" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// ORDER TABLE
// ============================================================
function renderOrderTable() {
    const search = document.getElementById('orderSearch').value.toLowerCase();
    const statusFilter = document.getElementById('orderStatusFilter').value;

    let filtered = orders.filter(o => {
        const matchSearch = o.order_number.toLowerCase().includes(search) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(search));
        const matchStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (!filtered.length) {
        document.getElementById('orderTableBody').innerHTML =
            `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No orders found</td></tr>`;
        return;
    }

    document.getElementById('orderTableBody').innerHTML = filtered.map(o => {
        const itemCount = o.items ? o.items.reduce((sum, i) => sum + i.qty, 0) : 0;
        return `
            <tr>
                <td><strong>${o.order_number}</strong></td>
                <td>${o.customer_name || 'Guest'}</td>
                <td>${itemCount} items</td>
                <td><strong>KSh ${o.total}</strong></td>
                <td>${o.payment_method || 'N/A'}</td>
                <td><span class="status-badge ${o.status || 'pending'}">${o.status || 'pending'}</span></td>
                <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-primary small" onclick="viewOrderDetail(${o.id})"><i class="fas fa-eye"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewOrderDetail(id) {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const itemsHtml = order.items ? order.items.map(i =>
        `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:13px;">
            <span>${i.name} × ${i.qty}</span>
            <span>KSh ${i.price * i.qty}</span>
        </div>`
    ).join('') : '';

    alert(`
        Order: ${order.order_number}
        Customer: ${order.customer_name || 'Guest'}
        Phone: ${order.customer_phone || 'N/A'}
        Payment: ${order.payment_method || 'N/A'}
        Status: ${order.status || 'pending'}
        Total: KSh ${order.total}
        Date: ${new Date(order.created_at).toLocaleString()}
        --------------------
        Items:
        ${order.items ? order.items.map(i => `${i.name} × ${i.qty} = KSh ${i.price * i.qty}`).join('\n') : ''}
    `);
}

window.viewOrderDetail = viewOrderDetail;

// ============================================================
// SALES REPORT
// ============================================================
function loadSalesData(period) {
    const now = new Date();
    let filtered = [...orders];

    if (period === 'today') {
        const today = now.toDateString();
        filtered = filtered.filter(o => new Date(o.created_at).toDateString() === today);
    } else if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(o => new Date(o.created_at) >= weekAgo);
    } else if (period === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(o => new Date(o.created_at) >= monthAgo);
    }

    const totalRevenue = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = filtered.length;
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Top category
    const categoryCount = {};
    filtered.forEach(o => {
        if (o.items) {
            o.items.forEach(i => {
                const p = products.find(pr => pr.id === i.id);
                if (p) {
                    categoryCount[p.category] = (categoryCount[p.category] || 0) + i.qty;
                }
            });
        }
    });
    let topCategory = '-';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCount)) {
        if (count > maxCount) { maxCount = count;
            topCategory = cat; }
    }

    document.getElementById('salesRevenue').textContent = `KSh ${totalRevenue}`;
    document.getElementById('salesOrders').textContent = totalOrders;
    document.getElementById('salesAverage').textContent = `KSh ${avgOrder}`;
    document.getElementById('salesTopCategory').textContent = topCategory.charAt(0).toUpperCase() + topCategory.slice(1);

    // Recent orders table
    const recent = filtered.slice(0, 10);
    document.getElementById('salesTableBody').innerHTML = recent.map(o => `
        <tr>
            <td>${o.order_number}</td>
            <td>KSh ${o.total}</td>
            <td>${o.payment_method || 'N/A'}</td>
            <td style="font-size:12px;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted);">No orders</td></tr>`;
}

window.loadSalesData = loadSalesData;

// ============================================================
// INVENTORY
// ============================================================
function renderInventory() {
    // Low stock
    const lowStock = products.filter(p => p.stock < 5);
    document.getElementById('lowStockList').innerHTML = lowStock.length ?
        lowStock.map(p => `
            <div class="inventory-item">
                <span>${p.name}</span>
                <span class="low-stock">${p.stock} left</span>
            </div>
        `).join('') :
        '<div style="color:var(--text-muted);padding:10px 0;">All items well stocked ✅</div>';

    // Category stock
    const categoryStock = {};
    products.forEach(p => {
        if (!categoryStock[p.category]) categoryStock[p.category] = 0;
        categoryStock[p.category] += p.stock;
    });
    document.getElementById('categoryStockList').innerHTML = Object.entries(categoryStock)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, stock]) => `
            <div class="inventory-item">
                <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <span>${stock} units</span>
            </div>
        `).join('');
}

// ============================================================
// PRODUCT CRUD (Admin)
// ============================================================
function openProductModal(product = null) {
    document.getElementById('editProductId').value = product ? product.id : '';
    document.getElementById('productModalTitle').innerHTML = product ?
        `<i class="fas fa-edit"></i> Edit Product` :
        `<i class="fas fa-plus-circle"></i> Add Product`;

    document.getElementById('productName').value = product ? product.name : '';
    document.getElementById('productCode').value = product ? product.code : '';
    document.getElementById('productCategory').value = product ? product.category : '';
    document.getElementById('productGender').value = product ? product.gender : 'unisex';
    document.getElementById('productPrice').value = product ? product.price : '';
    document.getElementById('productStock').value = product ? product.stock : '';
    document.getElementById('productBestQuality').checked = product ? product.best_quality : false;
    document.getElementById('imagePreview').innerHTML = product && product.image_url ?
        `<img src="${product.image_url}">` : '';

    productModal.classList.add('open');
}

function closeProductModal() {
    productModal.classList.remove('open');
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
}

window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;

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
            const { error } = await supabase.from('products').update(productData).eq('id', parseInt(id));
            if (error) throw error;
            showToast('Product updated!', 'success');
        } else {
            const { error } = await supabase.from('products').insert([productData]);
            if (error) throw error;
            showToast('Product added!', 'success');
        }
        await loadProducts();
        updateStats();
        renderCurrentTab();
        closeProductModal();
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
        const { error } = await supabase.from('products').delete().eq('id', id);
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
// SIDEBAR TOGGLE (Mobile)
// ============================================================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML =
        `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300); }, 3000);
}

window.showToast = showToast;

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCheckout();
        closeProductModal();
    }
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('posSearch').focus();
    }
});

// ============================================================
// INIT
// ============================================================
loadData();

// Auto-refresh every 30 seconds
setInterval(() => {
    loadOrders();
    updateStats();
    if (currentTab === 'orders') renderOrderTable();
    if (currentTab === 'sales') loadSalesData('today');
}, 30000);
