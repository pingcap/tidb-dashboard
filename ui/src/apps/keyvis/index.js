module.exports = {
  id: 'keyvis',
  loader: () => import('./app.js'),
  routerPrefix: '/keyvis',
  icon: 'eye',
  menuTitle: 'Key Visualizer', // TODO: I18N
  isDefaultRouter: true,
  translations: {
    en: require('./translations/en.yaml'),
    zh_CN: require('./translations/zh_CN.yaml'),
  },
};
