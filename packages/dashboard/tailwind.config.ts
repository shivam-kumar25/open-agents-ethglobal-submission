import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'mesh-bg': '#030712',
        'mesh-card': '#111827',
        'mesh-border': '#1f2937',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'version-bump': 'versionBump 0.5s ease-out',
      },
      keyframes: {
        versionBump: {
          '0%': { transform: 'scale(1)', color: '#10b981' },
          '50%': { transform: 'scale(1.15)', color: '#34d399' },
          '100%': { transform: 'scale(1)', color: '#10b981' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
