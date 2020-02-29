module.exports = {
  id: 'clusterinfo',
  loader: () => import('./app.js'),
  routerPrefix: '/clusterinfo',
  icon: 'eye',
  translations: require.context('./translations/', false, /\.yaml$/),
};
