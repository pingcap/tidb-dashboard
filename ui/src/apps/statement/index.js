module.exports = {
  id: 'statement',
  loader: () => import('./app.js'),
  routerPrefix: '/statement',
  icon: 'thunderbolt',
  translations: require.context('./translations/', false, /\.yaml$/)
}
