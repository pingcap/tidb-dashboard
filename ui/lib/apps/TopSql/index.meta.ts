import { BarChartOutlined } from '@ant-design/icons'

export default {
  id: 'top_sql',
  routerPrefix: '/top_sql',
  icon: BarChartOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_topsql" */ '.'),
}
