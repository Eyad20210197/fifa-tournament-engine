/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#040711',
        card: '#0a0f1d',
        primary: 'var(--primary-color, #38bdf8)',
        secondary: 'var(--secondary-color, #f59e0b)',
      },
      fontFamily: {
        headline: ['Outfit', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
