/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a1f3c',
          dark: '#12162b',
          light: '#252b4a',
          hover: '#2e3560',
        },
        gold: {
          DEFAULT: '#f0c040',
          dark: '#d4a800',
          light: '#f5d570',
          muted: '#f7e089',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
