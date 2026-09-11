/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/frontend/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#090a0f",
        surface: "#11131a",
        surfaceElevated: "#181b24",
        borderSubtle: "#1e2230",
        textPrimary: "#f3f4f6",
        textMuted: "#8e98a8",
        accent: {
          DEFAULT: "#10b981",
          hover: "#059669",
          muted: "rgba(16, 185, 129, 0.1)",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
