import { ConsoleSqlOutlined } from '@ant-design/icons'

export default {
  id: 'query_editor',
  routerPrefix: '/query_editor',
  icon: ConsoleSqlOutlined,
  reactRoot: () => import('.')
}
