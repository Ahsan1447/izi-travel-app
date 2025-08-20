const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./widget-entry.jsx'],
  bundle: true,
  minify: true,
  outfile: 'public/widget.js',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.css': 'css',
  },
  jsx: 'automatic',
  plugins: [],
}).catch(() => process.exit(1));
