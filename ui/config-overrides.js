const path = require('path');
const {
  override,
  fixBabelImports,
  addLessLoader,
  addWebpackResolve,
  addWebpackPlugin,
  addDecoratorsLegacy,
} = require('customize-cra');
const AntdDayjsWebpackPlugin = require('antd-dayjs-webpack-plugin');
const addYaml = require('react-app-rewire-yaml');

const enableEslintIgnore = () => config => {
  const eslintRule = config.module.rules.filter(
    r => r.use && r.use.some(u => u.options && u.options.useEslintrc !== void 0)
  )[0];
  eslintRule.use[0].options.ignore = true;
  return config;
};

module.exports = override(
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: true,
  }),
  addLessLoader({
    javascriptEnabled: true,
    modifyVars: {
      '@primary-color': '#3351ff',
      '@body-background': '#f0f2f5',
    },
    localIdentName: '[local]--[hash:base64:5]',
  }),
  addWebpackPlugin(new AntdDayjsWebpackPlugin()),
  addWebpackResolve({
    alias: { '@': path.resolve(__dirname, 'src') },
  }),
  addDecoratorsLegacy(),
  enableEslintIgnore(),
  addYaml
);
