function todayKey() { return new Date().toISOString().split("T")[0]; }
function tk() { return todayKey(); }
function fmtWeb(n) { return "\u20B9" + Number(n || 0).toLocaleString("en-IN"); }

window.api = {
    settings: {
        get: () => Promise.resolve(webStore.load("settings")),
        save: (s) => { webStore.save("settings", s); return Promise.resolve({ success: true }); }
    },
    devices: {
        get: () => Promise.resolve(webStore.load("devices")),
        add: ({ name, icon, type }) => {
            const d = webStore.load("devices");
            const dev = { id: "dev-" + Date.now(), name, icon: icon || "🎮", type: type || "console", status: "available", customer: null, sessionEnd: null };
            d.push(dev); webStore.save("devices", d);
            return Promise.resolve({ success: true, device: dev });
        },
        update: ({ deviceId, data }) => {
            const d = webStore.load("devices");
            const dev = d.find(x => x.id === deviceId);
            if (dev) Object.assign(dev, data);
            webStore.save("devices", d);
            return Promise.resolve({ success: true });
        },
        remove: ({ deviceId }) => {
            const d = webStore.load("devices");
            const s = webStore.load("sessions");
            if (s.some(x => x.deviceId === deviceId && x.status === "active")) return Promise.resolve({ success: false, error: "Cannot remove — active session" });
            webStore.save("devices", d.filter(x => x.id !== deviceId));
            return Promise.resolve({ success: true });
        }
    },
    sessions: {
        get: () => Promise.resolve(webStore.load("sessions")),
        active: () => Promise.resolve(webStore.load("sessions").filter(s => s.status === "active")),
        start: ({ deviceId, customerName, durationMinutes, players, customerId, openEnded }) => {
            const devices = webStore.load("devices");
            const sessions = webStore.load("sessions");
            const settings = webStore.load("settings");
            const device = devices.find(d => d.id === deviceId);
            if (!device || device.status !== "available") return Promise.resolve({ success: false, error: "Device not available" });
            const now = Date.now();
            const playerCount = players === 2 ? 2 : 1;
            const extraCharge = playerCount === 2 ? 50 : 0;
            let endTime, amount;
            if (openEnded) {
                endTime = null; amount = extraCharge;
            } else {
                endTime = now + durationMinutes * 60 * 1000;
                const ratePerHour = settings.pricing[deviceId] || 200;
                const rate30 = settings.pricing[deviceId + "_30min"] || 0;
                const baseAmount = durationMinutes <= 30 && rate30 ? rate30 : Math.ceil((durationMinutes / 60) * ratePerHour);
                amount = baseAmount + extraCharge;
            }
            const session = {
                id: "S" + Date.now(), deviceId, deviceName: device.name, customerName, customerId: customerId || null,
                startTime: now, sessionEnd: endTime, durationMinutes: openEnded ? null : durationMinutes,
                players: playerCount, amount, date: tk(), status: "active", openEnded: !!openEnded
            };
            sessions.push(session);
            device.status = "active"; device.customer = customerName; device.sessionEnd = endTime; device.sessionAmount = openEnded ? null : amount;
            webStore.save("sessions", sessions); webStore.save("devices", devices);
            if (customerId) {
                const customers = webStore.load("customers");
                const cust = customers.find(c => c.id === customerId);
                if (cust) { cust.visits = (cust.visits || 0) + 1; cust.lastVisit = tk(); webStore.save("customers", customers); }
            }
            const logs = webStore.load("logs");
            logs.push({ id: "L" + Date.now(), action: "Session started", detail: `${device.name} → ${customerName}`, user: "Admin", time: new Date().toISOString() });
            webStore.save("logs", logs);
            return Promise.resolve({ success: true, session });
        },
        end: ({ deviceId, chargeMode }) => {
            const devices = webStore.load("devices");
            const sessions = webStore.load("sessions");
            const settings = webStore.load("settings");
            const device = devices.find(d => d.id === deviceId);
            if (!device || (device.status !== "active" && device.status !== "expired")) return Promise.resolve({ success: false, error: "No active session" });
            const session = sessions.find(s => s.deviceId === deviceId && s.status === "active");
            if (session) {
                session.status = "completed"; session.actualEnd = Date.now();
                if (session.openEnded) {
                    const elapsedMs = Date.now() - session.startTime;
                    const elapsedMin = Math.max(1, Math.ceil(elapsedMs / 60000));
                    session.durationMinutes = elapsedMin;
                    const ratePerHour = settings.pricing[deviceId] || 200;
                    const rate30 = settings.pricing[deviceId + "_30min"] || 0;
                    session.amount = (elapsedMin <= 30 && rate30 ? rate30 : Math.ceil((elapsedMin / 60) * ratePerHour)) + (session.players === 2 ? 50 : 0);
                } else if (chargeMode === "actual") {
                    const elapsedMs = Date.now() - session.startTime;
                    const elapsedMin = Math.max(1, Math.ceil(elapsedMs / 60000));
                    session.actualMinutes = elapsedMin;
                    const ratePerHour = settings.pricing[deviceId] || 200;
                    const rate30 = settings.pricing[deviceId + "_30min"] || 0;
                    session.amount = (elapsedMin <= 30 && rate30 ? rate30 : Math.ceil((elapsedMin / 60) * ratePerHour)) + (session.players === 2 ? 50 : 0);
                    session.chargeMode = "actual";
                } else { session.chargeMode = "full"; }
            }
            const custName = device.customer || "Unknown";
            const sessionAmount = session ? session.amount : 0;
            const custId = session ? session.customerId : null;
            device.status = "available"; device.customer = null; device.sessionEnd = null; device.sessionAmount = null;
            webStore.save("sessions", sessions); webStore.save("devices", devices);
            if (custId) {
                const customers = webStore.load("customers");
                const cust = customers.find(c => c.id === custId);
                if (cust) {
                    cust.totalSpent = (cust.totalSpent || 0) + sessionAmount;
                    cust.points = (cust.points || 0) + Math.floor(sessionAmount / 10);
                    const tierSettings = settings.loyalty || {};
                    if (cust.totalSpent >= (tierSettings.platinum || 6000)) cust.tier = "Platinum";
                    else if (cust.totalSpent >= (tierSettings.gold || 3000)) cust.tier = "Gold";
                    else if (cust.totalSpent >= (tierSettings.silver || 1000)) cust.tier = "Silver";
                    else cust.tier = "Bronze";
                    webStore.save("customers", customers);
                }
            }
            const logs = webStore.load("logs");
            logs.push({ id: "L" + Date.now(), action: "Session ended", detail: `${device.name} → ${custName}`, user: "Admin", time: new Date().toISOString() });
            webStore.save("logs", logs);
            return Promise.resolve({ success: true, amount: sessionAmount });
        },
        preview: ({ deviceId }) => {
            const devices = webStore.load("devices");
            const sessions = webStore.load("sessions");
            const settings = webStore.load("settings");
            const device = devices.find(d => d.id === deviceId);
            const session = sessions.find(s => s.deviceId === deviceId && s.status === "active");
            if (!device || !session) return Promise.resolve(null);
            const elapsedMs = Date.now() - session.startTime;
            const elapsedMin = Math.max(1, Math.ceil(elapsedMs / 60000));
            const ratePerHour = settings.pricing[deviceId] || 200;
            const rate30 = settings.pricing[deviceId + "_30min"] || 0;
            const baseAmount = elapsedMin <= 30 && rate30 ? rate30 : Math.ceil((elapsedMin / 60) * ratePerHour);
            const extraCharge = (session.players === 2) ? 50 : 0;
            return Promise.resolve({ customerName: session.customerName, elapsedMinutes: elapsedMin, elapsedMs, ratePerHour, rate30, baseAmount, extraCharge, total: baseAmount + extraCharge, players: session.players });
        }
    },
    dashboard: {
        stats: () => {
            const sessions = webStore.load("sessions");
            const devices = webStore.load("devices");
            const customers = webStore.load("customers");
            const today = tk();
            const todaySessions = sessions.filter(s => s.date === today && s.status === "completed");
            const todayRev = todaySessions.reduce((s, x) => s + (x.amount || 0), 0);
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = yesterday.toISOString().split("T")[0];
            const yesterdaySessions = sessions.filter(s => s.date === yesterdayKey && s.status === "completed");
            const yesterdayRev = yesterdaySessions.reduce((s, x) => s + (x.amount || 0), 0);
            const activeSessions = sessions.filter(s => s.status === "active");
            const walkIns = sessions.filter(s => s.date === today && !s.customerId).length;
            const members = sessions.filter(s => s.date === today && s.customerId).length;
            return Promise.resolve({
                revenue: todayRev, activeSessions: activeSessions.length, totalDevices: devices.length,
                walkIns, members, todayBookings: webStore.load("bookings").filter(b => b.date === today).length,
                revenueChange: yesterdayRev > 0 ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100) : 0,
                newToday: customers.filter(c => c.joinDate === today).length,
                newThisWeek: customers.filter(c => { const d = new Date(c.joinDate); const now = new Date(); const weekAgo = new Date(now.setDate(now.getDate() - 7)); return d >= weekAgo; }).length
            });
        }
    },
    refreshment: {
        get: () => Promise.resolve(webStore.load("refreshment")),
        addItem: ({ name, price, category, stock }) => {
            const data = webStore.load("refreshment");
            const item = { id: "r" + Date.now(), name, price: parseInt(price) || 0, category: category || "Other", stock: parseInt(stock) || 0 };
            data.menu.push(item); webStore.save("refreshment", data);
            return Promise.resolve({ success: true, item });
        },
        updateItem: ({ itemId, data: updates }) => {
            const data = webStore.load("refreshment");
            const item = data.menu.find(i => i.id === itemId);
            if (item) Object.assign(item, updates);
            webStore.save("refreshment", data);
            return Promise.resolve({ success: true });
        },
        removeItem: ({ itemId }) => {
            const data = webStore.load("refreshment");
            data.menu = data.menu.filter(i => i.id !== itemId);
            webStore.save("refreshment", data);
            return Promise.resolve({ success: true });
        },
        sell: ({ itemId, qty, customerId }) => {
            const data = webStore.load("refreshment");
            const item = data.menu.find(i => i.id === itemId);
            if (!item) return Promise.resolve({ success: false, error: "Item not found" });
            if (item.stock > 0 && item.stock < (qty || 1)) return Promise.resolve({ success: false, error: "Out of stock" });
            const quantity = qty || 1;
            const sale = { id: "rs" + Date.now(), itemId, name: item.name, price: item.price * quantity, unitPrice: item.price, qty: quantity, category: item.category, date: tk(), time: new Date().toLocaleTimeString("en-IN"), customerId: customerId || null };
            data.sales.push(sale);
            if (item.stock > 0) item.stock -= quantity;
            data.todayRevenue = (data.todayRevenue || 0) + sale.price;
            data.itemsSold = (data.itemsSold || 0) + quantity;
            if (customerId) {
                const customers = webStore.load("customers");
                const settings = webStore.load("settings");
                const cust = customers.find(c => c.id === customerId);
                if (cust) {
                    cust.visits = (cust.visits || 0) + 1;
                    cust.totalSpent = (cust.totalSpent || 0) + sale.price;
                    cust.points = (cust.points || 0) + Math.floor(sale.price / 10);
                    const tierSettings = settings.loyalty || {};
                    if (cust.totalSpent >= (tierSettings.platinum || 6000)) cust.tier = "Platinum";
                    else if (cust.totalSpent >= (tierSettings.gold || 3000)) cust.tier = "Gold";
                    else if (cust.totalSpent >= (tierSettings.silver || 1000)) cust.tier = "Silver";
                    else cust.tier = "Bronze";
                    webStore.save("customers", customers);
                }
            }
            webStore.save("refreshment", data);
            return Promise.resolve({ success: true, sale });
        }
    },
    customers: {
        get: () => Promise.resolve(webStore.load("customers")),
        add: ({ name, phone, email }) => {
            const c = webStore.load("customers");
            const cust = { id: "c" + Date.now(), name, phone: phone || "", email: email || "", visits: 0, totalSpent: 0, points: 0, tier: "Bronze", joinDate: tk(), lastVisit: null };
            c.push(cust); webStore.save("customers", c);
            return Promise.resolve({ success: true, customer: cust });
        },
        update: ({ customerId, data }) => {
            const c = webStore.load("customers");
            const cust = c.find(x => x.id === customerId);
            if (cust) Object.assign(cust, data);
            webStore.save("customers", c);
            return Promise.resolve({ success: true });
        },
        delete: ({ customerId }) => {
            const c = webStore.load("customers");
            webStore.save("customers", c.filter(x => x.id !== customerId));
            return Promise.resolve({ success: true });
        }
    },
    staff: {
        get: () => Promise.resolve(webStore.load("staff")),
        add: ({ name, role, phone }) => {
            const s = webStore.load("staff");
            const staff = { id: "st" + Date.now(), name, role: role || "Staff", phone: phone || "" };
            s.push(staff); webStore.save("staff", s);
            return Promise.resolve({ success: true, staff });
        },
        remove: ({ staffId }) => {
            const s = webStore.load("staff");
            webStore.save("staff", s.filter(x => x.id !== staffId));
            return Promise.resolve({ success: true });
        }
    },
    expenses: {
        get: () => Promise.resolve(webStore.load("expenses")),
        add: ({ category, description, amount, date }) => {
            const e = webStore.load("expenses");
            const exp = { id: "e" + Date.now(), category: category || "Other", description: description || "", amount: amount || 0, date: date || tk() };
            e.push(exp); webStore.save("expenses", e);
            return Promise.resolve({ success: true, expense: exp });
        },
        delete: ({ expenseId }) => {
            const e = webStore.load("expenses");
            webStore.save("expenses", e.filter(x => x.id !== expenseId));
            return Promise.resolve({ success: true });
        }
    },
    users: {
        get: () => Promise.resolve(webStore.load("users")),
        add: ({ name, email, role, password }) => {
            const u = webStore.load("users");
            const user = { id: "u" + Date.now(), name, email: email || "", role: role || "Staff", password: password || "" };
            u.push(user); webStore.save("users", u);
            return Promise.resolve({ success: true, user });
        },
        update: ({ userId, data }) => {
            const u = webStore.load("users");
            const user = u.find(x => x.id === userId);
            if (user) Object.assign(user, data);
            webStore.save("users", u);
            return Promise.resolve({ success: true });
        },
        delete: ({ userId }) => {
            const u = webStore.load("users");
            webStore.save("users", u.filter(x => x.id !== userId));
            return Promise.resolve({ success: true });
        }
    },
    logs: {
        get: () => Promise.resolve(webStore.load("logs"))
    },
    bookings: {
        get: () => Promise.resolve(webStore.load("bookings")),
        add: ({ customerName, deviceId, deviceName, date, time, duration, phone }) => {
            const b = webStore.load("bookings");
            const booking = { id: "bk" + Date.now(), customerName, deviceId, deviceName, date, time, duration, phone: phone || "", status: "upcoming", createdAt: tk() };
            b.push(booking); webStore.save("bookings", b);
            return Promise.resolve({ success: true, booking });
        },
        cancel: ({ bookingId }) => {
            const b = webStore.load("bookings");
            const booking = b.find(x => x.id === bookingId);
            if (booking) booking.status = "cancelled";
            webStore.save("bookings", b);
            return Promise.resolve({ success: true });
        },
        complete: ({ bookingId }) => {
            const b = webStore.load("bookings");
            const booking = b.find(x => x.id === bookingId);
            if (booking) booking.status = "completed";
            webStore.save("bookings", b);
            return Promise.resolve({ success: true });
        }
    },
    reports: {
        revenue: () => {
            const sessions = webStore.load("sessions");
            const refreshment = webStore.load("refreshment");
            const expenses = webStore.load("expenses");
            return Promise.resolve({ sessions: sessions.filter(s => s.status === "completed"), refreshment: refreshment.sales || [], expenses: expenses || [] });
        }
    },
    backup: {
        export: () => {
            const data = {};
            ["settings","devices","sessions","refreshment","customers","staff","expenses","users","logs","bookings"].forEach(k => { data[k] = webStore.load(k); });
            data.exportDate = new Date().toISOString();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "gaming-cafe-backup.json"; a.click();
            URL.revokeObjectURL(url);
            return Promise.resolve({ success: true });
        }
    }
};
