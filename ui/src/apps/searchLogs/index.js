import { FileTextOutlined } from '@ant-design/icons'

export default {
  id: 'search_logs',
  loader: () => import('./app.js'),
  routerPrefix: '/search_logs',
  icon: FileTextOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
}
