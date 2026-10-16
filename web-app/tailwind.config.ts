import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ── Light surfaces (warm neutral) ── */
        "surface-lowest": "#FAFAF9",
        "surface-low":    "#F5F4F2",
        "surface-base":   "#EFEEEC",
        "surface-mid":    "#E8E7E4",
        "surface-high":   "#DDDBD8",
        "surface-highest":"#C8C6C2",

        /* ── Text ── */
        "on-surface":         "#111110",
        "on-surface-muted":   "#6B6968",
        "on-surface-faint":   "#9D9B98",

        /* ── Accent: Indigo ── */
        "accent":       "#4F46E5",
        "accent-light": "#818CF8",
        "accent-deep":  "#3730A3",

        /* ── Accent: Violet ── */
        "violet-accent":      "#7C3AED",
        "violet-accent-light":"#A78BFA",

        /* ── Semantic (kept for interview page) ── */
        "neon-purple":      "#7C3AED",
        "neon-purple-deep": "#4F46E5",
        "neon-cyan":        "#0891B2",
        "neon-cyan-deep":   "#0E7490",
        "neon-violet":      "#8B5CF6",
      },
      fontFamily: {
        manrope: ["Manrope", "sans-serif"],
        inter:   ["Inter",   "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial":   "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero":     "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        "gradient-cta":      "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        "gradient-warm":     "linear-gradient(160deg, #FAFAF9 0%, #F0EDF8 50%, #FAFAF9 100%)",
      },
      animation: {
        "pulse-slow":  "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float":       "float 6s ease-in-out infinite",
        "fade-up":     "fadeUp 0.6s ease forwards",
        "scale-in":    "scaleIn 0.5s ease forwards",
        "slide-right": "slideRight 0.6s ease forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-16px)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          from: { opacity: "0", transform: "translateX(-24px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
