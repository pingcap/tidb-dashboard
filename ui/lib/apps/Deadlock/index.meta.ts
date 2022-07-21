import { SyncOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'deadlock',
  routerPrefix: '/deadlock',
  icon: SyncOutlined,
  translations,
  reactRoot: () => import('.'),
}
