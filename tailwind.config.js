/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Operational Intelligence Surface Colors
        surface: {
          0: '#000000',
          1: '#050505',
          2: '#0A0A0A',
          3: '#111111',
          4: '#1A1A1A',
        },
        // Border Colors
        'oi-border': {
          DEFAULT: '#333333',
          subtle: 'rgba(255, 255, 255, 0.1)',
          hover: '#555555',
        },
        // Accent Colors (functional)
        accent: {
          green: '#22C55E',
          red: '#EF4444',
          blue: '#3B82F6',
          amber: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.2)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.2)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.2)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
