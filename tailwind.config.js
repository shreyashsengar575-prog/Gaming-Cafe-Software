/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                primary: "#6366f1",
                "primary-hover": "#818cf8",
                accent: "#06b6d4",
                "neon-pink": "#ec4899",
                "neon-green": "#10b981",
                "neon-yellow": "#f59e0b",
                "neon-red": "#ef4444",
                deep: "#0b0f19",
                "deep-main": "#0f1525",
                surface: "#151c2c",
                "surface-light": "#1c2537",
                "surface-hover": "#243049",
                sidebar: "#0d1220",
                card: "#111827",
                "card-border": "#1e293b"
            },
            fontFamily: {
                sans: ["'Segoe UI'", "system-ui", "-apple-system", "sans-serif"],
                mono: ["'Cascadia Code'", "'Fira Code'", "monospace"]
            },
            boxShadow: {
                "neon-blue": "0 0 20px rgba(99,102,241,.3), 0 0 40px rgba(99,102,241,.1)",
                "neon-cyan": "0 0 20px rgba(6,182,212,.3), 0 0 40px rgba(6,182,212,.1)",
                "neon-green": "0 0 20px rgba(16,185,129,.3), 0 0 40px rgba(16,185,129,.1)",
                "card": "0 4px 20px rgba(0,0,0,.3)"
            }
        }
    },
    plugins: []
};
