const { override } = require('customize-cra')
const addYaml = require('react-app-rewire-yaml')
const reactAppRewireBuildDev = require('react-app-rewire-build-dev')

const options = {
  outputPath: './build',
  basename: '/dashboard/api/diagnose/assets/',
}

function watchDev(config, env) {
  return reactAppRewireBuildDev(config, env, options)
}

module.exports = override(addYaml, watchDev)
