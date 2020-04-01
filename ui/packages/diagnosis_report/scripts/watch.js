// https://gist.github.com/int128/e0cdec598c5b3db728ff35758abdbafd
process.env.NODE_ENV = 'development'

const fs = require('fs-extra')
const paths = require('react-scripts/config/paths')
const webpack = require('webpack')
const webpackconfig = require('react-scripts/config/webpack.config.js')
const config = webpackconfig('development')

const overrides = require('../config-overrides') // correct this line to your config-overrides path
overrides(config, process.env.NODE_ENV)

// removes react-dev-utils/webpackHotDevClient.js at first in the array
// config.entry.shift()
config.entry = config.entry.filter(
  (fileName) => !fileName.match(/webpackHotDevClient/)
)
config.plugins = config.plugins.filter(
  (plugin) => !(plugin instanceof webpack.HotModuleReplacementPlugin)
)

// config.output.publicPath = process.env.PUBLIC_URL
config.output.publicPath = '/dashboard/api/diagnose/assets/'
config.output.path = paths.appBuild // else it will put the outputs in the dist folder

webpack(config).watch({}, (err, stats) => {
  if (err) {
    console.error(err)
  } else {
    copyPublicFolder()
  }
  console.error(
    stats.toString({
      chunks: false,
      colors: true,
    })
  )
})

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml,
  })
}
