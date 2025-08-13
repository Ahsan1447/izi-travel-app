const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./src/widget-entry.js'],
  bundle: true,
  minify: true,
  outfile: 'public/widget.js',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
}).catch(() => process.exit(1));
