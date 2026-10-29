/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canonical scales: the single source of truth for iCamagu's palette.
        // `brand.*` and `success` below are kept only as aliases onto these same
        // values, so every existing bg-brand-*/text-brand-* class keeps working.
        sage: {
          50: '#f4f7f4',
          100: '#e3ebe3',
          200: '#c5d6c5',
          300: '#9bb89b',
          400: '#6a936a',
          500: '#4a7a4a',
          600: '#3d623d',
          700: '#334e33',
        },
        cream: {
          DEFAULT: '#f5f1e8',
          dark: '#e9e2d4',
          darker: '#d6cdbb',
        },
        terracotta: {
          light: '#e07a3f',
          DEFAULT: '#c45c26',
          dark: '#a3471a',
        },
        ochre: {
          light: '#e0a94e',
          DEFAULT: '#c1922f',
          dark: '#96721f',
        },
        ink: {
          DEFAULT: '#2b2620',
          light: '#4a443d',
          // Dark enough that hint text stays readable on cream (4.5:1).
          muted: '#6b645a',
        },
        // Aliases: each points at one of the canonical values above.
        brand: {
          blue: '#4a7a4a',
          cream: '#f5f1e8',
          black: '#2b2620',
          ochre: '#c1922f',
          gold: '#c1922f',
          sageLight: '#9bb89b',
        },
        success: '#3d623d',
      },
      fontFamily: {
        // Fraunces: a soft, high-contrast serif for headings (classy, warm).
        // Manrope: a clear, friendly sans for everything people read and tap.
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
      borderRadius: {
        'soft': '20px',
        'pill': '9999px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(43,38,32,0.04), 0 6px 16px -10px rgba(74,45,24,0.22)',
        'card': '0 2px 4px rgba(43,38,32,0.04), 0 18px 36px -22px rgba(74,45,24,0.45)',
        'elevated': '0 12px 40px rgba(43,38,32,0.12)',
        'glow': '0 0 20px rgba(74,122,74,0.2)',
        'terracotta': '0 6px 24px rgba(196,92,38,0.3)',
      },
      transitionTimingFunction: {
        'bounce-subtle': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'snap': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0)' },
          '100%': { transform: 'scale(1)' },
        },
        gentleSway: {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'gentle-sway': 'gentleSway 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
