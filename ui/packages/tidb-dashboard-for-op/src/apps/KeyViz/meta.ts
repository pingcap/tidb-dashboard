import { EyeOutlined } from '@ant-design/icons'

export default {
  id: 'keyviz',
  routerPrefix: '/keyviz',
  icon: EyeOutlined,
  reactRoot: () => import('.')
}
