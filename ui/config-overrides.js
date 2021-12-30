const path = require('path')
const fs = require('fs-extra')
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

function copyDistroRes() {
  const distroResPath = '../bin/distro-res'
  if (fs.existsSync(distroResPath)) {
    fs.copySync(distroResPath, './public/distro-res')
  }
}

function injectDistroToHTML(config, env) {
  let distroStringsResMeta = '__DISTRO_STRINGS_RES__'

  // For dev mode,
  // we copy distro assets from bin/distro-res to public/distro-res to override the default assets,
  // read distro strings res from public/distro-res/strings.json and encode it by base64 if it exists.
  // For production mode, we keep the "__DISTRO_STRINGS_RES__" value, it will be replaced by the backend RewriteAssets() method in the run time.
  if (isBuildAsDevServer()) {
    copyDistroRes()

    const distroStringsResFilePath = './public/distro-res/strings.json'
    if (fs.existsSync(distroStringsResFilePath)) {
      const distroStringsRes = require(distroStringsResFilePath)
      distroStringsResMeta = btoa(JSON.stringify(distroStringsRes))
    }
  }

  // Store the distro strings res in the html head meta,
  // HtmlWebpacPlugin will write this meta into the html head.
  const distroInfo = {
    meta: {
      'x-distro-strings-res': distroStringsResMeta,
    },
  }
  return rewireHtmlWebpackPlugin(config, env, distroInfo)
}

function isBuildAsDevServer() {
  return process.env.NODE_ENV !== 'production'
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
  supportDynamicPublicPathPrefix(),
  overrideProcessEnv({
    REACT_APP_RELEASE_VERSION: JSON.stringify(getInternalVersion()),
  }),
  injectDistroToHTML,
  addExtraEntries()
)
