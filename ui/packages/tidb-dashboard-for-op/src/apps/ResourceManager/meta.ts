import { SyncOutlined } from '@ant-design/icons'

export default {
  id: 'resource_manager',
  routerPrefix: '/resource_manager',
  icon: SyncOutlined,
  reactRoot: () => import('.')
}
