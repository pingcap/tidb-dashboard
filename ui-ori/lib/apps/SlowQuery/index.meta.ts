import { RocketOutlined } from '@ant-design/icons'

export default {
  id: 'slow_query',
  routerPrefix: '/slow_query',
  icon: RocketOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_slow_query" */ '.'),
}
