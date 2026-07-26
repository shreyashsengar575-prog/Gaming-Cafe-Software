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
let reportTab = "revenue";
const alarmTriggered = new Set();
let alarmAudioCtx = null;
let alarmIntervalId = null;

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
    const colors = ["#6366f1", "#06b6d4", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];
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
            { id: "bookings", icon: "📅", label: "Bookings" }
        ]},
        { title: "FINANCE", items: [
            { id: "payments", icon: "💰", label: "Payments" },
            { id: "expenses", icon: "📋", label: "Expenses" },
            { id: "revenue", icon: "📈", label: "Revenue" },
            { id: "reports", icon: "📊", label: "Reports" }
        ]},
        { title: "INVENTORY", items: [
            { id: "products", icon: "📦", label: "Products" },
            { id: "stock", icon: "🏪", label: "Stock" }
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
    return `<div class="app-header">
        <button class="header-hamburger" id="hamburger-btn">☰</button>
        <div class="header-title"><h1>${title}</h1><p>${sub}</p></div>
        <div class="header-search"><span class="search-icon">🔍</span><input type="text" placeholder="Search..." id="global-search"></div>
        <div class="header-actions">
            <button class="btn-new-session" id="header-new-session">+ New Session</button>
            <div class="header-bell" id="header-bell">🔔${notifications > 0 ? `<span class="badge">${notifications}</span>` : ""}</div>
            <div class="header-admin"><div class="admin-info"><div class="name">Admin</div><div class="role">Super Admin</div></div><div class="avatar">A</div></div>
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
            <button class="btn-end-session btn-danger btn-full btn-sm" data-device="${s.deviceId}" style="margin-top:12px">⏹ End</button>
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
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">👥</div><div class="stat-info"><div class="stat-label">TOTAL CUSTOMERS</div><div class="stat-value">${list.length}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">📊</div><div class="stat-info"><div class="stat-label">TOTAL VISITS</div><div class="stat-value">${totalVisits}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL SPENT</div><div class="stat-value">${fmt(totalSpent)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,.15)">⭐</div><div class="stat-info"><div class="stat-label">AVG SPENT</div><div class="stat-value">${list.length ? fmt(Math.round(totalSpent / list.length)) : fmt(0)}</div></div></div></div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn-primary" id="btn-add-customer">+ Add Customer</button></div>
        ${list.length === 0 ? '<div class="dash-card" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:8px">👥</div><p>No customers yet</p></div>' :
        `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${list.map(c => {
            const tc = { Bronze: "var(--neon-yellow)", Silver: "#c0c0c0", Gold: "#ffd700", Platinum: "var(--accent)" };
            return `<div class="dash-card">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
                    <div style="width:40px;height:40px;border-radius:50%;background:${avatarColor(c.name)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">${(c.name || "?").charAt(0).toUpperCase()}</div>
                    <div style="flex:1"><div style="font-weight:700;color:#fff;font-size:14px">${c.name}</div><div style="font-size:11px;color:var(--text-muted)">${c.phone || "No phone"}</div></div>
                    <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:${tc[c.tier] || "var(--neon-yellow)"}20;color:${tc[c.tier] || "var(--neon-yellow)"};font-weight:600">${c.tier || "Bronze"}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
                    <div style="background:var(--bg-deep);border-radius:8px;padding:8px"><div style="font-size:10px;color:var(--text-muted)">Visits</div><div style="font-weight:700;color:#fff">${c.visits || 0}</div></div>
                    <div style="background:var(--bg-deep);border-radius:8px;padding:8px"><div style="font-size:10px;color:var(--text-muted)">Spent</div><div style="font-weight:700;color:#fff">${fmt(c.totalSpent || 0)}</div></div>
                    <div style="background:var(--bg-deep);border-radius:8px;padding:8px"><div style="font-size:10px;color:var(--text-muted)">Points</div><div style="font-weight:700;color:var(--neon-green)">${c.points || 0}</div></div>
                </div>
                <button class="btn-del-customer btn-outline btn-full btn-sm" data-customer="${c.id}" style="margin-top:10px;color:var(--neon-red);border-color:rgba(239,68,68,.3)">Remove</button>
            </div>`}).join("")}</div>`}
    </div>`;
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
    const refreshRev = cachedRefreshment.todayRevenue || 0;
    const totalRev = sessionRev + refreshRev;
    const todayRev = completed.filter(s => s.date === todayKey()).reduce((s, x) => s + (x.amount || 0), 0);
    const hours = [];
    for (let i = 0; i < 24; i++) {
        const h = String(i).padStart(2, "0") + ":00";
        const rev = completed.filter(s => new Date(s.startTime).getHours() === i).reduce((s, x) => s + (x.amount || 0), 0);
        hours.push({ label: h, value: rev });
    }
    const maxRev = Math.max(...hours.map(h => h.value), 1);
    const w = 700, h2 = 150, pad = 40;
    const points = hours.map((d, i) => `${pad + (i / 23) * (w - pad * 2)},${h2 - (d.value / maxRev) * (h2 - 20)}`).join(" ");
    const areaPoints = points + ` ${pad + (w - pad * 2)},${h2} ${pad},${h2}`;
    return `<div class="page-enter">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,.15)">💰</div><div class="stat-info"><div class="stat-label">TOTAL REVENUE</div><div class="stat-value">${fmt(totalRev)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(99,102,241,.15)">📈</div><div class="stat-info"><div class="stat-label">TODAY'S REVENUE</div><div class="stat-value">${fmt(todayRev)}</div></div></div></div>
            <div class="dash-card"><div class="stat-card"><div class="stat-icon" style="background:rgba(6,182,212,.15)">🎮</div><div class="stat-info"><div class="stat-label">SESSION REVENUE</div><div class="stat-value">${fmt(sessionRev)}</div></div></div></div>
        </div>
        <div class="dash-card"><div class="section-header"><h3>Revenue Overview</h3></div>
            <svg viewBox="0 0 ${w} ${h2 + 20}" style="width:100%;height:auto">
                <defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
                ${[0, 0.25, 0.5, 0.75, 1].map(p => `<line x1="${pad}" y1="${h2 - p * (h2 - 20)}" x2="${w - pad}" y2="${h2 - p * (h2 - 20)}" stroke="var(--card-border)" stroke-dasharray="4 4"/>`).join("")}
                <polygon points="${areaPoints}" fill="url(#chartGrad)"/>
                <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="2.5"/>
                ${hours.filter((_, i) => i % 4 === 0).map((d, i) => `<text x="${pad + (i * 4 / 23) * (w - pad * 2)}" y="${h2 + 14}" text-anchor="middle" style="font-size:9px;fill:var(--text-muted)">${d.label}</text>`).join("")}
            </svg>
        </div>
    </div>`;
}

// ─── REPORTS PAGE ───
function pageReports() {
    return `<div class="page-enter">
        <div style="display:flex;gap:8px;margin-bottom:20px">
            <button data-report="revenue" class="btn-primary btn-sm" style="${reportTab !== "revenue" ? "background:var(--surface);color:var(--text-secondary)" : ""}">💰 Revenue</button>
            <button data-report="devices" class="btn-primary btn-sm" style="${reportTab !== "devices" ? "background:var(--surface);color:var(--text-secondary)" : ""}">🖥️ Device Utilization</button>
            <button data-report="customers" class="btn-primary btn-sm" style="${reportTab !== "customers" ? "background:var(--surface);color:var(--text-secondary)" : ""}">👥 Customer Leaderboard</button>
        </div>
        <div id="report-content"></div>
    </div>`;
}
function loadReportContent() {
    const el = document.getElementById("report-content"); if (!el) return;
    if (reportTab === "revenue") {
        const sessions = cachedSessions.filter(s => s.status === "completed");
        const totalRev = sessions.reduce((s, x) => s + (x.amount || 0), 0);
        const todayRev = sessions.filter(s => s.date === todayKey()).reduce((s, x) => s + (x.amount || 0), 0);
        el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
            <div class="dash-card"><p style="font-size:11px;color:var(--text-muted)">Total Session Revenue</p><h2 style="font-size:24px;font-weight:800;color:#fff;margin-top:6px">${fmt(totalRev)}</h2></div>
            <div class="dash-card"><p style="font-size:11px;color:var(--text-muted)">Today Session Revenue</p><h2 style="font-size:24px;font-weight:800;color:var(--accent);margin-top:6px">${fmt(todayRev)}</h2></div>
            <div class="dash-card"><p style="font-size:11px;color:var(--text-muted)">Today Refreshment Revenue</p><h2 style="font-size:24px;font-weight:800;color:var(--neon-green);margin-top:6px">${fmt(cachedRefreshment.todayRevenue || 0)}</h2></div></div>`;
    } else if (reportTab === "devices") {
        const counts = {}; cachedSessions.filter(s => s.status === "completed").forEach(s => { counts[s.deviceName] = (counts[s.deviceName] || 0) + 1; });
        const max = Math.max(...Object.values(counts), 1);
        el.innerHTML = `<div class="dash-card"><h3 style="font-weight:700;color:#fff;margin-bottom:16px">Device Usage</h3>${Object.entries(counts).map(([name, count]) => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><span style="width:80px;font-size:13px;color:var(--text-secondary)">${name}</span><div style="flex:1;background:var(--bg-deep);border-radius:6px;height:28px;overflow:hidden;border:1px solid var(--card-border)"><div style="height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:6px;display:flex;align-items:center;padding-left:10px;width:${Math.round(count / max * 100)}%;transition:width .8s ease"><span style="font-size:11px;color:#fff;font-weight:700">${count} sessions</span></div></div></div>`).join("") || '<p style="color:var(--text-muted)">No data yet</p>'}</div>`;
    } else {
        const sorted = [...cachedCustomers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 10);
        el.innerHTML = sorted.length === 0 ? '<div class="dash-card" style="text-align:center;padding:30px;color:var(--text-muted)">No customers yet</div>' :
        `<div class="dash-card"><table class="data-table"><thead><tr><th>#</th><th>Name</th><th style="text-align:right">Visits</th><th style="text-align:right">Spent</th><th style="text-align:right">Points</th><th style="text-align:right">Tier</th></tr></thead>
        <tbody>${sorted.map((c, i) => `<tr><td style="color:var(--text-muted)">${i + 1}</td><td style="color:#fff;font-weight:600">${c.name}</td><td style="text-align:right">${c.visits || 0}</td><td style="text-align:right;color:var(--neon-green);font-weight:700">${fmt(c.totalSpent)}</td><td style="text-align:right;color:var(--accent)">${c.points || 0}</td><td style="text-align:right"><span style="padding:3px 10px;border-radius:20px;background:var(--surface);font-size:11px">${c.tier || "Bronze"}</span></td></tr>`).join("")}</tbody></table></div>`;
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
    const s = cachedSettings || {}; const gen = s.general || {}, pr = s.pricing || {}, hr = s.hours || {}, se = s.session || {};
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
                <div class="form-group"><label>Link Customer (optional)</label><select id="m-customerId" class="form-select"><option value="">Walk-in</option>${custOpts}</select></div>
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
        const custId = ov.querySelector("#m-customerId").value || null;
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
                await window.api.sessions.end({ deviceId: devId });
                toast(`Session ended — ${fmt(preview.total)} collected`);
                await loadSessions(); await loadDashboard(); render();
            });
        } else {
            const res = await window.api.sessions.end({ deviceId: devId });
            toast(res.amount ? `Session ended — ${fmt(res.amount)}` : "Session ended");
            await loadSessions(); await loadDashboard(); render();
        }
    }));
    startCountdown();
}

function bindCustomersEvents() {
    document.getElementById("btn-add-customer")?.addEventListener("click", modalAddCustomer);
    document.querySelectorAll(".btn-del-customer").forEach(b => b.addEventListener("click", async () => { if (!confirm("Remove this customer?")) return; await window.api.customers.delete({ customerId: b.dataset.customer }); toast("Customer removed"); await loadCustomers(); render(); }));
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
    document.querySelectorAll(".btn-restock").forEach(b => b.addEventListener("click", async () => {
        const newStock = prompt(`Restock "${b.dataset.name}"\nCurrent stock: ${b.dataset.stock}\nEnter new stock quantity:`);
        if (newStock === null) return;
        const qty = parseInt(newStock); if (isNaN(qty) || qty < 0) { toast("Invalid quantity", "error"); return; }
        await window.api.refreshment.updateItem({ itemId: b.dataset.item, data: { stock: qty } });
        toast("Stock updated!"); await loadRefreshment(); render();
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
        const settings = { general: { cafeName: v("s-cafeName"), phone: v("s-phone"), email: v("s-email"), address: v("s-address") }, pricing, hours: { open: v("s-open") || "10:00", close: v("s-close") || "23:00", openDays }, session: { warningMinutes: parseInt(document.getElementById("s-warning")?.value) || 5, graceMinutes: parseInt(document.getElementById("s-grace")?.value) || 10, autoEnd: document.getElementById("toggleAutoEnd")?.classList.contains("on") ?? true, soundNotifications: document.getElementById("toggleSound")?.classList.contains("on") ?? false } };
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
        dashboard: () => Promise.all([loadDashboard(), loadSettings(), loadCustomers(), loadRefreshment(), loadSessions(), loadBookings()]),
        devices: () => Promise.all([loadDevices(), loadSettings()]),
        sessions: () => Promise.all([loadSessions(), loadDevices(), loadSettings()]),
        customers: () => Promise.all([loadCustomers(), loadSettings()]),
        bookings: () => Promise.all([loadBookings(), loadDevices()]),
        payments: () => Promise.all([loadSessions(), loadSettings()]),
        expenses: () => loadExpenses(),
        revenue: () => Promise.all([loadSessions(), loadRefreshment()]),
        reports: () => Promise.all([loadSessions(), loadCustomers(), loadRefreshment()]),
        products: () => Promise.all([loadRefreshment(), loadCustomers()]),
        stock: () => loadRefreshment(),
        settings: () => Promise.all([loadSettings(), loadDevices()]),
        staff: () => loadStaff(),
        users: () => loadUsers(),
        logs: () => loadLogs()
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
        logs: { content: pageLogs, bind: bindLogsEvents }
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
