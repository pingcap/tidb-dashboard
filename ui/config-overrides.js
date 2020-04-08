const path = require('path')
const process = require('process')
const {
  override,
  fixBabelImports,
  addLessLoader,
  addWebpackResolve,
  addWebpackPlugin,
  addDecoratorsLegacy,
  addBundleVisualizer,
  getBabelLoader,
} = require('customize-cra')
const addYaml = require('react-app-rewire-yaml')
const WebpackBar = require('webpackbar')

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

const disableMinimizeByEnv = () => (config) => {
  if (process.env.NO_MINIMIZE) {
    config.optimization.minimize = false
    config.optimization.splitChunks = false
    config.devtool = false
    getBabelLoader(config).options.compact = false
  }
  return config
}

const diagnoseReportEntry = require('react-app-rewire-multiple-entry')([
  {
    entry: 'src/externalEntries/diagnoseReport',
    template: 'public/diagnoseReport.html',
    outPath: '/diagnoseReport.html',
  },
])

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
    },
    localIdentName: '[local]--[hash:base64:5]',
  }),
  addWebpackResolve({
    alias: { '@': path.resolve(__dirname, 'src') },
  }),
  addDecoratorsLegacy(),
  enableEslintIgnore(),
  addYaml,
  addBundleVisualizer({
    openAnalyzer: false,
  }),
  addWebpackPlugin(new WebpackBar()),
  disableMinimizeByEnv(),
  diagnoseReportEntry.addMultiEntry
)
