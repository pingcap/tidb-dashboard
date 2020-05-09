import { SettingOutlined } from '@ant-design/icons'

export default {
  id: 'dashboard_settings',
  routerPrefix: '/dashboard_settings',
  icon: SettingOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_dashboard_settings" */ '.'),
}
