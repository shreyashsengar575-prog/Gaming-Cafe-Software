const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const store = require("./src/services/store");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440, height: 900, minWidth: 1200, minHeight: 700,
        title: "Game Zone - Gaming Cafe",
        icon: path.join(__dirname, "src", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false, contextIsolation: true
        }
    });
    mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

    const menuTemplate = [
        {
            label: "View",
            submenu: [
                { label: "Zoom In", accelerator: "CmdOrCtrl+Plus", click: () => { const z = mainWindow.webContents.getZoomFactor(); mainWindow.webContents.setZoomFactor(Math.min(z + 0.1, 3.0)); } },
                { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => { const z = mainWindow.webContents.getZoomFactor(); mainWindow.webContents.setZoomFactor(Math.max(z - 0.1, 0.3)); } },
                { label: "Reset Zoom", accelerator: "CmdOrCtrl+0", click: () => { mainWindow.webContents.setZoomFactor(1.0); } },
                { type: "separator" },
                { label: "Toggle Fullscreen", accelerator: "F11", click: () => { mainWindow.setFullScreen(!mainWindow.isFullScreen()); } },
                { type: "separator" },
                { label: "DevTools", accelerator: "CmdOrCtrl+Shift+I", click: () => { mainWindow.webContents.toggleDevTools(); } },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn" },
                { role: "zoomOut" }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

function tk() { return store.todayKey(); }

function addLog(action, details, user) {
    const logs = store.load("logs");
    logs.push({ id: "lg" + Date.now(), action, details, user: user || "System", time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }), date: tk(), timestamp: Date.now() });
    store.save("logs", logs);
}

// ─── SETTINGS ───
ipcMain.handle("settings:get", () => store.load("settings"));
ipcMain.handle("settings:save", (_, s) => { store.save("settings", s); addLog("Settings updated", "System settings saved", "Admin"); return { success: true }; });

// ─── DEVICES ───
ipcMain.handle("devices:get", () => store.load("devices"));
ipcMain.handle("devices:add", (_, { name, icon, type }) => {
    const d = store.load("devices");
    const dev = { id: "dev-" + Date.now(), name, icon: icon || "🎮", type: type || "console", status: "available", customer: null, sessionEnd: null };
    d.push(dev);
    store.save("devices", d);
    addLog("Device added", `New device: ${name} (${type})`, "Admin");
    return { success: true, device: dev };
});
ipcMain.handle("devices:update", (_, { deviceId, data }) => {
    const d = store.load("devices");
    const dev = d.find(x => x.id === deviceId);
    if (!dev) return { success: false, error: "Device not found" };
    Object.assign(dev, data);
    store.save("devices", d);
    return { success: true };
});
ipcMain.handle("devices:remove", (_, { deviceId }) => {
    const d = store.load("devices");
    const s = store.load("sessions");
    if (s.some(x => x.deviceId === deviceId && x.status === "active")) return { success: false, error: "Cannot remove — active session" };
    const dev = d.find(x => x.id === deviceId);
    store.save("devices", d.filter(x => x.id !== deviceId));
    if (dev) addLog("Device removed", `Removed: ${dev.name}`, "Admin");
    return { success: true };
});

// ─── SESSIONS ───
ipcMain.handle("sessions:get", () => store.load("sessions"));
ipcMain.handle("sessions:active", () => store.load("sessions").filter(s => s.status === "active"));
ipcMain.handle("sessions:start", (_, { deviceId, customerName, durationMinutes, players, customerId, openEnded }) => {
    const devices = store.load("devices");
    const sessions = store.load("sessions");
    const settings = store.load("settings");
    const device = devices.find(d => d.id === deviceId);
    if (!device || device.status !== "available") return { success: false, error: "Device not available" };
    const now = Date.now();
    const playerCount = players === 2 ? 2 : 1;
    const extraCharge = playerCount === 2 ? 50 : 0;
    let endTime, amount, baseAmount;
    if (openEnded) {
        endTime = null;
        baseAmount = 0;
        amount = extraCharge;
    } else {
        endTime = now + durationMinutes * 60 * 1000;
        const ratePerHour = settings.pricing[deviceId] || 200;
        const rate30 = settings.pricing[deviceId + "_30min"] || 0;
        baseAmount = durationMinutes <= 30 && rate30 ? rate30 : Math.ceil((durationMinutes / 60) * ratePerHour);
        amount = baseAmount + extraCharge;
    }
    const session = {
        id: "S" + Date.now(), deviceId, deviceName: device.name, customerName, customerId: customerId || null,
        startTime: now, sessionEnd: endTime, durationMinutes: openEnded ? null : durationMinutes, players: playerCount, amount, date: tk(), status: "active", openEnded: !!openEnded
    };
    sessions.push(session);
    device.status = "active"; device.customer = customerName; device.sessionEnd = endTime; device.sessionAmount = openEnded ? null : amount;
    store.save("sessions", sessions);
    store.save("devices", devices);
    if (customerId) {
        const customers = store.load("customers");
        const cust = customers.find(c => c.id === customerId);
        if (cust) { cust.visits = (cust.visits || 0) + 1; cust.lastVisit = tk(); store.save("customers", customers); }
    }
    addLog("Session started", `${device.name} → ${customerName} (${openEnded ? "Open" : durationMinutes + "m"}, ${fmt(amount)})`, "Admin");
    return { success: true, session };
});
ipcMain.handle("sessions:end", (_, { deviceId, chargeMode }) => {
    const devices = store.load("devices");
    const sessions = store.load("sessions");
    const settings = store.load("settings");
    const device = devices.find(d => d.id === deviceId);
    if (!device || (device.status !== "active" && device.status !== "expired")) return { success: false, error: "No active session" };
    const session = sessions.find(s => s.deviceId === deviceId && s.status === "active");
    if (session) {
        session.status = "completed";
        session.actualEnd = Date.now();
        if (session.openEnded) {
            const elapsedMs = Date.now() - session.startTime;
            const elapsedMin = Math.max(1, Math.ceil(elapsedMs / 60000));
            session.durationMinutes = elapsedMin;
            const ratePerHour = settings.pricing[deviceId] || 200;
            const rate30 = settings.pricing[deviceId + "_30min"] || 0;
            const baseAmount = elapsedMin <= 30 && rate30 ? rate30 : Math.ceil((elapsedMin / 60) * ratePerHour);
            const extraCharge = (session.players === 2) ? 50 : 0;
            session.amount = baseAmount + extraCharge;
        } else if (chargeMode === "actual") {
            const elapsedMs = Date.now() - session.startTime;
            const elapsedMin = Math.max(1, Math.ceil(elapsedMs / 60000));
            session.actualMinutes = elapsedMin;
            const ratePerHour = settings.pricing[deviceId] || 200;
            const rate30 = settings.pricing[deviceId + "_30min"] || 0;
            const baseAmount = elapsedMin <= 30 && rate30 ? rate30 : Math.ceil((elapsedMin / 60) * ratePerHour);
            const extraCharge = (session.players === 2) ? 50 : 0;
            session.amount = baseAmount + extraCharge;
            session.chargeMode = "actual";
        } else {
            session.chargeMode = "full";
        }
    }
    const custName = device.customer || "Unknown";
    const sessionAmount = session ? session.amount : 0;
    const custId = session ? session.customerId : null;
    device.status = "available"; device.customer = null; device.sessionEnd = null; device.sessionAmount = null;
    store.save("sessions", sessions);
    store.save("devices", devices);
    if (custId) {
        const customers = store.load("customers");
        const cust = customers.find(c => c.id === custId);
        if (cust) {
            cust.totalSpent = (cust.totalSpent || 0) + sessionAmount;
            cust.points = (cust.points || 0) + Math.floor(sessionAmount / 10);
            const tierSettings = settings.loyalty || {};
            const silverReq = tierSettings.silver || 1000;
            const goldReq = tierSettings.gold || 3000;
            const platinumReq = tierSettings.platinum || 6000;
            if (cust.totalSpent >= platinumReq) cust.tier = "Platinum";
            else if (cust.totalSpent >= goldReq) cust.tier = "Gold";
            else if (cust.totalSpent >= silverReq) cust.tier = "Silver";
            else cust.tier = "Bronze";
            store.save("customers", customers);
        }
    }
    addLog("Session ended", `${device.name} → ${custName} (${session?.durationMinutes || "?"}m, ${fmt(sessionAmount)})`, "Admin");
    return { success: true, amount: sessionAmount };
});
ipcMain.handle("sessions:preview", (_, { deviceId }) => {
    const devices = store.load("devices");
    const sessions = store.load("sessions");
    const settings = store.load("settings");
    const device = devices.find(d => d.id === deviceId);
    const session = sessions.find(s => s.deviceId === deviceId && s.status === "active");
    if (!device || !session) return null;
    const elapsedMs = Date.now() - session.startTime;
    const elapsedMin = Math.max(1, Math.ceil(elapsedMs / 60000));
    const ratePerHour = settings.pricing[deviceId] || 200;
    const rate30 = settings.pricing[deviceId + "_30min"] || 0;
    const baseAmount = elapsedMin <= 30 && rate30 ? rate30 : Math.ceil((elapsedMin / 60) * ratePerHour);
    const extraCharge = (session.players === 2) ? 50 : 0;
    const total = baseAmount + extraCharge;
    return { customerName: session.customerName, elapsedMinutes: elapsedMin, elapsedMs, ratePerHour, rate30, baseAmount, extraCharge, total, players: session.players };
});

function fmt(n) { return "\u20B9" + Number(n || 0).toLocaleString("en-IN"); }

// ─── DASHBOARD ───
ipcMain.handle("dashboard:stats", () => {
    const sessions = store.load("sessions");
    const devices = store.load("devices");
    const customers = store.load("customers");
    const today = tk();
    const todaySessions = sessions.filter(s => s.date === today && s.status === "completed");
    const revenue = todaySessions.reduce((sum, s) => sum + (s.amount || 0), 0);
    const activeSessions = sessions.filter(s => s.status === "active");
    const totalHours = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;
    const todayBookings = sessions.filter(s => s.date === today);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split("T")[0];
    const yesterdaySessions = sessions.filter(s => s.date === yesterdayKey && s.status === "completed");
    const yesterdayRevenue = yesterdaySessions.reduce((sum, s) => sum + (s.amount || 0), 0);
    const revenueChange = yesterdayRevenue > 0 ? Math.round((revenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0;
    const newToday = customers.filter(c => c.joinDate === today).length;
    const newThisWeek = customers.filter(c => { const d = new Date(c.joinDate); const now = new Date(); return (now - d) <= 7 * 86400000; }).length;
    return {
        revenue, activeSessions: activeSessions.length, totalDevices: devices.length,
        totalHours: Math.round(totalHours * 10) / 10, todaySessions: todaySessions.length,
        walkIns: customers.length, members: customers.filter(c => c.tier && c.tier !== "Bronze").length,
        todayBookings: todayBookings.length, revenueChange, newToday, newThisWeek
    };
});

// ─── REFRESHMENT ───
ipcMain.handle("refreshment:get", () => {
    const data = store.load("refreshment");
    const today = tk();
    const todaySales = (data.sales || []).filter(s => s.date === today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.price * (s.qty || 1)), 0);
    return { menu: data.menu || [], todaySales, todayRevenue, itemsSold: todaySales.reduce((s, x) => s + (x.qty || 1), 0) };
});
ipcMain.handle("refreshment:add-item", (_, { name, price, category, stock }) => {
    const data = store.load("refreshment");
    const item = { id: "r" + Date.now(), name, price: parseInt(price) || 0, category: category || "Other", stock: parseInt(stock) || 0 };
    data.menu.push(item);
    store.save("refreshment", data);
    addLog("Product added", `${name} — ${fmt(price)} (${category})`, "Admin");
    return { success: true, item };
});
ipcMain.handle("refreshment:update-item", (_, { itemId, data: updates }) => {
    const data = store.load("refreshment");
    const item = data.menu.find(i => i.id === itemId);
    if (!item) return { success: false };
    Object.assign(item, updates);
    store.save("refreshment", data);
    return { success: true };
});
ipcMain.handle("refreshment:remove-item", (_, { itemId }) => {
    const data = store.load("refreshment");
    const item = data.menu.find(i => i.id === itemId);
    data.menu = data.menu.filter(i => i.id !== itemId);
    store.save("refreshment", data);
    if (item) addLog("Product removed", `Removed: ${item.name}`, "Admin");
    return { success: true };
});
ipcMain.handle("refreshment:sell", (_, { itemId, qty, customerId }) => {
    const data = store.load("refreshment");
    const item = data.menu.find(i => i.id === itemId);
    if (!item) return { success: false, error: "Item not found" };
    if (item.stock > 0 && item.stock < (qty || 1)) return { success: false, error: "Out of stock" };
    const quantity = qty || 1;
    const sale = { id: "rs" + Date.now(), itemId, name: item.name, price: item.price * quantity, unitPrice: item.price, qty: quantity, category: item.category, date: tk(), time: new Date().toLocaleTimeString("en-IN"), customerId: customerId || null };
    data.sales.push(sale);
    if (item.stock > 0) item.stock -= quantity;
    if (customerId) {
        const customers = store.load("customers");
        const settings = store.load("settings");
        const cust = customers.find(c => c.id === customerId);
        if (cust) {
            cust.visits = (cust.visits || 0) + 1;
            cust.totalSpent = (cust.totalSpent || 0) + sale.price;
            cust.points = (cust.points || 0) + Math.floor(sale.price / 10);
            const tierSettings = settings.loyalty || {};
            const silverReq = tierSettings.silver || 1000;
            const goldReq = tierSettings.gold || 3000;
            const platinumReq = tierSettings.platinum || 6000;
            if (cust.totalSpent >= platinumReq) cust.tier = "Platinum";
            else if (cust.totalSpent >= goldReq) cust.tier = "Gold";
            else if (cust.totalSpent >= silverReq) cust.tier = "Silver";
            else cust.tier = "Bronze";
            store.save("customers", customers);
        }
    }
    store.save("refreshment", data);
    addLog("Item sold", `${item.name} x${quantity} — ${fmt(sale.price)}`, "Admin");
    return { success: true, sale };
});

// ─── CUSTOMERS ───
ipcMain.handle("customers:get", () => store.load("customers"));
ipcMain.handle("customers:add", (_, { name, phone, email }) => {
    const c = store.load("customers");
    const cust = { id: "c" + Date.now(), name, phone: phone || "", email: email || "", visits: 0, totalSpent: 0, points: 0, tier: "Bronze", joinDate: tk(), lastVisit: null };
    c.push(cust);
    store.save("customers", c);
    addLog("Customer added", `New customer: ${name}`, "Admin");
    return { success: true, customer: cust };
});
ipcMain.handle("customers:update", (_, { customerId, data: updates }) => {
    const c = store.load("customers");
    const cust = c.find(x => x.id === customerId);
    if (!cust) return { success: false };
    Object.assign(cust, updates);
    store.save("customers", c);
    return { success: true };
});
ipcMain.handle("customers:delete", (_, { customerId }) => {
    const c = store.load("customers");
    const cust = c.find(x => x.id === customerId);
    store.save("customers", c.filter(x => x.id !== customerId));
    if (cust) addLog("Customer removed", `Removed: ${cust.name}`, "Admin");
    return { success: true };
});

// ─── STAFF ───
ipcMain.handle("staff:get", () => store.load("staff"));
ipcMain.handle("staff:add", (_, { name, role, phone }) => {
    const s = store.load("staff");
    const emp = { id: "st" + Date.now(), name, role: role || "Staff", phone: phone || "", active: true, joinDate: tk() };
    s.push(emp);
    store.save("staff", s);
    addLog("Staff added", `${name} — ${role}`, "Admin");
    return { success: true, staff: emp };
});
ipcMain.handle("staff:remove", (_, { staffId }) => {
    const s = store.load("staff");
    const emp = s.find(x => x.id === staffId);
    store.save("staff", s.filter(x => x.id !== staffId));
    if (emp) addLog("Staff removed", `Removed: ${emp.name}`, "Admin");
    return { success: true };
});

// ─── EXPENSES ───
ipcMain.handle("expenses:get", () => store.load("expenses"));
ipcMain.handle("expenses:add", (_, { category, description, amount }) => {
    const e = store.load("expenses");
    const exp = { id: "ex" + Date.now(), category, description, amount: parseFloat(amount) || 0, date: tk(), time: new Date().toLocaleTimeString("en-IN") };
    e.push(exp);
    store.save("expenses", e);
    addLog("Expense added", `${category}: ${fmt(amount)} — ${description || ""}`, "Admin");
    return { success: true, expense: exp };
});
ipcMain.handle("expenses:delete", (_, { expenseId }) => {
    const e = store.load("expenses");
    const exp = e.find(x => x.id === expenseId);
    store.save("expenses", e.filter(x => x.id !== expenseId));
    if (exp) addLog("Expense removed", `${exp.category}: ${fmt(exp.amount)}`, "Admin");
    return { success: true };
});

// ─── USERS ───
ipcMain.handle("users:get", () => store.load("users"));
ipcMain.handle("users:add", (_, { name, email, role, password }) => {
    const u = store.load("users");
    const user = { id: "u" + Date.now(), name, email: email || "", role: role || "Staff", password: password || "", status: "Active", createdAt: tk() };
    u.push(user);
    store.save("users", u);
    addLog("User added", `${name} — ${role}`, "Admin");
    return { success: true, user };
});
ipcMain.handle("users:update", (_, { userId, data: updates }) => {
    const u = store.load("users");
    const user = u.find(x => x.id === userId);
    if (!user) return { success: false };
    Object.assign(user, updates);
    store.save("users", u);
    return { success: true };
});
ipcMain.handle("users:delete", (_, { userId }) => {
    const u = store.load("users");
    const user = u.find(x => x.id === userId);
    store.save("users", u.filter(x => x.id !== userId));
    if (user) addLog("User removed", `Removed: ${user.name}`, "Admin");
    return { success: true };
});

// ─── LOGS ───
ipcMain.handle("logs:get", () => store.load("logs"));

// ─── BOOKINGS ───
ipcMain.handle("bookings:get", () => store.load("bookings"));
ipcMain.handle("bookings:add", (_, { customerName, deviceId, deviceName, date, time, duration, phone }) => {
    const b = store.load("bookings");
    const booking = { id: "bk" + Date.now(), customerName, deviceId, deviceName, date, time, duration, phone: phone || "", status: "upcoming", createdAt: tk() };
    b.push(booking);
    store.save("bookings", b);
    addLog("Booking created", `${customerName} — ${deviceName} on ${date} at ${time}`, "Admin");
    return { success: true, booking };
});
ipcMain.handle("bookings:cancel", (_, { bookingId }) => {
    const b = store.load("bookings");
    const booking = b.find(x => x.id === bookingId);
    if (booking) booking.status = "cancelled";
    store.save("bookings", b);
    if (booking) addLog("Booking cancelled", `${booking.customerName} — ${booking.deviceName}`, "Admin");
    return { success: true };
});
ipcMain.handle("bookings:complete", (_, { bookingId }) => {
    const b = store.load("bookings");
    const booking = b.find(x => x.id === bookingId);
    if (booking) booking.status = "completed";
    store.save("bookings", b);
    return { success: true };
});

// ─── REPORTS ───
ipcMain.handle("reports:revenue", (_, { period }) => {
    const sessions = store.load("sessions");
    const refreshment = store.load("refreshment");
    const expenses = store.load("expenses");
    const completed = sessions.filter(s => s.status === "completed");
    return { sessions: completed, refreshment: refreshment.sales || [], expenses: expenses || [] };
});

// ─── BACKUP ───
ipcMain.handle("backup:export", async () => {
    const result = await dialog.showSaveDialog({ title: "Export Data", defaultPath: "gaming-cafe-backup.json", filters: [{ name: "JSON", extensions: ["json"] }] });
    if (result.canceled) return { success: false };
    const data = { settings: store.load("settings"), devices: store.load("devices"), sessions: store.load("sessions"), refreshment: store.load("refreshment"), customers: store.load("customers"), staff: store.load("staff"), expenses: store.load("expenses"), users: store.load("users"), logs: store.load("logs"), bookings: store.load("bookings"), exportDate: new Date().toISOString() };
    require("fs").writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    addLog("Backup exported", `Saved to ${result.filePath}`, "Admin");
    return { success: true, path: result.filePath };
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
