import { LineChartOutlined } from '@ant-design/icons'

export default {
  id: 'metrics',
  routerPrefix: '/metrics',
  icon: LineChartOutlined,
  reactRoot: () => import('.')
}
