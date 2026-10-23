/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#08090B',
          900: '#08090B',
          800: '#0C0E12',
          700: '#111316',
        },
        graphite: {
          DEFAULT: '#111316',
          border: '#1A1D23',
          card: '#14171C',
          hover: '#1B1F26',
        },
        gunmetal: {
          DEFAULT: '#202328',
          light: '#2A2E35',
          lighter: '#353A42',
        },
        platinum: {
          DEFAULT: '#C7CBD0',
          dark: '#9EA4AC',
          light: '#DEE1E5',
          glow: 'rgba(199, 203, 208, 0.15)',
        },
        silver: {
          DEFAULT: '#E1E4E8',
          bright: '#F7F8FA',
        },
        slate: {
          muted: '#858B95',
          subtle: '#525863',
        },
        status: {
          success: '#47D7A0',
          warning: '#F4B860',
          critical: '#FF626B',
          info: '#64B5F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'platinum': '0 0 25px -5px rgba(199, 203, 208, 0.12)',
        'platinum-lg': '0 0 40px -10px rgba(199, 203, 208, 0.22)',
        'metal-bevel': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08), 0 2px 8px 0 rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
      }
    },
  },
  plugins: [],
}
