/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Bold brand palette
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Energetic accent colors used across category chips & charts
        sunset: '#ff6b6b',
        tangerine: '#ff922b',
        sunflower: '#fcc419',
        lime: '#94d82d',
        emerald: '#20c997',
        sky: '#22b8cf',
        ocean: '#4dabf7',
        grape: '#cc5de8',
        rose: '#f06595',
        ink: '#1b1733',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(76, 29, 149, 0.25)',
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 18px 40px -16px rgba(124, 58, 237, 0.45)',
        'glow-sm': '0 8px 20px -10px rgba(124, 58, 237, 0.4)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7c3aed 0%, #cc5de8 50%, #f06595 100%)',
        'aurora':
          'radial-gradient(circle at 20% 20%, rgba(124,58,237,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(34,184,207,0.16), transparent 45%), radial-gradient(circle at 50% 100%, rgba(240,101,149,0.14), transparent 40%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
        'pop-in': 'pop-in 0.3s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
