/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        crop: {
          50: '#f2f8f4',
          100: '#e1efe5',
          200: '#c5dfcd',
          300: '#9bc8a8',
          400: '#6ca97d',
          500: '#478b59',
          600: '#357045',
          700: '#2c5938',
          800: '#25472f',
          900: '#1f3c29',
          950: '#0e1f14',
        },
        severity: {
          none: '#10b981',     // Green (Healthy)
          low: '#f59e0b',      // Yellow/Orange (Low Severity)
          moderate: '#f97316', // Orange (Moderate Severity)
          high: '#ef4444',     // Red (High Severity)
        }
      },
    },
  },
  plugins: [],
}
