const chalk = require('chalk')
const { watch } = require('chokidar')

const esbuild = require('esbuild')
const postCssPlugin = require('@baurine/esbuild-plugin-postcss3')
const autoprefixer = require('autoprefixer')
const { yamlPlugin } = require('esbuild-plugin-yaml')

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

const { dependencies } = require('./package.json')

const esbuildParams = {
  color: true,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  target: ['esnext'],
  format: 'esm',
  bundle: true,
  sourcemap: true,
  logLevel: 'error',
  incremental: true,
  platform: 'browser',
  external: Object.keys(dependencies),
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
  ]
}

async function main() {
  const builder = await esbuild.build(esbuildParams)

  function rebuild() {
    builder.rebuild().catch((err) => console.log(err))
  }

  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    watch('src/**/*', { ignoreInitial: true }).on('all', () => {
      rebuild()
    })
  } else {
    process.exit(0)
  }
}

main()
