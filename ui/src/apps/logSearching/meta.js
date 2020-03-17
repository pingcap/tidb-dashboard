export default {
  id: 'log_searching',
  reactRoot: () => import('.').then(m => m.default),
  routerPrefix: '/log/search',
  icon: 'file-text',
  translations: require.context('./translations/', false, /\.yaml$/),
}
