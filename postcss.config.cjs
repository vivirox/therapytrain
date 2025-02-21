const postcssNesting = require('postcss-nesting')
const tailwindcss = require('tailwindcss')
const autoprefixer = require('autoprefixer')

/** @type {import('postcss-load-config').Config} */
module.exports = {
    plugins: {
        'postcss-import': {},
        'tailwindcss/nesting': 'postcss-nesting',
        'tailwindcss': {},
        'autoprefixer': {},
    }
}
