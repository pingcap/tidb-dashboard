module.exports = {
  id: 'keyvis',
  loader: () => import('./app.js'),
  routerPrefix: '/keyvis',
  icon: 'eye',
  menuTitle: 'Key Visualizer', // TODO: I18N
  isDefaultRouter: true,
  translations: require.context('./translations/', false, /\.yaml$/),
};
