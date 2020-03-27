import { ClusterOutlined } from '@ant-design/icons'

export default {
  id: 'cluster_info',
  loader: () => import('./app.js'),
  routerPrefix: '/cluster_info',
  icon: ClusterOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
}
