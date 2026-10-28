/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        resq: {
          navy: "#14243A",
          "navy-dark": "#0E1A2B",
          "navy-light": "#1E3554",
          blue: "#2563EB",
          "blue-dark": "#1D4ED8",
          "blue-light": "#3B82F6",
          red: "#DC2626",
          "red-light": "#FEE2E2",
          amber: "#D97706",
          "amber-light": "#FEF3C7",
          green: "#15803D",
          "green-light": "#DCFCE7",
          bg: "#F4F7FB",
          card: "#FFFFFF",
          text: "#172033",
          muted: "#64748B",
          border: "#E2E8F0",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
