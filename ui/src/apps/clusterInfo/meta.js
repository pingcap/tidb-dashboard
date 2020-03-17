export default {
  id: 'cluster_info',
  reactRoot: () => import('.').then(m => m.default),
  routerPrefix: '/cluster_info',
  icon: 'cluster',
  isDefaultRouter: true,
  translations: require.context('./translations/', false, /\.yaml$/),
}
