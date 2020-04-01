// https://gist.github.com/int128/e0cdec598c5b3db728ff35758abdbafd

process.env.NODE_ENV = 'development'

const fs = require('fs-extra')
const paths = require('react-scripts/config/paths')
const webpack = require('webpack')
// const config = require('react-scripts/config/webpack.config.dev.js')
const webpackconfig = require('react-scripts/config/webpack.config.js')
const config = webpackconfig('development')

// removes react-dev-utils/webpackHotDevClient.js at first in the array
config.entry.shift()

const overrides = require('../config-overrides') // correct this line to your config-overrides path
overrides(config, process.env.NODE_ENV)

config.output.publicPath = '/dashboard/api/diagnose/assets/'
config.output.path = paths.appBuild

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
