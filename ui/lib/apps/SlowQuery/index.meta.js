import { FileTextOutlined } from '@ant-design/icons'

export default {
  id: 'slow_query',
  routerPrefix: '/slow_query',
  icon: FileTextOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_slow_query" */ '.'),
}
