import { HddOutlined } from '@ant-design/icons'

export default {
  id: 'resource_manager',
  routerPrefix: '/resource_manager',
  icon: HddOutlined,
  reactRoot: () => import('.')
}
