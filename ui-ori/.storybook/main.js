const path = require('path')

function includeMorePaths(config) {
  // find rule to handle *.tsx files
  for (const rule of config.module.rules) {
    for (const subRule of rule.oneOf || []) {
      // /\.(js|mjs|jsx|ts|tsx)$/
      if (subRule.test instanceof RegExp && subRule.test.test('.tsx')) {
        subRule.include.push(path.resolve(__dirname, '../lib'))
        // although we don't care about the components inside diagnoseReportApp
        // but it can't pass compile if we don't add it to the rule.include
        subRule.include.push(path.resolve(__dirname, '../diagnoseReportApp'))
        break
      }
    }
  }

  return config
}

// ref: https://harrietryder.co.uk/blog/storybook-with-typscript-customize-cra/
const custom = require('../config-overrides')

module.exports = {
  stories: [
    '../lib/components/**/*.stories.@(ts|tsx|js|jsx)',
    '../lib/apps/**/*.stories.@(ts|tsx|js|jsx)',
  ],
  addons: [
    '@storybook/preset-create-react-app',
    '@storybook/addon-actions',
    '@storybook/addon-links',
  ],
  webpackFinal: (storybookConfig) => {
    const customConfig = custom(storybookConfig)
    const newConfigs = {
      ...storybookConfig,
      module: { ...storybookConfig.module, rules: customConfig.module.rules },
    }
    return includeMorePaths(newConfigs)
  },
}
