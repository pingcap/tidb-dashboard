import { EyeOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'keyviz',
  routerPrefix: '/keyviz',
  icon: EyeOutlined,
  translations,
  reactRoot: () => import('.'),
}
