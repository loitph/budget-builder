/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#fffff4',
        'secondary': '#eeeeee',
      },
      backgroundColor: {
        'primary': '#fffff4',
        'secondary': '#eeeeee',
      },
      borderColor: {
        'primary': '#fffff4',
        'secondary': '#eeeeee',
      },
    },
  },
  plugins: [],
}

