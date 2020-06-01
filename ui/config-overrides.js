const path = require('path')
const fs = require('fs')
const md5 = require('md5')
const glob = require('glob')
const _ = require('lodash')
const {
  override,
  fixBabelImports,
  addWebpackPlugin,
  addDecoratorsLegacy,
  addBundleVisualizer,
  addBabelPlugin,
  getBabelLoader,
} = require('customize-cra')
const postcssNormalize = require('postcss-normalize')
const addYaml = require('react-app-rewire-yaml')
const { alias, configPaths } = require('react-app-rewire-alias')
const webpack = require('webpack')
const WebpackBar = require('webpackbar')
const nodeExternals = require('webpack-node-externals')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const GeneratePackageJsonPlugin = require('generate-package-json-webpack-plugin')

function isBuildAsLibrary() {
  // Specify by --library
  return (
    process.env.npm_lifecycle_script &&
    process.env.npm_lifecycle_script.includes('library')
  )
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
  config.optimization.runtimeChunk = false
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

// In dev mode, default create-react-app excludes the MiniCssExtractorPlugin.
// This function is a tmp solution to add it back for developing dark theme
const addMiniCssExtractorPluginInDev = () => (config) => {
  if (process.env.NODE_ENV === 'development') {
    // Add CSS extract plugin for theme switching
    addWebpackPlugin(
      new MiniCssExtractPlugin({
        // This is the default naming rule in react-scripts
        filename: 'static/css/[name].[contenthash:8].css',
        ignoreOrder: true,
      })
    )(config)
  }
  return config
}

const addCustomLessLoader = (loaderOptions = {}, darkThemeLoaderOptions) => (
  config
) => {
  const lessRegex = /\.less$/
  const lightThemeModuleRegex = /\.module\.less$/
  const darkThemeModuleRegex = /\.module\.dark\.less$/

  const webpackEnv = process.env.NODE_ENV
  const isEnvProduction = webpackEnv === 'production'
  const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'
  const publicPath = config.output.publicPath
  const shouldUseRelativeAssetPaths = publicPath === './'
  // copy from react-scripts
  // https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/config/webpack.config.js#L93
  const getStyleLoaders = (
    cssOptions,
    preProcessor,
    preProcessorOptions = loaderOptions
  ) => {
    const loaders = [
      {
        loader: MiniCssExtractPlugin.loader,
        options: {
          ...(shouldUseRelativeAssetPaths ? { publicPath: '../../' } : {}),
          // only enable hot in development
          hmr: process.env.NODE_ENV === 'development',
          // if hmr does not work, this is a forceful method.
          reloadAll: true,
        },
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        loader: require.resolve('postcss-loader'),
        options: {
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            }),
            postcssNormalize(),
          ],
          sourceMap: isEnvProduction && shouldUseSourceMap,
        },
      },
    ].filter(Boolean)
    if (preProcessor) {
      loaders.push(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
        },
        {
          loader: require.resolve(preProcessor),
          // not the same as react-scripts
          options: Object.assign(
            {
              sourceMap: true,
            },
            preProcessorOptions
          ),
        }
      )
    }
    return loaders
  }

  const loaders = config.module.rules.find((rule) => Array.isArray(rule.oneOf))
    .oneOf

  const baseCssLoaderOptions = {
    importLoaders: 2,
    sourceMap: isEnvProduction && shouldUseSourceMap,
  }

  const customCssModules = {
    modules: {
      // Use path as class ident to ensure both generated light and dark class names are same
      getLocalIdent(context, localIdentName, localName) {
        const h = md5(path.dirname(context.resourcePath)).substr(0, 5)
        return `${localName}--${h}`
      },
    },
  }
  // loader for global styles .less
  const normalLessLoader = {
    test: lessRegex,
    exclude: /\.(module|module\.dark)\.less$/,
    use: getStyleLoaders(baseCssLoaderOptions, 'less-loader'),
  }

  // loader for light theme styles in apps and modules .module.less
  const lightLessLoader = {
    test: lightThemeModuleRegex,
    use: getStyleLoaders(
      {
        ...baseCssLoaderOptions,
        ...customCssModules,
      },
      'less-loader'
    ),
  }

  const newLoaders = darkThemeLoaderOptions
    ? [
        normalLessLoader,
        lightLessLoader,
        // loader for dark theme styles in apps and modules .module.dark.less
        {
          ...lightLessLoader,
          use: getStyleLoaders(
            {
              ...baseCssLoaderOptions,
              ...customCssModules,
            },
            'less-loader',
            {
              ...darkThemeLoaderOptions,
              ...customCssModules,
            }
          ),
          test: darkThemeModuleRegex,
        },
      ]
    : [normalLessLoader, lightLessLoader]

  // Insert less-loader as the penultimate item of loaders (before file-loader)
  loaders.splice(loaders.length - 1, 0, ...newLoaders)
  return config
}

const addAlias = () => (config) => {
  alias({
    ...configPaths('tsconfig.paths.json'),
  })(config)
  return config
}

const addDiagnoseReportEntry = () => (config) => {
  if (isBuildAsLibrary()) {
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
  if (!isBuildAsLibrary()) {
    return config
  }
  if (isBuildAsDevServer()) {
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
      ignoreOrder: true,
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

// Generate extra dark mode stylesheet info in asset-manifest.json
const generateDarkModeManifest = () => (config) => {
  for (let i = 0; i < config.plugins.length; i++) {
    const p = config.plugins[i]
    if (!!p.constructor && p.constructor.name === 'ManifestPlugin') {
      config.plugins[i].opts = {
        ...p.opts,
        generate: (seed, files, entrypoints) => {
          const manifestFiles = files.reduce((manifest, file) => {
            manifest[file.name] = file.path
            return manifest
          }, seed)
          const entrypointFiles = entrypoints.main.filter(
            (fileName) => !fileName.endsWith('.map')
          )
          const darkstyles = Object.entries(manifestFiles).reduce(
            (res, entry) => {
              const r = /dark\.css$/
              if (r.test(entry[0])) {
                // Use app name as snake case to make this consistent with the app id
                const key = _.snakeCase(entry[0].replace(/-dark\.css$/, ''))
                res[key] = entry[1]
              }
              return res
            },
            {}
          )

          return {
            files: manifestFiles,
            entrypoints: entrypointFiles,
            dark: darkstyles,
          }
        },
      }
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

const addDarkModeEntries = () => (config) => {
  config.entry['antd-dark'] = [path.join(__dirname, 'lib/antd.dark.less')]
  config.entry['main-dark'] = ['dashboardApp', 'lib/components'].flatMap((p) =>
    glob.sync(path.join(__dirname, p, '**/*.module.dark.less'))
  )
  glob
    .sync(path.join(__dirname, 'lib/apps/*'))
    .map((p) => ({
      name: path.basename(p) + '-dark',
      path: p,
    }))
    .forEach((p) => {
      const entries = glob.sync(path.join(p.path, '**/*.module.dark.less'))
      if (entries.length > 0) {
        config.entry[p.name] = entries
      }
    })
  return config
}

const supportDynamicPublicPathPrefix = () => (config) => {
  if (!isBuildAsLibrary() && !isBuildAsDevServer()) {
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

addDarkThemeSupport = (funcs) => (config) => {
  return funcs.reduce((c, f) => f(c), config)
}

module.exports = {
  webpack: override(
    fixBabelImports('import', {
      libraryName: 'antd',
      libraryDirectory: 'es',
      style: true,
    }),
    ignoreMiniCssExtractOrder(),
    addCustomLessLoader(
      {
        javascriptEnabled: true,
        modifyVars: {
          '@primary-color': '#3351ff',
          '@body-background': '#f0f2f5',
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
      },
      {
        javascriptEnabled: true,
        modifyVars: {
          '@primary-color': '#3351ff',
        },
        globalVars: {
          '@padding-page': '48px',
          '@gray-10': '#fff',
          '@gray-9': '#fafafa',
          '@gray-8': '#f5f5f5',
          '@gray-7': '#f0f0f0',
          '@gray-6': '#d9d9d9',
          '@gray-5': '#bfbfbf',
          '@gray-4': '#8c8c8c',
          '@gray-3': '#595959',
          '@gray-2': '#262626',
          '@gray-1': '#000',
        },
      }
    ),
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
    addDiagnoseReportEntry(),
    buildAsLibrary(),
    supportDynamicPublicPathPrefix(),
    // Add all dark theme configs
    addDarkThemeSupport([
      addDarkModeEntries(),
      addMiniCssExtractorPluginInDev(),
      generateDarkModeManifest(),
    ])
  ),
}
