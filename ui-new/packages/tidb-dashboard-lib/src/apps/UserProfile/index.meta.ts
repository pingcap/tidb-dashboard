import { UserOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'user_profile',
  routerPrefix: '/user_profile',
  icon: UserOutlined,
  translations,
  reactRoot: () => import('.')
}
