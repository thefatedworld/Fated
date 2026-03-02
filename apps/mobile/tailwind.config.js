/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7c3aed',
          light: '#a855f7',
          dark: '#5b21b6',
        },
        surface: {
          DEFAULT: '#111827',
          elevated: '#1f2937',
          card: '#1a2332',
        },
      },
    },
  },
  plugins: [],
};
