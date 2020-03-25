import { SettingOutlined } from '@ant-design/icons'

export default {
  id: 'dashboard_settings',
  loader: () => import('./app.js'),
  routerPrefix: '/dashboard_settings',
  icon: SettingOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
}
