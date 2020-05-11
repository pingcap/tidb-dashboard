import { ClusterOutlined } from '@ant-design/icons'

export default {
  id: 'cluster_info',
  routerPrefix: '/cluster_info',
  icon: ClusterOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_cluster_info" */ '.'),
}
