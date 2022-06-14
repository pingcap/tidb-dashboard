import { ToolOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'configuration',
  routerPrefix: '/configuration',
  icon: ToolOutlined,
  translations,
  reactRoot: () => import('.')
}
