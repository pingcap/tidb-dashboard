module.exports = {
  id: 'clusterInfo',
  loader: () => import('./app.js'),
  routerPrefix: '/clusterInfo',
  icon: 'cluster',
  translations: require.context('./translations/', false, /\.yaml$/),
};
