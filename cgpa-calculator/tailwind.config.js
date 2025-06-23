/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '"Nunito Sans"',
          '"Manrope"',
          '"Urbanist"',
          '"Montserrat"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif'
        ],
        heading: [
          '"Montserrat"',
          '"Plus Jakarta Sans"',
          '"Urbanist"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif'
        ]
      }
    }
  },
  plugins: [],
}
