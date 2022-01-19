import { BarChartOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'topsql',
  routerPrefix: '/topsql',
  icon: BarChartOutlined,
  translations,
  reactRoot: () => import(/* webpackChunkName: "app_topsql" */ '.'),
}
