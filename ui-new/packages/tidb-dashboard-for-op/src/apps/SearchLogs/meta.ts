import { FileSearchOutlined } from '@ant-design/icons'

export default {
  id: 'search_logs',
  routerPrefix: '/search_logs',
  icon: FileSearchOutlined,
  reactRoot: () => import('.')
}
