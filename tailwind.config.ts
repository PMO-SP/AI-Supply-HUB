import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#E30613",
          "red-dark": "#B8050F",
          "red-light": "#FF2D3B",
          black: "#111111",
          "black-soft": "#1E1E1E",
          "gray-900": "#2A2A2A",
          "gray-700": "#555555",
          "gray-500": "#888888",
          "gray-300": "#BBBBBB",
        },
        status: {
          green: "#22C55E",
          "green-light": "#DCFCE7",
          "green-dark": "#166534",
          amber: "#F59E0B",
          "amber-light": "#FEF3C7",
          "amber-dark": "#92400E",
          red: "#E30613",
          "red-light": "#FEE2E2",
          "red-dark": "#991B1B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
