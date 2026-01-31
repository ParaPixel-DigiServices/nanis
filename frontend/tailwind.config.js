/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'mac-16': '1728px', // Custom breakpoint for your design
        '3xl': '1920px',
      },
      // We will add your exact colors and fonts here later
      colors: {
        // 'brand-black': '#000000', 
      },
    },
  },
  plugins: [],
}