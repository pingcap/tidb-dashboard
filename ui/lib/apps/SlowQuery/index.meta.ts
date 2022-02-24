import { RocketOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'slow_query',
  routerPrefix: '/slow_query',
  icon: RocketOutlined,
  translations,
  reactRoot: () => import('.'),
}
