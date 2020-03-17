export default {
  id: 'statement',
  reactRoot: () => import('.').then(m => m.default),
  routerPrefix: '/statement',
  icon: 'thunderbolt',
  translations: require.context('./translations/', false, /\.yaml$/),
}
