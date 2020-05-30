const path = require('path')
const fs = require('fs')
const md5 = require('md5')
const glob = require('glob')
const _ = require('lodash')
const {
  override,
  overrideDevServer,
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
const ManifestPlugin = require('webpack-manifest-plugin')
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

const addMiniCssExtractorPlugin = () => (config) => {
  if (process.env.NODE_ENV === 'development') {
    // Add CSS extract plugin for theme switching
    addWebpackPlugin(
      new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        ignoreOrder: true,
      })
    )(config)
  }
  return config
}

const addCustomLessLoader = (loaderOptions = {}, darkThemeGlobalVars = {}) => (
  config
) => {
  const cssLoaderOptions = loaderOptions.cssLoaderOptions || {}

  const lessRegex = /\.less$/
  const lessModuleRegex = /\.module\.less$/
  const darkThemeRegex = /\.dark\.less$/

  const webpackEnv = process.env.NODE_ENV
  // const isEnvDevelopment = webpackEnv === 'development'
  const isEnvProduction = webpackEnv === 'production'
  const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'
  const publicPath = config.output.publicPath
  const shouldUseRelativeAssetPaths = publicPath === './'
  const customeCssModules = {
    modules: {
      getLocalIdent(context, localIdentName, localName, options) {
        const h = md5(path.dirname(context.resourcePath)).substr(0, 5)
        return `${localName}--${h}`
      },
    },
  }
  // copy from react-scripts
  // https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/config/webpack.config.js#L93
  const getStyleLoaders = (
    cssOptions,
    preProcessor,
    preProcessorOptions = loaderOptions
  ) => {
    const loaders = [
      // isEnvDevelopment && require.resolve('style-loader'),
      // isEnvProduction &&
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

  // Insert less-loader as the penultimate item of loaders (before file-loader)
  loaders.splice(
    loaders.length - 1,
    0,
    {
      test: lessRegex,
      exclude: /\.(module|dark)\.less$/,
      use: getStyleLoaders(
        Object.assign({
          importLoaders: 2,
          sourceMap: isEnvProduction && shouldUseSourceMap,
        }),
        'less-loader'
      ),
    },
    {
      test: lessModuleRegex,
      use: getStyleLoaders(
        Object.assign(
          {
            importLoaders: 2,
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
          cssLoaderOptions,
          customeCssModules
        ),
        'less-loader'
      ),
    },
    {
      test: darkThemeRegex,
      use: getStyleLoaders(
        Object.assign(
          {
            importLoaders: 2,
            sourceMap: isEnvProduction && shouldUseSourceMap,
          },
          cssLoaderOptions,
          customeCssModules
        ),
        'less-loader',
        {
          javascriptEnabled: true,
          ...customeCssModules,
          globalVars: darkThemeGlobalVars,
        }
      ),
    }
  )
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
      config.plugins[i] = new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        ignoreOrder: true,
      })
      break
    }
  }
  return config
}

const overrideManifestPlugin = () => (config) => {
  const getPublicUrlOrPath = require('react-dev-utils/getPublicUrlOrPath')
  // Make sure any symlinks in the project folder are resolved:
  // https://github.com/facebook/create-react-app/issues/637
  const appDirectory = fs.realpathSync(process.cwd())
  const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath)

  // We use `PUBLIC_URL` environment variable or "homepage" field to infer
  // "public path" at which the app is served.
  // webpack needs to know it to put the right <script> hrefs into HTML even in
  // single-page apps that may serve index.html for nested URLs like /todos/42.
  // We can't use a relative path in HTML because we don't want to load something
  // like /todos/42/static/js/bundle.7289d.js. We have to know the root.
  const publicUrlOrPath = getPublicUrlOrPath(
    process.env.NODE_ENV === 'development',
    require(resolveApp('package.json')).homepage,
    process.env.PUBLIC_URL
  )
  for (let i = 0; i < config.plugins.length; i++) {
    const p = config.plugins[i]
    if (!!p.constructor && p.constructor.name === 'ManifestPlugin') {
      config.plugins[i] = new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: publicUrlOrPath,
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
      })
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

const addDarkmodeEntries = () => (config) => {
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

const devServerOutput = () => (config) => {
  return config
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
    addDarkmodeEntries(),
    addMiniCssExtractorPlugin(),
    overrideManifestPlugin()
  ),
  devServer: overrideDevServer(devServerOutput()),
}
