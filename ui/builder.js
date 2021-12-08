const fs = require('fs-extra')
const os = require('os')
const { start } = require('live-server')
const { createProxyMiddleware } = require('http-proxy-middleware')
const { watch } = require('chokidar')
const { build } = require('esbuild')
// TODO: submit PR for upstream
fs.copyFileSync(
  './postcss2-index.js',
  './node_modules/esbuild-plugin-postcss2/dist/index.js'
)
const postCssPlugin = require('esbuild-plugin-postcss2')
const { yamlPlugin } = require('esbuild-plugin-yaml')
const svgrPlugin = require('esbuild-plugin-svgr')
const logTime = require('./esbuild/plugins/logtime')

const isDev = process.env.NODE_ENV !== 'production'

// handle .env
if (isDev) {
  fs.copyFileSync('./.env.development', './.env')
} else {
  fs.copyFileSync('./.env.production', './.env')
}
// load .env file
require('dotenv').config()

const dashboardApiPrefix =
  process.env.REACT_APP_DASHBOARD_API_URL || 'http://127.0.0.1:12333'
const devServerPort = process.env.PORT
const devServerParams = {
  port: devServerPort,
  root: 'build',
  open: '/dashboard',
  // Set base URL
  // https://github.com/tapio/live-server/issues/287 - How can I serve from a base URL?
  proxy: [['/dashboard', `http://127.0.0.1:${devServerPort}`]],
  middleware: isDev && [
    function (req, _res, next) {
      if (/\/dashboard\/api\/diagnose\/reports\/\S+\/detail/.test(req.url)) {
        req.url = '/diagnoseReport.html'
      }
      next()
    },
    createProxyMiddleware('/dashboard/api/diagnose/reports/*/data.js', {
      target: dashboardApiPrefix,
      changeOrigin: true,
    }),
  ],
}

const lessModifyVars = {
  '@primary-color': '#3351ff',
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

function getInternalVersion() {
  const version = fs
    .readFileSync('../release-version', 'utf8')
    .split(os.EOL)
    .map((l) => l.trim())
    .filter((l) => !l.startsWith('#') && l !== '')[0]
  if (version === '') {
    throw new Error(
      `invalid release version, please check the release-version @tidb-dashboard/root`
    )
  }
  return version
}

function genDefine() {
  const define = {}
  for (const k in process.env) {
    if (k.startsWith('REACT_APP_')) {
      let envVal = process.env[k]
      // Example: REACT_APP_VERSION=$npm_package_version
      // Expect output: REACT_APP_VERSION=0.1.0
      if (envVal.startsWith('$')) {
        envVal = process.env[envVal.substring(1)]
      }
      define[`process.env.${k}`] = JSON.stringify(envVal)
    }
  }
  define['process.env.REACT_APP_RELEASE_VERSION'] = JSON.stringify(
    getInternalVersion()
  )
  define['process.env.REACT_APP_DISTRO_BUILD_TAG'] =
    process.env.DISTRO_BUILD_TAG
  return define
}

const esbuildParams = {
  color: true,
  entryPoints: {
    dashboardApp: 'src/index.ts',
    diagnoseReport: 'diagnoseReportApp/index.tsx',
  },
  loader: { '.ts': 'tsx', '.svgd': 'dataurl' },
  outdir: 'build',
  minify: !isDev,
  format: 'esm',
  bundle: true,
  sourcemap: true,
  logLevel: 'error',
  incremental: true,
  splitting: true,
  platform: 'browser',
  plugins: [
    postCssPlugin.default({
      lessOptions: {
        modifyVars: lessModifyVars,
        globalVars: lessGlobalVars,
        javascriptEnabled: true,
      },
    }),
    yamlPlugin(),
    svgrPlugin(),
    logTime(),
  ],
  define: genDefine(),
  inject: ['./process-shim.js'], // fix runtime crash
}

const distroInfo = require('./lib/distribution.json')
function buildHtml(inputFilename, outputFilename) {
  let result = fs.readFileSync(inputFilename).toString()

  const placeholders = ['PUBLIC_URL']
  placeholders.forEach((key) => {
    result = result.replace(new RegExp(`%${key}%`, 'g'), process.env[key])
  })

  // handle distro
  Object.keys(distroInfo).forEach((key) => {
    result = result.replace(
      new RegExp(`<%= htmlWebpackPlugin.options.distro_${key} %>`, 'g'),
      distroInfo[key]
    )
  })

  fs.writeFileSync(outputFilename, result)
}

function handleAssets() {
  fs.copySync('./public', './build')
  buildHtml('./public/index.html', './build/index.html')
  buildHtml('./public/diagnoseReport.html', './build/diagnoseReport.html')
}

async function main() {
  fs.removeSync('./build')

  const builder = await build(esbuildParams)
  handleAssets()

  if (isDev) {
    start(devServerParams)

    const tsConfig = require('./tsconfig.json')
    tsConfig.include.forEach((folder) => {
      watch(`${folder}/**/*`, { ignoreInitial: true }).on('all', () => {
        builder.rebuild()
      })
    })
    watch('public/**/*', { ignoreInitial: true }).on('all', () => {
      handleAssets()
    })
  } else {
    process.exit(0)
  }
}

main()
