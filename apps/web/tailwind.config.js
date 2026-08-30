/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#081c17',
          800: '#102a23',
          700: '#193b31',
          600: '#2a5547',
        },
        accent: {
          blue: '#63c7b2',
          green: '#72bd8c',
          red: '#ed7d6d',
          yellow: '#e3b869',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
