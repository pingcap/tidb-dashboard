import { SyncOutlined } from '@ant-design/icons'

export default {
  id: 'deadlock',
  routerPrefix: '/deadlock',
  icon: SyncOutlined,
  reactRoot: () => import('.')
}
