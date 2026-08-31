/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                primary: "#00f0ff",
                "primary-hover": "#33f5ff",
                "primary-dim": "#0099aa",
                accent: "#ff00aa",
                "accent-hover": "#ff33bb",
                "neon-pink": "#ff00aa",
                "neon-green": "#00ff88",
                "neon-yellow": "#ffee00",
                "neon-red": "#ff3344",
                "neon-purple": "#b400ff",
                deep: "#050510",
                "deep-main": "#0a0a1a",
                surface: "rgba(15,15,30,0.6)",
                "surface-solid": "#0f0f1e",
                "surface-light": "rgba(25,25,50,0.7)",
                "surface-hover": "rgba(0,240,255,0.08)",
                sidebar: "rgba(8,8,15,0.85)",
                card: "rgba(15,15,30,0.6)",
                "card-border": "rgba(0,240,255,0.15)",
            },
            fontFamily: {
                display: ["'Orbitron'", "sans-serif"],
                sans: ["'Inter'", "'Segoe UI'", "system-ui", "sans-serif"],
                mono: ["'Cascadia Code'", "'Fira Code'", "monospace"],
            },
            boxShadow: {
                "neon-cyan": "0 0 15px rgba(0,240,255,0.4), 0 0 45px rgba(0,240,255,0.15)",
                "neon-magenta": "0 0 15px rgba(255,0,170,0.4), 0 0 45px rgba(255,0,170,0.15)",
                "neon-green": "0 0 15px rgba(0,255,136,0.4), 0 0 45px rgba(0,255,136,0.15)",
                "neon-purple": "0 0 15px rgba(180,0,255,0.4), 0 0 45px rgba(180,0,255,0.15)",
                "neon-yellow": "0 0 15px rgba(255,238,0,0.4), 0 0 45px rgba(255,238,0,0.15)",
                "neon-red": "0 0 15px rgba(255,51,68,0.4), 0 0 45px rgba(255,51,68,0.15)",
                "glass": "0 8px 32px rgba(0,0,0,0.4)",
                "glass-lg": "0 16px 48px rgba(0,0,0,0.5)",
            },
            backgroundImage: {
                "gradient-neon": "linear-gradient(135deg, #00f0ff, #b400ff, #ff00aa)",
                "gradient-dark": "linear-gradient(135deg, #050510, #0a0a1a, #0f0f1e)",
            },
            animation: {
                "glow-pulse": "glowPulse 2s ease-in-out infinite",
                "float": "float 6s ease-in-out infinite",
                "gradient-shift": "gradientShift 8s ease infinite",
                "slide-up": "slideUp 0.5s ease-out",
                "fade-in": "fadeIn 0.4s ease-out",
                "scale-in": "scaleIn 0.3s ease-out",
            },
            keyframes: {
                glowPulse: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.6" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                gradientShift: {
                    "0%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                    "100%": { backgroundPosition: "0% 50%" },
                },
                slideUp: {
                    from: { opacity: "0", transform: "translateY(20px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                fadeIn: {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                scaleIn: {
                    from: { opacity: "0", transform: "scale(0.95)" },
                    to: { opacity: "1", transform: "scale(1)" },
                },
            },
        },
    },
    plugins: [],
};
