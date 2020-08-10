import { LineChartOutlined } from '@ant-design/icons'

export default {
  id: 'metrics',
  routerPrefix: '/metrics',
  icon: LineChartOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_metrics" */ '.'),
}
