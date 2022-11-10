import { RocketOutlined } from '@ant-design/icons'

export default {
  id: 'slow_query_v2',
  routerPrefix: '/slow_query_v2',
  icon: RocketOutlined,
  reactRoot: () => import('.')
}
