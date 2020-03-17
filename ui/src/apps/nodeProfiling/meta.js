export default {
  id: 'node_profiling',
  reactRoot: () => import('.').then(m => m.default),
  routerPrefix: '/node_profiling',
  icon: 'heat-map',
  translations: require.context('./translations/', false, /\.yaml$/),
}
