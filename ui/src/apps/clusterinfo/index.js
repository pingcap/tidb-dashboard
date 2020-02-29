module.exports = {
  id: 'clusterinfo',
  loader: () => import('./app.js'),
  routerPrefix: '/clusterinfo',
  icon: 'cluster',
  translations: require.context('./translations/', false, /\.yaml$/),
};
