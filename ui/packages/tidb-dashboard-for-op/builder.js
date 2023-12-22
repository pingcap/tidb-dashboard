const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const { watch } = require('chokidar')

const { start } = require('live-server')
const { createProxyMiddleware } = require('http-proxy-middleware')

const { build } = require('esbuild')
const postCssPlugin = require('@baurine/esbuild-plugin-postcss3')
const autoprefixer = require('autoprefixer')
const { yamlPlugin } = require('esbuild-plugin-yaml')
const babelPlugin = require('@baurine/esbuild-plugin-babel')

const { lessModifyVars, lessGlobalVars } = require('../../less-vars')

const isDev = process.env.NODE_ENV !== 'production'
const isE2E = process.env.E2E_TEST === 'true'

// load env
const envFile = isDev ? './.env.development' : './.env.production'
require('dotenv').config({ path: path.resolve(process.cwd(), envFile) })

const outDir = 'dist'

const dashboardApiPrefix =
  process.env.REACT_APP_DASHBOARD_API_URL || 'http://127.0.0.1:12333'
const devServerPort = process.env.PORT
const devServerParams = {
  port: devServerPort,
  root: outDir,
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
      changeOrigin: true
    })
  ]
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
  define['process.env.E2E_TEST'] = JSON.stringify(process.env.E2E_TEST)
  return define
}

// customized plugin: log time
const logTime = (_options = {}) => ({
  name: 'logTime',
  setup(build) {
    let time

    build.onStart(() => {
      time = new Date()
      console.log(`Build started`)
    })

    build.onEnd(() => {
      console.log(`Build ended: ${chalk.yellow(`${new Date() - time}ms`)}`)
    })
  }
})

const esbuildParams = {
  color: true,
  entryPoints: {
    dashboardApp: 'src/dashboardApp/index.ts',
    diagnoseReport: 'src/diagnoseReportApp/index.tsx'
  },
  outdir: outDir,
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
        javascriptEnabled: true
      },
      enableCache: true,
      plugins: [autoprefixer]
    }),
    yamlPlugin(),
    logTime()
  ],
  define: genDefine(),
  inject: ['./process-shim.js'] // fix runtime crash
}
if (isE2E) {
  // use babel and istanbul to report test coverage for e2e test
  esbuildParams.plugins.push(
    babelPlugin({
      filter: /\.tsx?/,
      config: {
        presets: ['@babel/preset-react', '@babel/preset-typescript'],
        plugins: ['istanbul']
      }
    })
  )
}

function buildHtml(inputFilename, outputFilename) {
  let result = fs.readFileSync(inputFilename).toString()

  const placeholders = ['PUBLIC_URL']
  placeholders.forEach((key) => {
    result = result.replace(new RegExp(`%${key}%`, 'g'), process.env[key])
  })
  // replace TIME_PLACE_HOLDER
  const nowTime = new Date().valueOf()
  result = result.replace(new RegExp(`%TIME_PLACE_HOLDER%`, 'g'), nowTime)
  if (isDev) {
    result = result.replace(
      new RegExp('__DISTRO_ASSETS_RES_TIMESTAMP__', 'g'),
      nowTime
    )
  }

  // handle distro strings res, only for dev mode
  const distroStringsResFilePath = `./${outDir}/distro-res/strings.json`
  if (isDev && fs.existsSync(distroStringsResFilePath)) {
    const distroStringsRes = require(distroStringsResFilePath)
    result = result.replace(
      '__DISTRO_STRINGS_RES__',
      btoa(JSON.stringify(distroStringsRes))
    )
  }

  fs.writeFileSync(outputFilename, result)
}

function handleAssets() {
  fs.copySync('./public', `./${outDir}`)
  if (isDev) {
    copyDistroRes()
  }

  buildHtml('./public/index.html', `./${outDir}/index.html`)
  buildHtml('./public/diagnoseReport.html', `./${outDir}/diagnoseReport.html`)
}

function copyDistroRes() {
  const distroResPath = '../../../bin/distro-res'
  if (fs.existsSync(distroResPath)) {
    fs.copySync(distroResPath, `./${outDir}/distro-res`)
  }
}

async function main() {
  fs.removeSync(`./${outDir}`)

  const builder = await build(esbuildParams)
  handleAssets()

  function rebuild() {
    builder.rebuild().catch((err) => console.log(err))
  }

  if (isDev) {
    start(devServerParams)

    watch(`src/**/*`, { ignoreInitial: true }).on('all', () => {
      rebuild()
    })
    watch('public/**/*', { ignoreInitial: true }).on('all', () => {
      handleAssets()
    })
    // watch "node_modules/@pingcap/tidb-dashboard-lib/dist/**/*" triggers too many rebuild
    // so we just watch index.js to refine the experience
    watch('node_modules/@pingcap/tidb-dashboard-lib/dist/index.js', {
      ignoreInitial: true
    }).on('all', () => {
      rebuild()
    })
  } else {
    process.exit(0)
  }
}

main()
