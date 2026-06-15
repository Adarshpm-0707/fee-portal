/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fa',
          100: '#e4e8f0',
          200: '#c8d1e0',
          300: '#9eafcb',
          400: '#6e87b0',
          500: '#4a6794',
          600: '#3a5175',
          700: '#2f4260',
          800: '#1e3a5f', // Main dark blue theme
          900: '#152842',
          950: '#0e1b2e',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
