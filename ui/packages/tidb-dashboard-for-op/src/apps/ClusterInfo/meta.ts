import { ClusterOutlined } from '@ant-design/icons'

export default {
  id: 'cluster_info',
  routerPrefix: '/cluster_info',
  icon: ClusterOutlined,
  reactRoot: () => import('.')
}
