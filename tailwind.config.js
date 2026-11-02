/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#a3e635',
        'accent-dark': '#65a30d',
        navy: {
          900: '#0b1120',
        },
      },
    },
  },
  plugins: [],
}
