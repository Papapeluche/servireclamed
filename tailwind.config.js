/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        },
        warn: {
          100: "#fef3c7",
          500: "#d97706",
          700: "#92400e",
        },
      },
    },
  },
  plugins: [],
};
