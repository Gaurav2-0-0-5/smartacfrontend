/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'glow-1': 'pulseGlow 12s infinite ease-in-out',
        'glow-2': 'pulseGlowReverse 15s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
