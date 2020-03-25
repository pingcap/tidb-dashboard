import { BugOutlined } from '@ant-design/icons'

export default {
  id: 'playground',
  loader: () => import('./app.js'),
  routerPrefix: '/playground',
  icon: BugOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
}
