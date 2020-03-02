module.exports = {
  id: 'node_profiling',
  loader: () => import('./app.js'),
  routerPrefix: '/node_profiling',
  icon: 'heat-map',
  translations: require.context('./translations/', false, /\.yaml$/),
}
