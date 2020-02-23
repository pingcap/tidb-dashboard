module.exports = {
  id: 'keyvis',
  loader: () => import('./app.js'),
  routerPrefix: '/keyvis',
  icon: 'eye',
  isDefaultRouter: true,
  translations: require.context('./translations/', false, /\.yaml$/),
};
