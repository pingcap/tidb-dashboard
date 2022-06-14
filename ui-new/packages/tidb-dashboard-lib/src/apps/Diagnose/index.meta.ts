import { SafetyCertificateOutlined } from '@ant-design/icons'
import translations from './translations'

export default {
  id: 'diagnose',
  routerPrefix: '/diagnose',
  icon: SafetyCertificateOutlined,
  translations,
  reactRoot: () => import('.')
}
