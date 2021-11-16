const { build } = require('esbuild')
const postCssPlugin = require('esbuild-plugin-postcss2').default

const lessModifyVars = {
  // '@primary-color': '#4394fc',
  '@primary-color': '#1DA57A',
  '@body-background': '#fff',
  '@tooltip-bg': 'rgba(0, 0, 0, 0.9)',
  '@tooltip-max-width': '500px'
}
const lessGlobalVars = {
  '@padding-page': '48px',
  '@gray-1': '#fff',
  '@gray-2': '#fafafa',
  '@gray-3': '#f5f5f5',
  '@gray-4': '#f0f0f0',
  '@gray-5': '#d9d9d9',
  '@gray-6': '#bfbfbf',
  '@gray-7': '#8c8c8c',
  '@gray-8': '#595959',
  '@gray-9': '#262626',
  '@gray-10': '#000'
}

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
      lessOptions: {
        modifyVars: lessModifyVars,
        globalVars: lessGlobalVars,
        javascriptEnabled: true
      }
    })
  ]
}

build(buildParams).finally(() => process.exit(0))
