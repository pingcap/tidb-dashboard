module.exports = {
  id: 'user_profile',
  loader: () => import('./app.js'),
  routerPrefix: '/user_profile',
  icon: 'user',
  translations: require.context('./translations/', false, /\.yaml$/),
}
