import { LineChartOutlined } from '@ant-design/icons'

export default {
  id: 'monitoring',
  routerPrefix: '/monitoring',
  icon: LineChartOutlined,
  reactRoot: () => import('.')
}
