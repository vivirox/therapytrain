import postcssImport from 'postcss-import'
import postcssNesting from 'postcss-nesting'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    // Handle imports first
    postcssImport,
    // Enable nesting before Tailwind and configure it properly
    postcssNesting({
      noIsPseudoSelector: true,
      // Enable CSS nesting features
      features: {
        nesting: true,
        nestingRules: true,
        nestingAtRules: true
      }
    }),
    // Process Tailwind directives
    tailwindcss,
    // Add vendor prefixes (using .browserslistrc)
    autoprefixer
  ]
} 