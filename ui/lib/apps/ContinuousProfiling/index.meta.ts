import { AimOutlined } from '@ant-design/icons'

export default {
  id: 'conprof',
  routerPrefix: '/continuous_profiling',
  icon: AimOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () =>
    import(/* webpackChunkName: "app_continuous_profiling" */ '.'),
}
