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
          teal: '#0d9488',
          'teal-light': '#1ca8a0',
          'teal-soft': '#e6f7f6',
          orange: '#ff7a3d',
          'orange-light': '#ff9f43',
          'orange-soft': '#fff4ed',
          pink: '#ff5c7c',
          'pink-deep': '#d9365a',
          blue: '#2ea8f0',
          'blue-deep': '#1a80c2',
          yellow: '#f2c27a',
          purple: '#8b52d6',
          green: '#2a9e55',
          'green-light': '#4fd17e'
        },
        card: {
          DEFAULT: 'var(--card-bg, #ffffff)',
          dark: '#1e242b'
        }
      },
      boxShadow: {
        'press': '0 3px 0 var(--press-color, #0f766e)',
        'press-orange': '0 3px 0 #d95e26',
        'press-neutral': '0 3px 0 #d1d5db',
        'card-soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
