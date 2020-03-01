module.exports = {
  id: 'cluster_info',
  loader: () => import('./app.js'),
  routerPrefix: '/cluster_info',
  icon: 'cluster',
  isDefaultRouter: true,
  translations: require.context('./translations/', false, /\.yaml$/),
}
