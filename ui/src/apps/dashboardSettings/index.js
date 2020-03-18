module.exports = {
  id: 'dashboard_settings',
  loader: () => import('./app.js'),
  routerPrefix: '/dashboard_settings',
  icon: 'setting',
  translations: require.context('./translations/', false, /\.yaml$/),
}
