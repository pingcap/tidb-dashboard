module.exports = {
  id: 'search_logs',
  loader: () => import('./app.js'),
  routerPrefix: '/search_logs',
  icon: 'file-text',
  translations: require.context('./translations/', false, /\.yaml$/),
}
