import { HeatMapOutlined } from '@ant-design/icons'

export default {
  id: 'instance_profiling',
  routerPrefix: '/instance_profiling',
  icon: HeatMapOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_instance_profiling" */ '.'),
}
