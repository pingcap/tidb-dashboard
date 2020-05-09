import { ThunderboltOutlined } from '@ant-design/icons'

export default {
  id: 'statement',
  routerPrefix: '/statement',
  icon: ThunderboltOutlined,
  translations: require.context('./translations/', false, /\.yaml$/),
  reactRoot: () => import(/* webpackChunkName: "app_statement" */ '.'),
}
