const path = require('path')

function includeMorePaths(config) {
  // fine rule to handle *.tsx files
  for (const rule of config.module.rules) {
    for (const subRule of rule.oneOf || []) {
      // /\.(js|mjs|jsx|ts|tsx)$/
      if (subRule.test instanceof RegExp && subRule.test.test('.tsx')) {
        libFolder = path.resolve(__dirname, '../lib')
        subRule.include.push(libFolder)
        break
      }
    }
  }

  return config
}

function addMoreAlias(config) {
  config.resolve.alias['@lib'] = path.resolve(__dirname, '../lib')
  return config
}

module.exports = {
  stories: ['../lib/components/**/*.stories.@(ts|tsx|js|jsx)'],
  addons: [
    '@storybook/preset-create-react-app',
    '@storybook/addon-actions',
    '@storybook/addon-links',
  ],
  webpackFinal: (config) => addMoreAlias(includeMorePaths(config)),
}
