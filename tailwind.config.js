/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canonical scales — the single source of truth for iCamagu's palette.
        // `brand.*` and `success` below are kept only as aliases onto these same
        // values, so every existing bg-brand-*/text-brand-* class site keeps
        // working without a rewrite, instead of carrying its own near-duplicate hex.
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
          DEFAULT: '#f5f3ee',
          dark: '#e8e4db',
          darker: '#d4d0c8',
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
          // Darkened for readability (older users, outdoor phone screens):
          // the old muted grey #8a8278 was ~3.4:1 on cream, below the WCAG AA
          // 4.5:1 minimum for body text. #625b52 is ~5.9:1 on cream.
          light: '#4a443d',
          muted: '#625b52',
        },
        // Aliases — each points at one of the canonical values above.
        // brand.blue was never actually blue; it was a stray sage. brand.gold
        // and the old brand.ochre were both near-duplicates of terracotta —
        // both now alias the same, more golden ochre scale above.
        brand: {
          blue: '#4a7a4a',
          cream: '#f5f3ee',
          black: '#2b2620',
          ochre: '#c1922f',
          gold: '#c1922f',
          sageLight: '#9bb89b',
        },
        success: '#3d623d',
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      // The smallest text size is used for hints, prices-per-unit and labels
      // all over the app. 12px was hard to read for older users, so it is
      // bumped to 13px everywhere in one place.
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.15rem' }],
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
        'soft': '0 2px 12px rgba(0,0,0,0.04)',
        'card': '0 4px 20px rgba(0,0,0,0.06)',
        'elevated': '0 12px 40px rgba(0,0,0,0.1)',
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
