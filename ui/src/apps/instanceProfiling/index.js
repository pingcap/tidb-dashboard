import { HeatMapOutlined } from '@ant-design/icons'

export default {
  id: 'instance_profiling',
  loader: () => import('./app.js'),
  routerPrefix: '/instance_profiling',
  icon: HeatMapOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
}
