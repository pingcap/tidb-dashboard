import { AppstoreOutlined } from '@ant-design/icons'

export default {
  id: 'overview',
  loader: () => import('./app.js'),
  routerPrefix: '/overview',
  icon: AppstoreOutlined,
  isDefaultRouter: true,
  translations: require.context('./translations/', false, /\.yaml$/),
}
