/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Musify design tokens
        accent: {
          DEFAULT: '#a78bfa', // violet-400 — brand accent
          bright: '#c4b5fd',
          deep: '#7c3aed',
        },
        surface: {
          950: '#0a0a0f', // page background
          900: '#13131a', // panels
          800: '#1c1c26', // raised cards
          700: '#262633', // hover / overlays
        },
        muted: '#a1a1b5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease both',
        'slide-in-right': 'slide-in-right 0.25s ease both',
      },
    },
  },
  plugins: [],
};
