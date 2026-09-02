const STORAGE_PREFIX = "gaming_cafe_";

const webStore = {
    load(name) {
        try {
            const data = localStorage.getItem(STORAGE_PREFIX + name);
            return data ? JSON.parse(data) : this.defaults(name);
        } catch { return this.defaults(name); }
    },
    save(name, data) {
        localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data));
    },
    defaults(name) {
        const d = {
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
                    { id: "r1", name: "Coke", price: 30, category: "Drinks", stock: 50 },
                    { id: "r2", name: "Pepsi", price: 30, category: "Drinks", stock: 50 },
                    { id: "r3", name: "Burger", price: 80, category: "Snacks", stock: 30 },
                    { id: "r4", name: "Fries", price: 50, category: "Snacks", stock: 40 },
                    { id: "r5", name: "Coffee", price: 40, category: "Drinks", stock: 30 },
                    { id: "r6", name: "Sandwich", price: 60, category: "Snacks", stock: 25 },
                    { id: "r7", name: "Cold Coffee", price: 50, category: "Drinks", stock: 30 },
                    { id: "r8", name: "Maggi", price: 40, category: "Snacks", stock: 30 }
                ],
                sales: [],
                todayRevenue: 0,
                itemsSold: 0
            },
            customers: [],
            staff: [
                { id: "st1", name: "Rahul", role: "Manager", phone: "9876543210" },
                { id: "st2", name: "Priya", role: "Cashier", phone: "9123456780" }
            ],
            expenses: [],
            users: [{ id: "u1", name: "Shreyash", email: "admin@gamingcafe.in", role: "Super Admin", password: "Shreyash123" }],
            logs: [],
            bookings: [],
            shifts: [],
            discounts: [],
            combos: [],
            queue: []
        };
        if (!localStorage.getItem(STORAGE_PREFIX + name)) {
            this.save(name, d[name] !== undefined ? d[name] : []);
        }
        return d[name] !== undefined ? d[name] : [];
    }
};
