/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.html"],
  theme: {
    extend: {
      colors: {
        'golf-green': {
          50: '#f0f7ed',
          100: '#d9edd1',
          200: '#b6dba6',
          300: '#8bc474',
          400: '#66ac4a',
          500: '#4a7c2d',
          600: '#3a6323',
          700: '#2d5016',
          800: '#263f17',
          900: '#213416',
        },
        'golf-beige': '#f5f1e8',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grass': "url('../images/grass-bg.jpeg')",
      },
    },
  },
  plugins: [],
}
