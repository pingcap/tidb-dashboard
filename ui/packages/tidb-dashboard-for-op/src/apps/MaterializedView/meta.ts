import { DatabaseOutlined } from '@ant-design/icons'

export default {
  id: 'materialized_view',
  routerPrefix: '/materialized_view',
  icon: DatabaseOutlined,
  reactRoot: () => import('.')
}
