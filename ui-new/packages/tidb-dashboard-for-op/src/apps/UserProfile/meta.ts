import { UserOutlined } from '@ant-design/icons'

export default {
  id: 'user_profile',
  routerPrefix: '/user_profile',
  icon: UserOutlined,
  reactRoot: () => import('.')
}
