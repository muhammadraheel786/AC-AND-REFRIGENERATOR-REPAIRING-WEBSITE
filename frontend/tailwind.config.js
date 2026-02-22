/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Tajawal', 'Noto Kufi Arabic', 'sans-serif'],
        urdu: ['Noto Nastaliq Urdu', 'serif'],
      },
      colors: {
        primary: {
          50: '#e6f7f7',
          100: '#b3e8e8',
          200: '#80d9d9',
          300: '#4dcaca',
          400: '#1abbbb',
          500: '#0d9b9b',
          600: '#0a7c7c',
          700: '#075d5d',
          800: '#043e3e',
          900: '#021f1f',
        },
        accent: {
          gold: '#d4a853',
          sand: '#f5e6d3',
        },
      },
    },
  },
  plugins: [],
}
