import { TeamOutlined } from '@ant-design/icons'

export default {
  id: 'dbusers_manager',
  routerPrefix: '/dbusers',
  icon: TeamOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_dbusers_manager" */ '.'),
}
