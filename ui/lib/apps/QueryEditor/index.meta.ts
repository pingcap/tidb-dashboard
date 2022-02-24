import { ConsoleSqlOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'query_editor',
  routerPrefix: '/query_editor',
  icon: ConsoleSqlOutlined,
  translations,
  reactRoot: () => import('.'),
}
