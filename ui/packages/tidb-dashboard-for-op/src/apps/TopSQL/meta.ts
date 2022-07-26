import { BarChartOutlined } from '@ant-design/icons'

export default {
  id: 'topsql',
  routerPrefix: '/topsql',
  icon: BarChartOutlined,
  reactRoot: () => import('.')
}
