/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f7f9',
          100: '#cceef3',
          200: '#99dde7',
          300: '#66cbdb',
          400: '#33bacf',
          500: '#01abb9', // Brand Cyan / Teal
          600: '#018a95',
          700: '#006972',
          800: '#00474e',
          900: '#002262', // Deep Navy Midnight
          950: '#001640',
        },
        navy: {
          50: '#eef2f9',
          100: '#d5e0f1',
          500: '#1b4a9b',
          700: '#0b327b',
          800: '#002875',
          900: '#002262',
          950: '#001744',
        },
        cyan: {
          50: '#f0fbfc',
          100: '#dbf6f8',
          200: '#b8edf2',
          500: '#01abb9',
          600: '#0097a4',
          700: '#007b86',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
