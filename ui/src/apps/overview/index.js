module.exports = {
  id: 'overview',
  loader: () => import('./app.js'),
  routerPrefix: '/overview',
  icon: 'appstore',
  isDefaultRouter: true,
  translations: require.context('./translations/', false, /\.yaml$/),
}
