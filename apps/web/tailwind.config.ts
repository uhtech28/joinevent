import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      // Brand tokens from the launch landing-page design system.
      colors: {
        brand: {
          DEFAULT: '#ff6b35',
          orange: '#ff6b35',
          'orange-dark': '#e85d2a',
          amber: '#f7b731',
          coral: '#ff7a59',
          purple: '#6c3bff',
          'purple-light': '#9b5cff',
        },
        cream: {
          50: '#fffdf8',
          100: '#fff8f0',
          200: '#fff1e0',
          300: '#ffe6c7',
        },
        ink: {
          400: '#7a6a5a',
          500: '#5a4a3a',
          600: '#3d2f24',
          700: '#2b1d13',
          800: '#1a0f08',
        },
        accent: {
          sky: '#4db2ff',
          mint: '#3ec28a',
          rose: '#ff5d8f',
        },
        // ---- Premium section palette (matches the SkyEvents proposal collateral) ----
        navy: {
          50: '#eef2ff',
          100: '#dde2f5',
          500: '#3a4880',
          600: '#26346a',
          700: '#1d2c5a',
          800: '#142049',
          900: '#0c1638',
        },
        ribbon: {
          pink: '#e83778',
          rose: '#d6336c',
          green: '#16a37a',
          emerald: '#0d9e6a',
          purple: '#6b3fa0',
          violet: '#5b32a0',
          orange: '#ee6c1a',
          yellow: '#f5c845',
          blue: '#1d6fdc',
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #ff6b35 0%, #ff7a59 50%, #ffcb57 100%)',
        'brand-gradient-text': 'linear-gradient(135deg, #ff6b35 0%, #ff7a59 50%, #ffcb57 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,203,87,0.12))',
        'purple-gradient': 'linear-gradient(135deg, #6c3bff 0%, #9b5cff 100%)',
        // ---- Premium navy gradients used in the welcome banner + footer
        'navy-gradient': 'linear-gradient(135deg, #142049 0%, #1d2c5a 50%, #26346a 100%)',
        'navy-spotlight': 'radial-gradient(800px circle at top right, rgba(255,203,87,0.15), transparent 50%), linear-gradient(135deg, #142049 0%, #1d2c5a 100%)',
      },
      boxShadow: {
        // Tight, contained CTA shadows. No bleeding glow.
        brand: '0 4px 12px rgba(255, 107, 53, 0.18)',
        'brand-lg': '0 8px 20px rgba(255, 107, 53, 0.22)',
        purple: '0 4px 12px rgba(108, 59, 255, 0.18)',
        'purple-lg': '0 8px 20px rgba(108, 59, 255, 0.22)',
        soft: '0 10px 30px rgba(0, 0, 0, 0.06)',
        card: '0 14px 40px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 53, 0.45)' },
          '50%': { boxShadow: '0 0 0 14px rgba(255, 107, 53, 0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
