import { SafetyCertificateOutlined } from '@ant-design/icons'

export default {
  id: 'diagnose',
  loader: () => import('./app.js'),
  routerPrefix: '/diagnose',
  icon: SafetyCertificateOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
}
