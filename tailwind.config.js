module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        'chatgpt': {
          'main': '#10a37f',
          'light': '#1abc9c',
          'dark': '#0d8c6d',
        }
      }
    },
  },
  plugins: [],
}