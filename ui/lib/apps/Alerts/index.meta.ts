import { AlertOutlined } from '@ant-design/icons'

export default {
  id: 'alerts',
  routerPrefix: '/alerts',
  icon: AlertOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_alerts" */ '.'),
}
