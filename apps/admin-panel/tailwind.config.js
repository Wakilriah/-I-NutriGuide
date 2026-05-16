/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2f6b52",
          dark: "#183c2d",
          soft: "#e8f2ec",
        },
      },
    },
  },
  plugins: [],
};
