/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FFFFFF',
          100: '#FAF9F6', // Warm porcelain editorial canvas
          200: '#F3F1EC',
          300: '#E5E2DA',
        },
        ink: {
          950: '#0B1220', // Deep financial navy-black (Dark mode canvas)
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
          500: '#6B7280',
          400: '#9CA3AF',
        },
        editorial: {
          teal: '#0F766E',
          navy: '#1E3A8A',
          amber: '#B45309',
          emerald: '#047857',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      maxWidth: {
        reading: '70ch',
      },
    },
  },
  plugins: [],
};
