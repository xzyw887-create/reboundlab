/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0b0e14",
        panel: "#121820",
        "panel-inner": "#1a212f",
        border: "#1e2d42",
        muted: "#8892b0",
        accent: "#00a3ff",
        gold: "#f5a623",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 163, 255, 0.25)",
        "glow-sm": "0 0 12px rgba(0, 163, 255, 0.2)",
      },
    },
  },
  plugins: [],
};
