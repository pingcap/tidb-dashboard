module.exports = {
  id: 'logsearch',
  loader: () => import('./app.js'),
  routerPrefix: '/logsearch',
  icon: 'pie-chart',
  translations: require.context('./translations/', false, /\.yaml$/),
}
