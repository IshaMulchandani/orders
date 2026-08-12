/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Navy-blue accent palette per PLAN.md section 6 — reuse these
      // tokens instead of hardcoding hex values in components.
      colors: {
        navy: {
          DEFAULT: "#0B2447",
          light: "#19376D",
          accent: "#A5D7E8",
        },
      },
    },
  },
  plugins: [],
};
