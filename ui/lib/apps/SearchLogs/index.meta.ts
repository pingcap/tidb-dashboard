import { FileSearchOutlined } from '@ant-design/icons'

export default {
  id: 'search_logs',
  routerPrefix: '/search_logs',
  icon: FileSearchOutlined,
  // translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_search_logs" */ '.'),
}
