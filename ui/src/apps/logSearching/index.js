module.exports = {
  id: 'log_searching',
  loader: () => import('./app.js'),
  routerPrefix: '/log/search',
  icon: 'file-text',
  translations: require.context('./translations/', false, /\.yaml$/),
}
