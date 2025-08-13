const esbuild = require('esbuild');
const stylePlugin = require('esbuild-style-plugin');

esbuild.build({
  entryPoints: ['esbuild/widget-entry.jsx'],
  bundle: true,
  outfile: 'public/widget.js',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [stylePlugin()],
}).catch(() => process.exit(1));
