import { ApiOutlined } from '@ant-design/icons'

export default {
  id: 'debug_api',
  routerPrefix: '/debug_api',
  icon: ApiOutlined,
  reactRoot: () => import('.')
}
