const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const chalk = require('chalk')
const { start } = require('live-server')
const { createProxyMiddleware } = require('http-proxy-middleware')
const { watch } = require('chokidar')
const { build } = require('esbuild')
const postCssPlugin = require('@baurine/esbuild-plugin-postcss3')
const autoprefixer = require('autoprefixer')
const { yamlPlugin } = require('esbuild-plugin-yaml')
// const babelPlugin = require('@baurine/esbuild-plugin-babel')

const isDev = process.env.NODE_ENV !== 'production'
const isE2E = process.env.E2E_TEST === 'true'

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
  '@primary-color': '#4263eb',
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
    .readFileSync('../../../release-version', 'utf8')
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
  },
})

const esbuildParams = {
  color: true,
  entryPoints: {
    dashboardApp: 'src/index.ts',
    // diagnoseReport: 'diagnoseReportApp/index.tsx',
  },
  // loader: { '.ts': 'ts' },
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
      enableCache: true,
      plugins: [autoprefixer],
      // work same as the webpack NormalModuleReplacementPlugin
      moduleReplacements: {
        [path.resolve(__dirname, 'node_modules/antd/es/style/index.less')]:
          path.resolve(__dirname, 'lib/antd.less'),
      },
    }),
    yamlPlugin(),
    logTime(),
  ],
  define: genDefine(),
  inject: ['./process-shim.js'], // fix runtime crash
}
// if (isE2E) {
//   // use babel and istanbul to report test coverage for e2e test
//   esbuildParams.plugins.push(
//     babelPlugin({
//       filter: /\.tsx?/,
//       config: {
//         presets: ['@babel/preset-react', '@babel/preset-typescript'],
//         plugins: ['istanbul'],
//       },
//     })
//   )
// }

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
  const distroStringsResFilePath = './build/distro-res/strings.json'
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
  fs.copySync('./public', './build')
  if (isDev) {
    copyDistroRes()
  }

  buildHtml('./public/index.html', './build/index.html')
  buildHtml('./public/diagnoseReport.html', './build/diagnoseReport.html')
}

function copyDistroRes() {
  const distroResPath = '../bin/distro-res'
  if (fs.existsSync(distroResPath)) {
    fs.copySync(distroResPath, './build/distro-res')
  }
}

async function main() {
  fs.removeSync('./build')

  const builder = await build(esbuildParams)
  handleAssets()

  function rebuild() {
    builder.rebuild().catch((err) => console.log(err))
  }

  if (isDev) {
    start(devServerParams)

    const tsConfig = require('./tsconfig.json')
    tsConfig.include.forEach((folder) => {
      watch(`${folder}/**/*`, { ignoreInitial: true }).on('all', () => {
        rebuild()
      })
    })
    watch('public/**/*', { ignoreInitial: true }).on('all', () => {
      handleAssets()
    })
    watch('node_modules/@pingcap/tidb-dashboard-lib/dist/**/*', { ignoreInitial: true }).on(
      'all',
      () => {
        rebuild()
      }
    )
  } else {
    process.exit(0)
  }
}

main()
