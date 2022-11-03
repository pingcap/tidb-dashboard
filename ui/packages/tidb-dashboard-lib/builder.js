const chalk = require('chalk')
const { watch } = require('chokidar')

const esbuild = require('esbuild')
const postCssPlugin = require('@baurine/esbuild-plugin-postcss3')
const autoprefixer = require('autoprefixer')
const { yamlPlugin } = require('esbuild-plugin-yaml')

const { lessModifyVars, lessGlobalVars } = require('../../less-vars')

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
