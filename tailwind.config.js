/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Roboto', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
      colors: {
        terminal: {
          bg: '#0F111A',
          panel: '#151923',
          line: 'rgba(255,255,255,0.08)',
        },
      },
      borderRadius: {
        terminal: '4px',
      },
    },
  },
};
