import { BarChartOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'top_sql',
  routerPrefix: '/top_sql',
  icon: BarChartOutlined,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_topsql" */ '.'),
}
