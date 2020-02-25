module.exports = {
  id: 'logsearch',
  loader: () => import('./app.js'),
  routerPrefix: '/logsearch',
  icon: 'pie-chart',
  menuTitle: 'Log Search', // TODO: I18N
  isDefaultRouter: true
}
