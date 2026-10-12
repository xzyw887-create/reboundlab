/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#08090b",
        panel: "#0f1114",
        "panel-inner": "#14171c",
        border: "#1e2228",
        muted: "#7a8494",
        accent: "#2563eb",
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
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 1px 0 rgba(255, 255, 255, 0.04) inset",
        "glow-sm": "0 1px 0 rgba(255, 255, 255, 0.03) inset",
      },
    },
  },
  plugins: [],
};
