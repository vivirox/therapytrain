export default {
  plugins: [
    'postcss-nesting',
    (await import('tailwindcss')).default,
    (await import('autoprefixer')).default,
  ]
} 