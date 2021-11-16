const { build } = require('esbuild')
const postCssPlugin = require('esbuild-plugin-postcss2').default

const buildParams = {
  color: true,
  entryPoints: ['src/index.tsx'],
  loader: { '.ts': 'tsx' },
  outdir: 'dist',
  minify: true,
  format: 'cjs',
  bundle: true,
  sourcemap: true,
  logLevel: 'error',
  incremental: true,
  plugins: [
    postCssPlugin({
      // lessOptions: {
      //   javascriptEnabled: true
      // }
    })
  ]
}

build(buildParams).finally(() => process.exit(0))
