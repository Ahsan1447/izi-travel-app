const esbuild = require('esbuild');
const { execSync } = require('child_process');

// Build Tailwind CSS first
console.log('Building Tailwind CSS...');
try {
  execSync('npx tailwindcss -i ./src/app/globals.css -o ./public/widget.css --minify', { stdio: 'inherit' });
  console.log('Tailwind CSS built successfully');
} catch (error) {
  console.error('Error building Tailwind CSS:', error);
  process.exit(1);
}

// Build the widget with esbuild
console.log('Building widget with esbuild...');
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
}).then(() => {
  console.log('Widget built successfully');
}).catch((error) => {
  console.error('Error building widget:', error);
  process.exit(1);
});
