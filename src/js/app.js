// ═══════════════════════════════════════════════════
//  GAME ZONE — Gaming Cafe Management System
// ═══════════════════════════════════════════════════

const app = document.getElementById("app");

let activePage = "dashboard";
let clockInterval = null;
let countdownInterval = null;
let cachedSettings = null;
let cachedDevices = [];
let cachedSessions = [];
let cachedRefreshment = { menu: [], sales: [], todayRevenue: 0, itemsSold: 0 };
let cachedCustomers = [];
let cachedStaff = [];
let cachedExpenses = [];
let cachedUsers = [];
let cachedLogs = [];
let cachedBookings = [];
let cachedStats = { revenue: 0, activeSessions: 0, totalDevices: 0, walkIns: 0, members: 0, todayBookings: 0, revenueChange: 0, newToday: 0, newThisWeek: 0 };
let cachedShifts = [];
let cachedDiscounts = [];
let cachedCombos = [];
let cachedQueue = [];
let reportTab = "revenue";
const alarmTriggered = new Set();
let alarmAudioCtx = null;
let alarmIntervalId = null;
let currentUser = null;
let currentShift = null;

// ─── PARTICLES ───
(function initParticles() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, particles = [];
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize(); window.addEventListener("resize", resize);
    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.size = Math.random() * 2 + 0.5;
            this.alpha = Math.random() * 0.4 + 0.1;
            const colors = ["0,240,255", "255,0,170", "180,0,255"];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
            ctx.fill();
        }
    }
    for (let i = 0; i < 60; i++) particles.push(new Particle());
    function animate() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
})();

function fmt(n) { return "\u20B9" + Number(n || 0).toLocaleString("en-IN"); }
function fmtTime(endTime) {
    const diff = endTime - Date.now();
    if (diff <= 0) return "00:00:00";
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function fmtElapsed(startTime) {
    const diff = Date.now() - startTime;
    if (diff <= 0) return "00:00:00";
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function timeStr(ts) { return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); }
function todayKey() { return new Date().toISOString().split("T")[0]; }
function avatarColor(name) {
    const colors = ["#00f0ff", "#ff00aa", "#b400ff", "#00ff88", "#ffee00", "#ff3344", "#33f5ff", "#ff33bb"];
    let hash = 0; for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// ─── ALARM ───
function playAlarm() {
    stopAlarm();
    alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function beep() {
        try {
            const o1 = alarmAudioCtx.createOscillator(), g1 = alarmAudioCtx.createGain();
            o1.type = "square"; o1.frequency.value = 880; o1.connect(g1); g1.connect(alarmAudioCtx.destination);
            g1.gain.value = 0.3; o1.start(); o1.stop(alarmAudioCtx.currentTime + 0.15);
            const o2 = alarmAudioCtx.createOscillator(), g2 = alarmAudioCtx.createGain();
            o2.type = "square"; o2.frequency.value = 660; o2.connect(g2); g2.connect(alarmAudioCtx.destination);
            g2.gain.setValueAtTime(0.3, alarmAudioCtx.currentTime + 0.18);
            o2.start(alarmAudioCtx.currentTime + 0.18); o2.stop(alarmAudioCtx.currentTime + 0.33);
        } catch (e) {}
    }
    beep(); alarmIntervalId = setInterval(beep, 600);
}
function stopAlarm() {
    if (alarmIntervalId) { clearInterval(alarmIntervalId); alarmIntervalId = null; }
    if (alarmAudioCtx) { alarmAudioCtx.close().catch(() => {}); alarmAudioCtx = null; }
}
function showAlarm(device) {
    const old = document.getElementById("alarm-overlay"); if (old) old.remove();
    const ov = document.createElement("div"); ov.id = "alarm-overlay"; ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal-box" style="text-align:center;border-color:var(--neon-red)">
        <div style="font-size:52px;margin-bottom:12px">🚨</div>
        <h2 style="font-size:28px;font-weight:800;color:var(--neon-red);margin:0 0 8px">TIME'S UP!</h2>
        <p style="color:#fff;font-size:18px;font-weight:700">${device.icon || "🎮"} ${device.name}</p>
        <p style="color:var(--text-secondary);margin-top:6px">Customer: <strong style="color:#fff">${device.customer}</strong></p>
        <button id="alarm-dismiss" class="btn-danger btn-full" style="margin-top:24px;padding:14px;font-size:16px">Dismiss & End Session</button>
    </div>`;
    document.body.appendChild(ov); playAlarm();
    document.getElementById("alarm-dismiss").addEventListener("click", async () => {
        stopAlarm(); ov.remove(); alarmTriggered.delete(device.id);
        await window.api.sessions.end({ deviceId: device.id }); await refreshDashboard();
    });
}

function showModal(html) {
    const old = document.getElementById("app-modal"); if (old) old.remove();
    const ov = document.createElement("div"); ov.id = "app-modal"; ov.className = "modal-overlay"; ov.innerHTML = html;
    document.body.appendChild(ov);
    ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
    const box = ov.querySelector(".modal-box");
    if (box) { box.addEventListener("click", e => e.stopPropagation()); }
    const firstInput = ov.querySelector("input, select");
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    return ov;
}
function closeModal() { const m = document.getElementById("app-modal"); if (m) m.remove(); }
function toast(msg, type) {
    const t = document.createElement("div"); t.className = "toast " + (type === "error" ? "toast-error" : "toast-success"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, 2500);
}

// ─── DATA LOADERS ───
async function loadSettings() { try { cachedSettings = await window.api.settings.get(); } catch (e) { console.error(e); } }
async function loadDevices() { try { cachedDevices = await window.api.devices.get(); } catch (e) { console.error(e); } }
async function loadSessions() { try { cachedSessions = await window.api.sessions.get(); } catch (e) { console.error(e); } }
async function loadRefreshment() { try { cachedRefreshment = await window.api.refreshment.get(); } catch (e) { console.error(e); } }
async function loadCustomers() { try { cachedCustomers = await window.api.customers.get(); } catch (e) { console.error(e); } }
async function loadStaff() { try { cachedStaff = await window.api.staff.get(); } catch (e) { console.error(e); } }
async function loadExpenses() { try { cachedExpenses = await window.api.expenses.get(); } catch (e) { console.error(e); } }
async function loadUsers() { try { cachedUsers = await window.api.users.get(); } catch (e) { console.error(e); } }
async function loadLogs() { try { cachedLogs = await window.api.logs.get(); } catch (e) { console.error(e); } }
async function loadBookings() { try { cachedBookings = await window.api.bookings.get(); } catch (e) { console.error(e); } }
async function loadDashboard() {
    try { const [stats, devices] = await Promise.all([window.api.dashboard.stats(), window.api.devices.get()]); cachedStats = stats; cachedDevices = devices; } catch (e) { console.error(e); }
}
async function refreshDashboard() { await loadDashboard(); if (activePage === "dashboard") render(); }

// ─── SIDEBAR ───
function createSidebar() {
    const navSections = [
        { title: "MANAGE", items: [
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "devices", icon: "🖥️", label: "Devices" },
            { id: "sessions", icon: "⏱️", label: "Sessions" },
            { id: "customers", icon: "👥", label: "Customers" },
            { id: "bookings", icon: "📅", label: "Bookings" },
            { id: "queue", icon: "🧑‍🤝‍🧑", label: "Queue" }
        ]},
        { title: "FINANCE", items: [
            { id: "payments", icon: "💰", label: "Payments" },
            { id: "expenses", icon: "📋", label: "Expenses" },
            { id: "revenue", icon: "📈", label: "Revenue" },
            { id: "reports", icon: "📊", label: "Reports" },
            { id: "shifts", icon: "🏦", label: "Shifts" }
        ]},
        { title: "INVENTORY", items: [
            { id: "products", icon: "📦", label: "Products" },
            { id: "stock", icon: "🏪", label: "Stock" },
            { id: "discounts", icon: "🏷️", label: "Discounts" },
            { id: "combos", icon: "🎁", label: "Combos" }
        ]},
        { title: "SYSTEM", items: [
            { id: "staff", icon: "🧑‍💼", label: "Staff" },
            { id: "users", icon: "👤", label: "Users" },
            { id: "logs", icon: "📝", label: "Logs" },
            { id: "settings", icon: "⚙️", label: "Settings" }
        ]}
    ];
    return `<div class="sidebar">
        <div class="sidebar-logo"><div class="logo-icon">🎮</div><div class="logo-text"><h2>GAME ZONE</h2><p>Gaming Café</p></div></div>
        <div class="sidebar-nav">
            ${navSections.map(sec => `<div class="nav-section"><div class="nav-section-title">${sec.title}</div>
                ${sec.items.map(it => `<button data-page="${it.id}" class="nav-item ${it.id === activePage ? 'active' : ''}"><span class="nav-icon">${it.icon}</span><span>${it.label}</span></button>`).join("")}</div>`).join("")}
        </div>
        <div class="sidebar-footer">
            <div class="cafe-status"><span style="font-size:12px;color:var(--text-secondary)">Cafe Status</span><span><span class="status-dot"></span><span style="font-size:12px;color:var(--neon-green);font-weight:600">Open</span></span></div>
            <div class="clock-area"><div class="clock-time" id="sidebar-clock"></div><div class="clock-date" id="sidebar-date"></div></div>
        </div>
    </div>`;
}

function createHeader(page) {
    const titles = {
        dashboard: ["Dashboard", "Welcome back, Admin!"], devices: ["Devices", "Manage gaming devices"],
        sessions: ["Sessions", "Active & completed sessions"], customers: ["Customers", "Customer management"],
        bookings: ["Bookings", "Upcoming reservations"], payments: ["Payments", "Transaction history"],
        expenses: ["Expenses", "Track your expenses"], revenue: ["Revenue", "Revenue analytics"],
        reports: ["Reports", "Detailed analytics & insights"], products: ["Products", "Refreshment menu"],
        stock: ["Stock", "Inventory management"], settings: ["Settings", "System configuration"],
        staff: ["Staff", "Team management"], users: ["Users", "User management"], logs: ["Logs", "System activity logs"]
    };
    const [title, sub] = titles[page] || ["Dashboard", ""];
    const notifications = cachedDevices.filter(d => d.status === "expired").length;
    const uName = currentUser?.name || "Admin";
    const uRole = currentUser?.role || "Staff";
    return `<div class="app-header">
        <button class="header-hamburger" id="hamburger-btn">☰</button>
        <div class="header-title"><h1>${title}</h1><p>${sub}</p></div>
        <div class="header-actions">
            <button class="btn-new-session" id="header-new-session">+ New Session</button>
            <div class="header-bell" id="header-bell">🔔${notifications > 0 ? `<span class="badge">${notifications}</span>` : ""}</div>
            <div class="header-admin"><div class="admin-info"><div class="name">${uName}</div><div class="role">${uRole}</div></div><div class="avatar">${uName.charAt(0).toUpperCase()}</div></div>
        </div>
    </div>`;
}

// ─── DASHBOARD ───
function pageDashboard() {
    const s = cachedStats;
    const todayBookings = cachedBookings.filter(b => b.date === todayKey() && b.status === "upcoming");
    const recentSessions = cachedSessions.filter(x => x.status === "completed").slice(-5).reverse();
    const lowStockItems = cachedRefreshment.menu.filter(i => i.stock > 0 && i.stock < 5);
    const totalUsed = cachedDevices.filter(d => d.status === "active").length;

    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:24px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">💰</div><div class="stat-info"><div class="stat-label">TODAY'S REVENUE</div><div class="stat-value">${fmt(s.revenue)}</div><div class="stat-change ${s.revenueChange >= 0 ? 'up' : 'down'}">${s.revenueChange >= 0 ? '↗' : '↘'} ${Math.abs(s.revenueChange)}% from yesterday</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">🎮</div><div class="stat-info"><div class="stat-label">ACTIVE SESSIONS</div><div class="stat-value">${s.activeSessions}</div><div class="stat-change" style="color:var(--text-muted)">🎯 of ${s.totalDevices} devices in use</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">👥</div><div class="stat-info"><div class="stat-label">WALK-IN CUSTOMERS</div><div class="stat-value">${s.walkIns}</div><div class="stat-change up">↗ ${s.newToday} new today</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">👑</div><div class="stat-info"><div class="stat-label">MEMBERS</div><div class="stat-value">${s.members}</div><div class="stat-change up">↗ ${s.newThisWeek} new this week</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(236,72,153,.15)">📅</div><div class="stat-info"><div class="stat-label">TODAY'S BOOKINGS</div><div class="stat-value">${todayBookings.length}</div><div class="stat-change" style="color:var(--text-muted)">${todayBookings.filter(b => b.status === "upcoming").length} upcoming</div></div></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:24px">
            <div class="dash-card" style="grid-column:span 2">
                <div class="section-header"><h3>Device Status</h3><a data-page="devices">View All</a></div>
                <div>
                    <div style="display:grid;grid-template-columns:50px 1fr 100px 120px 100px 100px;gap:8px;padding:8px 0;border-bottom:1px solid var(--card-border);font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase"><span></span><span></span><span>Status</span><span>Customer</span><span>Time Left</span><span>Amount</span></div>
                    ${cachedDevices.slice(0, 5).map(d => {
                        const isActive = d.status === "active", isExpired = d.status === "expired", isMaintenance = d.status === "maintenance";
                        const badgeClass = isExpired ? "badge-expired" : isActive ? "badge-inuse" : isMaintenance ? "badge-maintenance" : "badge-available";
                        const badgeText = isExpired ? "Expired" : isActive ? "In Use" : isMaintenance ? "Maintenance" : "Available";
                        const ses = isActive ? cachedSessions.find(s => s.deviceId === d.id && s.status === "active") : null;
                        const isOpen = ses && ses.openEnded;
                        return `<div class="device-row">
                            <div class="dev-icon">${d.icon || "🎮"}</div>
                            <div class="dev-info"><div class="dev-name">${d.name}</div><div class="dev-type">${d.type || "console"}</div></div>
                            <div class="dev-col"><span class="${badgeClass}">${badgeText}</span></div>
                            <div class="dev-col"><strong>${d.customer || "-"}</strong></div>
                            <div class="dev-col device-time ${isActive && !isOpen && d.sessionEnd - Date.now() <= (cachedSettings?.session?.warningMinutes || 5) * 60000 ? "time-warn" : ""}" data-device="${d.id}">${isActive ? (isOpen ? fmtElapsed(ses.startTime) : fmtTime(d.sessionEnd)) : "--:--:--"}</div>
                            <div class="dev-col"><span class="amount">${isOpen ? "—" : (d.sessionAmount ? fmt(d.sessionAmount) : "--")}</span></div>
                        </div>`;
                    }).join("")}
                </div>
            </div>
            <div class="dash-card">
                <div class="section-header"><h3>Recent Sessions</h3><a data-page="sessions">View All</a></div>
                <div>
                    ${recentSessions.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No sessions yet</div>' :
                    recentSessions.map(s => `<div class="session-row">
                        <div class="sess-avatar" style="background:${avatarColor(s.customerName)}">${(s.customerName || "?").charAt(0)}</div>
                        <div class="sess-info"><div class="sess-name">${s.customerName}</div><div class="sess-device">${s.deviceName}</div></div>
                        <div class="sess-time">${timeStr(s.startTime)}<br>${s.durationMinutes}m</div>
                        <div style="text-align:right"><div class="sess-amount">${fmt(s.amount)}</div><span class="badge-completed">Completed</span></div>
                    </div>`).join("")}
                </div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
            <div class="dash-card">
                <div class="section-header"><h3>Today's Bookings</h3><a data-page="bookings">View All</a></div>
                ${todayBookings.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">No bookings today</div>' :
                todayBookings.slice(0, 4).map(b => `<div class="booking-row"><span class="bk-icon">📅</span><span class="bk-time">${b.time}</span><span class="bk-name">${b.customerName}</span><span class="bk-device">${b.deviceName}</span><span class="bk-duration">${b.duration}m</span><span class="badge-upcoming">Upcoming</span></div>`).join("")}
            </div>
            <div class="dash-card">
                <div class="section-header"><h3>Low Stock Alerts</h3><a data-page="stock">View All</a></div>
                ${lowStockItems.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--text-muted)">All items in stock</div>' :
                lowStockItems.map(item => `<div class="stock-row"><span class="stk-icon">📦</span><div class="stk-info"><div class="stk-name">${item.name}</div><div class="stk-count">Stock: ${item.stock}</div></div><span class="badge-lowstock">Low Stock</span></div>`).join("")}
            </div>
            <div class="dash-card">
                <div class="section-header"><h3>Quick Actions</h3></div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
                    <div class="quick-action" data-action="new-session"><div class="qa-icon" style="background:rgba(99,102,241,.15)">🎮</div><div class="qa-label">New Session</div></div>
                    <div class="quick-action" data-action="add-customer"><div class="qa-icon" style="background:rgba(6,182,212,.15)">👤</div><div class="qa-label">Add Customer</div></div>
                    <div class="quick-action" data-action="create-booking"><div class="qa-icon" style="background:rgba(236,72,153,.15)">📅</div><div class="qa-label">New Booking</div></div>
                    <div class="quick-action" data-action="add-expense"><div class="qa-icon" style="background:rgba(245,158,11,.15)">💸</div><div class="qa-label">Add Expense</div></div>
                    <div class="quick-action" data-action="add-product"><div class="qa-icon" style="background:rgba(16,185,129,.15)">📦</div><div class="qa-label">Add Product</div></div>
                    <div class="quick-action" data-action="generate-report"><div class="qa-icon" style="background:rgba(239,68,68,.15)">📊</div><div class="qa-label">Generate Report</div></div>
                </div>
            </div>
        </div>
        <div style="text-align:center;padding:20px 0 8px;font-size:12px;color:var(--text-muted)">© 2025 Game Zone Gaming Café Management System. All rights reserved. <span style="float:right">Version 1.0.0</span></div>
    </div>`;
}

// ─── DEVICES PAGE ───
function pageDevices() {
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-size:18px;font-weight:700;color:#fff">All Devices (${cachedDevices.length})</h2>
            <button class="btn-primary" id="btn-add-device">+ Add Device</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
            ${cachedDevices.map(d => {
                const bc = d.status === "expired" ? "badge-expired" : d.status === "active" ? "badge-inuse" : d.status === "maintenance" ? "badge-maintenance" : "badge-available";
                return `<div class="dash-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                        <div style="display:flex;align-items:center;gap:10px"><div style="font-size:28px">${d.icon || "🎮"}</div><div><div style="font-weight:700;color:#fff;font-size:15px">${d.name}</div><div style="font-size:11px;color:var(--text-muted)">${d.type || "console"}</div></div></div>
                        <button class="btn-del-device" data-device="${d.id}" data-name="${d.name}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px" title="Delete">🗑️</button>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--card-border);margin-top:8px;font-size:12px"><span style="color:var(--text-muted)">Status</span><span class="${bc}">${d.status}</span></div>
                    <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-muted)">Hourly</span><span style="color:#fff;font-weight:700">${fmt(cachedSettings?.pricing?.[d.id])}</span></div>
                    <div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-muted)">30 Min</span><span style="color:#fff;font-weight:700">${fmt(cachedSettings?.pricing?.[d.id + "_30min"])}</span></div>
                </div>`}).join("")}
        </div>
    </div>`;
}

// ─── SESSIONS PAGE ───
function pageSessions() {
    const active = cachedSessions.filter(s => s.status === "active");
    const recent = cachedSessions.filter(s => s.status === "completed").slice(-20).reverse();
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h2 style="font-size:18px;font-weight:700;color:#fff">Active Sessions (${active.length})</h2></div>
        ${active.length === 0 ? '<div class="dash-card" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:8px">⏱️</div><p>No active sessions</p></div>' :
        `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">${active.map(s => `<div class="dash-card" style="border-color:rgba(99,102,241,.3)">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div style="font-size:24px">${cachedDevices.find(d => d.id === s.deviceId)?.icon || "🎮"}</div><div><div style="font-weight:700;color:#fff">${s.deviceName}</div><div style="font-size:12px;color:var(--accent)">${s.customerName}</div></div>${s.openEnded ? '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(245,158,11,.15);color:var(--neon-yellow);font-weight:600;margin-left:auto">OPEN</span>' : ''}</div>
            <div style="font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <div><span style="color:var(--text-muted)">Duration:</span> <strong style="color:#fff">${s.openEnded ? 'Open' : s.durationMinutes + 'm'}</strong></div>
                <div><span style="color:var(--text-muted)">Players:</span> <strong style="color:#fff">${s.players || 1}</strong></div>
                <div><span style="color:var(--text-muted)">Amount:</span> <strong style="color:var(--neon-green)">${s.openEnded ? "—" : fmt(s.amount)}</strong></div>
                <div><span style="color:var(--text-muted)">${s.openEnded ? 'Elapsed' : 'Time Left'}:</span> <strong class="device-time" data-device="${s.deviceId}">${s.openEnded ? fmtElapsed(s.startTime) : fmtTime(s.sessionEnd)}</strong></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
                <button class="btn-extend-session btn-outline btn-sm" data-device="${s.deviceId}" style="flex:1">⏱ Extend</button>
                <button class="btn-end-session btn-danger btn-sm" data-device="${s.deviceId}" style="flex:1">⏹ End</button>
            </div>
        </div>`).join("")}</div>`}
        <h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:14px">Recent Completed</h3>
        ${recent.length === 0 ? '<div class="dash-card" style="text-align:center;padding:30px;color:var(--text-muted)">No completed sessions yet</div>' :
        `<div class="dash-card" style="overflow-x:auto"><table class="data-table"><thead><tr><th>Device</th><th>Customer</th><th style="text-align:right">Duration</th><th style="text-align:right">Players</th><th style="text-align:right">Amount</th><th style="text-align:right">Date</th></tr></thead>
        <tbody>${recent.map(s => `<tr><td style="color:#fff;font-weight:600">${s.deviceName}</td><td>${s.customerName}</td><td style="text-align:right">${s.durationMinutes || "?"}m</td><td style="text-align:right">${s.players || 1}</td><td style="text-align:right;color:var(--neon-green);font-weight:700">${fmt(s.amount)}</td><td style="text-align:right;color:var(--text-muted)">${s.date}</td></tr>`).join("")}</tbody></table></div>`}
    </div>`;
}

// ─── CUSTOMERS PAGE ───
function pageCustomers() {
    const list = cachedCustomers;
    const totalVisits = list.reduce((s, c) => s + (c.visits || 0), 0);
    const totalSpent = list.reduce((s, c) => s + (c.totalSpent || 0), 0);
    const tierCounts = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    list.forEach(c => { tierCounts[c.tier || "Bronze"]++; });
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">👥</div><div class="stat-info"><div class="stat-label">TOTAL CUSTOMERS</div><div class="stat-value">${list.length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">📊</div><div class="stat-info"><div class="stat-label">TOTAL VISITS</div><div class="stat-value">${totalVisits}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL SPENT</div><div class="stat-value">${fmt(totalSpent)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">⭐</div><div class="stat-info"><div class="stat-label">AVG SPENT</div><div class="stat-value">${list.length ? fmt(Math.round(totalSpent / list.length)) : fmt(0)}</div></div></div></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div style="position:relative;flex:1;max-width:360px"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted)">🔍</span><input id="cust-search" type="text" placeholder="Search by name, phone, tier..." class="form-input" style="padding-left:36px"/></div>
            <button class="btn-primary" id="btn-add-customer">+ Add Customer</button>
        </div>
        ${list.length === 0 ? '<div class="dash-card" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:8px">👥</div><p>No customers yet</p></div>' :
        `<div id="customer-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${renderCustomerCards(list)}</div>`}
    </div>`;
}
function renderCustomerCards(list) {
    const tc = { Bronze: "var(--neon-yellow)", Silver: "#c0c0c0", Gold: "#ffd700", Platinum: "var(--accent)" };
    const tierEmoji = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎" };
    return list.map(c => {
        const customerBookings = cachedBookings.filter(b => b.customerName === c.name);
        const recentBookings = customerBookings.slice(-3).reverse();
        return `<div class="dash-card">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div style="width:40px;height:40px;border-radius:50%;background:${avatarColor(c.name)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">${(c.name || "?").charAt(0).toUpperCase()}</div>
                <div style="flex:1"><div style="font-weight:700;color:#fff;font-size:14px">${c.name}</div><div style="font-size:11px;color:var(--text-muted)">${c.phone || "No phone"}</div></div>
                <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:${tc[c.tier] || tc.Bronze}20;color:${tc[c.tier] || tc.Bronze};font-weight:600">${tierEmoji[c.tier] || "🥉"} ${c.tier || "Bronze"}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;margin-bottom:10px">
                <div style="background:var(--bg-deep);border-radius:8px;padding:6px"><div style="font-size:10px;color:var(--text-muted)">Visits</div><div style="font-weight:700;color:#fff">${c.visits || 0}</div></div>
                <div style="background:var(--bg-deep);border-radius:8px;padding:6px"><div style="font-size:10px;color:var(--text-muted)">Spent</div><div style="font-weight:700;color:var(--neon-green)">${fmt(c.totalSpent || 0)}</div></div>
                <div style="background:var(--bg-deep);border-radius:8px;padding:6px"><div style="font-size:10px;color:var(--text-muted)">Points</div><div style="font-weight:700;color:var(--accent)">${c.points || 0}</div></div>
            </div>
            ${recentBookings.length > 0 ? `<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Recent Bookings</div>${recentBookings.map(b => `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:var(--bg-deep);border-radius:6px;margin-bottom:3px;font-size:11px"><span style="color:var(--text-secondary)">${b.deviceName} · ${b.date}</span><span class="${b.status === 'upcoming' ? 'badge-upcoming' : 'badge-completed'}" style="font-size:9px;padding:1px 6px;border-radius:10px">${b.status}</span></div>`).join("")}</div>` : ''}
            <div style="display:flex;gap:6px">
                <button class="btn-edit-customer btn-outline btn-sm" data-customer="${c.id}" style="flex:1;font-size:11px">✏️ Edit</button>
                <button class="btn-del-customer btn-outline btn-sm" data-customer="${c.id}" style="flex:1;font-size:11px;color:var(--neon-red);border-color:rgba(239,68,68,.3)">🗑️ Remove</button>
            </div>
        </div>`;
    }).join("");
}

// ─── BOOKINGS PAGE ───
function pageBookings() {
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-size:18px;font-weight:700;color:#fff">Bookings</h2>
            <button class="btn-primary" id="btn-new-booking">+ New Booking</button>
        </div>
        <div class="dash-card">
            <table class="data-table">
                <thead><tr><th>Customer</th><th>Phone</th><th>Device</th><th>Date</th><th>Time</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>${cachedBookings.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px">No bookings yet</td></tr>' :
                cachedBookings.slice().reverse().map(b => `<tr>
                    <td style="color:#fff;font-weight:600">${b.customerName}</td>
                    <td>${b.phone || "-"}</td>
                    <td>${b.deviceName}</td>
                    <td>${b.date}</td>
                    <td>${b.time}</td>
                    <td>${b.duration}m</td>
                    <td><span class="${b.status === 'upcoming' ? 'badge-upcoming' : b.status === 'completed' ? 'badge-completed' : 'badge-expired'}">${b.status}</span></td>
                    <td>${b.status === 'upcoming' ? `<button class="btn-cancel-booking btn-outline btn-sm" data-booking="${b.id}">Cancel</button>` : ''}</td>
                </tr>`).join("")}</tbody>
            </table>
        </div>
    </div>`;
}

// ─── PAYMENTS PAGE ───
function pagePayments() {
    const completed = cachedSessions.filter(s => s.status === "completed").slice(-30).reverse();
    const totalRev = completed.reduce((s, x) => s + (x.amount || 0), 0);
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL PAYMENTS</div><div class="stat-value">${fmt(totalRev)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📊</div><div class="stat-info"><div class="stat-label">TRANSACTIONS</div><div class="stat-value">${completed.length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">📈</div><div class="stat-info"><div class="stat-label">AVG PAYMENT</div><div class="stat-value">${completed.length ? fmt(Math.round(totalRev / completed.length)) : fmt(0)}</div></div></div></div>
        </div>
        <div class="dash-card"><div class="section-header"><h3>Payment History</h3></div>
            <table class="data-table"><thead><tr><th>Date</th><th>Customer</th><th>Device</th><th>Duration</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>${completed.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px">No payments yet</td></tr>' :
            completed.map(s => `<tr><td style="color:var(--text-muted)">${s.date}</td><td style="color:#fff;font-weight:600">${s.customerName}</td><td>${s.deviceName}</td><td>${s.durationMinutes}m</td><td style="text-align:right;color:var(--neon-green);font-weight:700">${fmt(s.amount)}</td></tr>`).join("")}</tbody></table>
        </div>
    </div>`;
}

// ─── EXPENSES PAGE ───
function pageExpenses() {
    const totalExp = cachedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const now = new Date();
    const monthExp = cachedExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, e) => s + (e.amount || 0), 0);
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(239,68,68,.15)">💸</div><div class="stat-info"><div class="stat-label">TOTAL EXPENSES</div><div class="stat-value">${fmt(totalExp)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">📊</div><div class="stat-info"><div class="stat-label">THIS MONTH</div><div class="stat-value">${fmt(monthExp)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📋</div><div class="stat-info"><div class="stat-label">ENTRIES</div><div class="stat-value">${cachedExpenses.length}</div></div></div></div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" id="btn-add-expense">+ Add Expense</button></div>
        <div class="dash-card"><table class="data-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Action</th></tr></thead>
        <tbody>${cachedExpenses.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px">No expenses recorded</td></tr>' :
        cachedExpenses.slice().reverse().map(e => `<tr><td style="color:var(--text-muted)">${e.date}</td><td><span style="padding:3px 10px;border-radius:20px;background:var(--primary)20;color:var(--primary);font-weight:600;font-size:11px">${e.category || "Other"}</span></td><td style="color:#fff">${e.description || "-"}</td><td style="text-align:right;color:var(--neon-red);font-weight:700">${fmt(e.amount)}</td><td><button class="btn-del-expense btn-outline btn-sm" data-expense="${e.id}">🗑️</button></td></tr>`).join("")}</tbody></table></div>
    </div>`;
}

// ─── REVENUE PAGE ───
function pageRevenue() {
    const completed = cachedSessions.filter(s => s.status === "completed");
    const sessionRev = completed.reduce((s, x) => s + (x.amount || 0), 0);
    const refreshRev = cachedRefreshment.sales ? cachedRefreshment.sales.reduce((s, x) => s + (x.amount || 0), 0) : (cachedRefreshment.todayRevenue || 0);
    const totalRev = sessionRev + refreshRev;
    const todayRev = completed.filter(s => s.date === todayKey()).reduce((s, x) => s + (x.amount || 0), 0);
    const todayRefresh = cachedRefreshment.sales ? cachedRefreshment.sales.filter(s => s.date === todayKey()).reduce((s, x) => s + (x.amount || 0), 0) : 0;
    const todayTotal = todayRev + todayRefresh;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().split("T")[0];
    const yestRev = completed.filter(s => s.date === yKey).reduce((s, x) => s + (x.amount || 0), 0);
    const revChange = yestRev > 0 ? Math.round(((todayRev - yestRev) / yestRev) * 100) : 0;
    const avgSessionRev = completed.length ? Math.round(sessionRev / completed.length) : 0;
    const peakRev = completed.length ? Math.max(...completed.map(s => s.amount || 0)) : 0;

    // Hourly chart
    const hours = [];
    for (let i = 0; i < 24; i++) {
        const rev = completed.filter(s => new Date(s.startTime).getHours() === i).reduce((s, x) => s + (x.amount || 0), 0);
        hours.push({ label: String(i).padStart(2, "0") + ":00", value: rev });
    }
    const maxRev = Math.max(...hours.map(h => h.value), 1);
    const w = 700, h2 = 200, pad = 50;
    const points = hours.map((d, i) => `${pad + (i / 23) * (w - pad * 2)},${h2 - (d.value / maxRev) * (h2 - 30)}`).join(" ");
    const areaPoints = points + ` ${pad + (w - pad * 2)},${h2} ${pad},${h2}`;

    // Last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
        const dayRev = completed.filter(s => s.date === key).reduce((s, x) => s + (x.amount || 0), 0);
        days.push({ label: dayLabel, value: dayRev, date: key });
    }
    const maxDay = Math.max(...days.map(d => d.value), 1);

    // Revenue by device
    const revByDevice = {};
    completed.forEach(s => { revByDevice[s.deviceName] = (revByDevice[s.deviceName] || 0) + (s.amount || 0); });
    const sortedDevices = Object.entries(revByDevice).sort((a, b) => b[1] - a[1]);
    const maxDeviceRev = sortedDevices[0] ? sortedDevices[0][1] : 1;

    // Top sessions
    const topSessions = [...completed].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 5);

    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL REVENUE</div><div class="stat-value">${fmt(totalRev)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📈</div><div class="stat-info"><div class="stat-label">TODAY'S REVENUE</div><div class="stat-value">${fmt(todayTotal)}</div><div style="font-size:10px;color:${revChange >= 0 ? "var(--neon-green)" : "var(--neon-red)"};margin-top:2px">${revChange >= 0 ? "↑" : "↓"} ${Math.abs(revChange)}% vs yesterday</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">🎮</div><div class="stat-info"><div class="stat-label">AVG PER SESSION</div><div class="stat-value">${fmt(avgSessionRev)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${completed.length} total sessions</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">🔥</div><div class="stat-info"><div class="stat-label">PEAK SESSION</div><div class="stat-value">${fmt(peakRev)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">Highest single session</div></div></div></div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:20px">
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">Hourly Revenue</h3>
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Revenue distribution across hours</p>
                <svg viewBox="0 0 ${w} ${h2 + 28}" style="width:100%;height:auto">
                    <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--primary)" stop-opacity="0.35"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
                    ${[0, 0.25, 0.5, 0.75, 1].map(p => `<line x1="${pad}" y1="${h2 - p * (h2 - 30)}" x2="${w - pad}" y2="${h2 - p * (h2 - 30)}" stroke="var(--card-border)" stroke-dasharray="4 4"/><text x="${pad - 8}" y="${h2 - p * (h2 - 30) + 4}" text-anchor="end" style="font-size:9px;fill:var(--text-muted)">${fmt(Math.round(maxRev * p))}</text>`).join("")}
                    <polygon points="${areaPoints}" fill="url(#revGrad)"/>
                    <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round"/>
                    ${hours.map((d, i) => `<circle cx="${pad + (i / 23) * (w - pad * 2)}" cy="${h2 - (d.value / maxRev) * (h2 - 30)}" r="3" fill="var(--primary)" opacity="0"/><title>${d.label}: ${fmt(d.value)}</title>`).join("")}
                    ${hours.filter((_, i) => i % 3 === 0).map((d, i) => `<text x="${pad + (i * 3 / 23) * (w - pad * 2)}" y="${h2 + 18}" text-anchor="middle" style="font-size:9px;fill:var(--text-muted)">${d.label}</text>`).join("")}
                </svg>
            </div>
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">Revenue Split</h3>
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Sessions vs Refreshments</p>
                <div style="display:flex;flex-direction:column;gap:12px">
                    <div style="background:var(--bg-deep);border-radius:10px;padding:14px;border:1px solid var(--card-border)">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;color:var(--text-muted)">🎮 Sessions</span><span style="font-size:11px;color:var(--text-muted)">${totalRev > 0 ? Math.round((sessionRev / totalRev) * 100) : 0}%</span></div>
                        <div style="font-size:20px;font-weight:800;color:var(--primary)">${fmt(sessionRev)}</div>
                        <div style="height:6px;background:var(--surface);border-radius:3px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${totalRev > 0 ? Math.round((sessionRev / totalRev) * 100) : 0}%;background:var(--primary);border-radius:3px"></div></div>
                    </div>
                    <div style="background:var(--bg-deep);border-radius:10px;padding:14px;border:1px solid var(--card-border)">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;color:var(--text-muted)">📦 Refreshments</span><span style="font-size:11px;color:var(--text-muted)">${totalRev > 0 ? Math.round((refreshRev / totalRev) * 100) : 0}%</span></div>
                        <div style="font-size:20px;font-weight:800;color:var(--accent)">${fmt(refreshRev)}</div>
                        <div style="height:6px;background:var(--surface);border-radius:3px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${totalRev > 0 ? Math.round((refreshRev / totalRev) * 100) : 0}%;background:var(--accent);border-radius:3px"></div></div>
                    </div>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">Last 7 Days</h3>
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:16px">Daily revenue trend</p>
                <div style="display:flex;align-items:flex-end;gap:8px;height:140px">
                    ${days.map(d => {
                        const pct = maxDay > 0 ? (d.value / maxDay) * 100 : 0;
                        const isToday = d.date === todayKey();
                        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
                            <div style="font-size:10px;color:var(--neon-green);font-weight:600;margin-bottom:4px">${d.value > 0 ? fmt(d.value) : ""}</div>
                            <div style="width:100%;height:${Math.max(pct, 3)}%;background:${isToday ? "linear-gradient(180deg,var(--primary),var(--accent))" : "var(--surface)"};border-radius:6px;border:1px solid ${isToday ? "var(--primary)" : "var(--card-border)"};min-height:4px;transition:height .6s ease"></div>
                            <div style="font-size:9px;color:${isToday ? "#fff" : "var(--text-muted)"};margin-top:6px;font-weight:${isToday ? "700" : "400"};white-space:nowrap">${d.label}</div>
                        </div>`;
                    }).join("")}
                </div>
            </div>
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">Revenue by Device</h3>
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:16px">Which devices earn the most</p>
                ${sortedDevices.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px">No data</p>' :
                sortedDevices.map(([name, rev]) => {
                    const pct = Math.round((rev / maxDeviceRev) * 100);
                    const totalPct = sessionRev > 0 ? Math.round((rev / sessionRev) * 100) : 0;
                    const dev = cachedDevices.find(d => d.name === name);
                    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="font-size:16px;flex-shrink:0">${dev?.icon || "🎮"}</span><div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;color:var(--text-secondary);font-weight:600">${name}</span><span style="font-size:11px;color:var(--neon-green);font-weight:600">${fmt(rev)} (${totalPct}%)</span></div><div style="height:8px;background:var(--bg-deep);border-radius:4px;overflow:hidden;border:1px solid var(--card-border)"><div style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:4px;width:${pct}%;transition:width .8s ease"></div></div></div></div>`;
                }).join("")}
            </div>
        </div>

        <div class="dash-card">
            <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px">Top Earning Sessions</h3>
            <p style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Highest revenue sessions</p>
            ${topSessions.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px">No sessions yet</p>' :
            `<table class="data-table"><thead><tr><th>#</th><th>Customer</th><th>Device</th><th style="text-align:right">Duration</th><th style="text-align:right">Amount</th><th>Date</th></tr></thead>
            <tbody>${topSessions.map((s, i) => `<tr><td style="color:${i === 0 ? "var(--neon-yellow)" : i < 3 ? "var(--accent)" : "var(--text-muted)"};font-weight:700;font-size:14px">${i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
            <td style="color:#fff;font-weight:600">${s.customerName}</td>
            <td>${s.deviceName}</td>
            <td style="text-align:right">${s.durationMinutes || "?"}m</td>
            <td style="text-align:right;color:var(--neon-green);font-weight:700;font-size:14px">${fmt(s.amount)}</td>
            <td style="color:var(--text-muted)">${s.date}</td></tr>`).join("")}</tbody></table>`}
        </div>
    </div>`;
}

// ─── REPORTS PAGE ───
function pageReports() {
    const tabs = [
        { id: "overview", icon: "📊", label: "Overview" },
        { id: "revenue", icon: "💰", label: "Revenue" },
        { id: "devices", icon: "🖥️", label: "Devices" },
        { id: "customers", icon: "👥", label: "Customers" },
        { id: "expenses", icon: "💸", label: "Expenses" }
    ];
    return `<div class="page-enter">
        <div style="display:flex;gap:6px;margin-bottom:20px;background:var(--surface);border-radius:12px;padding:4px;border:1px solid var(--card-border)">${tabs.map(t => `<button data-report="${t.id}" class="btn-report-tab" style="flex:1;padding:10px 8px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;background:${reportTab === t.id ? "var(--primary)" : "transparent"};color:${reportTab === t.id ? "#fff" : "var(--text-muted)"}">${t.icon} ${t.label}</button>`).join("")}</div>
        <div id="report-content"></div>
    </div>`;
}

function loadReportContent() {
    const el = document.getElementById("report-content"); if (!el) return;
    const completed = cachedSessions.filter(s => s.status === "completed");
    const today = todayKey();
    const todaySess = completed.filter(s => s.date === today);
    const yesterdaySess = completed.filter(s => { const d = new Date(s.startTime); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0] === today; });
    const totalRev = completed.reduce((s, x) => s + (x.amount || 0), 0);
    const todayRev = todaySess.reduce((s, x) => s + (x.amount || 0), 0);
    const yesterdayRev = yesterdaySess.reduce((s, x) => s + (x.amount || 0), 0);
    const totalExp = cachedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const todayExp = cachedExpenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);
    const totalRefreshRev = (cachedRefreshment.sales || []).reduce((s, x) => s + (x.price * (x.qty || 1)), 0);
    const refreshRev = cachedRefreshment.todayRevenue || 0;
    const profit = (totalRev + totalRefreshRev) - totalExp;
    const netToday = (todayRev + refreshRev) - todayExp;

    if (reportTab === "overview") {
        const avgSession = completed.length ? Math.round(completed.reduce((s, x) => s + (x.durationMinutes || 0), 0) / completed.length) : 0;
        const peakHours = {};
        completed.forEach(s => { const h = new Date(s.startTime).getHours(); peakHours[h] = (peakHours[h] || 0) + 1; });
        const peakHr = Object.entries(peakHours).sort((a, b) => b[1] - a[1])[0];
        const tierCounts = {};
        cachedCustomers.forEach(c => { tierCounts[c.tier || "Bronze"] = (tierCounts[c.tier || "Bronze"] || 0) + 1; });
        const expByCat = {};
        cachedExpenses.forEach(e => { expByCat[e.category || "Other"] = (expByCat[e.category || "Other"] || 0) + (e.amount || 0); });
        const topExpCat = Object.entries(expByCat).sort((a, b) => b[1] - a[1])[0];

        el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL REVENUE</div><div class="stat-value">${fmt(totalRev + totalRefreshRev)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">Sessions + Refreshments</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(239,68,68,.15)">💸</div><div class="stat-info"><div class="stat-label">TOTAL EXPENSES</div><div class="stat-value">${fmt(totalExp)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📈</div><div class="stat-info"><div class="stat-label">NET PROFIT</div><div class="stat-value" style="color:${profit >= 0 ? "var(--neon-green)" : "var(--neon-red)"}">${fmt(profit)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">Revenue - Expenses</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">📋</div><div class="stat-info"><div class="stat-label">TOTAL SESSIONS</div><div class="stat-value">${completed.length}</div></div></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Today's Summary</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border)"><div style="font-size:11px;color:var(--text-muted)">Sessions</div><div style="font-size:20px;font-weight:800;color:#fff;margin-top:4px">${todaySess.length}</div></div>
                    <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border)"><div style="font-size:11px;color:var(--text-muted)">Revenue</div><div style="font-size:20px;font-weight:800;color:var(--neon-green);margin-top:4px">${fmt(todayRev)}</div></div>
                    <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border)"><div style="font-size:11px;color:var(--text-muted)">Refreshments</div><div style="font-size:20px;font-weight:800;color:var(--accent);margin-top:4px">${fmt(refreshRev)}</div></div>
                    <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border)"><div style="font-size:11px;color:var(--text-muted)">Net Today</div><div style="font-size:20px;font-weight:800;color:${netToday >= 0 ? "var(--neon-green)" : "var(--neon-red)"};margin-top:4px">${fmt(netToday)}</div></div>
                </div>
            </div>
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Quick Stats</h3>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-deep);border-radius:8px;border:1px solid var(--card-border)"><span style="font-size:12px;color:var(--text-muted)">Avg Session Duration</span><span style="font-size:14px;font-weight:700;color:#fff">${avgSession} min</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-deep);border-radius:8px;border:1px solid var(--card-border)"><span style="font-size:12px;color:var(--text-muted)">Peak Hour</span><span style="font-size:14px;font-weight:700;color:#fff">${peakHr ? peakHr[0] + ":00" : "N/A"}</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-deep);border-radius:8px;border:1px solid var(--card-border)"><span style="font-size:12px;color:var(--text-muted)">Total Customers</span><span style="font-size:14px;font-weight:700;color:#fff">${cachedCustomers.length}</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-deep);border-radius:8px;border:1px solid var(--card-border)"><span style="font-size:12px;color:var(--text-muted)">Top Expense Category</span><span style="font-size:14px;font-weight:700;color:#fff">${topExpCat ? topExpCat[0] : "None"}</span></div>
                </div>
            </div>
        </div>
        <div class="dash-card">
            <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Customer Tier Distribution</h3>
            <div style="display:flex;gap:12px">${["Bronze","Silver","Gold","Platinum"].map(tier => {
                const count = tierCounts[tier] || 0;
                const total = cachedCustomers.length || 1;
                const pct = Math.round((count / total) * 100);
                const colors = { Bronze: "#cd7f32", Silver: "#c0c0c0", Gold: "#ffd700", Platinum: "#e5e4e2" };
                return `<div style="flex:1;background:var(--bg-deep);border-radius:10px;padding:14px;border:1px solid var(--card-border);text-align:center">
                    <div style="width:48px;height:48px;border-radius:50%;background:${colors[tier]}20;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:20px">${tier === "Bronze" ? "🥉" : tier === "Silver" ? "🥈" : tier === "Gold" ? "🥇" : "💎"}</div>
                    <div style="font-size:13px;font-weight:700;color:#fff">${count}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${tier}</div>
                    <div style="height:4px;background:var(--surface);border-radius:2px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${colors[tier]};border-radius:2px"></div></div>
                </div>`;
            }).join("")}</div>
        </div>`;

    } else if (reportTab === "revenue") {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            const rev = completed.filter(s => new Date(s.startTime).getHours() === i).reduce((s, x) => s + (x.amount || 0), 0);
            hours.push({ label: String(i).padStart(2, "0") + ":00", value: rev });
        }
        const maxRev = Math.max(...hours.map(h => h.value), 1);
        const w = 700, h2 = 180, pad = 50;
        const points = hours.map((d, i) => `${pad + (i / 23) * (w - pad * 2)},${h2 - (d.value / maxRev) * (h2 - 20)}`).join(" ");
        const areaPoints = points + ` ${pad + (w - pad * 2)},${h2} ${pad},${h2}`;
        const revByDevice = {};
        completed.forEach(s => { revByDevice[s.deviceName] = (revByDevice[s.deviceName] || 0) + (s.amount || 0); });
        const sortedDevices = Object.entries(revByDevice).sort((a, b) => b[1] - a[1]);

        el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL REVENUE</div><div class="stat-value">${fmt(totalRev)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📈</div><div class="stat-info"><div class="stat-label">TODAY</div><div class="stat-value">${fmt(todayRev)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">🕐</div><div class="stat-info"><div class="stat-label">YESTERDAY</div><div class="stat-value">${fmt(yesterdayRev)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">📦</div><div class="stat-info"><div class="stat-label">REFRESHMENTS</div><div class="stat-value">${fmt(refreshRev)}</div></div></div></div>
        </div>
        <div class="dash-card" style="margin-bottom:20px">
            <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Hourly Revenue</h3>
            <svg viewBox="0 0 ${w} ${h2 + 24}" style="width:100%;height:auto">
                <defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
                ${[0, 0.25, 0.5, 0.75, 1].map(p => `<line x1="${pad}" y1="${h2 - p * (h2 - 20)}" x2="${w - pad}" y2="${h2 - p * (h2 - 20)}" stroke="var(--card-border)" stroke-dasharray="4 4"/><text x="${pad - 8}" y="${h2 - p * (h2 - 20) + 4}" text-anchor="end" style="font-size:9px;fill:var(--text-muted)">${fmt(Math.round(maxRev * p))}</text>`).join("")}
                <polygon points="${areaPoints}" fill="url(#chartGrad)"/>
                <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="2.5"/>
                ${hours.map((d, i) => i % 4 === 0 ? `<text x="${pad + (i / 23) * (w - pad * 2)}" y="${h2 + 16}" text-anchor="middle" style="font-size:9px;fill:var(--text-muted)">${d.label}</text>` : "").join("")}
            </svg>
        </div>
        <div class="dash-card">
            <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Revenue by Device</h3>
            ${sortedDevices.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px">No data</p>' :
            sortedDevices.map(([name, rev]) => {
                const pct = Math.round((rev / totalRev) * 100);
                return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><span style="width:70px;font-size:13px;color:var(--text-secondary);font-weight:600">${name}</span><div style="flex:1;background:var(--bg-deep);border-radius:6px;height:32px;overflow:hidden;border:1px solid var(--card-border)"><div style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:6px;display:flex;align-items:center;padding-left:12px;width:${pct}%;min-width:40px;transition:width .8s ease"><span style="font-size:11px;color:#fff;font-weight:700">${fmt(rev)} (${pct}%)</span></div></div></div>`;
            }).join("")}
        </div>`;

    } else if (reportTab === "devices") {
        const deviceStats = {};
        completed.forEach(s => {
            if (!deviceStats[s.deviceName]) deviceStats[s.deviceName] = { sessions: 0, revenue: 0, totalMins: 0 };
            deviceStats[s.deviceName].sessions++;
            deviceStats[s.deviceName].revenue += s.amount || 0;
            deviceStats[s.deviceName].totalMins += s.durationMinutes || 0;
        });
        const maxSessions = Math.max(...Object.values(deviceStats).map(d => d.sessions), 1);

        el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">🎮</div><div class="stat-info"><div class="stat-label">ACTIVE DEVICES</div><div class="stat-value">${cachedDevices.filter(d => d.status !== "maintenance").length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">📊</div><div class="stat-info"><div class="stat-label">TOTAL SESSIONS</div><div class="stat-value">${completed.length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">⏱️</div><div class="stat-info"><div class="stat-label">AVG SESSION</div><div class="stat-value">${completed.length ? Math.round(completed.reduce((s, x) => s + (x.durationMinutes || 0), 0) / completed.length) : 0}m</div></div></div></div>
        </div>
        ${Object.entries(deviceStats).length === 0 ? '<div class="dash-card" style="text-align:center;padding:40px;color:var(--text-muted)">No device data yet</div>' :
        `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px">${Object.entries(deviceStats).map(([name, stat]) => {
            const avgDur = stat.sessions ? Math.round(stat.totalMins / stat.sessions) : 0;
            const pct = Math.round((stat.sessions / maxSessions) * 100);
            const dev = cachedDevices.find(d => d.name === name);
            return `<div class="dash-card">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px"><span style="font-size:28px">${dev?.icon || "🎮"}</span><div><div style="font-weight:700;color:#fff;font-size:15px">${name}</div><div style="font-size:11px;color:var(--text-muted)">${dev?.type || "console"}</div></div></div>
                <div style="height:8px;background:var(--bg-deep);border-radius:4px;overflow:hidden;margin-bottom:14px;border:1px solid var(--card-border)"><div style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:4px;width:${pct}%;transition:width .8s ease"></div></div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
                    <div style="text-align:center;padding:8px;background:var(--bg-deep);border-radius:8px;border:1px solid var(--card-border)"><div style="font-size:18px;font-weight:800;color:#fff">${stat.sessions}</div><div style="font-size:10px;color:var(--text-muted)">Sessions</div></div>
                    <div style="text-align:center;padding:8px;background:var(--bg-deep);border-radius:8px;border:1px solid var(--card-border)"><div style="font-size:18px;font-weight:800;color:var(--neon-green)">${fmt(stat.revenue)}</div><div style="font-size:10px;color:var(--text-muted)">Revenue</div></div>
                    <div style="text-align:center;padding:8px;background:var(--bg-deep);border-radius:8px;border:1px solid var(--card-border)"><div style="font-size:18px;font-weight:800;color:var(--accent)">${avgDur}m</div><div style="font-size:10px;color:var(--text-muted)">Avg Time</div></div>
                </div>
            </div>`;
        }).join("")}</div>`}`;

    } else if (reportTab === "customers") {
        const sorted = [...cachedCustomers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 15);
        const topSpender = sorted[0];
        const totalSpentAll = cachedCustomers.reduce((s, c) => s + (c.totalSpent || 0), 0);
        const totalVisits = cachedCustomers.reduce((s, c) => s + (c.visits || 0), 0);
        const medals = ["🥇", "🥈", "🥉"];

        el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">👥</div><div class="stat-info"><div class="stat-label">TOTAL CUSTOMERS</div><div class="stat-value">${cachedCustomers.length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL SPENT</div><div class="stat-value">${fmt(totalSpentAll)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">📊</div><div class="stat-info"><div class="stat-label">TOTAL VISITS</div><div class="stat-value">${totalVisits}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">⭐</div><div class="stat-info"><div class="stat-label">AVG SPENT</div><div class="stat-value">${cachedCustomers.length ? fmt(Math.round(totalSpentAll / cachedCustomers.length)) : fmt(0)}</div></div></div></div>
        </div>
        ${topSpender ? `<div class="dash-card" style="margin-bottom:20px;background:linear-gradient(135deg,var(--surface),var(--bg-deep));border:1px solid rgba(245,158,11,.3)">
            <div style="display:flex;align-items:center;gap:16px"><div style="font-size:42px">👑</div><div><div style="font-size:12px;color:var(--neon-yellow);font-weight:600;text-transform:uppercase;letter-spacing:1px">Top Customer</div><div style="font-size:22px;font-weight:800;color:#fff;margin-top:2px">${topSpender.name}</div><div style="font-size:13px;color:var(--text-muted);margin-top:2px">${topSpender.visits || 0} visits · ${topSpender.tier || "Bronze"} tier · ${fmt(topSpender.totalSpent || 0)} spent</div></div></div>
        </div>` : ""}
        <div class="dash-card">
            <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Customer Leaderboard</h3>
            ${sorted.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px">No customers yet</p>' :
            `<table class="data-table"><thead><tr><th style="width:50px">#</th><th>Name</th><th style="text-align:right">Visits</th><th style="text-align:right">Spent</th><th style="text-align:right">Points</th><th>Tier</th></tr></thead>
            <tbody>${sorted.map((c, i) => {
                const tc = { Bronze: "var(--neon-yellow)", Silver: "#c0c0c0", Gold: "#ffd700", Platinum: "var(--accent)" };
                return `<tr><td style="color:${i < 3 ? "var(--neon-yellow)" : "var(--text-muted)"};font-weight:700;font-size:15px">${i < 3 ? medals[i] : i + 1}</td>
                <td style="color:#fff;font-weight:600">${c.name}</td>
                <td style="text-align:right">${c.visits || 0}</td>
                <td style="text-align:right;color:var(--neon-green);font-weight:700">${fmt(c.totalSpent)}</td>
                <td style="text-align:right;color:var(--accent)">${c.points || 0}</td>
                <td><span style="padding:3px 10px;border-radius:20px;background:${tc[c.tier] || tc.Bronze}20;color:${tc[c.tier] || tc.Bronze};font-size:11px;font-weight:600">${c.tier || "Bronze"}</span></td></tr>`;
            }).join("")}</tbody></table>`}
        </div>`;

    } else if (reportTab === "expenses") {
        const catExp = {};
        cachedExpenses.forEach(e => { catExp[e.category || "Other"] = (catExp[e.category || "Other"] || 0) + (e.amount || 0); });
        const sortedCats = Object.entries(catExp).sort((a, b) => b[1] - a[1]);
        const maxExpCat = sortedCats[0] ? sortedCats[0][1] : 1;
        const catColors = { "Rent": "#ef4444", "Utilities": "#f59e0b", "Salaries": "#6366f1", "Maintenance": "#06b6d4", "Supplies": "#10b981", "Marketing": "#ec4899", "Other": "#8b5cf6" };
        const now = new Date();
        const monthExp = cachedExpenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, e) => s + (e.amount || 0), 0);
        const lastMonthExp = cachedExpenses.filter(e => { const d = new Date(e.date); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }).reduce((s, e) => s + (e.amount || 0), 0);
        const expChange = lastMonthExp > 0 ? Math.round(((monthExp - lastMonthExp) / lastMonthExp) * 100) : 0;

        el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(239,68,68,.15)">💸</div><div class="stat-info"><div class="stat-label">TOTAL EXPENSES</div><div class="stat-value">${fmt(totalExp)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">📊</div><div class="stat-info"><div class="stat-label">THIS MONTH</div><div class="stat-value">${fmt(monthExp)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📈</div><div class="stat-info"><div class="stat-label">VS LAST MONTH</div><div class="stat-value" style="color:${expChange <= 0 ? "var(--neon-green)" : "var(--neon-red)"}">${expChange > 0 ? "+" : ""}${expChange}%</div></div></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Expenses by Category</h3>
                ${sortedCats.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px">No expenses</p>' :
                sortedCats.map(([cat, amt]) => {
                    const pct = Math.round((amt / maxExpCat) * 100);
                    const totalPct = totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0;
                    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="width:80px;font-size:12px;color:var(--text-secondary);font-weight:600">${cat}</span><div style="flex:1;background:var(--bg-deep);border-radius:6px;height:28px;overflow:hidden;border:1px solid var(--card-border)"><div style="height:100%;background:${catColors[cat] || catColors.Other};border-radius:6px;display:flex;align-items:center;padding-left:10px;width:${pct}%;min-width:30px;transition:width .8s ease"><span style="font-size:10px;color:#fff;font-weight:700">${fmt(amt)} (${totalPct}%)</span></div></div></div>`;
                }).join("")}
            </div>
            <div class="dash-card">
                <h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:14px">Recent Expenses</h3>
                <div style="max-height:250px;overflow-y:auto">
                ${cachedExpenses.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px">No expenses</p>' :
                cachedExpenses.slice(-10).reverse().map(e => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--card-border)">
                    <div><div style="font-size:13px;color:#fff;font-weight:600">${e.description || "-"}</div><div style="font-size:11px;color:var(--text-muted)">${e.date} · ${e.category || "Other"}</div></div>
                    <div style="font-size:13px;font-weight:700;color:var(--neon-red)">${fmt(e.amount)}</div>
                </div>`).join("")}
                </div>
            </div>
        </div>`;
    }
}

// ─── PRODUCTS PAGE ───
function pageProducts() {
    const d = cachedRefreshment; const cats = [...new Set(d.menu.map(i => i.category))];
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TODAY'S REVENUE</div><div class="stat-value">${fmt(d.todayRevenue)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">📦</div><div class="stat-info"><div class="stat-label">ITEMS SOLD</div><div class="stat-value">${d.itemsSold}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📋</div><div class="stat-info"><div class="stat-label">MENU ITEMS</div><div class="stat-value">${d.menu.length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(239,68,68,.15)">⚠️</div><div class="stat-info"><div class="stat-label">LOW STOCK</div><div class="stat-value">${d.menu.filter(i => i.stock > 0 && i.stock < 5).length}</div></div></div></div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" id="btn-add-item">+ Add Item</button></div>
        ${cats.map(cat => `<div style="margin-bottom:20px"><h3 style="font-size:14px;font-weight:700;color:#fff;margin-bottom:10px;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--primary)"></span>${cat}</h3>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">${d.menu.filter(i => i.category === cat).map(item => `<div class="dash-card">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px"><div style="font-weight:700;color:#fff;font-size:14px">${item.name}</div><button class="btn-del-item" data-item="${item.id}" style="background:rgba(239,68,68,.15);color:var(--neon-red);border:1px solid rgba(239,68,68,.3);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer">Remove</button></div>
                <div style="font-size:14px;font-weight:700;color:var(--neon-green)">${fmt(item.price)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Stock: <span style="color:${item.stock < 5 ? "var(--neon-red)" : "var(--neon-green)"};font-weight:600">${item.stock > 0 ? item.stock : "∞"}</span></div>
                <button class="btn-sell-item btn-success btn-full btn-sm" data-item="${item.id}" style="margin-top:10px">Sell</button>
            </div>`).join("")}</div></div>`).join("")}
    </div>`;
}

// ─── STOCK PAGE ───
function pageStock() {
    const menu = cachedRefreshment.menu;
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📦</div><div class="stat-info"><div class="stat-label">TOTAL ITEMS</div><div class="stat-value">${menu.length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">⚠️</div><div class="stat-info"><div class="stat-label">LOW STOCK</div><div class="stat-value">${menu.filter(i => i.stock > 0 && i.stock < 5).length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">✅</div><div class="stat-info"><div class="stat-label">IN STOCK</div><div class="stat-value">${menu.filter(i => i.stock >= 5).length}</div></div></div></div>
        </div>
        <div class="dash-card"><div class="section-header"><h3>Stock Levels</h3></div>
            <table class="data-table"><thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${menu.map(item => `<tr><td style="color:#fff;font-weight:600">${item.name}</td><td><span style="padding:3px 10px;border-radius:20px;background:var(--primary)20;color:var(--primary);font-size:11px;font-weight:600">${item.category}</span></td><td style="font-weight:700">${fmt(item.price)}</td><td style="font-weight:700;color:${item.stock < 5 ? "var(--neon-red)" : "var(--neon-green)"}">${item.stock}</td><td>${item.stock < 5 ? '<span class="badge-lowstock">Low</span>' : item.stock < 15 ? '<span style="color:var(--neon-yellow);font-size:11px;font-weight:600">Medium</span>' : '<span style="color:var(--neon-green);font-size:11px;font-weight:600">Good</span>'}</td><td><button class="btn-restock btn-outline btn-sm" data-item="${item.id}" data-name="${item.name}" data-stock="${item.stock}">Restock</button></td></tr>`).join("")}</tbody></table>
        </div>
    </div>`;
}

// ─── STAFF PAGE ───
function pageStaff() {
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-size:18px;font-weight:700;color:#fff">Staff (${cachedStaff.length})</h2>
            <button class="btn-primary" id="btn-add-staff">+ Add Staff</button>
        </div>
        ${cachedStaff.length === 0 ? '<div class="dash-card" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:8px">🧑‍💼</div><p>No staff members yet</p></div>' :
        `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${cachedStaff.map(s => `<div class="dash-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:10px"><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--neon-pink),var(--primary));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">${(s.name || "?").charAt(0).toUpperCase()}</div><div><div style="font-weight:700;color:#fff;font-size:14px">${s.name}</div><div style="font-size:11px;color:var(--text-muted)">${s.role}</div></div></div>
                <button class="btn-del-staff" data-staff="${s.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px">🗑️</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted);padding-top:8px;border-top:1px solid var(--card-border)">${s.phone || "No phone"} · Joined ${s.joinDate || "-"}</div>
        </div>`).join("")}</div>`}
    </div>`;
}

// ─── USERS PAGE ───
function pageUsers() {
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-size:18px;font-weight:700;color:#fff">System Users (${cachedUsers.length})</h2>
            <button class="btn-primary" id="btn-add-user">+ Add User</button>
        </div>
        <div class="dash-card"><table class="data-table"><thead><tr><th>User</th><th>Role</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${cachedUsers.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px">No users yet</td></tr>' :
        cachedUsers.map(u => `<tr><td style="color:#fff;font-weight:600;display:flex;align-items:center;gap:8px"><div style="width:32px;height:32px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px">${(u.name || "?").charAt(0)}</div>${u.name}</td><td><span style="padding:3px 10px;border-radius:20px;background:var(--primary)20;color:var(--primary);font-size:11px;font-weight:600">${u.role}</span></td><td style="color:var(--text-secondary)">${u.email || "-"}</td><td><span style="color:var(--neon-green);font-size:11px;font-weight:600">● ${u.status || "Active"}</span></td><td><button class="btn-del-user btn-outline btn-sm" data-user="${u.id}" data-name="${u.name}">🗑️</button></td></tr>`).join("")}</tbody></table></div>
    </div>`;
}

// ─── LOGS PAGE ───
function pageLogs() {
    const sorted = cachedLogs.slice().reverse().slice(0, 50);
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-size:18px;font-weight:700;color:#fff">Activity Logs (${sorted.length})</h2>
            <button class="btn-outline btn-sm" id="btn-export-logs">Export Logs</button>
        </div>
        <div class="dash-card"><table class="data-table"><thead><tr><th>Time</th><th>Action</th><th>User</th><th>Details</th></tr></thead>
        <tbody>${sorted.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px">No activity logs yet</td></tr>' :
        sorted.map(l => `<tr><td style="color:var(--text-muted);white-space:nowrap">${l.date} ${l.time}</td><td><span style="padding:3px 10px;border-radius:20px;background:var(--primary)20;color:var(--primary);font-size:11px;font-weight:600">${l.action}</span></td><td style="color:#fff;font-weight:600">${l.user}</td><td style="color:var(--text-secondary)">${l.details}</td></tr>`).join("")}</tbody></table></div>
    </div>`;
}

// ─── SETTINGS PAGE ───
function pageSettings() {
    const s = cachedSettings || {}; const gen = s.general || {}, pr = s.pricing || {}, hr = s.hours || {}, se = s.session || {}, lo = s.loyalty || {};
    const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const openDays = hr.openDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `<div class="page-enter">
        <div class="settings-section"><div class="section-head"><span style="font-size:18px">🏪</span><h3>General</h3></div>
            <div class="section-body" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group"><label>Cafe Name</label><input id="s-cafeName" type="text" value="${gen.cafeName || ""}" class="form-input"/></div>
                <div class="form-group"><label>Phone</label><input id="s-phone" type="tel" value="${gen.phone || ""}" class="form-input"/></div>
                <div class="form-group"><label>Email</label><input id="s-email" type="email" value="${gen.email || ""}" class="form-input"/></div>
                <div class="form-group"><label>Address</label><input id="s-address" type="text" value="${gen.address || ""}" class="form-input"/></div>
            </div></div>
        <div class="settings-section"><div class="section-head"><span style="font-size:18px">💰</span><h3>Pricing</h3></div>
            <div class="section-body" style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
                ${cachedDevices.map(d => `<div style="background:var(--bg-deep);border-radius:12px;padding:14px;border:1px solid var(--card-border)">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:18px">${d.icon}</span><h4 style="font-weight:700;color:#fff;font-size:13px;margin:0">${d.name}</h4></div>
                    <div class="form-group" style="margin-bottom:8px"><label style="font-size:11px">1 Hour</label><div style="position:relative"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px">₹</span><input data-price-key="${d.id}" type="number" value="${pr[d.id] || 0}" class="form-input price-input" style="padding-left:28px"/></div></div>
                    <div class="form-group" style="margin-bottom:0"><label style="font-size:11px">30 Min</label><div style="position:relative"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px">₹</span><input data-price-key="${d.id}_30min" type="number" value="${pr[d.id + '_30min'] || 0}" class="form-input price-input" style="padding-left:28px"/></div></div>
                </div>`).join("")}
            </div></div>
        <div class="settings-section"><div class="section-head"><span style="font-size:18px">🕐</span><h3>Hours</h3></div>
            <div class="section-body" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group"><label>Open</label><input id="s-open" type="time" value="${hr.open || '10:00'}" class="form-input"/></div>
                <div class="form-group"><label>Close</label><input id="s-close" type="time" value="${hr.close || '23:00'}" class="form-input"/></div>
                <div style="grid-column:span 2"><label style="display:block;font-size:12px;color:var(--text-muted);margin-bottom:8px">Open Days</label><div style="display:flex;gap:6px">${allDays.map(d => `<button data-day="${d}" class="day-btn" style="padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid ${openDays.includes(d) ? 'var(--primary)' : 'var(--card-border)'};background:${openDays.includes(d) ? 'var(--primary)' : 'var(--surface)'};color:${openDays.includes(d) ? '#fff' : 'var(--text-muted)'};cursor:pointer;transition:all .2s">${d}</button>`).join("")}</div></div>
            </div></div>
        <div class="settings-section"><div class="section-head"><span style="font-size:18px">⏱️</span><h3>Session</h3></div>
            <div class="section-body" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group"><label>Warning (min)</label><input id="s-warning" type="number" value="${se.warningMinutes || 5}" class="form-input"/></div>
                <div class="form-group"><label>Grace (min)</label><input id="s-grace" type="number" value="${se.graceMinutes || 10}" class="form-input"/></div>
                <div style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:var(--bg-deep);border-radius:10px;padding:14px;border:1px solid var(--card-border)"><div><h4 style="font-weight:600;color:#fff;font-size:13px;margin:0">Auto-End</h4><p style="font-size:11px;color:var(--text-muted);margin:2px 0 0">End expired sessions automatically</p></div><div id="toggleAutoEnd" class="toggle ${se.autoEnd !== false ? 'on' : 'off'}"><div class="toggle-dot"></div></div></div>
                <div style="grid-column:span 2;display:flex;align-items:center;justify-content:space-between;background:var(--bg-deep);border-radius:10px;padding:14px;border:1px solid var(--card-border)"><div><h4 style="font-weight:600;color:#fff;font-size:13px;margin:0">Sound</h4><p style="font-size:11px;color:var(--text-muted);margin:2px 0 0">Play alarm when session expires</p></div><div id="toggleSound" class="toggle ${se.soundNotifications ? 'on' : 'off'}"><div class="toggle-dot"></div></div></div>
            </div></div>
        <div class="settings-section"><div class="section-head"><span style="font-size:18px">🏆</span><h3>Loyalty Tiers</h3></div>
            <div class="section-body" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
                <div style="background:var(--bg-deep);border-radius:12px;padding:14px;border:1px solid var(--card-border);text-align:center">
                    <div style="font-size:24px;margin-bottom:6px">🥉</div>
                    <div style="font-size:12px;font-weight:600;color:#c0c0c0;margin-bottom:8px">Silver</div>
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Min Spent (₹)</label><input id="s-tier-silver" type="number" value="${lo.silver || 1000}" class="form-input" style="text-align:center"/></div>
                </div>
                <div style="background:var(--bg-deep);border-radius:12px;padding:14px;border:1px solid var(--card-border);text-align:center">
                    <div style="font-size:24px;margin-bottom:6px">🥇</div>
                    <div style="font-size:12px;font-weight:600;color:#ffd700;margin-bottom:8px">Gold</div>
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Min Spent (₹)</label><input id="s-tier-gold" type="number" value="${lo.gold || 3000}" class="form-input" style="text-align:center"/></div>
                </div>
                <div style="background:var(--bg-deep);border-radius:12px;padding:14px;border:1px solid var(--card-border);text-align:center">
                    <div style="font-size:24px;margin-bottom:6px">💎</div>
                    <div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:8px">Platinum</div>
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Min Spent (₹)</label><input id="s-tier-platinum" type="number" value="${lo.platinum || 6000}" class="form-input" style="text-align:center"/></div>
                </div>
                <div style="background:var(--bg-deep);border-radius:12px;padding:14px;border:1px solid var(--card-border);text-align:center">
                    <div style="font-size:24px;margin-bottom:6px">⭐</div>
                    <div style="font-size:12px;font-weight:600;color:var(--neon-yellow);margin-bottom:8px">Points / ₹</div>
                    <div class="form-group" style="margin:0"><label style="font-size:11px">Points per ₹10</label><input id="s-tier-points" type="number" value="${lo.pointsPerRupee || 0.1}" class="form-input" style="text-align:center" step="0.1"/></div>
                </div>
            </div></div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px"><button class="btn-outline" id="btn-cancel-settings">Cancel</button><button class="btn-primary" id="btn-save-settings">💾 Save</button></div>
    </div>`;
}

// ─── MODALS ───
function modalDevicePicker() {
    const avail = cachedDevices.filter(d => d.status === "available");
    if (avail.length === 0) { toast("No available devices", "error"); return; }
    const ov = showModal(`<div class="modal-box">
        <div class="modal-header"><h2>Select Device</h2><button class="modal-close">&times;</button></div>
        <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">Choose a device to start a session:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${avail.map(d => { const price = cachedSettings?.pricing?.[d.id] || 0; const price30 = cachedSettings?.pricing?.[d.id + "_30min"] || 0;
                return `<div class="device-pick" data-device="${d.id}" style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg-deep);border:2px solid var(--card-border);border-radius:12px;cursor:pointer;transition:all .2s">
                    <div style="font-size:28px">${d.icon || "🎮"}</div><div><div style="font-weight:700;color:#fff;font-size:14px">${d.name}</div><div style="font-size:11px;color:var(--text-muted)">${d.type || "console"}</div><div style="font-size:11px;color:var(--neon-green);margin-top:2px">${fmt(price)}/hr · ${fmt(price30)}/30min</div></div></div>`}).join("")}
        </div></div>`);
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelectorAll(".device-pick").forEach(el => {
        el.addEventListener("mouseenter", () => { el.style.borderColor = "var(--primary)"; el.style.background = "rgba(99,102,241,.08)"; });
        el.addEventListener("mouseleave", () => { el.style.borderColor = "var(--card-border)"; el.style.background = "var(--bg-deep)"; });
        el.addEventListener("click", () => { const device = cachedDevices.find(d => d.id === el.dataset.device); closeModal(); if (device) modalSessionStart(device); });
    });
}

function modalSessionStart(device) {
    const price = cachedSettings?.pricing?.[device.id] || 0;
    const price30 = cachedSettings?.pricing?.[device.id + "_30min"] || 0;
    const custOpts = cachedCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    const menuItems = cachedRefreshment.menu.filter(i => i.stock > 0 || i.stock === 0);
    const categories = [...new Set(menuItems.map(i => i.category))];
    let selectedProducts = [];

    function renderProductList() {
        return categories.map(cat => {
            const items = menuItems.filter(i => i.category === cat);
            if (items.length === 0) return "";
            return `<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${cat}</div>
                ${items.map(item => `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:var(--bg-deep);border-radius:8px;margin-bottom:4px;border:1px solid var(--card-border)">
                    <div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px">📦</span><div><div style="font-size:12px;font-weight:600;color:#fff">${item.name}</div><div style="font-size:10px;color:var(--neon-green)">${fmt(item.price)}</div></div></div>
                    <button class="add-prod-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" style="background:var(--neon-green);color:#fff;border:none;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer">+ Add</button>
                </div>`).join("")}
            </div>`;
        }).join("");
    }

    function renderSelectedProducts() {
        if (selectedProducts.length === 0) return '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">No products added yet</div>';
        return selectedProducts.map((p, i) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg-deep);border-radius:8px;margin-bottom:4px;border:1px solid var(--card-border)">
            <div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px">📦</span><div><div style="font-size:12px;font-weight:600;color:#fff">${p.name}</div><div style="font-size:10px;color:var(--neon-green)">${fmt(p.price)} each</div></div></div>
            <div style="display:flex;align-items:center;gap:6px">
                <button class="qty-minus" data-idx="${i}" style="background:var(--surface);color:#fff;border:1px solid var(--card-border);border-radius:6px;width:26px;height:26px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">-</button>
                <span style="font-size:13px;color:#fff;font-weight:700;min-width:20px;text-align:center">${p.qty}</span>
                <button class="qty-plus" data-idx="${i}" style="background:var(--surface);color:#fff;border:1px solid var(--card-border);border-radius:6px;width:26px;height:26px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>
                <span style="font-size:12px;color:var(--neon-green);font-weight:700;min-width:45px;text-align:right">${fmt(p.price * p.qty)}</span>
                <button class="remove-prod" data-idx="${i}" style="background:rgba(239,68,68,.15);color:var(--neon-red);border:1px solid rgba(239,68,68,.3);border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px">Remove</button>
            </div>
        </div>`).join("");
    }

    let isOpenEnded = false;

    function calcTotal() {
        const mins = parseInt(ov.querySelector("#m-duration").value) || 0;
        let base = 0;
        if (!isOpenEnded) {
            base = mins <= 30 && price30 ? price30 : Math.ceil((mins / 60) * price);
        }
        const extra = selPlayers === 2 ? 50 : 0;
        const prodTotal = selectedProducts.reduce((s, p) => s + (p.price * p.qty), 0);
        return { session: base, extra, prodTotal, total: base + extra + prodTotal };
    }

    function updTotal() {
        const t = calcTotal();
        const rateLabel = ov.querySelector("#m-rate-label");
        if (rateLabel) rateLabel.textContent = isOpenEnded ? "Pay at end" : "Session";
        ov.querySelector("#m-rate").textContent = isOpenEnded ? "—" : fmt(t.session);
        ov.querySelector("#m-player-line").style.display = selPlayers === 2 ? "flex" : "none";
        ov.querySelector("#m-prod-line").style.display = t.prodTotal > 0 ? "flex" : "none";
        ov.querySelector("#m-prod-amount").textContent = fmt(t.prodTotal);
        ov.querySelector("#m-total").textContent = isOpenEnded && t.session === 0 ? fmt(t.extra + t.prodTotal) : fmt(t.total);
        const durInput = ov.querySelector("#m-duration");
        if (durInput) durInput.parentElement.style.display = isOpenEnded ? "none" : "block";
        const prodList = ov.querySelector("#m-selected-prods");
        if (prodList) prodList.innerHTML = renderSelectedProducts();
        bindProdQtyEvents();
    }

    function bindProdQtyEvents() {
        ov.querySelectorAll(".qty-plus").forEach(b => b.addEventListener("click", () => { const i = parseInt(b.dataset.idx); selectedProducts[i].qty++; updTotal(); }));
        ov.querySelectorAll(".qty-minus").forEach(b => b.addEventListener("click", () => { const i = parseInt(b.dataset.idx); if (selectedProducts[i].qty > 1) selectedProducts[i].qty--; else selectedProducts.splice(i, 1); updTotal(); }));
        ov.querySelectorAll(".remove-prod").forEach(b => b.addEventListener("click", () => { selectedProducts.splice(parseInt(b.dataset.idx), 1); updTotal(); }));
    }

    const ov = showModal(`<div class="modal-box" style="max-width:850px">
        <div class="modal-header"><h2>Start Session — ${device.name}</h2><button class="modal-close">&times;</button></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <!-- Left: Session Details -->
            <div>
                <div style="display:flex;align-items:center;gap:10px;background:var(--bg-deep);border-radius:10px;padding:10px;border:1px solid var(--card-border);margin-bottom:14px">
                    <span style="font-size:24px">${device.icon || "🎮"}</span><div><div style="font-weight:700;color:#fff">${device.name}</div><div style="font-size:11px;color:var(--text-muted)">${fmt(price)}/hr · ${fmt(price30)}/30min</div></div>
                </div>
                <div class="form-group"><label>Customer Name</label><input id="m-customer" type="text" placeholder="Enter name" class="form-input"/></div>
                <div class="form-group"><label>Phone (optional)</label><input id="m-cust-phone" type="tel" placeholder="Phone number" class="form-input"/></div>
                <div class="form-group"><label>Link Existing Customer</label><select id="m-customerId" class="form-select"><option value="">— New Customer (will auto save) —</option>${custOpts}</select></div>
                <div class="form-group"><label>Players</label><div style="display:flex;gap:8px"><button data-players="1" class="modal-player btn-primary" style="flex:1">1 Player</button><button data-players="2" class="modal-player btn-outline" style="flex:1">2 Players (+₹50)</button></div></div>
                <div class="form-group"><label>Session Type</label><div style="display:flex;gap:8px"><button class="session-type-btn btn-primary" data-type="fixed" style="flex:1">⏱️ Fixed Duration</button><button class="session-type-btn btn-outline" data-type="open" style="flex:1">🔓 Open / Pay at End</button></div></div>
                <div class="form-group" id="m-duration-group"><label>Duration (min)</label><input id="m-duration" type="number" value="60" min="1" class="form-input"/></div>
                <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border);font-size:13px;margin-top:10px">
                    <div style="display:flex;justify-content:space-between;color:var(--text-muted)"><span id="m-rate-label">Session</span><span id="m-rate">${fmt(price)}</span></div>
                    <div style="display:none;justify-content:space-between;color:var(--text-muted);margin-top:4px" id="m-player-line"><span>2nd Controller</span><span>₹50</span></div>
                    <div style="display:none;justify-content:space-between;color:var(--text-muted);margin-top:4px" id="m-prod-line"><span>Products</span><span id="m-prod-amount">${fmt(0)}</span></div>
                    <div style="display:flex;justify-content:space-between;color:#fff;font-weight:700;margin-top:8px;padding-top:8px;border-top:1px solid var(--card-border)"><span>Total</span><span id="m-total">${fmt(price)}</span></div>
                </div>
                <button id="m-confirm" class="btn-primary btn-full" style="margin-top:14px;padding:12px;font-size:15px">▶ Start Session</button>
            </div>
            <!-- Right: Products -->
            <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><h3 style="font-size:13px;font-weight:700;color:#fff;margin:0">Add Products</h3><span style="font-size:11px;color:var(--text-muted)">${menuItems.length} items</span></div>
                <div style="max-height:420px;overflow-y:auto;padding-right:4px">${renderProductList()}</div>
                <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--card-border)">
                    <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Selected Items</div>
                    <div id="m-selected-prods" style="max-height:120px;overflow-y:auto">${renderSelectedProducts()}</div>
                </div>
            </div>
        </div>
    </div>`);

    let selPlayers = 1;

    ov.querySelectorAll(".add-prod-btn").forEach(b => b.addEventListener("click", () => {
        const existing = selectedProducts.find(p => p.id === b.dataset.id);
        if (existing) { existing.qty++; }
        else { selectedProducts.push({ id: b.dataset.id, name: b.dataset.name, price: parseInt(b.dataset.price), qty: 1 }); }
        updTotal();
    }));

    const dur = ov.querySelector("#m-duration");
    dur.addEventListener("input", updTotal);
    ov.querySelectorAll(".modal-player").forEach(b => b.addEventListener("click", () => {
        selPlayers = parseInt(b.dataset.players);
        ov.querySelectorAll(".modal-player").forEach(x => { x.className = "modal-player btn-outline"; x.style.flex = "1"; });
        b.className = "modal-player btn-primary"; b.style.flex = "1"; updTotal();
    }));
    ov.querySelectorAll(".session-type-btn").forEach(b => b.addEventListener("click", () => {
        isOpenEnded = b.dataset.type === "open";
        ov.querySelectorAll(".session-type-btn").forEach(x => { x.className = "session-type-btn btn-outline"; x.style.flex = "1"; });
        b.className = "session-type-btn btn-primary"; b.style.flex = "1"; updTotal();
    }));
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-confirm").addEventListener("click", async () => {
        const name = ov.querySelector("#m-customer").value.trim();
        if (!name) { ov.querySelector("#m-customer").style.borderColor = "var(--neon-red)"; return; }
        let custId = ov.querySelector("#m-customerId").value || null;
        const phone = ov.querySelector("#m-cust-phone").value.trim();
        if (!custId && name) {
            const exists = cachedCustomers.find(c => c.name.toLowerCase() === name.toLowerCase());
            if (exists) { custId = exists.id; }
            else {
                const newCust = await window.api.customers.add({ name, phone: phone || "", email: "" });
                if (newCust && newCust.customer && newCust.customer.id) { custId = newCust.customer.id; await loadCustomers(); }
            }
        }
        const durVal = ov.querySelector("#m-duration").value;
        await window.api.sessions.start({ deviceId: device.id, customerName: name, durationMinutes: parseInt(durVal) || 60, players: selPlayers, customerId: custId, openEnded: isOpenEnded });
        for (const prod of selectedProducts) {
            await window.api.refreshment.sell({ itemId: prod.id, qty: prod.qty, customerId: custId });
        }
        closeModal();
        toast(selectedProducts.length > 0 ? "Session started with products!" : "Session started!");
        await refreshDashboard();
    });
}

function modalAddDevice() {
    const icons = ["🎮", "🥽", "🖥️", "🎯", "🕹️", "💻", "🎪", "🎲", "⚡"];
    const types = ["console", "pc", "vr", "other"];
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Add Device</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Name</label><input id="m-dev-name" type="text" placeholder="e.g. PS5 #2" class="form-input"/></div>
        <div class="form-group"><label>Type</label><select id="m-dev-type" class="form-select">${types.map(t => `<option value="${t}">${t}</option>`).join("")}</select></div>
        <div class="form-group"><label>Icon</label><div style="display:flex;flex-wrap:wrap;gap:6px">${icons.map((ic, i) => `<button data-icon="${ic}" class="icon-pick" style="font-size:18px;padding:8px;border-radius:8px;border:2px ${i === 0 ? 'solid var(--primary);background:rgba(99,102,241,.15)' : 'solid var(--card-border);background:var(--bg-deep)'};cursor:pointer">${ic}</button>`).join("")}</div></div>
        <button id="m-dev-confirm" class="btn-primary btn-full" style="margin-top:12px;padding:12px">+ Add</button></div>`);
    let selIcon = icons[0];
    ov.querySelectorAll(".icon-pick").forEach(b => b.addEventListener("click", () => { selIcon = b.dataset.icon; ov.querySelectorAll(".icon-pick").forEach(x => { x.style.borderColor = "var(--card-border)"; x.style.background = "var(--bg-deep)"; }); b.style.borderColor = "var(--primary)"; b.style.background = "rgba(99,102,241,.15)"; }));
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-dev-confirm").addEventListener("click", async () => { const name = ov.querySelector("#m-dev-name").value.trim(); if (!name) { ov.querySelector("#m-dev-name").style.borderColor = "var(--neon-red)"; return; } await window.api.devices.add({ name, icon: selIcon, type: ov.querySelector("#m-dev-type").value }); closeModal(); toast("Device added!"); await loadDevices(); await loadDashboard(); render(); });
}

function modalAddCustomer() {
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Add Customer</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Name</label><input id="m-cust-name" type="text" class="form-input"/></div>
        <div class="form-group"><label>Phone</label><input id="m-cust-phone" type="tel" class="form-input"/></div>
        <div class="form-group"><label>Email</label><input id="m-cust-email" type="email" class="form-input"/></div>
        <button id="m-cust-confirm" class="btn-primary btn-full" style="margin-top:12px;padding:12px">+ Add</button></div>`);
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-cust-confirm").addEventListener("click", async () => { const name = ov.querySelector("#m-cust-name").value.trim(); if (!name) { ov.querySelector("#m-cust-name").style.borderColor = "var(--neon-red)"; return; } await window.api.customers.add({ name, phone: ov.querySelector("#m-cust-phone").value, email: ov.querySelector("#m-cust-email").value }); closeModal(); toast("Customer added!"); await loadCustomers(); render(); });
}

function modalAddStaff() {
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Add Staff</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Name</label><input id="m-staff-name" type="text" class="form-input"/></div>
        <div class="form-group"><label>Role</label><select id="m-staff-role" class="form-select"><option>Staff</option><option>Manager</option><option>Cashier</option><option>Technician</option></select></div>
        <div class="form-group"><label>Phone</label><input id="m-staff-phone" type="tel" class="form-input"/></div>
        <button id="m-staff-confirm" class="btn-primary btn-full" style="margin-top:12px;padding:12px">+ Add</button></div>`);
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-staff-confirm").addEventListener("click", async () => { const name = ov.querySelector("#m-staff-name").value.trim(); if (!name) { ov.querySelector("#m-staff-name").style.borderColor = "var(--neon-red)"; return; } await window.api.staff.add({ name, role: ov.querySelector("#m-staff-role").value, phone: ov.querySelector("#m-staff-phone").value }); closeModal(); toast("Staff added!"); await loadStaff(); render(); });
}

function modalAddItem() {
    const cats = ["Drinks", "Snacks", "Meals", "Other"];
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Add Menu Item</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Name</label><input id="m-item-name" type="text" class="form-input"/></div>
        <div class="form-group"><label>Price (₹)</label><input id="m-item-price" type="number" class="form-input"/></div>
        <div class="form-group"><label>Category</label><select id="m-item-cat" class="form-select">${cats.map(c => `<option>${c}</option>`).join("")}</select></div>
        <div class="form-group"><label>Stock</label><input id="m-item-stock" type="number" value="50" class="form-input"/></div>
        <button id="m-item-confirm" class="btn-primary btn-full" style="margin-top:12px;padding:12px">+ Add</button></div>`);
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-item-confirm").addEventListener("click", async () => { const name = ov.querySelector("#m-item-name").value.trim(); if (!name) { ov.querySelector("#m-item-name").style.borderColor = "var(--neon-red)"; return; } await window.api.refreshment.addItem({ name, price: ov.querySelector("#m-item-price").value, category: ov.querySelector("#m-item-cat").value, stock: ov.querySelector("#m-item-stock").value }); closeModal(); toast("Item added!"); await loadRefreshment(); render(); });
}

function modalSellItem(itemId) {
    const item = cachedRefreshment.menu.find(i => i.id === itemId); if (!item) return;
    const custOpts = cachedCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Sell: ${item.name}</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Qty</label><input id="m-sell-qty" type="number" value="1" min="1" class="form-input"/></div>
        <div class="form-group"><label>Link Customer (optional)</label><select id="m-sell-cust" class="form-select"><option value="">Walk-in</option>${custOpts}</select></div>
        <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border);margin-top:8px"><div style="display:flex;justify-content:space-between;color:#fff;font-weight:700"><span>Total</span><span id="m-sell-total">${fmt(item.price)}</span></div></div>
        <button id="m-sell-confirm" class="btn-success btn-full" style="margin-top:16px;padding:12px">Sell</button></div>`);
    const qtyEl = ov.querySelector("#m-sell-qty"), totEl = ov.querySelector("#m-sell-total");
    qtyEl.addEventListener("input", () => { totEl.textContent = fmt(item.price * (parseInt(qtyEl.value) || 1)); });
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-sell-confirm").addEventListener("click", async () => { const r = await window.api.refreshment.sell({ itemId, qty: parseInt(qtyEl.value) || 1, customerId: ov.querySelector("#m-sell-cust").value || null }); if (r.success) { closeModal(); toast("Item sold!"); await loadRefreshment(); render(); } else toast(r.error || "Failed", "error"); });
}

function modalAddExpense() {
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Add Expense</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Category</label><select id="m-exp-cat" class="form-select"><option>Rent</option><option>Utilities</option><option>Salaries</option><option>Maintenance</option><option>Supplies</option><option>Other</option></select></div>
        <div class="form-group"><label>Description</label><input id="m-exp-desc" type="text" class="form-input"/></div>
        <div class="form-group"><label>Amount (₹)</label><input id="m-exp-amount" type="number" class="form-input"/></div>
        <button id="m-exp-confirm" class="btn-primary btn-full" style="margin-top:12px;padding:12px">+ Add</button></div>`);
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-exp-confirm").addEventListener("click", async () => { const amount = parseInt(ov.querySelector("#m-exp-amount").value) || 0; if (!amount) { ov.querySelector("#m-exp-amount").style.borderColor = "var(--neon-red)"; return; } await window.api.expenses.add({ category: ov.querySelector("#m-exp-cat").value, description: ov.querySelector("#m-exp-desc").value, amount, date: todayKey() }); closeModal(); toast("Expense added!"); await loadExpenses(); render(); });
}

function modalNewBooking() {
    const avail = cachedDevices.filter(d => d.status === "available");
    const devOpts = avail.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>New Booking</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Customer Name</label><input id="m-bk-name" type="text" class="form-input"/></div>
        <div class="form-group"><label>Phone</label><input id="m-bk-phone" type="tel" class="form-input"/></div>
        <div class="form-group"><label>Device</label><select id="m-bk-device" class="form-select">${devOpts || '<option>No devices available</option>'}</select></div>
        <div class="form-group"><label>Date</label><input id="m-bk-date" type="date" value="${todayKey()}" class="form-input"/></div>
        <div class="form-group"><label>Time</label><input id="m-bk-time" type="time" value="10:00" class="form-input"/></div>
        <div class="form-group"><label>Duration (min)</label><input id="m-bk-duration" type="number" value="60" min="15" class="form-input"/></div>
        <button id="m-bk-confirm" class="btn-primary btn-full" style="margin-top:12px;padding:12px">+ Create Booking</button></div>`);
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-bk-confirm").addEventListener("click", async () => {
        const name = ov.querySelector("#m-bk-name").value.trim(); if (!name) { ov.querySelector("#m-bk-name").style.borderColor = "var(--neon-red)"; return; }
        const devId = ov.querySelector("#m-bk-device").value;
        const dev = avail.find(d => d.id === devId);
        await window.api.bookings.add({ customerName: name, deviceId: devId, deviceName: dev ? dev.name : "Unknown", date: ov.querySelector("#m-bk-date").value, time: ov.querySelector("#m-bk-time").value, duration: parseInt(ov.querySelector("#m-bk-duration").value) || 60, phone: ov.querySelector("#m-bk-phone").value });
        closeModal(); toast("Booking created!"); await loadBookings(); render();
    });
}

function modalAddUser() {
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Add User</h2><button class="modal-close">&times;</button></div>
        <div class="form-group"><label>Name</label><input id="m-user-name" type="text" class="form-input"/></div>
        <div class="form-group"><label>Email</label><input id="m-user-email" type="email" class="form-input"/></div>
        <div class="form-group"><label>Role</label><select id="m-user-role" class="form-select"><option>Staff</option><option>Manager</option><option>Cashier</option><option>Super Admin</option></select></div>
        <div class="form-group"><label>Password</label><input id="m-user-pass" type="password" class="form-input"/></div>
        <button id="m-user-confirm" class="btn-primary btn-full" style="margin-top:12px;padding:12px">+ Add</button></div>`);
    ov.querySelector(".modal-close").addEventListener("click", closeModal);
    ov.querySelector("#m-user-confirm").addEventListener("click", async () => { const name = ov.querySelector("#m-user-name").value.trim(); if (!name) { ov.querySelector("#m-user-name").style.borderColor = "var(--neon-red)"; return; } await window.api.users.add({ name, email: ov.querySelector("#m-user-email").value, role: ov.querySelector("#m-user-role").value, password: ov.querySelector("#m-user-pass").value }); closeModal(); toast("User added!"); await loadUsers(); render(); });
}

// ─── EVENT BINDING ───
function bindDashboardEvents() {
    document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "new-session") modalDevicePicker();
        if (action === "add-customer") modalAddCustomer();
        if (action === "create-booking") modalNewBooking();
        if (action === "add-expense") modalAddExpense();
        if (action === "add-product") { activePage = "products"; render(); }
        if (action === "generate-report") { activePage = "reports"; render(); }
    }));
    document.querySelectorAll("[data-page]").forEach(a => a.addEventListener("click", () => { activePage = a.dataset.page; render(); }));
    document.getElementById("header-new-session")?.addEventListener("click", () => modalDevicePicker());
    startCountdown();
}

function bindDevicesEvents() {
    document.querySelectorAll(".btn-del-device").forEach(b => b.addEventListener("click", async () => { if (!confirm(`Delete "${b.dataset.name}"?`)) return; const r = await window.api.devices.remove({ deviceId: b.dataset.device }); if (r.success) { toast("Device removed"); await loadDevices(); await loadDashboard(); render(); } else toast(r.error, "error"); }));
    document.getElementById("btn-add-device")?.addEventListener("click", modalAddDevice);
}

function bindSessionsEvents() {
    document.querySelectorAll(".btn-extend-session").forEach(b => b.addEventListener("click", () => extendSession(b.dataset.device)));
    document.querySelectorAll(".btn-end-session").forEach(b => b.addEventListener("click", async () => {
        const devId = b.dataset.device;
        const ses = cachedSessions.find(s => s.deviceId === devId && s.status === "active");
        if (ses && ses.openEnded) {
            const preview = await window.api.sessions.preview({ deviceId: devId });
            if (!preview) { toast("Session not found"); return; }
            const hrs = Math.floor(preview.elapsedMinutes / 60);
            const mins = preview.elapsedMinutes % 60;
            const timePlayed = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
            const ov = showModal(`<div class="modal-box" style="max-width:420px;text-align:center">
                <div style="font-size:48px;margin-bottom:8px">🧾</div>
                <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 4px">Session Bill</h2>
                <p style="font-size:13px;color:var(--text-muted);margin:0 0 20px">Review before closing</p>
                <div style="background:var(--bg-deep);border-radius:12px;padding:16px;border:1px solid var(--card-border);text-align:left;margin-bottom:16px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Customer</span><span style="color:#fff;font-weight:700;font-size:13px">${preview.customerName}</span></div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Time Played</span><span style="color:#fff;font-weight:700;font-size:13px">${timePlayed} (${preview.elapsedMinutes} min)</span></div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Rate</span><span style="color:#fff;font-size:13px">${fmt(preview.ratePerHour)}/hr</span></div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Session Charge</span><span style="color:#fff;font-size:13px">${fmt(preview.baseAmount)}</span></div>
                    ${preview.extraCharge > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">2nd Controller</span><span style="color:#fff;font-size:13px">${fmt(preview.extraCharge)}</span></div>` : ''}
                    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--card-border)"><span style="color:#fff;font-weight:700;font-size:15px">Total</span><span style="color:var(--neon-green);font-weight:800;font-size:18px">${fmt(preview.total)}</span></div>
                </div>
                <div style="display:flex;gap:10px">
                    <button class="modal-close btn-outline" style="flex:1;padding:12px;font-size:14px;font-weight:600;cursor:pointer;border-radius:10px;border:1px solid var(--card-border);background:var(--surface);color:#fff">Cancel</button>
                    <button id="bill-confirm-ok" class="btn-primary" style="flex:1;padding:12px;font-size:14px;font-weight:700;cursor:pointer;border-radius:10px;border:none;background:var(--neon-green);color:#000">✓ Confirm & Collect</button>
                </div>
            </div>`);
            ov.querySelector(".modal-close").addEventListener("click", closeModal);
            ov.querySelector("#bill-confirm-ok").addEventListener("click", async () => {
                closeModal();
                showPaymentMethodModal(devId, preview.total, "open");
            });
        } else {
            const preview = await window.api.sessions.preview({ deviceId: devId });
            const elapsedMs = Date.now() - ses.startTime;
            const elapsedMin = Math.max(1, Math.ceil(elapsedMs / 60000));
            const bookedMin = ses.durationMinutes || 60;
            const endedEarly = elapsedMin < bookedMin;
            if (endedEarly) {
                const ratePerHour = cachedSettings?.pricing?.[devId] || 200;
                const rate30 = cachedSettings?.pricing?.[devId + "_30min"] || 0;
                const fullCharge = ses.amount || 0;
                const actualBase = elapsedMin <= 30 && rate30 ? rate30 : Math.ceil((elapsedMin / 60) * ratePerHour);
                const extraCharge = (ses.players === 2) ? 50 : 0;
                const actualCharge = actualBase + extraCharge;
                const eHrs = Math.floor(elapsedMin / 60), eMins = elapsedMin % 60;
                const timePlayed = eHrs > 0 ? `${eHrs}h ${eMins}m` : `${eMins}m`;
                const ov = showModal(`<div class="modal-box" style="max-width:440px;text-align:center">
                    <div style="font-size:48px;margin-bottom:8px">⏱️</div>
                    <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 4px">End Session Early?</h2>
                    <p style="font-size:13px;color:var(--text-muted);margin:0 0 20px">Session ended before booked duration</p>
                    <div style="background:var(--bg-deep);border-radius:12px;padding:16px;border:1px solid var(--card-border);text-align:left;margin-bottom:16px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Customer</span><span style="color:#fff;font-weight:700;font-size:13px">${ses.customerName}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Device</span><span style="color:#fff;font-weight:700;font-size:13px">${ses.deviceName}</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Booked</span><span style="color:#fff;font-size:13px">${bookedMin} min</span></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="color:var(--text-muted);font-size:13px">Played</span><span style="color:var(--neon-yellow);font-weight:700;font-size:13px">${timePlayed} (${elapsedMin} min)</span></div>
                    </div>
                    <div style="display:flex;gap:10px;margin-bottom:10px">
                        <button id="charge-full" style="flex:1;padding:14px 8px;font-size:13px;font-weight:700;cursor:pointer;border-radius:10px;border:2px solid var(--primary);background:var(--primary);color:#fff">💰 Charge Full<br/><span style="font-size:18px;font-weight:800">${fmt(fullCharge)}</span></button>
                        <button id="charge-actual" style="flex:1;padding:14px 8px;font-size:13px;font-weight:700;cursor:pointer;border-radius:10px;border:2px solid var(--neon-green);background:transparent;color:var(--neon-green)">⏱️ Charge Actual<br/><span style="font-size:18px;font-weight:800">${fmt(actualCharge)}</span></button>
                    </div>
                    <button class="modal-close btn-outline" style="width:100%;padding:10px;font-size:13px;font-weight:600;cursor:pointer;border-radius:10px;border:1px solid var(--card-border);background:var(--surface);color:#fff">Cancel</button>
                </div>`);
                ov.querySelector(".modal-close").addEventListener("click", closeModal);
                ov.querySelector("#charge-full").addEventListener("click", async () => {
                    closeModal();
                    showPaymentMethodModal(devId, fullCharge, "full");
                });
                ov.querySelector("#charge-actual").addEventListener("click", async () => {
                    closeModal();
                    showPaymentMethodModal(devId, actualCharge, "actual");
                });
            } else {
                const res = await window.api.sessions.end({ deviceId: devId });
                showPaymentMethodModal(devId, res.amount || ses.amount || 0, "full");
            }
        }
    }));
    startCountdown();
}

// ─── PAYMENT METHOD MODAL (Feature 2) ───
function showPaymentMethodModal(deviceId, amount, chargeMode) {
    const ov = showModal(`<div class="modal-box" style="text-align:center">
        <h2 style="font-family:var(--font-display);font-size:16px;color:#fff;margin:0 0 4px">Payment Method</h2>
        <p style="color:var(--neon-green);font-size:24px;font-weight:800;margin:12px 0 20px">${fmt(amount)}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <button class="pay-method-btn" data-method="Cash" style="padding:16px;font-size:13px;font-weight:600;cursor:pointer;border-radius:12px;border:2px solid var(--card-border);background:var(--surface);color:#fff;transition:all .2s">💵 Cash</button>
            <button class="pay-method-btn" data-method="UPI" style="padding:16px;font-size:13px;font-weight:600;cursor:pointer;border-radius:12px;border:2px solid var(--card-border);background:var(--surface);color:#fff;transition:all .2s">📱 UPI</button>
            <button class="pay-method-btn" data-method="Card" style="padding:16px;font-size:13px;font-weight:600;cursor:pointer;border-radius:12px;border:2px solid var(--card-border);background:var(--surface);color:#fff;transition:all .2s">💳 Card</button>
            <button class="pay-method-btn" data-method="Wallet" style="padding:16px;font-size:13px;font-weight:600;cursor:pointer;border-radius:12px;border:2px solid var(--card-border);background:var(--surface);color:#fff;transition:all .2s">👛 Wallet</button>
        </div>
        <div id="pay-error" style="color:var(--neon-red);font-size:12px;display:none;margin-bottom:8px">Select a payment method</div>
    </div>`);
    ov.querySelectorAll(".pay-method-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            ov.querySelectorAll(".pay-method-btn").forEach(b => { b.style.borderColor = "var(--card-border)"; b.style.background = "var(--surface)"; });
            btn.style.borderColor = "var(--primary)";
            btn.style.background = "rgba(0,240,255,0.1)";
            const method = btn.dataset.method;
            const sessions = cachedSessions;
            const session = sessions.find(s => s.deviceId === deviceId && s.status === "active");
            if (session) await window.api.payments.setMethod({ sessionId: session.id, paymentMethod: method });
            await window.api.sessions.end({ deviceId, chargeMode });
            closeModal();
            toast(`Session ended — ${fmt(amount)} via ${method}`);
            await loadSessions(); await loadDashboard(); render();
            showReceiptButton(session?.id);
        });
    });
}

// ─── RECEIPT MODAL (Feature 3) ───
function showReceiptButton(sessionId) {
    if (!sessionId) return;
    const ov = showModal(`<div class="modal-box" style="text-align:center">
        <div style="font-size:48px;margin-bottom:8px">✅</div>
        <h2 style="font-size:18px;font-weight:700;color:#fff;margin:0 0 16px">Payment Collected</h2>
        <button id="receipt-gen-btn" class="btn-primary" style="margin-bottom:10px">📄 Generate Receipt</button>
        <button class="modal-close btn-outline" style="width:100%">Close</button>
    </div>`);
    ov.querySelector(".modal-close")?.addEventListener("click", closeModal);
    ov.querySelector("#receipt-gen-btn")?.addEventListener("click", async () => {
        const res = await window.api.receipt.generate({ sessionId });
        if (res.success) {
            const r = res.receipt;
            const itemsHtml = (r.items || []).map(it => `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);padding:4px 0"><span>${it.name} x${it.qty || 1}</span><span>${fmt(it.price)}</span></div>`).join("");
            const receiptHtml = `<div class="modal-box" style="max-width:380px;font-family:monospace">
                <div style="text-align:center;border-bottom:2px dashed var(--card-border);padding-bottom:12px;margin-bottom:12px">
                    <h2 style="font-family:var(--font-display);font-size:16px;color:var(--primary);margin:0">${r.cafeName}</h2>
                    <p style="color:var(--text-muted);font-size:11px;margin:4px 0 0">${r.address}</p>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">
                    <div>Receipt #: ${r.sessionId}</div><div>Date: ${r.date}</div><div>Customer: ${r.customer}</div><div>Device: ${r.device}</div>
                </div>
                <div style="border-top:1px dashed var(--card-border);padding-top:8px;margin-top:8px">
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);padding:3px 0"><span>Session (${r.duration}m, ${r.players}P)</span><span>${fmt(r.baseAmount)}</span></div>
                    ${itemsHtml}
                    ${r.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--neon-green);padding:3px 0"><span>Discount</span><span>-${fmt(r.discount)}</span></div>` : ''}
                </div>
                <div style="border-top:2px dashed var(--card-border);padding-top:8px;margin-top:8px;display:flex;justify-content:space-between;font-size:14px;font-weight:800;color:#fff"><span>TOTAL</span><span>${fmt(r.finalAmount)}</span></div>
                <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:12px">Paid via: ${r.paymentMethod}</div>
                <button onclick="closeModal()" class="btn-primary btn-full" style="margin-top:16px">Close</button>
            </div>`;
            closeModal();
            showModal(receiptHtml);
        }
    });
}

// ─── EXTEND SESSION (Feature 6) ───
function extendSession(deviceId) {
    const ses = cachedSessions.find(s => s.deviceId === deviceId && s.status === "active");
    if (!ses) return;
    const ov = showModal(`<div class="modal-box"><div class="modal-header"><h2>Extend Session</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">${ses.deviceName} — ${ses.customerName}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
            <button class="extend-opt" data-min="15" style="padding:12px;font-size:13px;font-weight:600;cursor:pointer;border-radius:10px;border:2px solid var(--card-border);background:var(--surface);color:#fff">+15 min</button>
            <button class="extend-opt" data-min="30" style="padding:12px;font-size:13px;font-weight:600;cursor:pointer;border-radius:10px;border:2px solid var(--primary);background:rgba(0,240,255,0.1);color:#fff">+30 min</button>
            <button class="extend-opt" data-min="60" style="padding:12px;font-size:13px;font-weight:600;cursor:pointer;border-radius:10px;border:2px solid var(--card-border);background:var(--surface);color:#fff">+60 min</button>
        </div>
        <div id="extend-preview" style="text-align:center;color:var(--neon-green);font-size:14px;font-weight:700"></div>
    </div>`);
    ov.querySelectorAll(".extend-opt").forEach(btn => {
        btn.addEventListener("click", async () => {
            ov.querySelectorAll(".extend-opt").forEach(b => { b.style.borderColor = "var(--card-border)"; b.style.background = "var(--surface)"; });
            btn.style.borderColor = "var(--primary)";
            btn.style.background = "rgba(0,240,255,0.1)";
            const mins = parseInt(btn.dataset.min);
            const ratePerHour = cachedSettings?.pricing?.[deviceId] || 200;
            const extra = Math.ceil((mins / 60) * ratePerHour);
            document.getElementById("extend-preview").textContent = `+${fmt(extra)} for ${mins} min`;
            btn.onclick = async () => {
                const res = await window.api.sessions.extend({ deviceId, additionalMinutes: mins });
                closeModal();
                if (res.success) { toast(`Session extended +${mins}m (${fmt(res.extraAmount)})`); await loadSessions(); render(); }
                else toast(res.error, "error");
            };
        });
    });
}

// ─── POINTS REDEMPTION (Feature 4) ───
function showRedeemPointsOption(customerId, onApply) {
    const cust = cachedCustomers.find(c => c.id === customerId);
    if (!cust || !cust.points || cust.points < 10) return;
    const redeemRate = cachedSettings?.loyalty?.redeemRate || 100;
    const pointsValue = Math.floor(cust.points / 10) * 10;
    const discount = Math.floor(pointsValue / 10);
    const div = document.createElement("div");
    div.id = "redeem-points-box";
    div.style.cssText = "background:rgba(180,0,255,0.1);border:1px solid rgba(180,0,255,0.3);border-radius:10px;padding:10px;margin-top:8px";
    div.innerHTML = `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--neon-purple)">
        <input type="checkbox" id="redeem-cb"> Redeem ${pointsValue} points (save ${fmt(discount)})
    </label>`;
    const container = document.getElementById("session-price-breakdown") || document.getElementById("session-config-left");
    if (container) container.appendChild(div);
    document.getElementById("redeem-cb")?.addEventListener("change", (e) => {
        if (e.target.checked) onApply(discount);
        else onApply(0);
    });
}

// ─── KEYBOARD SHORTCUTS (Feature 17) ───
document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if (e.ctrlKey || e.metaKey) {
        if (e.key === "n" || e.key === "N") { e.preventDefault(); document.getElementById("header-new-session")?.click(); }
        if (e.key === "f" || e.key === "F") { e.preventDefault(); document.querySelector(".header-search input")?.focus(); }
    }
    if (e.key === "Escape") closeModal();
});

function bindCustomersEvents() {
    document.getElementById("btn-add-customer")?.addEventListener("click", modalAddCustomer);
    document.querySelectorAll(".btn-del-customer").forEach(b => b.addEventListener("click", async () => { if (!confirm("Remove this customer?")) return; await window.api.customers.delete({ customerId: b.dataset.customer }); toast("Customer removed"); await loadCustomers(); render(); }));
    document.querySelectorAll(".btn-edit-customer").forEach(b => b.addEventListener("click", () => {
        const cust = cachedCustomers.find(c => c.id === b.dataset.customer);
        if (!cust) return;
        const ov = showModal(`<div class="modal-box" style="max-width:440px"><div class="modal-header"><h2>Edit Customer</h2><button class="modal-close">&times;</button></div>
            <div class="form-group"><label>Name</label><input id="m-edit-name" type="text" value="${cust.name}" class="form-input"/></div>
            <div class="form-group"><label>Phone</label><input id="m-edit-phone" type="tel" value="${cust.phone || ""}" class="form-input"/></div>
            <div class="form-group"><label>Email</label><input id="m-edit-email" type="email" value="${cust.email || ""}" class="form-input"/></div>
            <div class="form-group"><label>Tier</label><select id="m-edit-tier" class="form-select"><option value="Bronze" ${cust.tier === "Bronze" ? "selected" : ""}>🥉 Bronze</option><option value="Silver" ${cust.tier === "Silver" ? "selected" : ""}>🥈 Silver</option><option value="Gold" ${cust.tier === "Gold" ? "selected" : ""}>🥇 Gold</option><option value="Platinum" ${cust.tier === "Platinum" ? "selected" : ""}>💎 Platinum</option></select></div>
            <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border);margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:12px;color:var(--text-muted)">Total Spent</span><span style="font-size:12px;color:var(--neon-green);font-weight:700">${fmt(cust.totalSpent || 0)}</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:12px;color:var(--text-muted)">Points</span><span style="font-size:12px;color:var(--accent);font-weight:700">${cust.points || 0}</span></div>
                <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text-muted)">Visits</span><span style="font-size:12px;color:#fff;font-weight:700">${cust.visits || 0}</span></div>
            </div>
            <button id="m-edit-confirm" class="btn-primary btn-full" style="padding:12px">💾 Save Changes</button></div>`);
        ov.querySelector(".modal-close").addEventListener("click", closeModal);
        ov.querySelector("#m-edit-confirm").addEventListener("click", async () => {
            const name = ov.querySelector("#m-edit-name").value.trim();
            if (!name) { ov.querySelector("#m-edit-name").style.borderColor = "var(--neon-red)"; return; }
            await window.api.customers.update({ customerId: cust.id, data: { name, phone: ov.querySelector("#m-edit-phone").value, email: ov.querySelector("#m-edit-email").value, tier: ov.querySelector("#m-edit-tier").value } });
            closeModal(); toast("Customer updated!"); await loadCustomers(); render();
        });
    }));
    const searchInput = document.getElementById("cust-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            const filtered = q ? cachedCustomers.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.tier?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) : cachedCustomers;
            const grid = document.getElementById("customer-grid");
            if (grid) grid.innerHTML = renderCustomerCards(filtered);
            bindCustomersEvents();
        });
    }
}

function bindBookingsEvents() {
    document.getElementById("btn-new-booking")?.addEventListener("click", modalNewBooking);
    document.querySelectorAll(".btn-cancel-booking").forEach(b => b.addEventListener("click", async () => { if (!confirm("Cancel this booking?")) return; await window.api.bookings.cancel({ bookingId: b.dataset.booking }); toast("Booking cancelled"); await loadBookings(); render(); }));
}

function bindExpensesEvents() {
    document.getElementById("btn-add-expense")?.addEventListener("click", modalAddExpense);
    document.querySelectorAll(".btn-del-expense").forEach(b => b.addEventListener("click", async () => { if (!confirm("Delete this expense?")) return; await window.api.expenses.delete({ expenseId: b.dataset.expense }); toast("Expense deleted"); await loadExpenses(); render(); }));
}

function bindProductsEvents() {
    document.querySelectorAll(".btn-sell-item").forEach(b => b.addEventListener("click", () => modalSellItem(b.dataset.item)));
    document.querySelectorAll(".btn-del-item").forEach(b => b.addEventListener("click", async () => { if (!confirm("Delete this item?")) return; await window.api.refreshment.removeItem({ itemId: b.dataset.item }); toast("Item removed"); await loadRefreshment(); render(); }));
    document.getElementById("btn-add-item")?.addEventListener("click", modalAddItem);
}

function bindStockEvents() {
    document.querySelectorAll(".btn-restock").forEach(b => b.addEventListener("click", () => {
        const itemId = b.dataset.item;
        const name = b.dataset.name;
        const currentStock = b.dataset.stock;
        const ov = showModal(`<div class="modal-box" style="max-width:400px">
            <div class="modal-header"><h2>Restock — ${name}</h2><button class="modal-close">&times;</button></div>
            <div style="background:var(--bg-deep);border-radius:10px;padding:12px;border:1px solid var(--card-border);margin-bottom:16px;text-align:center">
                <div style="font-size:11px;color:var(--text-muted)">Current Stock</div>
                <div style="font-size:28px;font-weight:800;color:#fff;margin-top:4px">${currentStock}</div>
            </div>
            <div class="form-group"><label>Add Quantity</label><input id="restock-qty" type="number" min="1" value="10" class="form-input" placeholder="Enter quantity to add"/></div>
            <div style="background:var(--bg-deep);border-radius:10px;padding:10px;border:1px solid var(--card-border);margin-bottom:16px;text-align:center">
                <span style="font-size:11px;color:var(--text-muted)">New Stock will be </span><span id="restock-preview" style="font-size:13px;font-weight:700;color:var(--neon-green)">${parseInt(currentStock) + 10}</span>
            </div>
            <button id="restock-confirm" class="btn-primary btn-full" style="padding:12px">✓ Update Stock</button>
        </div>`);
        const qtyInput = ov.querySelector("#restock-qty");
        const preview = ov.querySelector("#restock-preview");
        qtyInput.addEventListener("input", () => { const q = parseInt(qtyInput.value) || 0; preview.textContent = parseInt(currentStock) + q; });
        ov.querySelector(".modal-close").addEventListener("click", closeModal);
        ov.querySelector("#restock-confirm").addEventListener("click", async () => {
            const addQty = parseInt(qtyInput.value);
            if (isNaN(addQty) || addQty < 1) { qtyInput.style.borderColor = "var(--neon-red)"; return; }
            const newStock = parseInt(currentStock) + addQty;
            await window.api.refreshment.updateItem({ itemId, data: { stock: newStock } });
            closeModal(); toast(`Stock updated to ${newStock}!`); await loadRefreshment(); render();
        });
    }));
}

function bindStaffEvents() {
    document.querySelectorAll(".btn-del-staff").forEach(b => b.addEventListener("click", async () => { if (!confirm("Remove this staff member?")) return; await window.api.staff.remove({ staffId: b.dataset.staff }); toast("Staff removed"); await loadStaff(); render(); }));
    document.getElementById("btn-add-staff")?.addEventListener("click", modalAddStaff);
}

function bindReportsEvents() {
    document.querySelectorAll("[data-report]").forEach(b => b.addEventListener("click", () => { reportTab = b.dataset.report; render(); }));
    loadReportContent();
}

function bindUsersEvents() {
    document.getElementById("btn-add-user")?.addEventListener("click", modalAddUser);
    document.querySelectorAll(".btn-del-user").forEach(b => b.addEventListener("click", async () => { if (!confirm(`Remove "${b.dataset.name}"?`)) return; await window.api.users.delete({ userId: b.dataset.user }); toast("User removed"); await loadUsers(); render(); }));
}

function bindLogsEvents() {
    document.getElementById("btn-export-logs")?.addEventListener("click", async () => {
        const csv = "Time,Action,User,Details\n" + cachedLogs.map(l => `${l.date} ${l.time},${l.action},${l.user},"${l.details}"`).join("\n");
        const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "logs-" + todayKey() + ".csv"; a.click();
        toast("Logs exported!");
    });
}

function bindSettingsEvents() {
    document.getElementById("btn-cancel-settings")?.addEventListener("click", render);
    document.getElementById("btn-save-settings")?.addEventListener("click", async () => {
        const openDays = []; document.querySelectorAll(".day-btn").forEach(b => { if (b.style.backgroundColor === "rgb(99, 102, 241)") openDays.push(b.dataset.day); });
        const pricing = {}; document.querySelectorAll(".price-input").forEach(el => { pricing[el.dataset.priceKey] = parseInt(el.value) || 0; });
        const settings = { general: { cafeName: v("s-cafeName"), phone: v("s-phone"), email: v("s-email"), address: v("s-address") }, pricing, hours: { open: v("s-open") || "10:00", close: v("s-close") || "23:00", openDays }, session: { warningMinutes: parseInt(document.getElementById("s-warning")?.value) || 5, graceMinutes: parseInt(document.getElementById("s-grace")?.value) || 10, autoEnd: document.getElementById("toggleAutoEnd")?.classList.contains("on") ?? true, soundNotifications: document.getElementById("toggleSound")?.classList.contains("on") ?? false }, loyalty: { silver: parseInt(document.getElementById("s-tier-silver")?.value) || 1000, gold: parseInt(document.getElementById("s-tier-gold")?.value) || 3000, platinum: parseInt(document.getElementById("s-tier-platinum")?.value) || 6000, pointsPerRupee: parseFloat(document.getElementById("s-tier-points")?.value) || 0.1, redeemRate: lo.redeemRate || 100 } };
        await window.api.settings.save(settings); cachedSettings = settings; toast("Settings saved!");
    });
    ["toggleAutoEnd", "toggleSound"].forEach(id => { document.getElementById(id)?.addEventListener("click", function () { this.classList.toggle("on"); this.classList.toggle("off"); }); });
    document.querySelectorAll(".day-btn").forEach(b => b.addEventListener("click", () => {
        const isOn = b.style.backgroundColor === "rgb(99, 102, 241)"; b.style.background = isOn ? "var(--surface)" : "var(--primary)"; b.style.borderColor = isOn ? "var(--card-border)" : "var(--primary)"; b.style.color = isOn ? "var(--text-muted)" : "#fff";
    }));
}

function v(id) { return document.getElementById(id)?.value || ""; }

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        document.querySelectorAll(".device-time").forEach(el => {
            const d = cachedDevices.find(x => x.id === el.dataset.device);
            if (d && d.status === "active") {
                const ses = cachedSessions.find(s => s.deviceId === d.id && s.status === "active");
                if (ses && ses.openEnded) {
                    el.textContent = fmtElapsed(ses.startTime);
                    el.className = el.className.replace(/time-warn|time-expired/g, "") + " time-active";
                } else if (d.sessionEnd) {
                    const rem = d.sessionEnd - Date.now(); el.textContent = fmtTime(d.sessionEnd);
                    if (rem <= 0) { el.className = el.className.replace(/time-warn/g, "") + " time-expired"; if (!alarmTriggered.has(d.id)) { alarmTriggered.add(d.id); showAlarm(d); } } else { const warn = (cachedSettings?.session?.warningMinutes || 5) * 60000; if (rem <= warn) { el.className = el.className.replace(/time-expired/g, "") + " time-warn"; } else { el.className = el.className.replace(/time-warn|time-expired/g, ""); } }
                }
            }
        });
    }, 1000);
}

// ─── NEW LOAD FUNCTIONS ───
async function loadShifts() { cachedShifts = await window.api.shifts.get(); }
async function loadDiscounts() { cachedDiscounts = await window.api.discounts.get(); }
async function loadCombos() { cachedCombos = await window.api.combos.get(); }
async function loadQueue() { cachedQueue = await window.api.queue.get(); }

// ─── SHIFTS PAGE ───
function pageShifts() {
    const today = tk();
    const todayShift = cachedShifts.find(s => s.date === today && s.status === "open");
    const recentShifts = cachedShifts.filter(s => s.status === "closed").slice(-10).reverse();
    currentShift = todayShift;
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
            <div class="dash-card">
                <h3 style="font-family:var(--font-display);font-size:14px;color:#fff;margin:0 0 16px;letter-spacing:0.5px">TODAY'S SHIFT</h3>
                ${todayShift ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div><div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">OPENING CASH</div><div style="color:#fff;font-size:18px;font-weight:700">${fmt(todayShift.openingCash)}</div></div>
                    <div><div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">STATUS</div><div class="badge-inprogress">OPEN</div></div>
                    <div><div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">OPENED BY</div><div style="color:#fff;font-size:13px">${todayShift.openedBy}</div></div>
                    <div><div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">OPEN TIME</div><div style="color:#fff;font-size:13px">${new Date(todayShift.openTime).toLocaleTimeString("en-IN")}</div></div>
                </div>
                <button id="close-shift-btn" class="btn-danger btn-full" style="margin-top:16px">Close Shift</button>` : `<p style="color:var(--text-muted);margin-bottom:16px">No shift open today</p><button id="open-shift-btn" class="btn-primary btn-full">Open Shift</button>`}
            </div>
            <div class="dash-card">
                <h3 style="font-family:var(--font-display);font-size:14px;color:#fff;margin:0 0 16px;letter-spacing:0.5px">SHIFT HISTORY</h3>
                ${recentShifts.length === 0 ? '<p style="color:var(--text-muted)">No previous shifts</p>' : `<div style="max-height:260px;overflow-y:auto">${recentShifts.map(s => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--card-border)">
                    <div><div style="color:#fff;font-size:13px;font-weight:600">${s.date}</div><div style="color:var(--text-muted);font-size:11px">Opened by ${s.openedBy}</div></div>
                    <div style="text-align:right"><div style="color:#fff;font-size:13px">In: ${fmt(s.openingCash)} | Out: ${fmt(s.closingCash)}</div><div style="color:${s.difference >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'};font-size:11px;font-weight:600">Diff: ${fmt(s.difference)}</div></div>
                </div>`).join("")}</div>`}
            </div>
        </div>
    </div>`;
}
function bindShiftsEvents() {
    document.getElementById("open-shift-btn")?.addEventListener("click", () => {
        showModal(`<div class="modal-box"><div class="modal-header"><h2>Open Shift</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
            <div class="form-group"><label>Opening Cash (₹)</label><input id="shift-cash" class="form-input" type="number" value="0" min="0"></div>
            <button id="shift-open-confirm" class="btn-primary btn-full">Open Shift</button></div>`);
        document.getElementById("shift-open-confirm")?.addEventListener("click", async () => {
            const cash = document.getElementById("shift-cash").value;
            await window.api.shifts.open({ openingCash: cash, openedBy: currentUser?.name || "Admin" });
            closeModal(); toast("Shift opened"); await loadShifts(); render();
        });
    });
    document.getElementById("close-shift-btn")?.addEventListener("click", () => {
        showModal(`<div class="modal-box"><div class="modal-header"><h2>Close Shift</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
            <div class="form-group"><label>Closing Cash (₹)</label><input id="shift-close-cash" class="form-input" type="number" value="0" min="0"></div>
            <button id="shift-close-confirm" class="btn-danger btn-full">Close Shift</button></div>`);
        document.getElementById("shift-close-confirm")?.addEventListener("click", async () => {
            const cash = document.getElementById("shift-close-cash").value;
            const result = await window.api.shifts.close({ closingCash: cash, closedBy: currentUser?.name || "Admin" });
            closeModal();
            if (result.success) { toast(`Shift closed. Difference: ${fmt(result.shift.difference)}`); await loadShifts(); render(); }
            else toast(result.error, "error");
        });
    });
}

// ─── DISCOUNTS PAGE ───
function pageDiscounts() {
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-family:var(--font-display);font-size:14px;color:#fff;letter-spacing:0.5px">DISCOUNT CODES (${cachedDiscounts.length})</h2>
            <button id="add-discount-btn" class="btn-primary">+ Add Discount</button>
        </div>
        ${cachedDiscounts.length === 0 ? '<div class="dash-card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">No discount codes yet</p></div>' :
        `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${cachedDiscounts.map(d => `<div class="dash-card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                <div><div style="font-family:var(--font-display);font-size:16px;color:var(--primary);letter-spacing:1px">${d.code}</div>
                <div style="color:var(--text-muted);font-size:11px;margin-top:4px">${d.type === "percent" ? d.value + "% OFF" : fmt(d.value) + " OFF"}</div></div>
                <button class="btn-danger btn-sm" onclick="window._delDiscount('${d.id}')">Del</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">Min: ${fmt(d.minAmount)} | Used: ${d.usedCount}/${d.maxUses} | ${d.active ? 'Active' : 'Inactive'}</div>
        </div>`).join("")}</div>`}
    </div>`;
}
window._delDiscount = async (id) => { await window.api.discounts.delete({ discountId: id }); toast("Discount deleted"); await loadDiscounts(); render(); };
function bindDiscountsEvents() {
    document.getElementById("add-discount-btn")?.addEventListener("click", () => {
        showModal(`<div class="modal-box"><div class="modal-header"><h2>Add Discount</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
            <div class="form-group"><label>Code</label><input id="disc-code" class="form-input" placeholder="e.g. SAVE20"></div>
            <div class="form-group"><label>Type</label><select id="disc-type" class="form-select"><option value="percent">% Discount</option><option value="flat">Flat Amount</option></select></div>
            <div class="form-group"><label>Value</label><input id="disc-value" class="form-input" type="number" placeholder="20"></div>
            <div class="form-group"><label>Min Amount (₹)</label><input id="disc-min" class="form-input" type="number" value="0"></div>
            <div class="form-group"><label>Max Uses</label><input id="disc-max" class="form-input" type="number" value="100"></div>
            <button id="disc-add-confirm" class="btn-primary btn-full">Add Discount</button></div>`);
        document.getElementById("disc-add-confirm")?.addEventListener("click", async () => {
            const code = document.getElementById("disc-code").value;
            const type = document.getElementById("disc-type").value;
            const value = document.getElementById("disc-value").value;
            const minAmount = document.getElementById("disc-min").value;
            const maxUses = document.getElementById("disc-max").value;
            if (!code || !value) { toast("Code and value required", "error"); return; }
            await window.api.discounts.add({ code, type, value, minAmount, maxUses });
            closeModal(); toast("Discount added"); await loadDiscounts(); render();
        });
    });
}

// ─── COMBOS PAGE ───
function pageCombos() {
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-family:var(--font-display);font-size:14px;color:#fff;letter-spacing:0.5px">COMBO DEALS (${cachedCombos.length})</h2>
            <button id="add-combo-btn" class="btn-primary">+ Add Combo</button>
        </div>
        ${cachedCombos.length === 0 ? '<div class="dash-card" style="text-align:center;padding:40px"><p style="color:var(--text-muted)">No combo deals yet</p></div>' :
        `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${cachedCombos.map(c => `<div class="dash-card">
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                <div><div style="font-family:var(--font-display);font-size:16px;color:var(--accent)">${c.name}</div>
                <div style="color:var(--neon-green);font-size:18px;font-weight:700;margin-top:4px">${fmt(c.comboPrice)}</div></div>
                <button class="btn-danger btn-sm" onclick="window._delCombo('${c.id}')">Del</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">${(c.items || []).length} items</div>
        </div>`).join("")}</div>`}
    </div>`;
}
window._delCombo = async (id) => { await window.api.combos.delete({ comboId: id }); toast("Combo deleted"); await loadCombos(); render(); };
function bindCombosEvents() {
    document.getElementById("add-combo-btn")?.addEventListener("click", () => {
        const menuItems = cachedRefreshment.menu;
        showModal(`<div class="modal-box"><div class="modal-header"><h2>Add Combo Deal</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
            <div class="form-group"><label>Combo Name</label><input id="combo-name" class="form-input" placeholder="e.g. Gaming Meal"></div>
            <div class="form-group"><label>Select Items</label><div id="combo-items-list" style="max-height:150px;overflow-y:auto;border:1px solid var(--card-border);border-radius:8px;padding:8px">
                ${menuItems.map(m => `<label style="display:flex;align-items:center;gap:8px;padding:4px 0;color:var(--text-secondary);font-size:12px;cursor:pointer"><input type="checkbox" value="${m.id}" class="combo-item-cb"> ${m.name} (${fmt(m.price)})</label>`).join("")}
            </div></div>
            <div class="form-group"><label>Combo Price (₹)</label><input id="combo-price" class="form-input" type="number" placeholder="350"></div>
            <button id="combo-add-confirm" class="btn-primary btn-full">Add Combo</button></div>`);
        document.getElementById("combo-add-confirm")?.addEventListener("click", async () => {
            const name = document.getElementById("combo-name").value;
            const price = document.getElementById("combo-price").value;
            const items = [...document.querySelectorAll(".combo-item-cb:checked")].map(cb => cb.value);
            if (!name || !price) { toast("Name and price required", "error"); return; }
            await window.api.combos.add({ name, items, comboPrice: price });
            closeModal(); toast("Combo added"); await loadCombos(); render();
        });
    });
}

// ─── QUEUE PAGE ───
function pageQueue() {
    const waiting = cachedQueue.filter(q => q.status === "waiting");
    const notified = cachedQueue.filter(q => q.status === "notified");
    return `<div class="page-enter">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2 style="font-family:var(--font-display);font-size:14px;color:#fff;letter-spacing:0.5px">WALK-IN QUEUE (${waiting.length} waiting)</h2>
            <button id="add-queue-btn" class="btn-primary">+ Add to Queue</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="dash-card"><h3 style="color:var(--neon-yellow);font-size:13px;margin:0 0 12px">WAITING (${waiting.length})</h3>
                ${waiting.length === 0 ? '<p style="color:var(--text-muted)">No one waiting</p>' : waiting.map((q,i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--card-border)">
                    <div><span style="color:var(--primary);font-weight:700;margin-right:8px">#${i+1}</span><span style="color:#fff;font-weight:600">${q.customerName}</span><span style="color:var(--text-muted);font-size:11px;margin-left:8px">${q.phone || ""}</span></div>
                    <div style="display:flex;gap:6px"><button class="btn-primary btn-sm" onclick="window._notifyQueue('${q.id}')">Notify</button><button class="btn-danger btn-sm" onclick="window._removeQueue('${q.id}')">X</button></div>
                </div>`).join("")}</div>
            <div class="dash-card"><h3 style="color:var(--neon-green);font-size:13px;margin:0 0 12px">NOTIFIED (${notified.length})</h3>
                ${notified.length === 0 ? '<p style="color:var(--text-muted)">None notified yet</p>' : notified.map(q => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--card-border)">
                    <span style="color:#fff;font-weight:600">${q.customerName}</span><button class="btn-danger btn-sm" onclick="window._removeQueue('${q.id}')">Remove</button>
                </div>`).join("")}</div>
        </div>
    </div>`;
}
window._notifyQueue = async (id) => { await window.api.queue.notify({ queueId: id }); toast("Customer notified"); await loadQueue(); render(); };
window._removeQueue = async (id) => { await window.api.queue.remove({ queueId: id }); await loadQueue(); render(); };
function bindQueueEvents() {
    document.getElementById("add-queue-btn")?.addEventListener("click", () => {
        showModal(`<div class="modal-box"><div class="modal-header"><h2>Add to Queue</h2><button class="modal-close" onclick="closeModal()">&times;</button></div>
            <div class="form-group"><label>Customer Name</label><input id="queue-name" class="form-input" placeholder="Name"></div>
            <div class="form-group"><label>Phone (optional)</label><input id="queue-phone" class="form-input" placeholder="Phone"></div>
            <button id="queue-add-confirm" class="btn-primary btn-full">Add to Queue</button></div>`);
        document.getElementById("queue-add-confirm")?.addEventListener("click", async () => {
            const name = document.getElementById("queue-name").value;
            if (!name) { toast("Name required", "error"); return; }
            await window.api.queue.add({ customerName: name, phone: document.getElementById("queue-phone").value });
            closeModal(); toast("Added to queue"); await loadQueue(); render();
        });
    });
}

function updateClock() {
    const now = new Date(); const cl = document.getElementById("sidebar-clock"); const dt = document.getElementById("sidebar-date");
    if (cl) cl.textContent = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (dt) dt.textContent = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── RENDER ───
async function render() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    document.getElementById("alarm-overlay")?.remove(); stopAlarm();

    const loadMap = {
        dashboard: () => Promise.all([loadDashboard(), loadSettings(), loadCustomers(), loadRefreshment(), loadSessions(), loadBookings(), loadShifts()]),
        devices: () => Promise.all([loadDevices(), loadSettings()]),
        sessions: () => Promise.all([loadSessions(), loadDevices(), loadSettings(), loadDiscounts()]),
        customers: () => Promise.all([loadCustomers(), loadSettings()]),
        bookings: () => Promise.all([loadBookings(), loadDevices()]),
        payments: () => Promise.all([loadSessions(), loadSettings()]),
        expenses: () => loadExpenses(),
        revenue: () => Promise.all([loadSessions(), loadRefreshment()]),
        reports: () => Promise.all([loadSessions(), loadCustomers(), loadRefreshment(), loadExpenses()]),
        products: () => Promise.all([loadRefreshment(), loadCustomers(), loadCombos()]),
        stock: () => loadRefreshment(),
        settings: () => Promise.all([loadSettings(), loadDevices()]),
        staff: () => loadStaff(),
        users: () => loadUsers(),
        logs: () => loadLogs(),
        shifts: () => Promise.all([loadShifts(), loadSessions(), loadRefreshment()]),
        discounts: () => loadDiscounts(),
        combos: () => Promise.all([loadCombos(), loadRefreshment()]),
        queue: () => loadQueue()
    };
    await (loadMap[activePage] || (() => Promise.resolve()))();

    const pages = {
        dashboard: { content: pageDashboard, bind: bindDashboardEvents },
        devices: { content: pageDevices, bind: bindDevicesEvents },
        sessions: { content: pageSessions, bind: bindSessionsEvents },
        customers: { content: pageCustomers, bind: bindCustomersEvents },
        bookings: { content: pageBookings, bind: bindBookingsEvents },
        payments: { content: pagePayments, bind: () => {} },
        expenses: { content: pageExpenses, bind: bindExpensesEvents },
        revenue: { content: pageRevenue, bind: () => {} },
        reports: { content: pageReports, bind: bindReportsEvents },
        products: { content: pageProducts, bind: bindProductsEvents },
        stock: { content: pageStock, bind: bindStockEvents },
        settings: { content: pageSettings, bind: bindSettingsEvents },
        staff: { content: pageStaff, bind: bindStaffEvents },
        users: { content: pageUsers, bind: bindUsersEvents },
        logs: { content: pageLogs, bind: bindLogsEvents },
        shifts: { content: pageShifts, bind: bindShiftsEvents },
        discounts: { content: pageDiscounts, bind: bindDiscountsEvents },
        combos: { content: pageCombos, bind: bindCombosEvents },
        queue: { content: pageQueue, bind: bindQueueEvents }
    };
    const page = pages[activePage] || pages.dashboard;

    app.innerHTML = `<div style="display:flex;height:100vh;background:var(--bg-deep)">
        ${createSidebar()}
        <div class="main-area">
            ${createHeader(activePage)}
            <div class="app-content">${page.content()}</div>
        </div>
    </div>`;

    document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => { activePage = b.dataset.page; render(); }));
    document.getElementById("hamburger-btn")?.addEventListener("click", () => { const s = document.querySelector(".sidebar"); if (s) s.style.display = s.style.display === "none" ? "flex" : "none"; });
    document.getElementById("header-bell")?.addEventListener("click", () => { const expired = cachedDevices.filter(d => d.status === "expired"); if (expired.length > 0) { activePage = "devices"; render(); } else toast("No alerts"); });
    if (page.bind) page.bind();
    updateClock(); clockInterval = setInterval(updateClock, 1000);
}

render();
