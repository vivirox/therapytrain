import postcssImport from 'postcss-import'
import postcssNesting from 'postcss-nesting'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'

export default {
    plugins: [
        postcssImport,
        postcssNesting,
        tailwindcss,
        autoprefixer,
        process.env.NODE_ENV === 'production' ? cssnano : null
    ].filter(Boolean)
} 