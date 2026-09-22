/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: {
          DEFAULT: '#06080E',
          card: '#0A0E18',
          hover: '#0F1524',
          border: '#161D2E',
        },
        paytm: {
          blue: '#002970',
          darkBlue: '#001945',
          navy: '#020C22',
          cyan: '#00BAF2',
          lightCyan: '#38D1FF',
          green: '#00D287',
          dark: '#050811',
        },
        finora: {
          green: '#00D287',
          greenLight: '#26E59C',
          greenDark: '#059669',
          solana: '#9945FF',
          solanaCyan: '#14F195',
          gold: '#F59E0B',
          danger: '#EF4444',
          subtext: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'scale-in': 'scaleIn 0.25s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(0, 186, 242, 0.4)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 25px rgba(0, 186, 242, 0.7)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
