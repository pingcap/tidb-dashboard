module.exports = {
  id: 'diagnose',
  loader: () => import('./app.js'),
  routerPrefix: '/diagnose',
  icon: 'safety-certificate',
  translations: require.context('./translations/', false, /\.yaml$/),
}
