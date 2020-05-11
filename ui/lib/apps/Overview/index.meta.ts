import { AppstoreOutlined } from '@ant-design/icons'

export default {
  id: 'overview',
  routerPrefix: '/overview',
  icon: AppstoreOutlined,
  isDefaultRouter: true,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_overview" */ '.'),
}
