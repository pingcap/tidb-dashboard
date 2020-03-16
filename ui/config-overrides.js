const path = require('path')
const {
  override,
  fixBabelImports,
  addLessLoader,
  addWebpackResolve,
  addWebpackPlugin,
  addDecoratorsLegacy,
  addBabelPlugin,
  addBundleVisualizer,
  getBabelLoader,
} = require('customize-cra')
const AntdDayjsWebpackPlugin = require('antd-dayjs-webpack-plugin')
const addYaml = require('react-app-rewire-yaml')
const WebpackBar = require('webpackbar')
const nodeExternals = require('webpack-node-externals')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const AddAssetPlugin = require('add-asset-webpack-plugin')

const enableEslintIgnore = () => config => {
  const eslintRule = config.module.rules.filter(
    r => r.use && r.use.some(u => u.options && u.options.useEslintrc !== void 0)
  )[0]
  eslintRule.use[0].options.ignore = true
  return config
}

const buildAsLibrary = () => config => {
  // Build as a library instead of an App.
  if (!process.env.npm_lifecycle_script.includes('library')) {
    return config
  }
  if (process.env.NODE_ENV !== 'production') {
    return config
  }

  config.entry = {
    main: path.resolve(__dirname, 'src/library.js'),
  }
  config.output.library = 'tidbDashboard'
  config.output.libraryTarget = 'commonjs'
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
  // Remove async imports to avoid generating chunks as well
  addBabelPlugin('dynamic-import-node')(config)

  // Extract styles to the desired place
  removeWebpackPlugin(['MiniCssExtractPlugin'])(config)
  addWebpackPlugin(
    new MiniCssExtractPlugin({
      filename: 'lib/style.css',
    })
  )(config)

  // No need to minize when building a library
  config.optimization.minimize = false
  getBabelLoader(config).options.compact = false

  // Write a package.json for the generated library
  const packageMeta = {
    name: 'tidb-dashboard',
    // FIXME: The version should be read from `.github_release_version`
    version: '0.0.1+build0101',
    main: 'main.js',
    dependencies: require('./package.json').dependencies,
  }
  addWebpackPlugin(
    new AddAssetPlugin(`lib/package.json`, JSON.stringify(packageMeta, null, 2))
  )(config)

  return config
}

const removeWebpackPlugin = unwantedCtorNames => config => {
  config.plugins = config.plugins.filter(plugin => {
    return !unwantedCtorNames.includes(plugin.constructor.name)
  })
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
    localIdentName: '[local]--[hash:base64:5]',
  }),
  addWebpackPlugin(new AntdDayjsWebpackPlugin()),
  addWebpackPlugin(new WebpackBar()),
  addWebpackResolve({
    alias: { '@': path.resolve(__dirname, 'src') },
  }),
  addDecoratorsLegacy(),
  enableEslintIgnore(),
  addYaml,
  addBundleVisualizer({
    openAnalyzer: false,
  }),
  buildAsLibrary()
)
