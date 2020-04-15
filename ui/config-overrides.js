const path = require('path')
const fs = require('fs')
const {
  override,
  fixBabelImports,
  addLessLoader,
  addWebpackPlugin,
  addDecoratorsLegacy,
  addBundleVisualizer,
  addBabelPlugin,
  getBabelLoader,
} = require('customize-cra')
const addYaml = require('react-app-rewire-yaml')
const { alias, configPaths } = require('react-app-rewire-alias')
const WebpackBar = require('webpackbar')
const nodeExternals = require('webpack-node-externals')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const GeneratePackageJsonPlugin = require('generate-package-json-webpack-plugin')

const enableEslintIgnore = () => (config) => {
  const eslintRule = config.module.rules.filter(
    (r) =>
      r.use && r.use.some((u) => u.options && u.options.useEslintrc !== void 0)
  )[0]
  eslintRule.use[0].options.baseConfig.rules = {
    'jsx-a11y/anchor-is-valid': 'off',
  }
  return config
}

const disableMinimize = () => (config) => {
  config.optimization.minimize = false
  config.optimization.splitChunks = false
  config.devtool = false
  getBabelLoader(config).options.compact = false
  return config
}

const disableMinimizeByEnv = () => (config) => {
  if (process.env.NO_MINIMIZE) {
    disableMinimize()(config)
  }
  return config
}

const addAlias = () => (config) => {
  alias({
    ...configPaths('tsconfig.paths.json'),
  })(config)
  return config
}

const addDiagnoseReportEntry = () => (config) => {
  if (process.env.npm_lifecycle_script.includes('library')) {
    return config
  }
  const e = require('react-app-rewire-multiple-entry')([
    {
      entry: 'diagnoseReportApp',
      template: 'public/diagnoseReport.html',
      outPath: '/diagnoseReport.html',
    },
  ])
  e.addMultiEntry(config)
  return config
}

const buildAsLibrary = () => (config) => {
  // Build as a library instead of an App.
  if (!process.env.npm_lifecycle_script.includes('library')) {
    return config
  }
  if (process.env.NODE_ENV !== 'production') {
    // Not available when using dev server
    return config
  }

  const packageVersion = fs
    .readFileSync(path.resolve(__dirname, './.package_release_version'), 'utf8')
    .split('\n')
    .filter((line) => line.indexOf('#') !== 0)[0]

  config.entry = {
    main: path.resolve(__dirname, 'lib/packEntry.js'),
  }
  config.output.library = 'tidbDashboard'
  config.output.libraryTarget = 'commonjs2'
  config.output.filename = 'lib/main.js'

  // Everything in node_modules will not be included in the build, except for
  // ant design styles.
  config.target = 'node'
  config.externals = [
    nodeExternals({
      whitelist: [/^antd\/es\/[^\/]+\/style/],
    }),
  ]

  // Remove all kind of chunks
  config.optimization.runtimeChunk = false
  config.optimization.splitChunks = false

  // No need to minize when building a library
  disableMinimize()(config)

  // Remove async imports to avoid generating chunks as well
  addBabelPlugin('dynamic-import-node')(config)

  // Extract styles to the desired place
  removeWebpackPlugin(['MiniCssExtractPlugin'])(config)
  addWebpackPlugin(
    new MiniCssExtractPlugin({
      filename: 'lib/style.css',
    })
  )(config)

  // Write a package.json for the generated library
  const packageMeta = {
    name: '@pingcap-incubator/tidb-dashboard',
    version: packageVersion,
    main: 'main.js',
  }
  addWebpackPlugin(
    new GeneratePackageJsonPlugin(
      packageMeta,
      path.resolve(__dirname, 'package.json')
    )
  )(config)

  return config
}

const removeWebpackPlugin = (unwantedCtorNames) => (config) => {
  config.plugins = config.plugins.filter((plugin) => {
    return !unwantedCtorNames.includes(plugin.constructor.name)
  })
  return config
}

const addWebpackBundleSize = () => (config) => {
  if (process.env.NODE_ENV !== 'production') {
    // Analyze bundle size only when we are not in dev mode.
    return config
  }
  addBundleVisualizer({
    openAnalyzer: false,
  })(config)
  return config
}

module.exports = override(
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: true,
  }),
  addLessLoader({
    javascriptEnabled: true,
    modifyVars: {
      '@primary-color': '#3351ff',
      '@body-background': '#f0f2f5',
    },
    globalVars: {
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
    },
    localIdentName: '[local]--[hash:base64:5]',
  }),
  addAlias(),
  addDecoratorsLegacy(),
  enableEslintIgnore(),
  addYaml,
  addWebpackBundleSize(),
  addWebpackPlugin(new WebpackBar()),
  disableMinimizeByEnv(),
  addDiagnoseReportEntry(),
  buildAsLibrary()
)
