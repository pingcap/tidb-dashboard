const { override } = require('customize-cra')
const addYaml = require('react-app-rewire-yaml')

const watchDev = () => (config) => {
  // config.mode = 'development'
  // config.devtool = 'eval-cheap-module-source-map'
  // delete config.optimization
  // config.watch = true
  // config.watchOptions = {
  //   ignored: /node_modules/,
  // }
  return config
}

module.exports = override(watchDev(), addYaml)
