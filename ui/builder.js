const fs = require('fs')
fs.copyFileSync(
  './postcss2-index.js',
  './node_modules/esbuild-plugin-postcss2/dist/index.js'
)

const { start } = require('live-server')
const { watch } = require('chokidar')
const { build } = require('esbuild')
const postCssPlugin = require('esbuild-plugin-postcss2')
const { yamlPlugin } = require('esbuild-plugin-yaml')

const argv = (key) => {
  // Return true if the key exists and a value is defined
  if (process.argv.includes(`--${key}`)) return true

  const value = process.argv.find((element) => element.startsWith(`--${key}=`))
  // Return null if the key does not exist and a value is not defined
  if (!value) return null
  return value.replace(`--${key}=`, '')
}
const isDev = argv('dev') === true

/**
 * Live Server Params
 * @link https://www.npmjs.com/package/live-server#usage-from-node
 */
const serverParams = {
  port: 8181, // Set the server port. Defaults to 8080.
  root: 'dist', // Set root directory that's being served. Defaults to cwd.
  open: false, // When false, it won't load your browser by default.
  // host: "0.0.0.0", // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
  // ignore: 'scss,my/templates', // comma-separated string for paths to ignore
  // file: "index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
  // wait: 1000 // Waits for all changes, before reloading. Defaults to 0 sec.
  // mount: [['/components', './node_modules']], // Mount a directory to a route.
  // logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
  // middleware: [function(req, res, next) { next(); }] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
}

const lessModifyVars = {
  // '@primary-color': '#4394fc',
  '@primary-color': '#1DA57A',
  '@body-background': '#fff',
  '@tooltip-bg': 'rgba(0, 0, 0, 0.9)',
  '@tooltip-max-width': '500px',
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
  '@gray-10': '#000',
}

/**
 * ESBuild Params
 * @link https://esbuild.github.io/api/#build-api
 */
const buildParams = {
  color: true,
  entryPoints: ['src/index.ts'],
  loader: { '.ts': 'tsx' },
  outdir: 'dist',
  minify: !isDev,
  format: 'esm',
  bundle: true,
  sourcemap: true,
  logLevel: 'error',
  incremental: true,
  splitting: true,
  loader: {
    '.svg': 'dataurl',
  },
  plugins: [
    postCssPlugin.default({
      lessOptions: {
        // modifyVars: { '@primary-color': '#1DA57A' },
        modifyVars: lessModifyVars,
        globalVars: lessGlobalVars,
        javascriptEnabled: true,
      },
    }),
    yamlPlugin(),
  ],
}

async function main() {
  // TODO - refine
  fs.rmSync('./dist', { force: true, recursive: true })
  fs.mkdirSync('./dist')
  // fs.copyFileSync('./public/index.html', './dist/index.html')
  // fs.copyFileSync('./public/favicon.ico', './dist/favicon.ico')
  // fs.copyFileSync('./public/manifest.json', './dist/manifest.json')
  // fs.copyFileSync('./public/logo192.png', './dist/logo192.png')
  // fs.copyFileSync('./public/logo512.png', './dist/logo512.png')

  if (isDev) {
    const builder = await build(buildParams)

    start(serverParams)

    watch('src/**/*', { ignoreInitial: true }).on('all', () => {
      builder.rebuild()
    })
  } else {
    build(buildParams).finally(() => process.exit(0))
  }
}

main()
