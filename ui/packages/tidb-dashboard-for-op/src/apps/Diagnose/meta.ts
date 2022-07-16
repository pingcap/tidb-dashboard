import { SafetyCertificateOutlined } from '@ant-design/icons'

export default {
  id: 'diagnose',
  routerPrefix: '/diagnose',
  icon: SafetyCertificateOutlined,
  reactRoot: () => import('.')
}
