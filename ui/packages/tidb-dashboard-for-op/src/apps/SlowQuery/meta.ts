import { RocketOutlined } from '@ant-design/icons'

export default {
  id: 'slow_query',
  routerPrefix: '/slow_query',
  icon: RocketOutlined,
  reactRoot: () => import('.')
}
