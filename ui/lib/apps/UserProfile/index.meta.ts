import { UserOutlined } from '@ant-design/icons'

export default {
  id: 'user_profile',
  routerPrefix: '/user_profile',
  icon: UserOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_user_profile" */ '.'),
}
