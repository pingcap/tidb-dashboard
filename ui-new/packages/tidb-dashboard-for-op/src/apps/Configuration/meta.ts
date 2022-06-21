import { ToolOutlined } from '@ant-design/icons'

export default {
  id: 'configuration',
  routerPrefix: '/configuration',
  icon: ToolOutlined,
  reactRoot: () => import('.')
}
