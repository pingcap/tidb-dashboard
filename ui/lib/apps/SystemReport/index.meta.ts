import { SnippetsOutlined } from '@ant-design/icons'

export default {
  id: 'system_report',
  routerPrefix: '/system_report',
  icon: SnippetsOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_system_report" */ '.'),
}
