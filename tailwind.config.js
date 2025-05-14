/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tp-green': '#00FF41',
        'tp-green-light': '#7AFFA7',
        'tp-purple': '#8A2BE2',
        'tp-black': '#0f0f0f',
        'tp-dark-gray': '#1a1a1a',
        'tp-card-gray': '#2a2a2a',
        'tp-text-light': '#e5e5e5',
        'tp-accent': '#00FF41',
        'tp-surface': '#1a1a1a',
        'tp-surface-light': '#2a2a2a',
        'tp-surface-dark': '#0a0a0a',
      },
      fontFamily: {
        'segoe': ['Segoe UI', 'Arial', 'sans-serif'],
        'sans': ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-fade': 'linear-gradient(to top, rgba(15, 15, 15, 1) 0%, rgba(15, 15, 15, 0.9) 10%, rgba(15, 15, 15, 0.7) 30%, rgba(15, 15, 15, 0.4) 60%, rgba(15, 15, 15, 0) 100%)',
        'card-fade': 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 50%)',
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'card': '0 5px 20px rgba(0, 0, 0, 0.7)',
        'card-hover': '0 8px 25px rgba(0, 0, 0, 0.8)',
      },
      transitionProperty: {
        'width': 'width',
        'spacing': 'margin, padding',
      },
      zIndex: {
        '60': '60',
        '70': '70',
      },
      gridTemplateColumns: {
        'cards': 'repeat(auto-fill, minmax(180px, 1fr))',
        'cards-sm': 'repeat(auto-fill, minmax(150px, 1fr))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}