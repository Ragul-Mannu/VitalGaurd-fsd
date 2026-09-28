/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          primary: '#2563eb', 
          primaryLight: '#3b82f6',
          primaryDark: '#1d4ed8',
        },
        state: {
          danger: '#dc2626',
          dangerLight: '#fef2f2',
          dangerBorder: '#fca5a5',
          warning: '#d97706',
          warningLight: '#fffbeb',
          warningBorder: '#fde047',
          success: '#16a34a',
          successLight: '#f0fdf4',
          successBorder: '#86efac',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0,0,0,0.03), 0 2px 6px -1px rgba(0,0,0,0.02)',
      }
    },
  },
  plugins: [],
}
