// esbuild.config.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/app/page.js'],
  outfile: 'public/build/widget.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2015'],
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.css': 'css',
  },
  jsx: 'automatic',
  external: ['react', 'react-dom'],
  plugins: [],
}).catch(() => process.exit(1));
