/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: '#0d0f0e',
        surface: '#141714',
        surface2: '#1a1d1a',
        border: '#252825',
        border2: '#2f342f',
        txt: '#e8ece8',
        txt2: '#8a9488',
        txt3: '#5a635a',
        lime: '#c8f560',
        mint: '#60f5c0',
        amber: '#f5a623',
        urgent: '#f55a5a',
        sky: '#60c8f5',
        violet: '#b060f5',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Sora', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
