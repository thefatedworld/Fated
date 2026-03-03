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
        accent: {
          coral: '#f97316',
          gold: '#f59e0b',
        },
        surface: {
          DEFAULT: '#111827',
          elevated: '#1f2937',
          card: '#0f172a',
          muted: '#1e293b',
        },
        ink: {
          DEFAULT: '#ffffff',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
      },
    },
  },
  plugins: [],
};
