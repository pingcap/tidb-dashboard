import { ApiOutlined } from '@ant-design/icons'

export default {
  id: 'debug_api',
  routerPrefix: '/debug_api',
  icon: ApiOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_debug_api" */ '.'),
}
