const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    settings: {
        get: () => ipcRenderer.invoke("settings:get"),
        save: (s) => ipcRenderer.invoke("settings:save", s)
    },
    devices: {
        get: () => ipcRenderer.invoke("devices:get"),
        add: (d) => ipcRenderer.invoke("devices:add", d),
        update: (d) => ipcRenderer.invoke("devices:update", d),
        remove: (d) => ipcRenderer.invoke("devices:remove", d)
    },
    sessions: {
        get: () => ipcRenderer.invoke("sessions:get"),
        active: () => ipcRenderer.invoke("sessions:active"),
        start: (d) => ipcRenderer.invoke("sessions:start", d),
        end: (d) => ipcRenderer.invoke("sessions:end", d),
        preview: (d) => ipcRenderer.invoke("sessions:preview", d)
    },
    dashboard: {
        stats: () => ipcRenderer.invoke("dashboard:stats")
    },
    refreshment: {
        get: () => ipcRenderer.invoke("refreshment:get"),
        addItem: (d) => ipcRenderer.invoke("refreshment:add-item", d),
        updateItem: (d) => ipcRenderer.invoke("refreshment:update-item", d),
        removeItem: (d) => ipcRenderer.invoke("refreshment:remove-item", d),
        sell: (d) => ipcRenderer.invoke("refreshment:sell", d)
    },
    customers: {
        get: () => ipcRenderer.invoke("customers:get"),
        add: (d) => ipcRenderer.invoke("customers:add", d),
        update: (d) => ipcRenderer.invoke("customers:update", d),
        delete: (d) => ipcRenderer.invoke("customers:delete", d)
    },
    staff: {
        get: () => ipcRenderer.invoke("staff:get"),
        add: (d) => ipcRenderer.invoke("staff:add", d),
        remove: (d) => ipcRenderer.invoke("staff:remove", d)
    },
    expenses: {
        get: () => ipcRenderer.invoke("expenses:get"),
        add: (d) => ipcRenderer.invoke("expenses:add", d),
        delete: (d) => ipcRenderer.invoke("expenses:delete", d)
    },
    users: {
        get: () => ipcRenderer.invoke("users:get"),
        add: (d) => ipcRenderer.invoke("users:add", d),
        update: (d) => ipcRenderer.invoke("users:update", d),
        delete: (d) => ipcRenderer.invoke("users:delete", d)
    },
    logs: {
        get: () => ipcRenderer.invoke("logs:get")
    },
    bookings: {
        get: () => ipcRenderer.invoke("bookings:get"),
        add: (d) => ipcRenderer.invoke("bookings:add", d),
        cancel: (d) => ipcRenderer.invoke("bookings:cancel", d),
        complete: (d) => ipcRenderer.invoke("bookings:complete", d)
    },
    reports: {
        revenue: (d) => ipcRenderer.invoke("reports:revenue", d)
    },
    backup: {
        export: () => ipcRenderer.invoke("backup:export"),
        import: (d) => ipcRenderer.invoke("backup:import", d)
    },
    auth: {
        login: (d) => ipcRenderer.invoke("auth:login", d),
        changePassword: (d) => ipcRenderer.invoke("auth:change-password", d)
    },
    payments: {
        setMethod: (d) => ipcRenderer.invoke("sessions:set-payment", d)
    },
    shifts: {
        get: () => ipcRenderer.invoke("shifts:get"),
        open: (d) => ipcRenderer.invoke("shifts:open", d),
        close: (d) => ipcRenderer.invoke("shifts:close", d)
    },
    discounts: {
        get: () => ipcRenderer.invoke("discounts:get"),
        add: (d) => ipcRenderer.invoke("discounts:add", d),
        delete: (d) => ipcRenderer.invoke("discounts:delete", d),
        validate: (d) => ipcRenderer.invoke("discounts:validate", d)
    },
    combos: {
        get: () => ipcRenderer.invoke("combos:get"),
        add: (d) => ipcRenderer.invoke("combos:add", d),
        delete: (d) => ipcRenderer.invoke("combos:delete", d)
    },
    queue: {
        get: () => ipcRenderer.invoke("queue:get"),
        add: (d) => ipcRenderer.invoke("queue:add", d),
        remove: (d) => ipcRenderer.invoke("queue:remove", d),
        notify: (d) => ipcRenderer.invoke("queue:notify", d)
    },
    receipt: {
        generate: (d) => ipcRenderer.invoke("receipt:generate", d)
    }
});
