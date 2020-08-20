import { DatabaseOutlined } from '@ant-design/icons'

export default {
  id: 'data_manager',
  routerPrefix: '/data',
  icon: DatabaseOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_data_manager" */ '.'),
}
