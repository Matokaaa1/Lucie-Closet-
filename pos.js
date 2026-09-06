// ============================================================
// LUCIE CLOSET · POS + ADMIN SYSTEM - COMPLETE FIXED
// ============================================================

// ============================================================
// SUPABASE CONFIG - FIXED (no redeclaration)
// ============================================================
const SUPABASE_URL = &#x27;https://tlsldwshtxofckvkixxz.supabase.co&#x27;;
const SUPABASE_ANON_KEY = &#x27;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsc2xkd3NodHhvZmNrdmtpeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTE1NTksImV4cCI6MjEwMzc4NzU1OX0.BAfgQG4Z28bgKSfL9Li7Gbgp62sTM-5NxB4qVQ-b0H4&#x27;;

// ✅ FIXED: Use &#x27;sb&#x27; instead of &#x27;supabase&#x27; to avoid redeclaration
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// TOAST - Must be defined first
// ============================================================
function showToast(message, type = &#x27;success&#x27;) {
    const container = document.getElementById(&#x27;toastContainer&#x27;);
    if (!container) {
        console.log(&#x27;Toast:&#x27;, message, type);
        return;
    }
    const toast = document.createElement(&#x27;div&#x27;);
    toast.className = `toast ${type}`;
    const icons = {
        &#x27;success&#x27;: &#x27;fa-check-circle&#x27;,
        &#x27;error&#x27;: &#x27;fa-exclamation-circle&#x27;,
        &#x27;warning&#x27;: &#x27;fa-exclamation-triangle&#x27;,
        &#x27;info&#x27;: &#x27;fa-info-circle&#x27;
    };
    toast.innerHTML = `&lt;i class=&quot;fas ${icons[type] || &#x27;fa-info-circle&#x27;}&quot;&gt;&lt;/i&gt; ${message}`;
    container.appendChild(toast);
    setTimeout(() =&gt; {
        toast.style.opacity = &#x27;0&#x27;;
        setTimeout(() =&gt; toast.remove(), 300);
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
let currentTab = &#x27;dashboard&#x27;;
let currentCategory = &#x27;all&#x27;;
let selectedPayment = &#x27;mpesa&#x27;;
let salesChartInstance = null;
let profitChartInstance = null;
let isInitialized = false;

// ============================================================
// PIN LOGIN STATE
// ============================================================
let pinValue = &#x27;&#x27;;
let isSubmitting = false;
let currentMethod = &#x27;pin&#x27;;
let sessionTimer = null;
let sessionTimeout = 30;
const SESSION_KEY = &#x27;luciecloset_session&#x27;;

// ============================================================
// GET DEFAULT PRODUCTS
// ============================================================
function getDefaultProducts() {
    return [
        { id: 1, code: &#x27;0001#&#x27;, name: &#x27;Classic Silk Dress&#x27;, category: &#x27;dress&#x27;, gender: &#x27;women&#x27;, price: 500, stock: 12,
            image_url: null, best_quality: true, rating: 4.8 },
        { id: 2, code: &#x27;6195-1#&#x27;, name: &#x27;Summer Floral Dress&#x27;, category: &#x27;dress&#x27;, gender: &#x27;women&#x27;, price: 500, stock: 6,
            image_url: null, best_quality: false, rating: 4.2 },
        { id: 3, code: &#x27;6169-145A&#x27;, name: &#x27;Elegant Evening Gown&#x27;, category: &#x27;dress&#x27;, gender: &#x27;women&#x27;, price: 600, stock: 6,
            image_url: null, best_quality: true, rating: 4.9 },
        { id: 4, code: &#x27;5918&#x27;, name: &#x27;Pie Top&#x27;, category: &#x27;top&#x27;, gender: &#x27;women&#x27;, price: 600, stock: 10, image_url: null,
            best_quality: false, rating: 4.2 },
        { id: 5, code: &#x27;5918 1&#x27;, name: &#x27;Polo Top with A-Top&#x27;, category: &#x27;top&#x27;, gender: &#x27;unisex&#x27;, price: 700, stock: 10,
            image_url: null, best_quality: true, rating: 4.6 },
        { id: 6, code: &#x27;13802&#x27;, name: &#x27;Cashmere Blend Sweater&#x27;, category: &#x27;sweater&#x27;, gender: &#x27;men&#x27;, price: 650, stock: 8,
            image_url: null, best_quality: true, rating: 4.7 },
        { id: 7, code: &#x27;S001&#x27;, name: &#x27;Tailored Wool Suit&#x27;, category: &#x27;suit&#x27;, gender: &#x27;men&#x27;, price: 1200, stock: 5,
            image_url: null, best_quality: true, rating: 4.9 },
    ];
}

// ============================================================
// LOAD DATA FUNCTIONS
// ============================================================
async function loadProducts() {
    try {
        // ✅ Use &#x27;sb&#x27; instead of &#x27;supabase&#x27;
        const { data, error } = await sb.from(&#x27;products&#x27;).select(&#x27;*&#x27;).order(&#x27;id&#x27;, { ascending: true });
        if (error) throw error;
        if (data &amp;&amp; data.length) {
            products = data;
        } else {
            products = getDefaultProducts();
            for (const p of products) {
                await sb.from(&#x27;products&#x27;).insert([p]);
            }
        }
        localStorage.setItem(&#x27;luciecloset_products&#x27;, JSON.stringify(products));
    } catch (e) {
        console.warn(&#x27;Supabase fallback → localStorage&#x27;, e);
        const stored = localStorage.getItem(&#x27;luciecloset_products&#x27;);
        products = stored ? JSON.parse(stored) : getDefaultProducts();
    }
}

async function loadOrders() {
    try {
        const { data, error } = await sb.from(&#x27;orders&#x27;).select(&#x27;*&#x27;).order(&#x27;created_at&#x27;, { ascending: false });
        if (error) throw error;
        orders = data || [];
        localStorage.setItem(&#x27;luciecloset_orders&#x27;, JSON.stringify(orders));
    } catch (e) {
        const stored = localStorage.getItem(&#x27;luciecloset_orders&#x27;);
        orders = stored ? JSON.parse(stored) : [];
    }
    const badge = document.getElementById(&#x27;orderBadge&#x27;);
    if (badge) badge.textContent = orders.length;
}

async function loadCustomers() {
    try {
        const { data, error } = await sb.from(&#x27;customers&#x27;).select(&#x27;*&#x27;).order(&#x27;name&#x27;, { ascending: true });
        if (error) throw error;
        customers = data || [];
        localStorage.setItem(&#x27;luciecloset_customers&#x27;, JSON.stringify(customers));
    } catch (e) {
        const stored = localStorage.getItem(&#x27;luciecloset_customers&#x27;);
        customers = stored ? JSON.parse(stored) : [];
    }
}

async function ensureAdminUser() {
    try {
        const { data: users, error } = await sb
            .from(&#x27;users&#x27;)
            .select(&#x27;id&#x27;)
            .limit(1);
            
        if (error) throw error;
        
        if (!users || users.length === 0) {
            console.log(&#x27;👤 No users found, creating admin...&#x27;);
            const { error: insertError } = await sb
                .from(&#x27;users&#x27;)
                .insert([{
                    email: &#x27;admin@luciecloset.co.ke&#x27;,
                    full_name: &#x27;System Administrator&#x27;,
                    role_id: 1,
                    status: &#x27;active&#x27;,
                    pin: &#x27;1234&#x27;,
                    pin_enabled: true,
                    phone: &#x27;+254 700 000 000&#x27;
                }]);
            if (insertError) throw insertError;
            console.log(&#x27;✅ Admin user created! Email: admin@luciecloset.co.ke, PIN: 1234&#x27;);
            showToast(&#x27;✅ Admin user created! Email: admin@luciecloset.co.ke, PIN: 1234&#x27;, &#x27;success&#x27;);
        }
    } catch (error) {
        console.warn(&#x27;Could not ensure admin user:&#x27;, error);
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
    const todayOrders = orders.filter(o =&gt; new Date(o.created_at).toDateString() === today &amp;&amp; o.status === &#x27;completed&#x27;);
    const todayRevenue = todayOrders.reduce((sum, o) =&gt; sum + (o.total || 0), 0);

    const todaySales = document.getElementById(&#x27;todaySales&#x27;);
    const bestQualityCount = document.getElementById(&#x27;bestQualityCount&#x27;);
    const totalOrders = document.getElementById(&#x27;totalOrders&#x27;);
    const lowStock = document.getElementById(&#x27;lowStock&#x27;);
    
    if (todaySales) todaySales.textContent = `KES ${todayRevenue}`;
    if (bestQualityCount) bestQualityCount.textContent = products.filter(p =&gt; p.best_quality).length;
    if (totalOrders) totalOrders.textContent = orders.length;
    if (lowStock) lowStock.textContent = products.filter(p =&gt; p.stock &lt; 5).length;
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================
function resetSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    const timeout = (sessionTimeout || 30) * 60 * 1000;
    sessionTimer = setTimeout(() =&gt; {
        showToast(&#x27;⚠️ Session expired. Please login again.&#x27;, &#x27;warning&#x27;);
        logout();
    }, timeout);
}

async function logout() {
    try {
        if (sb.auth) {
            await sb.auth.signOut().catch(() =&gt; {});
        }
    } catch (e) {}
    localStorage.removeItem(SESSION_KEY);
    showLogin();
    showToast(&#x27;Logged out successfully&#x27;, &#x27;info&#x27;);
}
window.logout = logout;

// ============================================================
// LOGIN SCREEN FUNCTIONS
// ============================================================
function showLogin() {
    const loginScreen = document.getElementById(&#x27;loginScreen&#x27;);
    const dashboardScreen = document.getElementById(&#x27;dashboardScreen&#x27;);
    if (loginScreen) loginScreen.style.display = &#x27;flex&#x27;;
    if (dashboardScreen) dashboardScreen.style.display = &#x27;none&#x27;;
    const alertEl = document.getElementById(&#x27;loginAlert&#x27;);
    if (alertEl) {
        alertEl.className = &#x27;alert&#x27;;
        alertEl.textContent = &#x27;&#x27;;
    }
}

function showDashboard() {
    const loginScreen = document.getElementById(&#x27;loginScreen&#x27;);
    const dashboardScreen = document.getElementById(&#x27;dashboardScreen&#x27;);
    if (loginScreen) loginScreen.style.display = &#x27;none&#x27;;
    if (dashboardScreen) dashboardScreen.style.display = &#x27;block&#x27;;
    
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || &#x27;{}&#x27;);
    const userName = document.getElementById(&#x27;userName&#x27;);
    const userRole = document.getElementById(&#x27;userRole&#x27;);
    const userAvatar = document.getElementById(&#x27;userAvatar&#x27;);
    
    if (userName) userName.textContent = session.user?.full_name || &#x27;Admin&#x27;;
    if (userRole) userRole.textContent = session.user?.role_name || &#x27;Administrator&#x27;;
    if (userAvatar) userAvatar.textContent = (session.user?.full_name || &#x27;A&#x27;).charAt(0).toUpperCase();
    
    loadData();
}

async function checkAuth() {
    try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (!stored) {
            console.log(&#x27;❌ No session found&#x27;);
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
        if (loginTime &amp;&amp; Date.now() - loginTime &gt; maxAge) {
            localStorage.removeItem(SESSION_KEY);
            showLogin();
            return null;
        }

        console.log(&#x27;✅ User authenticated:&#x27;, user.email);
        currentUser = user;
        updateUI(user);
        resetSessionTimer();
        showDashboard();
        return currentUser;

    } catch (error) {
        console.error(&#x27;❌ Auth error:&#x27;, error);
        localStorage.removeItem(SESSION_KEY);
        showLogin();
        return null;
    }
}

function updateUI(user) {
    const avatar = document.getElementById(&#x27;userAvatar&#x27;);
    const userName = document.getElementById(&#x27;userName&#x27;);
    const userRole = document.getElementById(&#x27;userRole&#x27;);
    
    if (avatar) avatar.textContent = user.full_name?.charAt(0).toUpperCase() || &#x27;A&#x27;;
    if (userName) userName.textContent = user.full_name || &#x27;User&#x27;;
    if (userRole) userRole.textContent = user.role_name || &#x27;Administrator&#x27;;
}

// ============================================================
// PIN FUNCTIONS
// ============================================================
function pinPress(n) {
    if (isSubmitting) return;
    if (pinValue.length &gt;= 4) return;

    const keys = document.querySelectorAll(&#x27;.key:not(.action):not(.enter)&#x27;);
    const order = [&#x27;1&#x27;,&#x27;2&#x27;,&#x27;3&#x27;,&#x27;4&#x27;,&#x27;5&#x27;,&#x27;6&#x27;,&#x27;7&#x27;,&#x27;8&#x27;,&#x27;9&#x27;,&#x27;0&#x27;];
    const idx = order.indexOf(n);
    if (idx &gt;= 0 &amp;&amp; keys[idx]) {
        keys[idx].style.transform = &#x27;scale(0.85)&#x27;;
        keys[idx].style.background = &#x27;rgba(255,255,255,0.2)&#x27;;
        setTimeout(() =&gt; {
            keys[idx].style.transform = &#x27;&#x27;;
            keys[idx].style.background = &#x27;&#x27;;
        }, 150);
    }

    if (navigator.vibrate) navigator.vibrate(8);

    pinValue += n;
    const pinInput = document.getElementById(&#x27;pinInput&#x27;);
    if (pinInput) pinInput.value = pinValue;
    renderDots();

    if (pinValue.length === 4) {
        setTimeout(() =&gt; submitPin(), 80);
    }
}
window.pinPress = pinPress;

function pinBackspace() {
    if (isSubmitting) return;
    if (pinValue.length === 0) return;

    const backspaceBtn = document.querySelector(&#x27;.key.action&#x27;);
    if (backspaceBtn) {
        backspaceBtn.style.transform = &#x27;scale(0.85)&#x27;;
        setTimeout(() =&gt; backspaceBtn.style.transform = &#x27;&#x27;, 150);
    }

    if (navigator.vibrate) navigator.vibrate(5);

    pinValue = pinValue.slice(0, -1);
    const pinInput = document.getElementById(&#x27;pinInput&#x27;);
    if (pinInput) pinInput.value = pinValue;
    renderDots();
}
window.pinBackspace = pinBackspace;

function renderDots() {
    const dots = document.querySelectorAll(&#x27;#pinDots .pin-dot&#x27;);
    dots.forEach((dot, i) =&gt; {
        if (i &lt; pinValue.length) {
            dot.classList.add(&#x27;filled&#x27;);
            if (i === pinValue.length - 1) {
                dot.style.animation = &#x27;pulse 0.2s ease&#x27;;
                setTimeout(() =&gt; dot.style.animation = &#x27;&#x27;, 300);
            }
        } else {
            dot.classList.remove(&#x27;filled&#x27;);
        }
    });
}

function shakePinDots() {
    const dots = document.querySelectorAll(&#x27;#pinDots .pin-dot&#x27;);
    dots.forEach((dot, i) =&gt; {
        dot.style.animation = `shake 0.3s ease ${i * 0.05}s`;
        dot.style.borderColor = &#x27;#EF4444&#x27;;
        setTimeout(() =&gt; {
            dot.style.animation = &#x27;&#x27;;
            dot.style.borderColor = &#x27;&#x27;;
        }, 500);
    });
}

function submitPin() {
    if (isSubmitting) return;
    if (pinValue.length &lt; 4) {
        showAlert(&#x27;Please enter 4 digits.&#x27;, &#x27;error&#x27;);
        shakePinDots();
        return;
    }

    const enterBtn = document.getElementById(&#x27;pinEnter&#x27;);
    if (enterBtn) {
        enterBtn.style.transform = &#x27;scale(0.85)&#x27;;
        setTimeout(() =&gt; enterBtn.style.transform = &#x27;&#x27;, 200);
    }

    const form = document.getElementById(&#x27;loginForm&#x27;);
    if (form) form.dispatchEvent(new Event(&#x27;submit&#x27;));
}
window.submitPin = submitPin;

// ============================================================
// SWITCH LOGIN METHOD
// ============================================================
function switchMethod(method) {
    if (isSubmitting) return;
    currentMethod = method;

    if (method === &#x27;pin&#x27;) {
        const pinPane = document.getElementById(&#x27;pinPane&#x27;);
        const emailPane = document.getElementById(&#x27;emailPane&#x27;);
        const pinTab = document.getElementById(&#x27;pinTab&#x27;);
        const emailTab = document.getElementById(&#x27;emailTab&#x27;);
        const authSub = document.getElementById(&#x27;authSub&#x27;);
        
        if (pinPane) pinPane.classList.remove(&#x27;hidden&#x27;);
        if (emailPane) emailPane.classList.add(&#x27;hidden&#x27;);
        if (pinTab) pinTab.classList.add(&#x27;active&#x27;);
        if (emailTab) emailTab.classList.remove(&#x27;active&#x27;);
        if (authSub) authSub.textContent = &#x27;Enter your email and PIN to sign in&#x27;;
        
        hideAlert();
        pinValue = &#x27;&#x27;;
        const pinInput = document.getElementById(&#x27;pinInput&#x27;);
        if (pinInput) pinInput.value = &#x27;&#x27;;
        renderDots();
        setTimeout(() =&gt; {
            const pinEmail = document.getElementById(&#x27;pinEmail&#x27;);
            if (pinEmail) pinEmail.focus();
        }, 100);
    } else {
        const pinPane = document.getElementById(&#x27;pinPane&#x27;);
        const emailPane = document.getElementById(&#x27;emailPane&#x27;);
        const pinTab = document.getElementById(&#x27;pinTab&#x27;);
        const emailTab = document.getElementById(&#x27;emailTab&#x27;);
        const authSub = document.getElementById(&#x27;authSub&#x27;);
        
        if (emailPane) emailPane.classList.remove(&#x27;hidden&#x27;);
        if (pinPane) pinPane.classList.add(&#x27;hidden&#x27;);
        if (emailTab) emailTab.classList.add(&#x27;active&#x27;);
        if (pinTab) pinTab.classList.remove(&#x27;active&#x27;);
        if (authSub) authSub.textContent = &#x27;Enter your credentials to continue&#x27;;
        
        hideAlert();
        setTimeout(() =&gt; {
            const emailInput = document.getElementById(&#x27;emailInput&#x27;);
            if (emailInput) emailInput.focus();
        }, 100);
    }
}
window.switchMethod = switchMethod;

// ============================================================
// ALERT SYSTEM
// ============================================================
function showAlert(message, type = &#x27;error&#x27;) {
    const alertEl = document.getElementById(&#x27;loginAlert&#x27;);
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = &#x27;alert &#x27; + type;
    alertEl.setAttribute(&#x27;role&#x27;, &#x27;alert&#x27;);
}

function hideAlert() {
    const alertEl = document.getElementById(&#x27;loginAlert&#x27;);
    if (!alertEl) return;
    alertEl.className = &#x27;alert&#x27;;
    alertEl.textContent = &#x27;&#x27;;
    alertEl.removeAttribute(&#x27;role&#x27;);
}

// ============================================================
// KEYBOARD SUPPORT
// ============================================================
document.addEventListener(&#x27;keydown&#x27;, function(e) {
    if (currentMethod !== &#x27;pin&#x27;) return;
    if (e.key &gt;= &#x27;0&#x27; &amp;&amp; e.key &lt;= &#x27;9&#x27;) {
        e.preventDefault();
        pinPress(e.key);
    } else if (e.key === &#x27;Backspace&#x27;) {
        e.preventDefault();
        pinBackspace();
    } else if (e.key === &#x27;Enter&#x27;) {
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
    const loginBtn = document.getElementById(&#x27;loginBtn&#x27;);
    const btnText = document.getElementById(&#x27;btnText&#x27;);
    const btnSpinner = document.getElementById(&#x27;btnSpinner&#x27;);
    
    if (loginBtn) loginBtn.disabled = true;
    if (btnText) btnText.style.display = &#x27;none&#x27;;
    if (btnSpinner) btnSpinner.style.display = &#x27;inline-block&#x27;;

    try {
        let email = &#x27;&#x27;;

        if (currentMethod === &#x27;pin&#x27;) {
            const pinEmail = document.getElementById(&#x27;pinEmail&#x27;);
            if (!pinEmail) throw new Error(&#x27;Email field not found&#x27;);
            email = pinEmail.value.trim();
            
            if (!email) throw new Error(&#x27;Please enter your email address.&#x27;);
            if (!email.includes(&#x27;@&#x27;)) throw new Error(&#x27;Please enter a valid email address.&#x27;);
            if (pinValue.length &lt; 4) throw new Error(&#x27;PIN must be 4 digits.&#x27;);

            console.log(&#x27;🔍 Looking for user:&#x27;, email);

            // ✅ Use &#x27;sb&#x27; instead of &#x27;supabase&#x27;
            const { data: user, error } = await sb
                .from(&#x27;users&#x27;)
                .select(&#x27;id, email, full_name, role_id, status, pin, pin_enabled&#x27;)
                .eq(&#x27;email&#x27;, email)
                .maybeSingle();

            if (error) {
                console.error(&#x27;❌ Database error:&#x27;, error);
                throw new Error(&#x27;Database error: &#x27; + error.message);
            }

            if (!user) {
                console.log(&#x27;❌ User not found:&#x27;, email);
                throw new Error(&#x27;User not found. Please check your email.&#x27;);
            }

            console.log(&#x27;✅ User found:&#x27;, user.email);
            console.log(&#x27;🔐 PIN in DB:&#x27;, user.pin);
            console.log(&#x27;🔑 PIN entered:&#x27;, pinValue);

            if (user.status !== &#x27;active&#x27;) {
                throw new Error(&#x27;Account is inactive. Please contact admin.&#x27;);
            }

            if (!user.pin_enabled) {
                throw new Error(&#x27;PIN is not enabled for this account. Please use email login.&#x27;);
            }

            if (user.pin !== pinValue) {
                console.log(&#x27;❌ PIN mismatch&#x27;);
                throw new Error(&#x27;Invalid PIN. Please try again.&#x27;);
            }

            console.log(&#x27;✅ PIN verified successfully!&#x27;);

            let userData = { ...user, role_name: &#x27;Admin&#x27; };
            try {
                const { data: roleData } = await sb
                    .from(&#x27;roles&#x27;)
                    .select(&#x27;name&#x27;)
                    .eq(&#x27;id&#x27;, user.role_id)
                    .maybeSingle();
                
                if (roleData) {
                    userData.role_name = roleData.name;
                }
            } catch (e) {
                console.log(&#x27;⚠️ Could not fetch role, using default&#x27;);
            }

            const sessionData = {
                user: {
                    ...userData,
                    role_name: userData.role_name || &#x27;Admin&#x27;
                },
                loginMethod: &#x27;pin&#x27;,
                loginTime: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

            try {
                await sb
                    .from(&#x27;users&#x27;)
                    .update({ last_login: new Date().toISOString() })
                    .eq(&#x27;id&#x27;, user.id);
            } catch (e) {
                console.log(&#x27;⚠️ Could not update last login&#x27;);
            }

            currentUser = sessionData.user;
            showToast(&#x27;Welcome back, &#x27; + user.full_name + &#x27;!&#x27;, &#x27;success&#x27;);
            showDashboard();

        } else {
            // Email login
            const emailInput = document.getElementById(&#x27;emailInput&#x27;);
            const passwordInput = document.getElementById(&#x27;passwordInput&#x27;);
            
            if (!emailInput || !passwordInput) throw new Error(&#x27;Form fields not found&#x27;);
            
            email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) throw new Error(&#x27;Please enter both email and password.&#x27;);
            if (!email.includes(&#x27;@&#x27;)) throw new Error(&#x27;Please enter a valid email address.&#x27;);

            const { data: authData, error: authError } = await sb.auth.signInWithPassword({
                email, password
            });

            if (authError) throw new Error(authError.message || &#x27;Authentication failed.&#x27;);

            const { data: userData, error: userError } = await sb
                .from(&#x27;users&#x27;)
                .select(&#x27;*&#x27;)
                .eq(&#x27;email&#x27;, email)
                .maybeSingle();

            if (userError || !userData) throw new Error(&#x27;User profile not found&#x27;);
            if (userData.status !== &#x27;active&#x27;) throw new Error(&#x27;Account is inactive&#x27;);

            const sessionData = {
                user: {
                    ...userData,
                    role_name: &#x27;Admin&#x27;
                },
                session: authData.session,
                loginMethod: &#x27;email&#x27;,
                loginTime: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

            currentUser = sessionData.user;
            showToast(&#x27;Welcome back, &#x27; + userData.full_name + &#x27;!&#x27;, &#x27;success&#x27;);
            showDashboard();
        }

    } catch (error) {
        showAlert(error.message, &#x27;error&#x27;);
        console.error(&#x27;Login error:&#x27;, error);
        
        if (currentMethod === &#x27;pin&#x27;) {
            pinValue = &#x27;&#x27;;
            const pinInput = document.getElementById(&#x27;pinInput&#x27;);
            if (pinInput) pinInput.value = &#x27;&#x27;;
            renderDots();
            shakePinDots();
        }
        
        const loginBtn = document.getElementById(&#x27;loginBtn&#x27;);
        const btnText = document.getElementById(&#x27;btnText&#x27;);
        const btnSpinner = document.getElementById(&#x27;btnSpinner&#x27;);
        if (loginBtn) loginBtn.disabled = false;
        if (btnText) btnText.style.display = &#x27;inline&#x27;;
        if (btnSpinner) btnSpinner.style.display = &#x27;none&#x27;;
        isSubmitting = false;
    }
}
window.handleLogin = handleLogin;

// ============================================================
// REFRESH ALL FUNCTION
// ============================================================
function refreshAll() {
    showToast(&#x27;🔄 Refreshing data...&#x27;, &#x27;info&#x27;);
    loadData();
}
window.refreshAll = refreshAll;

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(section) {
    currentTab = section;
    document.querySelectorAll(&#x27;.section-page&#x27;).forEach(el =&gt; el.classList.remove(&#x27;active&#x27;));
    document.querySelectorAll(&#x27;.sidebar-menu li&#x27;).forEach(el =&gt; el.classList.remove(&#x27;active&#x27;));

    const sectionMap = {
        &#x27;dashboard&#x27;: &#x27;dashboardSection&#x27;,
        &#x27;pos&#x27;: &#x27;posSection&#x27;,
        &#x27;orders&#x27;: &#x27;ordersSection&#x27;,
        &#x27;products&#x27;: &#x27;productsSection&#x27;,
        &#x27;inventory&#x27;: &#x27;inventorySection&#x27;,
        &#x27;customers&#x27;: &#x27;customersSection&#x27;,
        &#x27;reports&#x27;: &#x27;reportsSection&#x27;,
        &#x27;profit&#x27;: &#x27;profitSection&#x27;,
        &#x27;audit&#x27;: &#x27;auditSection&#x27;,
        &#x27;settings&#x27;: &#x27;settingsSection&#x27;
    };

    const target = document.getElementById(sectionMap[section]);
    if (target) target.classList.add(&#x27;active&#x27;);
    
    const navItem = document.querySelector(`.sidebar-menu li[data-section=&quot;${section}&quot;]`);
    if (navItem) navItem.classList.add(&#x27;active&#x27;);

    const titles = {
        &#x27;dashboard&#x27;: &#x27;📊 Dashboard&#x27;,
        &#x27;pos&#x27;: &#x27;🛒 Point of Sale&#x27;,
        &#x27;orders&#x27;: &#x27;📋 Orders&#x27;,
        &#x27;products&#x27;: &#x27;📦 Products&#x27;,
        &#x27;inventory&#x27;: &#x27;🏪 Inventory&#x27;,
        &#x27;customers&#x27;: &#x27;👤 Customers&#x27;,
        &#x27;reports&#x27;: &#x27;📊 Reports&#x27;,
        &#x27;profit&#x27;: &#x27;💰 Profit/Loss&#x27;,
        &#x27;audit&#x27;: &#x27;📜 Audit Trail&#x27;,
        &#x27;settings&#x27;: &#x27;⚙️ Settings&#x27;
    };

    const pageTitle = document.getElementById(&#x27;pageTitle&#x27;);
    if (pageTitle) pageTitle.textContent = titles[section] || section;
    
    renderCurrentTab();
    resetSessionTimer();
}
window.navigateTo = navigateTo;

function renderCurrentTab() {
    if (currentTab === &#x27;dashboard&#x27;) {
        updateGreeting();
        renderDashboard();
    } else if (currentTab === &#x27;pos&#x27;) {
        renderPOSProducts();
        updateCartUI();
    } else if (currentTab === &#x27;orders&#x27;) {
        renderOrders();
    } else if (currentTab === &#x27;products&#x27;) {
        renderProductsTable();
    } else if (currentTab === &#x27;inventory&#x27;) {
        renderInventory();
    } else if (currentTab === &#x27;customers&#x27;) {
        renderCustomersTable();
    } else if (currentTab === &#x27;reports&#x27;) {
        // handled by button
    } else if (currentTab === &#x27;profit&#x27;) {
        refreshProfitData();
    } else if (currentTab === &#x27;audit&#x27;) {
        loadAuditLogs();
    }
}

// ============================================================
// GREETING
// ============================================================
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = &#x27;Good Morning&#x27;;
    if (hour &gt;= 12 &amp;&amp; hour &lt; 17) greeting = &#x27;Good Afternoon&#x27;;
    else if (hour &gt;= 17) greeting = &#x27;Good Evening&#x27;;

    const name = currentUser?.full_name || &#x27;Admin&#x27;;
    const container = document.getElementById(&#x27;greetingContainer&#x27;);
    if (container) {
        container.innerHTML = `
            &lt;div class=&quot;greeting-banner&quot;&gt;
                &lt;h2&gt;👋 ${greeting}, ${name}!
                    &lt;span class=&quot;greeting-sub&quot;&gt;Welcome to Lucie Closet POS System&lt;/span&gt;
                &lt;/h2&gt;
            &lt;/div&gt;
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
    const container = document.getElementById(&#x27;recentOrdersTable&#x27;);
    if (!container) return;

    if (!recent.length) {
        container.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-inbox&quot;&gt;&lt;/i&gt;&lt;p&gt;No recent orders&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }

    container.innerHTML = `
        &lt;div class=&quot;table-wrapper&quot;&gt;
            &lt;table class=&quot;data-table&quot;&gt;
                &lt;thead&gt;
                    &lt;tr&gt;
                        &lt;th&gt;Order #&lt;/th&gt;
                        &lt;th&gt;Customer&lt;/th&gt;
                        &lt;th&gt;Items&lt;/th&gt;
                        &lt;th&gt;Total&lt;/th&gt;
                        &lt;th&gt;Status&lt;/th&gt;
                        &lt;th&gt;Date&lt;/th&gt;
                    &lt;/tr&gt;
                &lt;/thead&gt;
                &lt;tbody&gt;
                    ${recent.map(o =&gt; `
                        &lt;tr&gt;
                            &lt;td&gt;&lt;strong&gt;${o.order_number}&lt;/strong&gt;&lt;/td&gt;
                            &lt;td&gt;${o.customer_name || &#x27;Guest&#x27;}&lt;/td&gt;
                            &lt;td&gt;${o.items ? o.items.reduce((s,i) =&gt; s + i.qty, 0) : 0} items&lt;/td&gt;
                            &lt;td&gt;&lt;strong&gt;KES ${o.total}&lt;/strong&gt;&lt;/td&gt;
                            &lt;td&gt;&lt;span class=&quot;status-badge ${o.status || &#x27;pending&#x27;}&quot;&gt;${o.status || &#x27;pending&#x27;}&lt;/span&gt;&lt;/td&gt;
                            &lt;td style=&quot;font-size:12px;color:var(--text-muted);&quot;&gt;${new Date(o.created_at).toLocaleDateString()}&lt;/td&gt;
                        &lt;/tr&gt;
                    `).join(&#x27;&#x27;)}
                &lt;/tbody&gt;
            &lt;/table&gt;
        &lt;/div&gt;
    `;
}

function renderTopProducts() {
    const productSales = {};
    orders.forEach(o =&gt; {
        if (o.items) {
            o.items.forEach(i =&gt; {
                if (!productSales[i.id]) productSales[i.id] = { name: i.name, qty: 0, revenue: 0 };
                productSales[i.id].qty += i.qty;
                productSales[i.id].revenue += i.price * i.qty;
            });
        }
    });

    const sorted = Object.values(productSales).sort((a, b) =&gt; b.revenue - a.revenue).slice(0, 5);
    const container = document.getElementById(&#x27;topProductsList&#x27;);
    if (!container) return;

    if (!sorted.length) {
        container.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;No sales data&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }

    container.innerHTML = sorted.map((p, i) =&gt; `
        &lt;div style=&quot;display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);&quot;&gt;
            &lt;span&gt;${i+1}. ${p.name}&lt;/span&gt;
            &lt;span style=&quot;font-weight:600;color:var(--primary);&quot;&gt;KES ${p.revenue}&lt;/span&gt;
        &lt;/div&gt;
    `).join(&#x27;&#x27;);
}

function renderSalesChart() {
    const ctx = document.getElementById(&#x27;salesChart&#x27;);
    if (!ctx) return;
    const context = ctx.getContext(&#x27;2d&#x27;);
    if (salesChartInstance) salesChartInstance.destroy();

    const last7Days = [];
    const salesData = [];
    for (let i = 6; i &gt;= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        last7Days.push(date.toLocaleDateString(&#x27;en&#x27;, { weekday: &#x27;short&#x27; }));
        const dayOrders = orders.filter(o =&gt; new Date(o.created_at).toDateString() === dateStr &amp;&amp; o.status === &#x27;completed&#x27;);
        salesData.push(dayOrders.reduce((sum, o) =&gt; sum + (o.total || 0), 0));
    }

    salesChartInstance = new Chart(context, {
        type: &#x27;line&#x27;,
        data: {
            labels: last7Days,
            datasets: [{
                label: &#x27;Sales (KES)&#x27;,
                data: salesData,
                borderColor: &#x27;#C62828&#x27;,
                backgroundColor: &#x27;rgba(198,40,40,0.1)&#x27;,
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
                        callback: function(value) { return &#x27;KES &#x27; + value; }
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
    const grid = document.getElementById(&#x27;posProductGrid&#x27;);
    if (!grid) return;
    
    const search = document.getElementById(&#x27;posSearch&#x27;);
    const searchValue = search ? search.value.toLowerCase() : &#x27;&#x27;;
    let filtered = products.filter(p =&gt; {
        const matchSearch = p.name.toLowerCase().includes(searchValue) || (p.code &amp;&amp; p.code.toLowerCase().includes(searchValue));
        const matchCategory = currentCategory === &#x27;all&#x27; || p.category === currentCategory;
        return matchSearch &amp;&amp; matchCategory &amp;&amp; p.stock &gt; 0;
    });

    if (!filtered.length) {
        grid.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-box-open&quot;&gt;&lt;/i&gt;&lt;p&gt;No products available&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }

    grid.innerHTML = filtered.map(p =&gt; `
        &lt;div class=&quot;pos-product-item&quot; onclick=&quot;addToCart(${p.id})&quot;&gt;
            &lt;span class=&quot;emoji&quot;&gt;${p.category === &#x27;dress&#x27; ? &#x27;👗&#x27; : p.category === &#x27;top&#x27; ? &#x27;👕&#x27; : p.category === &#x27;sweater&#x27; ? &#x27;🧥&#x27; : &#x27;👔&#x27;}&lt;/span&gt;
            &lt;div class=&quot;name&quot;&gt;${p.name}&lt;/div&gt;
            &lt;div class=&quot;price&quot;&gt;KES ${p.price}&lt;/div&gt;
            &lt;div class=&quot;stock&quot;&gt;${p.stock} in stock&lt;/div&gt;
            ${p.best_quality ? &#x27;&lt;div class=&quot;best-tag&quot;&gt;&lt;i class=&quot;fas fa-star&quot;&gt;&lt;/i&gt; Best&lt;/div&gt;&#x27; : &#x27;&#x27;}
        &lt;/div&gt;
    `).join(&#x27;&#x27;);
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
    const product = products.find(p =&gt; p.id === productId);
    if (!product) return;
    if (product.stock &lt; 1) {
        showToast(&#x27;Out of stock!&#x27;, &#x27;error&#x27;);
        return;
    }

    const existing = cart.find(item =&gt; item.id === productId);
    if (existing) {
        if (existing.qty &gt;= product.stock) {
            showToast(&#x27;Stock limit reached&#x27;, &#x27;error&#x27;);
            return;
        }
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    showToast(`${product.name} added to cart`, &#x27;success&#x27;);
}
window.addToCart = addToCart;

function removeFromCart(productId) {
    cart = cart.filter(item =&gt; item.id !== productId);
    updateCartUI();
}
window.removeFromCart = removeFromCart;

function updateQty(productId, delta) {
    const item = cart.find(i =&gt; i.id === productId);
    if (!item) return;
    const product = products.find(p =&gt; p.id === productId);
    const newQty = item.qty + delta;

    if (newQty &lt; 1) { removeFromCart(productId); return; }
    if (product &amp;&amp; newQty &gt; product.stock) { showToast(&#x27;Stock limit reached&#x27;, &#x27;error&#x27;); return; }

    item.qty = newQty;
    updateCartUI();
}
window.updateQty = updateQty;

function updateCartUI() {
    const totalItems = cart.reduce((sum, i) =&gt; sum + i.qty, 0);
    const totalPrice = cart.reduce((sum, i) =&gt; sum + i.price * i.qty, 0);

    const cartCount = document.getElementById(&#x27;posCartCount&#x27;);
    const cartItems = document.getElementById(&#x27;posCartItems&#x27;);
    const cartTotal = document.getElementById(&#x27;posCartTotal&#x27;);
    
    if (cartCount) cartCount.textContent = `${totalItems} items`;

    if (!cart.length) {
        if (cartItems) {
            cartItems.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-plus-circle&quot;&gt;&lt;/i&gt;&lt;p&gt;Add items from the left&lt;/p&gt;&lt;/div&gt;&#x27;;
        }
    } else {
        if (cartItems) {
            cartItems.innerHTML = cart.map(item =&gt; `
                &lt;div class=&quot;cart-item&quot;&gt;
                    &lt;div class=&quot;item-info&quot;&gt;
                        &lt;div class=&quot;name&quot;&gt;${item.name}&lt;/div&gt;
                        &lt;div class=&quot;code&quot;&gt;${item.code || &#x27;N/A&#x27;}&lt;/div&gt;
                    &lt;/div&gt;
                    &lt;div class=&quot;item-qty&quot;&gt;
                        &lt;button onclick=&quot;updateQty(${item.id},-1)&quot;&gt;−&lt;/button&gt;
                        &lt;span&gt;${item.qty}&lt;/span&gt;
                        &lt;button onclick=&quot;updateQty(${item.id},1)&quot;&gt;+&lt;/button&gt;
                    &lt;/div&gt;
                    &lt;div class=&quot;item-total&quot;&gt;KES ${item.price * item.qty}&lt;/div&gt;
                    &lt;button class=&quot;remove-btn&quot; onclick=&quot;removeFromCart(${item.id})&quot;&gt;&lt;i class=&quot;fas fa-times&quot;&gt;&lt;/i&gt;&lt;/button&gt;
                &lt;/div&gt;
            `).join(&#x27;&#x27;);
        }
    }

    if (cartTotal) cartTotal.textContent = `KES ${totalPrice}`;
}
window.updateCartUI = updateCartUI;

function clearCart() {
    if (!cart.length) return;
    if (confirm(&#x27;Clear all items from cart?&#x27;)) {
        cart = [];
        updateCartUI();
        showToast(&#x27;Cart cleared&#x27;, &#x27;info&#x27;);
    }
}
window.clearCart = clearCart;

// ============================================================
// CHECKOUT
// ============================================================
function openCheckout() {
    if (!cart.length) {
        showToast(&#x27;Cart is empty&#x27;, &#x27;error&#x27;);
        return;
    }

    const total = cart.reduce((sum, i) =&gt; sum + i.price * i.qty, 0);
    const checkoutTotal = document.getElementById(&#x27;checkoutTotal&#x27;);
    const checkoutItems = document.getElementById(&#x27;checkoutItems&#x27;);
    
    if (checkoutTotal) checkoutTotal.textContent = `KES ${total}`;
    
    if (checkoutItems) {
        checkoutItems.innerHTML = cart.map(i =&gt; `
            &lt;div class=&quot;checkout-item&quot;&gt;
                &lt;span&gt;${i.name} × ${i.qty}&lt;/span&gt;
                &lt;span&gt;KES ${i.price * i.qty}&lt;/span&gt;
            &lt;/div&gt;
        `).join(&#x27;&#x27;);
    }

    const checkoutName = document.getElementById(&#x27;checkoutName&#x27;);
    const checkoutPhone = document.getElementById(&#x27;checkoutPhone&#x27;);
    const mpesaCode = document.getElementById(&#x27;mpesaCode&#x27;);
    const cashPaid = document.getElementById(&#x27;cashPaid&#x27;);
    const changeDisplay = document.getElementById(&#x27;changeDisplay&#x27;);
    const mpesaForm = document.getElementById(&#x27;mpesaForm&#x27;);
    const cashForm = document.getElementById(&#x27;cashForm&#x27;);
    
    if (checkoutName) checkoutName.value = &#x27;&#x27;;
    if (checkoutPhone) checkoutPhone.value = &#x27;&#x27;;
    if (mpesaCode) mpesaCode.value = &#x27;&#x27;;
    if (cashPaid) cashPaid.value = &#x27;&#x27;;
    if (changeDisplay) changeDisplay.textContent = &#x27;&#x27;;
    if (mpesaForm) mpesaForm.style.display = &#x27;none&#x27;;
    if (cashForm) cashForm.style.display = &#x27;none&#x27;;

    openModal(&#x27;checkoutModal&#x27;);
}
window.openCheckout = openCheckout;

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll(&#x27;.payment-methods .method&#x27;).forEach(el =&gt; el.classList.remove(&#x27;active&#x27;));
    const activeMethod = document.querySelector(`.payment-methods .method[data-method=&quot;${method}&quot;]`);
    if (activeMethod) activeMethod.classList.add(&#x27;active&#x27;);

    const mpesaForm = document.getElementById(&#x27;mpesaForm&#x27;);
    const cashForm = document.getElementById(&#x27;cashForm&#x27;);
    if (mpesaForm) mpesaForm.style.display = method === &#x27;mpesa&#x27; ? &#x27;block&#x27; : &#x27;none&#x27;;
    if (cashForm) cashForm.style.display = method === &#x27;cash&#x27; ? &#x27;block&#x27; : &#x27;none&#x27;;
}
window.selectPayment = selectPayment;

function calculateChange() {
    const total = cart.reduce((sum, i) =&gt; sum + i.price * i.qty, 0);
    const cashPaid = document.getElementById(&#x27;cashPaid&#x27;);
    const changeDisplay = document.getElementById(&#x27;changeDisplay&#x27;);
    
    if (!cashPaid || !changeDisplay) return;
    const paid = parseFloat(cashPaid.value) || 0;
    const change = paid - total;
    changeDisplay.textContent = change &gt;= 0 ? `Change: KES ${change}` : `Balance: KES ${Math.abs(change)}`;
}
window.calculateChange = calculateChange;

async function completeOrder() {
    if (!cart.length) return;

    const checkoutName = document.getElementById(&#x27;checkoutName&#x27;);
    const checkoutPhone = document.getElementById(&#x27;checkoutPhone&#x27;);
    const mpesaCode = document.getElementById(&#x27;mpesaCode&#x27;);
    
    const name = checkoutName ? checkoutName.value.trim() || &#x27;Walk-in Customer&#x27; : &#x27;Walk-in Customer&#x27;;
    const phone = checkoutPhone ? checkoutPhone.value.trim() || &#x27;N/A&#x27; : &#x27;N/A&#x27;;
    const total = cart.reduce((sum, i) =&gt; sum + i.price * i.qty, 0);

    let paymentDetails = selectedPayment;
    if (selectedPayment === &#x27;mpesa&#x27;) {
        const code = mpesaCode ? mpesaCode.value.trim() : &#x27;&#x27;;
        if (!code) { showToast(&#x27;Please enter M-Pesa transaction code&#x27;, &#x27;error&#x27;); return; }
        paymentDetails = `M-Pesa: ${code}`;
    }

    const orderData = {
        order_number: &#x27;POS-&#x27; + Date.now().toString().slice(-6),
        customer_name: name,
        customer_phone: phone,
        customer_email: &#x27;&#x27;,
        items: cart.map(i =&gt; ({ id: i.id, name: i.name, code: i.code, qty: i.qty, price: i.price })),
        total: total,
        payment_method: paymentDetails,
        status: &#x27;completed&#x27;,
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await sb.from(&#x27;orders&#x27;).insert([orderData]);
        if (error) throw error;

        for (const item of cart) {
            const product = products.find(p =&gt; p.id === item.id);
            if (product) {
                const newStock = product.stock - item.qty;
                await sb.from(&#x27;products&#x27;).update({ stock: newStock }).eq(&#x27;id&#x27;, item.id);
                product.stock = newStock;
            }
        }

        showToast(`✅ Order ${orderData.order_number} completed!`, &#x27;success&#x27;);
        generateReceipt(orderData);

        cart = [];
        updateCartUI();
        closeModal(&#x27;checkoutModal&#x27;);
        await loadProducts();
        updateStats();
        renderPOSProducts();

    } catch (e) {
        console.error(&#x27;Order error:&#x27;, e);
        showToast(&#x27;Error processing order&#x27;, &#x27;error&#x27;);
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
        ${order.items.map(i =&gt; `${i.name} × ${i.qty} = KES ${i.price * i.qty}`).join(&#x27;\n        &#x27;)}
        ---------------------------------
        Total: KES ${order.total}
        Payment: ${order.payment_method}
        ================================
        Thank you for shopping with us!
        Eastleigh 5th St, Micki Mall, Rm S12
        ================================
    `;

    const receiptContent = document.getElementById(&#x27;receiptContent&#x27;);
    if (receiptContent) receiptContent.textContent = receipt;
    openModal(&#x27;receiptModal&#x27;);

    setTimeout(() =&gt; printReceipt(), 500);
}

function printReceipt() {
    const receiptContent = document.getElementById(&#x27;receiptContent&#x27;);
    if (!receiptContent) return;
    
    const content = receiptContent.textContent;
    const printWindow = window.open(&#x27;&#x27;, &#x27;_blank&#x27;, &#x27;width=400,height=600&#x27;);
    if (printWindow) {
        printWindow.document.write(`
            &lt;html&gt;&lt;head&gt;&lt;title&gt;Receipt&lt;/title&gt;
            &lt;style&gt;body{font-family:monospace;padding:20px;white-space:pre-wrap;font-size:14px;}&lt;/style&gt;
            &lt;/head&gt;&lt;body&gt;${content}&lt;/body&gt;&lt;/html&gt;
        `);
        printWindow.document.close();
        printWindow.print();
    }
}
window.printReceipt = printReceipt;

// ============================================================
// ORDERS
// ============================================================
function renderOrders(filter = &#x27;all&#x27;) {
    let filtered = [...orders];

    if (filter !== &#x27;all&#x27;) {
        filtered = filtered.filter(o =&gt; o.status === filter);
    }

    const countAll = document.getElementById(&#x27;countAll&#x27;);
    const countPending = document.getElementById(&#x27;countPending&#x27;);
    const countCompleted = document.getElementById(&#x27;countCompleted&#x27;);
    const countCancelled = document.getElementById(&#x27;countCancelled&#x27;);
    const orderCount = document.getElementById(&#x27;orderCount&#x27;);
    const ordersContainer = document.getElementById(&#x27;ordersContainer&#x27;);
    
    if (countAll) countAll.textContent = orders.length;
    if (countPending) countPending.textContent = orders.filter(o =&gt; o.status === &#x27;pending&#x27;).length;
    if (countCompleted) countCompleted.textContent = orders.filter(o =&gt; o.status === &#x27;completed&#x27;).length;
    if (countCancelled) countCancelled.textContent = orders.filter(o =&gt; o.status === &#x27;cancelled&#x27;).length;
    if (orderCount) orderCount.textContent = filtered.length;

    if (!ordersContainer) return;

    if (!filtered.length) {
        ordersContainer.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-inbox&quot;&gt;&lt;/i&gt;&lt;p&gt;No orders found&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }

    ordersContainer.innerHTML = `
        &lt;div class=&quot;table-wrapper&quot;&gt;
            &lt;table class=&quot;data-table&quot;&gt;
                &lt;thead&gt;
                    &lt;tr&gt;
                        &lt;th&gt;Order #&lt;/th&gt;
                        &lt;th&gt;Customer&lt;/th&gt;
                        &lt;th&gt;Items&lt;/th&gt;
                        &lt;th&gt;Total&lt;/th&gt;
                        &lt;th&gt;Payment&lt;/th&gt;
                        &lt;th&gt;Status&lt;/th&gt;
                        &lt;th&gt;Date&lt;/th&gt;
                        &lt;th&gt;Actions&lt;/th&gt;
                    &lt;/tr&gt;
                &lt;/thead&gt;
                &lt;tbody&gt;
                    ${filtered.map(o =&gt; `
                        &lt;tr&gt;
                            &lt;td&gt;&lt;strong&gt;${o.order_number}&lt;/strong&gt;&lt;/td&gt;
                            &lt;td&gt;${o.customer_name || &#x27;Guest&#x27;}&lt;/td&gt;
                            &lt;td&gt;${o.items ? o.items.reduce((s,i) =&gt; s + i.qty, 0) : 0} items&lt;/td&gt;
                            &lt;td&gt;&lt;strong&gt;KES ${o.total}&lt;/strong&gt;&lt;/td&gt;
                            &lt;td&gt;${o.payment_method || &#x27;N/A&#x27;}&lt;/td&gt;
                            &lt;td&gt;&lt;span class=&quot;status-badge ${o.status || &#x27;pending&#x27;}&quot;&gt;${o.status || &#x27;pending&#x27;}&lt;/span&gt;&lt;/td&gt;
                            &lt;td style=&quot;font-size:12px;color:var(--text-muted);&quot;&gt;${new Date(o.created_at).toLocaleDateString()}&lt;/td&gt;
                            &lt;td&gt;
                                &lt;button class=&quot;btn btn-sm btn-primary&quot; onclick=&quot;viewOrder(${o.id})&quot;&gt;&lt;i class=&quot;fas fa-eye&quot;&gt;&lt;/i&gt;&lt;/button&gt;
                                ${o.status !== &#x27;completed&#x27; ? `&lt;button class=&quot;btn btn-sm btn-success&quot; onclick=&quot;updateOrderStatus(${o.id},&#x27;completed&#x27;)&quot;&gt;&lt;i class=&quot;fas fa-check&quot;&gt;&lt;/i&gt;&lt;/button&gt;` : &#x27;&#x27;}
                                ${o.status !== &#x27;cancelled&#x27; &amp;&amp; o.status !== &#x27;completed&#x27; ? `&lt;button class=&quot;btn btn-sm btn-danger&quot; onclick=&quot;updateOrderStatus(${o.id},&#x27;cancelled&#x27;)&quot;&gt;&lt;i class=&quot;fas fa-times&quot;&gt;&lt;/i&gt;&lt;/button&gt;` : &#x27;&#x27;}
                            &lt;/td&gt;
                        &lt;/tr&gt;
                    `).join(&#x27;&#x27;)}
                &lt;/tbody&gt;
            &lt;/table&gt;
        &lt;/div&gt;
    `;
}
window.renderOrders = renderOrders;

function viewOrder(id) {
    const order = orders.find(o =&gt; o.id === id);
    if (!order) return;

    alert(`
        Order: ${order.order_number}
        Customer: ${order.customer_name || &#x27;Guest&#x27;}
        Phone: ${order.customer_phone || &#x27;N/A&#x27;}
        Payment: ${order.payment_method || &#x27;N/A&#x27;}
        Status: ${order.status || &#x27;pending&#x27;}
        Total: KES ${order.total}
        Date: ${new Date(order.created_at).toLocaleString()}
        --------------------
        Items:
        ${order.items ? order.items.map(i =&gt; `${i.name} × ${i.qty} = KES ${i.price * i.qty}`).join(&#x27;\n&#x27;) : &#x27;&#x27;}
    `);
}
window.viewOrder = viewOrder;

async function updateOrderStatus(id, status) {
    try {
        const { error } = await sb.from(&#x27;orders&#x27;).update({ status }).eq(&#x27;id&#x27;, id);
        if (error) throw error;
        showToast(`Order ${status}`, &#x27;success&#x27;);
        await loadOrders();
        const activeFilter = document.querySelector(&#x27;.filter-btn.active&#x27;);
        renderOrders(activeFilter ? activeFilter.dataset.filter : &#x27;all&#x27;);
        updateStats();
    } catch (e) {
        showToast(&#x27;Error updating order&#x27;, &#x27;error&#x27;);
    }
}
window.updateOrderStatus = updateOrderStatus;

// ============================================================
// PRODUCTS TABLE
// ============================================================
function renderProductsTable() {
    const container = document.getElementById(&#x27;productsTable&#x27;);
    if (!container) return;

    if (!products.length) {
        container.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-box-open&quot;&gt;&lt;/i&gt;&lt;p&gt;No products found&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }

    container.innerHTML = `
        &lt;div class=&quot;table-wrapper&quot;&gt;
            &lt;table class=&quot;data-table&quot;&gt;
                &lt;thead&gt;
                    &lt;tr&gt;
                        &lt;th&gt;Product&lt;/th&gt;
                        &lt;th&gt;Code&lt;/th&gt;
                        &lt;th&gt;Category&lt;/th&gt;
                        &lt;th&gt;Price&lt;/th&gt;
                        &lt;th&gt;Stock&lt;/th&gt;
                        &lt;th&gt;Status&lt;/th&gt;
                        &lt;th&gt;Actions&lt;/th&gt;
                    &lt;/tr&gt;
                &lt;/thead&gt;
                &lt;tbody&gt;
                    ${products.map(p =&gt; `
                        &lt;tr&gt;
                            &lt;td&gt;
                                &lt;div style=&quot;display:flex;align-items:center;gap:10px;&quot;&gt;
                                    &lt;span style=&quot;font-size:24px;&quot;&gt;${p.category === &#x27;dress&#x27; ? &#x27;👗&#x27; : p.category === &#x27;top&#x27; ? &#x27;👕&#x27; : &#x27;👔&#x27;}&lt;/span&gt;
                                    &lt;div&gt;
                                        &lt;div style=&quot;font-weight:600;&quot;&gt;${p.name}&lt;/div&gt;
                                        &lt;div style=&quot;font-size:12px;color:var(--text-muted);&quot;&gt;${p.code || &#x27;N/A&#x27;}&lt;/div&gt;
                                    &lt;/div&gt;
                                &lt;/div&gt;
                            &lt;/td&gt;
                            &lt;td&gt;${p.code || &#x27;N/A&#x27;}&lt;/td&gt;
                            &lt;td&gt;${p.category}&lt;/td&gt;
                            &lt;td&gt;KES ${p.price}&lt;/td&gt;
                            &lt;td&gt;${p.stock}&lt;/td&gt;
                            &lt;td&gt;${p.best_quality ? &#x27;&lt;span class=&quot;badge primary&quot;&gt;&lt;i class=&quot;fas fa-star&quot;&gt;&lt;/i&gt; Best&lt;/span&gt;&#x27; : &#x27;Standard&#x27;}&lt;/td&gt;
                            &lt;td&gt;
                                &lt;button class=&quot;btn btn-sm btn-primary&quot; onclick=&quot;editProduct(${p.id})&quot;&gt;&lt;i class=&quot;fas fa-edit&quot;&gt;&lt;/i&gt;&lt;/button&gt;
                                &lt;button class=&quot;btn btn-sm btn-danger&quot; onclick=&quot;deleteProduct(${p.id})&quot;&gt;&lt;i class=&quot;fas fa-trash&quot;&gt;&lt;/i&gt;&lt;/button&gt;
                            &lt;/td&gt;
                        &lt;/tr&gt;
                    `).join(&#x27;&#x27;)}
                &lt;/tbody&gt;
            &lt;/table&gt;
        &lt;/div&gt;
    `;
}
window.renderProductsTable = renderProductsTable;

function openProductModal(product = null) {
    const editId = document.getElementById(&#x27;editProductId&#x27;);
    const modalTitle = document.getElementById(&#x27;productModalTitle&#x27;);
    const saveBtn = document.getElementById(&#x27;saveProductBtn&#x27;);
    const productName = document.getElementById(&#x27;productName&#x27;);
    const productCode = document.getElementById(&#x27;productCode&#x27;);
    const productCategory = document.getElementById(&#x27;productCategory&#x27;);
    const productGender = document.getElementById(&#x27;productGender&#x27;);
    const productPrice = document.getElementById(&#x27;productPrice&#x27;);
    const productStock = document.getElementById(&#x27;productStock&#x27;);
    const productBestQuality = document.getElementById(&#x27;productBestQuality&#x27;);
    const imagePreview = document.getElementById(&#x27;imagePreview&#x27;);
    
    if (editId) editId.value = product ? product.id : &#x27;&#x27;;
    if (modalTitle) modalTitle.textContent = product ? &#x27;✏️ Edit Product&#x27; : &#x27;📦 Add Product&#x27;;
    if (saveBtn) saveBtn.innerHTML = product ? &#x27;&lt;i class=&quot;fas fa-save&quot;&gt;&lt;/i&gt; Update&#x27; : &#x27;&lt;i class=&quot;fas fa-save&quot;&gt;&lt;/i&gt; Save&#x27;;
    if (productName) productName.value = product ? product.name : &#x27;&#x27;;
    if (productCode) productCode.value = product ? product.code : &#x27;&#x27;;
    if (productCategory) productCategory.value = product ? product.category : &#x27;&#x27;;
    if (productGender) productGender.value = product ? product.gender : &#x27;unisex&#x27;;
    if (productPrice) productPrice.value = product ? product.price : &#x27;&#x27;;
    if (productStock) productStock.value = product ? product.stock : &#x27;&#x27;;
    if (productBestQuality) productBestQuality.checked = product ? product.best_quality : false;
    if (imagePreview) imagePreview.innerHTML = product &amp;&amp; product.image_url ? `&lt;img src=&quot;${product.image_url}&quot;&gt;` : &#x27;&#x27;;

    openModal(&#x27;productModal&#x27;);
}
window.openProductModal = openProductModal;

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById(&#x27;editProductId&#x27;);
    const productName = document.getElementById(&#x27;productName&#x27;);
    const productCode = document.getElementById(&#x27;productCode&#x27;);
    const productCategory = document.getElementById(&#x27;productCategory&#x27;);
    const productGender = document.getElementById(&#x27;productGender&#x27;);
    const productPrice = document.getElementById(&#x27;productPrice&#x27;);
    const productStock = document.getElementById(&#x27;productStock&#x27;);
    const productBestQuality = document.getElementById(&#x27;productBestQuality&#x27;);

    if (!productName || !productCode || !productCategory || !productPrice || !productStock) return;

    const name = productName.value.trim();
    const code = productCode.value.trim();
    const category = productCategory.value;
    const gender = productGender ? productGender.value : &#x27;unisex&#x27;;
    const price = parseInt(productPrice.value);
    const stock = parseInt(productStock.value);
    const best_quality = productBestQuality ? productBestQuality.checked : false;

    if (!name || !code || !category || !price || isNaN(stock)) {
        showToast(&#x27;Please fill in all required fields&#x27;, &#x27;error&#x27;);
        return;
    }

    const productData = { name, code, category, gender, price, stock, best_quality };

    try {
        if (id &amp;&amp; id.value) {
            const { error } = await sb.from(&#x27;products&#x27;).update(productData).eq(&#x27;id&#x27;, parseInt(id.value));
            if (error) throw error;
            showToast(&#x27;Product updated!&#x27;, &#x27;success&#x27;);
        } else {
            const { error } = await sb.from(&#x27;products&#x27;).insert([productData]);
            if (error) throw error;
            showToast(&#x27;Product added!&#x27;, &#x27;success&#x27;);
        }
        await loadProducts();
        updateStats();
        renderCurrentTab();
        closeModal(&#x27;productModal&#x27;);
    } catch (e) {
        showToast(&#x27;Error saving product&#x27;, &#x27;error&#x27;);
    }
}
window.saveProduct = saveProduct;

function editProduct(id) {
    const product = products.find(p =&gt; p.id === id);
    if (product) openProductModal(product);
}
window.editProduct = editProduct;

async function deleteProduct(id) {
    if (!confirm(&#x27;Delete this product?&#x27;)) return;
    try {
        const { error } = await sb.from(&#x27;products&#x27;).delete().eq(&#x27;id&#x27;, id);
        if (error) throw error;
        showToast(&#x27;Product deleted&#x27;, &#x27;success&#x27;);
        await loadProducts();
        updateStats();
        renderCurrentTab();
    } catch (e) {
        showToast(&#x27;Error deleting product&#x27;, &#x27;error&#x27;);
    }
}
window.deleteProduct = deleteProduct;

// ============================================================
// INVENTORY
// ============================================================
function renderInventory() {
    const stockProduct = document.getElementById(&#x27;stockProduct&#x27;);
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p =&gt;
            `&lt;option value=&quot;${p.id}&quot;&gt;${p.name} (${p.stock} in stock)&lt;/option&gt;`
        ).join(&#x27;&#x27;);
    }

    const inventoryTable = document.getElementById(&#x27;inventoryTable&#x27;);
    if (inventoryTable) {
        if (!products.length) {
            inventoryTable.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;No products&lt;/p&gt;&lt;/div&gt;&#x27;;
        } else {
            inventoryTable.innerHTML = `
                &lt;div class=&quot;table-wrapper&quot;&gt;
                    &lt;table class=&quot;data-table&quot;&gt;
                        &lt;thead&gt;
                            &lt;tr&gt;
                                &lt;th&gt;Product&lt;/th&gt;
                                &lt;th&gt;Stock&lt;/th&gt;
                                &lt;th&gt;Status&lt;/th&gt;
                            &lt;/tr&gt;
                        &lt;/thead&gt;
                        &lt;tbody&gt;
                            ${products.map(p =&gt; `
                                &lt;tr&gt;
                                    &lt;td&gt;${p.name}&lt;/td&gt;
                                    &lt;td&gt;${p.stock}&lt;/td&gt;
                                    &lt;td&gt;${p.stock &lt; 5 ? &#x27;&lt;span class=&quot;badge danger&quot;&gt;⚠️ Low Stock&lt;/span&gt;&#x27; : &#x27;&lt;span class=&quot;badge success&quot;&gt;✅ In Stock&lt;/span&gt;&#x27;}&lt;/td&gt;
                                &lt;/tr&gt;
                            `).join(&#x27;&#x27;)}
                        &lt;/tbody&gt;
                    &lt;/table&gt;
                &lt;/div&gt;
            `;
        }
    }

    const categoryStockList = document.getElementById(&#x27;categoryStockList&#x27;);
    if (categoryStockList) {
        const categoryStock = {};
        products.forEach(p =&gt; {
            if (!categoryStock[p.category]) categoryStock[p.category] = 0;
            categoryStock[p.category] += p.stock;
        });

        categoryStockList.innerHTML = Object.entries(categoryStock)
            .sort((a, b) =&gt; b[1] - a[1])
            .map(([cat, stock]) =&gt; `
                &lt;div style=&quot;display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);&quot;&gt;
                    &lt;span&gt;${cat.charAt(0).toUpperCase() + cat.slice(1)}&lt;/span&gt;
                    &lt;span&gt;${stock} units&lt;/span&gt;
                &lt;/div&gt;
            `).join(&#x27;&#x27;) || &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;No categories&lt;/p&gt;&lt;/div&gt;&#x27;;
    }
}
window.renderInventory = renderInventory;

function openStockModal() {
    const stockProduct = document.getElementById(&#x27;stockProduct&#x27;);
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p =&gt;
            `&lt;option value=&quot;${p.id}&quot;&gt;${p.name} (${p.stock} in stock)&lt;/option&gt;`
        ).join(&#x27;&#x27;);
    }
    const adjustmentQty = document.getElementById(&#x27;adjustmentQty&#x27;);
    const adjustmentReason = document.getElementById(&#x27;adjustmentReason&#x27;);
    if (adjustmentQty) adjustmentQty.value = &#x27;&#x27;;
    if (adjustmentReason) adjustmentReason.value = &#x27;&#x27;;
    openModal(&#x27;stockModal&#x27;);
}
window.openStockModal = openStockModal;

async function adjustStock(e) {
    e.preventDefault();
    const stockProduct = document.getElementById(&#x27;stockProduct&#x27;);
    const adjustmentType = document.getElementById(&#x27;adjustmentType&#x27;);
    const adjustmentQty = document.getElementById(&#x27;adjustmentQty&#x27;);
    const adjustmentReason = document.getElementById(&#x27;adjustmentReason&#x27;);

    if (!stockProduct || !adjustmentType || !adjustmentQty) return;

    const productId = parseInt(stockProduct.value);
    const type = adjustmentType.value;
    const qty = parseFloat(adjustmentQty.value);
    const reason = adjustmentReason ? adjustmentReason.value || &#x27;Manual adjustment&#x27; : &#x27;Manual adjustment&#x27;;

    if (!productId || !qty || qty &lt;= 0) {
        showToast(&#x27;Please enter valid quantity&#x27;, &#x27;error&#x27;);
        return;
    }

    const product = products.find(p =&gt; p.id === productId);
    if (!product) return;

    const newStock = type === &#x27;add&#x27; ? product.stock + qty : Math.max(0, product.stock - qty);

    try {
        const { error } = await sb.from(&#x27;products&#x27;).update({ stock: newStock }).eq(&#x27;id&#x27;, productId);
        if (error) throw error;

        showToast(`Stock updated: ${product.name} → ${newStock}`, &#x27;success&#x27;);
        await loadProducts();
        renderCurrentTab();
        closeModal(&#x27;stockModal&#x27;);
    } catch (e) {
        showToast(&#x27;Error adjusting stock&#x27;, &#x27;error&#x27;);
    }
}
window.adjustStock = adjustStock;

// ============================================================
// CUSTOMERS
// ============================================================
function renderCustomersTable() {
    const container = document.getElementById(&#x27;customersTable&#x27;);
    if (!container) return;

    if (!customers.length) {
        container.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-users&quot;&gt;&lt;/i&gt;&lt;p&gt;No customers found&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }

    container.innerHTML = `
        &lt;div class=&quot;table-wrapper&quot;&gt;
            &lt;table class=&quot;data-table&quot;&gt;
                &lt;thead&gt;
                    &lt;tr&gt;
                        &lt;th&gt;Name&lt;/th&gt;
                        &lt;th&gt;Phone&lt;/th&gt;
                        &lt;th&gt;Email&lt;/th&gt;
                        &lt;th&gt;Orders&lt;/th&gt;
                        &lt;th&gt;Actions&lt;/th&gt;
                    &lt;/tr&gt;
                &lt;/thead&gt;
                &lt;tbody&gt;
                    ${customers.map(c =&gt; `
                        &lt;tr&gt;
                            &lt;td&gt;&lt;strong&gt;${c.name}&lt;/strong&gt;&lt;/td&gt;
                            &lt;td&gt;${c.phone}&lt;/td&gt;
                            &lt;td&gt;${c.email || &#x27;-&#x27;}&lt;/td&gt;
                            &lt;td&gt;${orders.filter(o =&gt; o.customer_phone === c.phone).length}&lt;/td&gt;
                            &lt;td&gt;
                                &lt;button class=&quot;btn btn-sm btn-danger&quot; onclick=&quot;deleteCustomer(${c.id})&quot;&gt;&lt;i class=&quot;fas fa-trash&quot;&gt;&lt;/i&gt;&lt;/button&gt;
                            &lt;/td&gt;
                        &lt;/tr&gt;
                    `).join(&#x27;&#x27;)}
                &lt;/tbody&gt;
            &lt;/table&gt;
        &lt;/div&gt;
    `;
}
window.renderCustomersTable = renderCustomersTable;

function openCustomerModal(customer = null) {
    const editId = document.getElementById(&#x27;editCustomerId&#x27;);
    const modalTitle = document.getElementById(&#x27;customerModalTitle&#x27;);
    const customerName = document.getElementById(&#x27;customerName&#x27;);
    const customerPhone = document.getElementById(&#x27;customerPhone&#x27;);
    const customerEmail = document.getElementById(&#x27;customerEmail&#x27;);
    
    if (editId) editId.value = customer ? customer.id : &#x27;&#x27;;
    if (modalTitle) modalTitle.textContent = customer ? &#x27;✏️ Edit Customer&#x27; : &#x27;👤 Add Customer&#x27;;
    if (customerName) customerName.value = customer ? customer.name : &#x27;&#x27;;
    if (customerPhone) customerPhone.value = customer ? customer.phone : &#x27;&#x27;;
    if (customerEmail) customerEmail.value = customer ? customer.email : &#x27;&#x27;;
    
    openModal(&#x27;customerModal&#x27;);
}
window.openCustomerModal = openCustomerModal;

async function saveCustomer(e) {
    e.preventDefault();
    const editId = document.getElementById(&#x27;editCustomerId&#x27;);
    const customerName = document.getElementById(&#x27;customerName&#x27;);
    const customerPhone = document.getElementById(&#x27;customerPhone&#x27;);
    const customerEmail = document.getElementById(&#x27;customerEmail&#x27;);

    if (!customerName || !customerPhone) return;

    const name = customerName.value.trim();
    const phone = customerPhone.value.trim();
    const email = customerEmail ? customerEmail.value.trim() : &#x27;&#x27;;

    if (!name || !phone) {
        showToast(&#x27;Please fill in name and phone&#x27;, &#x27;error&#x27;);
        return;
    }

    const data = { name, phone, email };

    try {
        if (editId &amp;&amp; editId.value) {
            const { error } = await sb.from(&#x27;customers&#x27;).update(data).eq(&#x27;id&#x27;, parseInt(editId.value));
            if (error) throw error;
            showToast(&#x27;Customer updated!&#x27;, &#x27;success&#x27;);
        } else {
            const { error } = await sb.from(&#x27;customers&#x27;).insert([data]);
            if (error) throw error;
            showToast(&#x27;Customer added!&#x27;, &#x27;success&#x27;);
        }
        await loadCustomers();
        renderCurrentTab();
        closeModal(&#x27;customerModal&#x27;);
    } catch (e) {
        showToast(&#x27;Error saving customer&#x27;, &#x27;error&#x27;);
    }
}
window.saveCustomer = saveCustomer;

async function deleteCustomer(id) {
    if (!confirm(&#x27;Delete this customer?&#x27;)) return;
    try {
        const { error } = await sb.from(&#x27;customers&#x27;).delete().eq(&#x27;id&#x27;, id);
        if (error) throw error;
        showToast(&#x27;Customer deleted&#x27;, &#x27;success&#x27;);
        await loadCustomers();
        renderCurrentTab();
    } catch (e) {
        showToast(&#x27;Error deleting customer&#x27;, &#x27;error&#x27;);
    }
}
window.deleteCustomer = deleteCustomer;

// ============================================================
// REPORTS
// ============================================================
function generateReport() {
    const reportStart = document.getElementById(&#x27;reportStart&#x27;);
    const reportEnd = document.getElementById(&#x27;reportEnd&#x27;);
    const reportContent = document.getElementById(&#x27;reportContent&#x27;);

    if (!reportStart || !reportEnd || !reportContent) return;

    const start = reportStart.value;
    const end = reportEnd.value;

    if (!start || !end) {
        showToast(&#x27;Please select both dates&#x27;, &#x27;warning&#x27;);
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59);

    const filtered = orders.filter(o =&gt; {
        const date = new Date(o.created_at);
        return date &gt;= startDate &amp;&amp; date &lt;= endDate &amp;&amp; o.status === &#x27;completed&#x27;;
    });

    const total = filtered.reduce((sum, o) =&gt; sum + (o.total || 0), 0);
    const count = filtered.length;

    reportContent.innerHTML = `
        &lt;div style=&quot;display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;&quot;&gt;
            &lt;div style=&quot;background:var(--bg);padding:16px;border-radius:var(--radius-sm);text-align:center;&quot;&gt;
                &lt;div style=&quot;font-size:12px;color:var(--text-muted);&quot;&gt;Total Sales&lt;/div&gt;
                &lt;div style=&quot;font-size:24px;font-weight:700;color:var(--primary);&quot;&gt;KES ${total}&lt;/div&gt;
            &lt;/div&gt;
            &lt;div style=&quot;background:var(--bg);padding:16px;border-radius:var(--radius-sm);text-align:center;&quot;&gt;
                &lt;div style=&quot;font-size:12px;color:var(--text-muted);&quot;&gt;Orders&lt;/div&gt;
                &lt;div style=&quot;font-size:24px;font-weight:700;color:var(--success);&quot;&gt;${count}&lt;/div&gt;
            &lt;/div&gt;
        &lt;/div&gt;
        &lt;div style=&quot;max-height:300px;overflow-y:auto;&quot;&gt;
            ${filtered.length ? filtered.map(o =&gt; `
                &lt;div style=&quot;display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;&quot;&gt;
                    &lt;span&gt;${o.order_number}&lt;/span&gt;
                    &lt;span&gt;${o.customer_name || &#x27;Guest&#x27;}&lt;/span&gt;
                    &lt;span&gt;&lt;strong&gt;KES ${o.total}&lt;/strong&gt;&lt;/span&gt;
                    &lt;span style=&quot;color:var(--text-muted);font-size:12px;&quot;&gt;${new Date(o.created_at).toLocaleDateString()}&lt;/span&gt;
                &lt;/div&gt;
            `).join(&#x27;&#x27;) : &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;No orders in this period&lt;/p&gt;&lt;/div&gt;&#x27;}
        &lt;/div&gt;
    `;
}
window.generateReport = generateReport;

function exportReport(format) {
    showToast(`Exporting ${format.toUpperCase()}...`, &#x27;info&#x27;);
    setTimeout(() =&gt; showToast(`✅ ${format.toUpperCase()} exported!`, &#x27;success&#x27;), 1500);
}
window.exportReport = exportReport;

// ============================================================
// PROFIT/LOSS
// ============================================================
function refreshProfitData() {
    const completedOrders = orders.filter(o =&gt; o.status === &#x27;completed&#x27;);
    const totalRevenue = completedOrders.reduce((sum, o) =&gt; sum + (o.total || 0), 0);
    const costPercentage = 0.6;
    const totalCost = totalRevenue * costPercentage;
    const netProfit = totalRevenue - totalCost;

    const totalRevenueEl = document.getElementById(&#x27;totalRevenue&#x27;);
    const totalCostEl = document.getElementById(&#x27;totalCost&#x27;);
    const netProfitEl = document.getElementById(&#x27;netProfit&#x27;);
    
    if (totalRevenueEl) totalRevenueEl.textContent = `KES ${totalRevenue.toFixed(2)}`;
    if (totalCostEl) totalCostEl.textContent = `KES ${totalCost.toFixed(2)}`;
    if (netProfitEl) netProfitEl.textContent = `KES ${netProfit.toFixed(2)}`;

    renderProfitChart(totalRevenue, totalCost, netProfit);
}
window.refreshProfitData = refreshProfitData;

function renderProfitChart(revenue, cost, profit) {
    const ctx = document.getElementById(&#x27;profitChart&#x27;);
    if (!ctx) return;
    const context = ctx.getContext(&#x27;2d&#x27;);
    if (profitChartInstance) profitChartInstance.destroy();

    profitChartInstance = new Chart(context, {
        type: &#x27;doughnut&#x27;,
        data: {
            labels: [&#x27;Revenue&#x27;, &#x27;Cost&#x27;, &#x27;Profit&#x27;],
            datasets: [{
                data: [revenue, cost, profit],
                backgroundColor: [&#x27;#10B981&#x27;, &#x27;#EF4444&#x27;, &#x27;#C62828&#x27;],
                borderWidth: 2,
                borderColor: &#x27;#fff&#x27;
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: &#x27;bottom&#x27;,
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: &#x27;circle&#x27;
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
    const logs = JSON.parse(localStorage.getItem(&#x27;luciecloset_audit&#x27;) || &#x27;[]&#x27;);
    const auditTable = document.getElementById(&#x27;auditTable&#x27;);
    if (!auditTable) return;

    if (!logs.length) {
        auditTable.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-history&quot;&gt;&lt;/i&gt;&lt;p&gt;No audit logs found&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }

    auditTable.innerHTML = `
        &lt;div class=&quot;table-wrapper&quot;&gt;
            &lt;table class=&quot;data-table&quot;&gt;
                &lt;thead&gt;
                    &lt;tr&gt;
                        &lt;th&gt;Time&lt;/th&gt;
                        &lt;th&gt;User&lt;/th&gt;
                        &lt;th&gt;Action&lt;/th&gt;
                        &lt;th&gt;Details&lt;/th&gt;
                    &lt;/tr&gt;
                &lt;/thead&gt;
                &lt;tbody&gt;
                    ${logs.slice(0, 50).map(log =&gt; `
                        &lt;tr&gt;
                            &lt;td style=&quot;font-size:12px;color:var(--text-muted);&quot;&gt;${new Date(log.timestamp).toLocaleString()}&lt;/td&gt;
                            &lt;td&gt;${log.user || &#x27;System&#x27;}&lt;/td&gt;
                            &lt;td&gt;&lt;span class=&quot;badge primary&quot;&gt;${log.action}&lt;/span&gt;&lt;/td&gt;
                            &lt;td&gt;${log.details || &#x27;-&#x27;}&lt;/td&gt;
                        &lt;/tr&gt;
                    `).join(&#x27;&#x27;)}
                &lt;/tbody&gt;
            &lt;/table&gt;
        &lt;/div&gt;
    `;
}
window.loadAuditLogs = loadAuditLogs;

// ============================================================
// SETTINGS
// ============================================================
function saveSettings(e) {
    e.preventDefault();
    const businessName = document.getElementById(&#x27;businessName&#x27;);
    const businessPhone = document.getElementById(&#x27;businessPhone&#x27;);
    const businessEmail = document.getElementById(&#x27;businessEmail&#x27;);
    const businessLocation = document.getElementById(&#x27;businessLocation&#x27;);
    const receiptFooter = document.getElementById(&#x27;receiptFooter&#x27;);
    
    const settings = {
        businessName: businessName ? businessName.value : &#x27;Lucie Closet&#x27;,
        phone: businessPhone ? businessPhone.value : &#x27;+254 794 789 345&#x27;,
        email: businessEmail ? businessEmail.value : &#x27;info@luciecloset.co.ke&#x27;,
        location: businessLocation ? businessLocation.value : &#x27;Eastleigh 5th St, Micki Mall, Rm S12&#x27;,
        receiptFooter: receiptFooter ? receiptFooter.value : &#x27;Thank you for shopping at Lucie Closet! 👗&#x27;
    };
    localStorage.setItem(&#x27;luciecloset_settings&#x27;, JSON.stringify(settings));
    showToast(&#x27;Settings saved!&#x27;, &#x27;success&#x27;);
}
window.saveSettings = saveSettings;

function savePaymentSettings(e) {
    e.preventDefault();
    const defaultPayment = document.getElementById(&#x27;defaultPayment&#x27;);
    const mpesaShortcode = document.getElementById(&#x27;mpesaShortcode&#x27;);
    
    const settings = {
        defaultPayment: defaultPayment ? defaultPayment.value : &#x27;mpesa&#x27;,
        mpesaShortcode: mpesaShortcode ? mpesaShortcode.value : &#x27;&#x27;
    };
    localStorage.setItem(&#x27;luciecloset_payment_settings&#x27;, JSON.stringify(settings));
    showToast(&#x27;Payment settings saved!&#x27;, &#x27;success&#x27;);
}
window.savePaymentSettings = savePaymentSettings;

// ============================================================
// MODALS
// ============================================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add(&#x27;active&#x27;);
}
window.openModal = openModal;

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove(&#x27;active&#x27;);
}
window.closeModal = closeModal;

// ============================================================
// THEME TOGGLE
// ============================================================
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    const themeToggle = document.getElementById(&#x27;themeToggle&#x27;);
    if (themeToggle) {
        themeToggle.addEventListener(&#x27;click&#x27;, function() {
            const isDark = document.documentElement.getAttribute(&#x27;data-theme&#x27;) === &#x27;dark&#x27;;
            document.documentElement.setAttribute(&#x27;data-theme&#x27;, isDark ? &#x27;light&#x27; : &#x27;dark&#x27;);
            this.innerHTML = isDark ? &#x27;&lt;i class=&quot;fas fa-moon&quot;&gt;&lt;/i&gt;&#x27; : &#x27;&lt;i class=&quot;fas fa-sun&quot;&gt;&lt;/i&gt;&#x27;;
            localStorage.setItem(&#x27;luciecloset_theme&#x27;, isDark ? &#x27;light&#x27; : &#x27;dark&#x27;);
        });
    }

    const savedTheme = localStorage.getItem(&#x27;luciecloset_theme&#x27;);
    if (savedTheme === &#x27;dark&#x27;) {
        document.documentElement.setAttribute(&#x27;data-theme&#x27;, &#x27;dark&#x27;);
        if (themeToggle) themeToggle.innerHTML = &#x27;&lt;i class=&quot;fas fa-sun&quot;&gt;&lt;/i&gt;&#x27;;
    }
});

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
    const now = new Date();
    const timeDisplay = document.getElementById(&#x27;currentTime&#x27;);
    if (timeDisplay) {
        timeDisplay.textContent = now.toLocaleTimeString(&#x27;en-KE&#x27;, { hour12: false });
    }
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// SIDEBAR TOGGLE (Mobile)
// ============================================================
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    const sidebarToggle = document.getElementById(&#x27;sidebarToggle&#x27;);
    if (sidebarToggle) {
        sidebarToggle.addEventListener(&#x27;click&#x27;, function() {
            document.getElementById(&#x27;sidebar&#x27;).classList.toggle(&#x27;open&#x27;);
        });
    }
});

// ============================================================
// NAVIGATION CLICK HANDLERS
// ============================================================
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    document.querySelectorAll(&#x27;.sidebar-menu li[data-section]&#x27;).forEach(item =&gt; {
        item.addEventListener(&#x27;click&#x27;, function() {
            const section = this.dataset.section;
            navigateTo(section);
            if (window.innerWidth &lt;= 768) {
                document.getElementById(&#x27;sidebar&#x27;).classList.remove(&#x27;open&#x27;);
            }
        });
    });
});

// ============================================================
// ORDER FILTERS
// ============================================================
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    document.querySelectorAll(&#x27;#orderFilters .filter-btn&#x27;).forEach(btn =&gt; {
        btn.addEventListener(&#x27;click&#x27;, function() {
            document.querySelectorAll(&#x27;#orderFilters .filter-btn&#x27;).forEach(b =&gt; b.classList.remove(&#x27;active&#x27;));
            this.classList.add(&#x27;active&#x27;);
            renderOrders(this.dataset.filter);
        });
    });
});

// ============================================================
// LOGOUT
// ============================================================
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    const logoutBtn = document.getElementById(&#x27;logoutBtn&#x27;);
    if (logoutBtn) {
        logoutBtn.addEventListener(&#x27;click&#x27;, function() {
            if (confirm(&#x27;Are you sure you want to logout?&#x27;)) {
                logout();
            }
        });
    }
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener(&#x27;keydown&#x27;, (e) =&gt; {
    if (e.key === &#x27;Escape&#x27;) {
        document.querySelectorAll(&#x27;.modal-overlay.active&#x27;).forEach(el =&gt; el.classList.remove(&#x27;active&#x27;));
    }
    if (e.ctrlKey &amp;&amp; e.key === &#x27;k&#x27;) {
        e.preventDefault();
        const search = document.getElementById(&#x27;posSearch&#x27;);
        if (search) search.focus();
    }
});

// ============================================================
// LOGIN FORM SUBMIT
// ============================================================
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    const loginForm = document.getElementById(&#x27;loginForm&#x27;);
    if (loginForm) {
        loginForm.addEventListener(&#x27;submit&#x27;, handleLogin);
    }
});

// ============================================================
// INIT
// ============================================================
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    checkAuth();
});
// ============================================================
// LUCIE CLOSET · PRODUCTION HARDENING &amp; BUSINESS UPGRADES
// These overrides preserve the existing HTML/DOM contract while
// strengthening stock control, roles, audit logging, costing,
// reporting, validation and operational safeguards.
// ============================================================

const LC = window.LC || {};
window.LC = LC;

LC.roles = {
    Owner: [&#x27;dashboard&#x27;,&#x27;pos&#x27;,&#x27;orders&#x27;,&#x27;products&#x27;,&#x27;inventory&#x27;,&#x27;customers&#x27;,&#x27;reports&#x27;,&#x27;profit&#x27;,&#x27;audit&#x27;,&#x27;settings&#x27;],
    Administrator: [&#x27;dashboard&#x27;,&#x27;pos&#x27;,&#x27;orders&#x27;,&#x27;products&#x27;,&#x27;inventory&#x27;,&#x27;customers&#x27;,&#x27;reports&#x27;,&#x27;profit&#x27;,&#x27;audit&#x27;,&#x27;settings&#x27;],
    Manager: [&#x27;dashboard&#x27;,&#x27;pos&#x27;,&#x27;orders&#x27;,&#x27;products&#x27;,&#x27;inventory&#x27;,&#x27;customers&#x27;,&#x27;reports&#x27;,&#x27;profit&#x27;],
    Accountant: [&#x27;dashboard&#x27;,&#x27;orders&#x27;,&#x27;customers&#x27;,&#x27;reports&#x27;,&#x27;profit&#x27;],
    &#x27;Stock Manager&#x27;: [&#x27;dashboard&#x27;,&#x27;products&#x27;,&#x27;inventory&#x27;],
    Cashier: [&#x27;dashboard&#x27;,&#x27;pos&#x27;,&#x27;orders&#x27;,&#x27;customers&#x27;]
};

LC.can = function(action) {
    const role = currentUser?.role_name || &#x27;Cashier&#x27;;
    const rules = {
        manageUsers: [&#x27;Owner&#x27;,&#x27;Administrator&#x27;],
        manageSettings: [&#x27;Owner&#x27;,&#x27;Administrator&#x27;],
        manageProducts: [&#x27;Owner&#x27;,&#x27;Administrator&#x27;,&#x27;Manager&#x27;,&#x27;Stock Manager&#x27;],
        adjustStock: [&#x27;Owner&#x27;,&#x27;Administrator&#x27;,&#x27;Manager&#x27;,&#x27;Stock Manager&#x27;],
        cancelOrders: [&#x27;Owner&#x27;,&#x27;Administrator&#x27;,&#x27;Manager&#x27;],
        viewProfit: [&#x27;Owner&#x27;,&#x27;Administrator&#x27;,&#x27;Manager&#x27;,&#x27;Accountant&#x27;],
        audit: [&#x27;Owner&#x27;,&#x27;Administrator&#x27;,&#x27;Manager&#x27;]
    };
    return (rules[action] || []).includes(role);
};

LC.escape = function(value) {
    return String(value ?? &#x27;&#x27;).replace(/[&amp;&lt;&gt;&#x27;&quot;]/g, c =&gt; ({
        &#x27;&amp;&#x27;:&#x27;&amp;amp;&#x27;, &#x27;&lt;&#x27;:&#x27;&amp;lt;&#x27;, &#x27;&gt;&#x27;:&#x27;&amp;gt;&#x27;, &quot;&#x27;&quot;:&#x27;&amp;#39;&#x27;, &#x27;&quot;&#x27;:&#x27;&amp;quot;&#x27;
    }[c]));
};

LC.money = function(value) {
    return `KES ${Number(value || 0).toLocaleString(&#x27;en-KE&#x27;, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

LC.number = function(value) {
    return Number(value || 0).toLocaleString(&#x27;en-KE&#x27;, {maximumFractionDigits: 2});
};

LC.costOf = function(productOrItem) {
    const value = Number(
        productOrItem?.cost_price ??
        productOrItem?.cost ??
        productOrItem?.unit_cost ??
        0
    );
    return Number.isFinite(value) &amp;&amp; value &gt;= 0 ? value : 0;
};

LC.reorderLevel = function(product) {
    const value = Number(product?.reorder_level ?? product?.minimum_stock ?? 5);
    return Number.isFinite(value) &amp;&amp; value &gt;= 0 ? value : 5;
};

LC.isLowStock = function(product) {
    return Number(product?.stock || 0) &lt;= LC.reorderLevel(product);
};

LC.audit = async function(action, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        user: currentUser?.full_name || currentUser?.email || &#x27;System&#x27;,
        user_id: currentUser?.id || null,
        action,
        details: typeof details === &#x27;string&#x27; ? details : JSON.stringify(details)
    };

    try {
        const { error } = await sb.from(&#x27;audit_logs&#x27;).insert([entry]);
        if (!error) return;
    } catch (_) {}

    try {
        const logs = JSON.parse(localStorage.getItem(&#x27;luciecloset_audit&#x27;) || &#x27;[]&#x27;);
        logs.unshift(entry);
        localStorage.setItem(&#x27;luciecloset_audit&#x27;, JSON.stringify(logs.slice(0, 500)));
    } catch (_) {}
};

LC.permissionToast = function(action) {
    if (!LC.can(action)) {
        showToast(&#x27;You do not have permission to perform this action.&#x27;, &#x27;error&#x27;);
        return false;
    }
    return true;
};

// ------------------------------------------------------------
// Stronger statistics: revenue, profit and stock awareness.
// ------------------------------------------------------------
updateStats = function() {
    const today = new Date().toDateString();
    const completed = orders.filter(o =&gt; o.status === &#x27;completed&#x27;);
    const todayOrders = completed.filter(o =&gt; new Date(o.created_at).toDateString() === today);
    const todayRevenue = todayOrders.reduce((sum, o) =&gt; sum + Number(o.total || 0), 0);

    let todayCost = 0;
    todayOrders.forEach(o =&gt; (o.items || []).forEach(i =&gt; {
        const qty = Number(i.qty || 0);
        const unitCost = LC.costOf(i);
        const product = products.find(p =&gt; String(p.id) === String(i.id));
        todayCost += qty * (unitCost || LC.costOf(product));
    }));
    const todayProfit = Math.max(0, todayRevenue - todayCost);

    const values = {
        todaySales: LC.money(todayRevenue),
        todayRevenue: LC.money(todayRevenue),
        todayProfit: LC.money(todayProfit),
        bestQualityCount: products.filter(p =&gt; !!p.best_quality).length,
        totalOrders: orders.length,
        lowStock: products.filter(LC.isLowStock).length,
        totalProducts: products.length,
        totalCustomers: customers.length
    };

    Object.entries(values).forEach(([id, value]) =&gt; {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    const badge = document.getElementById(&#x27;orderBadge&#x27;);
    if (badge) badge.textContent = orders.filter(o =&gt; o.status === &#x27;pending&#x27;).length || orders.length;
};
window.updateStats = updateStats;

// ------------------------------------------------------------
// Safer navigation with role-aware visibility.
// ------------------------------------------------------------
const originalNavigateTo = navigateTo;
navigateTo = function(section) {
    const role = currentUser?.role_name || &#x27;Cashier&#x27;;
    const allowed = LC.roles[role] || LC.roles.Cashier;
    if (!allowed.includes(section)) {
        showToast(`Access denied for ${role}.`, &#x27;error&#x27;);
        return;
    }
    originalNavigateTo(section);
    document.querySelectorAll(&#x27;.sidebar-menu li[data-section]&#x27;).forEach(item =&gt; {
        const target = item.dataset.section;
        item.style.display = allowed.includes(target) ? &#x27;&#x27; : &#x27;none&#x27;;
    });
};
window.navigateTo = navigateTo;

// ------------------------------------------------------------
// Session/login screen cleanup.
// ------------------------------------------------------------
showLogin = function() {
    const loginScreen = document.getElementById(&#x27;loginScreen&#x27;);
    const dashboardScreen = document.getElementById(&#x27;dashboardScreen&#x27;);
    if (loginScreen) loginScreen.style.display = &#x27;flex&#x27;;
    if (dashboardScreen) dashboardScreen.style.display = &#x27;none&#x27;;
    const alertEl = document.getElementById(&#x27;loginAlert&#x27;);
    if (alertEl) alertEl.textContent = &#x27;&#x27;;
    pinValue = &#x27;&#x27;;
    const pinInput = document.getElementById(&#x27;pinInput&#x27;);
    if (pinInput) pinInput.value = &#x27;&#x27;;
    if (typeof renderDots === &#x27;function&#x27;) renderDots();
};
window.showLogin = showLogin;

// ------------------------------------------------------------
// Product save: supports optional fashion fields when present,
// while falling back safely if the existing DB schema is older.
// ------------------------------------------------------------
openProductModal = function(product = null) {
    const set = (id, value) =&gt; {
        const el = document.getElementById(id);
        if (el) el.value = value ?? &#x27;&#x27;;
    };
    const check = (id, value) =&gt; {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    };

    set(&#x27;editProductId&#x27;, product?.id || &#x27;&#x27;);
    set(&#x27;productName&#x27;, product?.name || &#x27;&#x27;);
    set(&#x27;productCode&#x27;, product?.code || &#x27;&#x27;);
    set(&#x27;productCategory&#x27;, product?.category || &#x27;&#x27;);
    set(&#x27;productGender&#x27;, product?.gender || &#x27;unisex&#x27;);
    set(&#x27;productPrice&#x27;, product?.price ?? &#x27;&#x27;);
    set(&#x27;productStock&#x27;, product?.stock ?? &#x27;&#x27;);
    set(&#x27;productCostPrice&#x27;, product?.cost_price ?? product?.cost ?? &#x27;&#x27;);
    set(&#x27;productSize&#x27;, product?.size ?? product?.variant ?? &#x27;&#x27;);
    set(&#x27;productColour&#x27;, product?.colour ?? product?.color ?? &#x27;&#x27;);
    set(&#x27;productReorderLevel&#x27;, product?.reorder_level ?? product?.minimum_stock ?? 5);
    set(&#x27;productSupplier&#x27;, product?.supplier ?? &#x27;&#x27;);
    set(&#x27;productImageUrl&#x27;, product?.image_url ?? &#x27;&#x27;);
    check(&#x27;productBestQuality&#x27;, product?.best_quality);

    const title = document.getElementById(&#x27;productModalTitle&#x27;);
    const saveBtn = document.getElementById(&#x27;saveProductBtn&#x27;);
    if (title) title.textContent = product ? &#x27;✏️ Edit Product&#x27; : &#x27;📦 Add Product&#x27;;
    if (saveBtn) saveBtn.innerHTML = product ? &#x27;&lt;i class=&quot;fas fa-save&quot;&gt;&lt;/i&gt; Update Product&#x27; : &#x27;&lt;i class=&quot;fas fa-save&quot;&gt;&lt;/i&gt; Save Product&#x27;;

    const preview = document.getElementById(&#x27;imagePreview&#x27;);
    if (preview) preview.innerHTML = product?.image_url
        ? `&lt;img src=&quot;${LC.escape(product.image_url)}&quot; alt=&quot;Product image&quot; style=&quot;max-width:100%;max-height:180px;object-fit:contain;border-radius:12px;&quot;&gt;`
        : &#x27;&#x27;;

    openModal(&#x27;productModal&#x27;);
};
window.openProductModal = openProductModal;

saveProduct = async function(e) {
    e.preventDefault();
    if (!LC.permissionToast(&#x27;manageProducts&#x27;)) return;

    const get = id =&gt; document.getElementById(id);
    const name = get(&#x27;productName&#x27;)?.value.trim();
    const code = get(&#x27;productCode&#x27;)?.value.trim();
    const category = get(&#x27;productCategory&#x27;)?.value;
    const gender = get(&#x27;productGender&#x27;)?.value || &#x27;unisex&#x27;;
    const price = Number(get(&#x27;productPrice&#x27;)?.value);
    const stock = Number(get(&#x27;productStock&#x27;)?.value);
    const editId = get(&#x27;editProductId&#x27;)?.value;
    const best_quality = !!get(&#x27;productBestQuality&#x27;)?.checked;

    if (!name || !code || !category || !Number.isFinite(price) || price &lt;= 0 || !Number.isInteger(stock) || stock &lt; 0) {
        showToast(&#x27;Enter a valid product name, code, selling price and non-negative whole-number stock.&#x27;, &#x27;error&#x27;);
        return;
    }

    const optional = {
        cost_price: Number(get(&#x27;productCostPrice&#x27;)?.value || 0),
        size: get(&#x27;productSize&#x27;)?.value.trim() || null,
        colour: get(&#x27;productColour&#x27;)?.value.trim() || null,
        reorder_level: Number(get(&#x27;productReorderLevel&#x27;)?.value || 5),
        supplier: get(&#x27;productSupplier&#x27;)?.value.trim() || null,
        image_url: get(&#x27;productImageUrl&#x27;)?.value.trim() || null
    };

    const fullData = { name, code, category, gender, price, stock, best_quality, ...optional };
    const baseData = { name, code, category, gender, price, stock, best_quality };

    try {
        let error;
        if (editId) {
            ({ error } = await sb.from(&#x27;products&#x27;).update(fullData).eq(&#x27;id&#x27;, Number(editId)));
            if (error) {
                ({ error } = await sb.from(&#x27;products&#x27;).update(baseData).eq(&#x27;id&#x27;, Number(editId)));
            }
            if (error) throw error;
            await LC.audit(&#x27;PRODUCT_UPDATED&#x27;, { id: Number(editId), name, code });
            showToast(&#x27;Product updated successfully.&#x27;, &#x27;success&#x27;);
        } else {
            ({ error } = await sb.from(&#x27;products&#x27;).insert([fullData]));
            if (error) {
                ({ error } = await sb.from(&#x27;products&#x27;).insert([baseData]));
            }
            if (error) throw error;
            await LC.audit(&#x27;PRODUCT_CREATED&#x27;, { name, code });
            showToast(&#x27;Product added successfully.&#x27;, &#x27;success&#x27;);
        }
        await loadProducts();
        updateStats();
        renderCurrentTab();
        closeModal(&#x27;productModal&#x27;);
    } catch (err) {
        console.error(&#x27;Product save error:&#x27;, err);
        showToast(`Could not save product: ${err.message || &#x27;Unknown error&#x27;}`, &#x27;error&#x27;);
    }
};
window.saveProduct = saveProduct;

// ------------------------------------------------------------
// Product deletion guard + audit.
// ------------------------------------------------------------
deleteProduct = async function(id) {
    if (!LC.permissionToast(&#x27;manageProducts&#x27;)) return;
    const product = products.find(p =&gt; String(p.id) === String(id));
    if (!product) return;
    if (!confirm(`Delete “${product.name}”? This should only be done when the item has no historical dependency.`)) return;

    try {
        const { error } = await sb.from(&#x27;products&#x27;).delete().eq(&#x27;id&#x27;, id);
        if (error) throw error;
        await LC.audit(&#x27;PRODUCT_DELETED&#x27;, { id, name: product.name, code: product.code });
        showToast(&#x27;Product deleted.&#x27;, &#x27;success&#x27;);
        await loadProducts();
        updateStats();
        renderCurrentTab();
    } catch (err) {
        showToast(`Could not delete product: ${err.message || &#x27;Unknown error&#x27;}`, &#x27;error&#x27;);
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
        const name = document.getElementById(&#x27;checkoutName&#x27;)?.value.trim() || &#x27;Walk-in Customer&#x27;;
        const phone = document.getElementById(&#x27;checkoutPhone&#x27;)?.value.trim() || &#x27;N/A&#x27;;
        const mpesaCode = document.getElementById(&#x27;mpesaCode&#x27;)?.value.trim() || &#x27;&#x27;;
        const cashPaid = Number(document.getElementById(&#x27;cashPaid&#x27;)?.value || 0);
        const total = cart.reduce((sum, i) =&gt; sum + Number(i.price || 0) * Number(i.qty || 0), 0);

        if (!total || total &lt;= 0) throw new Error(&#x27;Cart total must be greater than zero.&#x27;);

        if (selectedPayment === &#x27;mpesa&#x27; &amp;&amp; !mpesaCode) throw new Error(&#x27;Please enter the M-Pesa transaction code.&#x27;);
        if (selectedPayment === &#x27;cash&#x27; &amp;&amp; cashPaid &lt; total) throw new Error(`Insufficient cash. Balance: ${LC.money(total - cashPaid)}`);

        for (const item of cart) {
            const product = products.find(p =&gt; String(p.id) === String(item.id));
            if (!product) throw new Error(`Product ${item.name} is no longer available.`);
            if (Number(product.stock || 0) &lt; Number(item.qty || 0)) {
                throw new Error(`Insufficient stock for ${item.name}. Available: ${product.stock}.`);
            }
        }

        const paymentDetails = selectedPayment === &#x27;mpesa&#x27; ? `M-Pesa: ${mpesaCode}` : selectedPayment;
        const orderNumber = &#x27;POS-&#x27; + Date.now().toString().slice(-8);
        const items = cart.map(i =&gt; {
            const product = products.find(p =&gt; String(p.id) === String(i.id));
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
            customer_email: &#x27;&#x27;,
            items,
            total: Number(total.toFixed(2)),
            payment_method: paymentDetails,
            status: &#x27;completed&#x27;,
            created_at: new Date().toISOString()
        };

        const { data: inserted, error: orderError } = await sb.from(&#x27;orders&#x27;).insert([orderData]).select().maybeSingle();
        if (orderError) throw orderError;

        const changed = [];
        try {
            for (const item of cart) {
                const product = products.find(p =&gt; String(p.id) === String(item.id));
                const oldStock = Number(product.stock || 0);
                const newStock = oldStock - Number(item.qty || 0);

                const { data: updatedRows, error: stockError } = await sb
                    .from(&#x27;products&#x27;)
                    .update({ stock: newStock })
                    .eq(&#x27;id&#x27;, item.id)
                    .eq(&#x27;stock&#x27;, oldStock)
                    .select(&#x27;id, stock&#x27;);

                if (stockError) throw stockError;
                if (!updatedRows || updatedRows.length !== 1) {
                    throw new Error(`Stock changed while processing ${item.name}. Please retry.`);
                }
                changed.push({ id: item.id, oldStock, newStock });
            }
        } catch (stockError) {
            for (const c of changed.reverse()) {
                await sb.from(&#x27;products&#x27;).update({ stock: c.oldStock }).eq(&#x27;id&#x27;, c.id).eq(&#x27;stock&#x27;, c.newStock);
            }
            if (inserted?.id) await sb.from(&#x27;orders&#x27;).delete().eq(&#x27;id&#x27;, inserted.id);
            throw stockError;
        }

        await LC.audit(&#x27;SALE_COMPLETED&#x27;, {
            order_number: orderNumber,
            total,
            payment_method: selectedPayment,
            customer: name,
            items: items.map(i =&gt; ({id:i.id, qty:i.qty, total:i.price*i.qty}))
        });

        if (selectedPayment === &#x27;cash&#x27;) {
            const change = cashPaid - total;
            showToast(`Sale completed. Change: ${LC.money(change)}`, &#x27;success&#x27;);
        } else {
            showToast(`Sale ${orderNumber} completed successfully.`, &#x27;success&#x27;);
        }

        generateReceipt(orderData);
        cart = [];
        updateCartUI();
        closeModal(&#x27;checkoutModal&#x27;);
        await Promise.all([loadProducts(), loadOrders(), loadCustomers()]);
        updateStats();
        renderCurrentTab();
    } catch (err) {
        console.error(&#x27;Checkout error:&#x27;, err);
        showToast(err.message || &#x27;Could not complete the sale.&#x27;, &#x27;error&#x27;);
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
    const completedOrders = orders.filter(o =&gt; o.status === &#x27;completed&#x27;);
    let totalRevenue = 0;
    let totalCost = 0;
    let costCoverage = 0;

    completedOrders.forEach(order =&gt; {
        totalRevenue += Number(order.total || 0);
        (order.items || []).forEach(item =&gt; {
            const qty = Number(item.qty || 0);
            const cost = LC.costOf(item) || LC.costOf(products.find(p =&gt; String(p.id) === String(item.id)));
            if (cost &gt; 0) costCoverage += qty;
            totalCost += qty * cost;
        });
    });

    const netProfit = totalRevenue - totalCost;
    const margin = totalRevenue &gt; 0 ? (netProfit / totalRevenue) * 100 : 0;

    const set = (id, value) =&gt; {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    set(&#x27;totalRevenue&#x27;, LC.money(totalRevenue));
    set(&#x27;totalCost&#x27;, LC.money(totalCost));
    set(&#x27;netProfit&#x27;, LC.money(netProfit));
    set(&#x27;profitMargin&#x27;, `${margin.toFixed(1)}%`);

    const coverage = document.getElementById(&#x27;costCoverage&#x27;);
    if (coverage) coverage.textContent = costCoverage ? &#x27;Cost data available&#x27; : &#x27;Add product cost prices for exact profit&#x27;;

    renderProfitChart(totalRevenue, totalCost, Math.max(0, netProfit));
};
window.refreshProfitData = refreshProfitData;

// ------------------------------------------------------------
// Inventory: configurable reorder levels + audit-safe adjustment.
// ------------------------------------------------------------
adjustStock = async function(e) {
    e.preventDefault();
    if (!LC.permissionToast(&#x27;adjustStock&#x27;)) return;

    const productId = document.getElementById(&#x27;stockProduct&#x27;)?.value;
    const type = document.getElementById(&#x27;adjustmentType&#x27;)?.value;
    const qty = Number(document.getElementById(&#x27;adjustmentQty&#x27;)?.value);
    const reason = document.getElementById(&#x27;adjustmentReason&#x27;)?.value.trim() || &#x27;Manual adjustment&#x27;;
    const product = products.find(p =&gt; String(p.id) === String(productId));

    if (!product || !Number.isInteger(qty) || qty &lt;= 0) {
        showToast(&#x27;Select a product and enter a positive whole-number quantity.&#x27;, &#x27;error&#x27;);
        return;
    }

    const oldStock = Number(product.stock || 0);
    const newStock = type === &#x27;remove&#x27; ? oldStock - qty : oldStock + qty;
    if (newStock &lt; 0) {
        showToast(`Cannot remove ${qty}. Only ${oldStock} units are available.`, &#x27;error&#x27;);
        return;
    }

    try {
        const { data, error } = await sb.from(&#x27;products&#x27;)
            .update({ stock: newStock })
            .eq(&#x27;id&#x27;, product.id)
            .eq(&#x27;stock&#x27;, oldStock)
            .select(&#x27;id, stock&#x27;);
        if (error) throw error;
        if (!data || data.length !== 1) throw new Error(&#x27;Stock changed before the adjustment was saved. Please retry.&#x27;);

        await LC.audit(&#x27;STOCK_ADJUSTED&#x27;, {
            product_id: product.id,
            product: product.name,
            type,
            quantity: qty,
            old_stock: oldStock,
            new_stock: newStock,
            reason
        });

        showToast(`Stock updated: ${product.name} → ${newStock}`, &#x27;success&#x27;);
        closeModal(&#x27;stockModal&#x27;);
        await loadProducts();
        updateStats();
        renderCurrentTab();
    } catch (err) {
        showToast(`Could not adjust stock: ${err.message || &#x27;Unknown error&#x27;}`, &#x27;error&#x27;);
    }
};
window.adjustStock = adjustStock;

// ------------------------------------------------------------
// Order status changes with permission and audit.
// ------------------------------------------------------------
const _updateOrderStatus = updateOrderStatus;
updateOrderStatus = async function(id, status) {
    if (status === &#x27;cancelled&#x27; &amp;&amp; !LC.permissionToast(&#x27;cancelOrders&#x27;)) return;
    try {
        const order = orders.find(o =&gt; String(o.id) === String(id));
        const previous = order?.status;
        await _updateOrderStatus(id, status);
        await LC.audit(&#x27;ORDER_STATUS_CHANGED&#x27;, {
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
    const stockProduct = document.getElementById(&#x27;stockProduct&#x27;);
    if (stockProduct) {
        stockProduct.innerHTML = products.map(p =&gt;
            `&lt;option value=&quot;${LC.escape(p.id)}&quot;&gt;${LC.escape(p.name)} (${LC.number(p.stock)} in stock)&lt;/option&gt;`
        ).join(&#x27;&#x27;);
    }

    const low = products.filter(LC.isLowStock);
    const inventoryValue = products.reduce((sum, p) =&gt; sum + LC.costOf(p) * Number(p.stock || 0), 0);
    const set = (id, value) =&gt; { const el=document.getElementById(id); if(el) el.textContent=value; };
    set(&#x27;inventoryUnits&#x27;, LC.number(products.reduce((s,p)=&gt;s+Number(p.stock||0),0)));
    set(&#x27;inventoryLowStock&#x27;, LC.number(low.length));
    set(&#x27;inventoryValue&#x27;, LC.money(inventoryValue));

    const table = document.getElementById(&#x27;inventoryTable&#x27;);
    if (!table) return;
    if (!products.length) {
        table.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-box-open&quot;&gt;&lt;/i&gt;&lt;p&gt;No products in inventory.&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }
    table.innerHTML = `&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;
        &lt;th&gt;Product&lt;/th&gt;&lt;th&gt;SKU&lt;/th&gt;&lt;th&gt;Stock&lt;/th&gt;&lt;th&gt;Reorder Level&lt;/th&gt;&lt;th&gt;Status&lt;/th&gt;&lt;th&gt;Value&lt;/th&gt;
    &lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${products.map(p =&gt; {
        const status = LC.isLowStock(p);
        return `&lt;tr&gt;
            &lt;td&gt;&lt;strong&gt;${LC.escape(p.name)}&lt;/strong&gt;&lt;/td&gt;
            &lt;td&gt;${LC.escape(p.code || &#x27;N/A&#x27;)}&lt;/td&gt;
            &lt;td&gt;${LC.number(p.stock)}&lt;/td&gt;
            &lt;td&gt;${LC.number(LC.reorderLevel(p))}&lt;/td&gt;
            &lt;td&gt;${status ? &#x27;&lt;span class=&quot;badge danger&quot;&gt;⚠️ Reorder&lt;/span&gt;&#x27; : &#x27;&lt;span class=&quot;badge success&quot;&gt;✓ Healthy&lt;/span&gt;&#x27;}&lt;/td&gt;
            &lt;td&gt;${LC.money(LC.costOf(p) * Number(p.stock || 0))}&lt;/td&gt;
        &lt;/tr&gt;`;
    }).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;`;

    const list = document.getElementById(&#x27;categoryStockList&#x27;);
    if (list) {
        const categoryStock = {};
        products.forEach(p =&gt; categoryStock[p.category || &#x27;uncategorized&#x27;] = (categoryStock[p.category || &#x27;uncategorized&#x27;] || 0) + Number(p.stock || 0));
        list.innerHTML = Object.entries(categoryStock).sort((a,b)=&gt;b[1]-a[1]).map(([cat,stock]) =&gt;
            `&lt;div style=&quot;display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)&quot;&gt;&lt;span&gt;${LC.escape(cat)}&lt;/span&gt;&lt;strong&gt;${LC.number(stock)}&lt;/strong&gt;&lt;/div&gt;`
        ).join(&#x27;&#x27;) || &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;No categories.&lt;/p&gt;&lt;/div&gt;&#x27;;
    }
};
window.renderInventory = renderInventory;

// ------------------------------------------------------------
// Audit trail: database first, local fallback.
// ------------------------------------------------------------
loadAuditLogs = async function() {
    const table = document.getElementById(&#x27;auditTable&#x27;);
    if (!table) return;
    let logs = [];
    try {
        const { data, error } = await sb.from(&#x27;audit_logs&#x27;).select(&#x27;*&#x27;).order(&#x27;timestamp&#x27;, { ascending: false }).limit(100);
        if (!error &amp;&amp; data) logs = data;
    } catch (_) {}
    if (!logs.length) {
        try { logs = JSON.parse(localStorage.getItem(&#x27;luciecloset_audit&#x27;) || &#x27;[]&#x27;); } catch (_) { logs = []; }
    }
    if (!logs.length) {
        table.innerHTML = &#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-history&quot;&gt;&lt;/i&gt;&lt;p&gt;No audit logs found.&lt;/p&gt;&lt;/div&gt;&#x27;;
        return;
    }
    table.innerHTML = `&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Time&lt;/th&gt;&lt;th&gt;User&lt;/th&gt;&lt;th&gt;Action&lt;/th&gt;&lt;th&gt;Details&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;
        ${logs.map(log =&gt; `&lt;tr&gt;&lt;td&gt;${new Date(log.timestamp || log.created_at).toLocaleString(&#x27;en-KE&#x27;)}&lt;/td&gt;&lt;td&gt;${LC.escape(log.user || log.user_name || &#x27;System&#x27;)}&lt;/td&gt;&lt;td&gt;&lt;span class=&quot;badge primary&quot;&gt;${LC.escape(log.action || &#x27;EVENT&#x27;)}&lt;/span&gt;&lt;/td&gt;&lt;td&gt;${LC.escape(log.details || &#x27;-&#x27;)}&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}
    &lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;`;
};
window.loadAuditLogs = loadAuditLogs;

// ------------------------------------------------------------
// Real CSV export; PDF/print gets a professional print view.
// ------------------------------------------------------------
exportReport = function(format) {
    const start = document.getElementById(&#x27;reportStart&#x27;)?.value;
    const end = document.getElementById(&#x27;reportEnd&#x27;)?.value;
    if (!start || !end) {
        showToast(&#x27;Generate a report date range first.&#x27;, &#x27;warning&#x27;);
        return;
    }

    const filtered = orders.filter(o =&gt; {
        const d = new Date(o.created_at);
        const s = new Date(start + &#x27;T00:00:00&#x27;);
        const e = new Date(end + &#x27;T23:59:59&#x27;);
        return d &gt;= s &amp;&amp; d &lt;= e &amp;&amp; o.status === &#x27;completed&#x27;;
    });

    if (format === &#x27;csv&#x27; || format === &#x27;excel&#x27;) {
        const rows = [[&#x27;Order Number&#x27;,&#x27;Date&#x27;,&#x27;Customer&#x27;,&#x27;Phone&#x27;,&#x27;Payment&#x27;,&#x27;Total&#x27;]];
        filtered.forEach(o =&gt; rows.push([o.order_number, new Date(o.created_at).toLocaleString(&#x27;en-KE&#x27;), o.customer_name || &#x27;Guest&#x27;, o.customer_phone || &#x27;&#x27;, o.payment_method || &#x27;&#x27;, Number(o.total || 0).toFixed(2)]));
        const csv = rows.map(row =&gt; row.map(v =&gt; `&quot;${String(v ?? &#x27;&#x27;).replace(/&quot;/g,&#x27;&quot;&quot;&#x27;)}&quot;`).join(&#x27;,&#x27;)).join(&#x27;\n&#x27;);
        const blob = new Blob([csv], {type:&#x27;text/csv;charset=utf-8;&#x27;});
        const url = URL.createObjectURL(blob);
        const a = document.createElement(&#x27;a&#x27;);
        a.href = url;
        a.download = `lucie-closet-sales-${start}-to-${end}.csv`;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        showToast(&#x27;Report exported as CSV.&#x27;, &#x27;success&#x27;);
        return;
    }

    const print = window.open(&#x27;&#x27;, &#x27;_blank&#x27;, &#x27;width=1000,height=800&#x27;);
    if (!print) { showToast(&#x27;Please allow pop-ups to print the report.&#x27;, &#x27;warning&#x27;); return; }
    const total = filtered.reduce((s,o)=&gt;s+Number(o.total||0),0);
    print.document.write(`&lt;html&gt;&lt;head&gt;&lt;title&gt;Lucie Closet Sales Report&lt;/title&gt;&lt;style&gt;body{font-family:Arial,sans-serif;padding:32px;color:#222}h1{margin-bottom:4px}.muted{color:#666}.summary{margin:20px 0;padding:16px;border:1px solid #ddd;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th{background:#f5f5f5}&lt;/style&gt;&lt;/head&gt;&lt;body&gt;&lt;h1&gt;Lucie Closet&lt;/h1&gt;&lt;div class=&quot;muted&quot;&gt;Sales Report · ${start} to ${end}&lt;/div&gt;&lt;div class=&quot;summary&quot;&gt;&lt;strong&gt;Total Sales:&lt;/strong&gt; KES ${total.toLocaleString(&#x27;en-KE&#x27;,{minimumFractionDigits:2})} &amp;nbsp; &lt;strong&gt;Orders:&lt;/strong&gt; ${filtered.length}&lt;/div&gt;&lt;table&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Order&lt;/th&gt;&lt;th&gt;Date&lt;/th&gt;&lt;th&gt;Customer&lt;/th&gt;&lt;th&gt;Payment&lt;/th&gt;&lt;th&gt;Total&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${filtered.map(o=&gt;`&lt;tr&gt;&lt;td&gt;${LC.escape(o.order_number)}&lt;/td&gt;&lt;td&gt;${new Date(o.created_at).toLocaleString(&#x27;en-KE&#x27;)}&lt;/td&gt;&lt;td&gt;${LC.escape(o.customer_name||&#x27;Guest&#x27;)}&lt;/td&gt;&lt;td&gt;${LC.escape(o.payment_method||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;KES ${Number(o.total||0).toLocaleString(&#x27;en-KE&#x27;,{minimumFractionDigits:2})}&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/body&gt;&lt;/html&gt;`);
    print.document.close();
    print.focus();
    setTimeout(()=&gt;print.print(),300);
};
window.exportReport = exportReport;

// ------------------------------------------------------------
// Close modal when clicking outside; preserve existing API.
// ------------------------------------------------------------
document.addEventListener(&#x27;click&#x27;, function(e) {
    if (e.target.classList?.contains(&#x27;modal-overlay&#x27;)) e.target.classList.remove(&#x27;active&#x27;);
});

// ------------------------------------------------------------
// Final initialization refresh.
// ------------------------------------------------------------
document.addEventListener(&#x27;DOMContentLoaded&#x27;, function() {
    setTimeout(() =&gt; {
        try {
            updateStats();
            if (currentUser) navigateTo(currentTab || &#x27;dashboard&#x27;);
        } catch (e) {
            console.warn(&#x27;Final Lucie Closet initialization warning:&#x27;, e);
        }
    }, 250);
});

/* ============================================================
   LUCIE CLOSET COMPLETE BUSINESS MODULES
   Suppliers • Purchases • Returns • Expenses • Shifts
   Loyalty • Users/Roles • Barcode • Advanced Product Fields
   ============================================================ */
(function () {
    &#x27;use strict&#x27;;

    const LCX = window.LC || {};
    window.LCX = LCX;

    const db = window.sb;
    const safe = (id) =&gt; document.getElementById(id);
    const val = (id) =&gt; safe(id)?.value?.trim() || &#x27;&#x27;;
    const num = (id) =&gt; Number(val(id) || 0);
    const esc = (v) =&gt; (LCX.escape ? LCX.escape(v) : String(v ?? &#x27;&#x27;).replace(/[&amp;&lt;&gt;&quot;&#x27;]/g, m =&gt; ({&#x27;&amp;&#x27;:&#x27;&amp;amp;&#x27;,&#x27;&lt;&#x27;:&#x27;&amp;lt;&#x27;,&#x27;&gt;&#x27;:&#x27;&amp;gt;&#x27;,&#x27;&quot;&#x27;:&#x27;&amp;quot;&#x27;,&quot;&#x27;&quot;:&#x27;&amp;#039;&#x27;}[m])));
    const money = (v) =&gt; LCX.money ? LCX.money(v) : `KES ${Number(v || 0).toLocaleString(&#x27;en-KE&#x27;,{minimumFractionDigits:2,maximumFractionDigits:2})}`;

    function toast(msg, type=&#x27;info&#x27;) {
        if (typeof showToast === &#x27;function&#x27;) return showToast(msg, type);
        const c = safe(&#x27;toastContainer&#x27;); if (!c) return;
        const el = document.createElement(&#x27;div&#x27;); el.className = `toast ${type}`; el.innerHTML = `&lt;i class=&quot;fas fa-info-circle&quot;&gt;&lt;/i&gt;${esc(msg)}`; c.appendChild(el);
        setTimeout(() =&gt; el.remove(), 3500);
    }

    async function insert(table, row) {
        if (!db) throw new Error(&#x27;Supabase is not initialized.&#x27;);
        const { data, error } = await db.from(table).insert(row).select().single();
        if (error) throw error;
        return data;
    }
    async function select(table, options={}) {
        if (!db) return [];
        let q = db.from(table).select(options.columns || &#x27;*&#x27;);
        if (options.order) q = q.order(options.order, {ascending: options.ascending !== false});
        if (options.limit) q = q.limit(options.limit);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    }
    async function update(table, values, filters) {
        let q = db.from(table).update(values);
        Object.entries(filters || {}).forEach(([k,v]) =&gt; q = q.eq(k,v));
        const { data, error } = await q.select();
        if (error) throw error;
        return data || [];
    }

    async function audit(action, details={}) {
        try {
            if (typeof LCX.audit === &#x27;function&#x27;) await LCX.audit(action, details);
        } catch (_) {}
    }

    // ---------- Navigation ----------
    const moduleMeta = {
        suppliers: [&#x27;🚚 Suppliers&#x27;, &#x27;Manage suppliers and supplier contacts&#x27;],
        purchases: [&#x27;🛍️ Purchases&#x27;, &#x27;Receive stock and manage supplier purchases&#x27;],
        returns: [&#x27;↩️ Returns &amp; Refunds&#x27;, &#x27;Process customer returns and refunds&#x27;],
        expenses: [&#x27;🧾 Expenses&#x27;, &#x27;Track operating expenses&#x27;],
        shifts: [&#x27;💵 Cashier Shifts&#x27;, &#x27;Open, monitor and close till shifts&#x27;],
        loyalty: [&#x27;🎁 Loyalty&#x27;, &#x27;Manage customer rewards and loyalty settings&#x27;],
        users: [&#x27;👥 Users &amp; Roles&#x27;, &#x27;Manage staff access and responsibilities&#x27;]
    };

    function showModuleSection(section) {
        const el = safe(section + &#x27;Section&#x27;);
        if (!el) return;
        document.querySelectorAll(&#x27;.section-page&#x27;).forEach(s =&gt; s.classList.remove(&#x27;active&#x27;));
        el.classList.add(&#x27;active&#x27;);
        const meta = moduleMeta[section];
        if (meta) {
            if (safe(&#x27;pageTitle&#x27;)) safe(&#x27;pageTitle&#x27;).textContent = meta[0];
            if (safe(&#x27;pageSubtitle&#x27;)) safe(&#x27;pageSubtitle&#x27;).textContent = meta[1];
        }
        document.querySelectorAll(&#x27;.sidebar-menu li[data-section]&#x27;).forEach(li =&gt; li.classList.toggle(&#x27;active&#x27;, li.dataset.section === section));
    }

    window.navigateTo = (function(original) {
        return function(section) {
            if (moduleMeta[section]) {
                showModuleSection(section);
                if (section === &#x27;suppliers&#x27;) loadSuppliers();
                if (section === &#x27;purchases&#x27;) loadPurchases();
                if (section === &#x27;returns&#x27;) loadReturns();
                if (section === &#x27;expenses&#x27;) loadExpenses();
                if (section === &#x27;shifts&#x27;) loadShifts();
                if (section === &#x27;loyalty&#x27;) loadLoyalty();
                if (section === &#x27;users&#x27;) loadUsers();
                return;
            }
            return original ? original(section) : undefined;
        };
    })(window.navigateTo);

    // ---------- Suppliers ----------
    window.openSupplierModal = function () {
        safe(&#x27;supplierForm&#x27;)?.reset();
        safe(&#x27;supplierModal&#x27;)?.classList.add(&#x27;active&#x27;);
    };
    window.saveSupplier = async function(e) {
        e.preventDefault();
        const name = val(&#x27;supplierName&#x27;);
        if (!name) return toast(&#x27;Supplier name is required.&#x27;, &#x27;error&#x27;);
        try {
            await insert(&#x27;suppliers&#x27;, { name, phone: val(&#x27;supplierPhone&#x27;), email: val(&#x27;supplierEmail&#x27;), address: val(&#x27;supplierAddress&#x27;), status: &#x27;active&#x27; });
            closeModal(&#x27;supplierModal&#x27;);
            toast(&#x27;Supplier saved successfully.&#x27;, &#x27;success&#x27;);
            await audit(&#x27;supplier_created&#x27;, {name});
            loadSuppliers();
        } catch (err) { toast(`Could not save supplier: ${err.message}`, &#x27;error&#x27;); }
    };
    window.loadSuppliers = async function() {
        const box = safe(&#x27;suppliersTable&#x27;); if (!box) return;
        try {
            const rows = await select(&#x27;suppliers&#x27;, {order:&#x27;created_at&#x27;, ascending:false});
            box.innerHTML = rows.length ? `&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Supplier&lt;/th&gt;&lt;th&gt;Phone&lt;/th&gt;&lt;th&gt;Email&lt;/th&gt;&lt;th&gt;Address&lt;/th&gt;&lt;th&gt;Status&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${rows.map(r =&gt; `&lt;tr&gt;&lt;td&gt;&lt;strong&gt;${esc(r.name)}&lt;/strong&gt;&lt;/td&gt;&lt;td&gt;${esc(r.phone||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${esc(r.email||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${esc(r.address||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;&lt;span class=&quot;badge success&quot;&gt;Active&lt;/span&gt;&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;` : `&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-truck&quot;&gt;&lt;/i&gt;&lt;h4&gt;No suppliers&lt;/h4&gt;&lt;p&gt;Add your first supplier.&lt;/p&gt;&lt;/div&gt;`;
            populateSelect(&#x27;purchaseSupplier&#x27;, rows, &#x27;id&#x27;, &#x27;name&#x27;);
        } catch (err) { box.innerHTML = `&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;Unable to load suppliers.&lt;/p&gt;&lt;/div&gt;`; console.warn(err); }
    };

    // ---------- Purchases ----------
    window.openPurchaseModal = async function() {
        safe(&#x27;purchaseForm&#x27;)?.reset();
        await loadSuppliers();
        populateSelect(&#x27;purchaseProduct&#x27;, window.products || [], &#x27;id&#x27;, &#x27;name&#x27;);
        safe(&#x27;purchaseModal&#x27;)?.classList.add(&#x27;active&#x27;);
    };
    window.savePurchase = async function(e) {
        e.preventDefault();
        const supplierId = val(&#x27;purchaseSupplier&#x27;), productId = val(&#x27;purchaseProduct&#x27;);
        const qty = num(&#x27;purchaseQty&#x27;), unitCost = num(&#x27;purchaseUnitCost&#x27;);
        if (!supplierId || !productId || qty &lt;= 0 || unitCost &lt; 0) return toast(&#x27;Complete all purchase details.&#x27;, &#x27;error&#x27;);
        try {
            const p = (window.products || []).find(x =&gt; String(x.id) === String(productId));
            const oldStock = Number(p?.stock || 0), newStock = oldStock + qty;
            await insert(&#x27;purchases&#x27;, { supplier_id: supplierId, product_id: productId, reference: val(&#x27;purchaseReference&#x27;), quantity: qty, unit_cost: unitCost, total_cost: qty * unitCost, payment_status: val(&#x27;purchasePaymentStatus&#x27;) || &#x27;paid&#x27;, created_by: window.currentUser?.id || null });
            if (db) {
                const { error } = await db.from(&#x27;products&#x27;).update({stock:newStock, cost_price:unitCost}).eq(&#x27;id&#x27;, productId).eq(&#x27;stock&#x27;, oldStock);
                if (error) throw error;
            }
            closeModal(&#x27;purchaseModal&#x27;); toast(&#x27;Stock received successfully.&#x27;, &#x27;success&#x27;);
            await audit(&#x27;purchase_received&#x27;, {productId, quantity:qty, unitCost});
            if (typeof loadProducts === &#x27;function&#x27;) await loadProducts();
            loadPurchases();
        } catch (err) { toast(`Purchase failed: ${err.message}`, &#x27;error&#x27;); }
    };
    window.loadPurchases = async function() {
        const box = safe(&#x27;purchasesTable&#x27;); if (!box) return;
        try {
            const rows = await select(&#x27;purchases&#x27;, {order:&#x27;created_at&#x27;, ascending:false, limit:200});
            box.innerHTML = rows.length ? `&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Date&lt;/th&gt;&lt;th&gt;Reference&lt;/th&gt;&lt;th&gt;Product&lt;/th&gt;&lt;th&gt;Qty&lt;/th&gt;&lt;th&gt;Unit Cost&lt;/th&gt;&lt;th&gt;Total&lt;/th&gt;&lt;th&gt;Status&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${rows.map(r =&gt; `&lt;tr&gt;&lt;td&gt;${new Date(r.created_at).toLocaleString()}&lt;/td&gt;&lt;td&gt;${esc(r.reference||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${esc(r.product_id||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${Number(r.quantity||0)}&lt;/td&gt;&lt;td&gt;${money(r.unit_cost)}&lt;/td&gt;&lt;td&gt;${money(r.total_cost)}&lt;/td&gt;&lt;td&gt;&lt;span class=&quot;badge ${r.payment_status===&#x27;paid&#x27;?&#x27;success&#x27;:&#x27;warning&#x27;}&quot;&gt;${esc(r.payment_status||&#x27;pending&#x27;)}&lt;/span&gt;&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;` : `&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-shopping-basket&quot;&gt;&lt;/i&gt;&lt;h4&gt;No purchases&lt;/h4&gt;&lt;p&gt;Received stock will appear here.&lt;/p&gt;&lt;/div&gt;`;
        } catch (err) { box.innerHTML = `&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;Unable to load purchases.&lt;/p&gt;&lt;/div&gt;`; }
    };

    // ---------- Returns ----------
    window.openReturnModal = async function() {
        safe(&#x27;returnForm&#x27;)?.reset();
        populateSelect(&#x27;returnProduct&#x27;, window.products || [], &#x27;id&#x27;, &#x27;name&#x27;);
        safe(&#x27;returnModal&#x27;)?.classList.add(&#x27;active&#x27;);
    };
    window.saveReturn = async function(e) {
        e.preventDefault();
        const orderNo=val(&#x27;returnOrderNo&#x27;), productId=val(&#x27;returnProduct&#x27;), qty=num(&#x27;returnQty&#x27;);
        if (!orderNo || !productId || qty&lt;=0) return toast(&#x27;Complete return details.&#x27;, &#x27;error&#x27;);
        try {
            const product=(window.products||[]).find(x=&gt;String(x.id)===String(productId));
            if (!product) throw new Error(&#x27;Product not found.&#x27;);
            await insert(&#x27;returns&#x27;, {order_no:orderNo, product_id:productId, quantity:qty, reason:val(&#x27;returnReason&#x27;), refund_method:val(&#x27;refundMethod&#x27;), amount:Number(product.price||0)*qty, created_by:window.currentUser?.id||null});
            const oldStock=Number(product.stock||0);
            if (db) {
                const {error}=await db.from(&#x27;products&#x27;).update({stock:oldStock+qty}).eq(&#x27;id&#x27;,productId).eq(&#x27;stock&#x27;,oldStock);
                if(error) throw error;
            }
            closeModal(&#x27;returnModal&#x27;); toast(&#x27;Return processed and stock restored.&#x27;, &#x27;success&#x27;); await audit(&#x27;return_processed&#x27;,{orderNo,productId,qty});
            if(typeof loadProducts===&#x27;function&#x27;) await loadProducts(); loadReturns();
        } catch(err){ toast(`Return failed: ${err.message}`,&#x27;error&#x27;); }
    };
    window.loadReturns = async function(){
        const box=safe(&#x27;returnsTable&#x27;); if(!box)return;
        try{
            const rows=await select(&#x27;returns&#x27;,{order:&#x27;created_at&#x27;,ascending:false,limit:200});
            box.innerHTML=rows.length?`&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Date&lt;/th&gt;&lt;th&gt;Order&lt;/th&gt;&lt;th&gt;Product&lt;/th&gt;&lt;th&gt;Qty&lt;/th&gt;&lt;th&gt;Reason&lt;/th&gt;&lt;th&gt;Refund&lt;/th&gt;&lt;th&gt;Amount&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${rows.map(r=&gt;`&lt;tr&gt;&lt;td&gt;${new Date(r.created_at).toLocaleString()}&lt;/td&gt;&lt;td&gt;${esc(r.order_no||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${esc(r.product_id||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${Number(r.quantity||0)}&lt;/td&gt;&lt;td&gt;${esc(r.reason||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${esc(r.refund_method||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${money(r.amount)}&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;`:`&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-undo&quot;&gt;&lt;/i&gt;&lt;h4&gt;No returns&lt;/h4&gt;&lt;p&gt;Processed returns will appear here.&lt;/p&gt;&lt;/div&gt;`;
        }catch(err){box.innerHTML=&#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;Unable to load returns.&lt;/p&gt;&lt;/div&gt;&#x27;;}
    };

    // ---------- Expenses ----------
    window.openExpenseModal=function(){safe(&#x27;expenseForm&#x27;)?.reset();safe(&#x27;expenseModal&#x27;)?.classList.add(&#x27;active&#x27;);};
    window.saveExpense=async function(e){
        e.preventDefault(); const amount=num(&#x27;expenseAmount&#x27;); if(amount&lt;=0)return toast(&#x27;Enter a valid expense amount.&#x27;,&#x27;error&#x27;);
        try{await insert(&#x27;expenses&#x27;,{category:val(&#x27;expenseCategory&#x27;),amount,description:val(&#x27;expenseDescription&#x27;),created_by:window.currentUser?.id||null});closeModal(&#x27;expenseModal&#x27;);toast(&#x27;Expense saved.&#x27;,&#x27;success&#x27;);await audit(&#x27;expense_created&#x27;,{amount,category:val(&#x27;expenseCategory&#x27;)});loadExpenses();}
        catch(err){toast(`Could not save expense: ${err.message}`,&#x27;error&#x27;);}
    };
    window.loadExpenses=async function(){
        const box=safe(&#x27;expensesTable&#x27;);if(!box)return;
        try{const rows=await select(&#x27;expenses&#x27;,{order:&#x27;created_at&#x27;,ascending:false,limit:200});box.innerHTML=rows.length?`&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Date&lt;/th&gt;&lt;th&gt;Category&lt;/th&gt;&lt;th&gt;Description&lt;/th&gt;&lt;th&gt;Amount&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${rows.map(r=&gt;`&lt;tr&gt;&lt;td&gt;${new Date(r.created_at).toLocaleString()}&lt;/td&gt;&lt;td&gt;${esc(r.category||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${esc(r.description||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;&lt;strong&gt;${money(r.amount)}&lt;/strong&gt;&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;`:`&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-receipt&quot;&gt;&lt;/i&gt;&lt;h4&gt;No expenses&lt;/h4&gt;&lt;p&gt;Business expenses will appear here.&lt;/p&gt;&lt;/div&gt;`;}catch(err){box.innerHTML=&#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;Unable to load expenses.&lt;/p&gt;&lt;/div&gt;&#x27;;}
    };

    // ---------- Shifts ----------
    window.openShiftModal=function(action){safe(&#x27;shiftForm&#x27;)?.reset();safe(&#x27;shiftAction&#x27;).value=action;safe(&#x27;shiftModalTitle&#x27;).textContent=action===&#x27;open&#x27;?&#x27;💵 Open Cashier Shift&#x27;:&#x27;🔒 Close Cashier Shift&#x27;;safe(&#x27;openShiftFields&#x27;).classList.toggle(&#x27;hidden&#x27;,action!==&#x27;open&#x27;);safe(&#x27;closeShiftFields&#x27;).classList.toggle(&#x27;hidden&#x27;,action!==&#x27;close&#x27;);safe(&#x27;shiftModal&#x27;).classList.add(&#x27;active&#x27;);};
    window.saveShift=async function(e){
        e.preventDefault();const action=val(&#x27;shiftAction&#x27;);
        try{
            if(action===&#x27;open&#x27;){const opening=num(&#x27;shiftOpeningCash&#x27;);if(opening&lt;0)return toast(&#x27;Opening cash cannot be negative.&#x27;,&#x27;error&#x27;);await insert(&#x27;cashier_shifts&#x27;,{cashier_id:window.currentUser?.id||null,opened_at:new Date().toISOString(),opening_cash:opening,status:&#x27;open&#x27;});}
            else {const closing=num(&#x27;shiftClosingCash&#x27;);if(closing&lt;0)return toast(&#x27;Closing cash cannot be negative.&#x27;,&#x27;error&#x27;);const rows=await select(&#x27;cashier_shifts&#x27;,{order:&#x27;opened_at&#x27;,ascending:false,limit:1});const current=rows[0];if(!current)throw new Error(&#x27;No open shift found.&#x27;);await update(&#x27;cashier_shifts&#x27;,{closed_at:new Date().toISOString(),closing_cash:closing,status:&#x27;closed&#x27;,notes:val(&#x27;shiftNotes&#x27;)},{id:current.id});}
            closeModal(&#x27;shiftModal&#x27;);toast(action===&#x27;open&#x27;?&#x27;Shift opened.&#x27;:&#x27;Shift closed.&#x27;,&#x27;success&#x27;);await audit(`shift_${action}`,{});loadShifts();
        }catch(err){toast(`Shift operation failed: ${err.message}`,&#x27;error&#x27;);}
    };
    window.loadShifts=async function(){
        const box=safe(&#x27;shiftsTable&#x27;);if(!box)return;
        try{const rows=await select(&#x27;cashier_shifts&#x27;,{order:&#x27;opened_at&#x27;,ascending:false,limit:100});box.innerHTML=rows.length?`&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Opened&lt;/th&gt;&lt;th&gt;Closed&lt;/th&gt;&lt;th&gt;Opening&lt;/th&gt;&lt;th&gt;Closing&lt;/th&gt;&lt;th&gt;Status&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${rows.map(r=&gt;`&lt;tr&gt;&lt;td&gt;${r.opened_at?new Date(r.opened_at).toLocaleString():&#x27;&#x27;}&lt;/td&gt;&lt;td&gt;${r.closed_at?new Date(r.closed_at).toLocaleString():&#x27;—&#x27;}&lt;/td&gt;&lt;td&gt;${money(r.opening_cash)}&lt;/td&gt;&lt;td&gt;${r.closing_cash==null?&#x27;—&#x27;:money(r.closing_cash)}&lt;/td&gt;&lt;td&gt;&lt;span class=&quot;badge ${r.status===&#x27;open&#x27;?&#x27;warning&#x27;:&#x27;success&#x27;}&quot;&gt;${esc(r.status||&#x27;&#x27;)}&lt;/span&gt;&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;`:`&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-cash-register&quot;&gt;&lt;/i&gt;&lt;h4&gt;No shifts&lt;/h4&gt;&lt;p&gt;Cashier shifts will appear here.&lt;/p&gt;&lt;/div&gt;`;}catch(err){box.innerHTML=&#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;Unable to load shifts.&lt;/p&gt;&lt;/div&gt;&#x27;;}
    };

    // ---------- Loyalty ----------
    window.openLoyaltyModal=function(){safe(&#x27;loyaltyModal&#x27;)?.classList.add(&#x27;active&#x27;);};
    window.saveLoyalty=async function(e){
        e.preventDefault();const rate=num(&#x27;loyaltyPointsRate&#x27;),red=num(&#x27;loyaltyRedemption&#x27;);if(rate&lt;=0||red&lt;0)return toast(&#x27;Enter valid loyalty settings.&#x27;,&#x27;error&#x27;);
        localStorage.setItem(&#x27;lucie_loyalty_settings&#x27;,JSON.stringify({rate,redemption:red}));closeModal(&#x27;loyaltyModal&#x27;);toast(&#x27;Loyalty settings saved.&#x27;,&#x27;success&#x27;);await audit(&#x27;loyalty_settings_updated&#x27;,{rate,redemption:red});loadLoyalty();
    };
    window.loadLoyalty=async function(){
        const box=safe(&#x27;loyaltyTable&#x27;);if(!box)return;
        const settings=JSON.parse(localStorage.getItem(&#x27;lucie_loyalty_settings&#x27;)||&#x27;{&quot;rate&quot;:100,&quot;redemption&quot;:1}&#x27;);
        if(safe(&#x27;loyaltyPointsRate&#x27;))safe(&#x27;loyaltyPointsRate&#x27;).value=settings.rate;if(safe(&#x27;loyaltyRedemption&#x27;))safe(&#x27;loyaltyRedemption&#x27;).value=settings.redemption;
        try{const rows=await select(&#x27;customers&#x27;,{order:&#x27;name&#x27;,ascending:true});box.innerHTML=rows.length?`&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Customer&lt;/th&gt;&lt;th&gt;Phone&lt;/th&gt;&lt;th&gt;Points&lt;/th&gt;&lt;th&gt;Tier&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${rows.map(r=&gt;{const pts=Number(r.loyalty_points||0);return `&lt;tr&gt;&lt;td&gt;${esc(r.name||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${esc(r.phone||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;${pts.toLocaleString()}&lt;/td&gt;&lt;td&gt;&lt;span class=&quot;badge gold&quot;&gt;${pts&gt;=5000?&#x27;VIP&#x27;:pts&gt;=1000?&#x27;Gold&#x27;:&#x27;Member&#x27;}&lt;/span&gt;&lt;/td&gt;&lt;/tr&gt;`}).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;`:`&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;No loyalty members yet.&lt;/p&gt;&lt;/div&gt;`;}catch(err){box.innerHTML=&#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;Unable to load loyalty members.&lt;/p&gt;&lt;/div&gt;&#x27;;}
    };

    // ---------- Users &amp; Roles ----------
    window.openUserModal=function(){safe(&#x27;userForm&#x27;)?.reset();safe(&#x27;userModal&#x27;)?.classList.add(&#x27;active&#x27;);};
    window.saveUser=async function(e){
        e.preventDefault();const name=val(&#x27;staffName&#x27;),role=val(&#x27;staffRole&#x27;);if(!name||!role)return toast(&#x27;Name and role are required.&#x27;,&#x27;error&#x27;);
        const pin=val(&#x27;staffPin&#x27;);if(pin&amp;&amp;!/^\d{4,6}$/.test(pin))return toast(&#x27;PIN must contain 4 to 6 digits.&#x27;,&#x27;error&#x27;);
        try{await insert(&#x27;users&#x27;,{name,email:val(&#x27;staffEmail&#x27;),role,pin:pin||null,status:&#x27;active&#x27;});closeModal(&#x27;userModal&#x27;);toast(&#x27;User created.&#x27;,&#x27;success&#x27;);await audit(&#x27;user_created&#x27;,{name,role});loadUsers();}
        catch(err){toast(`Could not create user: ${err.message}`,&#x27;error&#x27;);}
    };
    window.loadUsers=async function(){
        const box=safe(&#x27;usersTable&#x27;);if(!box)return;
        try{const rows=await select(&#x27;users&#x27;,{order:&#x27;name&#x27;,ascending:true});box.innerHTML=rows.length?`&lt;div class=&quot;table-wrapper&quot;&gt;&lt;table class=&quot;data-table&quot;&gt;&lt;thead&gt;&lt;tr&gt;&lt;th&gt;Name&lt;/th&gt;&lt;th&gt;Email&lt;/th&gt;&lt;th&gt;Role&lt;/th&gt;&lt;th&gt;Status&lt;/th&gt;&lt;/tr&gt;&lt;/thead&gt;&lt;tbody&gt;${rows.map(r=&gt;`&lt;tr&gt;&lt;td&gt;&lt;strong&gt;${esc(r.name||&#x27;&#x27;)}&lt;/strong&gt;&lt;/td&gt;&lt;td&gt;${esc(r.email||&#x27;&#x27;)}&lt;/td&gt;&lt;td&gt;&lt;span class=&quot;badge primary&quot;&gt;${esc(r.role||&#x27;&#x27;)}&lt;/span&gt;&lt;/td&gt;&lt;td&gt;&lt;span class=&quot;badge success&quot;&gt;${esc(r.status||&#x27;active&#x27;)}&lt;/span&gt;&lt;/td&gt;&lt;/tr&gt;`).join(&#x27;&#x27;)}&lt;/tbody&gt;&lt;/table&gt;&lt;/div&gt;`:`&lt;div class=&quot;empty-state&quot;&gt;&lt;i class=&quot;fas fa-users&quot;&gt;&lt;/i&gt;&lt;h4&gt;No staff users&lt;/h4&gt;&lt;p&gt;Add your first staff account.&lt;/p&gt;&lt;/div&gt;`;}catch(err){box.innerHTML=&#x27;&lt;div class=&quot;empty-state&quot;&gt;&lt;p&gt;Unable to load users.&lt;/p&gt;&lt;/div&gt;&#x27;;}
    };

    // ---------- Helpers ----------
    function populateSelect(id, rows, valueKey, labelKey) {
        const el=safe(id);if(!el)return;
        const current=el.value;
        el.innerHTML=&#x27;&lt;option value=&quot;&quot;&gt;Select...&lt;/option&gt;&#x27;+(rows||[]).map(r=&gt;`&lt;option value=&quot;${esc(r[valueKey])}&quot;&gt;${esc(r[labelKey]||r.name||r.product_name||r[valueKey])}&lt;/option&gt;`).join(&#x27;&#x27;);
        if(current)el.value=current;
    }

    // ---------- Product advanced fields ----------
    window.getAdvancedProductFields=function(){
        return {
            barcode:val(&#x27;productBarcode&#x27;), size:val(&#x27;productSize&#x27;), colour:val(&#x27;productColour&#x27;), material:val(&#x27;productMaterial&#x27;),
            description:val(&#x27;productDescription&#x27;), supplier_id:val(&#x27;productSupplier&#x27;)||null, cost_price:num(&#x27;productCostPrice&#x27;),
            reorder_level:num(&#x27;productReorderLevel&#x27;), tax_rate:num(&#x27;productTax&#x27;)
        };
    };

    // ---------- Barcode scanner ----------
    let barcodeBuffer=&#x27;&#x27;, barcodeTimer=null;
    document.addEventListener(&#x27;keydown&#x27;,function(e){
        if([&#x27;INPUT&#x27;,&#x27;TEXTAREA&#x27;,&#x27;SELECT&#x27;].includes(document.activeElement?.tagName) &amp;&amp; document.activeElement?.id!==&#x27;posSearch&#x27;) return;
        if(e.key===&#x27;Enter&#x27; &amp;&amp; barcodeBuffer.length&gt;=4){
            const code=barcodeBuffer;barcodeBuffer=&#x27;&#x27;;clearTimeout(barcodeTimer);
            const p=(window.products||[]).find(x=&gt;String(x.barcode||x.code||&#x27;&#x27;).toLowerCase()===code.toLowerCase());
            if(p &amp;&amp; typeof addToCart===&#x27;function&#x27;){addToCart(p);toast(`${p.name} added to cart.`,&#x27;success&#x27;);}
            else toast(`Barcode ${code} not found.`,&#x27;warning&#x27;);return;
        }
        if(e.key.length===1){barcodeBuffer+=e.key;clearTimeout(barcodeTimer);barcodeTimer=setTimeout(()=&gt;barcodeBuffer=&#x27;&#x27;,80);}
    });

    // ---------- Login UX ----------
    window.showLogin = function(){
        safe(&#x27;loginScreen&#x27;)?.classList.remove(&#x27;hidden&#x27;);
        safe(&#x27;dashboardScreen&#x27;)?.classList.add(&#x27;hidden&#x27;);
    };

    // ---------- Keyboard shortcuts ----------
    document.addEventListener(&#x27;keydown&#x27;,function(e){
        if(e.ctrlKey &amp;&amp; e.key.toLowerCase()===&#x27;p&#x27;){e.preventDefault();window.navigateTo(&#x27;pos&#x27;);}
        if(e.ctrlKey &amp;&amp; e.key.toLowerCase()===&#x27;k&#x27;){e.preventDefault();safe(&#x27;posSearch&#x27;)?.focus();}
        if(e.key===&#x27;Escape&#x27;)document.querySelectorAll(&#x27;.modal-overlay.active&#x27;).forEach(m=&gt;m.classList.remove(&#x27;active&#x27;));
    });

    // ---------- Startup ----------
    document.addEventListener(&#x27;DOMContentLoaded&#x27;,function(){
        setTimeout(()=&gt;{
            [&#x27;suppliers&#x27;,&#x27;purchases&#x27;,&#x27;returns&#x27;,&#x27;expenses&#x27;,&#x27;shifts&#x27;,&#x27;loyalty&#x27;,&#x27;users&#x27;].forEach(s=&gt;{
                const section=safe(s+&#x27;Section&#x27;);
                if(section &amp;&amp; !section.classList.contains(&#x27;section-page&#x27;)) section.classList.add(&#x27;section-page&#x27;);
            });
            // Load module data quietly; missing tables are reported only in console.
            if(safe(&#x27;suppliersTable&#x27;)) loadSuppliers();
            if(safe(&#x27;purchaseSupplier&#x27;)) loadSuppliers();
        },500);
    });
})();
</pre>
</body>
</html>
