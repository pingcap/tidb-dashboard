module.exports = {
  id: 'demo',
  loader: () => import('./app.js'),
  routerPrefix: '/demo',
  icon: 'pie-chart',
  menuTitle: 'Demo 2', // TODO: I18N
  isDefaultRouter: true,
}
