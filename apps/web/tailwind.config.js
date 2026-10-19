/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#050a12",
        panel: "#0b1220",
        "panel-inner": "#101827",
        border: "#1c2a3d",
        muted: "#8b97a8",
        accent: "#22d3ee",
        gold: "#f5a623",
      },
      fontFamily: {
        sans: [
          "Manrope",
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
