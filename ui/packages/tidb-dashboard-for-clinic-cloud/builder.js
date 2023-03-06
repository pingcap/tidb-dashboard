const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const { watch } = require('chokidar')

const { build } = require('esbuild')
const postCssPlugin = require('@baurine/esbuild-plugin-postcss3')
const autoprefixer = require('autoprefixer')
const { yamlPlugin } = require('esbuild-plugin-yaml')

const { lessModifyVars, lessGlobalVars } = require('../../less-vars')

const isDev = process.env.NODE_ENV !== 'production'

// load env
const dotenv = require('dotenv')
const envFile = isDev ? './.env.development' : './.env.production'
dotenv.config({ path: path.resolve(process.cwd(), envFile) })
if (isDev && fs.pathExistsSync(path.resolve(process.cwd(), '.env.local'))) {
  dotenv.config({
    path: '.env.local',
    override: true
  })
}

const outDir = 'dist'
const targetVariantDashboardPath = process.env.TARGET_VARIANT_DASHBOARD_PATH

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
  // splitting: true,
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

function buildHtml(inputFilename, outputFilename) {
  let result = fs.readFileSync(inputFilename).toString()

  // replace TIME_PLACE_HOLDER
  const nowTime = new Date().valueOf()
  result = result.replace(new RegExp(`%TIME_PLACE_HOLDER%`, 'g'), nowTime)

  fs.writeFileSync(outputFilename, result)
}

function handleAssets() {
  fs.copySync('./public', `./${outDir}`)
  buildHtml('./public/index.html', `./${outDir}/index.html`)
}

function copyAssets() {
  if (!fs.existsSync(targetVariantDashboardPath)) {
    console.log(
      `target variant dashboard path ${targetVariantDashboardPath} doesn't exist, ignore`
    )
    return
  }
  fs.removeSync(targetVariantDashboardPath)
  fs.copySync(`./${outDir}`, targetVariantDashboardPath)
  console.log('copy dashboard to target variant')
}

async function main() {
  fs.removeSync(`./${outDir}`)

  const builder = await build(esbuildParams)
  handleAssets()

  function rebuild() {
    builder
      .rebuild()
      .then(() => {
        copyAssets()
      })
      .catch((err) => console.log(err))
  }

  if (isDev) {
    copyAssets()

    watch(`src/**/*`, { ignoreInitial: true }).on('all', () => {
      rebuild()
    })
    watch('public/**/*', { ignoreInitial: true }).on('all', () => {
      handleAssets()
      copyAssets()
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
