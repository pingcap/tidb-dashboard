import { ToolOutlined } from '@ant-design/icons'

export default {
  id: 'configuration',
  routerPrefix: '/configuration',
  icon: ToolOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_configuration" */ '.'),
}
