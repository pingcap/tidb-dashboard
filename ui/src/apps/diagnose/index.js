module.exports = {
  id: 'diagnose',
  loader: () => import('./app.js'),
  routerPrefix: '/diagnose',
  icon: 'security-scan',
  translations: require.context('./translations/', false, /\.yaml$/)
}
