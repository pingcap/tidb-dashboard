const { override } = require('customize-cra')
const addYaml = require('react-app-rewire-yaml')

module.exports = override(addYaml)
