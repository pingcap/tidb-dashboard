const path = require('path')
const fs = require('fs')
const os = require('os')
const {
  override,
  fixBabelImports,
  addLessLoader,
  addWebpackPlugin,
  addDecoratorsLegacy,
  addBundleVisualizer,
  getBabelLoader,
} = require('customize-cra')
const addYaml = require('react-app-rewire-yaml')
const { alias, configPaths } = require('react-app-rewire-alias')
const webpack = require('webpack')
const WebpackBar = require('webpackbar')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const rewireHtmlWebpackPlugin = require('react-app-rewire-html-webpack-plugin')
const YAML = require('yaml')

function injectDistroToHTML(config, env) {
  const distroYAML = fs.readFileSync('./lib/distribution.yaml', 'utf8')
  const distroInfo = Object.entries(YAML.parse(distroYAML)).reduce(
    (prev, [k, v]) => {
      return {
        ...prev,
        [`distro_${k}`]: v,
      }
    },
    {}
  )
  return rewireHtmlWebpackPlugin(config, env, distroInfo)
}

function isBuildAsDevServer() {
  return process.env.NODE_ENV !== 'production'
}

const enableEslintIgnore = () => (config) => {
  const eslintRule = config.module.rules.filter(
    (r) =>
      r.use && r.use.some((u) => u.options && u.options.useEslintrc !== void 0)
  )[0]
  const options = eslintRule.use[0].options
  options.ignore = true
  options.ignorePattern = 'lib/client/api/*.ts'
  options.baseConfig.rules = {
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

const addExtraEntries = () => (config) => {
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

// See https://github.com/ant-design/ant-design/issues/14895
const ignoreMiniCssExtractOrder = () => (config) => {
  for (let i = 0; i < config.plugins.length; i++) {
    const p = config.plugins[i]
    if (!!p.constructor && p.constructor.name === 'MiniCssExtractPlugin') {
      const miniCssExtractOptions = { ...p.options, ignoreOrder: true }
      config.plugins[i] = new MiniCssExtractPlugin(miniCssExtractOptions)
      break
    }
  }
  return config
}

const addWebpackBundleSize = () => (config) => {
  if (isBuildAsDevServer()) {
    return config
  }
  addBundleVisualizer({
    openAnalyzer: false,
  })(config)
  return config
}

const supportDynamicPublicPathPrefix = () => (config) => {
  if (!isBuildAsDevServer()) {
    // Rewrite to use relative path for `url()` in CSS.
    for (const rule of config.module.rules) {
      for (const subRule of rule.oneOf || []) {
        for (const use of subRule.use || []) {
          if (use.loader === MiniCssExtractPlugin.loader) {
            use.options.publicPath = '../../'
          }
        }
      }
    }
  }
  return config
}

const overrideProcessEnv = (value) => (config) => {
  const plugin = config.plugins.find(
    (plugin) => plugin.constructor.name === 'DefinePlugin'
  )
  const processEnv = plugin.definitions['process.env'] || {}

  plugin.definitions['process.env'] = {
    ...processEnv,
    ...value,
  }

  return config
}

const getInternalVersion = () => {
  // react-app-rewired does not support async override config method right now,
  // subscribe: https://github.com/timarney/react-app-rewired/pull/543
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

module.exports = override(
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: true,
  }),
  ignoreMiniCssExtractOrder(),
  addLessLoader({
    javascriptEnabled: true,
    modifyVars: {
      '@primary-color': '#3351ff',
      '@body-background': '#fff',
      '@tooltip-bg': 'rgba(0, 0, 0, 0.9)',
      '@tooltip-max-width': '500px',
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
    modules: {
      localIdentName: '[local]--[hash:base64:5]',
    },
  }),
  addAlias(),
  addDecoratorsLegacy(),
  enableEslintIgnore(),
  addYaml,
  addWebpackBundleSize(),
  addWebpackPlugin(new WebpackBar()),
  addWebpackPlugin(
    new webpack.NormalModuleReplacementPlugin(
      /antd\/es\/style\/index\.less/,
      path.resolve(__dirname, 'lib/antd.less')
    )
  ),
  disableMinimizeByEnv(),
  addExtraEntries(),
  supportDynamicPublicPathPrefix(),
  overrideProcessEnv({
    REACT_APP_RELEASE_VERSION: JSON.stringify(getInternalVersion()),
  }),
  injectDistroToHTML
)
