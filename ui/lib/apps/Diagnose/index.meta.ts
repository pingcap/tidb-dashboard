import { SafetyCertificateOutlined } from '@ant-design/icons'

export default {
  id: 'diagnose',
  routerPrefix: '/diagnose',
  icon: SafetyCertificateOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_diagnose" */ '.'),
}
