/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline: ['"Funnel Display"', 'Cairo', 'sans-serif'],
        arabic: ['Cairo', '"Noto Sans Arabic"', 'sans-serif'],
        latin: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'billboard-team': ['clamp(2.4rem, 5.8vw, 8rem)', { lineHeight: '1.1', fontWeight: '700' }],
        'billboard-score': ['clamp(5rem, 12vw, 16rem)', { lineHeight: '0.9', fontWeight: '800' }],
        'billboard-timer': ['clamp(1.8rem, 4vw, 5.6rem)', { lineHeight: '1', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
}
