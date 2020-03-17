export default {
  id: 'keyvis',
  reactRoot: () => import('.').then(m => m.default),
  routerPrefix: '/keyvis',
  icon: 'eye',
  translations: require.context('./translations/', false, /\.yaml$/),
}
