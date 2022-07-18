import { AppstoreOutlined } from '@ant-design/icons'

export default {
  id: 'metrics',
  routerPrefix: '/metrics',
  icon: AppstoreOutlined,
  reactRoot: () => import('.')
}
