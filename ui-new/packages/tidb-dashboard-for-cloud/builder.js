const path = require('path')
const fs = require('fs-extra')
const md5File = require('md5-file')
const chalk = require('chalk')
const { watch } = require('chokidar')

const { start } = require('live-server')

const { build } = require('esbuild')
const postCssPlugin = require('@baurine/esbuild-plugin-postcss3')
const autoprefixer = require('autoprefixer')
const { yamlPlugin } = require('esbuild-plugin-yaml')

const isDev = process.env.NODE_ENV !== 'production'

// load env
const envFile = isDev ? './.env.development' : './env.production'
require('dotenv').config({ path: path.resolve(process.cwd(), envFile) })

const outDir = 'dist'

const devServerParams = {
  port: process.env.PORT,
  root: outDir,
  open: true
}

const lessModifyVars = {
  '@primary-color': '#4263eb',
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
  entryPoints: ['src/index.tsx'],
  outdir: outDir,
  minify: !isDev,
  format: 'esm',
  bundle: true,
  sourcemap: true,
  logLevel: 'error',
  incremental: true,
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

  const jsContentHash = md5File.sync(`./${outDir}/index.js`)
  result = result.replace('%JS_CONTENT_HASH%', jsContentHash.slice(0, 7))

  const cssContentHash = md5File.sync(`./${outDir}/index.css`)
  result = result.replace('%CSS_CONTENT_HASH%', cssContentHash.slice(0, 7))

  fs.writeFileSync(outputFilename, result)
}

function handleAssets() {
  fs.copySync('./public', `./${outDir}`)

  buildHtml('./public/index.html', `./${outDir}/index.html`)
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
  } else {
    process.exit(0)
  }
}

main()
