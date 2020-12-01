import { EyeOutlined } from '@ant-design/icons'

export default {
  id: 'timeline',
  routerPrefix: '/timeline',
  icon: EyeOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_timeline" */ '.'),
}
