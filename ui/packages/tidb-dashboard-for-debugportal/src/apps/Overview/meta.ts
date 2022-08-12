import { AppstoreOutlined } from '@ant-design/icons'

export default {
  id: 'overview',
  routerPrefix: '/overview',
  icon: AppstoreOutlined,
  isDefaultRouter: true,
  reactRoot: () => import('.')
}
