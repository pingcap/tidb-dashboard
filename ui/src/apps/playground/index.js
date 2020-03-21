module.exports = {
  id: 'playground',
  loader: () => import('./app.js'),
  routerPrefix: '/playground',
  icon: 'bug',
  translations: require.context('./translations/', false, /\.yaml$/),
}
