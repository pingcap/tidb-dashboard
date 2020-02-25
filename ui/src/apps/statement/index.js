module.exports = {
  id: 'statement',
  loader: () => import('./app.js'),
  routerPrefix: '/statement',
  icon: 'line-chart',
  translations: require.context('./translations/', false, /\.yaml$/)
}
