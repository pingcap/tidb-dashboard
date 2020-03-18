module.exports = {
  id: 'instance_profiling',
  loader: () => import('./app.js'),
  routerPrefix: '/instance_profiling',
  icon: 'heat-map',
  translations: require.context('./translations/', false, /\.yaml$/),
}
