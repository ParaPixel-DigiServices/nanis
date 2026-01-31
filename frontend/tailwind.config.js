/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Target specifically the 16-inch MacBook Pro range
        'mbp': '1700px', 
      },
      fontFamily: {
        sans: ['"Inter Display"', 'sans-serif'],
        brand: ['"Visby CF Demi Bold"', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: '#335CFF',
          dark: '#0F172A',
        },
        surface: {
          dark: '#EEF2F6',
          border: '#CDD5DF',
        }
      },
      boxShadow: {
        'signup-btn': '0px 0px 0px 1px #868C9833, 0px 0px 0px 0.5px #335CFF, inset 2px 4px 3px 0px #FFFFFF14, 0px 2px 2px 0px #34374833',
      }
    },
  },
  plugins: [],
}