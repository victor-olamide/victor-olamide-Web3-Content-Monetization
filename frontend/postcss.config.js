// PostCSS config with production minification for Vercel deployment
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: process.env.NODE_ENV === 'production' ? {} : false,
  },
};
