import { AimOutlined } from '@ant-design/icons'

export default {
  id: 'instance_profiling',
  routerPrefix: '/instance_profiling',
  icon: AimOutlined,
  // translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_instance_profiling" */ '.'),
}
