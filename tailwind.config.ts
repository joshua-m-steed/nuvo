import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nuvo: {
          50: "#FFF4F0",
          100: "#FFE6DE",
          200: "#FFC6B3",
          300: "#FFA285",
          400: "#FF7A52",
          500: "#E45B3E",
          600: "#D94E3A",
          700: "#B53B2C",
          800: "#8E2E23",
          900: "#6B221A"
        },
        ink: {
          950: "#0B0F19",
          900: "#0F172A",
          800: "#1F2937",
          700: "#374151",
          600: "#4B5563",
          500: "#6B7280",
          400: "#9CA3AF",
          300: "#D1D5DB",
          200: "#E5E7EB",
          100: "#F3F4F6",
          50: "#F8FAFC"
        }
      },
      boxShadow: { subtle: "0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)" },
      borderRadius: { xl2: "1.25rem" }
    }
  },
  plugins: []
} satisfies Config;
