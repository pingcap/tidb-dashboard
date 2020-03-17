export default {
  id: 'diagnose',
  reactRoot: () => import('.').then(m => m.default),
  routerPrefix: '/diagnose',
  icon: 'safety-certificate',
  translations: require.context('./translations/', false, /\.yaml$/),
}
