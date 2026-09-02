const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// Store dataDir as a lazy-initialized value
let _dataDir = null;

function getDataDir() {
  if (_dataDir === null) {
    _dataDir = path.join(app.getPath("userData"), "data");
  }
  return _dataDir;
}

function ensureDataDir() {
    const dd = getDataDir();
    if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
}

function getFilePath(name) {
    return path.join(getDataDir(), name + ".json");
}

function readJSON(name) {
    ensureDataDir();
    const fp = getFilePath(name);
    if (!fs.existsSync(fp)) return null;
    try { return JSON.parse(fs.readFileSync(fp, "utf-8")); } catch { return null; }
}

function writeJSON(name, data) {
    ensureDataDir();
    fs.writeFileSync(getFilePath(name), JSON.stringify(data, null, 2), "utf-8");
}

function getDefaults(name) {
    const defaults = {
        settings: {
            general: { cafeName: "Gaming Cafe", phone: "+91 98765 43210", email: "admin@gamingcafe.in", address: "123 MG Road, Bangalore" },
            pricing: { ps5: 200, ps4: 150, vr: 300 },
            hours: { open: "10:00", close: "23:00", openDays: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
            session: { warningMinutes: 5, graceMinutes: 10, autoEnd: true, soundNotifications: false },
            loyalty: { pointsPerRupee: 0.1, redeemRate: 100, silver: 1000, gold: 3000, platinum: 6000 }
        },
        devices: [
            { id: "ps5", name: "PS5", icon: "🎮", type: "console", status: "available", customer: null, sessionEnd: null },
            { id: "ps4", name: "PS4", icon: "🎮", type: "console", status: "available", customer: null, sessionEnd: null },
            { id: "vr", name: "VR", icon: "🥽", type: "vr", status: "available", customer: null, sessionEnd: null }
        ],
        sessions: [],
        refreshment: {
            menu: [
                { id: "r1", name: "Coke", price: 40, category: "Drinks", stock: 50 },
                { id: "r2", name: "Pepsi", price: 40, category: "Drinks", stock: 50 },
                { id: "r3", name: "Burger", price: 120, category: "Snacks", stock: 20 },
                { id: "r4", name: "Fries", price: 80, category: "Snacks", stock: 30 },
                { id: "r5", name: "Coffee", price: 60, category: "Drinks", stock: 40 },
                { id: "r6", name: "Sandwich", price: 100, category: "Snacks", stock: 25 },
                { id: "r7", name: "Cold Coffee", price: 80, category: "Drinks", stock: 30 },
                { id: "r8", name: "Maggi", price: 60, category: "Snacks", stock: 20 }
            ],
            sales: []
        },
        customers: [],
        staff: [],
        expenses: [],
        users: [
            { id: "u1", name: "Admin", email: "admin@gamezone.in", role: "Super Admin", password: "admin123", status: "Active", createdAt: new Date().toISOString().split("T")[0] }
        ],
        logs: [],
        bookings: [],
        shifts: [],
        discounts: [],
        combos: [],
        queue: []
    };
    return defaults[name] || null;
}

function load(name) {
    const data = readJSON(name);
    if (data === null) {
        const defaults = getDefaults(name);
        if (defaults) writeJSON(name, defaults);
        return defaults;
    }
    return data;
}

function save(name, data) {
    writeJSON(name, data);
}

function todayKey() {
    return new Date().toISOString().split("T")[0];
}

module.exports = { load, save, todayKey };