import { ClusterOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'cluster_info',
  routerPrefix: '/cluster_info',
  icon: ClusterOutlined,
  translations,
  reactRoot: () => import('.')
}
