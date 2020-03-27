import { UserOutlined } from '@ant-design/icons'

export default {
  id: 'user_profile',
  loader: () => import('./app.js'),
  routerPrefix: '/user_profile',
  icon: UserOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
}
