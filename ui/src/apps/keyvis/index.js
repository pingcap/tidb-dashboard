module.exports = {
  id: 'keyvis',
  loader: () => import('./app.js'),
  routerPrefix: '/keyvis',
  icon: 'eye',
  translations: require.context('./translations/', false, /\.yaml$/),
}
